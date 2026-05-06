import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export function PWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show if not already in standalone mode
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 left-4 right-4 z-[100] md:left-auto md:right-8 md:w-80"
        >
          <div className="bg-white rounded-[2rem] shadow-2xl border border-brand-red/10 p-6 flex items-center gap-4 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-brand-red" />
            
            <div className="w-12 h-12 bg-brand-red/10 rounded-2xl flex items-center justify-center flex-shrink-0 text-brand-red">
              <Download size={24} />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-black text-gray-900 leading-tight">Instalar Aplicativo</h4>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Acesse mais rápido</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleInstall}
                className="bg-brand-red text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-red/20"
              >
                Instalar
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="p-2 text-gray-300 hover:text-gray-500 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
