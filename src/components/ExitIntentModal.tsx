import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, X, Sparkles, ArrowRight, ShieldCheck, Clock, Percent, Zap } from 'lucide-react';
import { CartItem } from '../types';

interface ExitIntentModalProps {
  cart: CartItem[];
  isSubmitted: boolean;
  onApplyDiscount: (code: string, amount: number) => void;
  onOpenCheckout: () => void;
}

const EXIT_SESSION_KEY = 'sera_exit_intent_dismissed';

export default function ExitIntentModal({
  cart,
  isSubmitted,
  onApplyDiscount,
  onOpenCheckout
}: ExitIntentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check if already shown in this session
    const hasBeenShown = sessionStorage.getItem(EXIT_SESSION_KEY);
    if (hasBeenShown || isSubmitted) return;

    // Desktop exit-intent detection: mouse moving towards top window boundary
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 12 && !sessionStorage.getItem(EXIT_SESSION_KEY) && !isSubmitted) {
        // Only trigger if cart has items or user visited
        if (cart.length > 0) {
          setIsOpen(true);
          sessionStorage.setItem(EXIT_SESSION_KEY, 'true');
        }
      }
    };

    // Mobile fallback timer: after 40 seconds of browsing with items in cart
    const mobileTimer = setTimeout(() => {
      if (!sessionStorage.getItem(EXIT_SESSION_KEY) && !isSubmitted && cart.length > 0) {
        setIsOpen(true);
        sessionStorage.setItem(EXIT_SESSION_KEY, 'true');
      }
    }, 45000);

    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      clearTimeout(mobileTimer);
    };
  }, [cart.length, isSubmitted]);

  const handleClaimOffer = () => {
    onApplyDiscount('SAVE100', 100);
    setIsOpen(false);
    onOpenCheckout();
  };

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem(EXIT_SESSION_KEY, 'true');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 20 }}
          transition={{ type: 'spring', damping: 26, stiffness: 350 }}
          className="relative w-full max-w-lg bg-[#090d16] text-white rounded-3xl border-2 border-amber-400/60 shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden p-6 sm:p-8"
        >
          {/* Top Ambient Glow */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-rose-500 to-emerald-400" />

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>

          {/* Offer Content */}
          <div className="text-center space-y-4 pt-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-400 shadow-inner">
              <Gift size={32} className="animate-bounce" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                অপেক্ষা করুন! স্পেশাল গিফট ভাউচার
              </span>
              <h3 className="text-xl sm:text-2xl font-serif font-black text-white pt-1">
                অর্ডারটি বাতিল না করে এখনই পাচ্ছেন <span className="text-amber-400">৳১০০ ছাড়!</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
                আপনার পছন্দের ড্রেসটি স্টক ফুরিয়ে যাওয়ার আগেই অর্ডার কনফার্ম করুন। ক্যাশ অন ডেলিভারিতে ড্রেস হাতে পেয়ে মূল্য পরিশোধের সুবিধা!
              </p>
            </div>

            {/* Coupon Code Display Box */}
            <div className="bg-slate-900/90 border-2 border-dashed border-amber-400/60 rounded-2xl p-4 flex items-center justify-between gap-3 max-w-sm mx-auto">
              <div className="text-left">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                  স্পেশাল কুপন কোড:
                </span>
                <span className="text-lg font-black text-amber-300 font-mono tracking-widest">
                  SAVE100
                </span>
              </div>

              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold font-mono">
                -৳১০০ OFF
              </span>
            </div>

            {/* Actions */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleClaimOffer}
                className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-2xl shadow-[0_8px_25px_rgba(245,158,11,0.45)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 border border-amber-300/40 uppercase tracking-wide"
              >
                <Zap size={18} className="fill-slate-950 text-slate-950" />
                <span>ছাড় সহ অর্ডার নিশ্চিত করুন</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors py-1 cursor-pointer"
              >
                না, আমি ছাড় ছাড়াই পরে কিনতে চাই
              </button>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 pt-2 border-t border-slate-800">
              <span className="flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-400" /> ক্যাশ অন ডেলিভারি
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-amber-400" /> দ্রুততম ডেলিভারি
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
