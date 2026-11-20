import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Sparkles, ShoppingBag, Truck, ShieldCheck } from 'lucide-react';
import { BannerItem, Category } from '../types';
import BANNER_IMAGE from '../assets/images/sera_fashion_banner_1779021192580.png';

interface BannerSliderProps {
  banners?: BannerItem[];
  autoSlideInterval?: number;
  onSelectCategory?: (cat: Category | 'ALL') => void;
}

export const DEFAULT_BANNERS: BannerItem[] = [
  {
    id: 'default-1',
    title: 'SERA FASHION',
    subtitle: 'বিশ্বস্ততার সাথে প্রিমিয়াম ৩-পিস ও অর্গানজা-সিল্ক শাড়ি কালেকশন',
    badge: 'ঈদ স্পেশাল ২০২৬',
    buttonText: 'অর্ডার করুন',
    categoryLink: 'ALL',
    desktopImageUrl: BANNER_IMAGE,
    mobileImageUrl: BANNER_IMAGE,
    isActive: true,
    order: 1,
  },
  {
    id: 'default-2',
    title: 'এক্সক্লুসিভ প্রিমিয়াম শাড়ি কালেকশন',
    subtitle: 'কাঞ্জিভরম, জাজমেন্টাল অর্গানজা ও হাফ সিল্ক শাড়িতে বিশেষ মূল্যছাড়!',
    badge: 'হট প্রোডাক্ট',
    buttonText: 'শাড়ি কালেকশন দেখুন',
    categoryLink: 'SAREE',
    desktopImageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=1600&auto=format&fit=crop',
    mobileImageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=800&auto=format&fit=crop',
    isActive: true,
    order: 2,
  },
  {
    id: 'default-3',
    title: 'পাকিস্তানি ও লাক্সারি থ্রি-পিস',
    subtitle: 'কটন ডিটেইলড এমব্রয়ডারি ও কাটওয়ার্ক ওড়না কালেকশন',
    badge: 'বেস্ট সেলার',
    buttonText: 'থ্রি-পিস কালেকশন',
    categoryLink: 'THREE PIECE',
    desktopImageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=1600&auto=format&fit=crop',
    mobileImageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop',
    isActive: true,
    order: 3,
  },
  {
    id: 'default-4',
    title: 'ক্যাশ অন ডেলিভারি সারা বাংলাদেশে',
    subtitle: 'পণ্য হাতে পেয়ে কোয়ালিটি দেখে টাকা পরিশোধের ১০০% গ্যারান্টি',
    badge: 'দ্রুত ডেলিভারি',
    buttonText: 'এখনই কিনুন',
    categoryLink: 'ALL',
    desktopImageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1600&auto=format&fit=crop',
    mobileImageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800&auto=format&fit=crop',
    isActive: true,
    order: 4,
  },
  {
    id: 'default-5',
    title: 'নিউ এরাইভাল গর্জিয়াস ড্রেস',
    subtitle: 'আধুনিক ট্রেন্ডি ফ্যাশনে নিজের সৌন্দর্য ফুটিয়ে তুলুন সেরা দামে',
    badge: 'নিউ কালেকশন',
    buttonText: 'কালেকশন দেখুন',
    categoryLink: 'OTHERS',
    desktopImageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1600&auto=format&fit=crop',
    mobileImageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=800&auto=format&fit=crop',
    isActive: true,
    order: 5,
  },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction >= 0 ? '99.5%' : '-99.5%',
    zIndex: 2,
  }),
  center: {
    x: '0%',
    zIndex: 2,
  },
  exit: (direction: number) => ({
    x: direction >= 0 ? '-99.5%' : '99.5%',
    zIndex: 1,
  }),
};

