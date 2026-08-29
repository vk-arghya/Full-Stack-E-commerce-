import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Heart, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useToast } from '../../context/ToastContext';
import { getProductImage } from '../../utils/productImage';
import { expectedDeliveryDate, formatDate } from '../../utils/delivery';

export default function Cart() {
  const { items, subtotal, updateQuantity, removeItem, unavailableItems } = useCart();
  const { wishlist, toggleWishlist } = useWishlist();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [blockedItem, setBlockedItem] = useState(null);

  function saveForLater(item) {
    if (!wishlist.some(w => w.id === item.productId)) toggleWishlist({ id: item.productId, name: item.name, image: item.image, variants: [{ weight: item.weight, price: item.price, stock: item.maxStock }] });
    showToast('Saved to wishlist.');
  }

  return <section className="container-app py-6 sm:py-9 lg:py-12">
    <button className="back-link" onClick={() => navigate('/products')}><ArrowLeft size={17}/> Continue shopping</button>
    <div className="mt-5 flex flex-wrap items-end justify-between gap-3"><div><p className="account-kicker"><ShoppingBag size={14}/> Shopping bag</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">My Cart <span className="text-lg font-bold text-stone-400">({items.reduce((s, x) => s + x.quantity, 0)} items)</span></h1></div></div>

    {!items.length ? <div className="empty-account mt-7"><div className="empty-icon"><ShoppingBag size={34}/></div><h2>Your cart is waiting for something delicious.</h2><p>Pick a homemade achar and it will appear here.</p><Link to="/products" className="btn-primary mt-4">Shop Pickles</Link></div> : <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-7">
      <div className="space-y-3">
        {items.map(item => {
          const out = item.unavailable || Number(item.maxStock) < 1 || Number(item.quantity) > Number(item.maxStock);
          return <motion.article layout key={item.key} className={`ecom-cart-card ${out ? 'cart-out-of-stock' : ''}`}>
            <Link to={`/products/${item.productId}`} className={`ecom-cart-image ${out ? 'grayscale' : ''}`}><img src={item.image || getProductImage({ id: item.productId, image: '' })} alt={item.name} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder-product.svg'; }}/></Link>
            <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Link to={`/products/${item.productId}`} className="line-clamp-2 text-base font-extrabold leading-6 hover:text-achar-700 sm:text-lg">{item.name}</Link><p className="mt-1 text-sm text-stone-500">{item.weight || 'Standard'} · Homemade pickle</p></div><b className="shrink-0 text-lg">₹{item.price * item.quantity}</b></div>
              {out && <button type="button" className="cart-stock-warning" onClick={() => setBlockedItem(item)}>Currently out of stock · Add to wishlist for a notification</button>}
              <p className="mt-2 text-sm font-semibold text-stone-700">₹{item.price} <span className="font-normal text-stone-400">per jar</span></p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div className="quantity-premium"><button disabled={out || item.quantity <= 1} onClick={() => updateQuantity(item.key, item.quantity - 1)}><Minus size={15}/></button><span>{item.quantity}</span><button disabled={out || item.quantity >= Number(item.maxStock || 0)} onClick={() => updateQuantity(item.key, item.quantity + 1)}><Plus size={15}/></button></div><p className="w-full text-xs font-semibold text-stone-500 sm:w-auto">Expected delivery: <b className="text-stone-800">{formatDate(expectedDeliveryDate('NORMAL'))}</b></p><div className="flex items-center gap-1"><button className="cart-text-action" onClick={() => saveForLater(item)}><Heart size={15} fill={wishlist.some(w => w.id === item.productId) ? 'currentColor' : 'none'}/> Save for later</button><button className="cart-text-action cart-danger" onClick={() => removeItem(item.key)}><Trash2 size={15}/> Remove</button></div></div>
            </div>
          </motion.article>;
        })}
      </div>

      <aside className="price-summary-card"><div className="flex items-center justify-between"><h2>Price Details</h2><span>{items.length} product{items.length === 1 ? '' : 's'}</span></div>{subtotal < 350 ? <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs font-bold text-achar-700">Add ₹{Math.max(0, 350 - subtotal)} more to unlock free Normal Delivery.</div> : <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">✓ You unlocked free Normal Delivery on orders of ₹350+.</div>}<div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span>Price ({items.reduce((s, x) => s + x.quantity, 0)} items)</span><b>₹{subtotal}</b></div><div className="flex justify-between"><span>Delivery</span><b className="text-emerald-700">Calculated at checkout</b></div></div>{unavailableItems.length > 0 && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">Remove the out-of-stock item{unavailableItems.length > 1 ? 's' : ''} or save {unavailableItems.length > 1 ? 'them' : 'it'} to wishlist before checkout.</div>}<div className="mt-5 flex items-center justify-between border-t pt-5 text-lg"><b>Total Amount</b><b>₹{subtotal}</b></div><div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">✓ Safe checkout · Your payment is handled securely.</div><button disabled={unavailableItems.length > 0} onClick={() => navigate('/checkout')} className="btn-primary mt-4 flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">Proceed to Buy <ChevronRight size={18}/></button></aside>
    </div>}

    {blockedItem && <div className="unavailable-modal-backdrop" onMouseDown={e => e.currentTarget === e.target && setBlockedItem(null)}><div className="unavailable-modal" role="dialog" aria-modal="true"><button className="unavailable-close" onClick={() => setBlockedItem(null)}><X size={18}/></button><div className="unavailable-icon"><ShoppingBag size={24}/></div><h2>{blockedItem.name}</h2><p>Currently out of stock. Please add it to your wishlist — we'll notify you when it becomes available again.</p><div className="unavailable-actions"><button className="btn-secondary" onClick={() => { saveForLater(blockedItem); setBlockedItem(null); }}><Heart size={16}/> Add to Wishlist</button><button className="btn-primary" onClick={() => { setBlockedItem(null); navigate('/products'); }}>Browse Products</button></div></div></div>}
  </section>;
}
