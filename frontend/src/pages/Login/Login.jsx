import { ShieldCheck, Sparkles, UserRoundCheck } from 'lucide-react';
import GoogleLoginButton from '../../components/auth/GoogleLoginButton';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Login() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;

  return (
    <section className="container-app flex min-h-[calc(100vh-132px)] items-center justify-center py-10 sm:py-16">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-[0_30px_100px_rgba(44,27,17,.12)] lg:grid-cols-[.9fr_1.1fr]">
        <div className="hidden bg-[radial-gradient(circle_at_top_left,#b75b35_0,#8b2e2e_42%,#4b1717_100%)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur"><Sparkles size={14}/> A little Bengal in every bite</span>
            <h2 className="mt-8 max-w-sm text-4xl font-black leading-tight">Homemade taste. Your account. Your pickles.</h2>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/75">Sign in to save addresses, keep a wishlist, track orders and enjoy a faster checkout.</p>
          </div>
          <div className="grid gap-3 text-sm font-semibold">
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4"><UserRoundCheck size={19}/> Personalised profile &amp; addresses</div>
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4"><ShieldCheck size={19}/> Secure Google authentication</div>
          </div>
        </div>

        <div className="p-6 sm:p-10 lg:p-12">
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-achar-700">Acharjya's Achar Bari</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-stone-950 sm:text-4xl">Welcome back</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600 sm:text-base">Login with Google to manage your profile, wishlist, orders and checkout.</p>
          <div className="mt-8"><GoogleLoginButton /></div>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[11px] font-bold text-stone-500 sm:text-xs">
            <span className="rounded-xl bg-stone-50 px-2 py-3">Secure login</span>
            <span className="rounded-xl bg-stone-50 px-2 py-3">Easy checkout</span>
            <span className="rounded-xl bg-stone-50 px-2 py-3">Track orders</span>
          </div>
        </div>
      </div>
    </section>
  );
}
