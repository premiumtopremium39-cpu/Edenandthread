import React, { useState, useEffect } from 'react';
import { orderService, isSupabaseConfigured } from '../lib/supabase';

export default function OrderTrackingPage({ orders, initialOrderId, onNavigateToShop }) {
  const [searchOrderId, setSearchOrderId] = useState(initialOrderId || '');
  const [activeOrder, setActiveOrder] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Determine active order from orders list or initialOrderId
  useEffect(() => {
    if (orders && orders.length > 0) {
      if (initialOrderId) {
        const found = orders.find(o => o.orderId === initialOrderId || o.paymentId === initialOrderId);
        if (found) {
          setActiveOrder(found);
          setSearchOrderId(found.orderId);
          return;
        }
      }
      // Default to the latest placed order if no initialOrderId specified
      setActiveOrder(orders[0]);
      setSearchOrderId(orders[0].orderId);
    } else if (initialOrderId && isSupabaseConfigured()) {
      // Query Supabase directly
      orderService.trackOrder(initialOrderId).then(cloudOrder => {
        if (cloudOrder) {
          setActiveOrder(cloudOrder);
          setSearchOrderId(cloudOrder.orderId);
        }
      });
    }
  }, [orders, initialOrderId]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchError('');
    if (!searchOrderId.trim()) {
      setSearchError('Please enter an Order ID or Payment Reference.');
      return;
    }

    const term = searchOrderId.trim().toLowerCase();
    const found = (orders || []).find(o => 
      (o.orderId && o.orderId.toLowerCase() === term) ||
      (o.paymentId && o.paymentId.toLowerCase() === term) ||
      (o.shipping?.email && o.shipping.email.toLowerCase() === term)
    );

    if (found) {
      setActiveOrder(found);
      return;
    }

    if (isSupabaseConfigured()) {
      setIsSearching(true);
      try {
        const cloudOrder = await orderService.trackOrder(searchOrderId.trim());
        if (cloudOrder) {
          setActiveOrder(cloudOrder);
          setIsSearching(false);
          return;
        }
      } catch (err) {
        console.warn("[Supabase Track Error]:", err);
      }
      setIsSearching(false);
    }

    setSearchError(`No order found matching "${searchOrderId}". Please check your order ID.`);
  };

  // Helper to determine active step in the 4-stage stepper
  const getStageIndex = (status = '') => {
    const s = status.toLowerCase();
    if (s.includes('delivered')) return 4;
    if (s.includes('dispatched') || s.includes('transit') || s.includes('shipped')) return 3;
    if (s.includes('preparation') || s.includes('tailoring') || s.includes('processing')) return 2;
    if (s.includes('paid') || s.includes('placed') || s.includes('verified') || s.includes('pending')) return 1;
    return 1;
  };

  const currentStage = activeOrder ? getStageIndex(activeOrder.status) : 1;

  const stages = [
    {
      num: 1,
      title: 'Order Confirmed',
      desc: 'Payment received & verified',
      icon: 'fa-file-invoice-dollar'
    },
    {
      num: 2,
      title: 'In Preparation',
      desc: 'Flax tailoring & atelier inspection',
      icon: 'fa-scissors'
    },
    {
      num: 3,
      title: 'Dispatched',
      desc: activeOrder?.carrier ? `${activeOrder.carrier} Air Express` : 'In transit with courier partner',
      icon: 'fa-plane-departure'
    },
    {
      num: 4,
      title: 'Delivered',
      desc: 'Handed over to recipient',
      icon: 'fa-house-circle-check'
    }
  ];

  return (
    <div className="order-tracking-page" style={{ minHeight: '80vh', backgroundColor: 'var(--bg-primary)', padding: '110px 1rem 6rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Header Breadcrumbs */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--accent)', fontWeight: 600, display: 'block', marginBottom: '0.75rem' }}>
            Atelier Logistics &bull; Real-Time Dispatch
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.75rem', color: 'var(--green-dark)', fontWeight: 400, margin: '0 0 1rem 0' }}>
            Track Your Garment Delivery
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
            Follow your handcrafted organic linen pieces as they journey from our Italian atelier directly to your doorstep.
          </p>
        </div>

        {/* Order Lookup Search Box */}
        <div style={{ backgroundColor: '#fff', padding: '1.75rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)', marginBottom: '3rem' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
              <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}></i>
              <input 
                type="text" 
                value={searchOrderId}
                onChange={(e) => setSearchOrderId(e.target.value)}
                placeholder="Enter Order ID (e.g. order_card_123 or EDN-78291) or Email"
                style={{ 
                  width: '100%', 
                  padding: '0.9rem 1rem 0.9rem 2.75rem', 
                  border: '1px solid var(--border-medium)', 
                  fontSize: '0.85rem',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            <button 
              type="submit" 
              disabled={isSearching}
              className="btn btn-primary"
              style={{ padding: '0.9rem 2rem', fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {isSearching && <i className="fa-solid fa-spinner fa-spin"></i>}
              {isSearching ? 'Locating...' : 'Track Order'}
            </button>
          </form>

          {searchError && (
            <div style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1rem', backgroundColor: 'var(--gold-light)', border: '1px solid var(--gold-border)' }}>
              <i className="fa-solid fa-circle-exclamation" style={{ color: 'var(--gold-dark)' }}></i> {searchError}
            </div>
          )}

          {/* Quick Select Recent Orders Pills */}
          {orders && orders.length > 0 && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Recent Orders on Device:
              </span>
              {orders.slice(0, 4).map((ord) => (
                <button
                  key={ord.orderId}
                  onClick={() => {
                    setSearchOrderId(ord.orderId);
                    setActiveOrder(ord);
                    setSearchError('');
                  }}
                  style={{
                    backgroundColor: activeOrder?.orderId === ord.orderId ? 'var(--green-dark)' : 'var(--bg-secondary)',
                    color: activeOrder?.orderId === ord.orderId ? '#fff' : 'var(--text-primary)',
                    border: '1px solid var(--border-medium)',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    borderRadius: '3px',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  {ord.orderId} &bull; ₹{ord.total}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active Order Details Display */}
        {activeOrder ? (
          <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)', padding: '2.5rem' }}>
            
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1.5rem', marginBottom: '2.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--accent)', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  Live Tracking
                </span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: 'var(--green-dark)', margin: 0 }}>
                  Order {activeOrder.orderId}
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.35rem 0 0 0' }}>
                  Placed on {new Date(activeOrder.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '0.5rem 1.25rem', 
                  fontSize: '0.85rem', 
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  backgroundColor: currentStage === 4 ? 'var(--green-light)' : 'var(--gold-light)',
                  color: currentStage === 4 ? 'var(--green-dark)' : 'var(--gold-dark)',
                  border: `1px solid ${currentStage === 4 ? 'var(--green-surface)' : 'var(--gold-border)'}`
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'currentColor' }}></span>
                  {activeOrder.status}
                </div>
              </div>
            </div>

              {/* 4-Stage Stepper Visual Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', position: 'relative', marginBottom: '2.5rem' }}>
                {stages.map((stage) => {
                  const isCompleted = currentStage >= stage.num;
                  const isCurrent = currentStage === stage.num;

                  return (
                    <div 
                      key={stage.num} 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        textAlign: 'center',
                        position: 'relative'
                      }}
                    >
                      <div style={{ 
                        width: '56px', 
                        height: '56px', 
                        borderRadius: '50%', 
                        backgroundColor: isCompleted ? 'var(--green-dark)' : 'var(--bg-secondary)', 
                        color: isCompleted ? '#fff' : 'var(--text-muted)',
                        border: isCurrent ? '3px solid var(--accent)' : isCompleted ? '2px solid var(--green-dark)' : '2px solid var(--border-medium)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        marginBottom: '1rem',
                        transition: 'all 0.3s ease',
                        boxShadow: isCurrent ? '0 0 0 4px rgba(184, 115, 51, 0.2)' : 'none'
                      }}>
                        <i className={`fa-solid ${stage.icon}`}></i>
                      </div>

                      <h4 style={{ 
                        fontSize: '0.9rem', 
                        fontWeight: isCurrent ? 700 : isCompleted ? 600 : 500, 
                        color: isCompleted ? 'var(--green-dark)' : 'var(--text-muted)', 
                        marginBottom: '0.35rem' 
                      }}>
                        {stage.title}
                      </h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                        {stage.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Carrier Dispatch Details (If Dispatched or Delivered) */}
              {(currentStage >= 3 || activeOrder.trackingNumber) && (
                <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)', padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                      Courier Air Waybill / Tracking ID
                    </span>
                    <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, color: 'var(--green-dark)' }}>
                      {activeOrder.trackingNumber || `DHL-EX-8940218`}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Carrier: <strong>{activeOrder.carrier || 'DHL Express Luxury Freight'}</strong> &bull; Estimated Delivery: <strong>2-3 Business Days</strong>
                    </span>
                  </div>

                  <a 
                    href={`https://www.dhl.com/en/express/tracking.html?AWB=${activeOrder.trackingNumber || 'DHL-EX-8940218'}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ padding: '0.65rem 1.25rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square" style={{ marginRight: '6px' }}></i> Live Courier Portal
                  </a>
                </div>
              )}

              {/* Status Update Banner */}
              <div style={{ borderLeft: '4px solid var(--accent)', backgroundColor: 'var(--gold-light)', padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2.5rem' }}>
                <strong>Atelier Dispatch Guarantee:</strong> All EDEN & THREAD orders are packed in signature breathable European flax garment bags and sealed in FSC-certified gift boxes. For questions regarding your consignment, email <a href="mailto:concierge@edentreads.com" style={{ color: 'var(--gold-dark)', fontWeight: 600 }}>concierge@edentreads.com</a> with reference <strong>{activeOrder.orderId}</strong>.
              </div>

            {/* Order Items & Delivery Destination Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
              
              {/* Ordered Garments */}
              <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-light)', padding: '2rem', boxShadow: 'var(--shadow-soft)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--green-dark)', fontWeight: 400, marginBottom: '1.25rem' }}>
                  Ordered Items ({activeOrder.items?.length || 0})
                </h3>
                <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                  {activeOrder.items?.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
                      <img 
                        src={item.image || '/assets/shirt_front.png'} 
                        alt={item.title} 
                        style={{ width: '60px', height: '60px', objectFit: 'cover', backgroundColor: 'var(--bg-secondary)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 0.25rem 0' }}>{item.title}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Color: {item.color} &bull; Size: {item.size} &bull; Qty: {item.qty}
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, color: 'var(--green-dark)', fontSize: '0.9rem' }}>
                        ₹{(item.price * item.qty).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid var(--border-medium)', paddingTop: '1rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Total Order Value:</span>
                  <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--green-dark)' }}>
                    ₹{parseFloat(activeOrder.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Shipping Destination & Payment Card */}
              <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-light)', padding: '2rem', boxShadow: 'var(--shadow-soft)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--green-dark)', fontWeight: 400, marginBottom: '1.25rem' }}>
                  Delivery Destination
                </h3>
                
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '2rem' }}>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>{activeOrder.shipping?.name || 'Valued Patron'}</strong><br />
                  {activeOrder.shipping?.address || 'Corso Como 10'}<br />
                  {activeOrder.shipping?.city || 'Milan'} - {activeOrder.shipping?.zip || '20154'}, {activeOrder.shipping?.country || 'Italy'}<br />
                  Phone: {activeOrder.shipping?.phone || '+39 02 1234567'} &bull; Email: {activeOrder.shipping?.email || 'patron@atelier.com'}
                </p>

                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Payment Confirmation
                </h4>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                  Reference: <code style={{ fontFamily: 'monospace', fontWeight: 600 }}>{activeOrder.paymentId}</code><br />
                  Status: <strong style={{ color: 'var(--green-dark)' }}>Verified &amp; Cleared</strong>
                </div>

                <button 
                  onClick={onNavigateToShop}
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '0.85rem', fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}
                >
                  <i className="fa-solid fa-bag-shopping" style={{ marginRight: '6px' }}></i> Continue Shopping
                </button>
              </div>

            </div>

          </div>
        ) : (
          /* Empty State / No Orders */
          <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-light)', padding: '4rem 2rem', textAlign: 'center', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 1.5rem' }}>
              <i className="fa-solid fa-box-open"></i>
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--green-dark)', fontWeight: 400, marginBottom: '0.75rem' }}>
              No Orders Found
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '450px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
              Enter an Order ID above to track your parcel, or explore our handcrafted linen collection to make your first acquisition.
            </p>
            <button 
              onClick={onNavigateToShop}
              className="btn btn-primary"
              style={{ padding: '0.9rem 2.5rem', fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}
            >
              Explore Collection
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
