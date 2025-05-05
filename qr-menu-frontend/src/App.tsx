import { Routes, Route, Navigate } from 'react-router-dom';
import RequireAuth from './components/RequireAuth';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import CartPage from './pages/CartPage';
import FeedbackPage from './pages/FeedbackPage';
import NotFoundPage from './pages/NotFoundPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
// Admin pages
import AdminLayout from './layouts/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import CategoriesPage from './pages/admin/CategoriesPage';
import ProductsPage from './pages/admin/ProductsPage';
import TablesPage from './pages/admin/TablesPage';
import OrdersPage from './pages/admin/OrdersPage';
import StatisticsPage from './pages/admin/StatisticsPage';
import SettingsPage from './pages/admin/SettingsPage';
import TableTestPage from './pages/admin/TableTestPage';
import WaiterCallsPage from './pages/admin/WaiterCallsPage';
import FeedbacksPage from './pages/admin/FeedbacksPage';

// Public layout
import MainLayout from './layouts/MainLayout';

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Customer facing routes */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="feedback" element={<FeedbackPage />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={
        <RequireAuth allowedRoles={['admin', 'manager', 'editor']}>
          <AdminLayout />
        </RequireAuth>
      }>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />

        {/* Dashboard - Admin ve Manager rolleri için */}
        <Route path="dashboard" element={
          <RequireAuth allowedRoles={['admin', 'manager','editor']}>
            <DashboardPage />
          </RequireAuth>
        } />

        {/* Kategoriler - Sadece Admin ve Manager rolleri için */}
        <Route path="categories" element={
          <RequireAuth allowedRoles={['admin', 'manager']}>
            <CategoriesPage />
          </RequireAuth>
        } />

        {/* Ürünler - Sadece Admin ve Manager rolleri için */}
        <Route path="products" element={
          <RequireAuth allowedRoles={['admin', 'manager']}>
            <ProductsPage />
          </RequireAuth>
        } />

        {/* Masalar - Sadece Admin ve Manager rolleri için */}
        <Route path="tables" element={
          <RequireAuth allowedRoles={['admin', 'manager']}>
            <TablesPage />
          </RequireAuth>
        } />

        {/* Masa Test - Sadece Admin ve Manager rolleri için */}
        <Route path="table-test" element={
          <RequireAuth allowedRoles={['admin', 'manager']}>
            <TableTestPage />
          </RequireAuth>
        } />

        {/* Siparişler - Admin, Manager ve Editor rolleri için */}
        <Route path="orders" element={
          <RequireAuth allowedRoles={['admin', 'manager', 'editor']}>
            <OrdersPage />
          </RequireAuth>
        } />

        {/* Garson Çağrıları - Admin, Manager ve Editor rolleri için */}
        <Route path="waiter-calls" element={
          <RequireAuth allowedRoles={['admin', 'manager', 'editor']}>
            <WaiterCallsPage />
          </RequireAuth>
        } />

        {/* Geri Bildirimler - Admin, Manager ve Editor rolleri için */}
        <Route path="feedbacks" element={
          <RequireAuth allowedRoles={['admin', 'manager', 'editor']}>
            <FeedbacksPage />
          </RequireAuth>
        } />

        {/* İstatistikler - Sadece Admin ve Manager rolleri için */}
        <Route path="statistics" element={
          <RequireAuth allowedRoles={['admin', 'manager']}>
            <StatisticsPage />
          </RequireAuth>
        } />

        {/* Ayarlar - Sadece Admin ve Manager rolleri için */}
        <Route path="settings" element={
          <RequireAuth allowedRoles={['admin', 'manager']}>
            <SettingsPage />
          </RequireAuth>
        } />
      </Route>

      {/* 404 page */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
