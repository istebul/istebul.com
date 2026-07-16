import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { CheckinPage } from '@/pages/CheckinPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { InventoryPage } from '@/pages/InventoryPage';
import { MenuPage } from '@/pages/MenuPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { PaymentGatewaysPage } from '@/pages/PaymentGatewaysPage';
import { PaymentsPage } from '@/pages/PaymentsPage';
import { ReservationsPage } from '@/pages/ReservationsPage';
import { TablesPage } from '@/pages/TablesPage';

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
          path="/reservations"
          element={
            <AdminLayout activeNavId="reservations">
              <ReservationsPage />
            </AdminLayout>
          }
        />
        <Route
          path="/tables"
          element={
            <AdminLayout activeNavId="tables">
              <TablesPage />
            </AdminLayout>
          }
        />
        <Route
          path="/checkin"
          element={
            <AdminLayout activeNavId="checkin">
              <CheckinPage />
            </AdminLayout>
          }
        />
        <Route
          path="/payments"
          element={
            <AdminLayout activeNavId="payments">
              <PaymentsPage />
            </AdminLayout>
          }
        />
        <Route
          path="/payment-gateways"
          element={
            <AdminLayout activeNavId="payment-gateways">
              <PaymentGatewaysPage />
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
        <Route
          path="/inventory"
          element={
            <AdminLayout activeNavId="inventory">
              <InventoryPage />
            </AdminLayout>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
