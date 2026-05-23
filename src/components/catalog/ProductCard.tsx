import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../../types';
import { formatCurrency, getDriveDirectLink, getDriveVideoDirectLink } from '../../lib/utils';
import { ArrowRight, Star, Calendar as CalendarIcon } from 'lucide-react';
import { ProductAvailabilityModal } from './ProductAvailabilityModal';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [showAvailability, setShowAvailability] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -10 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative bg-white rounded-[2rem] overflow-hidden shadow-[0_10px_30px_rgba(217,43,4,0.05)] border border-[#E5E5E5] transition-all duration-300 flex flex-col h-full"
    >
      <Link to={`/produto/${product.slug || product.id}`} className="block relative flex-1">
        <div className="relative aspect-[4/5] overflow-hidden bg-[#F7F7F7]">
          <img
            src={getDriveDirectLink(product.mainImage || product.images[0]) || 'https://via.placeholder.com/400x600?text=Vestido'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />

          <AnimatePresence>
            {product.videoUrl && isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 z-10 bg-black pointer-events-none"
              >
                <video
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                  referrerPolicy="no-referrer"
                >
                  <source src={getDriveVideoDirectLink(product.videoUrl)} type="video/mp4" />
                </video>
              </motion.div>
            )}
          </AnimatePresence>
          
          {product.mostWanted && (
            <div className="absolute top-4 right-4 bg-brand-yellow text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg z-20">
              <Star size={10} className="fill-current" />
              Destaque
            </div>
          )}
        </div>
      </Link>

      <div className="p-6 space-y-4 flex flex-col">
        <Link to={`/produto/${product.slug || product.id}`} className="block">
          <div>
            <h3 className="text-xl font-black text-[#1A1A1A] leading-tight mb-1">{product.name}</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {product.category || 'Coleção 2024'}
            </p>
          </div>
        </Link>

        <button 
          onClick={(e) => {
            e.preventDefault();
            setShowAvailability(true);
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-50 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-red/5 hover:text-brand-red transition-all border border-transparent hover:border-brand-red/10"
        >
          <CalendarIcon size={14} />
          Ver Disponibilidade
        </button>

        <div className="pt-4 border-t border-gray-50 flex items-center justify-between mt-auto">
          <span className="text-brand-red font-black text-2xl tracking-tight">
            {formatCurrency(product.price)}
          </span>
          <Link to={`/produto/${product.slug || product.id}`} className="bg-[#25D366] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2">
            Alugar
          </Link>
        </div>
      </div>

      <ProductAvailabilityModal 
        product={product}
        isOpen={showAvailability}
        onClose={() => setShowAvailability(false)}
      />
    </motion.div>
  );
}
