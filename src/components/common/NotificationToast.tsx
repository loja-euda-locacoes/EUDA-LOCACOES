import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface NotificationToastProps {
  key?: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
}

const icons = {
  success: <CheckCircle2 size={20} className="text-green-600" />,
  error: <AlertCircle size={20} className="text-red-600" />,
  info: <Info size={20} className="text-blue-600" />,
  warning: <AlertTriangle size={20} className="text-amber-600" />,
};

const styles = {
  success: 'bg-green-50 border-green-200',
  error: 'bg-red-50 border-red-200',
  info: 'bg-blue-50 border-blue-200',
  warning: 'bg-amber-50 border-amber-200',
};

const accentColors = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
};

export function NotificationToast({ message, type, onClose }: NotificationToastProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
      className={cn(
        "pointer-events-auto min-w-[320px] max-w-[420px] relative overflow-hidden",
        "bg-white border-2 rounded-[2rem] shadow-2xl flex items-center gap-4 p-5",
        styles[type]
      )}
    >
      {/* Festa Junina "Bandeirinha" Pattern Background */}
      <div className="absolute top-0 left-0 w-full h-1 flex gap-1 opacity-40">
        <div className="flex-1 bg-brand-red h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
        <div className="flex-1 bg-brand-yellow h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
        <div className="flex-1 bg-brand-blue h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
        <div className="flex-1 bg-brand-red h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
        <div className="flex-1 bg-brand-yellow h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
      </div>

      <div className={cn(
        "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
        "bg-white shadow-sm border border-black/5"
      )}>
        {icons[type]}
      </div>

      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900 leading-tight">
          {message}
        </p>
      </div>

      <button
        onClick={onClose}
        className="p-1 hover:bg-black/5 rounded-full transition-colors text-gray-400 hover:text-gray-600"
      >
        <X size={16} />
      </button>

      {/* Progress Bar Animation */}
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 4, ease: 'linear' }}
        className={cn("absolute bottom-0 left-0 h-1", accentColors[type])}
      />
    </motion.div>
  );
}
