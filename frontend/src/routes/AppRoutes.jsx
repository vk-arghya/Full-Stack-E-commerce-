import { Routes, Route } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import AdminRoute from '../components/admin/AdminRoute';

import Home from '../pages/Home/Home';
import Products from '../pages/Products/Products';
import ProductDetails from '../pages/ProductDetails/ProductDetails';
import Login from '../pages/Login/Login';
import Profile from '../pages/Profile/Profile';
import Wishlist from '../pages/Wishlist/Wishlist';
import Cart from '../pages/Cart/Cart';
import Checkout from '../pages/Checkout/Checkout';
import Orders from '../pages/Orders/Orders';
import OrderDetails from '../pages/OrderDetails/OrderDetails';
import NotFound from '../pages/NotFound/NotFound';
import Privacy from '../pages/Privacy';

import AdminDashboard from '../pages/Admin/Dashboard/AdminDashboard';
import AdminProducts from '../pages/Admin/Products/AdminProducts';
import AdminOrders from '../pages/Admin/Orders/AdminOrders';
import AdminCustomers from '../pages/Admin/Customers/AdminCustomers';
import AdminReviews from '../pages/Admin/Reviews/AdminReviews';
import AdminCustomRequests from '../pages/Admin/CustomRequests/AdminCustomRequests';
import AdminCoupons from '../pages/Admin/Coupons/AdminCoupons';
import AdminReports from '../pages/Admin/Reports/AdminReports';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Customer storefront. Admin routes intentionally live OUTSIDE this layout. */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:productId" element={<ProductDetails />} />
        <Route path="/login" element={<Login />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route path="/orders/:orderId" element={<ProtectedRoute><OrderDetails /></ProtectedRoute>} />
        <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="/cart" element={<Cart />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Admin application: separate shell, no customer navbar/footer. */}
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
      <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
      <Route path="/admin/customers" element={<AdminRoute><AdminCustomers /></AdminRoute>} />
      <Route path="/admin/reviews" element={<AdminRoute><AdminReviews /></AdminRoute>} />
      <Route path="/admin/custom-requests" element={<AdminRoute><AdminCustomRequests /></AdminRoute>} />
      <Route path="/admin/coupons" element={<AdminRoute><AdminCoupons /></AdminRoute>} />
      <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
    </Routes>
  );
}
