import { Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Settings } from '../../types';

export function Footer() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    return onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as Settings);
      }
    });
  }, []);

  return (
    <footer className="bg-white border-t border-[#EEE] py-16 px-6 lg:px-[60px] flex flex-col md:flex-row items-center justify-between gap-12 mt-20">
      <div className="space-y-4">
        <div className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
          &copy; {new Date().getFullYear()} {settings?.storeName || 'Euda Aluguéis'} {settings?.address ? `• ${settings.address}` : '• Icó - CE'}
        </div>
        <div className="flex items-center gap-1 text-gray-300 text-[10px] uppercase font-bold tracking-widest">
          Feito com <Heart className="w-2 h-2 text-brand-red fill-current" /> no Ceará
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 lg:gap-16">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-bg flex items-center justify-center text-brand-red">
             <Heart size={14} className="fill-current" />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#1A1A1A]">Localização</h4>
            <p className="text-sm font-medium text-gray-500">{settings?.address || 'Icó, Ceará - Nordeste'}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-bg flex items-center justify-center text-brand-blue">
             <Heart size={14} className="fill-current" />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#1A1A1A]">Atendimento</h4>
            <p className="text-sm font-medium text-gray-500">{settings?.whatsappNumber || '(88) 99999-0000'}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
