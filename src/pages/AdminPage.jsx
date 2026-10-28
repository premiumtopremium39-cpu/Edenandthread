import React, { useState, useMemo } from 'react';
import { orderService, isSupabaseConfigured } from '../lib/supabase';

/**
 * Eden & Thread — Executive Admin Operations & Packing Dashboard
 * - Orders list with search (order ID, name, email) & filters (payment, fulfilment, courier)
 * - Detailed order breakdown with exact size, colour, SKU, quantity snapshots
 * - Fulfilment workflow: New / Paid -> Confirmed -> Picking -> Packed -> Ready for Pickup -> Shipment Booked -> Shipped -> Delivered
 * - Print-friendly Packing Slip for warehouse order picking
 * - Real-time Shadowfax forward logistics booking & tracking
 */

export default function AdminPage({
  user,
  orders = [],
  products = [],
  onUpdateOrderStatus,
  showToast = () => {}
}) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'packing-slip'
  const [isBookingShipment, setIsBookingShipment] = useState(false);
  const [isCheckingService, setIsCheckingService] = useState(false);
  const [serviceabilityResult, setServiceabilityResult] = useState(null);

  // Authorization check
  const isAdmin = user?.role === 'admin' ||
    user?.email === 'admin@mail.com' ||
    user?.email === 'admin@edenthreads.luxury' ||
    (typeof window !== 'undefined' && localStorage.getItem('eden_threads_admin_session') === 'true');

  // Filtered & Searched Orders (Sorted newest first)
  const filteredOrders = useMemo(() => {
    return (orders || []).filter(ord => {
      const q = searchQuery.toLowerCase().trim();
      const orderId = (ord.orderId || '').toLowerCase();
      const customer = (ord.customerName || ord.shipping?.name || '').toLowerCase();
      const email = (ord.customerEmail || ord.shipping?.email || '').toLowerCase();
      const matchesSearch = !q || orderId.includes(q) || customer.includes(q) || email.includes(q);

      const ordStatus = (ord.status || ord.order_status || '').toLowerCase();
      const ordFulfilment = (ord.notes?.fulfilment_status || ordStatus).toLowerCase();

      let matchesStatus = true;
      if (statusFilter !== 'ALL') {
        matchesStatus = ordFulfilment.includes(statusFilter.toLowerCase()) || ordStatus.includes(statusFilter.toLowerCase());
      }

      let matchesPayment = true;
      const isPaid = ord.paymentStatus === 'paid' || ord.status?.toLowerCase().includes('paid');
      const isCod = ord.notes?.payment_method === 'cod' || ord.paymentId === 'PAYABLE_ON_DELIVERY';

      if (paymentFilter === 'PAID') matchesPayment = isPaid && !isCod;
      else if (paymentFilter === 'COD') matchesPayment = isCod;
      else if (paymentFilter === 'PENDING') matchesPayment = !isPaid && !isCod;

      return matchesSearch && matchesStatus && matchesPayment;
    }).sort((a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0));
  }, [orders, searchQuery, statusFilter, paymentFilter]);

  if (!isAdmin) {
    return (
      <div style={{ paddingTop: '120px', paddingBottom: '80px', minHeight: '70vh', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '520px', margin: '0 auto', padding: '3rem 2rem', background: '#fff', border: '1px solid var(--border-light)' }}>
          <i className="fa-solid fa-lock" style={{ fontSize: '2.5rem', color: 'var(--green-dark)', marginBottom: '1.5rem' }}></i>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.75rem', color: '#143C28', marginBottom: '0.75rem' }}>
            Executive Restraint
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.75rem' }}>
            Administrative operations and order fulfilment require authorized store owner credentials.
          </p>
          <a href="#login" className="btn-luxury" style={{ display: 'inline-block', padding: '0.85rem 2rem' }}>
            Sign In with Admin Account
          </a>
        </div>
      </div>
    );
  }

  // Handle Changing Fulfilment Stage
  const handleTransitionStatus = async (orderId, newStatus, fulfilmentStep) => {
    try {
      if (onUpdateOrderStatus) {
        await onUpdateOrderStatus(orderId, newStatus, null, null, fulfilmentStep);
      } else {
        await orderService.updateOrderStatus(orderId, newStatus, null, null, fulfilmentStep);
      }
      showToast(`<i class="fa-solid fa-circle-check"></i> Order status transitioned to: ${fulfilmentStep || newStatus}`);
      if (selectedOrder && selectedOrder.orderId === orderId) {
        setSelectedOrder(prev => ({
          ...prev,
          status: newStatus,
          order_status: newStatus,
          notes: {
            ...(prev.notes || {}),
            fulfilment_status: fulfilmentStep || newStatus
          }
        }));
      }
    } catch (err) {
      showToast(`<i class="fa-solid fa-triangle-exclamation"></i> Status update error: ${err.message}`);
    }
  };

  // Check Courier Serviceability
  const handleCheckServiceability = async (order) => {
    setIsCheckingService(true);
    setServiceabilityResult(null);
    try {
      const res = await orderService.checkShadowfaxServiceability(order.orderId);
      if (res?.serviceability) {
        setServiceabilityResult(res.serviceability);
        showToast(`<i class="fa-solid fa-truck-fast"></i> Shadowfax: ${res.serviceability.serviceable ? 'Serviceable' : 'Unserviceable'}`);
      }
    } catch (err) {
      showToast(`<i class="fa-solid fa-triangle-exclamation"></i> Serviceability check failed: ${err.message}`);
    } finally {
      setIsCheckingService(false);
    }
  };

  // Book Shadowfax Shipment
  const handleBookShadowfax = async (order) => {
    if (!window.confirm(`Confirm forward logistics booking with Shadowfax for Order #${order.orderId}? This will generate a registered courier AWB.`)) {
      return;
    }

    setIsBookingShipment(true);
    try {
      const res = await orderService.bookShadowfaxShipment(order.orderId);
      if (res?.success) {
        showToast(`<i class="fa-solid fa-box-check"></i> Shadowfax AWB Generated: ${res.awbNumber}`);
        // Refresh active selected order state
        setSelectedOrder(prev => ({
          ...prev,
          status: 'Dispatched',
          carrier: 'Shadowfax',
          trackingNumber: res.awbNumber,
          notes: {
            ...(prev.notes || {}),
            shadowfax_booked: true,
            fulfilment_status: 'Shipment Booked',
            tracking_url: res.trackingUrl
          }
        }));
        if (onUpdateOrderStatus) {
          onUpdateOrderStatus(order.orderId, 'Dispatched', 'Shadowfax', res.awbNumber, 'Shipment Booked');
        }
      } else {
        throw new Error(res?.error || 'Shadowfax API booking was not completed');
      }
    } catch (err) {
      showToast(`<i class="fa-solid fa-triangle-exclamation"></i> Shadowfax Booking Error: ${err.message}`);
    } finally {
      setIsBookingShipment(false);
    }
  };

  // Print Packing Slip Trigger
  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div style={{ paddingTop: '100px', paddingBottom: '80px', backgroundColor: '#FDFBF7', minHeight: '90vh' }}>
      
      {/* Top Admin Header Bar */}
      <div style={{ backgroundColor: '#143C28', color: '#fff', padding: '1.75rem 0', borderBottom: '1px solid #D4AF37' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#D4AF37', fontWeight: 600 }}>
              EDEN &amp; THREAD ATELIER OPERATIONS
            </div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.65rem', margin: '0.25rem 0 0 0', fontWeight: 600 }}>
              Orders, Packing &amp; Shadowfax Logistics
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.4rem 0.8rem', borderRadius: '4px' }}>
              <i className="fa-solid fa-user-shield" style={{ marginRight: '0.4rem', color: '#D4AF37' }}></i>
              {user?.email || 'Store Owner'}
            </span>
            <a href="#home" style={{ color: '#E5DCD0', fontSize: '0.8rem', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)', padding: '0.4rem 0.85rem', borderRadius: '4px' }}>
              Exit to Storefront →
            </a>
          </div>
        </div>
      </div>

      <div className="container" style={{ marginTop: '2rem' }}>
        
        {/* Search & Filter Controls */}
        <div style={{ background: '#fff', border: '1px solid var(--border-light)', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Search Box */}
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}></i>
            <input
              type="text"
              placeholder="Search by Order ID, Customer name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.5rem', border: '1px solid var(--border-medium)', borderRadius: '4px', fontSize: '0.85rem', outline: 'none' }}
            />
          </div>

          {/* Fulfilment Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
              Stage:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '0.6rem 0.9rem', border: '1px solid var(--border-medium)', borderRadius: '4px', fontSize: '0.82rem', backgroundColor: '#fff' }}
            >
              <option value="ALL">All Stages ({orders.length})</option>
              <option value="Paid">Paid / New</option>
              <option value="Picking">Picking</option>
              <option value="Packed">Packed</option>
              <option value="Shipment Booked">Shipment Booked</option>
              <option value="Dispatched">Dispatched / Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              style={{ padding: '0.6rem 0.9rem', border: '1px solid var(--border-medium)', borderRadius: '4px', fontSize: '0.82rem', backgroundColor: '#fff' }}
            >
              <option value="ALL">All Payments</option>
              <option value="PAID">Prepaid (Razorpay)</option>
              <option value="COD">Cash on Delivery</option>
              <option value="PENDING">Pending Payment</option>
            </select>
          </div>
        </div>

        {/* Main Two-Column Layout: Order Master List & Detail/Packing Workspace */}
        <div style={{ display: 'grid', gridTemplateColumns: selectedOrder ? '1fr 1.3fr' : '1fr', gap: '1.75rem', alignItems: 'start' }}>
          
          {/* Orders Master List Column */}
          <div style={{ background: '#fff', border: '1px solid var(--border-light)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#143C28', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Atelier Queue ({filteredOrders.length})
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Click an order to inspect &amp; pack
              </span>
            </div>

            {filteredOrders.length === 0 ? (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <i className="fa-solid fa-box-open" style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.5 }}></i>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>No orders matching current filter criteria.</p>
              </div>
            ) : (
              <div style={{ maxHeight: '720px', overflowY: 'auto' }}>
                {filteredOrders.map((ord) => {
                  const isSelected = selectedOrder?.orderId === ord.orderId;
                  const isCod = ord.notes?.payment_method === 'cod' || ord.paymentId === 'PAYABLE_ON_DELIVERY';
                  const fulfilment = ord.notes?.fulfilment_status || ord.status || 'Paid';
                  const dateStr = new Date(ord.created_at || ord.timestamp || Date.now()).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div
                      key={ord.orderId}
                      onClick={() => {
                        setSelectedOrder(ord);
                        setActiveTab('orders');
                        setServiceabilityResult(null);
                      }}
                      style={{
                        padding: '1.1rem 1.25rem',
                        borderBottom: '1px solid var(--border-light)',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                        backgroundColor: isSelected ? '#F4F7F4' : '#fff',
                        borderLeft: isSelected ? '4px solid #143C28' : '4px solid transparent'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                        <div>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem', color: '#143C28' }}>
                            #{ord.orderId}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.6rem' }}>
                            {dateStr}
                          </span>
                        </div>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '3px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          backgroundColor: fulfilment.toLowerCase().includes('dispatched') || fulfilment.toLowerCase().includes('ship') ? '#E8F5E9' :
                            fulfilment.toLowerCase().includes('packed') ? '#EDE7F6' :
                            fulfilment.toLowerCase().includes('pick') ? '#FFF8E1' : '#E3F2FD',
                          color: fulfilment.toLowerCase().includes('dispatched') || fulfilment.toLowerCase().includes('ship') ? '#1B5E20' :
                            fulfilment.toLowerCase().includes('packed') ? '#4A148C' :
                            fulfilment.toLowerCase().includes('pick') ? '#E65100' : '#0D47A1'
                        }}>
                          {fulfilment}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                        {ord.customerName || ord.shipping?.name || 'Patron'}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <span>
                          {(ord.items || []).length} item(s) • {isCod ? 'Cash on Delivery' : 'Prepaid'}
                        </span>
                        <span style={{ fontWeight: 700, color: '#143C28', fontSize: '0.85rem' }}>
                          ₹{Number(ord.totalAmount || ord.amount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>

                      {ord.trackingNumber && (
                        <div style={{ marginTop: '0.4rem', fontSize: '0.72rem', color: '#143C28', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <i className="fa-solid fa-truck-fast"></i>
                          <span>AWB: <strong>{ord.trackingNumber}</strong></span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Order Details & Fulfilment Workflow Column */}
          {selectedOrder && (
            <div style={{ background: '#fff', border: '1px solid var(--border-light)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
              
              {/* Tab Selector */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', backgroundColor: '#FAFAFA' }}>
                <button
                  onClick={() => setActiveTab('orders')}
                  style={{
                    flex: 1,
                    padding: '0.9rem 1rem',
                    background: activeTab === 'orders' ? '#fff' : 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'orders' ? '2px solid #143C28' : 'none',
                    fontWeight: activeTab === 'orders' ? 700 : 500,
                    color: activeTab === 'orders' ? '#143C28' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  <i className="fa-solid fa-box-check" style={{ marginRight: '0.4rem' }}></i> Fulfilment &amp; Logistics
                </button>
                <button
                  onClick={() => setActiveTab('packing-slip')}
                  style={{
                    flex: 1,
                    padding: '0.9rem 1rem',
                    background: activeTab === 'packing-slip' ? '#fff' : 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'packing-slip' ? '2px solid #143C28' : 'none',
                    fontWeight: activeTab === 'packing-slip' ? 700 : 500,
                    color: activeTab === 'packing-slip' ? '#143C28' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  <i className="fa-solid fa-print" style={{ marginRight: '0.4rem' }}></i> Print Packing Slip
                </button>
              </div>

              {/* TAB 1: Fulfilment, Picking, & Shadowfax Booking */}
              {activeTab === 'orders' && (
                <div style={{ padding: '1.75rem' }}>
                  
                  {/* Order Overview Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-light)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                        Selected Order
                      </div>
                      <h2 style={{ fontFamily: 'monospace', fontSize: '1.4rem', color: '#143C28', margin: '0.2rem 0 0 0' }}>
                        #{selectedOrder.orderId}
                      </h2>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#143C28' }}>
                        ₹{Number(selectedOrder.totalAmount || selectedOrder.amount || 0).toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: selectedOrder.paymentStatus === 'paid' ? '#2E7D32' : '#C62828', fontWeight: 600 }}>
                        {selectedOrder.notes?.payment_method === 'cod' ? 'CASH ON DELIVERY' : (selectedOrder.paymentStatus === 'paid' ? 'PREPAID & VERIFIED' : 'PAYMENT PENDING')}
                      </div>
                    </div>
                  </div>

                  {/* FULFILMENT STAGE CONTROLS */}
                  <div style={{ backgroundColor: '#FAF8F5', border: '1px solid #EFEAE4', padding: '1.25rem', borderRadius: '4px', marginBottom: '1.75rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#143C28', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                      Fulfilment Pipeline Step
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {[
                        { step: 'Picking', label: '1. Start Picking', icon: 'fa-hand-holding' },
                        { step: 'Packed', label: '2. Mark Packed', icon: 'fa-box' },
                        { step: 'Ready for Pickup', label: '3. Ready for Courier', icon: 'fa-dolly' }
                      ].map((item) => {
                        const currentFulfilment = selectedOrder.notes?.fulfilment_status || selectedOrder.status;
                        const isCurrent = currentFulfilment === item.step;
                        return (
                          <button
                            key={item.step}
                            onClick={() => handleTransitionStatus(selectedOrder.orderId, 'Preparation', item.step)}
                            style={{
                              padding: '0.55rem 0.85rem',
                              border: isCurrent ? '1px solid #143C28' : '1px solid var(--border-medium)',
                              backgroundColor: isCurrent ? '#143C28' : '#fff',
                              color: isCurrent ? '#D4AF37' : '#171717',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            <i className={`fa-solid ${item.icon}`} style={{ marginRight: '0.4rem' }}></i>
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* PICK LIST: EXACT SIZES, COLOURS, QUANTITIES */}
                  <div style={{ marginBottom: '1.75rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#143C28', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                      Warehouse Pick List ({(selectedOrder.items || []).length} items)
                    </div>
                    <div style={{ border: '1px solid var(--border-light)', borderRadius: '4px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#FAF8F5', borderBottom: '1px solid var(--border-light)' }}>
                            <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: 600 }}>Garment</th>
                            <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 600 }}>Size</th>
                            <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 600 }}>Colour</th>
                            <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 600 }}>Qty</th>
                            <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 600 }}>Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedOrder.items || []).map((it, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                              <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                                {it.title || it.name}
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                  SKU: {it.sku || `ET-PROD-${it.productId || idx + 1}`}
                                </div>
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                <span style={{ backgroundColor: '#143C28', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '3px', fontWeight: 700 }}>
                                  {it.size || 'M'}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                <span style={{ backgroundColor: '#F5EFEB', border: '1px solid #D4AF37', color: '#143C28', padding: '0.2rem 0.5rem', borderRadius: '3px', fontWeight: 600 }}>
                                  {it.color || 'Default'}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 700 }}>
                                {it.quantity || it.qty || 1}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                ₹{Number(it.price || 0).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* SHIPPING DESTINATION & COURIER ACTIONS */}
                  <div style={{ backgroundColor: '#FAF8F5', border: '1px solid #EFEAE4', padding: '1.25rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#143C28', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Customer Shipping Details
                      </div>
                      <button
                        onClick={() => handleCheckServiceability(selectedOrder)}
                        disabled={isCheckingService}
                        style={{ fontSize: '0.75rem', background: 'none', border: 'none', color: '#143C28', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                      >
                        {isCheckingService ? 'Checking Serviceability...' : 'Check Shadowfax Pincode'}
                      </button>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                      <strong>{selectedOrder.customerName || selectedOrder.shipping?.name}</strong><br />
                      {selectedOrder.shipping?.address || selectedOrder.shipping_address?.address}
                      {selectedOrder.shipping?.apartment ? `, ${selectedOrder.shipping.apartment}` : ''}<br />
                      {selectedOrder.shipping?.city || selectedOrder.shipping_address?.city}, {selectedOrder.shipping?.state || selectedOrder.shipping_address?.state} - <strong>{selectedOrder.shipping?.zip || selectedOrder.shipping_address?.zip}</strong><br />
                      <div style={{ marginTop: '0.4rem', color: 'var(--text-secondary)' }}>
                        Phone for courier: <strong>{selectedOrder.customerPhone || selectedOrder.shipping?.phone || '—'}</strong> | Email: {selectedOrder.customerEmail || selectedOrder.shipping?.email || '—'}
                      </div>
                    </div>

                    {serviceabilityResult && (
                      <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: serviceabilityResult.serviceable ? '#E8F5E9' : '#FFEBEE', borderRadius: '4px', fontSize: '0.78rem', color: serviceabilityResult.serviceable ? '#1B5E20' : '#C62828' }}>
                        <i className={`fa-solid ${serviceabilityResult.serviceable ? 'fa-circle-check' : 'fa-circle-xmark'}`} style={{ marginRight: '0.4rem' }}></i>
                        Pincode {serviceabilityResult.pincode}: {serviceabilityResult.serviceable ? 'Eligible for forward logistics dispatch' : 'Courier unserviceable'}
                      </div>
                    )}
                  </div>

                  {/* SHADOWFAX BOOKING ACTION */}
                  <div style={{ border: '2px dashed #143C28', padding: '1.25rem', borderRadius: '4px', textAlign: 'center', backgroundColor: '#fff' }}>
                    {selectedOrder.trackingNumber ? (
                      <div>
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#2E7D32', fontWeight: 700, marginBottom: '0.35rem' }}>
                          ✓ Shipment Confirmed with {selectedOrder.carrier || 'Shadowfax'}
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, color: '#143C28', marginBottom: '0.5rem' }}>
                          AWB: {selectedOrder.trackingNumber}
                        </div>
                        <a
                          href={selectedOrder.notes?.tracking_url || `https://tracker.shadowfax.in/#/track?tracking_id=${encodeURIComponent(selectedOrder.trackingNumber)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-block', fontSize: '0.8rem', color: '#143C28', fontWeight: 600, textDecoration: 'underline' }}
                        >
                          Open Live Shadowfax Tracking Link →
                        </a>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#143C28', marginBottom: '0.4rem' }}>
                          Ready to dispatch this packed order?
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
                          Booking with Shadowfax generates an authentic forward logistics AWB, locks the order against duplicate shipping, and triggers the customer dispatch email.
                        </p>
                        <button
                          onClick={() => handleBookShadowfax(selectedOrder)}
                          disabled={isBookingShipment}
                          className="btn-luxury"
                          style={{
                            padding: '0.75rem 1.75rem',
                            fontSize: '0.85rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: isBookingShipment ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <i className="fa-solid fa-truck-ramp-box"></i>
                          {isBookingShipment ? 'Booking Shadowfax Shipment...' : 'Book Shadowfax Dispatch'}
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TAB 2: PRINT PACKING SLIP VIEW */}
              {activeTab === 'packing-slip' && (
                <div style={{ padding: '1.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
                    <button
                      onClick={handlePrintSlip}
                      style={{
                        padding: '0.6rem 1.25rem',
                        backgroundColor: '#143C28',
                        color: '#D4AF37',
                        border: 'none',
                        borderRadius: '4px',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      <i className="fa-solid fa-print" style={{ marginRight: '0.4rem' }}></i> Print to Paper / PDF
                    </button>
                  </div>

                  {/* PRINT CONTAINER WITH BORDER */}
                  <div id="printable-packing-slip" style={{ border: '1px solid #000', padding: '2rem', backgroundColor: '#fff', color: '#000', fontFamily: 'serif' }}>
                    
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                      <div>
                        <h1 style={{ margin: 0, fontSize: '1.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#000' }}>
                          EDEN &amp; THREAD
                        </h1>
                        <div style={{ fontSize: '0.8rem', fontStyle: 'italic', marginTop: '0.2rem' }}>
                          Atelier Garment Packing Slip
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontFamily: 'sans-serif' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                          Order #{selectedOrder.orderId}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#555' }}>
                          Date: {new Date(selectedOrder.created_at || selectedOrder.timestamp || Date.now()).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                    </div>

                    {/* Recipient & Courier Block */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', fontFamily: 'sans-serif', fontSize: '0.85rem', marginBottom: '1.75rem' }}>
                      <div>
                        <strong>DELIVERY RECIPIENT:</strong>
                        <div style={{ marginTop: '0.35rem', lineHeight: '1.4' }}>
                          <strong>{selectedOrder.customerName || selectedOrder.shipping?.name}</strong><br />
                          {selectedOrder.shipping?.address || selectedOrder.shipping_address?.address}<br />
                          {selectedOrder.shipping?.apartment ? `${selectedOrder.shipping.apartment}, ` : ''}
                          {selectedOrder.shipping?.city || selectedOrder.shipping_address?.city}, {selectedOrder.shipping?.state || selectedOrder.shipping_address?.state} - {selectedOrder.shipping?.zip || selectedOrder.shipping_address?.zip}<br />
                          Phone: {selectedOrder.customerPhone || selectedOrder.shipping?.phone || '—'}
                        </div>
                      </div>
                      <div>
                        <strong>DISPATCH &amp; CARRIER:</strong>
                        <div style={{ marginTop: '0.35rem', lineHeight: '1.4' }}>
                          Carrier: <strong>{selectedOrder.carrier || 'Shadowfax Forward Express'}</strong><br />
                          AWB: <strong>{selectedOrder.trackingNumber || 'Unassigned (Pending Booking)'}</strong><br />
                          Mode: <strong>{selectedOrder.notes?.payment_method === 'cod' ? 'CASH ON DELIVERY' : 'PREPAID'}</strong><br />
                          Packaging: <strong>Signature Flax Garment Bag + FSC Box</strong>
                        </div>
                      </div>
                    </div>

                    {/* Pick Items Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'sans-serif', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #000', backgroundColor: '#f0f0f0' }}>
                          <th style={{ padding: '0.5rem', textAlign: 'left' }}>SKU</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left' }}>Item Description</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center' }}>Size</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center' }}>Colour</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center' }}>Qty</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center' }}>Check</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedOrder.items || []).map((it, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #ccc' }}>
                            <td style={{ padding: '0.6rem 0.5rem', fontFamily: 'monospace' }}>
                              {it.sku || `ET-0${idx + 1}`}
                            </td>
                            <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>
                              {it.title || it.name}
                            </td>
                            <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', fontWeight: 700 }}>
                              {it.size || 'M'}
                            </td>
                            <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                              {it.color || 'Default'}
                            </td>
                            <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', fontWeight: 700 }}>
                              {it.quantity || it.qty || 1}
                            </td>
                            <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                              [ &nbsp; ]
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Footer instructions */}
                    <div style={{ borderTop: '1px solid #000', paddingTop: '1rem', fontSize: '0.75rem', fontFamily: 'sans-serif', color: '#555', display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        Inspected &amp; Packed By: _____________________
                      </div>
                      <div>
                        Atelier Verification Date: _____________________
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
