import { AdminLayout } from '@/components/layout/AdminLayout';
import { DashboardPage } from '@/pages/DashboardPage';

export default function App() {
  return (
    <AdminLayout activeNavId="dashboard">
      <DashboardPage />
    </AdminLayout>
  );
}
