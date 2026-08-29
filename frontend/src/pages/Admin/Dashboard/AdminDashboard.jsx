import { useEffect, useState } from 'react';
import { IndianRupee, Package, ShoppingBag, Users, RefreshCw, Mail, Settings2, Plus, Trash2, MapPin } from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';

const defaultSettings = { platformFeeEnabled: false, platformFee: 10, superFastEnabled: true, superFastFee: 85, normalStateCharges: {} };

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storeSettings, setStoreSettings] = useState(defaultSettings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [stateName, setStateName] = useState('');
  const [stateFee, setStateFee] = useState('50');
  const { showToast } = useToast();

  async function load() {
    setLoading(true);
    try {
      const [{ data: orderData }, { data: productData }, { data: settingsData }] = await Promise.all([api.get('/orders/admin/all'), api.get('/products'), api.get('/admin/settings/store')]);
      setOrders(Array.isArray(orderData) ? orderData : []);
      setProducts(Array.isArray(productData) ? productData : []);
      setStoreSettings({ ...defaultSettings, ...(settingsData || {}), normalStateCharges: settingsData?.normalStateCharges || {} });
    } catch (e) { console.error(e); showToast(e?.response?.data?.message || 'Unable to load dashboard.', 'error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function saveSettings() {
    try { setSavingSettings(true); const { data } = await api.patch('/admin/settings/store', storeSettings); setStoreSettings({ ...defaultSettings, ...data, normalStateCharges: data.normalStateCharges || {} }); showToast('Delivery and fee settings saved.', 'success'); }
    catch (e) { showToast(e?.response?.data?.message || 'Unable to save settings.', 'error'); }
    finally { setSavingSettings(false); }
  }

  function addStateCharge() {
    const state = stateName.trim();
    const fee = Number(stateFee);
    if (!state || !Number.isFinite(fee) || fee < 0) return showToast('Enter a state and a valid delivery charge.', 'error');
    setStoreSettings(s => ({ ...s, normalStateCharges: { ...(s.normalStateCharges || {}), [state]: fee } }));
    setStateName(''); setStateFee('50');
  }

  async function testEmail() {
    try { const { data } = await api.post('/admin/email/test', {}); showToast(data.message || 'Test email sent.', 'success'); }
    catch (e) { showToast(e?.response?.data?.message || 'Email test failed.', 'error'); }
  }

  const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const active = orders.filter((order) => !['DELIVERED', 'CANCELLED'].includes(order.orderStatus)).length;
  const lowStock = products.filter((p) => (p.variants || []).some((v) => Number(v.stock) > 0 && Number(v.stock) <= 5)).length;
  const stateCharges = Object.entries(storeSettings.normalStateCharges || {});

  return <AdminLayout>
    <div className="admin-page-head"><div><p className="account-kicker"><Package size={14}/> Store control centre</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Admin Dashboard</h1><p className="mt-2 text-sm text-stone-500">Control orders, stock, delivery pricing and store fees from one protected account.</p></div><div className="flex flex-wrap gap-2"><button className="btn-secondary !px-3 !py-2" onClick={testEmail}><Mail size={15}/> Test email</button><button className="btn-secondary !px-3 !py-2" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> Refresh</button></div></div>

    <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="admin-stat-card"><span>Orders</span><b>{orders.length}</b><small>{active} active</small></div><div className="admin-stat-card"><span>Revenue</span><b>₹{revenue}</b><small>Verified order totals</small></div><div className="admin-stat-card"><span>Products</span><b>{products.length}</b><small>Live catalogue</small></div><div className="admin-stat-card"><span>Low stock</span><b>{lowStock}</b><small>Needs attention</small></div></div>

    <div className="card mt-6 p-5 sm:p-6"><div className="flex items-start gap-3"><div className="account-section-icon"><Settings2 size={18}/></div><div><h2 className="text-xl font-black">Delivery & fee controls</h2><p className="mt-1 text-sm text-stone-500">Platform fee and Super Fast can be switched on/off. Normal delivery keeps your existing weight/state rules unless you add a state-specific override below.</p></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="admin-control-card"><span>Platform fee ₹</span><input className="input mt-2" type="number" min="0" value={storeSettings.platformFee} onChange={e => setStoreSettings({...storeSettings, platformFee: e.target.value})}/></label><label className="admin-control-card"><span className="flex items-center gap-2"><input type="checkbox" checked={!!storeSettings.platformFeeEnabled} onChange={e => setStoreSettings({...storeSettings, platformFeeEnabled: e.target.checked})}/> Charge platform fee</span><small>When off, the configured fee is shown as waived.</small></label><label className="admin-control-card"><span>Super Fast ₹</span><input className="input mt-2" type="number" min="0" value={storeSettings.superFastFee} onChange={e => setStoreSettings({...storeSettings, superFastFee: e.target.value})}/></label><label className="admin-control-card"><span className="flex items-center gap-2"><input type="checkbox" checked={!!storeSettings.superFastEnabled} onChange={e => setStoreSettings({...storeSettings, superFastEnabled: e.target.checked})}/> Offer Super Fast</span><small>Customer chooses only one delivery mode.</small></label></div>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4"><div className="flex items-center gap-2"><MapPin size={18} className="text-achar-700"/><h3 className="font-black">State-specific Normal Delivery</h3></div><p className="mt-1 text-xs leading-5 text-stone-500">Add multiple states with a custom Normal Delivery charge. If a state is not listed, the existing West Bengal/weight and outside-West-Bengal rules apply.</p><div className="mt-4 grid gap-2 sm:grid-cols-[1fr_160px_auto]"><input className="input" placeholder="State e.g. Odisha" value={stateName} onChange={e => setStateName(e.target.value)}/><input className="input" type="number" min="0" placeholder="₹50" value={stateFee} onChange={e => setStateFee(e.target.value)}/><button type="button" className="btn-secondary" onClick={addStateCharge}><Plus size={16}/> Add state</button></div>{stateCharges.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2">{stateCharges.map(([state, fee]) => <div key={state} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-2.5"><span className="text-sm font-bold">{state}</span><div className="flex items-center gap-2"><b>₹{fee}</b><button type="button" className="rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={() => { const next = {...storeSettings.normalStateCharges}; delete next[state]; setStoreSettings({...storeSettings, normalStateCharges: next}); }}><Trash2 size={15}/></button></div></div>)}</div>}</div>
      <button className="btn-primary mt-4" onClick={saveSettings} disabled={savingSettings}>{savingSettings ? 'Saving…' : 'Save delivery & fee settings'}</button>
    </div>

    <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]"><div className="card p-5 sm:p-6"><h2 className="text-xl font-black">Latest received orders</h2><div className="mt-4 divide-y divide-stone-100">{orders.slice(0, 5).map(order => <div key={order.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><b className="block truncate">#{order.id.slice(-8).toUpperCase()} · {order.profileSnapshot?.name || 'Customer'}</b><span className="text-xs text-stone-500">{order.items?.length || 0} line(s) · {order.orderStatus}</span></div><strong>₹{order.total}</strong></div>)}{!orders.length && <p className="py-8 text-sm text-stone-500">No orders received yet.</p>}</div></div><div className="card p-5 sm:p-6"><h2 className="text-xl font-black">Admin responsibilities</h2><div className="mt-4 grid gap-3 text-sm text-stone-600"><p className="flex gap-2"><Package size={17} className="text-achar-700"/> Add/edit/delete products and stock.</p><p className="flex gap-2"><ShoppingBag size={17} className="text-achar-700"/> Move orders forward through fulfilment.</p><p className="flex gap-2"><IndianRupee size={17} className="text-achar-700"/> Control delivery and fee rules.</p><p className="flex gap-2"><Users size={17} className="text-achar-700"/> Customer data stays behind authenticated routes.</p></div></div></div>
  </AdminLayout>;
}
