import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, X, Volume2, VolumeX, ArrowRight, ShieldCheck, 
  Activity, Clock, MapPin, BellRing
} from 'lucide-react';
import { getAllProducts } from '../services/productService';
import { getAllOrders } from '../services/orderService';
import { Product, Order, BrandSettings } from '../types';

// Fallback verified Bangladeshi locations & names (used only when data source is 'mixed' or demo fallback)
const FALLBACK_LOCATIONS = [
  'মিরপুর, ঢাকা', 'ধানমন্ডি, ঢাকা', 'উত্তরা, ঢাকা', 'গুলশান, ঢাকা', 
  'মোহাম্মদপুর, ঢাকা', 'চট্টগ্রাম সদর', 'সিলেট সদর', 'রাজশাহী সদর', 
  'খুলনা', 'বগুড়া', 'কুমিল্লা', 'গাজীপুর', 'নারায়ণগঞ্জ', 'রংপুর'
];

const FALLBACK_NAMES = [
  'ফাতিমা বেগম', 'তাসনিম খান', 'নুসরাত জাহান', 'সানজিদা ইসলাম', 
  'শারমিন আক্তার', 'জান্নাতুল ফেরদৌস', 'মালিহা চৌধুরী', 'তাহমিনা আক্তার',
  'রুকসানা পারভীন', 'সুমাইয়া রহমান', 'ফারজানা হক', 'মেহজাবিন আলম'
];

interface NotificationData {
  id: string;
  customerName: string;
  location: string;
  timeAgo: string;
  product: Product;
  isRealOrder?: boolean;
}

interface SocialProofPopupProps {
  onSelectProduct?: (product: Product) => void;
  cartLength?: number;
  enabled?: boolean;
  brandSettings?: BrandSettings | null;
}