export default function BannerSlider({ banners, autoSlideInterval = 4000, onSelectCategory }: BannerSliderProps) {
  // Filter active banners or fallback to default 5 banners
  const activeBanners = (banners && banners.filter(b => b.isActive).length > 0)
    ? banners.filter(b => b.isActive).sort((a, b) => a.order - b.order)
    : DEFAULT_BANNERS;

  const [[currentIndex, direction], setSlide] = useState<[number, number]>([0, 1]);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  const safeIndex = activeBanners.length > 0 ? currentIndex % activeBanners.length : 0;

  // Preload all active banner images so incoming slides never flash black on mobile/slow networks
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMobileViewport = window.innerWidth < 640;

    activeBanners.forEach((banner) => {
      const primarySrc = isMobileViewport && banner.mobileImageUrl
        ? banner.mobileImageUrl
        : banner.desktopImageUrl;
      if (primarySrc) {
        const img = new Image();
        img.referrerPolicy = 'no-referrer';
        img.src = primarySrc;
      }
      if (banner.desktopImageUrl && banner.desktopImageUrl !== primarySrc) {
        const desktopImg = new Image();
        desktopImg.referrerPolicy = 'no-referrer';
        desktopImg.src = banner.desktopImageUrl;
      }
    });
  }, [activeBanners]);

  // Auto slide loop - continuously slides right-to-left without dark gap
  useEffect(() => {
    if (activeBanners.length <= 1) return;

    const timer = setInterval(() => {
      setSlide(([prev]) => [(prev + 1) % activeBanners.length, 1]);
    }, autoSlideInterval);

    return () => clearInterval(timer);
  }, [activeBanners.length, autoSlideInterval, safeIndex]);

  const handleNext = () => {
    if (activeBanners.length <= 1) return;
    setSlide(([prev]) => [(prev + 1) % activeBanners.length, 1]);
  };

  const handlePrev = () => {
    if (activeBanners.length <= 1) return;
    setSlide(([prev]) => [(prev - 1 + activeBanners.length) % activeBanners.length, -1]);
  };

  const handleGoToSlide = (idx: number) => {
    if (idx === safeIndex) return;
    setSlide([idx, idx > safeIndex ? 1 : -1]);
  };

  // Touch handlers for mobile swipe (horizontal gesture detection without blocking vertical scroll)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    touchEndX.current = null;
    touchEndY.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distanceX = touchStartX.current - touchEndX.current;
    const distanceY = (touchStartY.current !== null && touchEndY.current !== null)
      ? Math.abs(touchStartY.current - touchEndY.current)
      : 0;

    if (Math.abs(distanceX) > distanceY && Math.abs(distanceX) > 35) {
      if (distanceX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
    touchEndY.current = null;
  };

  const currentBanner = activeBanners[safeIndex] || activeBanners[0];

  const handleCtaClick = () => {
    if (onSelectCategory && currentBanner.categoryLink) {
      onSelectCategory(currentBanner.categoryLink);
    } else {
      const el = document.getElementById('products-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="w-full">
      {/* Banner Carousel Container */}
      <div 
        className="relative w-full h-52 sm:h-72 md:h-96 lg:h-[440px] overflow-hidden bg-slate-950 select-none group touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentBanner.id || safeIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { duration: 0.65, ease: [0.32, 0.72, 0, 1] },
            }}
            style={{ willChange: 'transform' }}
            className="absolute inset-0 w-full h-full backface-hidden"
          >
            {/* Mobile Viewport Image */}
            <picture className="w-full h-full block">
              {currentBanner.mobileImageUrl && (
                <source media="(max-width: 639px)" srcSet={currentBanner.mobileImageUrl} />
              )}
              <img
                src={currentBanner.desktopImageUrl}
                alt={currentBanner.title || 'Sera Fashion Banner'}
                loading="eager"
                decoding="sync"
                className="w-full h-full object-cover object-center"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = BANNER_IMAGE;
                }}
              />
            </picture>

            {/* Dark Overlay with Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent flex flex-col justify-end p-4 sm:p-8 md:p-12">
              <div className="max-w-4xl mx-auto w-full text-center space-y-2 sm:space-y-3">
                
                {/* Badge Tag */}
                {currentBanner.badge && (
                  <motion.div
                    initial={{ opacity: 0.9, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="inline-flex items-center px-3.5 py-1 bg-amber-400 text-slate-950 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-full shadow-lg mx-auto"
                  >
                    <span>{currentBanner.badge}</span>
                  </motion.div>
                )}

                {/* Main Heading */}
                <motion.h1
                  initial={{ opacity: 0.9, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="text-xl sm:text-3xl md:text-5xl font-serif text-white font-black drop-shadow-md tracking-tight leading-tight"
                >
                  {currentBanner.title}
                </motion.h1>

                {/* Subtitle */}
                {currentBanner.subtitle && (
                  <motion.p
                    initial={{ opacity: 0.9, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="text-amber-200 text-xs sm:text-sm md:text-base font-sans font-semibold max-w-2xl mx-auto drop-shadow-sm line-clamp-2"
                  >
                    {currentBanner.subtitle}
                  </motion.p>
                )}

                {/* CTA Button */}
                <motion.div
                  initial={{ opacity: 0.95, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="pt-1 sm:pt-2"
                >
                  <button
                    onClick={handleCtaClick}
                    className="inline-flex items-center gap-2 px-5 py-2 sm:px-6 sm:py-2.5 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white rounded-full text-xs sm:text-sm font-extrabold uppercase tracking-wider shadow-xl shadow-rose-900/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <ShoppingBag size={15} />
                    <span>{currentBanner.buttonText || 'অর্ডার করুন'}</span>
                  </button>
                </motion.div>

              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows for Desktop */}
        {activeBanners.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-950/60 hover:bg-rose-600 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-lg hidden sm:flex z-10"
              aria-label="Previous Banner"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-950/60 hover:bg-rose-600 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-lg hidden sm:flex z-10"
              aria-label="Next Banner"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}

        {/* Pagination Dots */}
        {activeBanners.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 pointer-events-auto">
            {activeBanners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleGoToSlide(idx)}
                className={`transition-all rounded-full cursor-pointer ${
                  safeIndex === idx
                    ? 'w-6 h-2 bg-amber-400'
                    : 'w-2 h-2 bg-white/50 hover:bg-white'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sub Header Card: Trust Highlights */}
      <div className="max-w-4xl mx-auto px-4 -mt-4 relative z-10">
        <div className="bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-amber-100 shadow-xl flex items-center justify-around gap-2 text-center">
          <div className="flex items-center gap-2 text-slate-800">
            <Truck size={18} className="text-rose-600 shrink-0" />
            <div className="text-left">
              <span className="block text-xs font-black">ক্যাশ অন ডেলিভারি</span>
              <span className="block text-[9px] text-gray-500 font-bold">সারা বাংলাদেশে দ্রুত হোম ডেলিভারি</span>
            </div>
          </div>

          <div className="h-8 w-px bg-gray-200" />

          <div className="flex items-center gap-2 text-slate-800">
            <ShieldCheck size={18} className="text-amber-500 shrink-0" />
            <div className="text-left">
              <span className="block text-xs font-black">১০০% প্রিমিয়াম কোয়ালিটি</span>
              <span className="block text-[9px] text-gray-500 font-bold">অরিজিনাল ফেব্রিক গ্যারান্টি</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
