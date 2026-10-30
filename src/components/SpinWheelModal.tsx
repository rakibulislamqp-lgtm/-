import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gift, X, CheckCircle, Copy, AlertCircle, ShoppingCart, 
  Sparkles, Trophy, CheckCircle2, ArrowRight, Tag, Award 
} from 'lucide-react';
import { updateVisitorSpinInfo, logVisitorEvent } from '../services/trackingService';
import { BrandSettings, SpinWheelItem } from '../types';
import { DEFAULT_SPIN_WHEEL_ITEMS } from '../constants/spinWheelDefaults';

interface SpinWheelModalProps {
  setValue: (name: string, value: any) => void;
  getValues: (name: string) => any;
  cartLength?: number;
  onOpenCheckout?: () => void;
  onOpenChange?: (isOpen: boolean) => void;
  brandSettings?: BrandSettings | null;
}

// Sparkle particle class representing the firecracker bursts
class Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  decay: number;
  size: number;
  gravity: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 4; // realistic explosion speed
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.color = color;
    this.alpha = 1.0;
    this.decay = Math.random() * 0.015 + 0.008; // slightly slower decay for grand visual aura
    this.size = Math.random() * 3.5 + 1.5;
    this.gravity = 0.06;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.vx *= 0.985; // smooth friction
    this.vy *= 0.985;
    this.alpha -= this.decay;
  }

  draw(c: CanvasRenderingContext2D) {
    c.save();
    c.globalAlpha = this.alpha;
    c.fillStyle = this.color;
    c.shadowBlur = 12;
    c.shadowColor = this.color; // gorgeous glowing aura surrounding each sparkle
    c.beginPath();
    c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
}

// Rocket class travel up from bottom corners and skywards
class FirecrackerRocket {
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  exploded: boolean;

  constructor(width: number, height: number) {
    // Alternate launching from bottom left or bottom right
    const launchFromLeft = Math.random() > 0.5;
    this.x = launchFromLeft ? Math.random() * (width * 0.2) + 20 : width - (Math.random() * (width * 0.2) + 20);
    this.y = height + 10;
    this.tx = Math.random() * (width * 0.6) + (width * 0.2); // aim towards center
    this.ty = Math.random() * (height * 0.45) + (height * 0.1); // explode at nice high altitude
    
    const angle = Math.atan2(this.ty - this.y, this.tx - this.x);
    const speed = Math.random() * 6 + 12; // super fast shooting rockets
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    
    const colors = ['#e2136e', '#D4AF37', '#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#06b6d4'];
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.size = 3.5;
    this.exploded = false;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    
    // Check if peak is met
    if (this.vy >= 0 || this.y <= this.ty) {
      this.exploded = true;
    }
  }

  draw(c: CanvasRenderingContext2D) {
    c.save();
    c.fillStyle = this.color;
    c.shadowBlur = 20;
    c.shadowColor = this.color;
    c.beginPath();
    c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
}

// Main Fireworks Core Component
function CelebrationFireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const rockets: FirecrackerRocket[] = [];
    const sparks: Spark[] = [];

    // Launcher interval
    let ticks = 0;

    const tick = () => {
      // Shimmering darkness with motion blur tail
      ctx.fillStyle = 'rgba(28, 25, 23, 0.25)';
      ctx.fillRect(0, 0, width, height);

      ticks++;
      // Spawn rockets regularly to simulate a high-energy festive night!
      if (ticks % 25 === 0) {
        if (rockets.length < 5) {
          rockets.push(new FirecrackerRocket(width, height));
        }
      }

      // Loop rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.update();
        r.draw(ctx);

        if (r.exploded) {
          // Explode rocket in spectacular rings of twinkling star particles!
          for (let j = 0; j < 65; j++) {
            sparks.push(new Spark(r.x, r.y, r.color));
          }
          rockets.splice(i, 1);
        }
      }

      // Loop sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.update();
        s.draw(ctx);

        if (s.alpha <= 0) {
          sparks.splice(i, 1);
        }
      }

      animId = requestAnimationFrame(tick);
    };

    tick();

    // Spawn fireworks on clicks too! Full user interactive celebration
    const handleClick = (e: MouseEvent) => {
      const colors = ['#e2136e', '#D4AF37', '#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#06b6d4'];
      const chosenColor = colors[Math.floor(Math.random() * colors.length)];
      for (let k = 0; k < 60; k++) {
        sparks.push(new Spark(e.clientX, e.clientY, chosenColor));
      }
    };

    window.addEventListener('click', handleClick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}

// Static fallback if needed
const DEFAULT_FALLBACK_SECTORS = DEFAULT_SPIN_WHEEL_ITEMS;

