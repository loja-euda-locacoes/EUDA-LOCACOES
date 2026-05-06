import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Trash2, UserPlus, Shield } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';

interface AdminUser {
  id: string;
  email: string;
}

export function Admins() {
  const { notify } = useNotification();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [removeModal, setRemoveModal] = useState<{ isOpen: boolean; adminId: string | null }>({
    isOpen: false,
    adminId: null
  });

  useEffect(() => {
    const q = query(collection(db, 'admins'));
    return onSnapshot(q, (snap) => {
      setAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminUser)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'admins');
    });
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.toLowerCase().trim();
    if (!email) return;

    setLoading(true);
    try {
      await setDoc(doc(db, 'admins', email), {
        email,
        createdAt: new Date().toISOString()
      });
      setNewEmail('');
      notify('Acesso liberado com sucesso!', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'admins');
      notify('Erro ao liberar acesso.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAdmin = async () => {
    if (!removeModal.adminId) return;
    try {
      await deleteDoc(doc(db, 'admins', removeModal.adminId));
      notify('Acesso removido com sucesso!', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `admins/${removeModal.adminId}`);
      notify('Erro ao remover acesso.', 'error');
    } finally {
      setRemoveModal({ isOpen: false, adminId: null });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6 text-center relative overflow-hidden">
         {/* Junina Flags Decor */}
        <div className="absolute top-0 left-0 w-full h-1.5 flex gap-1 opacity-40">
          <div className="flex-1 bg-brand-red h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
          <div className="flex-1 bg-brand-yellow h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
          <div className="flex-1 bg-brand-blue h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
          <div className="flex-1 bg-brand-red h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
          <div className="flex-1 bg-brand-yellow h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
        </div>
        <div className="w-16 h-16 bg-brand-bg rounded-full flex items-center justify-center mx-auto text-brand-red">
          <UserPlus size={32} />
        </div>
        <div>
          <h2 className="text-xl font-black text-[#1A1A1A] uppercase tracking-tight">Liberar Acesso</h2>
          <p className="text-sm text-gray-400">Cadastre o e-mail de quem poderá gerenciar a loja.</p>
        </div>
        
        <form onSubmit={handleAddAdmin} className="space-y-4">
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">E-mail do Usuário</label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-orange/30 focus:bg-white rounded-2xl p-4 transition-all text-center"
              placeholder="exemplo@gmail.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !newEmail}
            className="w-full bg-brand-red text-white p-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-brand-red/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {loading ? 'Processando...' : 'Liberar Acesso'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Usuários com Acesso</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {admins.map((admin) => (
            <div key={admin.id} className="group p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-brand-red/10 group-hover:text-brand-red transition-colors">
                  <Shield size={18} />
                </div>
                <span className="font-bold text-gray-900">{admin.email}</span>
              </div>
              <button
                onClick={() => setRemoveModal({ isOpen: true, adminId: admin.id })}
                className="p-3 text-gray-300 hover:text-brand-red hover:bg-brand-red/5 rounded-xl transition-all"
                title="Remover acesso"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {admins.length === 0 && (
            <div className="p-12 text-center text-gray-400 italic text-sm">
              Lista vazia. Apenas o e-mail master possui acesso.
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={removeModal.isOpen}
        onClose={() => setRemoveModal({ isOpen: false, adminId: null })}
        onConfirm={handleRemoveAdmin}
        title="Remover Acesso"
        message="Tem certeza que deseja remover as permissões administrativas para este e-mail? O usuário não poderá mais acessar o painel."
        confirmText="Sim, Remover"
        type="danger"
      />
    </div>
  );
}
