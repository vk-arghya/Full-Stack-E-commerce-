import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, MessageCircle } from 'lucide-react';

export default function Footer() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const goHomeSection = (id) => {
    if (pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate(`/#${id}`);
    }
  };

  return <footer className="mt-0 bg-stone-950 text-stone-200">
    <div className="container-app grid gap-8 px-4 py-10 sm:grid-cols-2 sm:gap-10 sm:py-12 lg:grid-cols-5 lg:px-10">
      <div className="lg:col-span-2">
        <Link to="/" className="inline-flex items-center gap-2 text-xl font-black text-white hover:text-amber-200">Acharjya's Achar Bari <ArrowUpRight size={17}/></Link>
        <p className="mt-3 max-w-md text-sm leading-6 text-stone-400">Authentic homemade pickles made with traditional recipes, care and love.</p>
        <button onClick={()=>goHomeSection('custom-pickle')} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-stone-700 px-4 py-2.5 text-sm font-bold text-stone-200 transition hover:border-amber-300 hover:text-amber-200"><MessageCircle size={17}/> Customized Pickle</button>
      </div>

      <div>
        <h4 className="font-bold text-white">Quick Links</h4>
        <div className="mt-3 grid gap-2.5 text-sm text-stone-400">
          <Link className="footer-link" to="/">Home</Link>
          <Link className="footer-link" to="/products">Products</Link>
          <Link className="footer-link" to="/profile">My Profile</Link>
          <Link className="footer-link" to="/orders">My Orders</Link>
        </div>
      </div>

      <div>
        <h4 className="font-bold text-white">Customer</h4>
        <div className="mt-3 grid gap-2.5 text-sm text-stone-400">
          <Link className="footer-link" to="/wishlist">Wishlist</Link>
          <Link className="footer-link" to="/cart">Cart</Link>
          <Link className="footer-link" to="/login">Login</Link>
        </div>
      </div>

      <div>
        <h4 className="font-bold text-white">Support</h4>
        <div className="mt-3 grid gap-2.5 text-sm text-stone-400">
          <button className="footer-link text-left" onClick={()=>goHomeSection('faq')}>FAQ</button>
          <button className="footer-link text-left" onClick={()=>goHomeSection('custom-pickle')}>Customized Pickle</button>
          <Link className="footer-link" to="/privacy">Privacy</Link>
        </div>
      </div>
    </div>

    <div className="container-app border-t border-stone-800 px-4 py-5 text-xs text-stone-500 sm:px-6 lg:px-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>© 2026 Acharjya's Achar Bari. All rights reserved.</span>
        <Link to="/privacy" className="font-semibold hover:text-stone-300">Privacy &amp; data use</Link>
      </div>
    </div>
  </footer>;
}
