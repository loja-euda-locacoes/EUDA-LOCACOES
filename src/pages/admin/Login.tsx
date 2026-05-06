import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithGoogle, auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { motion } from 'motion/react';
import { ShoppingBag, Star, LogIn, AlertCircle } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        const isMasterAdmin = user.email === 'lojadiscretaico@gmail.com';
        let isAdminInCollection = false;

        if (!isMasterAdmin) {
          try {
            const { doc, getDoc } = await import('firebase/firestore');
            const { db } = await import('../../lib/firebase');
            const adminDoc = await getDoc(doc(db, 'admins', user.email!));
            isAdminInCollection = adminDoc.exists();
          } catch (err) {
            console.error('Error checking admin status:', err);
          }
        }

        if (isMasterAdmin || isAdminInCollection) {
          navigate('/admin/dashboard');
        }
      }
    });
  }, [navigate]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loginWithGoogle();
      const user = result.user;
      
      const isMasterAdmin = user.email === 'lojadiscretaico@gmail.com';
      let isAdminInCollection = false;

      if (!isMasterAdmin) {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../../lib/firebase');
        const adminDoc = await getDoc(doc(db, 'admins', user.email!));
        isAdminInCollection = adminDoc.exists();
      }

      if (!isMasterAdmin && !isAdminInCollection) {
        setError('Acesso restrito. Você não possui permissão administrativa.');
        auth.signOut();
      }
    } catch (err: any) {
      setError('Erro ao fazer login. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-brand-bg relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 junino-pattern opacity-5 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl relative z-10 border border-brand-orange/10"
      >
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-brand-red rounded-full flex items-center justify-center flag-clip shadow-xl">
               <ShoppingBag className="text-white w-10 h-10 -mt-2" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-display text-gray-900">Euda Aluguéis</h1>
            <p className="text-gray-400 font-accent uppercase tracking-widest text-[10px] font-bold">Portal Administrativo</p>
          </div>

          <p className="text-gray-500 text-sm leading-relaxed">
            Bem-vindo ao painel de controle. Faça login com seu e-mail administrativo para gerenciar seu catálogo.
          </p>

          <div className="pt-4">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 py-4 rounded-full font-bold hover:bg-gray-50 hover:border-brand-orange/30 transition-all disabled:opacity-50 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="" />
                  Entrar com Google
                </>
              )}
            </button>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden p-6 bg-red-50 border-2 border-red-100 rounded-3xl text-left"
            >
               {/* Pattern */}
              <div className="absolute top-0 left-0 w-full h-1 flex gap-1 opacity-20">
                <div className="flex-1 bg-brand-red h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
                <div className="flex-1 bg-brand-yellow h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
                <div className="flex-1 bg-brand-blue h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                  <AlertCircle size={18} className="text-red-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-400">Ocorreu um erro</p>
                  <p className="text-xs font-bold text-red-700 leading-relaxed">{error}</p>
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex items-center justify-center gap-1 text-gray-300 text-[10px] uppercase font-bold tracking-widest pt-4">
            <Star size={10} className="fill-current" />
            Exclusivo para Icó - CE
          </div>
        </div>
      </motion.div>
    </div>
  );
}
