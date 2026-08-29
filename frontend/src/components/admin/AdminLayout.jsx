import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingBag, Users, Star, MessageSquare, Ticket, BarChart3, LogOut, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const links=[
  ['/admin','Dashboard',LayoutDashboard],
  ['/admin/products','Products',Package],
  ['/admin/orders','Orders',ShoppingBag],
  ['/admin/customers','Customers',Users],
  ['/admin/reviews','Reviews',Star],
  ['/admin/custom-requests','Custom Requests',MessageSquare],
  ['/admin/coupons','Coupons',Ticket],
  ['/admin/reports','Reports',BarChart3],
];

export default function AdminLayout({children}){
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  async function exitAdmin(){ await logout(); navigate('/login', { replace:true }); }
  return <div className="min-h-screen bg-[#f7f4ee] text-stone-900">
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-achar-700 to-achar-900 text-white font-black">AB</div><div><p className="text-xs font-black uppercase tracking-[.18em] text-achar-700">Acharjya's Achar Bari</p><h1 className="text-sm font-black sm:text-base">Admin Control Centre</h1></div></div>
        <div className="flex items-center gap-2"><a href="/" className="hidden items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm font-bold sm:inline-flex"><ExternalLink size={15}/> Storefront</a><div className="hidden text-right sm:block"><p className="text-xs font-bold">{user?.displayName || 'Administrator'}</p><p className="text-[11px] text-stone-500">{user?.email}</p></div><button onClick={exitAdmin} className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700"><LogOut size={16}/> <span className="hidden sm:inline">Sign out</span></button></div>
      </div>
    </header>
    <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8 lg:py-8">
      <aside className="h-fit rounded-3xl border border-stone-200 bg-white p-3 shadow-[0_10px_35px_rgba(52,34,23,.06)] lg:sticky lg:top-24">
        <div className="px-3 py-3"><p className="text-xs font-black uppercase tracking-[.18em] text-stone-400">Management</p><p className="mt-1 text-sm font-bold text-stone-700">Store operations</p></div>
        <nav className="admin-shell-nav grid gap-1">{links.map(([to,label,Icon])=><NavLink key={to} to={to} end={to==='/admin'} className={({isActive})=>`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${isActive?'bg-amber-50 text-achar-700 shadow-sm':'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}><Icon size={18}/>{label}</NavLink>)}</nav>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  </div>;
}
