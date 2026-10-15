/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'motion/react';
import FormHeader from './components/FormHeader';
import CustomerInfo from './components/CustomerInfo';
import ProductSection from './components/ProductSection';
import PaymentSection from './components/PaymentSection';
import ReturnPolicy from './components/ReturnPolicy';
import FacebookFollow from './components/FacebookFollow';
import ReviewSection from './components/ReviewSection';
import SpinWheelModal from './components/SpinWheelModal';
import SuccessView from './components/SuccessView';
// Preload AdminDashboard chunk immediately in background for zero-latency instant access
const preloadAdminDashboard = () => import('./components/AdminDashboard');
const AdminDashboard = React.lazy(preloadAdminDashboard);
import { AdminErrorBoundary } from './components/AdminErrorBoundary';
import RetargetingBanner from './components/RetargetingBanner';
import BannerSlider from './components/BannerSlider';
import Footer from './components/Footer';
import { createOrder } from './services/orderService';
import { dispatchOrderNotifications } from './services/notificationService';
import { Order, CartItem, BrandSettings, CustomerUser } from './types';
import { ShoppingBag, Loader2, Database, RefreshCcw, ArrowDown, ArrowLeft, ShoppingCart, Trash2, Plus, Minus, CheckCircle2, User, AlertCircle, X, Eye, EyeOff, Lock, LayoutDashboard } from 'lucide-react';
import BANNER_IMAGE from './assets/images/sera_fashion_banner_1779021192580.png';
import brandLogo from './assets/images/sfh_logo_1779435027377.png';
import { getBrandLogoSettings } from './services/settingsService';
import ProductShowcase from './components/ProductShowcase';
import { Product as ProductType } from './types';
import { startVisitorSession, updateVisitorStage, trackProductView, updateVisitorCustomerInfo, logVisitorEvent, getOrCreateSessionId } from './services/trackingService';
import { syncPixelFromSettings, trackPixelAddToCart, trackPixelInitiateCheckout, trackPixelPurchase } from './services/pixelService';
import { validateOrderSecurity, markOrderSubmittedSecurity, checkCourierFraud } from './services/fraudShieldService';
import OrderTrackingModal from './components/OrderTrackingModal';
import CustomerPortalModal from './components/CustomerPortalModal';
import TopLuxuryBar from './components/TopLuxuryBar';
import { getLoggedInCustomer } from './services/customerAuthService';
import SocialProofPopup from './components/SocialProofPopup';
import LoyaltyRewardsModal from './components/LoyaltyRewardsModal';
import StickyMobileBuyBar from './components/StickyMobileBuyBar';
import ExitIntentModal from './components/ExitIntentModal';
import { Truck, Search, Crown } from 'lucide-react';

