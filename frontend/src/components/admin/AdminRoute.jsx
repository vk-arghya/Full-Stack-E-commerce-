import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldCheck, LogIn, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function AdminRoute({ children }) {
  const { user, loading: authLoading, logout } = useAuth();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let alive = true;
    async function verify() {
      if (authLoading) return;
      if (!user) {
        if (alive) { setAllowed(false); setChecking(false); }
        return;
      }
      setChecking(true);
      setMessage('');
      try {
        // Force-refresh the ID token so a newly assigned custom admin claim is visible.
        const tokenResult = await user.getIdTokenResult(true);
        const claimAdmin = tokenResult?.claims?.admin === true;
        if (!claimAdmin) {
          if (alive) { setAllowed(false); setMessage('This Google account is not registered as an administrator.'); }
          return;
        }
        // Backend remains the final authority for all admin APIs.
        await api.get('/admin/me');
        if (alive) setAllowed(true);
      } catch (error) {
        console.error('Admin verification failed:', error);
        if (alive) {
          setAllowed(false);
          setMessage(error?.response?.data?.message || 'Admin verification failed.');
        }
      } finally {
        if (alive) setChecking(false);
      }
    }
    verify();
    return () => { alive = false; };
  }, [user, authLoading]);

  if (authLoading || checking) {
    return <div className="min-h-screen bg-stone-950 px-4 py-24 text-center text-white"><RefreshCw className="mx-auto animate-spin" size={30}/><p className="mt-4 font-semibold">Verifying administrator access…</p></div>;
  }

  if (!user) {
    return <div className="min-h-screen bg-stone-950 px-4 py-20 text-white"><div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl"><ShieldCheck className="mx-auto text-amber-300" size={42}/><h1 className="mt-5 text-2xl font-black">Admin sign-in required</h1><p className="mt-2 text-sm leading-6 text-stone-300">Sign in with the Google account that has been granted administrator access.</p><a href="/login?redirect=/admin" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-stone-900"><LogIn size={18}/> Sign in with Google</a></div></div>;
  }

  if (!allowed) {
    return <div className="min-h-screen bg-stone-950 px-4 py-20 text-white"><div className="mx-auto max-w-lg rounded-3xl border border-red-400/20 bg-white/5 p-8 text-center shadow-2xl"><ShieldCheck className="mx-auto text-red-300" size={42}/><p className="mt-5 text-xs font-black uppercase tracking-[.2em] text-red-300">Access denied</p><h1 className="mt-2 text-2xl font-black">Admin account required</h1><p className="mt-3 text-sm leading-6 text-stone-300">Signed in as <b className="text-white">{user.email}</b>. {message || 'Use the Firebase account that was granted the admin custom claim.'}</p><div className="mt-6 flex flex-wrap justify-center gap-3"><button onClick={() => window.location.reload()} className="rounded-xl bg-white px-5 py-3 font-bold text-stone-900">Refresh access</button><button onClick={async () => { await logout(); window.location.href = '/login'; }} className="rounded-xl border border-white/20 px-5 py-3 font-bold">Switch account</button></div></div></div>;
  }

  return children;
}
