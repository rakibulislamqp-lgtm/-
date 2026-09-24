import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, ArrowRight, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { CartItem } from '../types';

interface StickyMobileBuyBarProps {
  cart: CartItem[];
  checkoutMode: boolean;
  onOpenCheckout: () => void;
  onScrollToCatalog?: () => void;
}

export default function StickyMobileBuyBar({
  cart,
  checkoutMode,
  onOpenCheckout,
}: StickyMobileBuyBarProps) {
  // Only show sticky buy bar when user has selected at least 1 item and is not already on checkout page
  if (checkoutMode || !cart || cart.length === 0) {
    return null;
  }

  const totalQuantity = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#090d16]/95 backdrop-blur-xl border-t border-amber-500/40 shadow-[0_-10px_35px_rgba(0,0,0,0.6)] px-3 sm:px-4 py-2.5 sm:py-3 block"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2.5 sm:gap-4">
          {/* Left: Stacked Thumbnails + Pricing details */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Stacked Thumbnails */}
            <div className="relative flex -space-x-2 shrink-0">
              {cart.slice(0, 2).map((item, idx) => (
                <img
                  key={item.id || idx}
                  src={item.productImage}
                  alt={item.productTitle}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover border-2 border-amber-400/90 shadow-md"
                />
              ))}
              {cart.length > 2 && (
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-800 border-2 border-amber-400 text-amber-300 font-bold text-[10px] flex items-center justify-center">
                  +{cart.length - 2}
                </div>
              )}
            </div>

            {/* Price & Badge */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[9.5px] sm:text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                  {totalQuantity}টি ড্রেস সিলেক্টেড
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-sm sm:text-base font-black text-amber-300 font-mono">
                  ৳{totalPrice.toLocaleString('en-US')}
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium truncate">
                  (ক্যাশ অন ডেলিভারি)
                </span>
              </div>
            </div>
          </div>

          {/* Right: High-Converting Quick Checkout CTA */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={onOpenCheckout}
              className="group relative inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm shadow-[0_4px_20px_rgba(245,158,11,0.4)] active:scale-95 transition-all duration-200 cursor-pointer overflow-hidden border border-amber-300/40"
            >
              <Zap size={14} className="text-slate-950 fill-slate-950 shrink-0" />
              <span className="tracking-wide uppercase whitespace-nowrap">অর্ডার কনফার্ম করুন</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform stroke-[2.5] shrink-0" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
