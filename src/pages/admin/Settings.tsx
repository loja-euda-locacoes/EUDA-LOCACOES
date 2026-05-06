import { useEffect, useState, FormEvent } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Settings as SettingsType } from '../../types';
import { Save, Smartphone, MapPin, Quote, Image as ImageIcon } from 'lucide-react';
import { getDriveDirectLink } from '../../lib/utils';
import { useNotification } from '../../context/NotificationContext';

export function Settings() {
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<SettingsType>({
    storeName: 'Euda Aluguéis',
    whatsappNumber: '',
    address: '',
    impactPhrase: '',
    logoUrl: '',
    fixedFine: 0,
    percentFine: 0,
    toleranceHours: 1,
    defaultPickupTime: '13:00',
    defaultReturnTime: '10:00',
  });

  useEffect(() => {
    return onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setFormData(prev => ({
          ...prev,
          ...data,
          storeName: data.storeName || 'Euda Aluguéis',
          whatsappNumber: data.whatsappNumber || '',
          address: data.address || '',
          impactPhrase: data.impactPhrase || '',
          logoUrl: data.logoUrl || '',
          bannerUrl: data.bannerUrl || '',
          fixedFine: data.fixedFine || 0,
          percentFine: data.percentFine || 0,
          toleranceHours: data.toleranceHours || 1,
          defaultPickupTime: data.defaultPickupTime || '13:00',
          defaultReturnTime: data.defaultReturnTime || '10:00',
        }));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), formData);
      notify('Configurações salvas com sucesso!', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/global');
      notify('Ocorreu um erro ao salvar as configurações.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-8 relative overflow-hidden">
        {/* Junina Flags Decor */}
        <div className="absolute top-0 left-0 w-full h-1.5 flex gap-1 lg:gap-1.5 opacity-40">
          <div className="flex-1 bg-brand-red h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
          <div className="flex-1 bg-brand-yellow h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
          <div className="flex-1 bg-brand-blue h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
          <div className="flex-1 bg-brand-red h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
          <div className="flex-1 bg-brand-yellow h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
          <div className="flex-1 bg-brand-blue h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
          <div className="flex-1 bg-brand-red h-full" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)' }} />
        </div>
        <div className="space-y-6">
          <div className="space-y-2 text-center pb-6 border-b border-gray-50">
            <h3 className="text-xl font-display text-gray-900 leading-none">Dados da Loja</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Informações de contato e exibição</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 flex items-center gap-2">
              <MapPin size={12} className="text-brand-red" /> Nome da Loja
            </label>
            <input
              type="text"
              required
              value={formData.storeName}
              onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
              className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-2xl p-4 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 flex items-center gap-2">
              <Smartphone size={12} className="text-green-500" /> WhatsApp (DDD + Número)
            </label>
            <input
              type="text"
              required
              placeholder="Ex: 88999999999"
              value={formData.whatsappNumber}
              onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
              className="w-full bg-gray-50 border-2 border-transparent focus:border-green-500/20 focus:bg-white rounded-2xl p-4 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 flex items-center gap-2">
              <MapPin size={12} className="text-brand-blue" /> Endereço Completo
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Rua Central, 123 - Icó, CE"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-blue/20 focus:bg-white rounded-2xl p-4 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 flex items-center gap-2">
              <Quote size={12} className="text-brand-orange" /> Frase de Impacto
            </label>
            <textarea
              rows={3}
              value={formData.impactPhrase}
              onChange={(e) => setFormData({ ...formData, impactPhrase: e.target.value })}
              className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-orange/30 focus:bg-white rounded-2xl p-4 transition-all"
              placeholder="Ex: Encante no São João com o vestido perfeito!"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 flex items-center gap-2">
              <ImageIcon size={12} className="text-blue-500" /> Link da Logo (Preview Redes Sociais)
            </label>
            <input
              type="text"
              value={formData.logoUrl || ''}
              onChange={(e) => {
                const url = e.target.value;
                setFormData({ ...formData, logoUrl: getDriveDirectLink(url) });
              }}
              className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white rounded-2xl p-4 transition-all"
              placeholder="Cole o link da imagem da logo"
            />
            <p className="text-[9px] text-gray-400 italic px-2">Esta logo será usada como miniatura ao compartilhar o link principal da loja.</p>
          </div>

          <div className="space-y-6 pt-6 border-t border-gray-50">
            <div className="space-y-2 text-center pb-6">
              <h3 className="text-xl font-display text-gray-900 leading-none">Regras de Aluguel</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Configurações para multas e horários</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Multa Fixa por Dia (R$)</label>
                <input
                  type="number"
                  value={formData.fixedFine}
                  onChange={(e) => setFormData({ ...formData, fixedFine: Number(e.target.value) })}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-2xl p-4 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Multa % por Dia</label>
                <input
                  type="number"
                  value={formData.percentFine}
                  onChange={(e) => setFormData({ ...formData, percentFine: Number(e.target.value) })}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-2xl p-4 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Tolerância para Atraso (Horas)</label>
              <input
                type="number"
                value={formData.toleranceHours}
                onChange={(e) => setFormData({ ...formData, toleranceHours: Number(e.target.value) })}
                className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-2xl p-4 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">H. Padrão Retirada</label>
                <input
                  type="time"
                  value={formData.defaultPickupTime}
                  onChange={(e) => setFormData({ ...formData, defaultPickupTime: e.target.value })}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-2xl p-4 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">H. Padrão Devolução</label>
                <input
                  type="time"
                  value={formData.defaultReturnTime}
                  onChange={(e) => setFormData({ ...formData, defaultReturnTime: e.target.value })}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-red/20 focus:bg-white rounded-2xl p-4 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 text-white py-5 rounded-2xl font-bold shadow-xl shadow-gray-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Save size={20} />
              Salvar Alterações
            </>
          )}
        </button>
      </form>
    </div>
  );
}
