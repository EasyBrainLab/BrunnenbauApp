import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import WizardPage from './pages/WizardPage';
import ConfirmationPage from './pages/ConfirmationPage';
import AdminLogin from './pages/AdminLogin';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminDetail from './pages/AdminDetail';
import AdminCosts from './pages/AdminCosts';
import AdminSuppliers from './pages/AdminSuppliers';
import AdminInventory from './pages/AdminInventory';
import AdminValueLists from './pages/AdminValueLists';
import AdminCompany from './pages/AdminCompany';
import AdminAuthorityLinks from './pages/AdminAuthorityLinks';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';

const AdminCalendar = lazy(() => import('./pages/AdminCalendar'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminSmtp = lazy(() => import('./pages/AdminSmtp'));

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<WizardPage />} />
          <Route path="/bestaetigung/:inquiryId" element={<ConfirmationPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/admin" element={<AdminLogin />} />

          {/* Admin-Bereich mit Sidebar */}
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/anfrage/:id" element={<AdminDetail />} />
            <Route path="/admin/kosten" element={<AdminCosts />} />
            <Route path="/admin/lieferanten" element={<AdminSuppliers />} />
            <Route path="/admin/lager" element={<AdminInventory />} />
            <Route path="/admin/wertelisten" element={<AdminValueLists />} />
            <Route path="/admin/firma" element={<AdminCompany />} />
            <Route path="/admin/behoerden-links" element={<AdminAuthorityLinks />} />
            <Route path="/admin/kalender" element={<Suspense fallback={<div className="text-center py-12 text-gray-500">Laden...</div>}><AdminCalendar /></Suspense>} />
            <Route path="/admin/benutzer" element={<Suspense fallback={<div className="text-center py-12 text-gray-500">Laden...</div>}><AdminUsers /></Suspense>} />
            <Route path="/admin/email-einstellungen" element={<Suspense fallback={<div className="text-center py-12 text-gray-500">Laden...</div>}><AdminSmtp /></Suspense>} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
