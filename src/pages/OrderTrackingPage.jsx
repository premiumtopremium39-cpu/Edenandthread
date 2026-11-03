import React, { useState, useEffect } from 'react';
import { orderService, isSupabaseConfigured } from '../lib/supabase';

export default function OrderTrackingPage({ orders, initialOrderId, onNavigateToShop }) {
  const [searchOrderId, setSearchOrderId] = useState(initialOrderId || '');
  const [activeOrder, setActiveOrder] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

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
      orderService.trackOrder(initialOrderId).then(cloudOrder => {
        if (cloudOrder) {
          setActiveOrder(cloudOrder);
          setSearchOrderId(cloudOrder.orderId);
        }
      });
    }
  }, [orders, initialOrderId]);

  // Keep activeOrder synced in real-time when the orders prop updates from Supabase channel
  useEffect(() => {
    if (activeOrder && orders && orders.length > 0) {
      const updated = orders.find(o => o.orderId === activeOrder.orderId);
      if (updated && (
        updated.status !== activeOrder.status ||
        updated.trackingNumber !== activeOrder.trackingNumber ||
        updated.carrier !== activeOrder.carrier
      )) {
        setActiveOrder(updated);
      }
    }
  }, [orders]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setSearchError('');
    if (!searchOrderId.trim()) {
      setSearchError('Please enter your Order Reference (e.g. #eden_ord_...) or registered email.');
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

    setSearchError(`No order records found matching "${searchOrderId}". Please check your order reference number.`);
  };

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2200);
  };

  // Determine stage index in the 4-stage delivery pipeline:
  // 1: Order Confirmed (Razorpay Paid)
  // 2: Atelier Prepared (Hand-inspected, packed in European flax garment bag)
  // 3: Dispatched to Shadowfax (Booked & handed over with AWB)
  // 4: Delivered (Consignment handed over to recipient)
  const getStageIndex = (status = '') => {
    const s = (status || '').toLowerCase();
    if (s.includes('delivered')) return 4;
    if (s.includes('dispatched') || s.includes('transit') || s.includes('shipped') || s.includes('shadowfax')) return 3;
    if (s.includes('preparation') || s.includes('prepared') || s.includes('tailoring') || s.includes('processing')) return 2;
    if (s.includes('paid') || s.includes('placed') || s.includes('verified') || s.includes('pending')) return 1;
    return 1;
  };

  const currentStage = activeOrder ? getStageIndex(activeOrder.status) : 1;

  // Format order date nicely
  const orderDateObj = activeOrder?.timestamp
    ? new Date(activeOrder.timestamp)
    : (activeOrder?.createdAt ? new Date(activeOrder.createdAt) : new Date());

  const formattedOrderDate = isNaN(orderDateObj.getTime())
    ? 'Recently Placed'
    : orderDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  // Calculate estimated delivery: 3 to 5 business days from order date
  const minDeliveryDate = new Date(orderDateObj);
  minDeliveryDate.setDate(minDeliveryDate.getDate() + 3);
  const maxDeliveryDate = new Date(orderDateObj);
  maxDeliveryDate.setDate(maxDeliveryDate.getDate() + 5);

  const formattedEstDelivery = `${minDeliveryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${maxDeliveryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const carrierName = activeOrder?.carrier || 'Shadowfax';
  const awbNumber = activeOrder?.trackingNumber || (currentStage >= 3 ? 'SFX-EXP-PENDING' : null);
  const shadowfaxPortalUrl = awbNumber && awbNumber !== 'SFX-EXP-PENDING'
    ? `https://tracker.shadowfax.in/#/track?awb=${encodeURIComponent(awbNumber)}`
    : 'https://tracker.shadowfax.in/';

  // 4 Professional Delivery Stages
  const stages = [
    {
      num: 1,
      title: 'Order Confirmed',
      badge: 'Payment Verified',
      date: formattedOrderDate,
      summary: 'Payment captured securely via Razorpay. Order registered in Atelier logistics queue.',
      icon: 'fa-check'
    },
    {
      num: 2,
      title: 'Atelier Prepared',
      badge: currentStage >= 2 ? 'Completed' : 'Next Step',
      date: currentStage >= 2 ? 'Quality Checked' : 'Expected in 24 hrs',
      summary: 'Garments steamed, inspected for stitching purity, and sealed inside breathable flax protective bags.',
      icon: 'fa-box-archive'
    },
    {
      num: 3,
      title: 'Dispatched to Shadowfax',
      badge: currentStage >= 3 ? 'In Transit' : 'Scheduled',
      date: currentStage >= 3 ? `${carrierName} Hub` : 'Awaiting Courier Handover',
      summary: currentStage >= 3
        ? `Consignment handed to ${carrierName} courier. Air Waybill assigned for express transit.`
        : `Atelier owner books Shadowfax express courier pickup and generates your AWB tracking code.`,
      icon: 'fa-truck-fast'
    },
    {
      num: 4,
      title: 'Delivered',
      badge: currentStage === 4 ? 'Delivered' : 'Final Step',
      date: currentStage === 4 ? 'Handed Over' : formattedEstDelivery,
      summary: currentStage === 4
        ? 'Package delivered into patron hands. Verified via courier receipt.'
        : `Handed over directly to your shipping destination with recipient verification.`,
      icon: 'fa-house-circle-check'
    }
  ];

  return (
    <div style={{ minHeight: '85vh', backgroundColor: '#F9F8F5', padding: '110px 1.25rem 6rem', fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)' }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
        
        {/* Luxury Brand Atelier Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 14px', backgroundColor: 'rgba(26, 47, 35, 0.06)', borderRadius: '20px', marginBottom: '1rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#1A2F23' }}></span>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#1A2F23', fontWeight: 600 }}>
              Live Consignment Tracker &bull; Shadowfax Express Logistics
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display, "Playfair Display", Georgia, serif)', fontSize: '2.5rem', color: '#1A2F23', fontWeight: 400, letterSpacing: '-0.01em', margin: '0 0 0.75rem 0' }}>
            Track Your Garment Delivery
          </h1>
          <p style={{ fontSize: '0.92rem', color: '#666', maxWidth: '580px', margin: '0 auto', lineHeight: 1.6 }}>
            Follow the journey of your handcrafted European linen pieces from our artisan atelier through our courier partner <strong style={{ color: '#1A2F23' }}>Shadowfax</strong> directly to your door.
          </p>
        </div>

        {/* Search & Lookup Bar (Allen Solly Style) */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E3DA', borderRadius: '8px', padding: '1.5rem 1.75rem', boxShadow: '0 4px 18px rgba(0,0,0,0.03)', marginBottom: '2.5rem' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
              <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', color: '#8C857B', fontSize: '0.9rem' }}></i>
              <input 
                type="text" 
                value={searchOrderId}
                onChange={(e) => setSearchOrderId(e.target.value)}
                placeholder="Enter Order Reference (#eden_ord_...) or AWB Number"
                style={{ 
                  width: '100%', 
                  padding: '0.9rem 1rem 0.9rem 2.85rem', 
                  border: '1px solid #D5D0C5', 
                  borderRadius: '4px',
                  fontSize: '0.88rem',
                  fontFamily: 'inherit',
                  outline: 'none',
                  backgroundColor: '#FAFAF8',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#1A2F23'}
                onBlur={(e) => e.target.style.borderColor = '#D5D0C5'}
              />
            </div>
            <button 
              type="submit" 
              disabled={isSearching}
              style={{ 
                padding: '0.9rem 2.2rem', 
                fontSize: '0.78rem', 
                letterSpacing: '0.12em', 
                textTransform: 'uppercase', 
                fontWeight: 600, 
                backgroundColor: '#1A2F23', 
                color: '#FAF8F5', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.6rem',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#284635'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1A2F23'}
            >
              {isSearching ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-location-crosshairs"></i>}
              {isSearching ? 'Querying...' : 'Track Order'}
            </button>
          </form>

          {searchError && (
            <div style={{ marginTop: '1rem', color: '#A04000', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px', padding: '0.65rem 1rem', backgroundColor: '#FDF6E9', border: '1px solid #F5E0B7', borderRadius: '4px' }}>
              <i className="fa-solid fa-circle-exclamation"></i> {searchError}
            </div>
          )}

          {/* Quick Select Recent Orders Pills */}
          {orders && orders.length > 0 && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #EFECE6', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                Recent Placed Orders:
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
                    backgroundColor: activeOrder?.orderId === ord.orderId ? '#1A2F23' : '#F2EFE9',
                    color: activeOrder?.orderId === ord.orderId ? '#FFFFFF' : '#333333',
                    border: '1px solid',
                    borderColor: activeOrder?.orderId === ord.orderId ? '#1A2F23' : '#DDD7CB',
                    padding: '0.35rem 0.85rem',
                    fontSize: '0.74rem',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    borderRadius: '20px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>{ord.orderId.length > 22 ? `${ord.orderId.slice(0, 20)}...` : ord.orderId}</span>
                  <span style={{ opacity: 0.65 }}>• ₹{ord.amount?.toLocaleString('en-IN') || ord.total?.toLocaleString('en-IN')}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active Order Details Display */}
        {activeOrder ? (
          <div>
            {/* Top Order Summary Card (Allen Solly / Luxury E-commerce Standard) */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E3DA', borderRadius: '8px', padding: '2rem', boxShadow: '0 4px 18px rgba(0,0,0,0.03)', marginBottom: '2rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', borderBottom: '1px solid #EFECE6', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8C857B', fontWeight: 600 }}>
                      Consignment Reference
                    </span>
                    <span style={{ 
                      padding: '2px 10px', 
                      fontSize: '0.7rem', 
                      letterSpacing: '0.08em', 
                      textTransform: 'uppercase', 
                      fontWeight: 700, 
                      backgroundColor: currentStage === 4 ? '#E8F5E9' : currentStage === 3 ? '#E0F2FE' : '#FEF3C7',
                      color: currentStage === 4 ? '#1B5E20' : currentStage === 3 ? '#0369A1' : '#92400E',
                      borderRadius: '12px'
                    }}>
                      {currentStage === 4 ? 'DELIVERED' : currentStage === 3 ? 'IN TRANSIT WITH SHADOWFAX' : currentStage === 2 ? 'PREPARED IN ATELIER' : 'PAYMENT CONFIRMED'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontFamily: 'monospace', fontSize: '1.35rem', color: '#1A2F23', margin: 0, fontWeight: 700 }}>
                      {activeOrder.orderId}
                    </h2>
                    <button
                      onClick={() => copyToClipboard(activeOrder.orderId, 'orderId')}
                      title="Copy Order ID"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedField === 'orderId' ? '#166534' : '#888', fontSize: '0.85rem', padding: '4px' }}
                    >
                      <i className={copiedField === 'orderId' ? "fa-solid fa-check" : "fa-regular fa-copy"}></i>
                    </button>
                  </div>

                  <p style={{ fontSize: '0.82rem', color: '#777', margin: '0.4rem 0 0 0' }}>
                    Ordered on {formattedOrderDate} &bull; Payment via <strong style={{ color: '#1A2F23' }}>Razorpay (Prepaid)</strong>
                  </p>
                </div>

                {/* Estimated Delivery Box */}
                <div style={{ backgroundColor: '#F8F6F1', border: '1px solid #E5E0D5', borderRadius: '6px', padding: '1rem 1.4rem', textAlign: 'right', minWidth: '220px' }}>
                  <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8C857B', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                    {currentStage === 4 ? 'Delivery Fulfilled' : 'Estimated Delivery'}
                  </span>
                  <div style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: '1.25rem', fontWeight: 600, color: '#1A2F23' }}>
                    {currentStage === 4 ? 'Successfully Handed Over' : formattedEstDelivery}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#666' }}>
                    Standard Courier Window (3–5 Business Days)
                  </span>
                </div>
              </div>

              {/* Luxury Allen Solly Style Milestone Stepper */}
              <div style={{ padding: '0.5rem 0 1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', position: 'relative' }}>
                  
                  {/* Progress Line Behind Circles */}
                  <div style={{ 
                    position: 'absolute', 
                    top: '26px', 
                    left: '12%', 
                    right: '12%', 
                    height: '3px', 
                    backgroundColor: '#E5E0D5', 
                    zIndex: 1 
                  }}>
                    <div style={{ 
                      height: '100%', 
                      width: currentStage === 1 ? '0%' : currentStage === 2 ? '33.3%' : currentStage === 3 ? '66.6%' : '100%', 
                      backgroundColor: '#1A2F23', 
                      transition: 'width 0.4s ease' 
                    }}></div>
                  </div>

                  {stages.map((stage) => {
                    const isCompleted = currentStage >= stage.num;
                    const isCurrent = currentStage === stage.num;

                    return (
                      <div key={stage.num} style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
                        {/* Circle Indicator */}
                        <div style={{ 
                          width: '52px', 
                          height: '52px', 
                          borderRadius: '50%', 
                          margin: '0 auto 1rem', 
                          backgroundColor: isCompleted ? '#1A2F23' : '#FFFFFF',
                          color: isCompleted ? '#FAF8F5' : '#A0988C',
                          border: isCurrent ? '3px solid #B87333' : isCompleted ? '2px solid #1A2F23' : '2px solid #D8D2C5',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontSize: '1.1rem',
                          boxShadow: isCurrent ? '0 0 0 5px rgba(184, 115, 51, 0.2)' : '0 2px 6px rgba(0,0,0,0.05)',
                          transition: 'all 0.3s ease'
                        }}>
                          <i className={`fa-solid ${stage.icon}`}></i>
                        </div>

                        {/* Title & Stage Details */}
                        <div style={{ fontSize: '0.86rem', fontWeight: isCurrent ? 700 : isCompleted ? 600 : 500, color: isCompleted ? '#1A2F23' : '#888', marginBottom: '0.25rem' }}>
                          {stage.title}
                        </div>

                        <div style={{ 
                          fontSize: '0.68rem', 
                          fontWeight: 700, 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.06em', 
                          color: isCurrent ? '#B87333' : isCompleted ? '#2E7D32' : '#999',
                          marginBottom: '0.35rem'
                        }}>
                          {stage.badge}
                        </div>

                        <p style={{ fontSize: '0.72rem', color: '#666', lineHeight: 1.4, margin: '0 auto', maxWidth: '200px' }}>
                          {stage.summary}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shadowfax Courier Consignment Card (Highlights the exact pipeline) */}
              <div style={{ 
                marginTop: '2.5rem', 
                backgroundColor: currentStage >= 3 ? '#F0FDF4' : '#F8F6F1', 
                border: `1px solid ${currentStage >= 3 ? '#BBF7D0' : '#E8E3D8'}`, 
                borderRadius: '8px', 
                padding: '1.5rem 1.75rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                flexWrap: 'wrap', 
                gap: '1.25rem' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ 
                    width: '52px', 
                    height: '52px', 
                    borderRadius: '8px', 
                    backgroundColor: '#1A2F23', 
                    color: '#FAF8F5', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    flexShrink: 0
                  }}>
                    <i className="fa-solid fa-truck-ramp-box"></i>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.2rem' }}>
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#666', fontWeight: 600 }}>
                        Logistics Partner:
                      </span>
                      <strong style={{ color: '#1A2F23', fontSize: '0.92rem' }}>{carrierName}</strong>
                      <span style={{ padding: '1px 8px', fontSize: '0.65rem', backgroundColor: '#E2E8F0', borderRadius: '10px', color: '#334155', fontWeight: 600 }}>
                        Surface & Air Express
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.8rem', color: '#555' }}>Shadowfax AWB:</span>
                      {awbNumber && awbNumber !== 'SFX-EXP-PENDING' ? (
                        <>
                          <code style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.95rem', color: '#1A2F23', backgroundColor: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', border: '1px solid #D5D0C5' }}>
                            {awbNumber}
                          </code>
                          <button
                            onClick={() => copyToClipboard(awbNumber, 'awb')}
                            title="Copy AWB Number"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedField === 'awb' ? '#166534' : '#666', fontSize: '0.8rem' }}
                          >
                            <i className={copiedField === 'awb' ? "fa-solid fa-check" : "fa-regular fa-copy"}></i>
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#777', fontStyle: 'italic' }}>
                          {currentStage === 2 ? 'AWB will be assigned upon Shadowfax dispatch' : 'Generated after packaging'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  {awbNumber && awbNumber !== 'SFX-EXP-PENDING' ? (
                    <a 
                      href={shadowfaxPortalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '0.75rem 1.4rem', 
                        fontSize: '0.75rem', 
                        fontWeight: 600, 
                        letterSpacing: '0.08em', 
                        textTransform: 'uppercase', 
                        backgroundColor: '#1A2F23', 
                        color: '#FAF8F5', 
                        textDecoration: 'none', 
                        borderRadius: '4px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)' 
                      }}
                    >
                      <span>Track on Shadowfax Portal</span>
                      <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.75rem' }}></i>
                    </a>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: '#666', textAlign: 'right' }}>
                      <i className="fa-solid fa-shield-halved" style={{ marginRight: '6px', color: '#1A2F23' }}></i>
                      Inspected & Sealed at Atelier
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Consignment Items & Delivery Destination Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '2rem' }}>
              
              {/* Ordered Garments Card */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E3DA', borderRadius: '8px', padding: '1.75rem', boxShadow: '0 4px 18px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #EFECE6', paddingBottom: '0.85rem' }}>
                  <h3 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: '1.25rem', color: '#1A2F23', fontWeight: 400, margin: 0 }}>
                    Consignment Items ({activeOrder.items?.length || 0})
                  </h3>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', fontWeight: 600 }}>
                    Artisanal Linen
                  </span>
                </div>

                <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                  {activeOrder.items?.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'center', borderBottom: '1px solid #F3F1EC', paddingBottom: '1rem' }}>
                      <img 
                        src={item.image || '/assets/shirt_front.png'} 
                        alt={item.title} 
                        style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '4px', backgroundColor: '#F5F3EE', border: '1px solid #E8E5DD' }}
                      />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '0.88rem', fontWeight: 600, margin: '0 0 0.25rem 0', color: '#1A2F23' }}>{item.title}</h4>
                        <div style={{ fontSize: '0.75rem', color: '#777', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span>Size: <strong style={{ color: '#333' }}>{item.size}</strong></span>
                          <span>&bull;</span>
                          <span>Color: <strong style={{ color: '#333' }}>{item.color}</strong></span>
                          <span>&bull;</span>
                          <span>Qty: <strong style={{ color: '#333' }}>{item.qty}</strong></span>
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, color: '#1A2F23', fontSize: '0.92rem' }}>
                        ₹{((item.price || 0) * (item.qty || 1)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid #E8E5DD', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#777', display: 'block' }}>Total Paid Amount</span>
                    <span style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 600 }}><i className="fa-solid fa-circle-check"></i> Prepaid via Razorpay</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: '1.4rem', fontWeight: 700, color: '#1A2F23' }}>
                    ₹{parseFloat(activeOrder.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Delivery Address & Customer Service Card */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E3DA', borderRadius: '8px', padding: '1.75rem', boxShadow: '0 4px 18px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #EFECE6', paddingBottom: '0.85rem' }}>
                    <h3 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: '1.25rem', color: '#1A2F23', fontWeight: 400, margin: 0 }}>
                      Delivery Destination
                    </h3>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', fontWeight: 600 }}>
                      Secure Address
                    </span>
                  </div>

                  <div style={{ fontSize: '0.88rem', color: '#444', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    <div style={{ fontWeight: 700, color: '#1A2F23', fontSize: '0.96rem', marginBottom: '0.25rem' }}>
                      {activeOrder.shipping?.name || 'Valued Patron'}
                    </div>
                    <div>{activeOrder.shipping?.address || 'Shipping Address on file'}</div>
                    <div>
                      {activeOrder.shipping?.city ? `${activeOrder.shipping.city}, ` : ''}
                      {activeOrder.shipping?.state ? `${activeOrder.shipping.state} ` : ''}
                      {activeOrder.shipping?.zip || ''}
                    </div>
                    {activeOrder.shipping?.country && <div>{activeOrder.shipping.country}</div>}
                    
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #E5E0D5', fontSize: '0.8rem', color: '#666' }}>
                      <div><i className="fa-solid fa-phone" style={{ width: '16px', color: '#888' }}></i> {activeOrder.shipping?.phone || 'Phone on file'}</div>
                      <div><i className="fa-solid fa-envelope" style={{ width: '16px', color: '#888' }}></i> {activeOrder.shipping?.email || 'Email on file'}</div>
                    </div>
                  </div>

                  {/* Payment Verification Proof */}
                  <div style={{ backgroundColor: '#F8F6F1', border: '1px solid #E8E3D8', borderRadius: '6px', padding: '0.85rem 1rem', marginBottom: '1.5rem', fontSize: '0.78rem', color: '#555' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span>Razorpay Reference:</span>
                      <code style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1A2F23' }}>{activeOrder.paymentId}</code>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Tax Invoice:</span>
                      <span style={{ color: '#166534', fontWeight: 600 }}>Included in shipment</span>
                    </div>
                  </div>
                </div>

                <div>
                  <button 
                    onClick={onNavigateToShop}
                    style={{ 
                      width: '100%', 
                      padding: '0.85rem', 
                      fontSize: '0.75rem', 
                      letterSpacing: '0.1em', 
                      textTransform: 'uppercase', 
                      fontWeight: 600,
                      backgroundColor: 'transparent',
                      color: '#1A2F23',
                      border: '1px solid #1A2F23',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#1A2F23';
                      e.currentTarget.style.color = '#FAF8F5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#1A2F23';
                    }}
                  >
                    <i className="fa-solid fa-bag-shopping"></i> Continue Exploring Collections
                  </button>
                </div>

              </div>

            </div>

            {/* Atelier Concierge & Packaging Assurance Banner */}
            <div style={{ marginTop: '2.5rem', backgroundColor: '#FFFFFF', border: '1px solid #E6E3DA', borderRadius: '8px', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#F4EFE6', color: '#B87333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                  <i className="fa-solid fa-envelope-open-text"></i>
                </div>
                <div>
                  <h4 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: '1.05rem', color: '#1A2F23', margin: '0 0 0.2rem 0' }}>
                    Need Assistance with Your Delivery?
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>
                    Our Atelier Logistics Concierge is ready to assist with address modifications, courier queries, or gift wrapping requests.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <a
                  href="mailto:concierge@edentreads.com"
                  style={{ 
                    padding: '0.65rem 1.25rem', 
                    fontSize: '0.72rem', 
                    fontWeight: 600, 
                    letterSpacing: '0.08em', 
                    textTransform: 'uppercase', 
                    textDecoration: 'none', 
                    color: '#1A2F23', 
                    border: '1px solid #D5D0C5', 
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <i className="fa-regular fa-envelope"></i> Email Atelier
                </a>
              </div>
            </div>

          </div>
        ) : (
          /* Empty State */
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #E6E3DA', borderRadius: '8px', padding: '4.5rem 2rem', textAlign: 'center', boxShadow: '0 4px 18px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#F8F6F1', color: '#A0988C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', margin: '0 auto 1.5rem' }}>
              <i className="fa-solid fa-box-open"></i>
            </div>
            <h3 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: '1.75rem', color: '#1A2F23', fontWeight: 400, marginBottom: '0.5rem' }}>
              No Active Consignment Selected
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#666', maxWidth: '440px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
              Enter your Order Reference Number (#eden_ord_...) or Shadowfax AWB tracking code above to view live progress.
            </p>
            <button 
              onClick={onNavigateToShop}
              style={{ 
                padding: '0.9rem 2.5rem', 
                fontSize: '0.78rem', 
                letterSpacing: '0.12em', 
                textTransform: 'uppercase', 
                fontWeight: 600, 
                backgroundColor: '#1A2F23', 
                color: '#FAF8F5', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Explore Garment Collections
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
