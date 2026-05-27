import { useEffect, useState, FormEvent } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, addDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Customer } from '../../types';
import { Plus, Search, User, Phone, Trash2, MessageCircle, ExternalLink, Pencil } from 'lucide-react';
import { cn, generateWhatsAppLink } from '../../lib/utils';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { useNotification } from '../../context/NotificationContext';
import { motion, AnimatePresence } from 'motion/react';

export function Customers() {
  const { notify } = useNotification();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    cpf: '',
    address: '',
    instagram: '',
    secondaryContactName: '',
    secondaryContactPhone: '',
  });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; customerId: string | null }>({
    isOpen: false,
    customerId: null
  });

  useEffect(() => {
    const q = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'customers');
    });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomerId) {
        await updateDoc(doc(db, 'customers', editingCustomerId), {
          ...formData
        });
        notify('Cliente atualizado com sucesso!', 'success');
      } else {
        await addDoc(collection(db, 'customers'), {
          ...formData,
          createdAt: new Date().toISOString()
        });
        notify('Cliente cadastrado com sucesso!', 'success');
      }
      setIsModalOpen(false);
      setEditingCustomerId(null);
      setFormData({
        name: '',
        phone: '',
        cpf: '',
        address: '',
        instagram: '',
        secondaryContactName: '',
        secondaryContactPhone: '',
      });
    } catch (err) {
      if (editingCustomerId) {
        handleFirestoreError(err, OperationType.UPDATE, `customers/${editingCustomerId}`);
        notify('Erro ao atualizar cliente.', 'error');
      } else {
        handleFirestoreError(err, OperationType.CREATE, 'customers');
        notify('Erro ao cadastrar cliente.', 'error');
      }
    }
  };

  const handleEditClick = (customer: Customer) => {
    setEditingCustomerId(customer.id);
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      cpf: customer.cpf || '',
      address: customer.address || '',
      instagram: customer.instagram || '',
      secondaryContactName: customer.secondaryContactName || '',
      secondaryContactPhone: customer.secondaryContactPhone || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteModal.customerId) return;
    try {
      await deleteDoc(doc(db, 'customers', deleteModal.customerId));
      notify('Cliente excluído com sucesso!', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `customers/${deleteModal.customerId}`);
      notify('Erro ao excluir cliente.', 'error');
    } finally {
      setDeleteModal({ isOpen: false, customerId: null });
    }
  };

  const filteredCustomers = customers.filter(c => 
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search) ||
    (c.cpf || '').includes(search)
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm shadow-sm focus:ring-2 focus:ring-brand-red/10 transition-all outline-none"
          />
        </div>
        <button
          onClick={() => {
            setEditingCustomerId(null);
            setFormData({
              name: '',
              phone: '',
              cpf: '',
              address: '',
              instagram: '',
              secondaryContactName: '',
              secondaryContactPhone: '',
            });
            setIsModalOpen(true);
          }}
          className="bg-brand-red text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-red/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          Novo Cliente
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden relative">
        {/* Junina Flags Decor */}
        <div className="absolute top-0 left-0 w-full h-1 flex gap-0.5 opacity-30">
          <div className="flex-1 bg-brand-red h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
          <div className="flex-1 bg-brand-yellow h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
          <div className="flex-1 bg-brand-blue h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
          <div className="flex-1 bg-brand-red h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
          <div className="flex-1 bg-brand-yellow h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 italic font-display text-xs text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4 font-normal">Cliente</th>
                <th className="px-6 py-4 font-normal">Contato</th>
                <th className="px-6 py-4 font-normal">CPF</th>
                <th className="px-6 py-4 font-normal text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredCustomers.map((c) => (
                <tr key={c.id} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-brand-red group-hover:text-white transition-colors">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{c.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{c.address}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-gray-700">{c.phone}</p>
                      {c.instagram && <p className="text-[10px] text-brand-orange font-bold italic">@{c.instagram}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm font-mono text-gray-500">{c.cpf}</span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={generateWhatsAppLink(c.phone, 'Olá!')}
                        target="_blank"
                        rel="noreferrer"
                        className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                      >
                        <MessageCircle size={18} />
                      </a>
                      <button
                        onClick={() => handleEditClick(c)}
                        className="w-10 h-10 bg-orange-50 text-brand-orange rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => setDeleteModal({ isOpen: true, customerId: c.id })}
                        className="w-10 h-10 bg-red-50 text-brand-red rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-gray-400 font-display">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Customer Modal */}
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
              className="relative w-[calc(100%-2rem)] md:w-full max-w-2xl bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleSubmit} className="p-6 md:p-12 space-y-6 md:space-y-8 max-h-[90vh] overflow-y-auto">
                <div className="text-center space-y-2">
                  <h3 className="text-3xl font-display text-gray-900 leading-none">
                    {editingCustomerId ? 'Editar Cliente' : 'Cadastrar Cliente'}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Informações básicas e contato</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 col-span-full">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Nome Completo</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-2xl p-4 transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">WhatsApp</label>
                    <input
                      type="text"
                      required
                      placeholder="88 9 9999-9999"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-2xl p-4 transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">CPF (Opcional)</label>
                    <input
                      type="text"
                      value={formData.cpf}
                      onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-2xl p-4 transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-2 col-span-full">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Endereço Completo (Opcional)</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-2xl p-4 transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Instagram (Opcional)</label>
                    <input
                      type="text"
                      placeholder="@"
                      value={formData.instagram}
                      onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-2xl p-4 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-50 space-y-6">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Contato de Emergência</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Nome</label>
                       <input
                        type="text"
                        value={formData.secondaryContactName}
                        onChange={(e) => setFormData({ ...formData, secondaryContactName: e.target.value })}
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-2xl p-4 transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-2 text-left">
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">WhatsApp</label>
                       <input
                        type="text"
                        value={formData.secondaryContactPhone}
                        onChange={(e) => setFormData({ ...formData, secondaryContactPhone: e.target.value })}
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-2xl p-4 transition-all outline-none"
                      />
                    </div>
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
                    {editingCustomerId ? 'Salvar Alterações' : 'Salvar Cliente'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, customerId: null })}
        onConfirm={handleDelete}
        title="Excluir Cliente"
        message="Tem certeza que deseja excluir este cliente? O histórico de aluguéis continuará existindo, mas os dados do cliente de cadastro serão removidos."
        confirmText="Sim, Excluir"
        type="danger"
      />
    </div>
  );
}
