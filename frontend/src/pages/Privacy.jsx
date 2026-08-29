import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export default function Privacy() {
  return <section className="container-app py-8 sm:py-12">
    <Link to="/" className="mb-5 inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm font-bold shadow-sm hover:border-achar-700 hover:text-achar-700">
      <ArrowLeft size={17}/> Back to Home
    </Link>
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-r from-achar-900 to-achar-700 p-6 text-white sm:p-8">
        <ShieldCheck size={30}/>
        <h1 className="mt-3 text-3xl font-black sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-amber-100">How Acharjya's Achar Bari handles customer information.</p>
      </div>
      <div className="space-y-7 p-5 text-sm leading-7 text-stone-600 sm:p-8 sm:text-base">
        <div><h2 className="font-black text-stone-900">Information we collect</h2><p className="mt-2">We may collect information you provide for account creation, delivery addresses, orders, support requests and customized pickle enquiries.</p></div>
        <div><h2 className="font-black text-stone-900">Google sign-in</h2><p className="mt-2">If you choose Google sign-in, authentication is handled through Firebase Authentication. We use the account information needed to identify your account and provide the requested service.</p></div>
        <div><h2 className="font-black text-stone-900">Orders and payments</h2><p className="mt-2">Payment processing is handled through Razorpay. Sensitive payment credentials are not intended to be stored in this website's frontend.</p></div>
        <div><h2 className="font-black text-stone-900">Cookies and local storage</h2><p className="mt-2">The website may use browser storage for useful features such as cart persistence and session preferences.</p></div>
        <div><h2 className="font-black text-stone-900">Contact</h2><p className="mt-2">For privacy questions or requests, use the support/contact details provided by Acharjya's Achar Bari.</p></div>
        <p className="border-t border-stone-200 pt-5 text-xs text-stone-400">This page is a general website privacy notice and should be reviewed and finalized for your actual business, legal requirements and data practices before production launch.</p>
      </div>
    </div>
  </section>;
}
