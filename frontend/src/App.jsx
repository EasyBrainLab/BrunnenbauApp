import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import WizardPage from './pages/WizardPage';
import ConfirmationPage from './pages/ConfirmationPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminDetail from './pages/AdminDetail';
import AdminCosts from './pages/AdminCosts';
import AdminSuppliers from './pages/AdminSuppliers';
import AdminInventory from './pages/AdminInventory';
import Layout from './components/Layout';

const AdminCalendar = lazy(() => import('./pages/AdminCalendar'));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<WizardPage />} />
        <Route path="/bestaetigung/:inquiryId" element={<ConfirmationPage />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/anfrage/:id" element={<AdminDetail />} />
        <Route path="/admin/kosten" element={<AdminCosts />} />
        <Route path="/admin/lieferanten" element={<AdminSuppliers />} />
        <Route path="/admin/lager" element={<AdminInventory />} />
        <Route path="/admin/kalender" element={<Suspense fallback={<div className="text-center py-12 text-gray-500">Laden...</div>}><AdminCalendar /></Suspense>} />
      </Route>
    </Routes>
  );
}
