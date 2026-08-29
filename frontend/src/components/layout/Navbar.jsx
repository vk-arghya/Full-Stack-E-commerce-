import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, Package, User, LogOut, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const { user, profile } = useAuth();
  const { count, lastAddedAt } = useCart();
  const [q, setQ] = useState('');
  const [cartAttention, setCartAttention] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    if (!user) { setIsAdmin(false); return undefined; }
    user.getIdTokenResult().then(result => { if (alive) setIsAdmin(result?.claims?.admin === true); }).catch(() => { if (alive) setIsAdmin(false); });
    return () => { alive = false; };
  }, [user]);

  useEffect(() => {
    if (!lastAddedAt) return;
    setCartAttention(true);
    const t = window.setTimeout(() => setCartAttention(false), 1200);
    return () => window.clearTimeout(t);
  }, [lastAddedAt]);

  function submit(e) {
    e.preventDefault();
    navigate(`/products?q=${encodeURIComponent(q)}`);
  }

  const displayName = profile?.name || user?.displayName || 'Achar lover';

  return <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/95 shadow-sm backdrop-blur">
    <nav className="container-app flex min-h-16 items-center gap-3 sm:gap-4">
      <Link to="/" className="min-w-0 shrink text-lg font-black tracking-tight text-achar-700 sm:text-xl">Acharjya's Achar Bari</Link>

      {user && <span className="navbar-mobile-greeting">Hi, {displayName.split(' ')[0]}</span>}

      <div className="hidden items-center gap-5 text-sm font-semibold md:flex">
        <Link to="/" className="hover:text-achar-700">Home</Link>
        <Link to="/products" className="hover:text-achar-700">Products</Link>
        <Link to="/profile" className="hover:text-achar-700">My Profile</Link>
      </div>

      <form onSubmit={submit} className="ml-auto hidden min-w-0 max-w-sm flex-1 items-center rounded-xl bg-stone-100 px-3 md:flex">
        <Search size={18} className="text-stone-500"/>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search pickles..." className="w-full bg-transparent px-2 py-2 outline-none"/>
      </form>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2 md:ml-0">
        <Link to="/wishlist" className="navbar-icon-link hidden rounded-xl p-2 hover:bg-stone-100 md:inline-flex" title="Wishlist"><Heart size={20}/></Link>
        <Link to="/orders" className="navbar-text-link hidden rounded-xl px-3 py-2 hover:bg-stone-100 md:inline-flex" title="Orders"><Package size={17}/> My Orders</Link>
        {user && isAdmin && <Link to="/admin" className="navbar-text-link hidden rounded-xl border border-achar-200 bg-amber-50 px-3 py-2 text-achar-700 md:inline-flex" title="Admin Control Centre">Admin</Link>}
        <Link to="/cart" className={`relative flex items-center gap-1 rounded-xl p-2 transition hover:bg-stone-100 ${cartAttention ? 'cart-bounce' : ''}`} title="Cart">
          <ShoppingCart size={22}/><span className="hidden font-bold md:inline">Cart</span>
          {count > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-achar-700 px-1 text-center text-xs font-bold text-white">{count}</span>}
        </Link>
        {user ? <Link to="/profile#logout" className="navbar-text-link hidden rounded-xl px-3 py-2 hover:bg-stone-100 md:inline-flex" title="Logout"><LogOut size={17}/> Logout</Link> : <Link to="/login" className="rounded-xl p-2 hover:bg-stone-100" title="Login"><User size={20}/></Link>}
      </div>
    </nav>
  </header>;
}
