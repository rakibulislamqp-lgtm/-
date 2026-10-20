import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, Sparkles, Clock, Truck, RotateCcw, ShieldCheck, 
  CheckCircle2, ChevronDown, ChevronUp, Star, Phone, MessageCircle, 
  ArrowRight, Tag, Flame, Zap, Award, HelpCircle, ExternalLink, 
  Store, Check, AlertCircle, Eye, X, Plus, Minus
} from 'lucide-react';
import { Product, BrandSettings, LandingPageSectionId } from '../types';
import { getAllProducts } from '../services/productService';
import { DEFAULT_LANDING_PAGE_CONFIG } from '../services/landingPageDefaults';
import defaultLogo from '../assets/images/sfh_logo_1779435027377.png';

interface OfferLandingPageProps {
  onBuyNow: (product: Product, quantity: number, size: string) => void;
  onAddToCart?: (product: Product, quantity: number, size: string) => void;
  onGoToStore: () => void;
  brandSettings?: BrandSettings | null;
  logoUrl?: string;
  facebookUrl?: string;
}

export default function OfferLandingPage({
  onBuyNow,
  onAddToCart,
  onGoToStore,
  brandSettings,
  logoUrl = defaultLogo,
  facebookUrl = 'https://www.facebook.com/share/1aiFNcrxJm/'
}: OfferLandingPageProps) {
  // Merge live configuration with rich defaults
  const config = {
    ...DEFAULT_LANDING_PAGE_CONFIG,
    ...(brandSettings?.landingPage || {}),
    trustItems: brandSettings?.landingPage?.trustItems?.length 
      ? brandSettings.landingPage.trustItems 
      : DEFAULT_LANDING_PAGE_CONFIG.trustItems,
    faqItems: brandSettings?.landingPage?.faqItems?.length 
      ? brandSettings.landingPage.faqItems 
      : DEFAULT_LANDING_PAGE_CONFIG.faqItems,
    sectionOrder: brandSettings?.landingPage?.sectionOrder?.length 
      ? brandSettings.landingPage.sectionOrder 
      : DEFAULT_LANDING_PAGE_CONFIG.sectionOrder,
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'THREE PIECE' | 'SAREE'>(
    config.defaultCategory || 'ALL'
  );
  
  // Per-product state: selected size & quantity
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  // FAQ Accordion active index
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  // Live Countdown Timer state
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: config.countdownHours || 14,
    minutes: 32,
    seconds: 45
  });

  useEffect(() => {
    if (!config.showCountdown) return;

    if (config.countdownType === 'fixed_date' && config.countdownTargetDate) {
      const targetTime = new Date(config.countdownTargetDate).getTime();
      const updateFixedTimer = () => {
        const now = Date.now();
        const diff = Math.max(0, targetTime - now);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      };

      updateFixedTimer();
      const timer = setInterval(updateFixedTimer, 1000);
      return () => clearInterval(timer);
    } else {
      // Cycle mode
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev.seconds > 0) {
            return { ...prev, seconds: prev.seconds - 1 };
          } else if (prev.minutes > 0) {
            return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
          } else if (prev.hours > 0) {
            return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
          } else {
            return { hours: (config.countdownHours || 14) - 1, minutes: 59, seconds: 59 };
          }
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [config.showCountdown, config.countdownType, config.countdownTargetDate, config.countdownHours]);

  // Fetch real products from database
  useEffect(() => {
    let isMounted = true;
    getAllProducts(true).then((data) => {
      if (isMounted) {
        setProducts(data || []);
        setLoading(false);
      }
    }).catch((err) => {
      console.warn("Failed to fetch products for landing page:", err);
      if (isMounted) setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSizeSelect = (productId: string, size: string) => {
    setSelectedSizes(prev => ({ ...prev, [productId]: size }));
  };

  const handleQuantityChange = (productId: string, delta: number) => {
    setSelectedQuantities(prev => {
      const current = prev[productId] || 1;
      const next = Math.max(1, Math.min(10, current + delta));
      return { ...prev, [productId]: next };
    });
  };

  const handleProductBuy = (product: Product) => {
    const pId = product.id || product.productCode;
    const size = selectedSizes[pId] || (product.category === 'SAREE' ? 'Free Size' : '38');
    const quantity = selectedQuantities[pId] || 1;
    onBuyNow(product, quantity, size);
  };

  const filteredProducts = products.filter(p => {
    if (config.productSelectionMode === 'selected_only' && config.selectedProductCodes?.length) {
      if (!config.selectedProductCodes.includes(p.productCode)) return false;
    }
    if (selectedCategory === 'ALL') return true;
    return p.category === selectedCategory;
  });

  const whatsappNumber = brandSettings?.footer?.whatsappNumber || '01911223344';
  const supportPhone = brandSettings?.footer?.phone || '01700000000';

  // If landing page is disabled by Admin
  if (config.enabled === false) {
    return (
      <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
          <Sparkles size={28} />
        </div>
        <h2 className="text-2xl font-serif font-black text-white mb-2">স্পেশাল ক্যাম্পেইন বর্তমানে সমাপ্ত হয়েছে</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          আমাদের সেরা কালেকশন, নতুন আগমনী থ্রি-পিস ও জামদানি শাড়ি দেখতে মূল ওয়েবসাইটে ভিজিট করুন।
        </p>
        <button
          type="button"
          onClick={onGoToStore}
          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer shadow-lg"
        >
          মূল স্টোর ভিজিট করুন →
        </button>
      </div>
    );
  }

  // Section Renderers
  const renderAnnouncement = () => {
    if (!config.showAnnouncementBar) return null;
    return (
      <div key="sec-announcement" className="bg-gradient-to-r from-amber-600 via-rose-600 to-amber-600 text-white py-2 px-3 sm:px-4 text-xs font-bold text-center flex flex-wrap items-center justify-center gap-2 shadow-md">
        <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
          <Flame size={14} className="animate-pulse text-amber-200" />
          <span>{config.announcementBadge || 'মেগা ছাড় অফার চলছে!'}</span>
        </span>
        <span className="hidden sm:inline opacity-60">|</span>
        <span className="text-amber-100">{config.announcementText || 'আজকের অর্ডারে পাচ্ছেন নিশ্চিত ক্যাশব্যাক ও ফ্ল্যাট ডিসকাউন্ট'}</span>
        {config.showCountdown && (
          <span className="inline-flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-full text-[10px] tracking-wider font-mono">
            <Clock size={11} className="text-amber-300" />
            <span>{String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}</span>
          </span>
        )}
      </div>
    );
  };

  const renderHero = () => {
    if (!config.showHero) return null;
    return (
      <section key="sec-hero" className="relative overflow-hidden py-10 sm:py-16 px-4 sm:px-8 border-b border-white/5 bg-gradient-to-b from-[#0e1322] via-[#090d16] to-[#07090e]">
        {config.heroBgGlow && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />
        )}

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-400/20 via-rose-500/20 to-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-widest mb-4 shadow-lg">
            <Sparkles size={13} className="text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>{config.heroBadge || config.campaignBadge}</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-black text-white tracking-tight leading-[1.15]">
            {config.heroTitle}
          </h2>

          <p className="mt-4 text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {config.heroSubtitle}
          </p>

          {config.showCountdown && (
            <div className="mt-7 inline-flex flex-col sm:flex-row items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 border border-amber-500/40 shadow-2xl backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Clock size={16} className="text-amber-400 animate-pulse" />
                <span>{config.countdownLabel}</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <div className="bg-slate-950 border border-amber-500/30 px-3 py-1.5 rounded-xl text-center min-w-[50px]">
                  <span className="text-lg sm:text-xl font-black text-white block leading-none">{String(timeLeft.hours).padStart(2, '0')}</span>
                  <span className="text-[9px] text-slate-400 uppercase tracking-tighter">ঘণ্টা</span>
                </div>
                <span className="text-amber-400 font-bold">:</span>
                <div className="bg-slate-950 border border-amber-500/30 px-3 py-1.5 rounded-xl text-center min-w-[50px]">
                  <span className="text-lg sm:text-xl font-black text-white block leading-none">{String(timeLeft.minutes).padStart(2, '0')}</span>
                  <span className="text-[9px] text-slate-400 uppercase tracking-tighter">মিনিট</span>
                </div>
                <span className="text-amber-400 font-bold">:</span>
                <div className="bg-slate-950 border border-amber-500/30 px-3 py-1.5 rounded-xl text-center min-w-[50px]">
                  <span className="text-lg sm:text-xl font-black text-amber-400 block leading-none">{String(timeLeft.seconds).padStart(2, '0')}</span>
                  <span className="text-[9px] text-slate-400 uppercase tracking-tighter">সেকেন্ড</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('offer-products-section');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black text-sm uppercase tracking-wider hover:shadow-2xl hover:shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>{config.heroCtaText}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>
    );
  };

  const renderTrust = () => {
    if (!config.showTrustBadges) return null;
    return (
      <section key="sec-trust" className="py-6 px-4 sm:px-8 border-b border-white/5 bg-[#090d16]">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {config.trustItems?.map((item) => {
            return (
              <div key={item.id} className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
                <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">{item.title}</h4>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">{item.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderProducts = () => {
    if (!config.showProducts) return null;
    return (
      <section key="sec-products" id="offer-products-section" className="py-12 sm:py-16 px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 text-amber-400 text-xs font-bold mb-2">
            <Tag size={13} />
            <span>হট সেল কালেকশন</span>
          </div>
          <h3 className="text-2xl sm:text-4xl font-serif font-black text-white tracking-tight">
            {config.productsTitle}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            {config.productsSubtitle}
          </p>

          {config.showCategoryFilters && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              {[
                { id: 'ALL', label: 'সব কালেকশন' },
                { id: 'THREE PIECE', label: 'থ্রি-পিস' },
                { id: 'SAREE', label: 'শাড়ি' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">পণ্য লোড হচ্ছে...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center bg-slate-900/40 rounded-3xl border border-white/5 max-w-md mx-auto">
            <ShoppingBag size={40} className="text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-white">এই মুহূর্তে কোনো পণ্য পাওয়া যায়নি</p>
            <p className="text-xs text-slate-400 mt-1">অনুগ্রহ করে মূল স্টোর ভিজিট করুন।</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => {
              const pId = product.id || product.productCode;
              const hasSizes = product.category !== 'SAREE';
              const availableSizes = product.sizes && product.sizes.length > 0 ? product.sizes : ['38', '40', '42', '44'];
              const currentSize = selectedSizes[pId] || (hasSizes ? '38' : 'Free Size');
              const currentQty = selectedQuantities[pId] || 1;

              const regularPrice = product.regularPrice || Math.round(product.price * 1.25);
              const discountPercent = regularPrice > product.price 
                ? Math.round(((regularPrice - product.price) / regularPrice) * 100)
                : 20;

              return (
                <div 
                  key={pId}
                  className="bg-[#0b0f1a] border border-white/10 rounded-3xl overflow-hidden hover:border-amber-400/50 transition-all duration-300 flex flex-col shadow-xl group"
                >
                  <div className="relative aspect-[4/5] bg-slate-950 overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />

                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                      {config.showDiscountBadge && (
                        <span className="px-2.5 py-1 bg-gradient-to-r from-rose-600 to-amber-500 text-white font-black text-xs rounded-full shadow-lg">
                          -{discountPercent}% OFF
                        </span>
                      )}
                      {config.showStockBadge && (
                        <span className="px-2 py-0.5 bg-emerald-500/90 text-white font-bold text-[10px] rounded-full backdrop-blur-xs flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          <span>ইন স্টক</span>
                        </span>
                      )}
                    </div>

                    <div className="absolute top-3 right-3 z-10">
                      <span className="px-2.5 py-1 bg-black/75 backdrop-blur-md text-amber-400 font-mono text-[11px] font-bold rounded-lg border border-amber-400/30">
                        #{product.productCode}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPreviewProduct(product)}
                      className="absolute bottom-3 right-3 p-2.5 rounded-full bg-slate-900/80 backdrop-blur-md text-slate-200 hover:text-white hover:bg-slate-900 border border-white/10 transition-colors shadow-lg cursor-pointer"
                      title="বড় করে দেখুন"
                    >
                      <Eye size={16} />
                    </button>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90">
                        {product.category}
                      </span>
                      <h4 className="text-base font-bold text-white line-clamp-2 mt-0.5 group-hover:text-amber-300 transition-colors">
                        {product.title}
                      </h4>

                      <div className="flex items-baseline gap-2.5 mt-2">
                        <span className="text-2xl font-black text-amber-400">
                          ৳{product.price.toLocaleString('bn-BD')}
                        </span>
                        <span className="text-xs text-slate-500 line-through">
                          ৳{regularPrice.toLocaleString('bn-BD')}
                        </span>
                      </div>

                      {hasSizes && (
                        <div className="mt-3.5 space-y-1.5">
                          <label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                            <span>সাইজ বেছে নিন:</span>
                            <span className="text-amber-300 font-bold">{currentSize}</span>
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {availableSizes.map(s => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => handleSizeSelect(pId, s)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  currentSize === s
                                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-3.5 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400">পরিমাণ:</span>
                        <div className="flex items-center gap-2 bg-slate-950 border border-white/10 rounded-xl px-2 py-1">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(pId, -1)}
                            className="text-slate-400 hover:text-white p-1 cursor-pointer"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-xs font-bold text-white min-w-[20px] text-center">
                            {currentQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(pId, 1)}
                            className="text-slate-400 hover:text-white p-1 cursor-pointer"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handleProductBuy(product)}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ShoppingBag size={15} />
                        <span>{config.buyNowButtonText}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  const renderPolicies = () => {
    if (!config.showPolicies) return null;
    return (
      <section key="sec-policies" className="py-12 px-4 sm:px-8 border-t border-b border-white/5 bg-[#090d16]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
              <Truck size={24} />
            </div>
            <h4 className="text-base font-bold text-white">ডেলিভারি চার্জ ও সময়</h4>
            <div className="space-y-1.5 text-xs text-slate-300">
              <p>• ঢাকা সিটি: <span className="text-amber-400 font-bold">{config.dhakaDeliveryCharge}</span> ({config.deliveryTimeDhaka})</p>
              <p>• ঢাকার বাইরে: <span className="text-amber-400 font-bold">{config.outsideDhakaDeliveryCharge}</span> ({config.deliveryTimeOutside})</p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-400/10 text-rose-400 flex items-center justify-center">
              <RotateCcw size={24} />
            </div>
            <h4 className="text-base font-bold text-white">{config.returnPolicyText}</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {config.returnPolicyDescription}
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <h4 className="text-base font-bold text-white">{config.paymentPolicyText}</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {config.paymentPolicyDescription}
            </p>
          </div>
        </div>
      </section>
    );
  };

  const renderFaq = () => {
    if (!config.showFaq || !config.faqItems?.length) return null;
    return (
      <section key="sec-faq" className="py-12 sm:py-16 px-4 sm:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 text-amber-400 text-xs font-bold mb-2">
            <HelpCircle size={13} />
            <span>সচরাচর জিজ্ঞাসা</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-serif font-black text-white">
            {config.faqTitle}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {config.faqSubtitle}
          </p>
        </div>

        <div className="space-y-3">
          {config.faqItems.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div 
                key={faq.id || idx}
                className="rounded-2xl border border-white/10 bg-[#0b0f1a] overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3 cursor-pointer"
                >
                  <span className="text-xs sm:text-sm font-bold text-white">{faq.question}</span>
                  <ChevronDown size={18} className={`text-amber-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs text-slate-300 leading-relaxed border-t border-white/5 pt-3"
                    >
                      {faq.answer}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderConsultation = () => {
    if (!config.showConsultation) return null;
    return (
      <section key="sec-consultation" className="py-12 px-4 sm:px-8 border-t border-white/5 bg-gradient-to-b from-[#090d16] to-[#05070b]">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl sm:text-3xl font-serif font-black text-white">
              {config.consultationTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              {config.consultationSubtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={`https://wa.me/88${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(config.whatsappMessagePreset || '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <MessageCircle size={16} />
              <span>{config.whatsappButtonText}</span>
            </a>

            <a
              href={`tel:${supportPhone}`}
              className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-2 transition-all border border-white/10"
            >
              <Phone size={16} className="text-amber-400" />
              <span>{config.callButtonText} ({supportPhone})</span>
            </a>
          </div>
        </div>
      </section>
    );
  };

  // Section mapping dispatcher
  const renderSectionById = (id: LandingPageSectionId) => {
    switch (id) {
      case 'announcement': return renderAnnouncement();
      case 'hero': return renderHero();
      case 'trust': return renderTrust();
      case 'products': return renderProducts();
      case 'policies': return renderPolicies();
      case 'faq': return renderFaq();
      case 'consultation': return renderConsultation();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950 pb-16">
      
      {/* 1. LUXURY STICKY HEADER */}
      <header className="sticky top-0 z-30 bg-[#090d16]/95 backdrop-blur-md border-b border-amber-500/20 py-3 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={onGoToStore}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-amber-400 via-rose-500 to-amber-600 p-0.5 shadow-lg group-hover:scale-105 transition-transform">
                <img 
                  src={logoUrl} 
                  alt="SERA FASHION" 
                  className="w-full h-full object-cover rounded-[10px] bg-slate-950"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div>
                <h1 className="font-serif font-black text-base sm:text-lg tracking-wider text-amber-400 leading-tight">
                  SERA FASHION
                </h1>
                <p className="text-[10px] text-slate-400 font-semibold tracking-wide">
                  এক্সক্লুসিভ ফ্যাশন হাউস
                </p>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a 
              href={`https://wa.me/88${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(config.whatsappMessagePreset || '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all shadow-xs"
            >
              <MessageCircle size={14} className="text-emerald-400" />
              <span>WhatsApp অর্ডার</span>
            </a>

            <button
              type="button"
              onClick={onGoToStore}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/50 text-amber-300 hover:text-white text-xs font-bold transition-all shadow-xs cursor-pointer group"
            >
              <Store size={14} className="group-hover:rotate-12 transition-transform" />
              <span>মূল শপে যান</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. DYNAMICALLY ORDERED SECTIONS BASED ON ADMIN STRUCTURE */}
      {config.sectionOrder.map((sectionId) => renderSectionById(sectionId))}

      {/* 3. FOOTER */}
      <footer className="py-8 px-4 bg-[#05070b] border-t border-white/10 text-center text-xs text-slate-400">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src={logoUrl} alt="SERA FASHION" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-serif font-black text-amber-400 tracking-wider">SERA FASHION</span>
            <span className="text-slate-600">|</span>
            <span>সর্বস্বত্ব সংরক্ষিত © {new Date().getFullYear()}</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <button 
              type="button" 
              onClick={onGoToStore}
              className="text-amber-400 hover:text-white transition-colors cursor-pointer"
            >
              মূল ওয়েবসাইট ভিজিট করুন →
            </button>
            <a 
              href={facebookUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-slate-400 hover:text-blue-400 transition-colors"
            >
              Facebook পেজ
            </a>
          </div>
        </div>
      </footer>

      {/* 4. PRODUCT HIGH-RES ZOOM PREVIEW MODAL */}
      <AnimatePresence>
        {previewProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <div className="fixed inset-0" onClick={() => setPreviewProduct(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#0e1322] border border-amber-500/30 rounded-3xl overflow-hidden shadow-2xl z-10 p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-amber-400">#{previewProduct.productCode}</span>
                  <h4 className="text-base font-bold text-white">{previewProduct.title}</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewProduct(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-white/5 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-black">
                <img src={previewProduct.imageUrl} alt={previewProduct.title} className="w-full h-full object-cover" />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-2xl font-black text-amber-400">৳{previewProduct.price.toLocaleString('bn-BD')}</span>
                <button
                  type="button"
                  onClick={() => {
                    handleProductBuy(previewProduct);
                    setPreviewProduct(null);
                  }}
                  className="px-6 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer"
                >
                  Buy Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. MOBILE BOTTOM STICKY BAR */}
      {config.showStickyMobileBar && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#090d16]/95 backdrop-blur-md border-t border-amber-500/30 p-2.5 sm:hidden flex items-center justify-between gap-2 shadow-2xl">
          <div className="flex items-center gap-1.5 pl-1">
            <Flame size={14} className="text-amber-400 animate-pulse" />
            <span className="text-[11px] font-bold text-amber-200">{config.stickyBarText}</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/88${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(config.whatsappMessagePreset || '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
              title="WhatsApp"
            >
              <MessageCircle size={15} />
            </a>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('offer-products-section');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-xs font-black rounded-xl shadow-md cursor-pointer"
            >
              অর্ডার করুন
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
