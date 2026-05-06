import { Link } from 'react-router-dom';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex gap-0.5">
            <div className="w-4 h-6 bg-brand-red flag-clip" />
            <div className="w-4 h-6 bg-brand-yellow flag-clip" />
            <div className="w-4 h-6 bg-brand-blue flag-clip" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#1A1A1A] leading-none uppercase tracking-tighter">
              Euda Aluguéis
            </h1>
            <span className="text-[10px] font-bold text-brand-orange uppercase tracking-[0.3em]">Icó - Ceará</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-xs font-black uppercase tracking-widest text-[#1A1A1A] hover:text-brand-red transition-colors border-b-2 border-brand-red pb-1">Catálogo 2024</Link>
          <Link to="/#news" className="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-brand-red transition-colors pb-1">Novidades</Link>
          <Link to="/#about" className="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-brand-red transition-colors pb-1">A Loja</Link>
        </div>

        {/* Admin access hidden - access via /admin URL */}
      </div>
    </nav>
  );
}
