import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning'
}: ConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] md:w-full max-w-sm bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-2xl z-[10001] overflow-hidden max-h-[95vh] flex flex-col"
          >
            {/* Header Patterns */}
            <div className="absolute top-0 left-0 w-full h-2 flex gap-1 opacity-60 shrink-0">
              <div className="flex-1 bg-brand-red h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
              <div className="flex-1 bg-brand-yellow h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
              <div className="flex-1 bg-brand-blue h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
              <div className="flex-1 bg-brand-red h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
              <div className="flex-1 bg-brand-yellow h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
            </div>
 
            <div className="p-6 md:p-10 text-center space-y-6 overflow-y-auto flex-grow">
              <div className={cn(
                "w-20 h-20 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-lg border border-black/5",
                type === 'danger' ? 'bg-red-50 text-red-500' : 'bg-brand-yellow/10 text-brand-orange'
              )}>
                <AlertTriangle size={40} />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-display font-black text-gray-900 tracking-tight">{title}</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                  {message}
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-black/5 active:scale-95",
                    type === 'danger' 
                      ? 'bg-brand-red text-white hover:bg-red-600 shadow-brand-red/20' 
                      : 'bg-brand-orange text-white hover:bg-brand-red shadow-brand-orange/20'
                  )}
                >
                  {confirmText}
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all active:scale-95"
                >
                  {cancelText}
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-gray-300 hover:text-gray-500 transition-colors"
            >
              <X size={20} />
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
