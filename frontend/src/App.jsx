import { Routes, Route } from 'react-router-dom';
import WizardPage from './pages/WizardPage';
import ConfirmationPage from './pages/ConfirmationPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminDetail from './pages/AdminDetail';
import Layout from './components/Layout';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<WizardPage />} />
        <Route path="/bestaetigung/:inquiryId" element={<ConfirmationPage />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/anfrage/:id" element={<AdminDetail />} />
      </Route>
    </Routes>
  );
}
