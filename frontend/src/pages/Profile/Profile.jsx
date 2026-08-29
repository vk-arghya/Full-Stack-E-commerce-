import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight, Heart, LogOut, MapPin, Package, Plus, ShoppingCart, UserRound, X, Ticket } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useToast } from '../../context/ToastContext';
import AddressForm from '../../components/profile/AddressForm';
import ConfirmModal from '../../components/common/ConfirmModal';
import api from '../../services/api';

function SectionLink({ active, icon: Icon, children, onClick }) {
  return <button type="button" onClick={onClick} className={`profile-nav-item ${active ? 'profile-nav-item-active' : ''}`}><Icon size={18}/><span>{children}</span><ChevronRight size={16} className="ml-auto opacity-40"/></button>;
}

export default function Profile() {
  const { user, profile, logout } = useAuth();
  const { count: cartCount } = useCart();
  const { wishlist } = useWishlist();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [addresses, setAddresses] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState('addresses');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [logoutStep, setLogoutStep] = useState(0);

  async function loadAccount() {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const [addressResponse, couponResponse] = await Promise.all([
        api.get('/profile/addresses'),
        api.get('/profile/coupons').catch(() => ({ data: [] })),
      ]);
      setAddresses(Array.isArray(addressResponse.data) ? addressResponse.data : []);
      setCoupons(Array.isArray(couponResponse.data) ? couponResponse.data : []);
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.message || 'We could not load your account data.');
    } finally { setLoading(false); }
  }

  useEffect(() => { loadAccount(); }, [user]);

  useEffect(() => {
    if (location.hash === '#logout' && user) {
      setLogoutStep(1);
      navigate('/profile', { replace: true });
    }
  }, [location.hash, user, navigate]);

  function scrollToSection(id) {
    setActive(id);
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  async function saveAddress(data) {
    setSavingAddress(true); setError('');
    try {
      const wasEditing = Boolean(editing);
      const saved = wasEditing
        ? (await api.patch(`/profile/addresses/${editing.id}`, data)).data
        : (await api.post('/profile/addresses', data)).data;
      setAddresses(current => wasEditing ? current.map(a => a.id === saved.id ? saved : a) : [...current, saved]);
      setEditing(null); setAdding(false);
      showToast(wasEditing ? 'Address updated successfully.' : 'Address saved successfully.', 'success');
    } catch (e) {
      setError(e?.response?.data?.message || 'Address could not be saved.');
      showToast(e?.response?.data?.message || 'Unable to save address.', 'error');
    } finally { setSavingAddress(false); }
  }

  function removeAddress(address) { setDeleteTarget(address); }

  async function confirmDeleteAddress() {
    if (!deleteTarget) return;
    const address = deleteTarget;
    setDeleteTarget(null);
    try {
      await api.delete(`/profile/addresses/${address.id}`);
      setAddresses(current => current.filter(a => a.id !== address.id));
      showToast('Address deleted.', 'success');
    } catch (e) {
      showToast(e?.response?.data?.message || 'Unable to delete address.', 'error');
    }
  }

  async function confirmLogout() {
    setLogoutStep(0);
    await logout();
    navigate('/', { replace: true });
  }

  return <>
    <section className="container-app py-5 sm:py-8 lg:py-10">
      <div className="account-shell">
        <aside className="account-sidebar">
          <div className="account-user-card">
            <div className="account-avatar">{profile?.photoURL ? <img src={profile.photoURL} alt=""/> : <UserRound size={24}/>}</div>
            <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-stone-400">Signed in</p><p className="mt-1 truncate text-base font-black">{profile?.name || user?.displayName || 'Achar lover'}</p><p className="truncate text-xs text-stone-500">{user?.email}</p></div>
            <CheckCircle2 size={19} className="ml-auto shrink-0 text-emerald-600"/>
          </div>

          <nav className="account-nav">
            <SectionLink active={active === 'addresses'} icon={MapPin} onClick={() => scrollToSection('addresses')}>My Addresses <span className="ml-auto mr-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px]">{addresses.length}/3</span></SectionLink>
            {coupons.length > 0 && <SectionLink active={active === 'coupons'} icon={Ticket} onClick={() => scrollToSection('coupons')}>Coupons <span className="ml-auto mr-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700">{coupons.length}</span></SectionLink>}
            <Link className="profile-nav-item profile-nav-orders" to="/orders"><Package size={18}/><span>My Orders</span><ChevronRight size={16} className="ml-auto opacity-40"/></Link>
            <Link className="profile-nav-item" to="/wishlist"><Heart size={18}/><span>Wishlist</span><span className="ml-auto rounded-full bg-stone-100 px-2 py-0.5 text-[10px]">{wishlist.length}</span></Link>
            <Link className="profile-nav-item" to="/cart"><ShoppingCart size={18}/><span>My Cart</span><span className="ml-auto rounded-full bg-stone-100 px-2 py-0.5 text-[10px]">{cartCount}</span></Link>
          </nav>
        </aside>

        <main className="account-main">
          <div className="account-hero">
            <div><span className="account-kicker"><MapPin size={14}/> Delivery account</span><h1>My Account</h1><p>Manage your saved delivery addresses, coupons and shopping activity in one place.</p></div>
          </div>

          {error && <div className="account-alert"><span>{error}</span><button onClick={() => setError('')}><X size={17}/></button></div>}

          <div className="account-shortcuts">
            <Link to="/orders" className="account-shortcut account-shortcut-primary"><span className="shortcut-icon"><Package size={20}/></span><span><b>My Orders</b><small>Track purchases & status</small></span><ChevronRight className="ml-auto" size={18}/></Link>
            <Link to="/wishlist" className="account-shortcut"><span className="shortcut-icon"><Heart size={20}/></span><span><b>Wishlist</b><small>{wishlist.length} saved item{wishlist.length === 1 ? '' : 's'}</small></span><ChevronRight className="ml-auto" size={18}/></Link>
            <Link to="/cart" className="account-shortcut"><span className="shortcut-icon"><ShoppingCart size={20}/></span><span><b>My Cart</b><small>{cartCount} item{cartCount === 1 ? '' : 's'} ready</small></span><ChevronRight className="ml-auto" size={18}/></Link>
          </div>

          <section id="addresses" className="account-section">
            <div className="account-section-heading">
              <div><span className="account-section-icon"><MapPin size={18}/></span><div><h2>My Addresses</h2><p>Save up to 3 delivery addresses and choose one during checkout.</p></div></div>
              {!adding && !editing && addresses.length < 3 && <button type="button" className="btn-primary !px-3 !py-2.5" onClick={() => setAdding(true)}><Plus size={16}/> Add Address</button>}
            </div>

            {adding && <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:p-5"><div className="mb-4 flex items-center justify-between gap-3"><h3 className="font-black">Add delivery address</h3><button type="button" className="btn-secondary !px-3 !py-2" onClick={() => setAdding(false)}>Cancel</button></div><AddressForm onSave={saveAddress} onCancel={() => setAdding(false)} saving={savingAddress}/></div>}
            {editing && <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:p-5"><div className="mb-4 flex items-center justify-between gap-3"><h3 className="font-black">Edit delivery address</h3><button type="button" className="btn-secondary !px-3 !py-2" onClick={() => setEditing(null)}>Cancel</button></div><AddressForm initial={editing} onSave={saveAddress} onCancel={() => setEditing(null)} saving={savingAddress}/></div>}

            {loading ? <div className="account-loading mt-5"><div className="loading-spinner"/> Loading addresses...</div> : !addresses.length && !adding ? <div className="empty-account mt-5"><div className="empty-icon"><MapPin size={30}/></div><h3>No delivery address saved</h3><p>Add your first address before checkout.</p><button className="btn-primary mt-2" onClick={() => setAdding(true)}><Plus size={16}/> Add delivery address</button></div> : <div className="mt-5 grid gap-3">{addresses.map((address, index) => <article key={address.id} className={`address-premium-card ${index === 0 ? 'address-default-card' : ''}`}><div className="flex items-start justify-between gap-3"><div><span className="address-label">{index === 0 ? 'DEFAULT' : String(address.label || 'ADDRESS').toUpperCase()}</span>{index === 0 && <span className="ml-2 text-xs font-bold text-emerald-700">Saved</span>}<h3 className="mt-3 text-base font-black">{address.name}</h3><p className="mt-1 text-sm font-semibold text-stone-600">{address.phone}</p><p className="mt-2 text-sm leading-6 text-stone-600">{address.address}, {address.city}, {address.district}, {address.state} — {address.pincode}</p></div><MapPin size={20} className="shrink-0 text-achar-700"/></div><div className="mt-4 flex flex-wrap gap-2 border-t border-stone-100 pt-3"><button className="cart-text-action" onClick={() => { setEditing(address); setAdding(false); }}><UserRound size={15}/> Edit</button><button className="cart-text-action cart-danger" onClick={() => removeAddress(address)}><X size={15}/> Delete</button></div></article>)}</div>}
          </section>

          {coupons.length > 0 && <section id="coupons" className="account-section"><div className="account-section-heading"><div><span className="account-section-icon"><Ticket size={18}/></span><div><h2>Available Coupons</h2><p>Use an eligible promo code before payment.</p></div></div><span className="status-pill status-ok">{coupons.length} active</span></div><div className="coupon-profile-grid mt-5">{coupons.map(c => <article className="coupon-profile-card" key={c.id}><div><span className="coupon-code">{c.code}</span><h3>{c.discountType === 'percent' ? `${c.value}% OFF` : `₹${c.value} OFF`}</h3><p>Each promo code can be used once per account.</p></div></article>)}</div></section>}

          <div className="profile-logout-panel"><div><span className="account-kicker"><LogOut size={14}/> Account</span><h2>Ready to leave?</h2><p>You can sign back in anytime to access your addresses and orders.</p></div><button type="button" className="profile-logout-button" onClick={() => setLogoutStep(1)}><LogOut size={17}/> Logout</button></div>
        </main>
      </div>
    </section>

    <ConfirmModal open={logoutStep === 1} title="Leaving already? 😄" message="Your achar will miss you. Do you really want to log out?" confirmLabel="Yes, log me out" cancelLabel="No, stay here" onConfirm={() => setLogoutStep(2)} onCancel={() => setLogoutStep(0)} />
    <ConfirmModal open={logoutStep === 2} title="One last bite before you go? 🥭" message="Okay, seriously this time — log out and close your account session?" confirmLabel="Yes, logout" cancelLabel="No, keep shopping" onConfirm={confirmLogout} onCancel={() => setLogoutStep(0)} />
    <ConfirmModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.label || 'this address'}?`} message="This saved delivery address will be removed from your account." confirmLabel="Yes, delete" cancelLabel="No, keep it" onConfirm={confirmDeleteAddress} onCancel={() => setDeleteTarget(null)} />
  </>;
}
