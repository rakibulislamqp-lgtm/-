import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, Sparkles, Clock, Truck, RotateCcw, ShieldCheck, 
  CheckCircle2, ChevronDown, ChevronUp, Star, Phone, MessageCircle, 
  ArrowRight, Tag, Flame, Zap, Award, HelpCircle, ExternalLink, 
  Store, Check, AlertCircle, Eye, X, Plus, Minus, Camera, Scissors
} from 'lucide-react';
import { Product, BrandSettings, LandingPageSectionId, BodyMeasurements } from '../types';
import { getAllProducts } from '../services/productService';
import { DEFAULT_LANDING_PAGE_CONFIG } from '../services/landingPageDefaults';
import defaultLogo from '../assets/images/sfh_logo_1779435027377.png';
import {
  getProductSizes,
  getDefaultSizeForProduct,
  getDefaultColorForProduct,
  getProductImagesList,
  getProductPhotoVariants,
  getPhotoVariantLabel,
  isThreePieceCategory,
  CUSTOM_TAILORING_ADVANCE_BDT,
  toBanglaDigits,
} from '../lib/productVariants';

export interface OfferVariantSelection {
  size: string;
  color: string;
  imageUrl?: string;
  isCustomTailored?: boolean;
  customMeasurements?: BodyMeasurements;
}

interface OfferLandingPageProps {
  onBuyNow: (product: Product, quantity: number, size: string, color?: string, variants?: OfferVariantSelection[]) => void;
  onAddToCart?: (product: Product, quantity: number, size: string, color?: string, variants?: OfferVariantSelection[]) => void;
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
  
  // Per-product state: selected size, color/photo, quantity & per-piece variants
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [selectedColors, setSelectedColors] = useState<Record<string, string>>({});
  const [selectedImageUrls, setSelectedImageUrls] = useState<Record<string, string>>({});
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [pieceVariants, setPieceVariants] = useState<Record<string, OfferVariantSelection[]>>({});
  const [tailoringErrors, setTailoringErrors] = useState<Record<string, string>>({});
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

