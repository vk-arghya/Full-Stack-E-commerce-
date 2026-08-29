import { useEffect, useState } from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductGrid from '../../components/products/ProductGrid';
import { useWishlist } from '../../context/WishlistContext';
import api from '../../services/api';

export default function Wishlist() {
  const { wishlist } = useWishlist();
  const [liveProducts, setLiveProducts] = useState([]);

  useEffect(() => {
    let alive = true;
    api.get('/products').then(({ data }) => { if (alive && Array.isArray(data)) setLiveProducts(data); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const liveMap = new Map(liveProducts.map(p => [p.id, p]));
  const displayProducts = wishlist.map(saved => {
    const live = liveMap.get(saved.id);
    if (!live) return { ...saved, unavailable: true, variants: (saved.variants || []).map(v => ({ ...v, stock: 0 })) };
    return { ...live, unavailable: !(live.variants || []).some(v => Number(v.stock) > 0) };
  });

  return <section className="container-app py-6 sm:py-9 lg:py-12">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="account-kicker"><Heart size={14}/> Saved for later</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">My Wishlist <span className="text-lg font-bold text-stone-400">({wishlist.length})</span></h1><p className="mt-2 text-sm text-stone-500">Unavailable pickles stay saved so we can notify you when they return.</p></div><Link to="/products" className="btn-secondary !px-4 !py-2.5">Explore Pickles</Link></div>
    {displayProducts.length ? <div className="mt-7 rounded-3xl border border-stone-200 bg-white p-3 shadow-[0_10px_40px_rgba(44,27,17,.06)] sm:p-5"><ProductGrid products={displayProducts}/></div> : <div className="empty-account mt-7"><div className="empty-icon"><Heart size={34}/></div><h2>Your wishlist is empty</h2><p>Tap the heart on any pickle you want to save.</p><Link to="/products" className="btn-primary mt-4 inline-flex items-center gap-2"><ShoppingBag size={17}/> Browse Pickles</Link></div>}
  </section>;
}
