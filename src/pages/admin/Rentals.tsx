import { useEffect, useState, FormEvent } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, getDocs, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Rental, Customer, Product, Settings, RentalStatus } from '../../types';
import { Plus, Search, Calendar, ShoppingBag, User, ArrowRight, MessageCircle, AlertCircle, CheckCircle2, MoreVertical, FileText, Ban, Trash2, Clock } from 'lucide-react';
import { cn, formatCurrency, formatDate, calculateFine, generateWhatsAppLink } from '../../lib/utils';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { useNotification } from '../../context/NotificationContext';
import { motion, AnimatePresence } from 'motion/react';

export function Rentals() {
  const { notify } = useNotification();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRentalId, setEditingRentalId] = useState<string | null>(null);
  
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeStatusSelectId, setActiveStatusSelectId] = useState<string | null>(null);

  const [isQuickCustomerModalOpen, setIsQuickCustomerModalOpen] = useState(false);
  const [quickCustomerFormData, setQuickCustomerFormData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    cpf: '',
    address: '',
    instagram: '',
    secondaryContactName: '',
    secondaryContactPhone: '',
  });
  
  const [formData, setFormData] = useState({
    customerId: '',
    productId: '',
    status: 'active' as RentalStatus,
    pickupDate: '',
    returnDate: '',
    notes: ''
  });

  const handleQuickCustomerSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const docRef = await addDoc(collection(db, 'customers'), {
        ...quickCustomerFormData,
        createdAt: new Date().toISOString()
      });
      notify('Cliente cadastrado com sucesso!', 'success');
      setFormData(prev => ({ ...prev, customerId: docRef.id }));
      setIsQuickCustomerModalOpen(false);
      setQuickCustomerFormData({
        name: '',
        phone: '',
        cpf: '',
        address: '',
        instagram: '',
        secondaryContactName: '',
        secondaryContactPhone: '',
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'customers');
      notify('Erro ao cadastrar cliente.', 'error');
    }
  };

  const openNewRental = () => {
    setEditingRentalId(null);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const pickupTime = settings?.defaultPickupTime || '13:00';
    const returnTime = settings?.defaultReturnTime || '10:00';

    setFormData({
      customerId: '',
      productId: '',
      status: 'active',
      pickupDate: `${today.toISOString().split('T')[0]}T${pickupTime}`,
      returnDate: `${tomorrow.toISOString().split('T')[0]}T${returnTime}`,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditRental = (rental: Rental) => {
    setEditingRentalId(rental.id);
    setFormData({
      customerId: rental.customerId,
      productId: rental.productId,
      status: rental.status,
      pickupDate: rental.pickupDate,
      returnDate: rental.returnDate,
      notes: rental.notes || ''
    });
    setIsModalOpen(true);
  };

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; rentalId: string | null }>({
    isOpen: false,
    rentalId: null
  });

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) setSettings(snap.data() as Settings);
    });

    const unsubRentals = onSnapshot(query(collection(db, 'rentals'), orderBy('createdAt', 'desc')), (snap) => {
      setRentals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Rental)));
      setLoading(false);
    });

    const unsubCustomers = onSnapshot(query(collection(db, 'customers'), orderBy('name', 'asc')), (snap) => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
    });

    const unsubProducts = onSnapshot(query(collection(db, 'products'), orderBy('name', 'asc')), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    });

    return () => {
      unsubSettings();
      unsubRentals();
      unsubCustomers();
      unsubProducts();
    };
  }, []);

  const checkConflict = async (productId: string, pickup: string, returnD: string) => {
    const pStart = new Date(pickup).getTime();
    const pEnd = new Date(returnD).getTime();

    // Check existing rentals for this product
    const conflictingRentals = rentals.filter(r => {
      if (r.productId !== productId || r.status === 'canceled' || r.status === 'finished') return false;
      
      const rStart = new Date(r.pickupDate).getTime();
      const rEnd = new Date(r.returnDate).getTime();

      return (pStart < rEnd && pEnd > rStart);
    });

    return conflictingRentals.length > 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    if (new Date(formData.pickupDate) >= new Date(formData.returnDate)) {
      notify('Data de devolução deve ser após a retirada.', 'warning');
      return;
    }

    const hasConflict = await checkConflict(formData.productId, formData.pickupDate, formData.returnDate);
    if (hasConflict && !editingRentalId) {
      notify('Este vestido já está alugado para este período!', 'error');
      return;
    }

    const customer = customers.find(c => c.id === formData.customerId);
    const product = products.find(p => p.id === formData.productId);

    if (!customer || !product) return;

    try {
      if (editingRentalId) {
        const rental = rentals.find(r => r.id === editingRentalId);
        let finalFine = rental?.fineValue || 0;
        
        // If status changed to finished, recalculate fine
        if (formData.status === 'finished' && settings) {
          finalFine = calculateFine(formData.returnDate, product.price, settings);
        }

        await updateDoc(doc(db, 'rentals', editingRentalId), {
          customerId: customer.id,
          customerName: customer.name,
          productId: product.id,
          productName: product.name,
          productPrice: product.price,
          status: formData.status,
          pickupDate: formData.pickupDate,
          returnDate: formData.returnDate,
          fineValue: finalFine,
          totalValue: product.price + finalFine,
          notes: formData.notes,
        });
        notify('Aluguel atualizado com sucesso!', 'success');
      } else {
        await addDoc(collection(db, 'rentals'), {
          customerId: customer.id,
          customerName: customer.name,
          productId: product.id,
          productName: product.name,
          productPrice: product.price,
          status: 'active',
          pickupDate: formData.pickupDate,
          returnDate: formData.returnDate,
          totalValue: product.price,
          fineValue: 0,
          notes: formData.notes,
          createdAt: new Date().toISOString()
        });
        notify('Aluguel registrado com sucesso!', 'success');
      }

      setIsModalOpen(false);
      setEditingRentalId(null);
      setFormData({ customerId: '', productId: '', pickupDate: '', returnDate: '', notes: '' });
    } catch (err) {
      handleFirestoreError(err, editingRentalId ? OperationType.UPDATE : OperationType.CREATE, editingRentalId ? `rentals/${editingRentalId}` : 'rentals');
      notify(editingRentalId ? 'Erro ao atualizar aluguel.' : 'Erro ao registrar aluguel.', 'error');
    }
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
      const statusLabels: Record<RentalStatus, string> = {
        active: 'Alugado',
        picked_up: 'Retirado',
        finished: 'Entregue',
        late: 'Atrasado',
        canceled: 'Cancelado'
      };
      
      notify(`Status atualizado para ${statusLabels[status]}`, 'success');
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
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `rentals/${deleteModal.rentalId}`);
    } finally {
      setDeleteModal({ isOpen: false, rentalId: null });
    }
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

  const getRowBackground = (status: RentalStatus, isActuallyLate?: boolean) => {
    if (isActuallyLate) return 'bg-red-50/70 hover:bg-red-100/80 transition-colors';
    switch (status) {
      case 'active': return 'bg-blue-50/70 hover:bg-blue-100/80 transition-colors';
      case 'picked_up': return 'bg-orange-50/70 hover:bg-orange-100/80 transition-colors';
      case 'finished': return 'bg-green-50/70 hover:bg-green-100/80 transition-colors';
      case 'late': return 'bg-red-50/70 hover:bg-red-100/80 transition-colors';
      case 'canceled': return 'bg-gray-100/70 hover:bg-gray-200/80 transition-colors';
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

  const sendWhatsAppMessage = (rental: Rental, type: 'reminder' | 'late' | 'contract') => {
    const customer = customers.find(c => c.id === rental.customerId);
    if (!customer || !settings) return;

    let message = '';
    const pickupF = formatDate(rental.pickupDate);
    const returnF = formatDate(rental.returnDate);

    if (type === 'reminder') {
      message = `Olá, ${customer.name}! Passando para lembrar que o vestido ${rental.productName} deve ser devolvido em ${returnF}. Qualquer dúvida estou à disposição 😊`;
    } else if (type === 'late') {
      const currentFine = calculateFine(rental.returnDate, rental.productPrice, settings);
      message = `Olá, ${customer.name}. Identificamos atraso na devolução do vestido ${rental.productName}. Até o momento há um acréscimo de ${formatCurrency(currentFine)}. Por favor, entre em contato para regularizar.`;
    } else if (type === 'contract') {
      message = `-----------------------------------\nCONTRATO DE LOCAÇÃO – EUDA ALUGUÉIS\n\nCliente: ${customer.name}\nCPF: ${customer.cpf || 'Não informado'}\n\nPeça: ${rental.productName}\n\nPeríodo:\nRetirada: ${pickupF}\nDevolução: ${returnF}\n\nValor do aluguel: ${formatCurrency(rental.productPrice)}\n\nREGRAS:\n- A devolução deve ocorrer na data e horário combinados.\n- Em caso de atraso, será cobrada multa de:\n  ${formatCurrency(settings.fixedFine)} + ${settings.percentFine}% ao dia.\n- Após o período de tolerância de ${settings.toleranceHours} horas, a multa será aplicada automaticamente.\n- O cliente é responsável pela conservação da peça.\n\nAo confirmar, o cliente declara estar de acordo com os termos.\n-----------------------------------`;
    }

    window.open(generateWhatsAppLink(customer.phone, message), '_blank');
  };

  const filteredRentals = rentals.filter(r => 
    r.customerName.toLowerCase().includes(search.toLowerCase()) ||
    r.productName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por cliente ou vestido..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm shadow-sm focus:ring-2 focus:ring-brand-red/10 transition-all outline-none"
          />
        </div>
        <button
          onClick={openNewRental}
          className="bg-brand-red text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-red/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          Novo Aluguel
        </button>
      </div>

      <div className="hidden lg:block bg-white rounded-[2.5rem] border border-gray-100 shadow-sm relative">
        <div className="absolute top-0 left-0 w-full h-1 flex gap-0.5 opacity-30 z-10">
          <div className="flex-1 bg-brand-red h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
          <div className="flex-1 bg-brand-yellow h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
          <div className="flex-1 bg-brand-blue h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
          <div className="flex-1 bg-brand-red h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
          <div className="flex-1 bg-brand-yellow h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
        </div>
        <div className="overflow-visible">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 italic font-display text-xs text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4 font-normal text-[10px]">Aluguel</th>
                <th className="px-6 py-4 font-normal text-[10px]">Período</th>
                <th className="px-6 py-4 font-normal text-[10px] text-center">Status</th>
                <th className="px-6 py-4 font-normal text-[10px] text-right">Valor</th>
                <th className="px-6 py-4 font-normal text-[10px] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredRentals.map((r) => {
                const isLate = (r.status === 'active' || r.status === 'picked_up' || r.status === 'late') && new Date() > new Date(r.returnDate);
                const currentFine = isLate && settings ? calculateFine(r.returnDate, r.productPrice, settings) : r.fineValue;
                const status = isLate ? 'late' : r.status;

                return (
                  <tr key={r.id} className={cn(
                    "group transition-colors relative",
                    activeMenuId === r.id ? "z-30" : "z-0",
                    getRowBackground(status as RentalStatus, isLate)
                  )}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-brand-orange group-hover:text-white transition-colors">
                          <ShoppingBag size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">{r.customerName}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                             <ArrowRight size={10} className="text-brand-red" /> {r.productName}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1 min-w-[140px]">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600 uppercase tracking-tighter">
                          <Clock size={12} className="text-blue-400" /> {formatDate(r.pickupDate)}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                          <ArrowRight size={12} className="text-brand-orange" /> {formatDate(r.returnDate)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      {activeStatusSelectId === r.id ? (
                        <div className="relative inline-block">
                          <select
                            autoFocus
                            value={r.status}
                            onChange={(e) => {
                              updateStatus(r, e.target.value as RentalStatus);
                              setActiveStatusSelectId(null);
                            }}
                            onBlur={() => setActiveStatusSelectId(null)}
                            className="bg-white border border-gray-200 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-brand-red/20 shadow-sm"
                          >
                            <option value="active">Alugado</option>
                            <option value="picked_up">Retirado</option>
                            <option value="finished">Entregue</option>
                            <option value="late">Atrasado</option>
                            <option value="canceled">Cancelado</option>
                          </select>
                        </div>
                      ) : (
                        <button
                          onClick={() => setActiveStatusSelectId(r.id)}
                          className={cn(
                            "inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-transform hover:scale-105 active:scale-95",
                            getStatusColor(status, isLate)
                          )}
                        >
                          {getStatusLabel(status, isLate)}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right whitespace-nowrap">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(r.productPrice + currentFine)}</p>
                        {currentFine > 0 && (
                          <p className="text-[9px] font-black text-brand-red uppercase tracking-tighter">Multa: {formatCurrency(currentFine)}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2 px-1">
                        {status === 'active' || status === 'picked_up' || status === 'late' ? (
                          <button
                            onClick={() => updateStatus(r, 'finished')}
                            className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-sm"
                            title="Marcar como entregue"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                        ) : null}
                        
                        <div className="relative">
                          <button 
                            onClick={() => setActiveMenuId(activeMenuId === r.id ? null : r.id)}
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm",
                              activeMenuId === r.id ? "bg-brand-red text-white" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                            )}
                          >
                            <MoreVertical size={18} />
                          </button>
                          
                          {activeMenuId === r.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-[60]" 
                                onClick={() => setActiveMenuId(null)}
                              />
                              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-[70] animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                                <p className="px-5 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-2 font-display">Opções do WhatsApp</p>
                                <button 
                                  onClick={() => { sendWhatsAppMessage(r, 'contract'); setActiveMenuId(null); }}
                                  className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                                >
                                 <FileText size={16} className="text-blue-500" /> Enviar Contrato
                                </button>
                                <button 
                                  onClick={() => { sendWhatsAppMessage(r, 'reminder'); setActiveMenuId(null); }}
                                  className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                                >
                                 <Clock size={16} className="text-orange-500" /> Lembrar Devolução
                                </button>
                                <button 
                                  onClick={() => { sendWhatsAppMessage(r, 'late'); setActiveMenuId(null); }}
                                  className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium text-brand-red"
                                >
                                 <AlertCircle size={16} /> Cobrar Atraso
                                </button>
                                
                                <p className="px-5 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-y border-gray-50 my-2 font-display">Ações de Gestão</p>
                                <button 
                                  onClick={() => { openEditRental(r); setActiveMenuId(null); }}
                                  className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                                >
                                 <FileText size={16} className="text-brand-orange" /> Editar Aluguel
                                </button>
                                <button 
                                  onClick={() => { updateStatus(r, 'canceled'); setActiveMenuId(null); }}
                                  className="w-full flex items-center gap-3 px-5 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium"
                                >
                                 <Ban size={16} /> Cancelar Aluguel
                                </button>
                                <button 
                                  onClick={() => { setDeleteModal({ isOpen: true, rentalId: r.id }); setActiveMenuId(null); }}
                                  className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-400 hover:bg-gray-50 transition-colors font-medium"
                                >
                                 <Trash2 size={16} /> Excluir Registro
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile & Tablet Card Grid - Visible on < 1024px */}
      <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredRentals.map((r) => {
          const isLate = (r.status === 'active' || r.status === 'picked_up' || r.status === 'late') && new Date() > new Date(r.returnDate);
          const currentFine = isLate && settings ? calculateFine(r.returnDate, r.productPrice, settings) : r.fineValue;
          const status = isLate ? 'late' : r.status;

          return (
            <div 
              key={r.id} 
              className={cn(
                "rounded-[2rem] border border-gray-100 shadow-sm p-6 space-y-4 relative transition-colors",
                activeMenuId === r.id ? "z-30" : "z-0",
                getRowBackground(status as RentalStatus, isLate).replace('hover:', '')
              )}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                    <ShoppingBag size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 leading-tight">{r.customerName}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none flex items-center gap-1 mt-1">
                       <ArrowRight size={10} className="text-brand-red" /> {r.productName}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {(status === 'active' || status === 'picked_up' || status === 'late') && (
                    <button
                      onClick={() => updateStatus(r, 'finished')}
                      className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center shadow-sm"
                    >
                      <CheckCircle2 size={18} />
                    </button>
                  )}
                  <div className="relative">
                    <button 
                      onClick={() => setActiveMenuId(activeMenuId === r.id ? null : r.id)}
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm",
                        activeMenuId === r.id ? "bg-brand-red text-white" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                      )}
                    >
                      <MoreVertical size={18} />
                    </button>
                    {activeMenuId === r.id && (
                      <>
                        <div className="fixed inset-0 z-[60]" onClick={() => setActiveMenuId(null)} />
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-[70] animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                          <p className="px-5 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-2 font-display">WhatsApp</p>
                          <button onClick={() => { sendWhatsAppMessage(r, 'contract'); setActiveMenuId(null); }} className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium">
                            <FileText size={16} className="text-blue-500" /> Enviar Contrato
                          </button>
                          <button onClick={() => { sendWhatsAppMessage(r, 'reminder'); setActiveMenuId(null); }} className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium">
                            <Clock size={16} className="text-orange-500" /> Lembrar Devolução
                          </button>
                          <button onClick={() => { sendWhatsAppMessage(r, 'late'); setActiveMenuId(null); }} className="w-full flex items-center gap-3 px-5 py-3 text-sm text-brand-red hover:bg-gray-50 transition-colors font-medium">
                            <AlertCircle size={16} /> Cobrar Atraso
                          </button>
                          <p className="px-5 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-y border-gray-50 my-2 font-display">Gestão</p>
                          <button onClick={() => { openEditRental(r); setActiveMenuId(null); }} className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium">
                            <FileText size={16} className="text-brand-orange" /> Editar Aluguel
                          </button>
                          <button onClick={() => { updateStatus(r, 'canceled'); setActiveMenuId(null); }} className="w-full flex items-center gap-3 px-5 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium">
                            <Ban size={16} /> Cancelar Aluguel
                          </button>
                          <button onClick={() => { setDeleteModal({ isOpen: true, rentalId: r.id }); setActiveMenuId(null); }} className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-400 hover:bg-gray-50 transition-colors font-medium">
                            <Trash2 size={16} /> Excluir Registro
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50">
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Retirada</p>
                  <p className="text-[10px] font-bold text-gray-900 leading-none">{formatDate(r.pickupDate)}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Devolução</p>
                  <p className="text-[10px] font-bold text-gray-900 leading-none">{formatDate(r.returnDate)}</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                {activeStatusSelectId === r.id ? (
                  <select
                    autoFocus
                    value={r.status}
                    onChange={(e) => {
                      updateStatus(r, e.target.value as RentalStatus);
                      setActiveStatusSelectId(null);
                    }}
                    onBlur={() => setActiveStatusSelectId(null)}
                    className="bg-white border border-gray-200 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest outline-none shadow-sm"
                  >
                    <option value="active">Alugado</option>
                    <option value="picked_up">Retirado</option>
                    <option value="finished">Entregue</option>
                    <option value="late">Atrasado</option>
                    <option value="canceled">Cancelado</option>
                  </select>
                ) : (
                  <button
                    onClick={() => setActiveStatusSelectId(r.id)}
                    className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-transform hover:scale-105",
                      getStatusColor(status, isLate)
                    )}
                  >
                    {getStatusLabel(status, isLate)}
                  </button>
                )}
                <div className="text-right">
                  <p className="text-sm font-black text-gray-900">{formatCurrency(r.productPrice + currentFine)}</p>
                  {currentFine > 0 && (
                    <p className="text-[9px] font-black text-brand-red uppercase tracking-tighter leading-none mt-1">Multa: {formatCurrency(currentFine)}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredRentals.length === 0 && !loading && (
        <div className="bg-white rounded-[2.5rem] p-20 text-center border border-dashed border-gray-200">
           <p className="text-gray-400 font-display">Nenhum aluguel encontrado.</p>
        </div>
      )}


      {/* New Rental Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleSubmit} className="p-6 md:p-12 space-y-6 md:space-y-8 max-h-[90vh] overflow-y-auto">
                <div className="text-center space-y-2">
                  <h3 className="text-3xl font-display text-gray-900 leading-none">
                    {editingRentalId ? 'Editar Aluguel' : 'Novo Aluguel'}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    {editingRentalId ? 'Atualize as informações da locação' : 'Registre uma nova locação'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cliente</label>
                      <button
                        type="button"
                        onClick={() => setIsQuickCustomerModalOpen(true)}
                        className="text-[10px] font-black uppercase text-brand-red hover:underline flex items-center gap-1"
                      >
                        <Plus size={10} /> Novo Cliente
                      </button>
                    </div>
                    <div className="relative">
                      <select
                        required
                        value={formData.customerId}
                        onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-2xl p-4 appearance-none transition-all outline-none"
                      >
                        <option value="">Selecione um cliente...</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <User className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={18} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Vestido</label>
                    <div className="relative">
                      <select
                        required
                        value={formData.productId}
                        onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-2xl p-4 appearance-none transition-all outline-none"
                      >
                        <option value="">Selecione um vestido...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>
                        ))}
                      </select>
                      <ShoppingBag className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={18} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Data e Hora de Retirada</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.pickupDate}
                      onChange={(e) => setFormData({ ...formData, pickupDate: e.target.value })}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-2xl p-4 transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Data e Hora de Devolução</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.returnDate}
                      onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-2xl p-4 transition-all outline-none"
                    />
                  </div>

                  {editingRentalId && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Status do Aluguel</label>
                      <div className="relative">
                        <select
                          required
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as RentalStatus })}
                          className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-2xl p-4 appearance-none transition-all outline-none"
                        >
                          <option value="active">Alugado</option>
                          <option value="picked_up">Retirado</option>
                          <option value="finished">Entregue / Devolvido</option>
                          <option value="late">Atrasado</option>
                          <option value="canceled">Cancelado</option>
                        </select>
                        <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={18} />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 col-span-full">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Observações</label>
                    <textarea
                      rows={2}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-2xl p-4 transition-all outline-none resize-none"
                      placeholder="Algum detalhe importante?"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 text-gray-400 font-black uppercase text-[10px] tracking-widest hover:text-gray-600 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] bg-brand-red text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-red/20 active:scale-95 transition-all"
                  >
                    {editingRentalId ? 'Salvar Alterações' : 'Confirmar Aluguel'}
                  </button>
                </div>
              </form>
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

      {/* Quick Customer Registration Modal */}
      <AnimatePresence>
        {isQuickCustomerModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQuickCustomerModalOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-[calc(100%-2rem)] md:w-full max-w-xl bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-2xl overflow-hidden z-10"
            >
              <form onSubmit={handleQuickCustomerSubmit} className="p-6 md:p-10 space-y-6 md:space-y-8 max-h-[85vh] overflow-y-auto">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-display text-gray-900 leading-none">Cadastrar Novo Cliente</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Cadastro rápido direto da locação</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-full">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Nome Completo</label>
                    <input
                      type="text"
                      required
                      value={quickCustomerFormData.name}
                      onChange={(e) => setQuickCustomerFormData({ ...quickCustomerFormData, name: e.target.value })}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-2xl p-4 transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">WhatsApp / Telefone</label>
                    <input
                      type="text"
                      required
                      placeholder="88 9 9999-9999"
                      value={quickCustomerFormData.phone}
                      onChange={(e) => setQuickCustomerFormData({ ...quickCustomerFormData, phone: e.target.value })}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-2xl p-4 transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">CPF (Opcional)</label>
                    <input
                      type="text"
                      value={quickCustomerFormData.cpf}
                      onChange={(e) => setQuickCustomerFormData({ ...quickCustomerFormData, cpf: e.target.value })}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-2xl p-4 transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-1 col-span-full">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Endereço Completo (Opcional)</label>
                    <input
                      type="text"
                      value={quickCustomerFormData.address}
                      onChange={(e) => setQuickCustomerFormData({ ...quickCustomerFormData, address: e.target.value })}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-2xl p-4 transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-1 col-span-full">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Instagram (Opcional)</label>
                    <input
                      type="text"
                      placeholder="@"
                      value={quickCustomerFormData.instagram}
                      onChange={(e) => setQuickCustomerFormData({ ...quickCustomerFormData, instagram: e.target.value })}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-2xl p-4 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsQuickCustomerModalOpen(false)}
                    className="flex-1 py-4 text-gray-400 font-black uppercase text-[10px] tracking-widest hover:text-gray-600 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] bg-brand-red text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-red/20 active:scale-95 transition-all"
                  >
                    Salvar Cliente
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