  const handleSizeSelect = (product: Product, size: string) => {
    const productId = product.id || product.productCode;
    const availImages = getProductImagesList(product);
    const defImage = selectedImageUrls[productId] || availImages[0] || product.imageUrl;
    setSelectedSizes(prev => ({ ...prev, [productId]: size }));
    setTailoringErrors(prev => {
      if (!prev[productId]) return prev;
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    setPieceVariants(prev => {
      const existing = prev[productId];
      if (!existing || existing.length === 0) {
        return {
          ...prev,
          [productId]: [{ size, color: selectedColors[productId] || getDefaultColorForProduct(product), imageUrl: defImage, isCustomTailored: false }],
        };
      }
      const next = [...existing];
      next[0] = { ...next[0], size, isCustomTailored: false };
      return { ...prev, [productId]: next };
    });
  };

  const handleToggleTailoringMode = (product: Product, pieceIdx: number, useCustom: boolean) => {
    const productId = product.id || product.productCode;
    const defSize = selectedSizes[productId] || getDefaultSizeForProduct(product);
    const defColor = selectedColors[productId] || getDefaultColorForProduct(product);
    const availImages = getProductImagesList(product);
    const defImage = selectedImageUrls[productId] || availImages[0] || product.imageUrl;
    const qty = selectedQuantities[productId] || 1;
    setTailoringErrors(prev => {
      if (!prev[productId]) return prev;
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    setPieceVariants(prev => {
      const base: OfferVariantSelection[] = prev[productId] && prev[productId].length === qty
        ? [...prev[productId]]
        : Array.from({ length: qty }, () => ({ size: defSize, color: defColor, imageUrl: defImage }));
      const target = base[pieceIdx];
      if (useCustom) {
        const chest = (target.customMeasurements?.chest || '').trim();
        base[pieceIdx] = {
          ...target,
          isCustomTailored: true,
          size: chest ? `বডির মাপ (${chest})` : 'বডির মাপ (Custom)',
          customMeasurements: target.customMeasurements || { chest: '' },
        };
      } else {
        base[pieceIdx] = {
          ...target,
          isCustomTailored: false,
          size: getDefaultSizeForProduct(product),
        };
      }
      return { ...prev, [productId]: base };
    });
  };

  const handleMeasurementChange = (
    product: Product,
    pieceIdx: number,
    field: keyof BodyMeasurements,
    value: string
  ) => {
    const productId = product.id || product.productCode;
    const defSize = selectedSizes[productId] || getDefaultSizeForProduct(product);
    const defColor = selectedColors[productId] || getDefaultColorForProduct(product);
    const availImages = getProductImagesList(product);
    const defImage = selectedImageUrls[productId] || availImages[0] || product.imageUrl;
    const qty = selectedQuantities[productId] || 1;
    setTailoringErrors(prev => {
      if (!prev[productId]) return prev;
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    setPieceVariants(prev => {
      const base: OfferVariantSelection[] = prev[productId] && prev[productId].length === qty
        ? [...prev[productId]]
        : Array.from({ length: qty }, () => ({ size: defSize, color: defColor, imageUrl: defImage }));
      const target = base[pieceIdx];
      const nextMeasurements: BodyMeasurements = {
        chest: target.customMeasurements?.chest || '',
        ...(target.customMeasurements || {}),
        [field]: value,
      };
      const chestTrim = (nextMeasurements.chest || '').trim();
      base[pieceIdx] = {
        ...target,
        isCustomTailored: true,
        size: chestTrim ? `বডির মাপ (${chestTrim})` : 'বডির মাপ (Custom)',
        customMeasurements: nextMeasurements,
      };
      return { ...prev, [productId]: base };
    });
  };

  const handlePhotoSelect = (
    product: Product,
    imgUrl: string,
    imgIdx: number,
    totalImages: number,
    customLabel?: string
  ) => {
    const productId = product.id || product.productCode;
    const resolvedVariants = getProductPhotoVariants(product);
    const colorLabel = customLabel || resolvedVariants[imgIdx]?.label || getPhotoVariantLabel(imgIdx, totalImages);
    setSelectedImageUrls(prev => ({ ...prev, [productId]: imgUrl }));
    setSelectedColors(prev => ({ ...prev, [productId]: colorLabel }));
    setPieceVariants(prev => {
      const existing = prev[productId];
      if (!existing || existing.length === 0) {
        return {
          ...prev,
          [productId]: [{
            size: selectedSizes[productId] || getDefaultSizeForProduct(product),
            color: colorLabel,
            imageUrl: imgUrl,
          }],
        };
      }
      const next = [...existing];
      next[0] = { ...next[0], color: colorLabel, imageUrl: imgUrl };
      return { ...prev, [productId]: next };
    });
  };

  const handleQuantityChange = (product: Product, delta: number) => {
    const productId = product.id || product.productCode;
    const current = selectedQuantities[productId] || 1;
    const nextQty = Math.max(1, Math.min(10, current + delta));
    const availImages = getProductImagesList(product);
    const defImage = selectedImageUrls[productId] || availImages[0] || product.imageUrl;
    setSelectedQuantities(prev => ({ ...prev, [productId]: nextQty }));
    setPieceVariants(prev => {
      const defSize = selectedSizes[productId] || getDefaultSizeForProduct(product);
      const defColor = selectedColors[productId] || getDefaultColorForProduct(product);
      const currentList: OfferVariantSelection[] = prev[productId] || [{ size: defSize, color: defColor, imageUrl: defImage }];
      if (nextQty === currentList.length) return prev;
      if (nextQty < currentList.length) {
        return { ...prev, [productId]: currentList.slice(0, nextQty) };
      }
      const template = currentList[currentList.length - 1] || { size: defSize, color: defColor, imageUrl: defImage };
      return {
        ...prev,
        [productId]: [
          ...currentList,
          ...Array.from({ length: nextQty - currentList.length }, () => ({
            ...template,
            customMeasurements: template.customMeasurements ? { ...template.customMeasurements } : undefined,
          })),
        ],
      };
    });
  };

  const handlePieceSizeChange = (product: Product, pieceIdx: number, value: string) => {
    const productId = product.id || product.productCode;
    const defSize = selectedSizes[productId] || getDefaultSizeForProduct(product);
    const defColor = selectedColors[productId] || getDefaultColorForProduct(product);
    const availImages = getProductImagesList(product);
    const defImage = selectedImageUrls[productId] || availImages[0] || product.imageUrl;
    const qty = selectedQuantities[productId] || 1;
    setTailoringErrors(prev => {
      if (!prev[productId]) return prev;
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    setPieceVariants(prev => {
      const base: OfferVariantSelection[] = prev[productId] && prev[productId].length === qty
        ? [...prev[productId]]
        : Array.from({ length: qty }, () => ({ size: defSize, color: defColor, imageUrl: defImage }));
      base[pieceIdx] = { ...base[pieceIdx], size: value, isCustomTailored: false };
      return { ...prev, [productId]: base };
    });
    if (pieceIdx === 0) {
      setSelectedSizes(prev => ({ ...prev, [productId]: value }));
    }
  };

  const handlePiecePhotoChange = (
    product: Product,
    pieceIdx: number,
    imgUrl: string,
    imgIdx: number,
    totalImages: number,
    customLabel?: string
  ) => {
    const productId = product.id || product.productCode;
    const defSize = selectedSizes[productId] || getDefaultSizeForProduct(product);
    const defColor = selectedColors[productId] || getDefaultColorForProduct(product);
    const availImages = getProductImagesList(product);
    const defImage = selectedImageUrls[productId] || availImages[0] || product.imageUrl;
    const qty = selectedQuantities[productId] || 1;
    const resolvedVariants = getProductPhotoVariants(product);
    const colorLabel = customLabel || resolvedVariants[imgIdx]?.label || getPhotoVariantLabel(imgIdx, totalImages);
    setPieceVariants(prev => {
      const base: OfferVariantSelection[] = prev[productId] && prev[productId].length === qty
        ? [...prev[productId]]
        : Array.from({ length: qty }, () => ({ size: defSize, color: defColor, imageUrl: defImage }));
      base[pieceIdx] = { ...base[pieceIdx], color: colorLabel, imageUrl: imgUrl };
      return { ...prev, [productId]: base };
    });
    if (pieceIdx === 0) {
      setSelectedImageUrls(prev => ({ ...prev, [productId]: imgUrl }));
      setSelectedColors(prev => ({ ...prev, [productId]: colorLabel }));
    }
  };

  const handleSyncFirstPieceToAll = (product: Product) => {
    const productId = product.id || product.productCode;
    const qty = selectedQuantities[productId] || 1;
    const defSize = selectedSizes[productId] || getDefaultSizeForProduct(product);
    const defColor = selectedColors[productId] || getDefaultColorForProduct(product);
    const availImages = getProductImagesList(product);
    const defImage = selectedImageUrls[productId] || availImages[0] || product.imageUrl;
    setPieceVariants(prev => {
      const current = prev[productId] || [];
      const first = current[0] || { size: defSize, color: defColor, imageUrl: defImage };
      return {
        ...prev,
        [productId]: Array.from({ length: qty }, () => ({
          ...first,
          customMeasurements: first.customMeasurements ? { ...first.customMeasurements } : undefined,
        })),
      };
    });
  };

  const handleProductBuy = (product: Product): boolean => {
    const pId = product.id || product.productCode;
    const size = selectedSizes[pId] || getDefaultSizeForProduct(product);
    const color = selectedColors[pId] || getDefaultColorForProduct(product);
    const availImages = getProductImagesList(product);
    const defImage = selectedImageUrls[pId] || availImages[0] || product.imageUrl;
    const quantity = selectedQuantities[pId] || 1;
    const variants: OfferVariantSelection[] = pieceVariants[pId] && pieceVariants[pId].length === quantity
      ? pieceVariants[pId]
      : Array.from({ length: quantity }, () => ({ size, color, imageUrl: defImage }));

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (v.isCustomTailored && !(v.customMeasurements?.chest || '').trim()) {
        setTailoringErrors(prev => ({
          ...prev,
          [pId]: variants.length > 1
            ? `পিস ${toBanglaDigits(i + 1)}-এর জন্য বডি / ছাতির মাপ (ইঞ্চি) লিখুন।`
            : 'বডির মাপে বানিয়ে নিতে বডি / ছাতির মাপ (ইঞ্চি) লিখুন।',
        }));
        return false;
      }
    }

    onBuyNow(product, quantity, variants[0]?.size || size, variants[0]?.color || color, variants);
    return true;
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
          <div className={
            filteredProducts.length === 1
              ? "flex justify-center"
              : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          }>
            {filteredProducts.map((product) => {
              const pId = product.id || product.productCode;
              const availableSizes = getProductSizes(product);
              const rawVariants = getProductPhotoVariants(product);
              const cardVariants = rawVariants.length > 0
                ? rawVariants
                : (product.imageUrl ? [{ imageUrl: product.imageUrl, label: getPhotoVariantLabel(0, 1) }] : []);
              const cardImages = cardVariants.map((v) => v.imageUrl);
              const hasSizes = availableSizes.length > 1 || product.category !== 'SAREE';
              const currentSize = selectedSizes[pId] || getDefaultSizeForProduct(product);
              const currentColor = selectedColors[pId] || cardVariants[0]?.label || getDefaultColorForProduct(product);
              const currentImageUrl = selectedImageUrls[pId] || cardImages[0] || product.imageUrl;
              const currentQty = selectedQuantities[pId] || 1;
              const currentPieces: OfferVariantSelection[] = pieceVariants[pId] && pieceVariants[pId].length === currentQty
                ? pieceVariants[pId]
                : Array.from({ length: currentQty }, () => ({ size: currentSize, color: currentColor, imageUrl: currentImageUrl }));

              const regularPrice = product.regularPrice || Math.round(product.price * 1.25);
              const discountPercent = regularPrice > product.price 
                ? Math.round(((regularPrice - product.price) / regularPrice) * 100)
                : 20;

              const isThreePiece = isThreePieceCategory(product.category);
              const firstPieceCustom = Boolean(currentPieces[0]?.isCustomTailored);
              const firstMeasurements = currentPieces[0]?.customMeasurements || { chest: '' };
              const productTailoringError = tailoringErrors[pId];

              return (
                <div 
                  key={pId}
                  className={`bg-[#0b0f1a] border border-white/10 rounded-3xl overflow-hidden hover:border-amber-400/50 transition-all duration-300 flex flex-col shadow-xl group ${
                    filteredProducts.length === 1 ? 'w-full max-w-md' : ''
                  }`}
                >
                  <div className="relative aspect-[4/5] bg-slate-950 overflow-hidden">
                    <img
                      src={currentImageUrl}
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

                      <div className="mt-3.5 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400">পরিমাণ:</span>
                        <div className="flex items-center gap-2 bg-slate-950 border border-white/10 rounded-xl px-2 py-1">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(product, -1)}
                            className="text-slate-400 hover:text-white p-1 cursor-pointer"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-xs font-bold text-white min-w-[20px] text-center">
                            {currentQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(product, 1)}
                            className="text-slate-400 hover:text-white p-1 cursor-pointer"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>

                      {currentQty === 1 ? (
                        <>
                          {hasSizes && (
                            <div className="mt-3.5 space-y-2">
                              <label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                                <span>সাইজ / সেলাই অপশন:</span>
                                <span className="text-amber-300 font-bold">
                                  {firstPieceCustom ? '✂️ বডির মাপে' : currentSize}
                                </span>
                              </label>

                              {isThreePiece && (
                                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-white/10">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleTailoringMode(product, 0, false)}
                                    className={`py-1.5 px-2 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                                      !firstPieceCustom
                                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                                        : 'text-slate-300 hover:text-white'
                                    }`}
                                  >
                                    রেডিমেড সাইজ
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleTailoringMode(product, 0, true)}
                                    className={`py-1.5 px-2 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                      firstPieceCustom
                                        ? 'bg-rose-500 text-white shadow-sm'
                                        : 'text-amber-300 hover:text-white'
                                    }`}
                                  >
                                    <Scissors size={11} />
                                    <span>বডির মাপে বানান</span>
                                  </button>
                                </div>
                              )}

                              {!firstPieceCustom ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {availableSizes.map(s => (
                                    <button
                                      key={s}
                                      type="button"
                                      onClick={() => handleSizeSelect(product, s)}
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
                              ) : (
                                <div className="p-2.5 rounded-xl bg-slate-950 border border-rose-500/35 space-y-2">
                                  <div className="flex items-center justify-between gap-2 text-[10px]">
                                    <span className="font-bold text-amber-300 flex items-center gap-1">
                                      <Scissors size={11} />
                                      বডির মাপ লিখুন (ইঞ্চি)
                                    </span>
                                    <span className="text-rose-300 font-bold">
                                      ৳{toBanglaDigits(CUSTOM_TAILORING_ADVANCE_BDT)} অগ্রিম প্রযোজ্য
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <input
                                      type="text"
                                      placeholder="বডি / ছাতি * (যেমন: 38)"
                                      value={firstMeasurements.chest || ''}
                                      onChange={(e) => handleMeasurementChange(product, 0, 'chest', e.target.value)}
                                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                                    />
                                    <input
                                      type="text"
                                      placeholder="কোমর (যেমন: 34)"
                                      value={firstMeasurements.waist || ''}
                                      onChange={(e) => handleMeasurementChange(product, 0, 'waist', e.target.value)}
                                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                                    />
                                    <input
                                      type="text"
                                      placeholder="লম্বা (যেমন: 42)"
                                      value={firstMeasurements.length || ''}
                                      onChange={(e) => handleMeasurementChange(product, 0, 'length', e.target.value)}
                                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                                    />
                                    <input
                                      type="text"
                                      placeholder="হাতা (যেমন: 18)"
                                      value={firstMeasurements.sleeve || ''}
                                      onChange={(e) => handleMeasurementChange(product, 0, 'sleeve', e.target.value)}
                                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                                    />
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="অতিরিক্ত সেলাই নোট (যদি থাকে)"
                                    value={firstMeasurements.note || ''}
                                    onChange={(e) => handleMeasurementChange(product, 0, 'note', e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          <div className="mt-3.5 space-y-2">
                            <label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1">
                                <Camera size={12} className="text-amber-400" />
                                কালার ও ডিজাইন (ছবিতে টাচ করুন):
                              </span>
                              <span className="text-amber-300 font-bold inline-flex items-center gap-1.5 truncate max-w-[150px]">
                                <img
                                  src={currentImageUrl}
                                  alt={currentColor}
                                  className="w-3.5 h-3.5 rounded object-cover border border-amber-400/50 shrink-0"
                                />
                                <span>{currentColor}</span>
                              </span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {cardVariants.map((variant, imgIdx) => {
                                const isSelected = currentImageUrl === variant.imageUrl;
                                return (
                                  <button
                                    key={imgIdx}
                                    type="button"
                                    onClick={() => handlePhotoSelect(product, variant.imageUrl, imgIdx, cardVariants.length, variant.label)}
                                    className={`relative w-12 h-12 rounded-xl overflow-hidden transition-all cursor-pointer p-0.5 bg-slate-900 ${
                                      isSelected
                                        ? 'border-2 border-amber-400 ring-2 ring-amber-400/35 shadow-lg scale-105'
                                        : 'border border-white/15 opacity-75 hover:opacity-100 hover:border-white/40'
                                    }`}
                                    title={variant.label}
                                  >
                                    <img
                                      src={variant.imageUrl}
                                      alt={variant.label}
                                      className="w-full h-full object-cover rounded-[9px]"
                                    />
                                    {isSelected && (
                                      <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                                        <Check size={9} strokeWidth={3} />
                                      </span>
                                    )}
                                    {variant.colorHex && (
                                      <span
                                        className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-white shadow-xs"
                                        style={{ backgroundColor: variant.colorHex }}
                                      />
                                    )}
                                    {cardVariants.length > 1 && (
                                      <span className={`absolute bottom-0.5 left-0.5 px-1 rounded text-[8px] font-black ${
                                        isSelected ? 'bg-amber-400 text-slate-950' : 'bg-black/75 text-white'
                                      }`}>
                                        {toBanglaDigits(imgIdx + 1)}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="mt-3.5 space-y-2 bg-slate-950/70 border border-white/10 rounded-2xl p-2.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[10.5px] font-bold text-amber-300 inline-flex items-center gap-1">
                              <Camera size={12} className="text-amber-400" />
                              <span>প্রতিটি পিসের সাইজ ও ছবি:</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSyncFirstPieceToAll(product)}
                              className="text-[9.5px] font-bold text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 px-2 py-0.5 rounded-md border border-amber-400/30 cursor-pointer"
                            >
                              সব ১মটির মতো রাখুন
                            </button>
                          </div>
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
                            {currentPieces.map((piece, idx) => {
                              const pieceCustom = Boolean(piece.isCustomTailored);
                              const pMeas = piece.customMeasurements || { chest: '' };
                              return (
                                <div key={idx} className="p-2 rounded-xl bg-white/[0.04] border border-white/10 space-y-1.5">
                                  <div className="flex items-center justify-between text-[10px] font-bold gap-2">
                                    <span className="text-amber-300">পিস {toBanglaDigits(idx + 1)}</span>
                                    <span className="text-slate-300 inline-flex items-center gap-1.5 truncate max-w-[175px]">
                                      <img
                                        src={piece.imageUrl || currentImageUrl}
                                        alt={`পিস ${idx + 1}`}
                                        className="w-3.5 h-3.5 rounded object-cover border border-amber-400/50 shrink-0"
                                      />
                                      <span>{piece.size} • {piece.color}</span>
                                    </span>
                                  </div>
                                  {isThreePiece && (
                                    <div className="grid grid-cols-2 gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleTailoringMode(product, idx, false)}
                                        className={`py-1 rounded text-[9.5px] font-bold cursor-pointer ${
                                          !pieceCustom ? 'bg-amber-400 text-slate-950' : 'bg-white/5 text-slate-300'
                                        }`}
                                      >
                                        রেডিমেড সাইজ
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleTailoringMode(product, idx, true)}
                                        className={`py-1 rounded text-[9.5px] font-bold cursor-pointer flex items-center justify-center gap-1 ${
                                          pieceCustom ? 'bg-rose-500 text-white' : 'bg-white/5 text-amber-300'
                                        }`}
                                      >
                                        <Scissors size={9} />
                                        <span>বডির মাপে বানান</span>
                                      </button>
                                    </div>
                                  )}
                                  {hasSizes && !pieceCustom && (
                                    <div className="flex flex-wrap gap-1">
                                      {availableSizes.map(s => (
                                        <button
                                          key={s}
                                          type="button"
                                          onClick={() => handlePieceSizeChange(product, idx, s)}
                                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                            piece.size === s ? 'bg-amber-400 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                                          }`}
                                        >
                                          {s}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  {pieceCustom && (
                                    <div className="p-2 rounded-lg bg-slate-950 border border-rose-500/35 space-y-1.5">
                                      <span className="text-[9.5px] font-bold text-rose-300 block">
                                        বডির মাপ (৳{toBanglaDigits(CUSTOM_TAILORING_ADVANCE_BDT)} অগ্রিম প্রযোজ্য)
                                      </span>
                                      <div className="grid grid-cols-2 gap-1">
                                        <input
                                          type="text"
                                          placeholder="বডি/ছাতি *"
                                          value={pMeas.chest || ''}
                                          onChange={(e) => handleMeasurementChange(product, idx, 'chest', e.target.value)}
                                          className="w-full px-2 py-1 rounded bg-slate-900 border border-white/15 text-[10px] text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                                        />
                                        <input
                                          type="text"
                                          placeholder="কোমর"
                                          value={pMeas.waist || ''}
                                          onChange={(e) => handleMeasurementChange(product, idx, 'waist', e.target.value)}
                                          className="w-full px-2 py-1 rounded bg-slate-900 border border-white/15 text-[10px] text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                                        />
                                        <input
                                          type="text"
                                          placeholder="লম্বা"
                                          value={pMeas.length || ''}
                                          onChange={(e) => handleMeasurementChange(product, idx, 'length', e.target.value)}
                                          className="w-full px-2 py-1 rounded bg-slate-900 border border-white/15 text-[10px] text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                                        />
                                        <input
                                          type="text"
                                          placeholder="হাতা"
                                          value={pMeas.sleeve || ''}
                                          onChange={(e) => handleMeasurementChange(product, idx, 'sleeve', e.target.value)}
                                          className="w-full px-2 py-1 rounded bg-slate-900 border border-white/15 text-[10px] text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                                        />
                                      </div>
                                      <input
                                        type="text"
                                        placeholder="অতিরিক্ত নোট"
                                        value={pMeas.note || ''}
                                        onChange={(e) => handleMeasurementChange(product, idx, 'note', e.target.value)}
                                        className="w-full px-2 py-1 rounded bg-slate-900 border border-white/15 text-[10px] text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                                      />
                                    </div>
                                  )}
                                  <div className="space-y-1">
                                    <span className="text-[9.5px] text-slate-400 block">ছবিতে টাচ করে ডিজাইন নিন:</span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {cardVariants.map((variant, imgIdx) => {
                                        const isSelected = (piece.imageUrl || cardImages[0]) === variant.imageUrl;
                                        return (
                                          <button
                                            key={imgIdx}
                                            type="button"
                                            onClick={() => handlePiecePhotoChange(product, idx, variant.imageUrl, imgIdx, cardVariants.length, variant.label)}
                                            className={`relative w-10 h-10 rounded-lg overflow-hidden transition-all cursor-pointer p-0.5 bg-slate-900 ${
                                              isSelected
                                                ? 'border-2 border-amber-400 ring-1 ring-amber-400/40 scale-105'
                                                : 'border border-white/15 opacity-70 hover:opacity-100'
                                            }`}
                                            title={`পিস ${toBanglaDigits(idx + 1)} - ${variant.label}`}
                                          >
                                            <img
                                              src={variant.imageUrl}
                                              alt={variant.label}
                                              className="w-full h-full object-cover rounded-[5px]"
                                            />
                                            {isSelected && (
                                              <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                                                <Check size={8} strokeWidth={3} />
                                              </span>
                                            )}
                                            {variant.colorHex && (
                                              <span
                                                className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-white shadow-xs"
                                                style={{ backgroundColor: variant.colorHex }}
                                              />
                                            )}
                                            {cardVariants.length > 1 && (
                                              <span className={`absolute bottom-0.5 left-0.5 px-1 rounded text-[7.5px] font-black ${
                                                isSelected ? 'bg-amber-400 text-slate-950' : 'bg-black/75 text-white'
                                              }`}>
                                                {toBanglaDigits(imgIdx + 1)}
                                              </span>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {productTailoringError && (
                        <div className="mt-2.5 p-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[11px] font-bold flex items-center gap-1.5">
                          <AlertCircle size={13} className="shrink-0" />
                          <span>{productTailoringError}</span>
                        </div>
                      )}
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
                <img
                  src={selectedImageUrls[previewProduct.id || previewProduct.productCode] || previewProduct.imageUrl}
                  alt={previewProduct.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-2xl font-black text-amber-400">৳{previewProduct.price.toLocaleString('bn-BD')}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (handleProductBuy(previewProduct)) {
                      setPreviewProduct(null);
                    } else {
                      setPreviewProduct(null);
                    }
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
