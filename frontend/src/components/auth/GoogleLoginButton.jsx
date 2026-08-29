import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function GoogleLoginButton() {
  const { loginWithGoogle, firebaseConfigured } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    if (busy) return;
    setBusy(true);
    try {
      await loginWithGoogle();
      showToast('Welcome! Login successful — let’s complete your profile.', 'success');
      window.setTimeout(() => navigate('/profile', { replace: true }), 650);
    } catch (error) {
      console.error(error);
      const message = error?.code === 'auth/popup-closed-by-user'
        ? 'Google sign-in was cancelled.'
        : error?.code === 'auth/unauthorized-domain'
          ? 'This website URL is not authorized in Firebase. Add localhost to Firebase Authentication → Settings → Authorized domains.'
          : error?.code === 'auth/popup-blocked'
            ? 'Your browser blocked the Google sign-in popup. Allow popups for this site and try again.'
            : (error?.message || 'Google login failed');
      showToast(message, 'error');
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogin}
      disabled={busy || !firebaseConfigured}
      className="group flex w-full items-center justify-center gap-3 rounded-xl border border-stone-300 bg-white px-5 py-3.5 font-extrabold text-stone-900 shadow-sm transition hover:-translate-y-0.5 hover:border-achar-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? <Loader2 size={20} className="animate-spin text-achar-700" /> : <span className="flex h-6 w-6 items-center justify-center rounded-full border border-stone-200 text-sm font-black">G</span>}
      <span>{busy ? 'Signing you in...' : firebaseConfigured ? 'Continue with Google' : 'Configure Firebase to Login'}</span>
      {!busy && firebaseConfigured && <CheckCircle2 size={16} className="ml-auto text-stone-300 transition group-hover:text-achar-700" />}
    </button>
  );
}