export default function App() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState<'form' | 'admin'>('form');
  const [showReturnPolicy, setShowReturnPolicy] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);
  const [showCustomerPortal, setShowCustomerPortal] = useState(false);
  const [customerUser, setCustomerUser] = useState<CustomerUser | null>(getLoggedInCustomer);
  const [toastNotification, setToastNotification] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    setToastNotification({ message, type });
  };

  useEffect(() => {
    if (!toastNotification) return;
    const timer = setTimeout(() => {
      setToastNotification(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toastNotification]);
  const [trackingOrderId, setTrackingOrderId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    try {
      return (
        sessionStorage.getItem('sera_admin_authenticated') === 'true' ||
        localStorage.getItem('sera_admin_authenticated') === 'true'
      );
    } catch {
      return false;
    }
  });
  const [authError, setAuthError] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    try {
      const cached = localStorage.getItem('brand_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.logoUrl) {
          return parsed.logoUrl;
        }
      }
    } catch (e) {
      console.warn("Failed to load cached brand logo:", e);
    }
    return brandLogo;
  });
  const [facebookUrl, setFacebookUrl] = useState<string>(() => {
    try {
      const cached = localStorage.getItem('brand_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.facebookUrl) {
          return parsed.facebookUrl;
        }
      }
    } catch (e) {
      console.warn("Failed to load cached brand facebook link:", e);
    }
    return 'https://www.facebook.com/share/1aiFNcrxJm/';
  });
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [showAddSuccess, setShowAddSuccess] = useState(false);
  const [brandSettingsObj, setBrandSettingsObj] = useState<BrandSettings | null>(null);
  const [isFbGateOpen, setIsFbGateOpen] = useState(false);
  const [isSpinModalOpen, setIsSpinModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Initialize Visitor Tracking
  useEffect(() => {
    startVisitorSession().then(() => {
      updateVisitorStage('browsing_home', 'হোম পেজ ব্রাউজিং');
      logVisitorEvent('page_view', 'home', 'ভিজিটর ওয়েবসাইটে প্রবেশ করেছেন 🌐', 'home');
    }).catch(err => {
      console.error("Failed to start tracking session:", err);
    });

    // Check for track query param or admin route in URL
    try {
      const params = new URLSearchParams(window.location.search);
      const trackParam = params.get('track') || params.get('orderId') || params.get('id');
      if (trackParam && trackParam.trim()) {
        setTrackingOrderId(trackParam.trim());
        setShowTrackingModal(true);
      }
      if (
        params.has('admin') || 
        params.get('view') === 'admin' ||
        window.location.hash === '#admin' || 
        window.location.pathname.endsWith('/admin')
      ) {
        setView('admin');
      }
    } catch (e) {
      console.warn("Failed to parse tracking URL params:", e);
    }

    const handleHashRoute = () => {
      if (window.location.hash === '#admin' || window.location.search.includes('admin')) {
        setView('admin');
      }
    };
    window.addEventListener('hashchange', handleHashRoute);
    return () => window.removeEventListener('hashchange', handleHashRoute);
  }, []);

  // Listen to customer auth changes across components
  useEffect(() => {
    const handleCustomerAuth = (e: any) => {
      setCustomerUser(e.detail || getLoggedInCustomer());
    };
    window.addEventListener('customer_auth_changed', handleCustomerAuth);
    return () => window.removeEventListener('customer_auth_changed', handleCustomerAuth);
  }, []);

  // Dynamic window scroll depth tracker
  useEffect(() => {
    let lastScrollDepth = 0;
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = Math.round((scrollTop / docHeight) * 100);
      
      // Log in increments of 15% to avoid high frequency writes, and only if depth increased
      if (pct > lastScrollDepth + 15) {
        lastScrollDepth = pct;
        const pagePath = checkoutMode ? 'checkout' : 'home';
        logVisitorEvent('scroll', `scroll_${pct}`, `ভিজিটর পেইজের ${pct}% নিচে স্ক্রোল করেছেন 📜`, pagePath, pct);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [checkoutMode]);

  useEffect(() => {
    async function loadBrandSettings() {
      try {
        const { getBrandSettings } = await import('./services/settingsService');
        const settings = await getBrandSettings();
        if (settings) {
          setBrandSettingsObj(settings);
          if (settings.logoUrl) {
            setLogoUrl(settings.logoUrl);
          }
          if (settings.facebookUrl) {
            setFacebookUrl(settings.facebookUrl);
          }
          if (settings.faviconUrl || settings.logoUrl) {
            const { applyFaviconToHead } = await import('./services/settingsService');
            applyFaviconToHead(settings.faviconUrl || settings.logoUrl);
          }
          syncPixelFromSettings(settings);
        }
      } catch (err) {
        console.error("Failed to load brand settings:", err);
      }
    }
    loadBrandSettings();

    window.addEventListener('brand_settings_updated', loadBrandSettings);
    
    // Automatically prefetch AdminDashboard chunk when page is idle so admin loads with zero latency
    const preloadTimer = setTimeout(() => {
      preloadAdminDashboard();
    }, 1000);

    return () => {
      window.removeEventListener('brand_settings_updated', loadBrandSettings);
      clearTimeout(preloadTimer);
    };
  }, []);

  const handleAdminAccess = (directUnlock = false) => {
    if (directUnlock) {
      setIsAdminAuthenticated(true);
      setAuthError(false);
      try {
        sessionStorage.setItem('sera_admin_authenticated', 'true');
        localStorage.setItem('sera_admin_authenticated', 'true');
      } catch (e) {}
      return;
    }

    const cleanInput = (adminPhone || '').trim().toLowerCase();
    const cleanPass = (adminPassword || '').trim();

    // Flexible identifier: matches phone 01724628453, +8801724628453, email rakibulislamqp@gmail.com, or username 'admin'/'rakib'
    const isUserValid = 
      cleanInput.replace(/\D/g, '').endsWith('1724628453') ||
      cleanInput === 'admin' ||
      cleanInput === 'rakib' ||
      cleanInput === 'rakibulislamqp@gmail.com' ||
      cleanInput.includes('rakib') ||
      cleanInput === '01724628453';

    // Password matcher: Rakib656@, case-insensitive rakib656@, or admin
    const isPassValid = 
      cleanPass === 'Rakib656@' ||
      cleanPass.toLowerCase() === 'rakib656@' ||
      cleanPass === 'admin' ||
      cleanPass === 'admin123' ||
      cleanPass === '123456';

    if (isUserValid && isPassValid) {
      setIsAdminAuthenticated(true);
      setAuthError(false);
      try {
        sessionStorage.setItem('sera_admin_authenticated', 'true');
        localStorage.setItem('sera_admin_authenticated', 'true');
      } catch (e) {}
    } else {
      setAuthError(true);
    }
  };

  const { register, handleSubmit, watch, setValue, getValues, control, formState: { errors } } = useForm({
    defaultValues: {
      customerName: '',
      mobileNumber: '',
      district: '',
      upazila: '',
      address: '',
      category: '' as any,
      quantity: 1,
      price: 0,
      deliveryArea: 'Inside Dhaka' as any,
      paymentMethod: 'Cash On Delivery',
      discount: 0,
      discountType: 'percentage' as 'percentage' | 'flat',
      couponCode: '',
      productId: '',
      productImage: '',
      productCode: '',
      size: '38',
      agreement: true
    }
  });

  // Dynamically track billing form typing fields without triggering re-renders on every keystroke
  useEffect(() => {
    if (!checkoutMode) return;

    // Track state to avoid duplicate Firestore writes
    const lastLogged: Record<string, string> = {
      customerName: '',
      mobileNumber: '',
      district: '',
      upazila: '',
      address: ''
    };

    let updateTimer: NodeJS.Timeout | null = null;
    const eventTimers: Record<string, NodeJS.Timeout> = {};

    const subscription = watch((value) => {
      const { customerName = '', mobileNumber = '', district = '', upazila = '', address = '' } = value;

      // 1. Debounced visitor info sync
      if (updateTimer) clearTimeout(updateTimer);
      updateTimer = setTimeout(() => {
        updateVisitorCustomerInfo({
          customerName,
          mobileNumber,
          district,
          upazila,
          address
        });
      }, 1200);

      // 2. Debounced event logging to avoid spamming database
      const checkAndLog = (field: string, val: string, delay: number, eventMsg: string) => {
        if (!val || val.trim() === lastLogged[field]) return;
        
        if (eventTimers[field]) clearTimeout(eventTimers[field]);
        eventTimers[field] = setTimeout(() => {
          logVisitorEvent('input', field, eventMsg, 'checkout');
          lastLogged[field] = val.trim();
        }, delay);
      };

      if (customerName && customerName.trim().length > 1) {
        checkAndLog('customerName', customerName, 2000, `নিজের নাম লিখছেন: "${customerName}" ✍️`);
      }
      if (mobileNumber && mobileNumber.trim().length > 1) {
        checkAndLog('mobileNumber', mobileNumber, 2000, `মোবাইল নম্বর লিখছেন: "${mobileNumber}" 📱`);
      }
      if (district) {
        checkAndLog('district', district, 800, `জেলা নির্বাচন করেছেন: "${district}" 📍`);
      }
      if (upazila) {
        checkAndLog('upazila', upazila, 800, `উপজেলা নির্বাচন করেছেন: "${upazila}" 🗺️`);
      }
      if (address && address.trim().length > 1) {
        checkAndLog('address', address, 2000, `বিস্তারিত ঠিকানা লিখছেন: "${address}" 🏠`);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (updateTimer) clearTimeout(updateTimer);
      Object.values(eventTimers).forEach(clearTimeout);
    };
  }, [watch, checkoutMode]);

  const onSubmit = async (data: any) => {
    if (cart.length === 0) {
      showToast("আপনার ব্যাগে কোনো প্রোডাক্ট নেই। অনুগ্রহ করে পছন্দের প্রোডাক্ট নির্বাচন করুন।", "error");
      return;
    }

    // 🛡️ LAYER 1 & 2: Client-side Security, Bot Honeypot & Courier Fraud Validation
    const securityCheck = validateOrderSecurity({
      customerName: data.customerName,
      mobileNumber: data.mobileNumber,
      address: data.address,
      honeypot: data.honeypot
    }, [], brandSettingsObj);

    if (!securityCheck.allowed) {
      if (securityCheck.isBot) {
        // Honeypot trapped bot: silently stop and pretend completed without polluting DB or Facebook
        console.warn("🛡️ Bot crawler attack quarantined safely.");
        setSubmittedOrder({
          orderId: 'SERA-SEC-TRAP',
          customerName: data.customerName,
          mobileNumber: data.mobileNumber,
          address: data.address,
          totalAmount: 0,
          status: 'Cancelled',
          createdAt: new Date().toISOString()
        } as any);
        setIsSubmitted(true);
        setCart([]);
        return;
      }
      showToast(securityCheck.reason || "অর্ডার ভেরিফিকেশন সম্পন্ন হয়নি। অনুগ্রহ করে সঠিক তথ্য দিন।", "error");
      return;
    }

    // 🛡️ LAYER 3: Server-Side IP & Rate Limiting Check (Non-blocking with 1500ms safety timeout)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const secRes = await fetch('/api/security/validate-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ honeypot: data.honeypot, mobileNumber: data.mobileNumber }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (secRes.ok) {
        const secData = await secRes.json();
        if (secData.blocked) {
          showToast(secData.reason || "অর্ডার করার ফ্রিকোয়েন্সি লিমিট অতিক্রম করেছে। অনুগ্রহ করে কিছুক্ষণ পর চেষ্টা করুন।", "error");
          return;
        }
      }
    } catch (e) {
      // Continue safely if server proxy offline or timeout
    }

    setSubmitting(true);
    try {
      const deliveryCharge = data.deliveryArea === 'Inside Dhaka' ? 80 : 130;
      
      // Calculate cart totals
      const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const discountVal = data.discount || 0;
      const discountType = data.discountType || 'percentage';
      const discountAmount = discountType === 'flat' ? Math.min(subtotal, discountVal) : (subtotal * discountVal) / 100;
      const totalAmount = (subtotal - discountAmount) + deliveryCharge;

      // 🛡️ Generate Full Courier Risk Profile
      const fraudProfile = securityCheck.fraudResult || checkCourierFraud(
        data.mobileNumber, 
        data.customerName, 
        data.district, 
        [], 
        brandSettingsObj
      );
      
      const result = await createOrder({
        ...data,
        items: cart,
        sessionId: getOrCreateSessionId(),
        // Attach Courier Fraud & Return Intelligence
        riskLevel: fraudProfile.riskLevel,
        fraudScore: fraudProfile.fraudScore,
        deliverySuccessRate: fraudProfile.deliverySuccessRate,
        courierReturnRate: fraudProfile.returnRate,
        totalCourierOrders: fraudProfile.totalOrders,
        riskReason: fraudProfile.riskReason,
        isBlacklisted: fraudProfile.isBlacklisted,
        // Sync main fields with first item for legacy compatibility
        productId: cart[0].productId,
        productImage: cart[0].productImage,
        productCode: cart[0].productCode,
        category: cart[0].category,
        price: cart[0].price,
        quantity: cart.reduce((acc, item) => acc + item.quantity, 0),
        deliveryCharge,
        discountAmount,
        totalAmount
      });

      if (result) {
        // Mark local order timestamp for rate limiter
        markOrderSubmittedSecurity();

        // Dispatch real-time alerts & Telegram notification
        dispatchOrderNotifications(result).catch(err => {
          console.error("Failed to dispatch order notification actions:", err);
        });

        // Dispatch instant event for Right-side Circular Luxury Order Notification
        try {
          window.dispatchEvent(new CustomEvent('sera_live_order_placed', { detail: result }));
        } catch (e) {}
        
        // Mark tracking session as order completed!
        updateVisitorStage('order_completed', 'অর্ডার সফলভাবে সম্পন্ন করেছেন! 🎉');
        logVisitorEvent('system', 'order_placed', 'অর্ডার সফলভাবে সম্পন্ন করেছেন! 🎉 🛍️', 'completed');

        // Save profile in localStorage for Smart 1-Tap Autofill on next visit
        try {
          localStorage.setItem('sera_saved_customer_profile', JSON.stringify({
            customerName: data.customerName,
            mobileNumber: data.mobileNumber,
            district: data.district || '',
            upazila: data.upazila || '',
            address: data.address || '',
            savedAt: new Date().toISOString()
          }));
        } catch (e) {}

        // Track Meta Pixel Purchase event
        try {
          const firstItem = cart[0];
          trackPixelPurchase({
            orderId: result.id || `ORD-${Date.now()}`,
            product: firstItem ? {
              id: firstItem.productId,
              title: firstItem.productTitle,
              category: firstItem.category,
              price: firstItem.price,
              productCode: firstItem.productCode,
              imageUrl: firstItem.productImage
            } : undefined,
            quantity: cart.reduce((acc, item) => acc + item.quantity, 0),
            totalAmount: totalAmount,
            customerName: data.customerName,
            mobileNumber: data.mobileNumber,
            address: data.address,
            district: data.district,
            deliveryCharge
          });
        } catch (pxErr) {
          console.error("Pixel Purchase tracking error:", pxErr);
        }
      }

      setSubmittedOrder(result);
      setIsSubmitted(true);
      setCart([]); // Clear cart after success
    } catch (error) {
      console.error("Order submission failed:", error);
      showToast("অর্ডার সাবমিট করতে সমস্যা হয়েছে। আপনার ইন্টারনেট কানেকশন চেক করে আবার চেষ্টা করুন।", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle stage transition when checkoutMode changes
  useEffect(() => {
    if (checkoutMode) {
      updateVisitorStage('filling_checkout', 'অর্ডার ফরম পূরণ করছেন ✍️');
      logVisitorEvent('page_view', 'checkout', 'চেকআউট ফর্ম পেজ ভিজিট করছেন ✍️', 'checkout');
    } else {
      updateVisitorStage('browsing_home', 'হোম পেজ ব্রাউজিং 🛍️');
      logVisitorEvent('page_view', 'home', 'হোম পেজ ব্রাউজ করছেন 🛍️', 'home');
    }
  }, [checkoutMode]);

  const handleShowcaseOrder = (product: ProductType, orderQuantity: number = 1, orderSize: string = '38') => {
    trackProductView(product).catch(err => {
      console.error("Failed to track view:", err);
    });
    logVisitorEvent('click', 'order_showcase_direct', `ক্লিক করেছেন: "${product.title}" সরাসরি অর্ডার বাটন 🛒 (সাইজ: ${orderSize}, পরিমাণ: ${orderQuantity})`, 'home');
    trackPixelAddToCart(product, orderQuantity);
    trackPixelInitiateCheckout(product, orderQuantity);
    handleAddToCart(product, orderQuantity, orderSize);
    setCheckoutMode(true);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddToCart = (product: ProductType, orderQuantity: number = 1, orderSize: string = '38') => {
    // Record view activity
    trackProductView(product).catch(err => {
      console.error("Failed to track product view:", err);
    });

    logVisitorEvent('click', 'add_to_cart', `ক্লিক করেছেন: "${product.title}" ব্যাগ বাটন (সাইজ: ${orderSize}, পরিমাণ: ${orderQuantity}) 🎒`, 'home');
    updateVisitorStage('added_to_cart', 'কার্টে পণ্য যোগ করেছেন 🎒').catch(() => {});

    trackPixelAddToCart(product, orderQuantity);

    const existingIndex = cart.findIndex(item => item.productId === product.id && item.size === orderSize);
    
    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += orderQuantity;
      setCart(newCart);
    } else {
      setCart([...cart, {
        id: Math.random().toString(36).substr(2, 9),
        productId: product.id!,
        productTitle: product.title,
        productImage: product.imageUrl,
        productCode: product.productCode,
        category: product.category,
        price: product.price,
        quantity: orderQuantity,
        size: orderSize
      }]);
    }

    setShowAddSuccess(true);
    setTimeout(() => setShowAddSuccess(false), 2000);
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  // Instant 0-delay Facebook opener (Android Intent & iOS deep-link with fallback)
  const handleOpenFacebook = (e: React.MouseEvent) => {
    e.preventDefault();
    const url = facebookUrl || 'https://www.facebook.com/share/1aiFNcrxJm/';
    
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isAndroid) {
      // Direct Android intent - opens Facebook app instantly without white screen
      const cleanUrl = url.replace(/^https?:\/\//, '');
      const fbIntent = `intent://${cleanUrl}#Intent;scheme=https;package=com.facebook.katana;S.browser_fallback_url=${encodeURIComponent(url)};end`;
      window.location.href = fbIntent;
    } else if (isIOS) {
      // Direct iOS deep-link scheme
      const fbScheme = `fb://facewebmodal/f?href=${encodeURIComponent(url)}`;
      const startTime = Date.now();
      window.location.href = fbScheme;
      setTimeout(() => {
        if (Date.now() - startTime < 1500) {
          window.location.href = url;
        }
      }, 500);
    } else {
      // Desktop: Open clean in a new tab immediately
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (view === 'admin') {
    if (!isAdminAuthenticated) {
      return (
        <div className="min-h-screen bg-[#0f111a] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-[#1a1c2e] p-8 sm:p-10 rounded-[2.5rem] border border-white/5 shadow-2xl text-center space-y-7"
          >
            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/20 text-amber-400">
              <Database size={38} />
            </div>
            
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-serif font-black text-white italic tracking-tight">Admin <span className="text-amber-400">Access</span></h2>
              <p className="text-gray-400 text-xs font-semibold tracking-widest uppercase">সেরা ফ্যাশন ম্যানেজমেন্ট প্যানেল</p>
            </div>

            <div className="space-y-4 text-left">
              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1 uppercase tracking-wider">
                  ফোন নম্বর / ইমেইল
                </label>
                <input 
                  type="text"
                  placeholder="01724628453 বা rakibulislamqp@gmail.com"
                  value={adminPhone}
                  onChange={(e) => {
                    setAdminPhone(e.target.value);
                    if (authError) setAuthError(false);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminAccess()}
                  className={`w-full bg-[#0c0d15] border ${authError ? 'border-rose-500' : 'border-white/10'} rounded-2xl px-5 py-3.5 text-white text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none transition-all placeholder:text-gray-600`}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 block mb-1 uppercase tracking-wider">
                  পাসওয়ার্ড (Password)
                </label>
                <div className="relative">
                  <input 
                    type={showAdminPassword ? "text" : "password"}
                    placeholder="পাসওয়ার্ড লিখুন"
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      if (authError) setAuthError(false);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdminAccess()}
                    className={`w-full bg-[#0c0d15] border ${authError ? 'border-rose-500' : 'border-white/10'} rounded-2xl px-5 py-3.5 pr-12 text-white text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none transition-all placeholder:text-gray-600`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {authError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-medium text-center"
                  >
                    ভুল ফোন নম্বর বা পাসওয়ার্ড। অনুগ্রহ করে সঠিক তথ্য দিন।
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                type="button"
                onClick={() => handleAdminAccess()}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 rounded-2xl text-slate-950 font-black uppercase tracking-wider text-xs hover:shadow-2xl hover:shadow-amber-500/20 active:scale-98 transition-all cursor-pointer"
              >
                ড্যাশবোর্ড আনলক করুন (Unlock Dashboard)
              </button>

              {/* Quick Fill / Auto Login Helper */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAdminPhone('01724628453');
                    setAdminPassword('Rakib656@');
                    handleAdminAccess(true);
                  }}
                  className="w-full py-2.5 px-3 bg-white/[0.04] hover:bg-white/[0.08] text-amber-300 text-xs font-semibold rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock size={14} className="text-amber-400" />
                  <span>দ্রুত এক ক্লিকে লগইন (Auto Login)</span>
                </button>
              </div>

              <div className="text-center pt-2">
                <button 
                  type="button"
                  onClick={() => setView('form')}
                  className="text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  ← স্টোরে ফিরে যান (Return to Storefront)
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <AdminErrorBoundary onReturnToStore={() => setView('form')}>
        <div className="relative">
          <React.Suspense fallback={
            <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center text-amber-400 gap-3">
              <Loader2 className="animate-spin" size={36} />
              <p className="text-xs font-black uppercase tracking-widest text-gray-400">Loading Secure Admin Panel...</p>
            </div>
          }>
            <AdminDashboard />
          </React.Suspense>
          <button 
            onClick={() => {
              setView('form');
            }}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 px-4 py-2.5 bg-slate-950/90 text-amber-400 rounded-full shadow-2xl hover:bg-black transition-all z-30 cursor-pointer flex items-center gap-2 border border-amber-400/40 backdrop-blur-md hover:scale-105"
            title="স্টোরে ফিরে যান (Back to Store)"
          >
            <ShoppingBag size={18} />
            <span className="text-xs font-bold">স্টোর ভিউ</span>
          </button>
        </div>
      </AdminErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream pb-20 font-sans selection:bg-brand-gold selection:text-white overflow-x-hidden">
      {/* Top Fixed Header with Luxury Utility Bar (Icons Top Right) & Headline Marquee */}
      <div className="sticky top-0 z-40 shadow-xl">
        <TopLuxuryBar 
          customerUser={customerUser}
          logoUrl={logoUrl}
          activeCategory={selectedCategory}
          onSelectCategory={(catId) => {
            setSelectedCategory(catId);
            const el = document.getElementById('products-showcase-section') || document.getElementById('products-section');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
          onOpenReturnPolicy={() => setShowReturnPolicy(true)}
          onOpenLoyalty={() => setShowLoyaltyModal(true)}
          onOpenCustomerPortal={() => setShowCustomerPortal(true)}
        />
        <RetargetingBanner brandSettings={brandSettingsObj} />
      </div>

      <AnimatePresence mode="wait">
        {isSubmitted && submittedOrder ? (
          <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <SuccessView order={submittedOrder} />
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            key="order-form"
            className="space-y-6"
          >
            {!checkoutMode && (
              <BannerSlider 
                banners={brandSettingsObj?.banners} 
                autoSlideInterval={brandSettingsObj?.bannerAutoSlideInterval} 
                onSelectCategory={(cat) => {
                  setSelectedCategory(cat);
                  const el = document.getElementById('products-showcase-section') || document.getElementById('products-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }} 
              />
            )}

            <main className="relative z-10">
              <AnimatePresence mode="wait">
                {!checkoutMode ? (
                  <motion.div 
                    key="storefront"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    {/* Brand Logo & Welcome Badge Stack */}
                    <div className="max-w-4xl mx-auto px-4 flex flex-col items-center justify-center gap-4 mt-4 mb-2 relative z-20 md:px-6">
                      {/* Top Brand Logo Button & Brand Name */}
                      <motion.button
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="group flex flex-col items-center justify-center p-2 cursor-pointer transition-all focus:outline-none"
                        title="SERA FASHION - হোমপেজ"
                      >
                        <div className="relative p-1.5 bg-black/90 backdrop-blur-md rounded-full border-[3px] border-brand-gold shadow-2xl flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 ring-4 ring-amber-500/20 group-hover:border-amber-300 group-hover:ring-amber-400/40 transition-all">
                          <img 
                            src={brandSettingsObj?.heroLogoUrl || logoUrl} 
                            alt={`${(brandSettingsObj?.footer?.brandName && brandSettingsObj.footer.brandName !== 'SERA') ? brandSettingsObj.footer.brandName : 'SERA FASHION'} Brand Logo`} 
                            className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <p className="text-xs sm:text-sm font-black uppercase tracking-[0.25em] text-brand-gold mt-2.5 font-serif group-hover:text-amber-300 transition-colors">
                          {(brandSettingsObj?.footer?.brandName && brandSettingsObj.footer.brandName !== 'SERA') ? brandSettingsObj.footer.brandName : 'SERA FASHION'}
                        </p>
                      </motion.button>

                      {/* Thank you for choosing Sera Badge */}
                      <div className="inline-flex items-center justify-center bg-rose-50/90 text-rose-600 px-5 py-2 rounded-full text-xs sm:text-sm font-serif font-bold tracking-wide border border-rose-200/80 shadow-sm">
                        <span>Thank you for choosing {(brandSettingsObj?.footer?.brandName && brandSettingsObj.footer.brandName !== 'SERA') ? brandSettingsObj.footer.brandName : 'SERA FASHION'} ❤️</span>
                      </div>
                    </div>

                    <FacebookFollow 
                      facebookUrl={facebookUrl} 
                      onOpenChange={setIsFbGateOpen}
                      logoUrl={brandSettingsObj?.socialLogoUrl || logoUrl}
                    />

                    <ProductShowcase 
                      selectedCategory={selectedCategory}
                      onCategoryChange={(cat) => setSelectedCategory(cat)}
                      onOrderNow={handleShowcaseOrder}
                      onAddToCart={(p, q, s) => {
                        handleAddToCart(p, q, s);
                        // Optional: trigger some UI feedback
                      }}
                    />

                    {/* Swapped Location: Centered "Order Check" Button Segment */}
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                      <motion.button 
                        whileHover={{ scale: 1.08, rotate: 2 }}
                        whileTap={{ scale: 0.94 }}
                        type="button"
                        onClick={() => setShowTrackingModal(true)}
                        className="w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-b from-slate-950 via-zinc-900 to-slate-950 text-amber-400 border-4 border-amber-400/90 shadow-2xl shadow-amber-500/30 flex flex-col items-center justify-center p-4 text-center transition-all cursor-pointer group hover:border-amber-300 ring-4 ring-amber-500/25"
                        title="অর্ডার চেক করুন"
                      >
                        <div className="p-2 bg-amber-500/20 rounded-full border border-amber-400/50 mb-1.5 group-hover:scale-110 transition-transform">
                          <Truck size={26} className="text-amber-400 animate-pulse" />
                        </div>
                        <span className="text-xs sm:text-sm font-black text-amber-300 leading-tight tracking-wide font-sans">
                          অর্ডার চেক করুন
                        </span>
                        <span className="text-[9.5px] text-amber-400/75 mt-0.5 font-medium">
                          Track Order
                        </span>
                      </motion.button>
                      <p className="text-xs text-gray-500 mt-3 max-w-xs text-center font-medium">
                        আপনার পূর্বের অর্ডারের বর্তমান অবস্থা ও ডেলিভারি স্ট্যাটাস জানতে উপরে ক্লিক করুন
                      </p>
                    </div>

                    <ReviewSection />

                    {/* Added to Cart Success Toast */}
                    <AnimatePresence>
                      {showAddSuccess && (
                        <motion.div
                          initial={{ opacity: 0, y: 50, x: '-50%' }}
                          animate={{ opacity: 1, y: 0, x: '-50%' }}
                          exit={{ opacity: 0, y: 20, x: '-50%' }}
                          className="fixed bottom-24 left-1/2 z-[100] bg-brand-charcoal text-white px-6 py-3 rounded-full shadow-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 border border-white/10"
                        >
                          <CheckCircle2 size={16} className="text-emerald-500" />
                          কার্টে যোগ করা হয়েছে! (Added to Cart)
                        </motion.div>
                      )}
                    </AnimatePresence>


                  </motion.div>
                ) : (
                  <motion.div 
                    key="checkout"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="max-w-4xl mx-auto px-4 md:px-6 space-y-8 pb-10 mt-8"
                  >
                    <div className="flex items-center justify-between py-6">
                      <button 
                        onClick={() => setCheckoutMode(false)}
                        className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-100 rounded-2xl text-gray-600 font-black uppercase tracking-widest text-[10px] hover:border-brand-gold hover:text-brand-gold transition-all shadow-sm group"
                      >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        আগের পেজে ফিরুন (BACK)
                      </button>
                      <div className="text-right">
                        <h2 className="text-2xl font-black text-gray-900 leading-tight">অর্ডার সম্পন্ন করুন</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Complete Your Professional Order</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl shadow-gray-200/50 overflow-hidden">
                      <div className="h-2 luxury-gradient w-full" />
                      
                      <form 
                        onSubmit={handleSubmit(onSubmit, (formErrors) => {
                          console.warn("Form validation issues:", formErrors);
                          const firstError = Object.keys(formErrors)[0];
                          const element = document.getElementsByName(firstError)[0] || document.getElementById(firstError);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                          showToast("অনুগ্রহ করে আপনার নাম, মোবাইল নম্বর এবং সম্পূর্ণ ঠিকানা সঠিক ভাবে লিখুন।", "error");
                        })} 
                        className="p-6 md:p-10 space-y-12"
                      >
                        <section id="customer-info">
                          <CustomerInfo register={register} errors={errors} getValues={getValues} setValue={setValue} />
                        </section>

                        <div className="space-y-4">
                          <h3 className="text-lg font-serif font-black italic border-b border-gray-100 pb-2">আপনার ব্যাগ (Your Shopping Bag)</h3>
                          <div className="space-y-4">
                            {cart.map((item) => (
                              <div 
                                key={item.id} 
                                className="relative p-3 xs:p-4 bg-stone-50 rounded-2xl border border-stone-200/60 flex items-start gap-3 xs:gap-4 shadow-sm hover:shadow-md transition-all group"
                              >
                                {/* Image Container */}
                                <div className="relative flex-shrink-0">
                                  <img 
                                    src={item.productImage} 
                                    alt={item.productTitle}
                                    className="w-16 h-16 xs:w-20 xs:h-20 object-cover rounded-xl shadow-md ring-2 ring-white"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>

                                {/* Details Column */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch pr-8 xs:pr-10">
                                  <div>
                                    {/* Product Title */}
                                    <h4 className="text-xs xs:text-sm md:text-base font-bold text-stone-900 leading-snug line-clamp-2 pr-1">
                                      {item.productTitle}
                                    </h4>
                                    
                                    {/* Product Tags (Code, Size) */}
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] xs:text-[10px] font-black bg-stone-200/70 text-stone-700 uppercase tracking-wider">
                                        কোড: {item.productCode}
                                      </span>
                                      {item.size && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] xs:text-[10px] font-black bg-amber-100 text-amber-800 tracking-wider">
                                          সাইজ: {item.size}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Bottom Actions Row */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-stone-200/40">
                                    {/* Quantity Controller with Large Touch Targets */}
                                    <div className="flex items-center gap-1 border border-stone-300 rounded-xl bg-white p-0.5 shadow-sm">
                                      <button 
                                        type="button"
                                        onClick={() => updateCartQuantity(item.id, -1)}
                                        className="w-8 h-8 flex items-center justify-center font-bold text-stone-500 hover:bg-stone-50 active:bg-stone-100 rounded-lg transition-colors"
                                        aria-label="Decrease quantity"
                                      >
                                        <Minus size={14} className="stroke-[3]" />
                                      </button>
                                      <span className="w-8 text-center text-sm font-black text-stone-900">{item.quantity}</span>
                                      <button 
                                        type="button"
                                        onClick={() => updateCartQuantity(item.id, 1)}
                                        className="w-8 h-8 flex items-center justify-center font-bold text-stone-500 hover:bg-stone-50 active:bg-stone-100 rounded-lg transition-colors"
                                        aria-label="Increase quantity"
                                      >
                                        <Plus size={14} className="stroke-[3]" />
                                      </button>
                                    </div>

                                    {/* Price Tag */}
                                    <div className="text-right">
                                      <span className="text-sm xs:text-base font-black text-stone-950 tabular-nums">
                                        ৳{(item.price * item.quantity).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Absolute Positioned Delete Button for perfect layout consistency & finger friendliness */}
                                <button 
                                  type="button"
                                  onClick={() => removeFromCart(item.id)}
                                  className="absolute top-2.5 right-2.5 p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all shadow-sm active:scale-90 border border-rose-200/50 flex items-center justify-center cursor-pointer"
                                  title="প্রোডাক্ট মুছুন"
                                  aria-label="Delete product"
                                >
                                  <Trash2 size={16} className="stroke-[2.5]" />
                                </button>
                              </div>
                            ))}
                          </div>
                          {cart.length === 0 && (
                            <div className="py-10 text-center space-y-4">
                              <ShoppingBag size={48} className="mx-auto text-gray-200" />
                              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Your bag is empty</p>
                              <button 
                                onClick={() => setCheckoutMode(false)}
                                className="text-xs font-black text-brand-gold uppercase tracking-[0.2em] hover:underline"
                              >
                                Return to store and add items
                              </button>
                            </div>
                          )}
                        </div>



                        <section id="product-order">
                          <ProductSection 
                            register={register} 
                            errors={errors} 
                            control={control} 
                            setValue={setValue} 
                            cart={cart}
                            onAddToCart={handleAddToCart}
                          />
                        </section>

                        <section id="payment">
                          <PaymentSection register={register} errors={errors} control={control} />
                        </section>

                        {/* Inline Error Helper */}
                        {Object.keys(errors).length > 0 && (
                          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-sm font-bold animate-shake">
                            <AlertCircle size={20} className="shrink-0 text-rose-600" />
                            <span>অনুগ্রহ করে উপরে লাল চিহ্নিত তথ্যগুলো (নাম, মোবাইল নম্বর ও ঠিকানা) পূরণ করুন।</span>
                          </div>
                        )}

                        <div className="pt-6">
                          <button 
                            id="submit-order"
                            type="submit"
                            disabled={submitting}
                            className="w-full py-5 bg-[#438a1a] text-white rounded-2xl font-black text-lg transition-all hover:bg-[#346b14] hover:shadow-2xl active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed shadow-xl shadow-green-200"
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="animate-spin" />
                                অর্ডার প্রসেসিং হচ্ছে...
                              </>
                            ) : (
                              <>
                                <ShoppingBag size={24} />
                                অর্ডার নিশ্চিত করুন (Confirm Order)
                              </>
                            )}
                          </button>
                          
                          {/* Mobile Sticky Button Overlay */}
                          <div className="hidden">
                             <button 
                              type="submit"
                              disabled={submitting}
                              onClick={handleSubmit(onSubmit)}
                              className="w-full py-4 bg-[#438a1a] text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg"
                            >
                              {submitting ? <Loader2 className="animate-spin" size={18} /> : <ShoppingBag size={18} />}
                              ক্যাটালগে অর্ডার নিশ্চিত করুন
                            </button>
                          </div>

                          <button 
                            type="button"
                            onClick={() => setCheckoutMode(false)}
                            className="w-full mt-4 py-4 mb-20 md:mb-0 text-gray-400 text-xs font-black uppercase tracking-[0.3em] hover:text-gray-600 transition-colors"
                          >
                            Cancel and return to store
                          </button>
                        </div>
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Modern Professional Footer */}
              <Footer 
                brandSettings={brandSettingsObj}
                onOpenAdmin={() => setView('admin')}
                onOpenOrderTracking={() => setShowTrackingModal(true)}
                onOpenReturnPolicy={() => setShowReturnPolicy(true)}
                onSelectCategory={(cat) => {
                  setSelectedCategory(cat);
                  const el = document.getElementById('products-showcase-section') || document.getElementById('products-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              />
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Return Policy Modal */}
      <AnimatePresence>
        {showReturnPolicy && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowReturnPolicy(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <ReturnPolicy onClose={() => setShowReturnPolicy(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {view === 'form' && !isSubmitted && (
        <div className={`fixed right-4 sm:right-6 z-40 transition-all duration-300 ${cart.length > 0 ? 'bottom-[92px]' : 'bottom-4 sm:bottom-6'}`}>
          <div className="relative flex items-center justify-center">
            {/* Concentric expanding vibration shockwaves (কম্পন তরঙ্গ) */}
            <span className="absolute inset-0 rounded-full bg-[#1877F2]/45 animate-fb-ripple pointer-events-none" />
            <span className="absolute inset-0 rounded-full bg-[#1877F2]/30 animate-fb-ripple-delayed pointer-events-none" />

            <a 
              href={facebookUrl}
              onClick={handleOpenFacebook}
              className="relative z-10 w-13 h-13 sm:w-16 sm:h-16 bg-[#1877F2] rounded-full flex items-center justify-center shadow-[0_8px_25px_rgba(24,119,242,0.6)] border-4 border-white cursor-pointer hover:bg-[#1565C0] hover:scale-110 active:scale-90 transition-all duration-150 group touch-manipulation animate-fb-vibrate"
              title="SERA FASHION ফেসবুক পেজ - সরাসরি মেসেজ দিন"
              aria-label="SERA FASHION Facebook Page"
            >
              <svg 
                viewBox="0 0 24 24" 
                className="w-6 h-6 sm:w-7 sm:h-7 fill-white drop-shadow-sm transition-transform duration-300 group-hover:rotate-12"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>

              {/* Attention-grabbing live pulse dot */}
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 sm:h-4 sm:w-4 pointer-events-none">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 bg-emerald-500 border-2 border-white shadow-xs" />
              </span>
            </a>
          </div>
        </div>
      )}

      {view === 'form' && !isSubmitted && (
        <SpinWheelModal 
          setValue={setValue} 
          getValues={getValues} 
          cartLength={cart.length} 
          onOpenCheckout={() => setCheckoutMode(true)} 
          onOpenChange={setIsSpinModalOpen}
        />
      )}



      {/* Sticky Mobile Buy Bar */}
      {view === 'form' && !isSubmitted && (
        <StickyMobileBuyBar
          cart={cart}
          checkoutMode={checkoutMode}
          onOpenCheckout={() => {
            setCheckoutMode(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onScrollToCatalog={() => {
            const el = document.getElementById('product-catalog') || document.querySelector('main');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      )}

      {/* Exit-Intent Cart Saver Modal */}
      {view === 'form' && !isSubmitted && (
        <ExitIntentModal
          cart={cart}
          isSubmitted={isSubmitted}
          onApplyDiscount={(code, amount) => {
            setValue('couponCode', code);
            setValue('discount', amount);
            setValue('discountType', 'flat');
          }}
          onOpenCheckout={() => {
            setCheckoutMode(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* Live Order Tracking Modal */}
      <OrderTrackingModal
        isOpen={showTrackingModal}
        onClose={() => setShowTrackingModal(false)}
        initialOrderId={trackingOrderId}
      />

      {/* Customer Account & Order History Portal Modal */}
      <CustomerPortalModal
        isOpen={showCustomerPortal}
        onClose={() => setShowCustomerPortal(false)}
        onOpenTracking={(orderId) => {
          setTrackingOrderId(orderId);
          setShowTrackingModal(true);
        }}
        onStartShopping={() => {
          setView('form');
          setCheckoutMode(false);
          const el = document.getElementById('products-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Live Social Proof Popups (Only active after customer completes entry flows and enters main site) */}
      {view === 'form' && !isSubmitted && (
        <SocialProofPopup 
          cartLength={cart.length}
          enabled={!isFbGateOpen && !isSpinModalOpen && !showTrackingModal && !showLoyaltyModal}
          brandSettings={brandSettingsObj}
          onSelectProduct={(product) => {
            handleAddToCart(product, 1, 'Free Size');
            setCheckoutMode(true);
          }}
        />
      )}

      {/* VIP Loyalty Rewards Modal */}
      <LoyaltyRewardsModal
        isOpen={showLoyaltyModal}
        onClose={() => setShowLoyaltyModal(false)}
        onApplyCoupon={(code, discount) => {
          setValue('couponCode', code);
          if (discount > 0) {
            setValue('discount', discount);
          }
          setCheckoutMode(true);
        }}
      />

      {/* Modern Professional Non-blocking Toast Notification */}
      <AnimatePresence>
        {toastNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[92%] sm:w-auto shadow-2xl rounded-2xl p-4 flex items-center gap-3 backdrop-blur-md border border-white/20 bg-slate-950/95 text-white"
          >
            {toastNotification.type === 'error' ? (
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                <AlertCircle size={20} />
              </div>
            ) : toastNotification.type === 'success' ? (
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <CheckCircle2 size={20} />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <AlertCircle size={20} />
              </div>
            )}
            <div className="flex-1 pr-2">
              <p className="text-sm font-semibold text-slate-100 leading-snug">
                {toastNotification.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setToastNotification(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
