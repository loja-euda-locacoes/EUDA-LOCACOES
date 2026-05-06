import { MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { generateWhatsAppLink } from '../../lib/utils';
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Settings } from '../../types';

export function WhatsAppFloat() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    return onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) setSettings(snap.data() as Settings);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });
  }, []);

  if (!settings?.whatsappNumber) return null;

  const waLink = generateWhatsAppLink(
    settings.whatsappNumber,
    "Olá! Gostaria de tirar algumas dúvidas sobre os vestidos."
  );

  return (
    <motion.a
      href={waLink}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed bottom-6 right-6 z-[60] bg-[#25D366] text-white p-4 rounded-full shadow-2xl flex items-center justify-center group"
    >
      <MessageCircle size={32} />
      <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 font-bold whitespace-nowrap">
        Fale conosco
      </span>
    </motion.a>
  );
}
