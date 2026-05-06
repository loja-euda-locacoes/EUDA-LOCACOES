import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Product } from '../../types';
import { Link } from 'react-router-dom';
import { Edit, Trash2, ExternalLink, Star, Plus } from 'lucide-react';
import { formatCurrency, cn, getDriveDirectLink } from '../../lib/utils';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { useNotification } from '../../context/NotificationContext';

export function Products() {
  const { notify } = useNotification();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; productId: string | null }>({
    isOpen: false,
    productId: null
  });

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });
  }, []);

  const handleDelete = async () => {
    if (!deleteModal.productId) return;
    
    try {
      await deleteDoc(doc(db, 'products', deleteModal.productId));
      notify('Vestido excluído com sucesso!', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${deleteModal.productId}`);
      notify('Erro ao excluir vestido.', 'error');
    } finally {
      setDeleteModal({ isOpen: false, productId: null });
    }
  };

  const toggleMostWanted = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'products', id), { mostWanted: !current });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${id}`);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-400 font-medium">Gerencie seu acervo de vestidos</p>
        </div>
        <Link 
          to="/admin/novo"
          className="bg-brand-red text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-red/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          Novo Vestido
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total de Peças</p>
          <span className="text-3xl font-display text-gray-900">{products.length}</span>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Destaques</p>
          <span className="text-3xl font-display text-brand-yellow font-bold">
            {products.filter(p => p.mostWanted).length}
          </span>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Valor Médio</p>
          <span className="text-3xl font-display text-brand-blue">
            {formatCurrency(products.reduce((acc, p) => acc + (p.price || 0), 0) / (products.length || 1))}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden relative">
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
                <th className="px-6 py-4 font-normal">Vestido</th>
                <th className="px-6 py-4 font-normal">Valor</th>
                <th className="px-6 py-4 font-normal">Destaque</th>
                <th className="px-6 py-4 font-normal text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((p) => (
                <tr key={p.id} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-16 rounded-lg bg-gray-100 overflow-hidden shadow-sm">
                        <img src={getDriveDirectLink(p.images[0])} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{p.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono tracking-tighter">ID: {p.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-accent font-bold text-gray-600">{formatCurrency(p.price)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => toggleMostWanted(p.id, !!p.mostWanted)}
                      className={cn(
                        "w-10 h-10 rounded-xl transition-all shadow-sm border border-transparent flex items-center justify-center",
                        p.mostWanted ? "bg-brand-yellow/10 text-brand-orange border-brand-yellow/20" : "bg-gray-50 text-gray-300"
                      )}
                    >
                      <Star size={16} className={cn(p.mostWanted && "fill-current")} />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <a 
                        href={`/produto/${p.id}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-brand-blue hover:bg-brand-blue/5 rounded-xl transition-all flex items-center justify-center"
                      >
                        <ExternalLink size={18} />
                      </a>
                      <Link 
                        to={`/admin/editar/${p.id}`}
                        className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-brand-orange hover:bg-brand-orange/5 rounded-xl transition-all flex items-center justify-center"
                      >
                        <Edit size={18} />
                      </Link>
                      <button 
                        onClick={() => setDeleteModal({ isOpen: true, productId: p.id })}
                        className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-brand-red hover:bg-brand-red/5 rounded-xl transition-all flex items-center justify-center"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {products.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-gray-400 font-display">
                    Nenhum vestido cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, productId: null })}
        onConfirm={handleDelete}
        title="Excluir Vestido"
        message="Tem certeza que deseja excluir este vestido? Esta ação não pode ser desfeita."
        confirmText="Sim, Excluir"
        type="danger"
      />
    </div>
  );
}
