import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import MobileNav from './MobileNav';
import ScrollToTop from './ScrollToTop';

export default function Layout() {
  return <>
    <ScrollToTop />
    <Navbar />
    <main className="pb-20 md:pb-0"><Outlet /></main>
    <Footer />
    <MobileNav />
  </>;
}
