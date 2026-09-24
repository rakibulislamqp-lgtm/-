import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RotateCcw, Crown, User, ShieldCheck, Sparkles, 
  MoreVertical, Layers, ChevronRight, Check, X, Box, Tag
} from 'lucide-react';
import { CustomerUser, ProductCategoryItem } from '../types';
import { fetchAllCategories, getStoredCategories } from '../services/categoryService';
import brandLogo from '../assets/images/sfh_logo_1779435027377.png';

interface TopLuxuryBarProps {
  customerUser: CustomerUser | null;
  logoUrl?: string;
  activeCategory?: string;
  onSelectCategory?: (categoryId: string) => void;
  onOpenReturnPolicy: () => void;
  onOpenLoyalty: () => void;
  onOpenCustomerPortal: () => void;
}

export default function TopLuxuryBar({
  customerUser,
  logoUrl = brandLogo,
  activeCategory = 'ALL',
  onSelectCategory,
  onOpenReturnPolicy,
  onOpenLoyalty,
  onOpenCustomerPortal,
}: TopLuxuryBarProps) {
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [categories, setCategories] = useState<ProductCategoryItem[]>(() => getStoredCategories());
  const menuRef = useRef<HTMLDivElement>(null);

  // Load latest categories and listen to real-time updates
  useEffect(() => {
    fetchAllCategories().then(cats => setCategories(cats)).catch(() => {});

    const handleUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setCategories(e.detail);
      } else {
        fetchAllCategories().then(cats => setCategories(cats)).catch(() => {});
      }
    };

    window.addEventListener('categories_updated', handleUpdate);
    window.addEventListener('brand_settings_updated', handleUpdate);

    return () => {
      window.removeEventListener('categories_updated', handleUpdate);
      window.removeEventListener('brand_settings_updated', handleUpdate);
    };
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsCategoryMenuOpen(false);
      }
    };

    if (isCategoryMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryMenuOpen]);

  const handleCategoryClick = (catId: string) => {
    setIsCategoryMenuOpen(false);
    if (onSelectCategory) {
      onSelectCategory(catId);
    }
    // Smooth scroll down to product showcase section
    setTimeout(() => {
      const el = document.getElementById('products-showcase-section') || document.getElementById('products-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  return (
    <div className="relative z-40 w-full bg-slate-950/95 backdrop-blur-md text-white border-b border-white/10 select-none">
      {/* Top micro gold accent glow line */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-3">
        
        {/* Left: 3-Dots Category Trigger + Brand Logo & Identity */}
        <div className="flex items-center gap-2" ref={menuRef}>
          
          {/* 1. THREE-DOTS CATEGORY MENU BUTTON */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={() => setIsCategoryMenuOpen(prev => !prev)}
              aria-expanded={isCategoryMenuOpen}
              aria-label="ক্যাটাগরি মেনু"
              className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border shadow-md backdrop-blur-sm transition-all duration-200 cursor-pointer ${
                isCategoryMenuOpen
                  ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-400/40 shadow-amber-500/20'
                  : 'bg-white/[0.08] hover:bg-amber-500/20 text-gray-200 hover:text-amber-300 border-white/15 hover:border-amber-400/50'
              }`}
              title="প্রোডাক্ট ক্যাটাগরি তালিকা দেখুন"
            >
              <MoreVertical size={18} className="transition-transform duration-200" />
              {/* Micro Category Tag Indicator */}
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[8px] font-black border border-slate-950 shadow-xs">
                <Tag size={8} />
              </span>
            </motion.button>

            {/* THREE-DOT CATEGORY DROPDOWN MENU */}
            <AnimatePresence>
              {isCategoryMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="absolute left-0 top-full mt-2.5 w-72 sm:w-80 bg-slate-900/98 backdrop-blur-2xl border border-amber-400/30 rounded-2xl shadow-2xl shadow-black/90 p-2.5 z-50 text-white overflow-hidden ring-1 ring-white/10"
                >
                  {/* Top Ambient Glow & Title */}
                  <div className="px-3 py-2.5 mb-1.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02] rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                        <Layers size={13} />
                      </div>
                      <div>
                        <span className="text-xs font-black text-white tracking-wide block">
                          প্রোডাক্ট ক্যাটাগরি
                        </span>
                        <span className="text-[9.5px] text-amber-400/80 font-medium">
                          পছন্দের কালেকশন বেছে নিন
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCategoryMenuOpen(false)}
                      className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Categories List */}
                  <div className="max-h-72 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {categories.map((cat) => {
                      const isActive = activeCategory === cat.id;
                      const isAll = cat.id === 'ALL';

                      return (
                        <motion.button
                          key={cat.id}
                          whileHover={{ x: 3 }}
                          whileTap={{ scale: 0.98 }}
                          type="button"
                          onClick={() => handleCategoryClick(cat.id)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                            isActive
                              ? 'bg-gradient-to-r from-amber-500/25 to-amber-600/20 text-amber-300 border border-amber-400/50 shadow-inner font-black'
                              : 'text-gray-200 hover:text-white hover:bg-white/[0.07] border border-transparent font-bold'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                              isActive
                                ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                                : 'bg-slate-800 text-gray-300 border border-white/10'
                            }`}>
                              {isAll ? <Sparkles size={13} /> : <Box size={13} />}
                            </div>
                            <span className="text-xs truncate tracking-wide">
                              {cat.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {isActive ? (
                              <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-xs">
                                <Check size={12} strokeWidth={3} />
                              </span>
                            ) : (
                              <ChevronRight size={14} className="text-gray-500 group-hover:text-white" />
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Bottom Footer Info */}
                  <div className="mt-2 pt-2 border-t border-white/10 px-2 flex items-center justify-between text-[10px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <Sparkles size={10} className="text-amber-400" />
                      <span>{categories.length} টি সক্রিয় ক্যাটাগরি</span>
                    </span>
                    <span className="text-amber-300/80 font-bold">ক্লিক করলেই ফিল্টার হবে</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 2. BRAND LOGO & NAME */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 text-left group cursor-pointer focus:outline-none"
            title="SERA FASHION - হোমপেজ"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/90 border border-brand-gold/70 p-0.5 overflow-hidden shadow-md shrink-0 ring-2 ring-amber-500/20 group-hover:border-amber-300 group-hover:scale-105 transition-all">
              <img 
                src={logoUrl} 
                alt="SERA FASHION" 
                className="w-full h-full rounded-full object-cover" 
                referrerPolicy="no-referrer" 
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-black tracking-wider uppercase text-brand-gold font-serif leading-tight group-hover:text-amber-300 transition-colors">
                SERA FASHION
              </span>
              <span className="text-[9px] text-gray-400 font-medium tracking-wider hidden xs:inline leading-none">
                Luxury Fashion
              </span>
            </div>
          </button>

        </div>

        {/* Right Side: ONLY Icons with Modern Luxury Interactive Styling */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          
          {/* 1. Return Policy Icon (রিটার্ন পলিসি) */}
          <div className="relative group">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={onOpenReturnPolicy}
              aria-label="রিটার্ন পলিসি"
              className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-rose-500/20 text-rose-300 hover:text-white border border-white/15 hover:border-rose-400/60 shadow-md backdrop-blur-sm transition-all duration-200 cursor-pointer"
            >
              <RotateCcw size={16} className="group-hover:-rotate-45 transition-transform duration-300" />
              {/* Micro badge: 7 Days */}
              <span className="absolute -top-1 -right-1 px-1 py-0.2 bg-rose-600 text-white text-[8px] font-black rounded-full border border-slate-950 leading-none shadow-xs">
                7D
              </span>
            </motion.button>
            {/* Sleek Floating Tooltip */}
            <div className="absolute top-full right-0 mt-2 px-2.5 py-1 bg-slate-900/95 backdrop-blur-md text-rose-200 text-[10.5px] font-bold rounded-xl border border-rose-500/30 shadow-2xl shadow-black/80 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 transform translate-y-1 group-hover:translate-y-0">
              <span>রিটার্ন পলিসি (৭ দিন সহজ এক্সচেঞ্জ)</span>
              <div className="absolute -top-1 right-3 w-2 h-2 bg-slate-900 rotate-45 border-l border-t border-rose-500/30" />
            </div>
          </div>

          {/* 2. VIP Loyalty & Rewards Icon (ভিআইপি পয়েন্ট ও রিওয়ার্ড) */}
          <div className="relative group">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={onOpenLoyalty}
              aria-label="VIP পয়েন্ট ও রিওয়ার্ড"
              className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 hover:text-amber-200 border border-amber-400/40 hover:border-amber-300 ring-2 ring-amber-400/20 shadow-md backdrop-blur-sm transition-all duration-200 cursor-pointer"
            >
              <Crown size={16} className="animate-pulse" />
              {/* Micro VIP badge */}
              <span className="absolute -top-1 -right-1 px-1 py-0.2 bg-gradient-to-r from-amber-400 to-amber-500 text-black text-[7.5px] font-black rounded-full border border-slate-950 leading-none shadow-xs">
                VIP
              </span>
            </motion.button>
            {/* Sleek Floating Tooltip */}
            <div className="absolute top-full right-0 mt-2 px-2.5 py-1 bg-slate-900/95 backdrop-blur-md text-amber-300 text-[10.5px] font-bold rounded-xl border border-amber-500/30 shadow-2xl shadow-black/80 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 transform translate-y-1 group-hover:translate-y-0">
              <span className="flex items-center gap-1">
                <Sparkles size={11} className="text-amber-400" />
                <span>VIP পয়েন্ট ও রিওয়ার্ড</span>
              </span>
              <div className="absolute -top-1 right-3 w-2 h-2 bg-slate-900 rotate-45 border-l border-t border-amber-500/30" />
            </div>
          </div>

          {/* 3. Customer Login / Account Icon (কাস্টমার লগইন / রেজিস্ট্রেশন) */}
          <div className="relative group">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={onOpenCustomerPortal}
              aria-label={customerUser ? `${customerUser.name} প্রোফাইল` : 'কাস্টমার লগইন'}
              className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shadow-md backdrop-blur-sm transition-all duration-200 cursor-pointer ${
                customerUser
                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-emerald-100 border border-emerald-400/60 ring-2 ring-emerald-500/20'
                  : 'bg-white/[0.06] hover:bg-white/[0.15] text-gray-200 hover:text-white border border-white/20 hover:border-amber-400/50'
              }`}
            >
              <User size={16} />
              
              {/* Active dot if logged in, else subtle prompt dot */}
              {customerUser ? (
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-slate-950" />
                </span>
              ) : null}
            </motion.button>
            {/* Sleek Floating Tooltip */}
            <div className="absolute top-full right-0 mt-2 px-2.5 py-1 bg-slate-900/95 backdrop-blur-md text-gray-200 text-[10.5px] font-bold rounded-xl border border-white/20 shadow-2xl shadow-black/80 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 transform translate-y-1 group-hover:translate-y-0">
              {customerUser ? (
                <span className="text-emerald-300 font-bold flex items-center gap-1">
                  <ShieldCheck size={12} className="text-emerald-400" />
                  <span>{customerUser.name} (আমার অর্ডার ও প্রোফাইল)</span>
                </span>
              ) : (
                <span>কাস্টমার লগইন / রেজিস্ট্রেশন</span>
              )}
              <div className="absolute -top-1 right-3 w-2 h-2 bg-slate-900 rotate-45 border-l border-t border-white/20" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