export default function SpinWheelModal({ 
  setValue, 
  getValues, 
  cartLength = 0, 
  onOpenCheckout, 
  onOpenChange, 
  brandSettings 
}: SpinWheelModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [wonCoupon, setWonCoupon] = useState<{ 
    code: string; 
    label: string; 
    labelBn: string; 
    discount: number; 
    discountType?: string; 
    color?: string;
    text?: string;
    name: string; 
    phone: string; 
  } | null>(null);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showActivePromoCard, setShowActivePromoCard] = useState(false);

  // Dynamic offers / sectors state
  const [sectors, setSectors] = useState<SpinWheelItem[]>(() => {
    if (brandSettings && Array.isArray(brandSettings.spinWheelItems) && brandSettings.spinWheelItems.length >= 2) {
      return brandSettings.spinWheelItems;
    }
    try {
      const stored = localStorage.getItem('brand_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.spinWheelItems) && parsed.spinWheelItems.length >= 2) {
          return parsed.spinWheelItems;
        }
      }
    } catch (e) {}
    return DEFAULT_FALLBACK_SECTORS;
  });

  // Check if spin wheel is enabled from props or cached brand_settings (default: true)
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    if (brandSettings && typeof brandSettings.spinWheelEnabled === 'boolean') {
      return brandSettings.spinWheelEnabled;
    }
    try {
      const stored = localStorage.getItem('brand_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.spinWheelEnabled === 'boolean') {
          return parsed.spinWheelEnabled;
        }
      }
    } catch (e) {}
    return true;
  });

  const [delaySeconds, setDelaySeconds] = useState<number>(() => {
    if (brandSettings && typeof brandSettings.spinWheelDelaySeconds === 'number') {
      return brandSettings.spinWheelDelaySeconds;
    }
    try {
      const stored = localStorage.getItem('brand_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.spinWheelDelaySeconds === 'number') {
          return parsed.spinWheelDelaySeconds;
        }
      }
    } catch (e) {}
    return 5;
  });

  const [showFloatingButton, setShowFloatingButton] = useState<boolean>(() => {
    if (brandSettings && typeof brandSettings.spinWheelShowFloatingButton === 'boolean') {
      return brandSettings.spinWheelShowFloatingButton;
    }
    try {
      const stored = localStorage.getItem('brand_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.spinWheelShowFloatingButton === 'boolean') {
          return parsed.spinWheelShowFloatingButton;
        }
      }
    } catch (e) {}
    return true;
  });

  // Listen to prop changes
  useEffect(() => {
    if (brandSettings) {
      if (typeof brandSettings.spinWheelEnabled === 'boolean') {
        setIsEnabled(brandSettings.spinWheelEnabled);
      }
      if (typeof brandSettings.spinWheelDelaySeconds === 'number') {
        setDelaySeconds(brandSettings.spinWheelDelaySeconds);
      }
      if (typeof brandSettings.spinWheelShowFloatingButton === 'boolean') {
        setShowFloatingButton(brandSettings.spinWheelShowFloatingButton);
      }
      if (Array.isArray(brandSettings.spinWheelItems) && brandSettings.spinWheelItems.length >= 2) {
        setSectors(brandSettings.spinWheelItems);
      }
    }
  }, [brandSettings?.spinWheelEnabled, brandSettings?.spinWheelDelaySeconds, brandSettings?.spinWheelShowFloatingButton, brandSettings?.spinWheelItems]);

  // Listen to global brand_settings_updated event and preview event
  useEffect(() => {
    const handleUpdate = (e: any) => {
      const detail = e.detail;
      if (detail) {
        if (typeof detail.spinWheelEnabled === 'boolean') {
          setIsEnabled(detail.spinWheelEnabled);
        }
        if (typeof detail.spinWheelDelaySeconds === 'number') {
          setDelaySeconds(detail.spinWheelDelaySeconds);
        }
        if (typeof detail.spinWheelShowFloatingButton === 'boolean') {
          setShowFloatingButton(detail.spinWheelShowFloatingButton);
        }
        if (Array.isArray(detail.spinWheelItems) && detail.spinWheelItems.length >= 2) {
          setSectors(detail.spinWheelItems);
        }
      }
    };

    const handlePreview = () => {
      setIsOpen(true);
    };

    window.addEventListener('brand_settings_updated', handleUpdate);
    window.addEventListener('open_spin_wheel_preview', handlePreview);
    return () => {
      window.removeEventListener('brand_settings_updated', handleUpdate);
      window.removeEventListener('open_spin_wheel_preview', handlePreview);
    };
  }, []);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  // Form states matching high-professional image
  const [spinName, setSpinName] = useState('');
  const [spinPhone, setSpinPhone] = useState('');
  const [validationError, setValidationError] = useState('');

  // Confetti particles state
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string; size: number; delay: number }[]>([]);

  // Get names from parent form to prefill when opening without reactive subscriptions (prevents typing lag!)
  const parentCustomerName = getValues('customerName') || '';
  const parentMobileNumber = getValues('mobileNumber') || '';

  useEffect(() => {
    // If spin wheel is disabled, ensure modal is closed and skip timer
    if (!isEnabled) {
      setIsOpen(false);
      return;
    }

    // Read persisted coupon and spinning state from localStorage
    const savedSpun = localStorage.getItem('sera_wheel_has_spun');
    const savedCoupon = localStorage.getItem('sera_wheel_won_coupon');

    if (savedSpun === 'true' && savedCoupon) {
      try {
        const coupon = JSON.parse(savedCoupon);
        
        // Auto-correct stale values from localStorage (e.g. 8% for SERA100, 10% for SERA200)
        const codeUpper = (coupon.code || '').toUpperCase();
        if (codeUpper === 'SERA100') {
          coupon.discount = 100;
          coupon.discountType = 'flat';
          coupon.labelBn = '১০০৳ অফ';
        } else if (codeUpper === 'SERA200') {
          coupon.discount = 200;
          coupon.discountType = 'flat';
          coupon.labelBn = '২০০৳ অফ';
        } else if (codeUpper === 'SERA5') {
          coupon.discount = 5;
          coupon.discountType = 'percentage';
          coupon.labelBn = '৫% অফ';
        } else if (codeUpper === 'SERA10') {
          coupon.discount = 10;
          coupon.discountType = 'percentage';
          coupon.labelBn = '১০% অফ';
        } else if (codeUpper === 'SERA15') {
          coupon.discount = 15;
          coupon.discountType = 'percentage';
          coupon.labelBn = '১৫% অফ';
        } else if (codeUpper === 'SERA20') {
          coupon.discount = 20;
          coupon.discountType = 'percentage';
          coupon.labelBn = '২০% অফ';
        }
        
        // Ensure full offer label and sector colors are loaded
        if (!coupon.label || !coupon.color) {
          const matched = sectors.find(s => s.code === coupon.code || s.labelBn === coupon.labelBn);
          if (matched) {
            if (!coupon.label) coupon.label = matched.label;
            if (!coupon.color) coupon.color = matched.color;
            if (!coupon.text) coupon.text = matched.text;
            if (!coupon.discountType && matched.discountType) coupon.discountType = matched.discountType;
          }
        }
        
        // Save corrected coupon back
        localStorage.setItem('sera_wheel_won_coupon', JSON.stringify(coupon));

        setHasSpun(true);
        setWonCoupon(coupon);
        // Automatically apply the coupon discount to the main form
        setValue('discount', coupon.discount);
        setValue('discountType', coupon.discountType || 'percentage');
      } catch (err) {
        console.error('Error parsing saved coupon:', err);
      }
    } else {
      // If delaySeconds is 0, do not auto popup (only opens if button is clicked)
      if (delaySeconds <= 0) return;

      // Show automatic entrance popup after admin-configured delay
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, delaySeconds * 1000);
      return () => clearTimeout(timer);
    }
  }, [setValue, isEnabled, delaySeconds, sectors]);

  // Sync details from parent when modal opens
  useEffect(() => {
    if (isOpen && !hasSpun) {
      const pName = getValues('customerName') || '';
      const pPhone = getValues('mobileNumber') || '';
      if (pName) setSpinName(pName);
      if (pPhone) setSpinPhone(pPhone);
    }
  }, [isOpen, hasSpun]);

  // Close helper
  const handleClose = () => {
    setIsOpen(false);
    setValidationError('');
  };

  // Proceed to order action
  const handleProceedToOrder = () => {
    handleClose();
    if (onOpenCheckout) {
      onOpenCheckout();
    } else {
      const target = document.getElementById('order-form') || document.getElementById('product-section') || document.querySelector('form');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Generate confetti burst
  const triggerConfetti = () => {
    const colors = ['#e2136e', '#D4AF37', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];
    const pArray = Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100 - 50,
      y: Math.random() * -100 - 20,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 12 + 6,
      delay: Math.random() * 0.3,
    }));
    setParticles(pArray);
  };

  // Run the Spin logic
  const handleSpinNow = () => {
    if (isSpinning || hasSpun) return;

    if (!spinName.trim()) {
      setValidationError('অনুগ্রহ করে আপনার নাম লিখুন।');
      return;
    }
    if (!spinPhone.trim() || spinPhone.length < 11) {
      setValidationError('১১ সংখ্যার সঠিক মোবাইল নম্বর প্রদান করুন।');
      return;
    }
    setValidationError('');
    setIsSpinning(true);

    // Sync names back to primary checkout form to be extremely friendly
    setValue('customerName', spinName);
    setValue('mobileNumber', spinPhone);

    // Decide winning sector dynamically from active sectors
    const eligibleIndices = sectors
      .map((s, idx) => ({ ...s, idx }))
      .filter(s => s.isWinningEligible !== false);

    const pool = eligibleIndices.length > 0 ? eligibleIndices : sectors.map((s, idx) => ({ ...s, idx }));

    // Weighted random selection based on probabilityWeight
    const totalWeight = pool.reduce((acc, it) => acc + Math.max(1, it.probabilityWeight || 10), 0);
    let rand = Math.random() * totalWeight;
    let chosenEntry = pool[0];
    for (const item of pool) {
      const weight = Math.max(1, item.probabilityWeight || 10);
      if (rand < weight) {
        chosenEntry = item;
        break;
      }
      rand -= weight;
    }

    const winningIndex = chosenEntry.idx;
    const chosenSector = sectors[winningIndex];

    const spins = 7; // multiple full spins
    const sectorAngle = 360 / sectors.length;
    const middleDeg = winningIndex * sectorAngle + sectorAngle / 2;
    // Align sector center with top needle (12 o'clock), plus a safe randomized offset
    const maxOffset = (sectorAngle / 2) * 0.65;
    const randomOffset = (Math.random() * 2 * maxOffset) - maxOffset;
    const finalAngle = spins * 360 + (360 - middleDeg) + randomOffset;

    setRotationAngle(finalAngle);

    // Transition to success state after deceleration
    setTimeout(() => {
      const wonObject = {
        code: chosenSector.code,
        label: chosenSector.label || chosenSector.labelBn,
        labelBn: chosenSector.labelBn,
        discount: chosenSector.discount,
        discountType: chosenSector.discountType || 'percentage',
        color: chosenSector.color,
        text: chosenSector.text,
        name: spinName,
        phone: spinPhone,
      };

      setHasSpun(true);
      setWonCoupon(wonObject);
      setIsSpinning(false);
      triggerConfetti();

      // Persist locally
      localStorage.setItem('sera_wheel_has_spun', 'true');
      localStorage.setItem('sera_wheel_won_coupon', JSON.stringify(wonObject));

      // Track session spin details in real-time Firestore database for admin lead generation
      updateVisitorSpinInfo({
        hasSpun: true,
        wonCouponCode: chosenSector.code,
        wonCouponLabel: chosenSector.labelBn,
        wonCouponDiscount: chosenSector.discount,
        customerName: spinName,
        mobileNumber: spinPhone,
      });

      logVisitorEvent('click', 'spin_wheel_completed', `স্পিন হুইল ঘুরিয়েছেন এবং "${chosenSector.labelBn}" জিতেছেন 🎁`, 'checkout');

      // Apply to checkout form
      setValue('discount', chosenSector.discount);
      setValue('discountType', chosenSector.discountType);
    }, 4500);
  };

  const copyCouponCode = () => {
    if (!wonCoupon) return;
    navigator.clipboard.writeText(wonCoupon.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Draw sectors matching premium geometry
  const CX = 170;
  const CY = 170;
  const R = 160;
  const sectorAngle = 360 / sectors.length;

  return (
    <>
      {/* 🚀 Launcher floating button with notification badge */}
      {(((cartLength || 0) > 0 && onOpenCheckout) || (isEnabled && showFloatingButton)) && (
        <div className={`fixed left-4 sm:left-6 z-40 flex items-center gap-2.5 sm:gap-3 transition-all duration-300 ${
          (cartLength || 0) > 0 ? 'bottom-[76px] sm:bottom-[80px]' : 'bottom-4 sm:bottom-6'
        }`}>
          {/* 1. Circular Round Checkout Icon Button */}
          {(cartLength || 0) > 0 && onOpenCheckout && (
            <motion.button
              type="button"
              onClick={onOpenCheckout}
              className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-[#438a1a] hover:bg-[#387515] text-white flex items-center justify-center shadow-2xl border-2 border-white/60 active:scale-95 transition-all cursor-pointer relative shrink-0 ring-4 ring-green-500/20 group"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              title="অর্ডার সম্পূর্ণ করুন (Checkout)"
            >
              <div className="relative flex items-center justify-center">
                <ShoppingCart size={20} className="group-hover:scale-110 transition-transform" />
                <span className="absolute -top-2.5 -right-2.5 bg-rose-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-bounce">
                  {cartLength}
                </span>
              </div>
            </motion.button>
          )}

          {/* 2. Coupon / Spin Wheel Launcher Button (Only when enabled & configured to show) */}
          {isEnabled && showFloatingButton && (
            <motion.button
              id="gift-spin-launcher"
              onClick={() => {
                if (wonCoupon) {
                  setShowActivePromoCard(!showActivePromoCard);
                } else {
                  setIsOpen(true);
                }
              }}
              className={`flex items-center gap-2.5 px-5 py-3.5 sm:py-4 rounded-full shadow-2xl font-sans text-xs font-black tracking-wide uppercase transition-all relative ${
                wonCoupon 
                  ? 'bg-emerald-600 border-2 border-emerald-400 text-white shadow-emerald-200 cursor-pointer' 
                  : 'bg-[#e2136e] border-2 border-rose-400 text-white cursor-pointer shadow-rose-200'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={!wonCoupon ? { y: [0, -4, 0] } : {}}
              transition={!wonCoupon ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : {}}
            >
              <Gift size={18} className="animate-spin-slow shrink-0" />
              <span className="whitespace-nowrap">{wonCoupon ? `🎁 কুপন: ${wonCoupon.code}` : 'লাকি স্পিন ও গিফট'}</span>
              {!hasSpun && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-yellow-400 border-2 border-white rounded-full flex items-center justify-center text-[9px] font-black text-rose-700 animate-pulse">
                  1
                </span>
              )}
            </motion.button>
          )}
        </div>
      )}

      {/* 🔮 Active Coupon quick hover panel shown on screen when toggled */}
      <AnimatePresence>
        {isEnabled && wonCoupon && showActivePromoCard && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            className={`fixed left-6 z-45 bg-[#1C1917] text-white rounded-3xl p-6 shadow-2xl border-2 border-yellow-400 w-[calc(100vw-3rem)] sm:w-[360px] pointer-events-auto flex flex-col gap-4 overflow-hidden transition-all duration-300 ${
              cartLength > 0 ? 'bottom-[164px]' : 'bottom-24'
            }`}
          >
            {/* Elegant glowing active marker */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-black text-yellow-400 tracking-widest flex items-center gap-1.5 font-sans">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span>সক্রিয় প্রমোশন (Active Promo) ⚡</span>
              </span>
              <button 
                onClick={() => setShowActivePromoCard(false)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1.5 rounded-full hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 shadow-inner space-y-3 relative overflow-hidden">
              <div className="flex items-center gap-3.5">
                <div className="bg-gradient-to-br from-amber-500 to-rose-600 text-white rounded-2xl p-3 shadow-md shadow-rose-950/50 shrink-0">
                  <Trophy size={22} className="animate-bounce" />
                </div>
                <div className="space-y-0.5 text-left">
                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                    আপনার বিজয়ী অফার 🏆
                  </span>
                  <h4 className="text-sm md:text-base font-serif font-black text-white tracking-tight leading-snug">
                    {wonCoupon.label || wonCoupon.labelBn}
                  </h4>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span 
                      className="px-2 py-0.5 rounded text-[10px] font-black"
                      style={{ 
                        backgroundColor: wonCoupon.color || '#e2136e', 
                        color: wonCoupon.text || '#ffffff' 
                      }}
                    >
                      {wonCoupon.labelBn}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-400">
                      {wonCoupon.discountType === 'flat' ? `${wonCoupon.discount}৳ নগদ ছাড়` : `${wonCoupon.discount}% ডিসকাউন্ট ছাড়`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dashed high-fidelity coupon badge within the popover */}
              <div className="border border-dashed border-emerald-500/40 bg-emerald-500/5 rounded-xl p-3 flex items-center justify-between mt-2">
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block text-left">প্রোমো কোড (Promo Code)</span>
                  <span className="text-lg md:text-xl font-serif font-black text-emerald-400 tracking-widest uppercase font-mono block text-left">
                    {wonCoupon.code}
                  </span>
                </div>
                <button 
                  onClick={copyCouponCode}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/20 cursor-pointer shrink-0"
                >
                  <Copy size={13} />
                  <span>{copied ? 'কপি হয়েছে' : 'কপি করুন'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-[#e2136e]/10 p-3.5 rounded-xl border border-[#e2136e]/20">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-left leading-relaxed font-bold text-stone-200">
                অর্ডার ফর্মে <strong className="text-amber-300 font-black">{wonCoupon.discountType === 'flat' ? `${wonCoupon.discount}৳` : `${wonCoupon.discount}%`} ডিসকাউন্ট</strong> স্বয়ংক্রিয়ভাবে সক্রিয় রয়েছে।
              </p>
            </div>

            <button
              onClick={() => {
                setShowActivePromoCard(false);
                handleProceedToOrder();
              }}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition"
            >
              <ShoppingCart size={14} />
              <span>এই অফারে এখনি অর্ডার করুন</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🎪 Modal Dialog */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Dark glass backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="absolute inset-0 bg-[#1c1917]/85 backdrop-blur-md animate-fade-in"
            />

            {/* Sparkles & Fireworks Dynamic Celebration */}
            {hasSpun && <CelebrationFireworks />}

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-[420px] mx-auto bg-white rounded-3xl overflow-hidden shadow-2xl shadow-black/40 border border-gold-200 z-10 flex flex-col"
            >
              {/* Gold Top Border */}
              <div className="h-2 bg-gradient-to-r from-yellow-500 via-[#e2136e] to-[#1C1917]" />

              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-3.5 right-3.5 z-25 w-8 h-8 rounded-full bg-black/10 hover:bg-black/25 flex items-center justify-center text-gray-650 cursor-pointer transition-colors"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <X size={18} />
              </button>

              {/* Content Panel - height adaptive and fully scrollable when needed */}
              <div className="px-4 py-6 sm:px-6 sm:pt-8 sm:pb-7 flex flex-col items-center select-none overflow-y-auto max-h-[82vh] md:max-h-[85vh] no-scrollbar">
                
                {!hasSpun ? (
                  /* 🎰 SPIN PANEL STATE */
                  <>
                    <div className="inline-flex items-center bg-rose-50 border border-rose-100 px-3 py-1 rounded-full shadow-sm mb-2">
                      <span className="text-[#e2136e] text-[10px] font-black tracking-widest uppercase">বিশেষ অফার</span>
                    </div>

                    <h2 className="text-[17px] sm:text-[20px] font-serif font-black text-[#1C1917] tracking-tight text-center leading-tight">
                      SPIN করুন ডিসকাউন্ট/গিফট জিতুন
                    </h2>
                    <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 tracking-wide uppercase mt-0.5 mb-4 sm:mb-6 text-center">
                      আপনার তথ্য দিন এবং চান্স পান পুরস্কার জেতার!
                    </p>

                    {/* WHEEL COMPONENT OUTLINE - hyper-responsive, avoiding viewport overflow */}
                    <div className="relative w-[190px] h-[190px] xs:w-[220px] xs:h-[220px] sm:w-[260px] sm:h-[260px] md:w-[310px] md:h-[310px] flex items-center justify-center mb-4 sm:mb-6">
                      {/* Pointer Needle Frame */}
                      <div className="absolute top-0 z-30 drop-shadow-lg flex flex-col items-center">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 bg-yellow-400 rounded-full border-[2px] sm:border-[3px] border-white flex items-center justify-center shadow-md">
                          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-[#e2136e] rounded-full" />
                        </div>
                        <div className="w-0 h-0 border-l-[6px] sm:border-l-[8px] border-r-[6px] sm:border-r-[8px] border-t-[10px] sm:border-t-[14px] border-t-yellow-400 -mt-1 sm:-mt-1.5" />
                      </div>

                      {/* Golden Outer Decorative Ring */}
                      <div className="absolute inset-0 rounded-full border-4 sm:border-8 border-yellow-400 p-0.5 sm:p-1 bg-gradient-to-br from-yellow-300 via-amber-200 to-yellow-500 shadow-2xl flex items-center justify-center">
                        {/* Interactive Rotating Pointer Frame */}
                        <div 
                          className="w-full h-full rounded-full overflow-hidden relative shadow-inner bg-stone-100"
                          style={{
                            transform: `rotate(${rotationAngle}deg)`,
                            transition: isSpinning ? 'transform 4.5s cubic-bezier(0.18, 0.89, 0.32, 1.02)' : 'none'
                          }}
                        >
                          <svg viewBox="0 0 340 340" className="w-full h-full">
                            {sectors.map((sector, index) => {
                              const startDeg = index * sectorAngle;
                              const endDeg = (index + 1) * sectorAngle;
                              const startRad = ((startDeg - 90) * Math.PI) / 180;
                              const endRad = ((endDeg - 90) * Math.PI) / 180;

                              const x1 = CX + R * Math.cos(startRad);
                              const y1 = CY + R * Math.sin(startRad);
                              const x2 = CX + R * Math.cos(endRad);
                              const y2 = CY + R * Math.sin(endRad);

                              const d = `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} Z`;

                              // Label Positions
                              const middleDeg = startDeg + sectorAngle / 2;
                              const middleRad = ((middleDeg - 90) * Math.PI) / 180;
                              const textDistance = R * 0.65;
                              const textX = CX + textDistance * Math.cos(middleRad);
                              const textY = CY + textDistance * Math.sin(middleRad);

                              const fontSize = sectors.length > 10 ? '7.5px' : sectors.length > 8 ? '8.5px' : '10px';

                              return (
                                <g key={sector.id || index}>
                                  {/* Sector Slice */}
                                  <path d={d} fill={sector.color} stroke="#ffffff" strokeWidth="2.5" />
                                  
                                  {/* Radial Text representation matching screenshots */}
                                  <text
                                    x={textX}
                                    y={textY}
                                    fill={sector.text || '#ffffff'}
                                    fontSize={fontSize}
                                    fontWeight="bolder"
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    transform={`rotate(${middleDeg} ${textX} ${textY})`}
                                    className="font-serif tracking-tight select-none font-black"
                                  >
                                    {sector.labelBn}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Render responsive decorative pin dots INSIDE the SVG so they rescale 100% perfectly with container resizing */}
                            {Array.from({ length: sectors.length }).map((_, i) => {
                              const dotAngle = ((i * sectorAngle - 90) * Math.PI) / 180;
                              const dotX = CX + 148 * Math.cos(dotAngle);
                              const dotY = CY + 148 * Math.sin(dotAngle);
                              return (
                                <circle
                                  key={i}
                                  cx={dotX}
                                  cy={dotY}
                                  r="4.5"
                                  fill="#ffffff"
                                  stroke="#d4af37"
                                  strokeWidth="1.5"
                                />
                              );
                            })}
                          </svg>
                        </div>
                      </div>

                      {/* Luxurious Brand Center Logo overlay - responsive */}
                      <div className="absolute w-10 h-10 xs:w-12 xs:h-12 sm:w-14 sm:h-14 rounded-full bg-white border-2 border-yellow-400 p-0.5 shadow-xl flex items-center justify-center z-10 select-none pointer-events-none">
                        <div className="w-full h-full rounded-full bg-[#1C1917] flex flex-col items-center justify-center text-[5.5px] xs:text-[6.5px] sm:text-[7.5px] font-serif font-black text-yellow-300 tracking-tighter uppercase leading-none text-center">
                          <span>SERA</span>
                          <span className="text-[4.5px] xs:text-[5px] sm:text-[6px] text-amber-200 mt-0.5 font-sans font-bold">FASHION</span>
                        </div>
                      </div>
                    </div>

                    {/* INPUTS SUBMITS FORM BLOCK */}
                    <div className="w-full space-y-3 sm:space-y-4">
                      <div>
                        <label className="block text-[10px] sm:text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1">আপনার নাম <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          disabled={isSpinning}
                          placeholder="আপনার পুরো নাম লিখুন"
                          value={spinName}
                          onChange={(e) => setSpinName(e.target.value)}
                          className="w-full px-4 py-2.5 sm:px-5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-gray-50 border border-gray-150 outline-none text-xs sm:text-sm font-semibold text-[#1C1917] focus:ring-4 focus:ring-rose-500/10 focus:border-[#e2136e] transition-all font-sans placeholder-gray-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] sm:text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1">ফোন নাম্বার <span className="text-red-500">*</span></label>
                        <input
                          type="tel"
                          maxLength={11}
                          disabled={isSpinning}
                          placeholder="০১xxxxxxxxx"
                          value={spinPhone}
                          onChange={(e) => setSpinPhone(e.target.value.replace(/\D/g, ''))}
                          className="w-full px-4 py-2.5 sm:px-5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-gray-50 border border-gray-150 outline-none text-xs sm:text-sm font-semibold text-[#1C1917] tracking-wider focus:ring-4 focus:ring-rose-500/10 focus:border-[#e2136e] transition-all font-sans placeholder-gray-400"
                        />
                      </div>

                      {validationError && (
                        <div className="flex items-center gap-1.5 text-rose-600 text-[10px] sm:text-[11px] font-bold p-2.5 bg-rose-50 rounded-xl leading-snug border border-rose-100">
                          <AlertCircle size={13} className="shrink-0" />
                          <span>{validationError}</span>
                        </div>
                      )}

                      <button
                        onClick={handleSpinNow}
                        disabled={isSpinning}
                        className="w-full py-3.5 sm:py-4 bg-[#e2136e] text-white rounded-xl sm:rounded-2xl font-black text-sm sm:text-base shadow-lg shadow-rose-200 hover:bg-rose-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        <span>{isSpinning ? 'স্পিন হচ্ছে...' : 'স্পিন করুন'}</span>
                      </button>
                    </div>
                  </>
                ) : (
                  /* 🎉 SUCCESS STATUS PANEL - GRAND WINNING OFFER PRESENTATION */
                  <div className="w-full text-center space-y-3 sm:space-y-4 pt-1 sm:pt-2 relative">
                    {/* Confetti Explosion Shower */}
                    {particles.map((p) => (
                      <motion.div
                        key={p.id}
                        initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                        animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.5 }}
                        transition={{ duration: 1.5, delay: p.delay, ease: "easeOut" }}
                        className="absolute top-1/2 left-1/2 rounded-sm pointer-events-none"
                        style={{
                          backgroundColor: p.color,
                          width: p.size,
                          height: p.size,
                        }}
                      />
                    ))}

                    {/* Grand Trophy & Sparkles Header */}
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative mb-2">
                        <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 p-1 shadow-xl shadow-amber-500/30 flex items-center justify-center">
                          <div className="w-full h-full rounded-full bg-stone-900 flex items-center justify-center text-amber-300 shadow-inner">
                            <Trophy size={30} className="sm:w-8 sm:h-8 text-amber-400 animate-bounce" />
                          </div>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white shadow-md">
                          <Sparkles size={13} className="animate-spin-slow" />
                        </div>
                      </div>

                      <h3 className="text-xl sm:text-2xl font-serif font-black text-stone-900 tracking-tight">
                        🎉 অভিনন্দন! আপনি বিজয়ী!
                      </h3>
                      <p className="text-[11px] sm:text-xs font-semibold text-gray-500 mt-0.5 leading-snug">
                        {wonCoupon?.name ? (
                          <span><strong className="text-stone-900 font-bold">{wonCoupon.name}</strong>, আপনি লাকি স্পিন থেকে নিচের আকর্ষণীয় অফারটি জিতেছেন:</span>
                        ) : (
                          <span>আপনি লাকি স্পিন থেকে নিচের আকর্ষণীয় অফারটি জিতেছেন:</span>
                        )}
                      </p>
                    </div>

                    {/* 🏆 THE WINNING OFFER PRESENTATION CARD (বিজয়ী অফার কার্ড) */}
                    <div className="relative rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 bg-gradient-to-br from-amber-50/90 via-rose-50/50 to-emerald-50/90 border-2 border-amber-300/90 shadow-md text-center space-y-2.5 sm:space-y-3">
                      {/* Top Gold Badge */}
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-white shadow-sm">
                        <Award size={13} className="animate-pulse" />
                        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider">
                          আপনার বিজয়ী অফার (WON OFFER)
                        </span>
                      </div>

                      {/* Prominent Offer Title */}
                      <div className="space-y-1">
                        <h2 className="text-lg sm:text-2xl font-serif font-black text-stone-950 tracking-tight leading-snug">
                          {wonCoupon?.label || wonCoupon?.labelBn}
                        </h2>
                        <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-rose-700 flex-wrap">
                          <span>🎁 ছাড়ের পরিমাণ:</span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-rose-600 text-white font-black shadow-xs">
                            {wonCoupon?.discountType === 'flat' 
                              ? `${wonCoupon?.discount} ৳ সরাসরি নগদ ছাড়` 
                              : `${wonCoupon?.discount}% বিশেষ ডিসকাউন্ট ছাড়`}
                          </span>
                        </div>
                      </div>

                      {/* Wheel Slice Pill Tag */}
                      {wonCoupon?.labelBn && (
                        <div className="flex items-center justify-center gap-2 pt-0.5">
                          <span className="text-[11px] text-gray-500 font-medium">হুইলের স্লাইস:</span>
                          <span 
                            className="px-2.5 py-0.5 rounded-md text-[11px] font-black shadow-2xs border border-white"
                            style={{ 
                              backgroundColor: wonCoupon.color || '#e2136e', 
                              color: wonCoupon.text || '#ffffff' 
                            }}
                          >
                            {wonCoupon.labelBn}
                          </span>
                        </div>
                      )}

                      {/* Explanatory Benefit Note */}
                      <p className="text-[11px] sm:text-xs text-gray-600 leading-relaxed font-medium bg-white/80 py-1.5 px-3 rounded-xl border border-amber-200/60">
                        💡 যেকোনো পোশাক অর্ডারে এই বিশেষ ছাড় প্রযোজ্য হবে। আপনার মোট বিল থেকে এই টাকা স্বয়ংক্রিয়ভাবে কমে যাবে!
                      </p>

                      {/* 🎟️ TICKET-STYLE COUPON VOUCHER BOX */}
                      <div className="relative mt-2 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border-2 border-dashed border-emerald-400 shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] sm:text-[11px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-1 font-sans">
                            <Tag size={12} className="text-emerald-600" />
                            <span>কুপন কোড (PROMO CODE)</span>
                          </span>
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            ✓ অটো-অ্যাপ্লাইড
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 bg-emerald-50/60 p-2 sm:p-2.5 rounded-xl border border-emerald-200">
                          <p className="text-xl sm:text-2xl font-serif font-black text-emerald-800 tracking-widest uppercase font-mono select-all">
                            {wonCoupon?.code}
                          </p>
                          <button 
                            onClick={copyCouponCode}
                            className="px-3.5 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                            title="কুপন কোড কপি করুন"
                          >
                            <Copy size={13} />
                            <span>{copied ? 'কপি হয়েছে!' : 'কপি করুন'}</span>
                          </button>
                        </div>

                        {/* Auto Applied Green confirmation banner */}
                        <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-100/70 py-1.5 px-2.5 rounded-lg">
                          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                          <span>অর্ডার ফর্মে ডিসকাউন্টটি ইতিমধ্যে সক্রিয় করা হয়েছে!</span>
                        </div>

                        {wonCoupon?.phone && (
                          <p className="text-[10px] text-gray-400 font-mono text-center pt-0.5">
                            ভেরিফাইড ফোন: {wonCoupon.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 sm:space-y-2.5 pt-1">
                      <button
                        onClick={handleProceedToOrder}
                        className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-[0.98] cursor-pointer"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        <ShoppingCart size={16} />
                        <span>অর্ডার করতে এগিয়ে যান</span>
                        <ArrowRight size={16} />
                      </button>

                      <button
                        onClick={handleClose}
                        className="w-full py-2 sm:py-2.5 bg-gray-100 hover:bg-gray-200 text-stone-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        অন্যান্য পোশাক দেখুন (বন্ধ করুন)
                      </button>
                    </div>

                    <p className="text-[10px] sm:text-[11px] font-semibold text-gray-400 tracking-wide">
                      পছন্দের পোশাক অর্ডার করুন এবং বিশেষ এই অফারটি উপভোগ করুন! ❤️
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
