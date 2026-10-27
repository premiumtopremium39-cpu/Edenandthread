import React, { useState, useEffect, useRef } from 'react';
import { handleImageError, DEFAULT_FALLBACK_IMAGE } from '../utils/productViews';

export default function CheckoutPage({ cartItems, onOrderComplete, showToast, user, promoCodes = [] }) {
  const [couponCode, setCouponCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null); // { code, type, value, discountAmount }
  const [paymentMethod, setPaymentMethod] = useState('razorpay'); // 'razorpay' | 'cod'
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [copiedField, setCopiedField] = useState(null);
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  // FCFS Reservation & Countdown State
  const [reservationExpiresAt, setReservationExpiresAt] = useState(null);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(null);
  const [reservationExpired, setReservationExpired] = useState(false);
  const idempotencyKeyRef = useRef(`idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

  // Default available promo codes fallback
  const defaultPromos = [
    { code: 'SUMMER15', type: 'percent', value: 15, active: true },
    { code: 'EDEN10', type: 'percent', value: 10, active: true },
    { code: 'LUXURY5000', type: 'flat', value: 5000, active: true }
  ];

  const activePromoList = promoCodes && promoCodes.length > 0 ? promoCodes : defaultPromos;

  // Shipping details state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    zip: '',
    country: 'India',
    phone: '+91 98765 43210'
  });

  // Pre-fill user details if logged in
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  // Client preview calculation (Authoritative calculation will always be executed by server)
  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const shipping = subtotal >= 1500 ? 0 : (cartItems.length > 0 ? 150 : 0);
  
  let discountAmount = 0;
  if (appliedPromo) {
    if (appliedPromo.type === 'percent') {
      discountAmount = (subtotal * appliedPromo.value) / 100;
    } else if (appliedPromo.type === 'flat') {
      discountAmount = Math.min(appliedPromo.value, subtotal);
    }
  }
  
  const finalTotal = Math.max(0, subtotal - discountAmount + shipping);

  // FCFS Reservation Countdown Timer
  useEffect(() => {
    if (!reservationExpiresAt) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const expiry = new Date(reservationExpiresAt).getTime();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));

      setTimeRemainingSeconds(diff);

      if (diff <= 0) {
        setReservationExpired(true);
        clearInterval(interval);
        showToast('<i class="fa-solid fa-clock-rotate-left"></i> Your 10-minute stock reservation expired. Please checkout again to secure inventory.');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [reservationExpiresAt]);

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    const normalizedCode = couponCode.trim().toUpperCase();
    if (!normalizedCode) return;

    const matchedPromo = activePromoList.find(p => p.code.toUpperCase() === normalizedCode && p.active !== false);

    if (matchedPromo) {
      setAppliedPromo(matchedPromo);
      const discountDesc = matchedPromo.type === 'flat' ? `₹${matchedPromo.value.toLocaleString('en-IN')}` : `${matchedPromo.value}%`;
      showToast(`<i class="fa-solid fa-tag"></i> Promo code ${matchedPromo.code} applied (${discountDesc} off).`);
    } else {
      showToast('<i class="fa-solid fa-triangle-exclamation"></i> Invalid or inactive promo code.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    showToast(`<i class="fa-solid fa-clipboard-check"></i> Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Helper to safely call backend payment API
  const callPaymentApi = async (endpoint, data) => {
    const urlsToTry = [
      `/api/payment/${endpoint}`,
      `http://localhost:5000/api/payment/${endpoint}`
    ];

    for (const url of urlsToTry) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(data)
        });
        const json = await res.json();
        return { ok: res.ok, status: res.status, data: json };
      } catch {
        // Continue to fallback URL
      }
    }
    return { ok: false, status: 500, data: { message: 'Network connection to payment gateway failed.' } };
  };

  // Helper to load Razorpay SDK dynamically
  const loadRazorpaySDK = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Primary checkout submission handler
  const handleSubmitPayment = (e) => {
    e.preventDefault();
    if (isProcessing) return; // Prevent double clicks

    if (paymentMethod === 'razorpay') {
      handleRazorpayPayment();
    } else if (paymentMethod === 'cod') {
      handleCodPayment();
    }
  };

  // 1. Official Secure Razorpay Checkout with FCFS Atomic Reservation
  const handleRazorpayPayment = async () => {
    if (!user) {
      showToast('<i class="fa-solid fa-triangle-exclamation"></i> Authentication required.');
      return;
    }

    if (cartItems.length === 0) {
      showToast('<i class="fa-solid fa-triangle-exclamation"></i> Your shopping bag is empty.');
      return;
    }

    if (!formData.name || !formData.email || !formData.address || !formData.city || !formData.zip) {
      showToast('<i class="fa-solid fa-triangle-exclamation"></i> Please fill in all shipping details.');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Securing FCFS inventory reservation...');

    try {
      // Step 1: Request authoritative server order creation & FCFS reservation
      const orderPayload = {
        items: cartItems.map(item => ({
          productId: item.id,
          quantity: item.qty,
          size: item.size || 'M',
          color: item.color || 'Default'
        })),
        couponCode: appliedPromo?.code || null,
        shippingDetails: { ...formData },
        paymentMethod: 'razorpay',
        idempotencyKey: idempotencyKeyRef.current
      };

      const createRes = await callPaymentApi('create-order', orderPayload);

      if (!createRes.ok || !createRes.data?.success) {
        setIsProcessing(false);
        setProcessingStatus('');

        // 409 Conflict: Inventory exhausted or race condition lost
        if (createRes.status === 409) {
          showToast(`<i class="fa-solid fa-circle-exclamation"></i> Inventory Update: ${createRes.data?.message || 'Item sold out'}`);
        } else {
          showToast(`<i class="fa-solid fa-triangle-exclamation"></i> ${createRes.data?.message || 'Checkout failed'}`);
        }
        return;
      }

      const orderData = createRes.data;
      const serverOrderId = orderData.orderId;
      const razorpayOrderId = orderData.razorpayOrderId;
      const authoritativePaise = orderData.amountInPaise;
      const activeKeyId = orderData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TrmfyllGcVE3Zv';
      const activeConfigId = orderData.configId || import.meta.env.VITE_RAZORPAY_CONFIG_ID || 'config_Tsrko6CbrIPYEM';

      // Set reservation countdown based on authoritative server timestamp
      if (orderData.reservationExpiresAt) {
        setReservationExpiresAt(orderData.reservationExpiresAt);
        setReservationExpired(false);
      }

      setProcessingStatus('Loading Razorpay secure payment modal...');
      const isSdkLoaded = await loadRazorpaySDK();

      if (!isSdkLoaded || !window.Razorpay) {
        setIsProcessing(false);
        showToast('<i class="fa-solid fa-triangle-exclamation"></i> Razorpay checkout SDK could not be loaded. Please check your internet connection.');
        return;
      }

      // Step 2: Configure Razorpay Checkout Options
      const options = {
        key: activeKeyId,
        config_id: activeConfigId,
        amount: authoritativePaise,
        currency: 'INR',
        name: 'EDEN & THREAD',
        description: `Order ${serverOrderId} • Luxury Artisanal Linen`,
        image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=128&auto=format&fit=crop&q=80',
        order_id: razorpayOrderId,
        config: {
          display: {
            hide: [
              { method: 'emi' },
              { method: 'paylater' }
            ],
            preferences: {
              show_default_blocks: true
            }
          }
        },
        handler: async function (response) {
          setProcessingStatus('Verifying cryptographic payment signature with server...');
          try {
            const verifyPayload = {
              order_id: serverOrderId,
              razorpay_order_id: response.razorpay_order_id || razorpayOrderId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            };

            const verifyRes = await callPaymentApi('verify-payment', verifyPayload);

            if (!verifyRes.ok || !verifyRes.data?.verified) {
              throw new Error(verifyRes.data?.message || 'Signature verification rejected by server.');
            }

            const orderRecord = {
              orderId: serverOrderId,
              paymentId: response.razorpay_payment_id,
              amount: orderData.amount,
              items: [...(orderData.items || cartItems)],
              shipping: { ...formData },
              timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
              status: 'Paid & Signature Verified (Razorpay)'
            };

            setConfirmedOrder(orderRecord);
            setIsProcessing(false);
            showToast('<i class="fa-solid fa-circle-check"></i> Payment Cryptographically Verified! Order Placed.');
            if (onOrderComplete) onOrderComplete(orderRecord);
          } catch (err) {
            console.error('Verification error:', err);
            setIsProcessing(false);
            showToast(`<i class="fa-solid fa-triangle-exclamation"></i> Payment verification error: ${err.message}`);
          }
        },
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone || '9876543210',
          vpa: 'success@razorpay'
        },
        notes: {
          shipping_address: `${formData.address}, ${formData.city} - ${formData.zip}`
        },
        theme: {
          color: '#143C28'
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            setProcessingStatus('');
            showToast('<i class="fa-solid fa-circle-info"></i> Checkout modal closed. Your 10-minute stock reservation is still active.');
          }
        }
      };

      const razorpayModal = new window.Razorpay(options);

      razorpayModal.on('payment.failed', function (response) {
        setIsProcessing(false);
        setProcessingStatus('');
        showToast(`<i class="fa-solid fa-circle-xmark"></i> Payment Failed: ${response.error?.description || 'Declined'}`);
      });

      razorpayModal.open();
    } catch (err) {
      console.error('Payment checkout error:', err);
      setIsProcessing(false);
      setProcessingStatus('');
      showToast(`<i class="fa-solid fa-triangle-exclamation"></i> Checkout Error: ${err.message}`);
    }
  };

  // 2. Cash on Delivery Flow with FCFS Reservation
  const handleCodPayment = async () => {
    if (!formData.name || !formData.email || !formData.address || !formData.city || !formData.zip) {
      showToast('<i class="fa-solid fa-triangle-exclamation"></i> Please fill in all shipping details.');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Reserving inventory for Cash on Delivery...');

    try {
      const orderPayload = {
        items: cartItems.map(item => ({
          productId: item.id,
          quantity: item.qty,
          size: item.size || 'M',
          color: item.color || 'Default'
        })),
        couponCode: appliedPromo?.code || null,
        shippingDetails: { ...formData },
        paymentMethod: 'cod',
        idempotencyKey: idempotencyKeyRef.current
      };

      const createRes = await callPaymentApi('create-order', orderPayload);

      if (!createRes.ok || !createRes.data?.success) {
        setIsProcessing(false);
        setProcessingStatus('');
        showToast(`<i class="fa-solid fa-triangle-exclamation"></i> ${createRes.data?.message || 'Failed to place COD order'}`);
        return;
      }

      const orderData = createRes.data;
      const orderRecord = {
        orderId: orderData.orderId,
        paymentId: 'PAYABLE_ON_DELIVERY',
        amount: orderData.amount,
        items: [...cartItems],
        shipping: { ...formData },
        timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        status: 'Pending Payment (Cash on Delivery - Reserved)'
      };

      setConfirmedOrder(orderRecord);
      setIsProcessing(false);
      showToast('<i class="fa-solid fa-circle-check"></i> Order Placed with Cash on Delivery! Stock Reserved.');
      if (onOrderComplete) onOrderComplete(orderRecord);
    } catch (err) {
      setIsProcessing(false);
      showToast(`<i class="fa-solid fa-triangle-exclamation"></i> ${err.message}`);
    }
  };

  const handleSecureCheckoutRedirect = () => {
    localStorage.setItem("eden_threads_login_redirect", "#checkout");
    window.location.hash = "#login";
  };

  // Format countdown minutes:seconds
  const formatCountdown = (seconds) => {
    if (seconds === null || seconds === undefined) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Order Confirmation Success Screen
  if (confirmedOrder) {
    return (
      <div style={{ paddingTop: '110px', paddingBottom: '80px' }} className="checkout-page">
        <div className="container" style={{ maxWidth: '680px', margin: '0 auto' }}>
          <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-light)', padding: '3rem', textAlign: 'left', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '50%', 
                backgroundColor: '#EAF0EC', 
                color: 'var(--green-dark)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 1.5rem', 
                fontSize: '1.75rem' 
              }}>
                <i className="fa-solid fa-check"></i>
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', color: 'var(--green-dark)', fontWeight: 400, marginBottom: '0.5rem' }}>
                Thank You for Your Order
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                A confirmation concierge receipt has been transmitted to <strong>{confirmedOrder.shipping.email}</strong>.
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)', padding: '1.5rem 0', margin: '2rem 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Order Number
                </span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                  {confirmedOrder.orderId}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Payment ID
                </span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                  {confirmedOrder.paymentId}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Payment Status
                </span>
                <span style={{ 
                  display: 'inline-block',
                  backgroundColor: '#EAF0EC', 
                  color: 'var(--green-dark)', 
                  padding: '0.2rem 0.6rem', 
                  fontSize: '0.75rem', 
                  fontWeight: 600,
                  borderRadius: '2px'
                }}>
                  <i className="fa-solid fa-shield-halved" style={{ marginRight: '4px' }}></i> {confirmedOrder.status}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Amount Paid
                </span>
                <strong style={{ fontSize: '1rem', color: 'var(--green-dark)' }}>
                  ₹{confirmedOrder.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.75rem', marginBottom: '2.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--green-dark)', marginBottom: '1rem' }}>
                Delivery Destination
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong>{confirmedOrder.shipping.name}</strong><br />
                {confirmedOrder.shipping.address}<br />
                {confirmedOrder.shipping.city} - {confirmedOrder.shipping.zip}, {confirmedOrder.shipping.country}
              </p>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <a 
                href={`#track/${confirmedOrder.orderId}`}
                onClick={() => setConfirmedOrder(null)}
                className="btn btn-primary"
                style={{ width: '100%', padding: '1rem', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <i className="fa-solid fa-plane-departure"></i> Track Order Status Live
              </a>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => window.print()}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '0.85rem', fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}
                >
                  <i className="fa-solid fa-print" style={{ marginRight: '8px' }}></i> Print Receipt
                </button>
                <a 
                  href="#shop"
                  onClick={() => setConfirmedOrder(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '0.85rem', fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}
                >
                  Shop Collection
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '110px', paddingBottom: '60px' }} className="checkout-page">
      <div className="container">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 400, color: 'var(--green-dark)', marginBottom: '0.5rem', textAlign: 'center' }}>
          Secure Checkout
        </h1>
        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Finalize your bespoke linen order with hardened first-come, first-served inventory reservation.
        </p>

        {/* FCFS Active Stock Reservation Banner */}
        {reservationExpiresAt && timeRemainingSeconds !== null && !reservationExpired && (
          <div style={{
            maxWidth: '680px',
            margin: '0 auto 2rem',
            padding: '1rem 1.25rem',
            backgroundColor: '#EAF0EC',
            border: '1px solid #143C28',
            borderRadius: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <i className="fa-solid fa-hourglass-half" style={{ color: '#143C28', fontSize: '1.1rem' }}></i>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#143C28', display: 'block' }}>
                  FCFS Stock Reserved Exclusively for You
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Complete payment before the timer elapses to guarantee fulfillment.
                </span>
              </div>
            </div>
            <div style={{
              backgroundColor: '#143C28',
              color: '#fff',
              padding: '0.35rem 0.75rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              letterSpacing: '0.05em',
              fontFamily: 'monospace'
            }}>
              {formatCountdown(timeRemainingSeconds)}
            </div>
          </div>
        )}

        {reservationExpired && (
          <div style={{
            maxWidth: '680px',
            margin: '0 auto 2rem',
            padding: '1rem 1.25rem',
            backgroundColor: '#FFF0F0',
            border: '1px solid #D9534F',
            borderRadius: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#A94442'
          }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '1.2rem' }}></i>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Reservation Expired: Your 10-minute window has elapsed. Click "Checkout" below to re-verify current availability.
            </span>
          </div>
        )}

        {/* Authentication Wall Guard */}
        {!user ? (
          <div style={{
            maxWidth: '560px',
            margin: '2rem auto 4rem',
            padding: '2.5rem 2rem',
            backgroundColor: '#fff',
            border: '1px solid var(--border-medium)',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
          }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--green-dark)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              fontSize: '1.25rem'
            }}>
              <i className="fa-solid fa-shield-halved"></i>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--green-dark)', marginBottom: '0.5rem' }}>
              Authentication Required
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
              Please sign in with your email or Google account to bind your bespoke garment reservation and access live tracking.
            </p>
            <button
              onClick={handleSecureCheckoutRedirect}
              className="btn btn-primary"
              style={{ padding: '0.85rem 2rem', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}
            >
              <i className="fa-solid fa-arrow-right-to-bracket" style={{ marginRight: '8px' }}></i> Sign In to Proceed
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '3rem', alignItems: 'start' }}>
            
            {/* Left Column: Form & Payment Choice */}
            <div>
              <form onSubmit={handleSubmitPayment}>
                {/* Shipping Details */}
                <div style={{ marginBottom: '2.5rem' }}>
                  <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--green-dark)', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
                    1. Shipping Destination
                  </h3>
                  
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label htmlFor="name" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Full Name</label>
                        <input 
                          type="text" 
                          id="name" 
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-medium)', borderRadius: '0', fontSize: '0.9rem', backgroundColor: '#fff' }} 
                          placeholder="Lord/Lady Sterling"
                        />
                      </div>
                      <div>
                        <label htmlFor="email" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Email Address</label>
                        <input 
                          type="email" 
                          id="email" 
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-medium)', borderRadius: '0', fontSize: '0.9rem', backgroundColor: '#fff' }} 
                          placeholder="patron@estate.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="phone" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Contact Phone</label>
                      <input 
                        type="text" 
                        id="phone" 
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-medium)', borderRadius: '0', fontSize: '0.9rem', backgroundColor: '#fff' }} 
                        placeholder="+91 98765 43210"
                      />
                    </div>

                    <div>
                      <label htmlFor="address" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Street Address / Suite</label>
                      <input 
                        type="text" 
                        id="address" 
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        required
                        style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-medium)', borderRadius: '0', fontSize: '0.9rem', backgroundColor: '#fff' }} 
                        placeholder="12th Main Road, Indiranagar"
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label htmlFor="city" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>City</label>
                        <input 
                          type="text" 
                          id="city" 
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          required
                          style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-medium)', borderRadius: '0', fontSize: '0.9rem', backgroundColor: '#fff' }} 
                          placeholder="Bengaluru"
                        />
                      </div>
                      <div>
                        <label htmlFor="zip" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Postal Code</label>
                        <input 
                          type="text" 
                          id="zip" 
                          name="zip"
                          value={formData.zip}
                          onChange={handleInputChange}
                          required
                          style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-medium)', borderRadius: '0', fontSize: '0.9rem', backgroundColor: '#fff' }} 
                          placeholder="560038"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Option */}
                <div style={{ marginBottom: '2.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--green-dark)', margin: 0 }}>
                      2. Payment Method
                    </h3>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', backgroundColor: '#EAF0EC', color: 'var(--green-dark)', padding: '0.2rem 0.6rem', border: '1px solid var(--border-medium)' }}>
                      <i className="fa-solid fa-shield-halved" style={{ marginRight: '4px' }}></i> Encrypted &amp; Idempotent
                    </span>
                  </div>

                  {/* Payment Method Selector Tabs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('razorpay')}
                      style={{ 
                        padding: '1rem 0.75rem', 
                        border: `1.5px solid ${paymentMethod === 'razorpay' ? 'var(--green-dark)' : 'var(--border-medium)'}`,
                        backgroundColor: paymentMethod === 'razorpay' ? '#EAF0EC' : '#fff',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        color: 'var(--green-dark)',
                        transition: 'var(--transition-fast)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.25rem',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <i className="fa-solid fa-credit-card"></i> UPI, Cards &amp; NetBanking
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                        Official Razorpay Gateway
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cod')}
                      style={{ 
                        padding: '1rem 0.75rem', 
                        border: `1.5px solid ${paymentMethod === 'cod' ? 'var(--green-dark)' : 'var(--border-medium)'}`,
                        backgroundColor: paymentMethod === 'cod' ? '#EAF0EC' : '#fff',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        color: 'var(--green-dark)',
                        transition: 'var(--transition-fast)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.25rem',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <i className="fa-solid fa-truck"></i> Cash on Delivery
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                        Pay upon physical delivery
                      </span>
                    </button>
                  </div>

                  {paymentMethod === 'razorpay' && (
                    <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', padding: '1.5rem', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <i className="fa-solid fa-lock" style={{ fontSize: '1.1rem', color: '#143C28' }}></i>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Secure Razorpay Checkout</span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PCI-DSS Certified</span>
                      </div>

                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
                        Clicking the button reserves your inventory for 10 minutes and opens the secure <strong>Razorpay Checkout</strong> modal for instant payment via UPI, Debit/Credit Card, or NetBanking.
                      </p>

                      <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-light)', padding: '1rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--green-dark)', display: 'block', marginBottom: '0.5rem' }}>
                          <i className="fa-solid fa-vial" style={{ marginRight: '5px', color: 'var(--gold)' }}></i> Sandbox Test Verification:
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('success@razorpay', 'UPI ID')}
                          style={{ 
                            width: '100%',
                            padding: '0.65rem 0.85rem', 
                            backgroundColor: 'var(--bg-secondary)', 
                            border: '1px dashed var(--border-medium)', 
                            textAlign: 'left', 
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.8rem'
                          }}
                        >
                          <span><strong style={{ color: 'var(--green-dark)' }}>Test UPI ID:</strong> success@razorpay</span>
                          <span style={{ color: 'var(--gold)', fontWeight: 600, fontSize: '0.75rem' }}>
                            {copiedField === 'UPI ID' ? '✓ Copied' : 'Copy'}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'cod' && (
                    <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        Inventory will be reserved for your order and dispatched. You will pay cash upon physical delivery. Please keep exact change ready.
                      </p>
                    </div>
                  )}
                </div>

                {/* Submit / Pay Button */}
                <button 
                  type="submit" 
                  disabled={isProcessing}
                  className="btn btn-primary w-100" 
                  style={{ 
                    padding: '1.25rem', 
                    fontSize: '0.9rem', 
                    letterSpacing: '0.1em', 
                    textTransform: 'uppercase', 
                    fontWeight: 600,
                    position: 'relative',
                    opacity: isProcessing ? 0.75 : 1,
                    cursor: isProcessing ? 'wait' : 'pointer'
                  }}
                >
                  {isProcessing ? (
                    <span>
                      <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: '8px' }}></i>
                      {processingStatus || 'Securing FCFS Reservation...'}
                    </span>
                  ) : paymentMethod === 'razorpay' ? (
                    <span>
                      <i className="fa-solid fa-lock" style={{ marginRight: '8px', fontSize: '0.8rem' }}></i>
                      Reserve Stock &amp; Pay &bull; ₹{finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span>
                      Confirm Cash On Delivery &bull; ₹{finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </button>
              </form>
            </div>

            {/* Right Column: Order Summary */}
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2.5rem', border: '1px solid var(--border-light)', height: 'fit-content' }}>
              <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--green-dark)', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
                Order Summary
              </h3>

              {/* Items list */}
              <div style={{ display: 'grid', gap: '1.25rem', marginBottom: '2rem' }}>
                {cartItems.map((item) => (
                  <div key={`${item.id}-${item.color}-${item.size}`} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      style={{ width: '60px', height: '65px', objectFit: 'cover', border: '1px solid var(--border-light)' }} 
                      onError={(e) => handleImageError(e, DEFAULT_FALLBACK_IMAGE)}
                    />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.color} / {item.size} &bull; Qty {item.qty}</p>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      ₹{(item.price * item.qty).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>

              {/* Promo input */}
              <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
                <input 
                  type="text" 
                  placeholder="Promo Voucher (e.g. SUMMER15, EDEN10)" 
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  disabled={appliedPromo !== null}
                  style={{ flex: 1, padding: '0.6rem 0.75rem', border: '1px solid var(--border-medium)', backgroundColor: '#fff', fontSize: '0.85rem' }}
                />
                {appliedPromo ? (
                  <button 
                    type="button" 
                    onClick={() => { setAppliedPromo(null); setCouponCode(''); }}
                    className="btn btn-secondary"
                    style={{ padding: '0.6rem 1rem', fontSize: '0.8rem' }}
                  >
                    Remove
                  </button>
                ) : (
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    style={{ padding: '0.6rem 1rem', fontSize: '0.8rem' }}
                  >
                    Apply
                  </button>
                )}
              </form>

              {/* Price Breakdown */}
              <div style={{ display: 'grid', gap: '0.75rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {appliedPromo && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#2e7d32', fontWeight: 600 }}>
                    <span>Voucher ({appliedPromo.code})</span>
                    <span>-₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>Artisanal Shipping</span>
                  <span>{shipping === 0 ? <strong style={{ color: '#2e7d32' }}>Complimentary</strong> : `₹${shipping.toFixed(2)}`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 600, color: 'var(--green-dark)', borderTop: '1px solid var(--border-medium)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <span>Total</span>
                  <span>₹{finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Security Badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <i className="fa-solid fa-lock"></i>
                <span>First-Come, First-Served Atomic Stock Protection</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
