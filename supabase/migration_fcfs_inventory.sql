-- ==============================================================================
-- EDEN & THREADS — PRODUCTION FCFS INVENTORY RESERVATION & PAYMENT HARDENING MIGRATION
-- ==============================================================================

-- 1. Ensure extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CREATE TABLE: inventory_reservations
CREATE TABLE IF NOT EXISTS public.inventory_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_size TEXT NOT NULL DEFAULT 'M',
    variant_color TEXT NOT NULL DEFAULT 'Default',
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'committed', 'expired', 'released')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    expires_at TIMESTAMPTZ NOT NULL,
    committed_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ
);

-- Indexes for lightning-fast reservation checking and expiry cleanup
CREATE INDEX IF NOT EXISTS idx_inv_res_product_status ON public.inventory_reservations(product_id, status);
CREATE INDEX IF NOT EXISTS idx_inv_res_order_id ON public.inventory_reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_inv_res_expires_at ON public.inventory_reservations(expires_at) WHERE status = 'active';

-- 3. CREATE TABLE: order_items (Immutable Price Snapshot)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    size TEXT NOT NULL DEFAULT 'M',
    color TEXT NOT NULL DEFAULT 'Default',
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    image TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- 4. CREATE TABLE: webhook_events (Idempotency Ledger)
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    entity_id TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('processing', 'processed', 'failed', 'ignored')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    processed_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_entity_id ON public.webhook_events(entity_id);

-- 5. CREATE TABLE: refund_records
CREATE TABLE IF NOT EXISTS public.refund_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
    payment_id TEXT NOT NULL,
    razorpay_refund_id TEXT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'processed', 'failed')),
    raw_response JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_refund_records_order_id ON public.refund_records(order_id);

-- 6. Add idempotency and reservation columns to orders if not already present
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS reservation_expires_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key ON public.orders(idempotency_key);

-- 7. POSTGRESQL ATOMIC FUNCTION: reserve_inventory_atomic
-- Performs atomic FCFS stock check and reservation with row-level locking
CREATE OR REPLACE FUNCTION public.reserve_inventory_atomic(
    p_order_id TEXT,
    p_items JSONB, -- Array of { productId, size, color, quantity }
    p_ttl_minutes INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item JSONB;
    v_product_id BIGINT;
    v_qty INTEGER;
    v_on_hand INTEGER;
    v_active_reserved INTEGER;
    v_available INTEGER;
    v_now TIMESTAMPTZ := TIMEZONE('utc'::text, NOW());
    v_expires_at TIMESTAMPTZ := v_now + (p_ttl_minutes || ' minutes')::INTERVAL;
    v_res_id UUID;
    v_reserved_ids UUID[] := '{}';
BEGIN
    -- First, automatically expire any stale reservations across the store to free stock
    UPDATE public.inventory_reservations
    SET status = 'expired',
        released_at = v_now
    WHERE status = 'active' AND expires_at < v_now;

    -- Iterate and check availability for each requested item with row-level lock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'productId')::BIGINT;
        v_qty := (v_item->>'quantity')::INTEGER;

        IF v_qty <= 0 THEN
            RAISE EXCEPTION 'Invalid quantity % for product %', v_qty, v_product_id;
        END IF;

        -- Lock the product row for update to prevent concurrent race conditions
        SELECT stock INTO v_on_hand
        FROM public.products
        WHERE id = v_product_id AND is_active = TRUE
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'PRODUCT_NOT_FOUND',
                'message', 'Product ' || v_product_id || ' is inactive or no longer exists'
            );
        END IF;

        -- Compute currently active reservations for this product
        SELECT COALESCE(SUM(quantity), 0) INTO v_active_reserved
        FROM public.inventory_reservations
        WHERE product_id = v_product_id 
          AND status = 'active'
          AND expires_at > v_now;

        v_available := v_on_hand - v_active_reserved;

        -- Stock Invariant: available stock must satisfy requested quantity
        IF v_available < v_qty THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'INSUFFICIENT_STOCK',
                'product_id', v_product_id,
                'available', GREATEST(0, v_available),
                'requested', v_qty,
                'message', 'Requested quantity exceeds currently available stock (' || GREATEST(0, v_available) || ' remaining).'
            );
        END IF;
    END LOOP;

    -- All items available: insert reservations atomically
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'productId')::BIGINT;
        v_qty := (v_item->>'quantity')::INTEGER;

        INSERT INTO public.inventory_reservations (
            order_id,
            product_id,
            variant_size,
            variant_color,
            quantity,
            status,
            created_at,
            expires_at
        ) VALUES (
            p_order_id,
            v_product_id,
            COALESCE(v_item->>'size', 'M'),
            COALESCE(v_item->>'color', 'Default'),
            v_qty,
            'active',
            v_now,
            v_expires_at
        ) RETURNING id INTO v_res_id;

        v_reserved_ids := array_append(v_reserved_ids, v_res_id);
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'expires_at', v_expires_at,
        'ttl_minutes', p_ttl_minutes,
        'reservation_count', array_length(v_reserved_ids, 1)
    );
END;
$$;

-- 8. POSTGRESQL ATOMIC FUNCTION: commit_inventory_reservation
-- Marks reservation committed and decrements authoritative physical stock
CREATE OR REPLACE FUNCTION public.commit_inventory_reservation(
    p_order_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_res RECORD;
    v_now TIMESTAMPTZ := TIMEZONE('utc'::text, NOW());
    v_committed_count INTEGER := 0;
BEGIN
    FOR v_res IN
        SELECT * FROM public.inventory_reservations
        WHERE order_id = p_order_id AND status = 'active'
        FOR UPDATE
    LOOP
        -- Decrement physical stock on products table safely
        UPDATE public.products
        SET stock = GREATEST(0, stock - v_res.quantity),
            updated_at = v_now
        WHERE id = v_res.product_id;

        -- Mark reservation committed
        UPDATE public.inventory_reservations
        SET status = 'committed',
            committed_at = v_now
        WHERE id = v_res.id;

        v_committed_count := v_committed_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'committed_count', v_committed_count
    );
END;
$$;

-- 9. POSTGRESQL ATOMIC FUNCTION: release_inventory_reservation
-- Releases an active reservation back to available inventory
CREATE OR REPLACE FUNCTION public.release_inventory_reservation(
    p_order_id TEXT,
    p_reason TEXT DEFAULT 'cancelled'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_now TIMESTAMPTZ := TIMEZONE('utc'::text, NOW());
    v_released_count INTEGER := 0;
BEGIN
    UPDATE public.inventory_reservations
    SET status = 'released',
        released_at = v_now
    WHERE order_id = p_order_id AND status = 'active';

    GET DIAGNOSTICS v_released_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'released_count', v_released_count,
        'reason', p_reason
    );
END;
$$;

-- 10. POSTGRESQL ATOMIC FUNCTION: cleanup_expired_reservations
CREATE OR REPLACE FUNCTION public.cleanup_expired_reservations()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_now TIMESTAMPTZ := TIMEZONE('utc'::text, NOW());
    v_expired_count INTEGER := 0;
BEGIN
    UPDATE public.inventory_reservations
    SET status = 'expired',
        released_at = v_now
    WHERE status = 'active' AND expires_at < v_now;

    GET DIAGNOSTICS v_expired_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'expired_count', v_expired_count,
        'cleaned_at', v_now
    );
END;
$$;
