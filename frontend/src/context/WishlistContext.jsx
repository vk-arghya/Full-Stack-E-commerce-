import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import { auth } from '../firebase/config';

const WishlistContext = createContext(null);
const KEY = 'aab_wishlist_v1';

function readLocal() {
  try { const value = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(value) ? value : []; } catch { return []; }
}

export function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState(readLocal);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(wishlist)); }, [wishlist]);

  async function syncForUser() {
    try {
      setSyncing(true);
      const { data } = await api.get('/profile/wishlist');
      const serverItems = Array.isArray(data) ? data : [];
      const localItems = readLocal();
      const byId = new Map(serverItems.map(item => [item.id, item]));
      for (const item of localItems) {
        if (!byId.has(item.id)) {
          byId.set(item.id, item);
          await api.post('/profile/wishlist', { product: item }).catch(() => {});
        }
      }
      setWishlist([...byId.values()]);
    } catch (e) {
      console.error('Wishlist sync failed:', e);
    } finally { setSyncing(false); }
  }

  // The API interceptor knows the Firebase user, so a public provider can safely
  // attempt this on startup; guests simply remain on localStorage.
  useEffect(() => {
    if (!auth) return undefined;
    return auth.onAuthStateChanged((user) => {
      if (user) syncForUser();
    });
  }, []);

  function toggleWishlist(product) {
    const exists = wishlist.some(x => x.id === product.id);
    setWishlist(current => exists ? current.filter(x => x.id !== product.id) : [...current, product]);
    if (exists) api.delete(`/profile/wishlist/${encodeURIComponent(product.id)}`).catch(() => {});
    else api.post('/profile/wishlist', { product }).catch(() => {});
  }

  return <WishlistContext.Provider value={{ wishlist, toggleWishlist, syncing, refreshWishlist: syncForUser }}>
    {children}
  </WishlistContext.Provider>;
}

export const useWishlist = () => useContext(WishlistContext);
