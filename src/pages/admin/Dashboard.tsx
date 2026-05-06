import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Product, Rental, Customer } from '../../types';
import { ShoppingBag, Users, Calendar, AlertCircle, TrendingUp, Clock } from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const [stats, setStats] = useState({
    activeRentals: 0,
    lateRentals: 0,
    totalCustomers: 0,
    totalProducts: 0,
    monthlyRevenue: 0,
  });
  const [recentRentals, setRecentRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubRentals = onSnapshot(collection(db, 'rentals'), (snap) => {
      const rentals = snap.docs.map(d => ({ id: d.id, ...d.data() } as Rental));
      const active = rentals.filter(r => r.status === 'active').length;
      const late = rentals.filter(r => r.status === 'late').length;
      
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      
      const revenue = rentals
        .filter(r => {
          const d = new Date(r.createdAt);
          return d.getMonth() === thisMonth && d.getFullYear() === thisYear && r.status !== 'canceled';
        })
        .reduce((acc, r) => acc + r.totalValue, 0);

      setStats(prev => ({ ...prev, activeRentals: active, lateRentals: late, monthlyRevenue: revenue }));
      setRecentRentals(rentals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5));
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snap) => {
      setStats(prev => ({ ...prev, totalCustomers: snap.size }));
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      setStats(prev => ({ ...prev, totalProducts: snap.size }));
    });

    setLoading(false);
    return () => {
      unsubRentals();
      unsubCustomers();
      unsubProducts();
    };
  }, []);

  const cards = [
    { name: 'Aluguéis Ativos', value: stats.activeRentals, icon: ShoppingBag, color: 'bg-blue-500', trend: 'Em andamento' },
    { name: 'Atrasos Atuais', value: stats.lateRentals, icon: AlertCircle, color: 'bg-brand-red', trend: 'Atenção necessária', highlight: stats.lateRentals > 0 },
    { name: 'Faturamento Mensal', value: formatCurrency(stats.monthlyRevenue), icon: TrendingUp, color: 'bg-green-500', trend: 'Este mês' },
    { name: 'Total de Clientes', value: stats.totalCustomers, icon: Users, color: 'bg-brand-orange', trend: 'Base cadastrada' },
  ];

  if (loading) return null;

  return (
    <div className="space-y-8">
      {/* Alert for Late Rentals */}
      {stats.lateRentals > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border-2 border-red-100 p-6 rounded-[2rem] flex items-center gap-6 shadow-xl shadow-red-500/5"
        >
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-brand-red shrink-0 shadow-sm">
            <AlertCircle size={32} />
          </div>
          <div>
            <h4 className="text-lg font-display text-red-900 leading-tight">Existem Aluguéis em Atraso!</h4>
            <p className="text-sm text-red-600 font-medium">Há {stats.lateRentals} {stats.lateRentals === 1 ? 'cliente que ainda não devolveu' : 'clientes que ainda não devolveram'} o vestido.</p>
          </div>
          <Link to="/admin/alugueis" className="ml-auto bg-brand-red text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-brand-red/20 active:scale-95 transition-all">
            Verificar Agora
          </Link>
        </motion.div>
      )}

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={card.name}
              className={cn(
                "bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group",
                card.highlight && "border-red-200 ring-4 ring-red-500/5"
              )}
            >
              <div className={cn("w-12 h-12 rounded-2xl mb-4 flex items-center justify-center text-white shadow-lg", card.color)}>
                <Icon size={24} />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{card.name}</p>
              <h3 className="text-3xl font-display text-gray-900 mb-1">{card.value}</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{card.trend}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Rentals List */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-display text-gray-900 leading-tight">Aluguéis Recentes</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Últimas movimentações</p>
            </div>
            <Clock size={20} className="text-gray-300" />
          </div>
          <div className="flex-grow p-4">
            <div className="space-y-3">
              {recentRentals.map((rental) => (
                <div key={rental.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    rental.status === 'active' ? 'bg-blue-50 text-blue-500' : 
                    rental.status === 'late' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'
                  )}>
                    <ShoppingBag size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{rental.customerName}</p>
                    <p className="text-[10px] text-gray-400">{rental.productName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(rental.totalValue)}</p>
                    <p className={cn(
                      "text-[9px] font-black uppercase tracking-widest",
                      rental.status === 'active' ? 'text-blue-500' : 
                      rental.status === 'late' ? 'text-red-500' : 'text-green-500'
                    )}>
                      {rental.status}
                    </p>
                  </div>
                </div>
              ))}
              {recentRentals.length === 0 && (
                <div className="py-20 text-center text-gray-400 font-display">
                  Nenhum aluguel registrado.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions / Info */}
        <div className="space-y-6">
          <div className="bg-brand-orange p-8 rounded-[2.5rem] text-white shadow-xl shadow-brand-orange/20 relative overflow-hidden">
            {/* Pattern */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            
            <h3 className="text-2xl font-display mb-2">Suporte Rápido</h3>
            <p className="text-sm text-white/80 mb-6 font-medium leading-relaxed">
              Dúvidas sobre o sistema ou precisa de ajuda técnica? Entre em contato com o suporte direto.
            </p>
            <button className="bg-white text-brand-orange px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-black/5 active:scale-95 transition-all">
              Falar com Suporte
            </button>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
             <div className="flex items-center gap-4 mb-6">
               <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                 <Calendar size={24} />
               </div>
               <div>
                 <h3 className="text-lg font-display text-gray-900">Agenda do Dia</h3>
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Compromissos hoje</p>
               </div>
             </div>
             <p className="text-sm text-gray-500 italic">
               Confira suas retiradas e devoluções agendadas para hoje no módulo de aluguéis.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
