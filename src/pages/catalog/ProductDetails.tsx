import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Product, Settings } from '../../types';
import { formatCurrency, generateWhatsAppLink, getDriveDirectLink, getDriveVideoDirectLink } from '../../lib/utils';
import { ChevronLeft, ChevronRight, MessageCircle, Share2, Ruler, Info, ShoppingBag, Video, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotification } from '../../context/NotificationContext';
import { ProductAvailabilityModal } from '../../components/catalog/ProductAvailabilityModal';

export function ProductDetails() {
  const { notify } = useNotification();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAvailability, setShowAvailability] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      try {
        // Try fetching by ID first (fallback)
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() } as Product);
        } else {
          // If ID fails, try fetching by Slug
          const q = query(collection(db, 'products'), where('slug', '==', id));
          const querySnap = await getDocs(q);
          
          if (!querySnap.empty) {
            const doc = querySnap.docs[0];
            setProduct({ id: doc.id, ...doc.data() } as Product);
          } else {
            navigate('/');
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `products/${id}`);
        notify('Erro ao carregar detalhes do produto.', 'error');
      } finally {
        setLoading(false);
      }
    };

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) setSettings(snap.data() as Settings);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });

    fetchProduct();
    return () => unsubSettings();
  }, [id, navigate, notify]);

  useEffect(() => {
    if (product) {
      // Intelligent Social Preview Management
      document.title = `${product.name} | Euda Aluguéis`;
      
      const metaTitle = document.querySelector('meta[property="og:title"]');
      if (metaTitle) metaTitle.setAttribute('content', product.name);
      
      const metaImg = document.querySelector('meta[property="og:image"]');
      if (metaImg) {
        const previewUrl = product.mainImage || (product.images.length > 0 ? product.images[0] : '');
        if (previewUrl) {
          metaImg.setAttribute('content', getDriveDirectLink(previewUrl));
        }
      }

      // Cleanup
      return () => {
        document.title = 'Euda Aluguéis | Catálogo de Vestidos Juninos';
        if (metaImg && settings?.logoUrl) {
          metaImg.setAttribute('content', getDriveDirectLink(settings.logoUrl));
        }
      };
    }
  }, [product, settings]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) return null;

  const totalMediaLength = product.images.length + (product.videoUrl ? 1 : 0);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % totalMediaLength);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + totalMediaLength) % totalMediaLength);
  };

  const handleWhatsAppRent = () => {
    if (!settings?.whatsappNumber) return;
    const message = `Olá Euda! Gostaria de reservar o seguinte vestido:\n\n👗 *${product.name}*\n💰 *Valor:* ${formatCurrency(product.price)}\n📍 *ID:* ${product.id}\n🔗 *Link:* ${window.location.href}\n\nPor favor, me informe sobre a disponibilidade.`;
    window.open(generateWhatsAppLink(settings.whatsappNumber, message), '_blank');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `Confira este vestido maravilhoso na Euda Aluguéis!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      notify('Link copiado para a área de transferência!', 'success');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <Helmet>
        <title>{product.name} | Euda Aluguéis</title>
        <meta name="description" content={product.description} />
        <meta property="og:title" content={`${product.name} | Euda Aluguéis`} />
        <meta property="og:description" content={product.description} />
        <meta property="og:image" content={getDriveDirectLink(product.mainImage || product.images[0])} />
        <meta name="twitter:image" content={getDriveDirectLink(product.mainImage || product.images[0])} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={window.location.href} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": product.name,
            "image": product.images.map(img => getDriveDirectLink(img)),
            "description": product.description,
            "brand": {
              "@type": "Brand",
              "name": "Euda Aluguéis"
            },
            "offers": {
              "@type": "Offer",
              "priceCurrency": "BRL",
              "price": product.price,
              "availability": "https://schema.org/InStock"
            }
          })}
        </script>
      </Helmet>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-[3/4] bg-white rounded-3xl overflow-hidden shadow-2xl group">
            <AnimatePresence mode="wait">
              {currentImageIndex < product.images.length ? (
                <motion.img
                  key={currentImageIndex}
                  src={getDriveDirectLink(product.images[currentImageIndex])}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <motion.div
                  key="product-details-video"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="w-full h-full bg-black relative"
                >
                  <video
                    src={getDriveVideoDirectLink(product.videoUrl)}
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {totalMediaLength > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg z-10"
                >
                  <ChevronLeft />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg z-10"
                >
                  <ChevronRight />
                </button>
              </>
            )}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {Array.from({ length: totalMediaLength }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentImageIndex ? 'bg-white w-4' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {product.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setCurrentImageIndex(i)}
                className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                  i === currentImageIndex ? 'border-brand-red scale-105' : 'border-transparent opacity-60'
                }`}
              >
                <img src={getDriveDirectLink(img)} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
              </button>
            ))}

            {product.videoUrl && (
              <button
                onClick={() => setCurrentImageIndex(product.images.length)}
                className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all relative ${
                  currentImageIndex === product.images.length ? 'border-brand-red scale-105' : 'border-transparent opacity-60'
                }`}
              >
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white z-10">
                  <Video size={18} className="animate-pulse" />
                </div>
                <img 
                  src={getDriveDirectLink(product.mainImage || product.images[0])} 
                  className="w-full h-full object-cover" 
                  alt="Video thumbnail"
                  referrerPolicy="no-referrer"
                />
              </button>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-10">
          <div className="space-y-4 text-center lg:text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#AAA]">Coleção {new Date().getFullYear()}</span>
              <button 
                onClick={handleShare}
                className="p-3 bg-white rounded-full text-gray-400 hover:text-brand-red hover:bg-brand-red/5 transition-all border border-[#EEE]"
              >
                <Share2 size={18} />
              </button>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-black text-brand-red leading-[0.9] uppercase tracking-tighter">
              {product.name}
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-brand-blue font-accent italic font-bold">
              {product.category || 'Destaque Junino'}
            </p>
          </div>

          <div className="flex items-center justify-center lg:justify-start gap-4 border-y border-[#EEE] py-8">
            <div className="text-center lg:text-left">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Valor do Aluguel</p>
              <span className="text-4xl md:text-5xl font-black text-[#1A1A1A] tracking-tighter">{formatCurrency(product.price)}</span>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Descrição</h3>
              <p className="text-lg text-gray-600 leading-relaxed font-medium">
                {product.description || 'Este belíssimo vestido faz parte da nossa coleção de exclusividades. Ideal para quem busca brilhar com tradição e autenticidade.'}
              </p>
            </div>

            {product.videoUrl && (
              <div className="space-y-4 pt-4 border-t border-gray-50">
                <div className="flex items-center gap-2 text-[#4285F4]">
                  <Video size={16} />
                  <h3 className="text-xs font-black uppercase tracking-widest">Vídeo do Vestido</h3>
                </div>
                <div className="relative aspect-video rounded-[2rem] overflow-hidden bg-black border border-[#EEE] shadow-xl">
                  <video 
                    src={getDriveVideoDirectLink(product.videoUrl)} 
                    className="w-full h-full object-cover" 
                    autoPlay
                    loop
                    muted
                    playsInline
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 p-8 bg-white rounded-[2rem] border border-[#EEE] relative overflow-hidden group">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Medidas</h4>
                <p className="text-gray-900 font-bold">{product.measurements || 'Busto 90, Cintura 70, Quadril Livre'}</p>
              </div>

              <div className="space-y-3 p-8 bg-white rounded-[2rem] border border-[#EEE] relative overflow-hidden group">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dicas</h4>
                <p className="text-gray-900 font-bold">{product.recommendations || 'Lavagem inclusa na devolução'}</p>
              </div>
            </div>
          </div>

          <div className="pt-6 space-y-3">
            <button 
              onClick={() => setShowAvailability(true)}
              className="w-full bg-brand-orange/10 text-brand-orange py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-brand-orange/20 transition-all flex items-center justify-center gap-3 text-sm"
            >
              <CalendarIcon size={20} />
              Ver Disponibilidade das Datas
            </button>

            <button 
              onClick={handleWhatsAppRent}
              className="w-full bg-[#25D366] text-white py-6 rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-sm"
            >
              <MessageCircle size={20} />
              Reservar peça com a Euda
            </button>
          </div>
        </div>
      </div>

      <ProductAvailabilityModal 
        product={product}
        isOpen={showAvailability}
        onClose={() => setShowAvailability(false)}
      />
    </div>
  );
}
