import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const sampleProducts = [
  {
    name: 'Noiva do Sertão',
    description: 'Um vestido majestoso com rendas artesanais e bordados em pedraria. Perfeito para noivas de quadrilha que buscam o equilíbrio entre tradição e luxo.',
    price: 350,
    measurements: 'Busto: 90cm, Cintura: 72cm, Quadril: Livre',
    recommendations: 'Ideal para alturas entre 1.60m e 1.75m.',
    images: ['https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&q=80&w=800'],
    category: 'Noiva',
    mostWanted: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    name: 'Explosão de Cores',
    description: 'Vibrante e leve, este vestido traz o espírito das festas de São João com suas cores quentes e saias volumosas.',
    price: 180,
    measurements: 'Busto: 85cm, Cintura: 68cm, Quadril: Livre',
    recommendations: 'Tamanho P/M. Excelente para dançarinas de frente.',
    images: ['https://images.unsplash.com/photo-1517457373958-b7bdd458ad20?auto=format&fit=crop&q=80&w=800'],
    category: 'Adulto',
    mostWanted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    name: 'Estrela do Icó',
    description: 'Homenagem à nossa terra, este modelo traz detalhes em dourado e azul, remetendo ao céu estrelado das noites juninas cearenses.',
    price: 220,
    measurements: 'Busto: 95cm, Cintura: 78cm, Quadril: Livre',
    recommendations: 'Tamanho G. Confortável para apresentações longas.',
    images: ['https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=800'],
    category: 'Destaque',
    mostWanted: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

const sampleSettings = {
  storeName: 'Euda Aluguéis',
  whatsappNumber: '88999999999',
  impactPhrase: 'Encante no São João com o vestido perfeito! Tradição, brilho e elegância no coração do Ceará.',
  fixedFine: 10,
  percentFine: 5,
  toleranceHours: 2,
  defaultPickupTime: '13:00',
  defaultReturnTime: '10:00',
};

export async function seedDatabase() {
  const productsSnap = await getDocs(collection(db, 'products'));
  if (productsSnap.empty) {
    for (const p of sampleProducts) {
      const newRef = doc(collection(db, 'products'));
      await setDoc(newRef, { ...p, id: newRef.id });
    }
  }

  const settingsSnap = await getDocs(collection(db, 'settings'));
  if (settingsSnap.empty) {
    await setDoc(doc(db, 'settings', 'global'), sampleSettings);
  }
}