export default function SocialProofPopup({ 
  onSelectProduct, 
  cartLength = 0, 
  enabled = true,
  brandSettings 
}: SocialProofPopupProps) {
  const [activeSettings, setActiveSettings] = useState<BrandSettings | null>(() => {
    if (brandSettings) return brandSettings;
    try {
      const cached = localStorage.getItem('brand_settings');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return null;
  });

  useEffect(() => {
    if (brandSettings) {
      setActiveSettings(brandSettings);
    }
  }, [brandSettings]);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) {
        setActiveSettings(e.detail);
      } else {
        try {
          const cached = localStorage.getItem('brand_settings');
          if (cached) setActiveSettings(JSON.parse(cached));
        } catch (err) {}
      }
    };
    window.addEventListener('brand_settings_updated', handleUpdate);
    return () => window.removeEventListener('brand_settings_updated', handleUpdate);
  }, []);

  // Config from Admin BrandSettings
  const isNotificationEnabled = enabled && 
    activeSettings?.orderNotificationEnabled !== false && 
    activeSettings?.orderNotificationDisplayMode !== 'disabled';
  
  const displayMode = activeSettings?.orderNotificationDisplayMode || 'popup_and_circle'; // 'popup_and_circle' | 'circle_badge_only' | 'disabled'
  const dataSource = activeSettings?.orderNotificationDataSource || 'only_real'; // 'only_real' | 'mixed'
  const displayDurationMs = (activeSettings?.orderNotificationDuration || 5) * 1000;
  const loopIntervalMs = (activeSettings?.orderNotificationInterval || 15) * 1000;
  const notificationSize = activeSettings?.orderNotificationSize || 'compact'; // 'compact' | 'standard'

  const [products, setProducts] = useState<Product[]>([]);
  const [realOrders, setRealOrders] = useState<Order[]>([]);
  const [currentNotification, setCurrentNotification] = useState<NotificationData | null>(null);
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [isFeedOpen, setIsFeedOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);
  const [progress, setProgress] = useState(100);
  const [activityHistory, setActivityHistory] = useState<NotificationData[]>([]);
  const [isPulseActive, setIsPulseActive] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Soft subtle luxury notification chime (Web Audio API)
  const playSubtleChime = () => {
    if (!soundEnabled || !isNotificationEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(987.77, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // Audio autoplay policy
    }
  };

  // Helper to construct a NotificationData from a real Order
  const buildNotificationFromOrder = (order: Order, prods: Product[]): NotificationData | null => {
    if (!order || !order.customerName) return null;
    
    // Find matching product
    let matchedProduct: Product | undefined;
    if (order.productId) {
      matchedProduct = prods.find(p => p.id === order.productId);
    }
    if (!matchedProduct && order.items && order.items.length > 0) {
      const firstItem = order.items[0];
      matchedProduct = prods.find(p => p.id === firstItem.productId);
    }
    if (!matchedProduct && prods.length > 0) {
      matchedProduct = prods[0];
    }
    if (!matchedProduct) return null;

    // Clean location
    let location = 'ঢাকা';
    if (order.district) {
      location = order.upazila ? `${order.upazila}, ${order.district}` : order.district;
    } else if (order.address) {
      const parts = order.address.split(',');
      location = parts[parts.length - 1].trim() || 'বাংলাদেশ';
    }

    return {
      id: order.id || `order-${Date.now()}`,
      customerName: order.customerName,
      location,
      timeAgo: 'এইমাত্র',
      product: matchedProduct,
      isRealOrder: true
    };
  };

  // 1. Initial product and real order loading
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getAllProducts(true),
      getAllOrders(false)
    ]).then(([prods, orders]) => {
      if (!isMounted) return;
      if (prods && prods.length > 0) {
        setProducts(prods);
      }
      if (orders && orders.length > 0) {
        setRealOrders(orders);
        
        // Populate feed with real customer orders
        const realFeed: NotificationData[] = [];
        orders.slice(0, 15).forEach((ord, idx) => {
          const item = buildNotificationFromOrder(ord, prods || []);
          if (item) {
            item.timeAgo = idx === 0 ? 'এইমাত্র' : `${(idx + 1) * 3} মিনিট আগে`;
            realFeed.push(item);
          }
        });
        
        if (realFeed.length > 0) {
          setActivityHistory(realFeed);
          setCurrentNotification(realFeed[0]);
          setUnreadCount(Math.min(realFeed.length, 9));
        }
      } else if (prods && prods.length > 0) {
        // Fallback synthetic feed so notifications are immediately active
        const fallbackFeed: NotificationData[] = prods.slice(0, 8).map((p, idx) => ({
          id: `demo-${idx}`,
          customerName: FALLBACK_NAMES[idx % FALLBACK_NAMES.length],
          location: FALLBACK_LOCATIONS[idx % FALLBACK_LOCATIONS.length],
          timeAgo: idx === 0 ? 'এইমাত্র' : `${(idx + 1) * 3} মিনিট আগে`,
          product: p,
          isRealOrder: false
        }));
        setActivityHistory(fallbackFeed);
        setCurrentNotification(fallbackFeed[0]);
        setUnreadCount(Math.min(fallbackFeed.length, 5));
      }
    }).catch(err => console.warn("Error loading social proof data:", err));

    return () => {
      isMounted = false;
    };
  }, [dataSource]);

  // 2. Real-time Live Order Listener (Fires when ANY real customer places an order on site)
  useEffect(() => {
    const handleLiveOrder = (e: any) => {
      const order = e.detail;
      if (!order) return;

      const newNotif = buildNotificationFromOrder(order, products);
      if (!newNotif) return;

      setRealOrders(prev => [order, ...prev]);
      setActivityHistory(prev => [newNotif, ...prev.slice(0, 14)]);
      setCurrentNotification(newNotif);
      setUnreadCount(prev => Math.min(prev + 1, 9));

      // Trigger pop if display mode allows
      triggerNotificationPresentation(newNotif);
    };

    window.addEventListener('sera_live_order_placed', handleLiveOrder);
    return () => {
      window.removeEventListener('sera_live_order_placed', handleLiveOrder);
    };
  }, [products, displayMode, isNotificationEnabled]);

  // 3. Periodic natural social proof trigger loop
  useEffect(() => {
    if (!isNotificationEnabled || products.length === 0) return;

    // Initial appearance after 4 seconds
    const initialTimer = setTimeout(() => {
      pickAndTriggerNextOrder();
    }, 4000);

    const scheduleNext = () => {
      timerRef.current = setTimeout(() => {
        pickAndTriggerNextOrder();
        scheduleNext();
      }, loopIntervalMs);
    };

    scheduleNext();

    return () => {
      clearTimeout(initialTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isNotificationEnabled, products, realOrders, dataSource, displayMode, loopIntervalMs]);

  const pickAndTriggerNextOrder = () => {
    if (!isNotificationEnabled || isFeedOpen) return;

    // Don't auto-pop if user is typing in form inputs
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      return;
    }

    let nextNotif: NotificationData | null = null;

    if (dataSource === 'only_real' && realOrders.length > 0) {
      // ONLY SHOW REAL ORDERS (when available)
      const randomOrder = realOrders[Math.floor(Math.random() * realOrders.length)];
      nextNotif = buildNotificationFromOrder(randomOrder, products);
      if (nextNotif) {
        const timeStamps = ['এইমাত্র', '১ মিনিট আগে', '২ মিনিট আগে', '৩ মিনিট আগে', '৫ মিনিট আগে'];
        nextNotif.timeAgo = timeStamps[Math.floor(Math.random() * timeStamps.length)];
      }
    } else {
      // MIXED or Fallback when store has no real orders yet: Blend real orders with products
      if (realOrders.length > 0 && Math.random() > 0.4) {
        const randomOrder = realOrders[Math.floor(Math.random() * realOrders.length)];
        nextNotif = buildNotificationFromOrder(randomOrder, products);
      } else if (products.length > 0) {
        const randomProd = products[Math.floor(Math.random() * products.length)];
        if (randomProd) {
          nextNotif = {
            id: Math.random().toString(36).substring(2, 9),
            customerName: FALLBACK_NAMES[Math.floor(Math.random() * FALLBACK_NAMES.length)],
            location: FALLBACK_LOCATIONS[Math.floor(Math.random() * FALLBACK_LOCATIONS.length)],
            timeAgo: 'এইমাত্র',
            product: randomProd,
            isRealOrder: false
          };
        }
      }
    }

    if (nextNotif) {
      setCurrentNotification(nextNotif);
      setActivityHistory(prev => [nextNotif!, ...prev.slice(0, 14)]);
      triggerNotificationPresentation(nextNotif);
    }
  };

  const triggerNotificationPresentation = (notif: NotificationData) => {
    setIsPulseActive(true);
    setTimeout(() => setIsPulseActive(false), 2000);

    // If Admin set displayMode === 'circle_badge_only', DO NOT open popup card!
    if (displayMode === 'circle_badge_only') {
      setIsCardOpen(false);
      return;
    }

    // Otherwise popup card is opened in Ultra-Compact mode
    setIsCardOpen(true);
    setProgress(100);
    playSubtleChime();

    const intervalTime = 50;
    const step = (intervalTime / displayDurationMs) * 100;

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
          setIsCardOpen(false);
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);
  };

  const handleDismissCard = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsCardOpen(false);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
  };

  const handleToggleCircle = () => {
    if (isCardOpen) {
      setIsFeedOpen(true);
      setIsCardOpen(false);
    } else {
      if (displayMode === 'circle_badge_only') {
        // If mode is circle-only, clicking circle directly opens full live activity feed
        setIsFeedOpen(true);
      } else {
        // In popup mode, clicking expands current notification card
        if (currentNotification) {
          triggerNotificationPresentation(currentNotification);
        } else {
          setIsFeedOpen(true);
        }
      }
    }
  };

  // If master disabled, render nothing
  if (!isNotificationEnabled) return null;

  // Smart responsive vertical offset so it stacks above Facebook button and mobile bar
  const bottomPositionClass = cartLength > 0 
    ? 'bottom-[154px] sm:bottom-[164px]' 
    : 'bottom-[80px] sm:bottom-[88px]';

  return (
    <>
      {/* ========================================================================= */}
      {/* RIGHT-SIDE LUXURY CIRCULAR NOTIFICATION SYSTEM                            */}
      {/* ========================================================================= */}
      <div 
        className={`fixed right-3 sm:right-6 ${bottomPositionClass} z-[120] pointer-events-none flex items-center justify-end select-none transition-all duration-300`}
      >
        <div className="relative flex items-center justify-end gap-2">
          {/* 1. ULTRA-COMPACT SLIM NOTIFICATION CARD (BLOSSOMS OUT TO THE LEFT) */}
          <AnimatePresence>
            {isCardOpen && currentNotification && displayMode === 'popup_and_circle' && (
              <motion.div
                initial={{ opacity: 0, x: 25, scale: 0.92 }}
                animate={{ 
                  opacity: 1, 
                  x: 0, 
                  scale: 1,
                  transition: { type: "spring", stiffness: 460, damping: 30 } 
                }}
                exit={{ 
                  opacity: 0, 
                  x: 20, 
                  scale: 0.94, 
                  transition: { duration: 0.18, ease: "easeOut" } 
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 60 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 35) handleDismissCard();
                }}
                className={`pointer-events-auto relative max-w-[calc(100vw-80px)] rounded-2xl overflow-hidden bg-gradient-to-br from-[#0d1322]/98 via-[#090d18]/98 to-[#05070d]/98 border border-amber-400/40 shadow-[0_8px_24px_rgba(0,0,0,0.65)] backdrop-blur-xl text-white transition-all ${
                  notificationSize === 'compact' 
                    ? 'w-[180px] sm:w-[210px] p-1.5' 
                    : 'w-[225px] sm:w-[260px] p-2 sm:p-2.5'
                }`}
              >
                {/* Top Luxury Golden Shimmer Line */}
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-amber-400 via-rose-500 to-amber-200" />

                <div 
                  onClick={() => {
                    if (onSelectProduct && currentNotification.product) {
                      onSelectProduct(currentNotification.product);
                      handleDismissCard();
                    }
                  }}
                  className="flex items-center gap-1.5 cursor-pointer group"
                >
                  {/* Compact Circular Product Thumbnail */}
                  <div className={`relative shrink-0 rounded-full overflow-hidden p-[1.5px] bg-gradient-to-tr from-amber-400 to-rose-500 shadow-md group-hover:scale-105 transition-transform ${
                    notificationSize === 'compact' ? 'w-7 h-7 sm:w-8 sm:h-8' : 'w-9 h-9 sm:w-10 sm:h-10'
                  }`}>
                    <img 
                      src={currentNotification.product.imageUrl} 
                      alt={currentNotification.product.title}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>

                  {/* Compact Text Block (Ultra-clean 2 rows) */}
                  <div className="flex-1 min-w-0 pr-2.5">
                    {/* Row 1: Green Live Dot + Customer Name + District */}
                    <div className="flex items-center gap-1 leading-none truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span className={`font-black text-amber-300 truncate ${notificationSize === 'compact' ? 'text-[9.5px]' : 'text-[11px]'}`}>
                        {currentNotification.customerName}
                      </span>
                      <span className={`text-slate-400 font-normal truncate ${notificationSize === 'compact' ? 'text-[8.5px]' : 'text-[9px]'}`}>
                        ({currentNotification.location})
                      </span>
                    </div>

                    {/* Row 2: Product Name + Price */}
                    <div className="flex items-center justify-between gap-1 mt-1 leading-none">
                      <span className={`text-slate-200 font-medium truncate ${notificationSize === 'compact' ? 'text-[9px] max-w-[85px] sm:max-w-[110px]' : 'text-[10px] max-w-[105px] sm:max-w-[130px]'}`}>
                        {currentNotification.product.title}
                      </span>
                      <span className={`font-black text-amber-400 font-mono shrink-0 ${notificationSize === 'compact' ? 'text-[9.5px]' : 'text-[10.5px]'}`}>
                        ৳{currentNotification.product.price.toLocaleString('en-US')}
                      </span>
                    </div>
                  </div>

                  {/* Tiny Close Cross Button */}
                  <button
                    type="button"
                    onClick={handleDismissCard}
                    className="absolute top-1 right-1 p-0.5 text-slate-400 hover:text-rose-400 rounded transition cursor-pointer"
                    title="বন্ধ করুন"
                  >
                    <X size={10} />
                  </button>
                </div>

                {/* Bottom Countdown Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-white/10">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-emerald-400 transition-all duration-75 ease-linear"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 2. RIGHT-SIDE CIRCULAR LUXURY NOTIFICATION ORB */}
          <div className="relative pointer-events-auto">
            {/* Live radar ripple wave when active or new order arrives */}
            {(isPulseActive || isCardOpen) && (
              <span className="absolute inset-0 rounded-full bg-amber-400/35 animate-ping pointer-events-none" />
            )}

            <motion.button
              type="button"
              onClick={handleToggleCircle}
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.08 }}
              className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-full p-[2px] transition-all duration-300 shadow-[0_8px_22px_rgba(245,158,11,0.4)] cursor-pointer group touch-manipulation ${
                isCardOpen 
                  ? 'bg-gradient-to-tr from-rose-500 via-amber-400 to-emerald-400 ring-2 ring-amber-400/50' 
                  : 'bg-gradient-to-tr from-amber-400 via-amber-500 to-rose-500 hover:shadow-[0_10px_26px_rgba(245,158,11,0.55)]'
              }`}
              title="কাস্টমার অর্ডার নোটিফিকেশন"
            >
              {/* Inner Circle with Obsidian Velvet Backdrop */}
              <div className="w-full h-full rounded-full bg-[#080c16] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.25),transparent_70%)]" />

                {/* Icon */}
                <div className="relative z-10 flex items-center justify-center">
                  {isCardOpen ? (
                    <ShoppingBag size={18} className="text-amber-300 animate-bounce" />
                  ) : (
                    <BellRing size={18} className="text-amber-400 group-hover:rotate-12 transition-transform duration-300" />
                  )}
                </div>

                {/* Glowing Live Green Dot */}
                <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              </div>

              {/* Notification Count Badge on Top-Right Corner */}
              <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 bg-gradient-to-r from-rose-600 to-amber-500 text-white font-black text-[8.5px] rounded-full border-2 border-[#080c16] flex items-center justify-center shadow-md animate-pulse">
                {unreadCount > 0 ? unreadCount : '১'}
              </span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SLIDE-OUT LIVE ACTIVITY FEED MODAL / DRAWER (WHEN CLICKED)             */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isFeedOpen && (
          <div className="fixed inset-0 z-[200] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFeedOpen(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-xs cursor-pointer"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full max-w-md bg-[#090d16] border-l border-amber-500/30 text-white h-full flex flex-col shadow-2xl z-10 overflow-hidden"
            >
              {/* Drawer Top Header */}
              <div className="p-4 border-b border-white/10 bg-[#0d1322]/95 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 p-[1.5px] flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-[#0d1322] flex items-center justify-center text-amber-400">
                      <Activity size={16} className="animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-black font-serif text-white tracking-wide flex items-center gap-1.5">
                      লাইভ কাস্টমার অর্ডার ফিড
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    </h3>
                    <p className="text-[10px] text-slate-400">সারাদেশে আমাদের রিয়েলটাইম গ্রাহক অর্ডার</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-amber-400 transition cursor-pointer"
                    title={soundEnabled ? "সাউন্ড বন্ধ করুন" : "সাউন্ড চালু করুন"}
                  >
                    {soundEnabled ? <Volume2 size={16} className="text-amber-400" /> : <VolumeX size={16} />}
                  </button>

                  <button
                    onClick={() => setIsFeedOpen(false)}
                    className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Realtime Stats Bar */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-900/60 border-b border-white/5 text-center shrink-0">
                <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 block font-medium">আজকের অর্ডার</span>
                  <span className="text-sm font-black text-amber-300 font-mono">
                    {Math.max(realOrders.length, 12)}+ টি
                  </span>
                </div>
                <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 block font-medium">সন্তুষ্টি রেট</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">৯৯.৪%</span>
                </div>
                <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 block font-medium">হোম ডেলিভারি</span>
                  <span className="text-sm font-black text-rose-300 font-mono">৬৪ জেলা</span>
                </div>
              </div>

              {/* Timeline Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
                  <span>সাম্প্রতিক অর্ডারসমূহ ({activityHistory.length})</span>
                  <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> লাইভ আপডেট
                  </span>
                </div>

                {activityHistory.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <ShoppingBag className="mx-auto mb-2 opacity-40" size={32} />
                    <p className="text-xs font-semibold">কোনো অর্ডার পাওয়া যায়নি</p>
                  </div>
                ) : (
                  activityHistory.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-amber-500/40 transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-11 h-11 rounded-full overflow-hidden shrink-0 border-2 border-amber-400/40">
                          <img 
                            src={item.product.imageUrl} 
                            alt={item.product.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white truncate">
                              {item.customerName}
                            </span>
                            <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-bold shrink-0">
                              {item.isRealOrder !== false ? 'Verified Real' : 'Verified'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                            <MapPin size={9} className="text-rose-400 shrink-0" /> {item.location} • <Clock size={9} className="text-amber-400 shrink-0" /> {item.timeAgo}
                          </p>
                          <p className="text-[11px] text-amber-200/90 font-medium truncate mt-0.5">
                            {item.product.title} • ৳{item.product.price.toLocaleString('en-US')}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (onSelectProduct) {
                            onSelectProduct(item.product);
                            setIsFeedOpen(false);
                            handleDismissCard();
                          }
                        }}
                        className="shrink-0 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:brightness-110 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow"
                      >
                        অর্ডার <ArrowRight size={10} />
                      </button>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-3.5 border-t border-white/10 bg-[#0d1322] flex items-center justify-between text-[11px] text-slate-400 shrink-0">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <ShieldCheck size={14} /> ১০০% ক্যাশ অন ডেলিভারি
                </span>
                <span className="text-[10px] text-slate-500">
                  Sera Fashion
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
