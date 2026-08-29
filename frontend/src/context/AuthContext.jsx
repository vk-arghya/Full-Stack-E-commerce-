import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, firebaseConfigured } from '../firebase/config';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseConfigured || !auth) { setLoading(false); return undefined; }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser); setProfile(null); setLoading(true);
      if (!currentUser) { setLoading(false); return; }
      try { const { data } = await api.get('/profile'); setProfile(data || null); }
      catch (error) { console.error('Unable to load user profile:', error); setProfile({ id:currentUser.uid, uid:currentUser.uid, name:currentUser.displayName||'', email:currentUser.email||'', photoURL:currentUser.photoURL||'', phone:'', whatsapp:'', state:'', district:'', city:'', pincode:'', role:'user', profileComplete:false }); }
      finally { setLoading(false); }
    });
    return unsubscribe;
  }, []);

  async function loginWithGoogle() {
    if (!firebaseConfigured || !auth || !googleProvider) throw new Error('Firebase is not configured. Add the VITE_FIREBASE_* values to frontend/.env and restart Vite.');
    return signInWithPopup(auth, googleProvider);
  }
  async function logout() { if (auth) await signOut(auth); setUser(null); setProfile(null); }
  async function refreshProfile() { if (!user) return null; const { data } = await api.get('/profile'); setProfile(data || null); return data || null; }

  return <AuthContext.Provider value={{ user, profile, loading, loginWithGoogle, logout, refreshProfile, firebaseConfigured }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
