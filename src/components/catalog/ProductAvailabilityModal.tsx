import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Rental, Product } from '../../types';
import { cn } from '../../lib/utils';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProductAvailabilityModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductAvailabilityModal({ product, isOpen, onClose }: ProductAvailabilityModalProps) {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (!isOpen || !product.id) return;

    const q = query(
      collection(db, 'rentals'),
      where('productId', '==', product.id),
      where('status', 'in', ['active', 'picked_up', 'late'])
    );

    return onSnapshot(q, (snap) => {
      setRentals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Rental)));
    });
  }, [isOpen, product.id]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDayOfMonth = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const isDateOccupied = (day: number) => {
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    checkDate.setHours(0, 0, 0, 0);

    return rentals.some(r => {
      const start = new Date(r.pickupDate);
      const end = new Date(r.returnDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      // A data está ocupada se for o dia da retirada ou qualquer dia antes da devolução.
      // O dia da devolução em si fica livre, a menos que seja o dia de retirada de OUTRO aluguel.
      return checkDate >= start && checkDate < end;
    });
  };

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center text-brand-orange">
                <CalendarIcon size={20} />
              </div>
              <div>
                <h3 className="text-xl font-display text-gray-900">Disponibilidade</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{product.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-brand-red transition-all">
              <X size={20} />
            </button>
          </div>

          <div className="bg-gray-50 rounded-3xl p-6 space-y-6 border border-gray-100/50">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-900">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h4>
              <div className="flex gap-1">
                <button onClick={prevMonth} className="p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-brand-red"><ChevronLeft size={16} /></button>
                <button onClick={nextMonth} className="p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-brand-red"><ChevronRight size={16} /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                <div key={d} className="text-center py-2 text-[9px] font-black text-gray-400 uppercase">{d}</div>
              ))}
              
              {padding.map((_, i) => <div key={`p-${i}`} />)}
              
              {days.map(day => {
                const occupied = isDateOccupied(day);
                const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                const isToday = dateObj.toDateString() === new Date().toDateString();
                const isPast = dateObj < new Date(new Date().setHours(0,0,0,0));

                return (
                  <div 
                    key={day}
                    className={cn(
                      "aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-bold transition-all relative",
                      occupied 
                        ? "bg-brand-orange/20 text-brand-orange ring-1 ring-brand-orange/30" 
                        : isPast 
                          ? "text-gray-300 pointer-events-none" 
                          : "bg-green-50 text-green-600 ring-1 ring-green-100 hover:scale-110",
                      isToday && !occupied && "ring-2 ring-brand-red ring-offset-2 ring-offset-gray-50"
                    )}
                  >
                    {day}
                    {isToday && (
                      <div className="absolute -bottom-1 w-1 h-1 bg-brand-red rounded-full" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-6 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm shadow-green-200" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Disponível</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-brand-orange shadow-sm shadow-brand-orange/20" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Alugado</span>
              </div>
            </div>
          </div>

          <div className="bg-brand-red/5 p-4 rounded-2xl border border-brand-red/10 animate-pulse-slow">
            <p className="text-[10px] text-brand-red font-bold text-center uppercase tracking-widest">
              Para reservar esta peça, entre em contato via WhatsApp 👗
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
