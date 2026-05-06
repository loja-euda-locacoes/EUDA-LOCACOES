import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { auth, logout, handleFirestoreError, OperationType, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { LayoutDashboard, LogOut, ChevronRight, Home, Users, ShoppingBag, Star, Shield, Calendar, Settings as SettingsIcon, Menu, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { seedDatabase } from '../../lib/seed';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Close sidebar on route change
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/admin');
        return;
      }

      const isMasterAdmin = user.email === 'lojadiscretaico@gmail.com';
      let isAdminInCollection = false;

      if (!isMasterAdmin) {
        try {
          const adminDoc = await getDoc(doc(db, 'admins', user.email!));
          isAdminInCollection = adminDoc.exists();
        } catch (err) {
          console.error('Error checking admin status:', err);
        }
      }

      if (isMasterAdmin || isAdminInCollection) {
        setUser(user);
        setLoading(false);
        // Silently ensure database is seeded if empty
        seedDatabase().catch((err) => {
          console.warn('Silent seed error:', err);
        });
      } else {
        navigate('/admin');
      }
    });
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { name: 'Aluguéis', icon: ShoppingBag, path: '/admin/alugueis' },
    { name: 'Calendário', icon: Calendar, path: '/admin/calendario' },
    { name: 'Clientes', icon: Users, path: '/admin/clientes' },
    { name: 'Vestidos', icon: Star, path: '/admin/produtos' },
    { name: 'Usuários', icon: Shield, path: '/admin/usuarios' },
    { name: 'Configurações', icon: SettingsIcon, path: '/admin/config' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row relative">
      {/* Mobile Header */}
      <div className="md:hidden h-16 bg-white border-b border-gray-100 p-4 flex items-center justify-between sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-red/20 font-bold text-sm">
            E
          </div>
          <span className="font-display font-black text-gray-900 tracking-tight">Euda Admin</span>
        </Link>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 bg-gray-50 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 top-16 bg-black/20 backdrop-blur-sm z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 w-72 bg-white border-r border-gray-100 flex flex-col p-6 space-y-8 z-40 transition-all duration-300 md:static md:w-64 md:translate-x-0 h-[calc(100vh-64px)] md:h-screen",
        "top-16", // Stays below mobile header
        isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <Link to="/" className="hidden md:flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-red rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-red/20 font-bold">
            E
          </div>
          <div>
            <span className="block font-display text-lg leading-none">Euda Admin</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Painel de Gestão</span>
          </div>
        </Link>

        <nav className="flex-grow space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "group flex items-center justify-between p-3 rounded-2xl transition-all font-medium text-sm",
                  isActive 
                    ? "bg-brand-red text-white shadow-lg shadow-brand-red/10" 
                    : "text-gray-500 hover:bg-gray-50 hover:text-brand-orange"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  {item.name}
                </div>
                {isActive && <motion.div layoutId="active" className="w-1.5 h-1.5 bg-white rounded-full" />}
              </Link>
            );
          })}
        </nav>

        <div className="pt-6 border-t border-gray-50 space-y-4">
          <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-2xl">
            <img src={user.photoURL} alt="" className="w-10 h-10 rounded-xl" />
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate">{user.displayName}</p>
              <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          
          <Link to="/" className="w-full flex items-center gap-3 p-3 rounded-2xl text-gray-500 hover:bg-gray-50 text-sm transition-all font-medium">
             <Home size={18} />
             Ver Loja
          </Link>

          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 p-3 rounded-2xl text-red-500 hover:bg-red-50 text-sm transition-all font-medium"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-4 md:p-10 overflow-x-hidden">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
               <h2 className="text-2xl font-display text-gray-900">
                {menuItems.find(i => i.path === location.pathname)?.name || 'Gerenciamento'}
               </h2>
               <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                 Admin <ChevronRight size={12} /> {menuItems.find(i => i.path === location.pathname)?.name || 'Painel'}
               </div>
            </div>
          </div>
          
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
