import { ArrowLeft, Check, CheckCircle2, Package, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { getProductImage } from '../../utils/productImage';

const steps = ['PLACED', 'ACCEPTED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
const title = (s) => ({ PLACED:'Order placed', ACCEPTED:'Order accepted', PROCESSING:'Being prepared', PACKED:'Packed', SHIPPED:'Shipped', OUT_FOR_DELIVERY:'Out for delivery', DELIVERED:'Delivered', CANCELLED:'Cancelled' }[s] || s?.replaceAll('_',' ') || 'Order placed');

function toDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
function formatDateTime(value) {
  const date = toDate(value);
  return date ? date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'Date unavailable';
}

export default function OrderDetails() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!user || !orderId) return;
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get(`/orders/${orderId}`);
        if (alive) setOrder(data);
      } catch (e) {
        console.error(e);
        if (alive) { setOrder(null); setError(e?.response?.data?.message || 'Unable to load this order.'); }
      } finally { if (alive) setLoading(false); }
    }
    load();
    return () => { alive = false; };
  }, [orderId, user]);

  if (loading) return <section className="container-app py-16"><div className="account-loading"><div className="loading-spinner"/> Loading order details...</div></section>;
  if (!order) return <section className="container-app py-16"><button className="back-link" onClick={() => navigate('/orders')}><ArrowLeft size={17}/> My Orders</button><div className="empty-account mt-6"><Package size={34}/><h2>Order unavailable</h2><p>{error || 'We could not find this order.'}</p><button className="btn-primary mt-3" onClick={() => navigate('/orders')}>Back to Orders</button></div></section>;

  const current = order.orderStatus === 'CANCELLED' ? -1 : Math.max(0, steps.indexOf(order.orderStatus));
  const address = order.addressSnapshot;
  const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  const statusTime = (status) => history.find((entry) => entry?.status === status)?.at || null;

  return <section className="container-app py-6 sm:py-9 lg:py-12">
    <button className="back-link" onClick={() => navigate('/orders')}><ArrowLeft size={17}/> My Orders</button>
    <div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="account-kicker"><Package size={14}/> Order tracking</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">#{order.id.slice(-8).toUpperCase()}</h1><p className="mt-2 text-sm text-stone-500">Order date: <b className="text-stone-800">{formatDateTime(order.orderDate || order.createdAt)}</b></p><p className="mt-1 text-sm text-stone-500">Expected delivery: <b className="text-emerald-700">{formatDateTime(order.expectedDeliveryDate)}</b></p><p className="mt-1 text-sm text-stone-500">Payment: <b className="text-emerald-700">{order.paymentStatus || 'Verified'}</b>{order.updatedAt ? <> · Updated {formatDateTime(order.updatedAt)}</> : null}</p></div><span className={`order-status text-sm ${order.orderStatus === 'DELIVERED' ? 'order-status-delivered' : order.orderStatus === 'CANCELLED' ? 'order-status-cancelled' : ''}`}>{order.orderStatus === 'DELIVERED' ? <CheckCircle2 size={16}/> : <Truck size={16}/>} {title(order.orderStatus)}</span></div>
    {order.orderStatus === 'CANCELLED' ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 font-semibold text-red-700">This order has been cancelled.</div> : <div className="card mt-6 p-5 sm:p-7"><div className="order-timeline">{steps.map((step, i) => <div key={step} className={`timeline-step ${i <= current ? 'timeline-step-active' : ''}`}><span className="timeline-dot">{i <= current ? <Check size={14}/> : <span>{i + 1}</span>}</span><span><b>{title(step)}</b>{statusTime(step) ? <small className="ml-2 text-[11px] font-semibold text-stone-400">{formatDateTime(statusTime(step))}</small> : null}</span>{i < steps.length - 1 && <i/>}</div>)}</div></div>}
    <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        <div className="card p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Items</h2><span className="text-sm font-semibold text-stone-500">{order.items?.length || 0} item(s)</span></div>{order.items?.map((item, i) => <div key={`${item.key || item.productId}-${i}`} className="order-detail-item"><img src={item.image || getProductImage({ id: item.productId, image: '' })} alt=""/><div className="min-w-0 flex-1"><b>{item.name}</b><p>{item.weight || 'Standard'} · Quantity {item.quantity}</p></div><strong>₹{Number(item.price || 0) * Number(item.quantity || 0)}</strong></div>)}</div>
        {address && <div className="card p-5 sm:p-6"><h2 className="text-xl font-black">Delivery Address</h2><div className="mt-4 rounded-2xl bg-stone-50 p-4"><span className="address-label">{address.label || 'Delivery'}</span><p className="mt-3 font-bold">{address.name}</p><p className="mt-1 text-sm text-stone-600">{address.phone}</p><p className="mt-2 text-sm leading-6 text-stone-600">{address.address}, {address.city}, {address.district}, {address.state} — {address.pincode}</p></div></div>}
      </div>
      <aside className="card h-fit p-5 sm:p-6 lg:sticky lg:top-24"><h2 className="text-xl font-black">Price Details</h2><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span>Subtotal</span><b>₹{Number(order.subtotal ?? order.total).toFixed(2).replace(/\.00$/, '')}</b></div>{order.discount ? <div className="flex justify-between text-emerald-700"><span>Coupon {order.couponCode ? `(${order.couponCode})` : 'discount'}</span><b>-₹{Number(order.discount).toFixed(2)}</b></div> : null}<div className="flex justify-between"><span>Delivery <small className="text-stone-400">({order.deliveryMode === 'SUPERFAST' ? 'Super Fast' : 'Normal'})</small></span><b>{Number(order.shipping || 0) ? `₹${Number(order.shipping).toFixed(2).replace(/\.00$/, '')}` : 'Free'}</b></div><div className="flex justify-between"><span>Platform fee</span><b>{order.platformFeeEnabled ? `₹${Number(order.platformFee || 0).toFixed(2).replace(/\.00$/, '')}` : `₹${Number(order.platformFeeDisplayed || 0).toFixed(2).replace(/\.00$/, '')} (waived)`}</b></div><div className="flex justify-between"><span>GST ({Number(order.gstPercent || 2.36).toFixed(2)}%)</span><b>₹{Number(order.gst || 0).toFixed(2)}</b></div></div><div className="mt-5 flex justify-between border-t pt-5 text-lg"><b>Total</b><b>₹{Number(order.total || 0).toFixed(2)}</b></div><div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">✓ Payment status: {order.paymentStatus || 'Verified'} · {order.deliveryMode === 'SUPERFAST' ? 'Super Fast Delivery' : 'Normal Delivery'}</div></aside>
    </div>
  </section>;
}
