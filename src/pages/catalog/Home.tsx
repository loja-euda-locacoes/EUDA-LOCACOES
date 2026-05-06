import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Product, Settings } from '../../types';
import { ProductGrid } from '../../components/catalog/ProductGrid';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { getDriveDirectLink } from '../../lib/utils';

export function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsubProducts = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) setSettings(snap.data() as Settings);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });

    return () => {
      unsubProducts();
      unsubSettings();
    };
  }, []);

  useEffect(() => {
    if (settings) {
      if (settings.logoUrl) {
        const metaImg = document.querySelector('meta[property="og:image"]');
        if (metaImg) metaImg.setAttribute('content', getDriveDirectLink(settings.logoUrl));
      }
      
      if (settings.storeName) {
        document.title = `${settings.storeName} | Catálogo de Vestidos`;
        const metaTitle = document.querySelector('meta[property="og:title"]');
        if (metaTitle) metaTitle.setAttribute('content', `${settings.storeName} | São João`);
      }
    }
  }, [settings]);

  return (
    <div className="space-y-20 pb-20">
      <Helmet>
        <title>{settings?.storeName ? `${settings.storeName} | Catálogo` : 'Euda Aluguéis | Catálogo de Vestidos Juninos'}</title>
        <meta property="og:title" content={settings?.storeName ? `${settings.storeName} | Catálogo` : 'Euda Aluguéis | Catálogo de Vestidos Juninos'} />
        <meta property="og:image" content={settings?.logoUrl ? getDriveDirectLink(settings.logoUrl) : '/og-image.jpg'} />
        <meta property="og:description" content={settings?.impactPhrase || "Aluguel de vestidos juninos profissionais em Icó-CE. Coleção exclusiva."} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ClothingStore",
            "name": settings?.storeName || "Euda Aluguéis",
            "description": settings?.impactPhrase || "Aluguel de vestidos juninos profissionais em Icó-CE.",
            "url": window.location.origin,
            "telephone": settings?.whatsappNumber,
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Icó",
              "addressRegion": "CE",
              "addressCountry": "BR"
            }
          })}
        </script>
      </Helmet>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 junino-bg opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-bg/0 via-brand-bg/0 to-brand-bg" />
        
        <div className="relative max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center lg:items-end">
          <div className="space-y-6 md:space-y-8 text-center lg:text-left">
            <div className="flex justify-center lg:justify-start gap-1">
              {settings?.logoUrl ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-40 h-40 md:w-56 md:h-56 flex items-center justify-center mb-4"
                >
                  <img 
                    src={getDriveDirectLink(settings.logoUrl)} 
                    alt={settings.storeName} 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
              ) : (
                <>
                  <div className="w-8 h-10 md:w-10 md:h-12 bg-brand-red flag-clip shadow-lg" />
                  <div className="w-8 h-10 md:w-10 md:h-12 bg-brand-yellow flag-clip shadow-lg" />
                  <div className="w-8 h-10 md:w-10 md:h-12 bg-brand-blue flag-clip shadow-lg" />
                  <div className="w-8 h-10 md:w-10 md:h-12 bg-brand-red flag-clip shadow-lg" />
                </>
              )}
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl sm:text-6xl md:text-8xl lg:text-[100px] font-black text-brand-red leading-[0.9] uppercase tracking-tighter"
            >
              {settings?.storeName ? (
                settings.storeName.split(' ').map((word, i) => (
                  <span key={i} className="block">{word}</span>
                ))
              ) : (
                <>
                  <span className="block">Euda</span>
                  <span className="block">Aluguéis</span>
                </>
              )}
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl md:text-2xl lg:text-3xl text-brand-blue font-accent italic font-bold"
            >
              {settings?.impactPhrase || 'A elegância do São João em Icó, Ceará.'}
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="pt-4"
            >
              <a 
                href="#catalogo" 
                className="inline-block bg-brand-red text-white px-8 md:px-10 py-4 md:py-5 rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-brand-red/30 hover:scale-105 active:scale-95 transition-all text-xs md:text-sm"
              >
                Explorar Catálogo
              </a>
            </motion.div>
          </div>

          <div className="hidden lg:block pb-12">
            <p className="text-lg text-gray-500 max-w-xs leading-relaxed font-medium">
              Encante no arraiá com vestidos exclusivos feitos à mão com a alma do Nordeste.
            </p>
          </div>
        </div>
      </section>

      {/* Catalog Grid */}
      <section id="catalogo" className="max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-3xl md:text-4xl text-gray-900">Nossos Vestidos</h2>
          <div className="w-20 h-1 bg-brand-yellow mx-auto rounded-full" />
        </div>

        <ProductGrid products={products} loading={loading} />
      </section>

      {/* Features / Why Us */}
      <section id="about" className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-[3rem] p-8 md:p-16 grid grid-cols-1 md:grid-cols-3 gap-12 border border-brand-orange/5 shadow-sm">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-brand-red/10 rounded-2xl flex items-center justify-center text-brand-red">
              <Sparkles size={24} />
            </div>
            <h3 className="text-xl">Qualidade Premium</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Vestidos impecáveis, higienizados e prontos para brilhar em qualquer quadrilha.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="w-12 h-12 bg-brand-yellow/10 rounded-2xl flex items-center justify-center text-brand-orange">
              <Sparkles size={24} />
            </div>
            <h3 className="text-xl">Tradição Nordestina</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Design inspirado nas raízes de Icó, com a elegância que só o nosso São João tem.
            </p>
          </div>

          <div className="space-y-4">
            <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
              <Sparkles size={24} />
            </div>
            <h3 className="text-xl">Atendimento VIP</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Suporte via WhatsApp para você escolher o tamanho ideal sem sair de casa.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
