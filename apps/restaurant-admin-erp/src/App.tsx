import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { MenuPage } from '@/pages/MenuPage';
import { OrdersPage } from '@/pages/OrdersPage';

export default function App() {
  return (
    <BrowserRouter basename="/garson/erp">
      <Routes>
        <Route
          path="/"
          element={
            <AdminLayout activeNavId="dashboard">
              <DashboardPage />
            </AdminLayout>
          }
        />
        <Route
          path="/orders"
          element={
            <AdminLayout activeNavId="orders">
              <OrdersPage />
            </AdminLayout>
          }
        />
        <Route
          path="/menu"
          element={
            <AdminLayout activeNavId="menu">
              <MenuPage />
            </AdminLayout>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
