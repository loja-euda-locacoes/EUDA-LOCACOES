import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Rental, RentalStatus, Product, Customer, Settings } from '../../types';
import { ChevronLeft, ChevronRight, ShoppingBag, Clock, Eye, Edit2, Trash2, CheckCircle2, MessageCircle, FileText, AlertCircle, X, Calendar as CalendarIcon } from 'lucide-react';
import { cn, formatDate, formatCurrency, calculateFine, generateWhatsAppLink } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useNotification } from '../../context/NotificationContext';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';

export function Calendar() {
  const { notify } = useNotification();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [loading, setLoading] = useState(true);
  const [viewingRental, setViewingRental] = useState<Rental | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; rentalId: string | null }>({
    isOpen: false,
    rentalId: null
  });

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) setSettings(snap.data() as Settings);
    });

    const unsubRentals = onSnapshot(query(collection(db, 'rentals'), orderBy('pickupDate', 'asc')), (snap) => {
      setRentals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Rental)));
      setLoading(false);
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snap) => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
    });

    return () => {
      unsubSettings();
      unsubRentals();
      unsubCustomers();
    };
  }, []);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDay }, (_, i) => null);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getRentalsForDay = (day: number | null) => {
    if (day === null) return [];
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];
    
    return rentals.filter(r => {
      if (r.status === 'canceled') return false;
      const start = r.pickupDate.split('T')[0];
      const end = r.returnDate.split('T')[0];
      return dateStr >= start && dateStr <= end;
    });
  };

  const updateStatus = async (rental: Rental, status: RentalStatus) => {
    if (!rental.id) return;
    try {
      let finalFine = rental.fineValue || 0;
      const basePrice = rental.productPrice || 0;

      if (status === 'finished' && settings) {
        finalFine = calculateFine(rental.returnDate, basePrice, settings);
      }
      
      await updateDoc(doc(db, 'rentals', rental.id), { 
        status,
        fineValue: finalFine,
        totalValue: basePrice + finalFine
      });
      notify('Status atualizado com sucesso!', 'success');
      if (viewingRental?.id === rental.id) {
        setViewingRental({ ...viewingRental, status, fineValue: finalFine, totalValue: basePrice + finalFine });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rentals/${rental.id}`);
      notify('Erro ao atualizar status.', 'error');
    }
  };

  const deleteRental = async () => {
    if (!deleteModal.rentalId) return;
    try {
      await deleteDoc(doc(db, 'rentals', deleteModal.rentalId));
      notify('Aluguel excluído.', 'success');
      setViewingRental(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `rentals/${deleteModal.rentalId}`);
    } finally {
      setDeleteModal({ isOpen: false, rentalId: null });
    }
  };

  const sendWhatsAppMessage = (rental: Rental, type: 'reminder' | 'late' | 'contract') => {
    const customer = customers.find(c => c.id === rental.customerId);
    if (!customer || !settings) {
      notify('Cliente ou configurações não encontrados.', 'error');
      return;
    }

    let message = '';
    const pickupF = formatDate(rental.pickupDate);
    const returnF = formatDate(rental.returnDate);

    if (type === 'reminder') {
      message = `Olá, ${customer.name}! Passando para lembrar que o vestido ${rental.productName} deve ser devolvido em ${returnF}. Qualquer dúvida estou à disposição 😊`;
    } else if (type === 'late') {
      const currentFine = calculateFine(rental.returnDate, rental.productPrice, settings);
      message = `Olá, ${customer.name}. Identificamos atraso na devolução do vestido ${rental.productName}. Até o momento há um acréscimo de ${formatCurrency(currentFine)}. Por favor, entre em contato para regularizar.`;
    } else if (type === 'contract') {
      message = `-----------------------------------\nCONTRATO DE LOCAÇÃO – EUDA ALUGUÉIS\n\nCliente: ${customer.name}\nCPF: ${customer.cpf}\n\nPeça: ${rental.productName}\n\nPeríodo:\nRetirada: ${pickupF}\nDevolução: ${returnF}\n\nValor do aluguel: ${formatCurrency(rental.productPrice)}\n\nREGRAS:\n- A devolução deve ocorrer na data e horário combinados.\n- Em caso de atraso, será cobrada multa de:\n  ${formatCurrency(settings.fixedFine)} + ${settings.percentFine}% ao dia.\n- Após o período de tolerância de ${settings.toleranceHours} horas, a multa será aplicada automaticamente.\n- O cliente é responsável pela conservação da peça.\n\nAo confirmar, o cliente declara estar de acordo com os termos.\n-----------------------------------`;
    }

    window.open(generateWhatsAppLink(customer.phone, message), '_blank');
  };

  const getStatusColor = (status: RentalStatus, isActuallyLate?: boolean) => {
    if (isActuallyLate) return 'bg-red-50 text-brand-red border-red-200';
    switch (status) {
      case 'active': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'picked_up': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'finished': return 'bg-green-50 text-green-600 border-green-100';
      case 'late': return 'bg-red-50 text-red-600 border-red-100';
      case 'canceled': return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  const getStatusLabel = (status: RentalStatus, isActuallyLate?: boolean) => {
    if (isActuallyLate) return 'Cobrar Devolução';
    switch (status) {
      case 'active': return 'Alugado';
      case 'picked_up': return 'Retirado';
      case 'finished': return 'Entregue';
      case 'late': return 'Atrasado';
      case 'canceled': return 'Cancelado';
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 shadow-sm p-4 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-display text-gray-900">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Ocupação do Mês</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={prevMonth}
              className="p-2 md:p-3 bg-gray-50 text-gray-400 hover:text-brand-red rounded-xl transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={nextMonth}
              className="p-2 md:p-3 bg-gray-50 text-gray-400 hover:text-brand-red rounded-xl transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 md:gap-4">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center py-2 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-gray-400">
              {d.charAt(0)}<span className="hidden md:inline">{d.slice(1)}</span>
            </div>
          ))}

          {padding.map((_, i) => (
            <div key={`p-${i}`} className="bg-gray-50/30 rounded-lg md:rounded-2xl h-20 md:h-32" />
          ))}

          {days.map(day => {
            const dayRentals = getRentalsForDay(day);
            const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
            const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === currentDate.getMonth() && selectedDate?.getFullYear() === currentDate.getFullYear();

            return (
              <button 
                key={day} 
                onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                className={cn(
                  "bg-white border rounded-lg md:rounded-2xl h-20 md:h-32 p-1.5 md:p-3 space-y-1 md:space-y-2 overflow-hidden transition-all group relative flex flex-col text-left",
                  isToday ? "border-brand-red shadow-lg shadow-brand-red/5" : "border-gray-50 hover:border-brand-red/30",
                  isSelected && !isToday && "border-brand-orange ring-1 ring-brand-orange/20"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-[10px] md:text-sm font-bold",
                    isToday ? "text-brand-red" : "text-gray-900"
                  )}>
                    {day}
                  </span>
                  {dayRentals.length > 0 && (
                    <div className="w-1 md:w-1.5 h-1 md:h-1.5 bg-brand-orange rounded-full" />
                  )}
                </div>

                <div className="space-y-0.5 md:space-y-1 flex-1">
                  {dayRentals.slice(0, 2).map((r, i) => (
                    <div 
                      key={r.id} 
                      className={cn(
                        "text-[6px] md:text-[8px] font-black uppercase tracking-tighter p-0.5 md:p-1 px-1 md:px-1.5 rounded-sm md:rounded-md truncate",
                        r.status === 'late' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'
                      )}
                    >
                      {r.productName}
                    </div>
                  ))}
                  {dayRentals.length > 2 && (
                    <p className="text-[6px] md:text-[7px] text-gray-400 font-bold uppercase text-center">
                      + {dayRentals.length - 2}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            key={selectedDate.toISOString()}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 md:p-8 space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-display text-gray-900">Aluguéis de {selectedDate.toLocaleDateString('pt-BR')}</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Gestão diária</p>
              </div>
              <div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center text-brand-orange">
                <CalendarIcon size={20} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getRentalsForDay(selectedDate.getDate()).map(r => {
                const isLate = (r.status === 'active' || r.status === 'picked_up' || r.status === 'late') && new Date() > new Date(r.returnDate);
                const status = isLate ? 'late' : r.status;
                
                return (
                  <div key={r.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-gray-900">{r.customerName}</p>
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider truncate max-w-[150px]">{r.productName}</p>
                      <div className={cn(
                        "inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border mt-1",
                        getStatusColor(status as RentalStatus, isLate)
                      )}>
                        {getStatusLabel(status as RentalStatus, isLate)}
                      </div>
                    </div>
                    <button 
                      onClick={() => setViewingRental(r)}
                      className="w-10 h-10 bg-white border border-gray-100 text-gray-400 hover:text-brand-red rounded-xl flex items-center justify-center transition-all shadow-sm"
                    >
                      <Eye size={18} />
                    </button>
                  </div>
                );
              })}
              {getRentalsForDay(selectedDate.getDate()).length === 0 && (
                <div className="col-span-full py-10 text-center space-y-2">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 mx-auto">
                    <ShoppingBag size={24} />
                  </div>
                  <p className="text-sm text-gray-400 italic">Nenhum aluguel para esta data.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
              <ShoppingBag size={24} />
            </div>
            <div>
              <h3 className="text-lg font-display text-gray-900">Agenda Próxima</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Próximos compromissos</p>
            </div>
          </div>

          <div className="space-y-4">
            {rentals
              .filter(r => new Date(r.pickupDate) >= new Date())
              .slice(0, 4)
              .map(r => (
                <div key={r.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-900">{r.customerName}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">{r.productName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-brand-red uppercase tracking-widest">{formatDate(r.pickupDate).split(' ')[0]}</p>
                    <p className="text-[8px] text-gray-400 font-medium">{formatDate(r.pickupDate).split(' ')[1]}</p>
                  </div>
                </div>
              ))}
            {rentals.filter(r => new Date(r.pickupDate) >= new Date()).length === 0 && (
              <p className="text-center py-10 text-gray-400 italic text-sm">Nenhum evento futuro próximo.</p>
            )}
          </div>
        </div>

        <div className="bg-brand-orange/5 p-8 rounded-[2.5rem] border-2 border-brand-orange/10 border-dashed flex flex-col items-center justify-center text-center space-y-4">
           <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-brand-orange shadow-lg shadow-brand-orange/10">
             <Clock size={32} />
           </div>
           <div>
             <h4 className="text-xl font-display text-brand-orange">Dica de Gestão</h4>
             <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-xs mx-auto">
               Utilize o calendário para identificar períodos de alta demanda e planeje seu estoque com antecedência.
             </p>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {viewingRental && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingRental(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-display text-gray-900">Detalhes do Aluguel</h3>
                  <button onClick={() => setViewingRental(null)} className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-brand-red transition-all">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-brand-orange shadow-sm">
                      <ShoppingBag size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{viewingRental.customerName}</p>
                      <p className="text-xs text-gray-500 font-medium">{viewingRental.productName}</p>
                      <div className={cn(
                        "inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border mt-2",
                        getStatusColor(viewingRental.status, (viewingRental.status === 'active' || viewingRental.status === 'picked_up' || viewingRental.status === 'late') && new Date() > new Date(viewingRental.returnDate))
                      )}>
                        {getStatusLabel(viewingRental.status, (viewingRental.status === 'active' || viewingRental.status === 'picked_up' || viewingRental.status === 'late') && new Date() > new Date(viewingRental.returnDate))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl space-y-1">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Retirada</p>
                      <p className="text-xs font-bold text-gray-900">{formatDate(viewingRental.pickupDate)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl space-y-1">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Devolução</p>
                      <p className="text-xs font-bold text-gray-900">{formatDate(viewingRental.returnDate)}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Valor Total</p>
                      <p className="text-lg font-black text-gray-900">{formatCurrency(viewingRental.totalValue || viewingRental.productPrice)}</p>
                    </div>
                    {viewingRental.fineValue > 0 && (
                      <div className="text-right">
                        <p className="text-[8px] font-black text-brand-red uppercase tracking-widest">Multa</p>
                        <p className="text-xs font-black text-brand-red">{formatCurrency(viewingRental.fineValue)}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50">
                   <div className="col-span-full space-y-2">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Alterar Status</p>
                     <select
                        value={viewingRental.status}
                        onChange={(e) => updateStatus(viewingRental, e.target.value as RentalStatus)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-red/10"
                     >
                        <option value="active">Alugado</option>
                        <option value="picked_up">Retirado</option>
                        <option value="finished">Entregue</option>
                        <option value="late">Atrasado</option>
                        <option value="canceled">Cancelado</option>
                     </select>
                   </div>
                   
                   <Link 
                     to="/admin/alugueis"
                     className="flex items-center justify-center gap-2 py-3 bg-gray-50 text-gray-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-100 transition-all col-span-full"
                   >
                     <Edit2 size={14} /> Editar no Painel de Aluguéis
                   </Link>
                   <button 
                     onClick={() => sendWhatsAppMessage(viewingRental, 'contract')}
                     className="flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-100 transition-all"
                   >
                     <FileText size={14} /> Contrato
                   </button>
                   <button 
                     onClick={() => sendWhatsAppMessage(viewingRental, 'reminder')}
                     className="flex items-center justify-center gap-2 py-3 bg-orange-50 text-orange-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-orange-100 transition-all"
                   >
                     <Clock size={14} /> Lembrete
                   </button>
                   <button 
                     onClick={() => updateStatus(viewingRental, 'finished')}
                     className="flex items-center justify-center gap-2 py-3 bg-green-50 text-green-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-green-100 transition-all col-span-full"
                   >
                     <CheckCircle2 size={14} /> Marcar como Entregue
                   </button>
                   <button 
                     onClick={() => { setDeleteModal({ isOpen: true, rentalId: viewingRental.id }); }}
                     className="flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-100 transition-all"
                   >
                     <Trash2 size={14} /> Excluir
                   </button>
                   <button 
                     onClick={() => sendWhatsAppMessage(viewingRental, 'late')}
                     className="flex items-center justify-center gap-2 py-3 bg-brand-red/5 text-brand-red rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-red/10 transition-all"
                   >
                     <AlertCircle size={14} /> Cobrar Atraso
                   </button>
                   <div className="col-span-full pt-2">
                     <p className="text-center text-[9px] text-gray-400 font-medium">Para editar informações detalhadas, acesse a aba de Aluguéis.</p>
                   </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, rentalId: null })}
        onConfirm={deleteRental}
        title="Excluir Aluguel"
        message="Tem certeza que deseja excluir esta reserva? Isso removerá o registro permanentemente do sistema."
        confirmText="Sim, Excluir"
        type="danger"
      />
    </div>
  );
}
