import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ScrollToTop } from './components/common/ScrollToTop';
import { Layout } from './components/common/Layout';
import { Home } from './pages/catalog/Home';
import { ProductDetails } from './pages/catalog/ProductDetails';
import { Login } from './pages/admin/Login';
import { AdminLayout } from './pages/admin/AdminLayout';
import { Dashboard } from './pages/admin/Dashboard';
import { Products } from './pages/admin/Products';
import { ProductForm } from './pages/admin/ProductForm';
import { Customers } from './pages/admin/Customers';
import { Rentals } from './pages/admin/Rentals';
import { Calendar } from './pages/admin/Calendar';
import { Settings } from './pages/admin/Settings';
import { Admins } from './pages/admin/Admins';
import { NotificationProvider } from './context/NotificationContext';

export default function App() {
  return (
    <NotificationProvider>
      <Router>
        <Helmet>
          <title>Euda Aluguéis | Catálogo de Vestidos Juninos</title>
          <meta name="description" content="Aluguel de vestidos juninos profissionais em Icó-CE. Coleção exclusiva com tradição e elegância para o seu São João." />
          <meta property="og:site_name" content="Euda Aluguéis" />
          <meta property="og:locale" content="pt_BR" />
          <meta name="theme-color" content="#D92B04" />
        </Helmet>
        <ScrollToTop />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/produto/:id" element={<Layout><ProductDetails /></Layout>} />

          {/* Admin Routes */}
          <Route path="/admin" element={<Login />} />
          <Route 
            path="/admin/dashboard" 
            element={<AdminLayout><Dashboard /></AdminLayout>} 
          />
          <Route 
            path="/admin/alugueis" 
            element={<AdminLayout><Rentals /></AdminLayout>} 
          />
          <Route 
            path="/admin/calendario" 
            element={<AdminLayout><Calendar /></AdminLayout>} 
          />
          <Route 
            path="/admin/clientes" 
            element={<AdminLayout><Customers /></AdminLayout>} 
          />
          <Route 
            path="/admin/produtos" 
            element={<AdminLayout><Products /></AdminLayout>} 
          />
          <Route 
            path="/admin/novo" 
            element={<AdminLayout><ProductForm /></AdminLayout>} 
          />
          <Route 
            path="/admin/editar/:id" 
            element={<AdminLayout><ProductForm /></AdminLayout>} 
          />
          <Route 
            path="/admin/config" 
            element={<AdminLayout><Settings /></AdminLayout>} 
          />
          <Route 
            path="/admin/usuarios" 
            element={<AdminLayout><Admins /></AdminLayout>} 
          />

          {/* Catch-all redirect to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </NotificationProvider>
  );
}
