import { Product } from '../../types';
import { ProductCard } from './ProductCard';

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm animate-pulse border border-gray-100">
      <div className="aspect-[3/4] bg-gray-100" />
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-2 w-16 bg-gray-100 rounded" />
            <div className="h-4 w-24 bg-gray-200 rounded" />
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
}

export function ProductGrid({ products, loading }: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4">
        {[...Array(8)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-20 text-center px-4">
        <h3 className="text-xl font-display text-gray-400">Nenhum vestido encontrado no momento.</h3>
        <p className="text-gray-300 text-sm mt-2">Fique de olho, em breve teremos novidades!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
