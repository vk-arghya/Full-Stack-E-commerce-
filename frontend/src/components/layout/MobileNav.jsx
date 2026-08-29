import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, Heart, Package, User } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

export default function MobileNav() {
  const { count } = useCart();
  const { user } = useAuth();
  const { pathname } = useLocation();

  const item = (to, label, Icon, badge) => <Link to={to} className={`flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-[11px] ${pathname === to ? 'text-achar-700' : 'text-stone-600'}`}>
    <span className="relative"><Icon size={20}/>{badge ? <span className="absolute -right-2 -top-2 min-w-4 rounded-full bg-achar-700 px-1 text-center text-[9px] text-white">{badge}</span> : null}</span>
    {label}
  </Link>;

  return <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t bg-white md:hidden">
    {item('/', 'Home', Home)}
    {item('/products', 'Products', ShoppingBag)}
    {item('/wishlist', 'Wishlist', Heart)}
    {item('/orders', 'My Orders', Package)}
    {item(user ? '/profile' : '/login', 'Profile', User)}
  </nav>;
}
