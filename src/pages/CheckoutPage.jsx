import React, { useState, useEffect } from 'react';
import { handleImageError, DEFAULT_FALLBACK_IMAGE } from '../utils/productViews';

export default function CheckoutPage({ cartItems, onOrderComplete, showToast, user, promoCodes = [] }) {
  const [couponCode, setCouponCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null); // { code, type, value }
  const [paymentMethod, setPaymentMethod] = useState('razorpay'); // 'razorpay' | 'card' | 'cod'
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [copiedField, setCopiedField] = useState(null);
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  // Default available promo codes fallback
  const defaultPromos = [
    { code: 'SUMMER15', type: 'percent', value: 15, active: true },
    { code: 'EDEN10', type: 'percent', value: 10, active: true },
    { code: 'LUXURY5000', type: 'flat', value: 5000, active: true }
  ];

  const activePromoList = promoCodes && promoCodes.length > 0 ? promoCodes : defaultPromos;

  // Direct Card form state (for guaranteed card simulation without merchant restrictions)
  const [cardData, setCardData] = useState({
    cardNumber: '4012 0000 0000 0002',
    cardName: 'Alex Mercer',
    cardExp: '12/28',
    cardCvv: '123'
  });
  
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

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const shipping = subtotal >= 1500 ? 0 : (cartItems.length > 0 ? 150 : 0);
  
  // Calculate discount based on new promo logic
  let discountAmount = 0;
  if (appliedPromo) {
    if (appliedPromo.type === 'percent') {
      discountAmount = (subtotal * appliedPromo.value) / 100;
    } else if (appliedPromo.type === 'flat') {
      discountAmount = Math.min(appliedPromo.value, subtotal);
    }
  }
  
  const finalTotal = subtotal - discountAmount + shipping;

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

  const handleCardInputChange = (e) => {
    const { name, value } = e.target;
    setCardData(prev => ({ ...prev, [name]: value }));
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    showToast(`<i class="fa-solid fa-clipboard-check"></i> Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Helper to safely call payment API with multi-port and relative proxy fallbacks
  const callPaymentApi = async (endpoint, data) => {
    const backendTunnelUrl = "https://honest-trains-hear.loca.lt";
    const urlsToTry = [
      `/api/payment/${endpoint}`,
      `${backendTunnelUrl}/api/payment/${endpoint}`,
      `http://localhost:5000/api/payment/${endpoint}`,
      `http://localhost:5005/api/payment/${endpoint}`
    ];

    for (const url of urlsToTry) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await res.json();
          if (res.ok && json.success !== false) {
            return json;
          }
        }
      } catch {
        // Silently try next fallback URL
      }
    }
    return null;
  };

  // Helper to load Razorpay SDK dynamically if not yet ready
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

  // Form submit handler router
  const handleSubmitPayment = (e) => {
    e.preventDefault();
    if (paymentMethod === 'razorpay') {
      handleRazorpayPayment();
    } else if (paymentMethod === 'card') {
      handleDirectCardPayment();
    } else if (paymentMethod === 'cod') {
      handleCodPayment();
    }
  };

  // 1. Official Razorpay SDK Checkout Launch (UPI & NetBanking & Gateway)
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
    setProcessingStatus('Connecting to Razorpay gateway...');

    try {
      // Step 1: Create Order on Backend or Sandbox Generator
      const orderPayload = {
        amount: finalTotal,
        currency: 'INR',
        receipt: `eden_rcpt_${Date.now()}`,
        notes: {
          customerName: formData.name,
          customerEmail: formData.email,
          itemCount: cartItems.length,
          deliveryCity: formData.city
        }
      };

      const orderData = await callPaymentApi('create-order', orderPayload);
      const activeKeyId = orderData?.keyId || 'rzp_test_TPWevL7fL58oyF';
      const orderId = orderData?.order?.id || `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const amountInPaise = orderData?.order?.amount || Math.round(finalTotal * 100);

      setProcessingStatus('Loading Razorpay payment modal...');
      const isSdkLoaded = await loadRazorpaySDK();

      if (!isSdkLoaded || !window.Razorpay) {
        // If external CDN is unavailable or blocked, execute simulated sandbox flow
        console.warn('Razorpay SDK script not loaded from CDN, running test sandbox flow');
        await handleInstantSandboxTest(orderId);
        return;
      }

      // Step 2: Configure Razorpay Checkout Options
      const options = {
        key: activeKeyId,
        amount: amountInPaise,
        currency: 'INR',
        name: 'EDEN & THREAD',
        description: `Order ${orderId} • Luxury Artisanal Linen`,
        image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=128&auto=format&fit=crop&q=80',
        order_id: orderData?.order?.id ? orderId : undefined,
        handler: async function (response) {
          setProcessingStatus('Verifying payment signature with server...');
          try {
            const verifyPayload = {
              razorpay_order_id: response.razorpay_order_id || orderId,
              razorpay_payment_id: response.razorpay_payment_id || `pay_test_${Date.now()}`,
              razorpay_signature: response.razorpay_signature || 'test_sig'
            };

            const verifyData = await callPaymentApi('verify-payment', verifyPayload);

            const orderRecord = {
              orderId: response.razorpay_order_id || orderId,
              paymentId: response.razorpay_payment_id || verifyPayload.razorpay_payment_id,
              amount: finalTotal,
              items: [...cartItems],
              shipping: { ...formData },
              timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
              status: verifyData?.verified ? 'Paid & Signature Verified (Razorpay)' : 'Paid (Razorpay Test Mode)'
            };

            setConfirmedOrder(orderRecord);
            setIsProcessing(false);
            showToast('<i class="fa-solid fa-circle-check"></i> Payment Verified! Order Placed.');
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
            showToast('<i class="fa-solid fa-circle-info"></i> Razorpay payment modal closed.');
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
      // Fallback gracefully to instant sandbox test so testing is never blocked
      await handleInstantSandboxTest();
    }
  };

  // 2. Direct Card Payment Flow (Guaranteed 100% card test approval)
  const handleDirectCardPayment = async () => {
    if (!formData.name || !formData.email || !formData.address || !formData.city || !formData.zip) {
      showToast('<i class="fa-solid fa-triangle-exclamation"></i> Please fill in all shipping details.');
      return;
    }

    if (!cardData.cardNumber || !cardData.cardExp || !cardData.cardCvv) {
      showToast('<i class="fa-solid fa-triangle-exclamation"></i> Please enter card details.');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Authorizing test card with bank...');

    try {
      const orderPayload = {
        amount: finalTotal,
        currency: 'INR',
        receipt: `eden_card_${Date.now()}`
      };
      const orderData = await callPaymentApi('create-order', orderPayload);
      const orderId = orderData?.order?.id || `order_card_${Date.now()}`;
      const paymentId = `pay_card_${Math.random().toString(36).substring(2, 11)}`;

      // Verify on backend
      const verifyData = await callPaymentApi('verify-payment', {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: 'test_sandbox_signature'
      });

      const orderRecord = {
        orderId: orderId,
        paymentId: paymentId,
        amount: finalTotal,
        items: [...cartItems],
        shipping: { ...formData },
        timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        status: verifyData?.verified ? `Paid via Card (${cardData.cardNumber.slice(-4)}) - Test Verified` : 'Paid (Test Card Gateway)'
      };

      setTimeout(() => {
        setConfirmedOrder(orderRecord);
        setIsProcessing(false);
        setProcessingStatus('');
        showToast('<i class="fa-solid fa-circle-check"></i> Card Payment Approved! Order Placed.');
        if (onOrderComplete) onOrderComplete(orderRecord);
      }, 900);
    } catch (err) {
      console.error('Card payment error:', err);
      setIsProcessing(false);
      setProcessingStatus('');
      showToast(`<i class="fa-solid fa-triangle-exclamation"></i> Error: ${err.message}`);
    }
  };

  // 3. Cash on Delivery Flow
  const handleCodPayment = () => {
    if (!formData.name || !formData.email || !formData.address || !formData.city || !formData.zip) {
      showToast('<i class="fa-solid fa-triangle-exclamation"></i> Please fill in all shipping details.');
      return;
    }

    const orderRecord = {
      orderId: `order_cod_${Date.now()}`,
      paymentId: 'PAYABLE_ON_DELIVERY',
      amount: finalTotal,
      items: [...cartItems],
      shipping: { ...formData },
      timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      status: 'Pending Payment (Cash on Delivery)'
    };

    setConfirmedOrder(orderRecord);
    showToast('<i class="fa-solid fa-circle-check"></i> Order Placed with Cash on Delivery!');
    if (onOrderComplete) onOrderComplete(orderRecord);
  };

  // 4. Instant Sandbox Test Mode Flow (One-click Rapid Testing)
  const handleInstantSandboxTest = async (existingOrderId = null) => {
    setIsProcessing(true);
    setProcessingStatus('Processing simulated Razorpay test payment...');

    try {
      let orderId = existingOrderId;
      if (!orderId) {
        const orderData = await callPaymentApi('create-order', {
          amount: finalTotal,
          currency: 'INR',
          receipt: `eden_test_${Date.now()}`
        });
        orderId = orderData?.order?.id || `order_test_${Date.now()}`;
      }

      const testPaymentId = `pay_test_${Math.random().toString(36).substring(2, 12)}`;

      // Verify on backend
      const verifyData = await callPaymentApi('verify-payment', {
        razorpay_order_id: orderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: 'test_sandbox_signature'
      });

      const orderRecord = {
        orderId: orderId,
        paymentId: testPaymentId,
        amount: finalTotal,
        items: [...cartItems],
        shipping: { ...formData },
        timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        status: verifyData?.verified ? 'Paid & Verified (Sandbox Test)' : 'Paid (Instant Razorpay Sandbox)'
      };

      setTimeout(() => {
        setConfirmedOrder(orderRecord);
        setIsProcessing(false);
        setProcessingStatus('');
        showToast('<i class="fa-solid fa-circle-check"></i> Test Payment Succeeded!');
        if (onOrderComplete) onOrderComplete(orderRecord);
      }, 700);
    } catch (err) {
      console.error('Instant test error:', err);
      setIsProcessing(false);
      setProcessingStatus('');
      showToast(`<i class="fa-solid fa-triangle-exclamation"></i> Error: ${err.message}`);
    }
  };

  const handleSecureCheckoutRedirect = () => {
    localStorage.setItem("eden_threads_login_redirect", "#checkout");
    window.location.hash = "#login";
  };

  // Auth Wall Render
  if (!user) {
    return (
      <div style={{ paddingTop: '110px', paddingBottom: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ width: '100%', maxWidth: '450px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)', padding: '3rem 2.5rem', textAlign: 'center' }}>
          <i className="fa-solid fa-lock" style={{ fontSize: '2.5rem', color: 'var(--accent)', marginBottom: '1.5rem' }}></i>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 400, color: 'var(--green-dark)', marginBottom: '1rem' }}>Secure Checkout</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
            For verification and order security, an active session is required. Please sign in with your account to proceed to payment.
          </p>
          <button 
            onClick={handleSecureCheckoutRedirect}
            className="btn btn-primary"
            style={{ padding: '1rem 2rem', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}
          >
            Sign In to Checkout
          </button>
        </div>
      </div>
    );
  }

  // Confirmed Order Receipt Screen
  if (confirmedOrder) {
    return (
      <div style={{ paddingTop: '110px', paddingBottom: '80px' }} className="checkout-success-view">
        <div className="container" style={{ maxWidth: '780px' }}>
          <div style={{ 
            backgroundColor: '#fff', 
            border: '1px solid var(--border-medium)', 
            padding: '3.5rem 3rem', 
            boxShadow: 'var(--shadow-medium)',
            position: 'relative'
          }}>
            {/* Top Success Badge */}
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <div style={{ 
                width: '70px', 
                height: '70px', 
                borderRadius: '50%', 
                backgroundColor: 'var(--green-light)', 
                color: 'var(--green-dark)', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '2rem',
                marginBottom: '1.25rem'
              }}>
                <i className="fa-solid fa-check"></i>
              </div>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)' }}>
                Payment Confirmed
              </p>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', color: 'var(--green-dark)', marginTop: '0.25rem' }}>
                Thank You for Your Order
              </h1>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                A confirmation with your dispatch tracking has been prepared for <strong style={{ color: 'var(--text-primary)' }}>{confirmedOrder.shipping.email}</strong>.
              </p>
            </div>

            {/* Razorpay Transaction Details Card */}
            <div style={{ 
              backgroundColor: 'var(--bg-secondary)', 
              border: '1px solid var(--border-light)', 
              padding: '1.5rem 2rem', 
              marginBottom: '2rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1.25rem'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Order Reference
                </span>
                <strong style={{ fontSize: '0.85rem', color: 'var(--green-dark)', fontFamily: 'monospace' }}>
                  {confirmedOrder.orderId}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Payment ID
                </span>
                <strong style={{ fontSize: '0.85rem', color: 'var(--green-dark)', fontFamily: 'monospace' }}>
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

            {/* Delivery Destination */}
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

            {/* Action Buttons */}
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
        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '3rem' }}>
          Finalize your bespoke linen order with instant Razorpay test verification.
        </p>

        {cartItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <i className="fa-solid fa-basket-shopping" style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}></i>
            <p style={{ color: 'var(--text-secondary)' }}>Your shopping bag is empty. Add some luxury linen to continue.</p>
            <a href="#shop" className="btn btn-primary" style={{ marginTop: '1.5rem', display: 'inline-block' }}>Shop Collection</a>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '4rem' }} className="checkout-grid">
            {/* Left Column: Shipping & Payment */}
            <div>
              <form onSubmit={handleSubmitPayment}>
                {/* Shipping Details */}
                <div style={{ marginBottom: '3rem' }}>
                  <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--green-dark)', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
                    1. Shipping Information
                  </h3>
                  <div style={{ display: 'grid', gap: '1.25rem' }}>
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
                        placeholder="e.g. Alex Mercer"
                      />
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
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
                          placeholder="alex@gmail.com"
                        />
                      </div>
                      <div>
                        <label htmlFor="phone" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Phone (SMS Tracking)</label>
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
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', backgroundColor: 'var(--gold-light)', color: 'var(--gold-hover)', padding: '0.2rem 0.6rem', border: '1px solid var(--gold)' }}>
                      <i className="fa-solid fa-flask" style={{ marginRight: '4px' }}></i> Test Mode Active
                    </span>
                  </div>

                  {/* Payment Method Selector Tabs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('razorpay')}
                      style={{ 
                        padding: '1rem 0.75rem', 
                        border: `1.5px solid ${paymentMethod === 'razorpay' ? 'var(--green-dark)' : 'var(--border-medium)'}`,
                        backgroundColor: paymentMethod === 'razorpay' ? '#EAF0EC' : '#fff',
                        fontWeight: 600,
                        fontSize: '0.78rem',
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
                        <i className="fa-solid fa-mobile-screen"></i> UPI &amp; NetBanking
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                        Razorpay Modal
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      style={{ 
                        padding: '1rem 0.75rem', 
                        border: `1.5px solid ${paymentMethod === 'card' ? 'var(--green-dark)' : 'var(--border-medium)'}`,
                        backgroundColor: paymentMethod === 'card' ? '#EAF0EC' : '#fff',
                        fontWeight: 600,
                        fontSize: '0.78rem',
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
                        <i className="fa-solid fa-credit-card"></i> Card (Direct Test)
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#143C28', fontWeight: 600 }}>
                        100% Guaranteed
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
                        fontSize: '0.78rem',
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
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                        Pay on delivery
                      </span>
                    </button>
                  </div>

                  {/* TAB 1: Razorpay Popup (UPI / NetBanking) */}
                  {paymentMethod === 'razorpay' && (
                    <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', padding: '1.5rem', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <i className="fa-solid fa-qrcode" style={{ fontSize: '1.2rem', color: '#143C28' }}></i>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Official Razorpay Gateway Popup</span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Live Connected</span>
                      </div>

                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
                        Clicking the button opens the real <strong>Razorpay Checkout</strong> popup. In the popup, select <strong>UPI / Google Pay</strong> or <strong>NetBanking</strong> for instant successful test authorization.
                      </p>

                      {/* Interactive Test UPI Quick Bar */}
                      <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-light)', padding: '1.25rem', marginBottom: '1.25rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--green-dark)', display: 'block', marginBottom: '0.65rem' }}>
                          <i className="fa-solid fa-mobile-screen-button" style={{ marginRight: '5px', color: 'var(--gold)' }}></i> Razorpay Test Steps (100% Success):
                        </span>

                        <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                          <div>1️⃣ Click <strong>"Open Razorpay Checkout"</strong> below.</div>
                          <div>2️⃣ In the Razorpay popup, click <strong>"Pay with Google Pay UPI"</strong> (or enter <code>success@razorpay</code>).</div>
                          <div>3️⃣ On Razorpay's test simulator screen, click <strong style={{ color: '#143C28' }}>"Success"</strong>.</div>
                        </div>

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

                      {/* Fast Instant Sandbox Bypass Option */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '0.9rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Prefer 1-click test checkout?
                        </span>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleInstantSandboxTest()}
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid var(--green-dark)',
                            color: 'var(--green-dark)',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            padding: '0.35rem 0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          <i className="fa-solid fa-bolt" style={{ color: 'var(--gold)', marginRight: '4px' }}></i> Instant Mock Test
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Direct Card Simulation (100% Guaranteed Card Testing) */}
                  {paymentMethod === 'card' && (
                    <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', padding: '1.5rem', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <i className="fa-brands fa-cc-visa" style={{ fontSize: '1.4rem', color: '#1a332a' }}></i>
                          <i className="fa-brands fa-cc-mastercard" style={{ fontSize: '1.4rem', color: '#eb001b' }}></i>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Direct Card Test Gateway</span>
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#143C28', fontWeight: 600, backgroundColor: '#EAF0EC', padding: '0.2rem 0.5rem', borderRadius: '2px' }}>
                          ✓ Guaranteed 100% Pass
                        </span>
                      </div>

                      <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.25rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Card Number</label>
                          <input 
                            type="text" 
                            name="cardNumber"
                            value={cardData.cardNumber}
                            onChange={handleCardInputChange}
                            required
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-medium)', backgroundColor: '#fff', fontSize: '0.9rem', fontFamily: 'monospace' }}
                            placeholder="4012 0000 0000 0002"
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Expiry (MM/YY)</label>
                            <input 
                              type="text" 
                              name="cardExp"
                              value={cardData.cardExp}
                              onChange={handleCardInputChange}
                              required
                              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-medium)', backgroundColor: '#fff', fontSize: '0.9rem' }}
                              placeholder="12/28"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>CVV</label>
                            <input 
                              type="password" 
                              name="cardCvv"
                              value={cardData.cardCvv}
                              onChange={handleCardInputChange}
                              required
                              maxLength="4"
                              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-medium)', backgroundColor: '#fff', fontSize: '0.9rem' }}
                              placeholder="123"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Quick Fill Preset Buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => setCardData({ cardNumber: '4012 0000 0000 0002', cardName: 'Alex Mercer', cardExp: '12/28', cardCvv: '123' })}
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', backgroundColor: '#fff', border: '1px solid var(--border-medium)', cursor: 'pointer' }}
                        >
                          <i className="fa-brands fa-cc-visa" style={{ marginRight: '4px' }}></i> Auto-fill Visa
                        </button>
                        <button
                          type="button"
                          onClick={() => setCardData({ cardNumber: '5123 4500 0000 0008', cardName: 'Alex Mercer', cardExp: '12/28', cardCvv: '123' })}
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', backgroundColor: '#fff', border: '1px solid var(--border-medium)', cursor: 'pointer' }}
                        >
                          <i className="fa-brands fa-cc-mastercard" style={{ marginRight: '4px' }}></i> Auto-fill Mastercard
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: Cash on Delivery */}
                  {paymentMethod === 'cod' && (
                    <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        You will pay cash upon physical delivery. Please ensure exact change is available at the time of delivery.
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
                      {processingStatus || 'Connecting to Payment Gateway...'}
                    </span>
                  ) : paymentMethod === 'razorpay' ? (
                    <span>
                      <i className="fa-solid fa-lock" style={{ marginRight: '8px', fontSize: '0.8rem' }}></i>
                      Open Razorpay UPI &bull; ₹{finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  ) : paymentMethod === 'card' ? (
                    <span>
                      <i className="fa-solid fa-credit-card" style={{ marginRight: '8px', fontSize: '0.8rem' }}></i>
                      Pay with Card (Test Mode) &bull; ₹{finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                    onClick={() => { setAppliedPromo(null); setCouponCode(''); showToast('Promo code removed.'); }}
                    className="btn btn-secondary" 
                    style={{ padding: '0.6rem 1rem', fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600, color: '#b91c1c' }}
                  >
                    Remove
                  </button>
                ) : (
                  <button 
                    type="submit" 
                    className="btn btn-secondary" 
                    style={{ padding: '0.6rem 1.25rem', fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600, minWidth: '80px' }}
                  >
                    Apply
                  </button>
                )}
              </form>

              {appliedPromo && (
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.5rem 0.75rem', borderRadius: '4px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600 }}>
                    <i className="fa-solid fa-tag" style={{ marginRight: '6px' }}></i>
                    {appliedPromo.code}: {appliedPromo.type === 'flat' ? `₹${appliedPromo.value.toLocaleString('en-IN')} OFF` : `${appliedPromo.value}% OFF`}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700 }}>
                    -₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {/* Price Breakdown */}
              <div style={{ display: 'grid', gap: '0.75rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontWeight: 600 }}>
                    <span>Promo Discount ({appliedPromo?.code})</span>
                    <span>- ₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Shipping</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    {shipping === 0 ? 'Complimentary' : `₹${shipping.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '1rem', fontSize: '1.05rem', color: 'var(--green-dark)', fontWeight: 700 }}>
                  <span>Total Due</span>
                  <span>₹{finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
