import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useToast } from '../../context/ToastContext';
import { getProductImage } from '../../utils/productImage';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { wishlist, toggleWishlist } = useWishlist();
  const { showToast } = useToast();
  const [added, setAdded] = useState(false);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const liked = wishlist.some(x => x.id === product.id);
  const variant = product.variants?.find(v => Number(v.stock) > 0) || product.variants?.[0] || { weight: '500g', price: product.price || 0, stock: product.stock ?? 0 };
  const outOfStock = product.unavailable === true || !product.variants?.length || !(product.variants || []).some(v => Number(v.stock) > 0);

  function openProduct(e) {
    if (outOfStock) { e.preventDefault(); setShowUnavailable(true); }
  }

  function add(e) {
    e?.stopPropagation();
    if (outOfStock) {
      addToCart(product, variant);
      showToast(`${product.name} added to cart. It is currently out of stock and cannot be ordered.` , 'error');
      return;
    }
    addToCart(product, variant);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
    showToast(`${product.name} added to cart`);
  }

  return <>
    <motion.article whileHover={{ y: -4 }} className={`group card overflow-hidden transition ${added ? 'ring-2 ring-achar-700 ring-offset-2 cart-attention' : ''}`}>
      <div className={`relative aspect-square overflow-hidden bg-amber-50 ${outOfStock ? 'grayscale' : ''}`}>
        <Link to={`/products/${product.id}`} onClick={openProduct} className="block h-full">
          <img src={getProductImage(product)} alt={product.name} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder-product.svg'; }} className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/>
        </Link>
        {outOfStock && <div className="absolute inset-0 flex items-center justify-center bg-black/20"><span className="rounded-full bg-black/80 px-3 py-1.5 text-xs font-black text-white">Currently not available</span></div>}
        <button onClick={() => toggleWishlist(product)} className="absolute right-2.5 top-2.5 rounded-full bg-white/95 p-2 shadow-md backdrop-blur" aria-label="Wishlist"><Heart size={18} fill={liked ? '#8b2e2e' : 'none'} color={liked ? '#8b2e2e' : 'currentColor'}/></button>
        {product.upcoming && <span className="absolute left-2.5 top-2.5 rounded-full bg-stone-900 px-2.5 py-1 text-[11px] font-bold text-white">Coming Soon</span>}
      </div>
      <div className="p-3.5 sm:p-4">
        <Link to={`/products/${product.id}`} onClick={openProduct} className={`line-clamp-2 min-h-[42px] text-[15px] font-extrabold leading-5 hover:text-achar-700 sm:text-base ${outOfStock ? 'text-stone-500' : 'text-stone-900'}`}>{product.name}</Link>
        <div className="mt-1.5 text-xs font-semibold text-stone-600">★ {product.rating ?? 'New'} {product.reviewCount ? `(${product.reviewCount})` : ''}</div>
        <div className="mt-2.5 flex items-center justify-between gap-2"><div className="min-w-0"><span className="text-base font-black sm:text-lg">₹{variant.price}</span><span className="ml-1 text-[11px] text-stone-500">/ {variant.weight}</span></div><button onClick={add} className={`shrink-0 rounded-xl p-2.5 text-white transition ${outOfStock ? 'bg-stone-500' : added ? 'bg-green-700' : 'bg-achar-700 hover:bg-achar-900'}`} aria-label={outOfStock ? 'Currently unavailable' : 'Add to cart'}>{added ? <Check size={18} className="cart-bounce"/> : <ShoppingCart size={18}/>}</button></div>
        {outOfStock && <p className="mt-2 text-xs font-bold text-red-700">Currently not available</p>}
      </div>
    </motion.article>

    {showUnavailable && <div className="unavailable-modal-backdrop" onMouseDown={e => e.currentTarget === e.target && setShowUnavailable(false)}><div className="unavailable-modal" role="dialog" aria-modal="true"><button className="unavailable-close" onClick={() => setShowUnavailable(false)} aria-label="Close"><X size={18}/></button><div className="unavailable-icon"><ShoppingCart size={24}/></div><h2>Currently not available</h2><p>We're sorry, this pickle is not available right now. Please add it to your wishlist and we'll notify you when it becomes available again.</p><div className="unavailable-actions"><button className="btn-secondary" onClick={() => { if (!liked) toggleWishlist(product); setShowUnavailable(false); showToast(liked ? 'This product is already in your wishlist.' : 'Added to wishlist.'); }}><Heart size={16}/> {liked ? 'In Wishlist' : 'Add to Wishlist'}</button><button className="btn-primary" onClick={() => { setShowUnavailable(false); window.location.assign('/products'); }}>Browse Products</button></div></div></div>}
  </>;
}
