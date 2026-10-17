import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Ruler, Hash, Palette, Layers, Upload, Minus, Plus, Star, Gift, Check, ChevronDown, ChevronUp, Sparkles, X, Ticket } from 'lucide-react';
import { useWatch } from 'react-hook-form';
import { Product } from '../types';

interface ProductSectionProps {
  register: any;
  errors: any;
  control: any;
  setValue: any;
  cart: any[];
  onAddToCart: (product: Product, quantity: number, size: string) => void;
}

const CODE_TO_DISCOUNT: Record<string, number> = {
  'SERA5': 5,
  'SERA10': 10,
  'SERA15': 15,
  'SERA20': 20,
  'SERA100': 100,
  'SERA200': 200,
  'SERAFREE': 10,
  'SERAGIFT': 12,
};

const CODE_TO_DISCOUNT_TYPE: Record<string, 'percentage' | 'flat'> = {
  'SERA5': 'percentage',
  'SERA10': 'percentage',
  'SERA15': 'percentage',
  'SERA20': 'percentage',
  'SERA100': 'flat',
  'SERA200': 'flat',
  'SERAFREE': 'percentage',
  'SERAGIFT': 'percentage',
};

const STABLE_PROMO_CARDS = [
  { code: 'SERA10', label: '১০% অফ বিশেষ কুপন', desc: 'সব পণ্যের উপর ১০% গ্র্যান্ড ডিসকাউন্ট!', value: 10, color: 'from-[#e2136e]/10 to-transparent border-[#e2136e]/30 text-[#e2136e]' },
  { code: 'SERA15', label: '১৫% মেগা লাকি ছাড়', desc: '১৫% স্পেশাল ডাবল বোনাস ক্যাশব্যাক অফার', value: 15, color: 'from-amber-500/10 to-transparent border-amber-400/30 text-amber-700' },
  { code: 'SERA20', label: '২০% ভিআইপি কুপন', desc: '২০% মেগা ডিসকাউন্ট কুপন কোড', value: 20, color: 'from-emerald-500/10 to-transparent border-emerald-400/30 text-emerald-700' },
  { code: 'SERA5', label: '৫% ক্যাশব্যাক ছাড়', desc: 'নিশ্চিত ৫% ইনস্ট্যান্ট ডিসকাউন্ট কুপন', value: 5, color: 'from-indigo-500/10 to-transparent border-indigo-400/30 text-indigo-700' },
];

export default function ProductSection({ register, errors, control, setValue, cart, onAddToCart }: ProductSectionProps) {
  const deliveryArea = useWatch({ control, name: 'deliveryArea', defaultValue: '' });
  const discount = useWatch({ control, name: 'discount', defaultValue: 0 }) || 0;
  const discountType = useWatch({ control, name: 'discountType', defaultValue: 'percentage' }) || 'percentage';

  const [couponInput, setCouponInput] = useState('');
  const [showPromoCards, setShowPromoCards] = useState(false);
  const [appliedCodeLabel, setAppliedCodeLabel] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [spinCoupon, setSpinCoupon] = useState<any>(null);

  // Calculate totals from cart
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const deliveryCharge = deliveryArea === 'Inside Dhaka' ? 80 : (deliveryArea === 'Outside Dhaka' ? 130 : 0);
  const discountAmount = discountType === 'flat' ? Math.min(subtotal, discount) : (subtotal * discount) / 100;
  const totalAmount = (subtotal - discountAmount) + deliveryCharge;

  // Read saved coupon from spin wheel
  useEffect(() => {
    const saved = localStorage.getItem('sera_wheel_won_coupon');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // Auto-correct stale values from localStorage (e.g. 8% for SERA100)
        const codeUpper = (parsed.code || '').toUpperCase();
        if (codeUpper === 'SERA100') {
          parsed.discount = 100;
          parsed.discountType = 'flat';
          parsed.labelBn = '১০০৳ অফ';
        } else if (codeUpper === 'SERA200') {
          parsed.discount = 200;
          parsed.discountType = 'flat';
          parsed.labelBn = '২০০৳ অফ';
        } else if (codeUpper === 'SERA5') {
          parsed.discount = 5;
          parsed.discountType = 'percentage';
          parsed.labelBn = '৫% অফ';
        } else if (codeUpper === 'SERA10') {
          parsed.discount = 10;
          parsed.discountType = 'percentage';
          parsed.labelBn = '১০% অফ';
        } else if (codeUpper === 'SERA15') {
          parsed.discount = 15;
          parsed.discountType = 'percentage';
          parsed.labelBn = '১৫% অফ';
        } else if (codeUpper === 'SERA20') {
          parsed.discount = 20;
          parsed.discountType = 'percentage';
          parsed.labelBn = '২০% অফ';
        }

        // Save corrected coupon back
        localStorage.setItem('sera_wheel_won_coupon', JSON.stringify(parsed));

        setSpinCoupon(parsed);
        // Force apply discount
        setValue('discount', parsed.discount);
        setValue('discountType', parsed.discountType || 'percentage');
        setAppliedCodeLabel(parsed.code);
        setCouponInput(parsed.code);
      } catch (e) {}
    }
  }, [setValue]);

  // Check for referral code in URL (e.g. ?ref=SERA1234)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get('ref') || params.get('referral');
      if (refCode) {
        const cleanRef = refCode.trim().toUpperCase();
        sessionStorage.setItem('sera_referral_code_used', cleanRef);
        setCouponInput(cleanRef);
        setAppliedCodeLabel(`রেফারেল: ${cleanRef}`);
        setValue('discount', 50);
        setValue('discountType', 'flat');
        setFeedbackMsg({
          text: `🎉 বন্ধুর রেফারেল কোড "${cleanRef}" সক্রিয় হয়েছে! আপনি পাচ্ছেন নিশ্চিত ৳৫০ ছাড়!`,
          isError: false
        });
      }
    } catch (e) {}
  }, [setValue]);

  const handleApplyCoupon = async (codeToApply: string) => {
    const cleanedCode = codeToApply.trim().toUpperCase();
    if (!cleanedCode) {
      setFeedbackMsg({ text: 'দয়া করে কুপন বা রেফারেল কোড লিখুন', isError: true });
      return;
    }

    // 1. Check if it's a Friend Referral Code (e.g. SERA5678, REF-..., etc.)
    if (cleanedCode.startsWith('SERA') && cleanedCode.length >= 7 && !CODE_TO_DISCOUNT[cleanedCode]) {
      sessionStorage.setItem('sera_referral_code_used', cleanedCode);
      setValue('discount', 50);
      setValue('discountType', 'flat');
      setAppliedCodeLabel(`রেফারেল: ${cleanedCode}`);
      setCouponInput(cleanedCode);
      setFeedbackMsg({ 
        text: `🎉 আপনার বন্ধুর রেফারেল কোড "${cleanedCode}" সফলভাবে কার্যকর হয়েছে! পাচ্ছেন ৳৫০ ছাড়!`, 
        isError: false 
      });
      setTimeout(() => setFeedbackMsg(null), 3000);
      return;
    }

    // 2. Check if it's a VIP Loyalty Reward Coupon (e.g. REWARD_50_XXXX, REWARD_100_XXXX)
    if (cleanedCode.startsWith('REWARD_')) {
      const parts = cleanedCode.split('_');
      const discountVal = parseInt(parts[1], 10) || 50;
      setValue('discount', discountVal);
      setValue('discountType', 'flat');
      setAppliedCodeLabel(cleanedCode);
      setCouponInput(cleanedCode);
      setFeedbackMsg({ 
        text: `👑 আপনার ভিআইপি লয়্যালটি রিওয়ার্ড কুপন "${cleanedCode}" সক্রিয় হয়েছে! পাচ্ছেন ৳${discountVal} ক্যাশ ছাড়!`, 
        isError: false 
      });
      setTimeout(() => setFeedbackMsg(null), 3000);
      return;
    }

    // 3. Check for Old/Repeat Customer Re-engagement Codes
    if (cleanedCode === 'WELCOMEBACK' || cleanedCode === 'REPEAT50' || cleanedCode === 'VIP100') {
      const discountVal = cleanedCode === 'VIP100' ? 100 : 50;
      setValue('discount', discountVal);
      setValue('discountType', 'flat');
      setAppliedCodeLabel(cleanedCode);
      setCouponInput(cleanedCode);
      setFeedbackMsg({ 
        text: `👑 নিয়মিত গ্রাহক স্পেশাল রি-অর্ডার কুপন কার্যকর! পাচ্ছেন ৳${discountVal} নিশ্চিত ছাড়!`, 
        isError: false 
      });
      setTimeout(() => setFeedbackMsg(null), 3000);
      return;
    }

    // 4. Check Spin Wheel Won Coupon
    if (spinCoupon && cleanedCode === spinCoupon.code.toUpperCase()) {
      let matchedDiscount = spinCoupon.discount;
      let matchedDiscountType = spinCoupon.discountType || 'percentage';
      if (CODE_TO_DISCOUNT[cleanedCode] !== undefined) {
        matchedDiscount = CODE_TO_DISCOUNT[cleanedCode];
        matchedDiscountType = CODE_TO_DISCOUNT_TYPE[cleanedCode] || 'percentage';
      }
      setValue('discount', matchedDiscount);
      setValue('discountType', matchedDiscountType);
      setAppliedCodeLabel(cleanedCode);
      setCouponInput(cleanedCode);
      setFeedbackMsg({ text: `🎉 আপনার স্পিন জয়ের কুপন কোড "${cleanedCode}" সফলভাবে কার্যকর হয়েছে!`, isError: false });
      setTimeout(() => {
        setShowPromoCards(false);
        setFeedbackMsg(null);
      }, 1800);
      return;
    }

    // 5. Standard promo code dictionary fallback
    if (CODE_TO_DISCOUNT[cleanedCode] !== undefined) {
      const matchedDiscount = CODE_TO_DISCOUNT[cleanedCode];
      const matchedDiscountType = CODE_TO_DISCOUNT_TYPE[cleanedCode] || 'percentage';
      setValue('discount', matchedDiscount);
      setValue('discountType', matchedDiscountType);
      setAppliedCodeLabel(cleanedCode);
      setCouponInput(cleanedCode);
      setFeedbackMsg({ text: `🎉 কুপন কোড "${cleanedCode}" সফলভাবে কার্যকর হয়েছে!`, isError: false });
      setTimeout(() => {
        setShowPromoCards(false);
        setFeedbackMsg(null);
      }, 1800);
      return;
    }

    setFeedbackMsg({ text: 'ভুল বা মেয়াদোত্তীর্ণ কুপন কোড! দয়া করে সঠিক কোড বা রেফারেল কোড লিখুন।', isError: true });
  };

  const handleRemoveCoupon = () => {
    if (spinCoupon) {
      setFeedbackMsg({ 
        text: '🔒 আপনার স্পিন জয়ের স্পেশাল কুপনটি রিমুভ করা যাবে না! এটি অর্ডার ফর্মে নিশ্চিত ডিসকাউন্ট হিসেবে লক হয়ে আছে।', 
        isError: true 
      });
      return;
    }
    setValue('discount', 0);
    setAppliedCodeLabel(null);
    setCouponInput('');
    setFeedbackMsg(null);
  };

  return (
    <div className="premium-card p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] space-y-6 md:space-y-8">
      <div className="bg-brand-cream/50 p-5 md:p-8 rounded-[2rem] border-2 border-gold-200 shadow-xl overflow-hidden">
        <div className="space-y-4">
          <label className="text-sm font-serif font-bold text-gray-800 tracking-tight">Delivery Area</label>
          <div className="grid grid-cols-1 gap-3">
            <label className={`flex items-center justify-between p-5 bg-white border-2 rounded-2xl cursor-pointer group hover:border-brand-gold focus-within:ring-4 focus-within:ring-brand-gold/10 transition-all shadow-sm ${deliveryArea === 'Inside Dhaka' ? 'border-brand-gold bg-brand-gold/5' : 'border-gray-100'}`}>
              <div className="flex items-center gap-4">
                <div className="relative flex items-center justify-center">
                  <input 
                    type="radio" 
                    value="Inside Dhaka" 
                    {...register('deliveryArea', { required: 'ডেলিভারি এরিয়া সিলেক্ট করুন' })}
                    className="w-6 h-6 accent-brand-gold cursor-pointer"
                  />
                </div>
                <span className="text-xs md:text-sm font-serif font-black group-hover:text-brand-gold transition-colors">Inside Dhaka</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-base md:text-lg font-serif font-black text-brand-gold">80</span>
                <span className="text-[10px] font-serif font-black text-brand-gold">৳</span>
              </div>
            </label>
            <label className={`flex items-center justify-between p-5 bg-white border-2 rounded-2xl cursor-pointer group hover:border-brand-gold focus-within:ring-4 focus-within:ring-brand-gold/10 transition-all shadow-sm ${deliveryArea === 'Outside Dhaka' ? 'border-brand-gold bg-brand-gold/5' : 'border-gray-100'}`}>
              <div className="flex items-center gap-4">
                <div className="relative flex items-center justify-center">
                  <input 
                    type="radio" 
                    value="Outside Dhaka" 
                    {...register('deliveryArea', { required: 'ডেলিভারি এরিয়া সিলেক্ট করুন' })}
                    className="w-6 h-6 accent-brand-gold cursor-pointer"
                  />
                </div>
                <span className="text-xs md:text-sm font-serif font-black group-hover:text-brand-gold transition-colors">Outside Dhaka</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-base md:text-lg font-serif font-black text-brand-gold">130</span>
                <span className="text-[10px] font-serif font-black text-brand-gold">৳</span>
              </div>
            </label>
          </div>
          {errors.deliveryArea && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.deliveryArea.message}</p>}
        </div>

        {/* 🎫 LUXURY COUPON & PROMO CARDS AREA */}
        <div className="pt-6 border-t-2 border-gold-200 mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-serif font-black uppercase text-brand-charcoal tracking-wider flex items-center gap-2">
              <Ticket size={16} className="text-[#e2136e] animate-pulse" />
              <span>কুপন কোড (Discount Coupon)</span>
            </h4>
            {appliedCodeLabel && (
              <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                <Sparkles size={11} className="text-emerald-500" />
                <span>{appliedCodeLabel} সক্রিয়</span>
              </span>
            )}
          </div>

          <div className="relative flex items-stretch gap-2.5">
            <input
              type="text"
              placeholder="কুপন কোড লিখুন (যেমন: SERA20)"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-xs font-bold font-sans uppercase tracking-widest bg-white text-brand-charcoal focus:ring-2 focus:ring-[#e2136e]/20 focus:border-[#e2136e] outline-none transition-all placeholder:text-gray-300"
            />
            {appliedCodeLabel ? (
              <button
                type="button"
                onClick={handleRemoveCoupon}
                className="px-4 py-3 bg-rose-50 border border-rose-100 text-rose-600 font-bold text-xs rounded-xl hover:bg-rose-100 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <X size={15} />
                <span>রিমুভ</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleApplyCoupon(couponInput)}
                className="px-5 py-3 bg-[#1C1917] hover:bg-[#e2136e] active:scale-95 text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer"
              >
                প্রয়োগ করুন
              </button>
            )}
          </div>

          {/* Feedback Label */}
          {feedbackMsg && (
            <p className={`text-[11px] font-extrabold flex items-center gap-1.5 leading-snug animate-fade-in ${feedbackMsg.isError ? 'text-rose-600' : 'text-emerald-600'}`}>
              <Check size={14} className={feedbackMsg.isError ? 'hidden' : 'inline'} />
              <span>{feedbackMsg.text}</span>
            </p>
          )}

          {/* 🎁 TAP TO REVEAL DECORATIVE PROMO CARD ACCORDION DESIGN */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowPromoCards(!showPromoCards)}
              className="w-full flex items-center justify-between p-2.5 sm:p-3.5 bg-gradient-to-r from-amber-50 to-gold-50 border border-gold-200 rounded-2xl hover:brightness-95 active:brightness-90 transition-all font-serif cursor-pointer shadow-sm group select-none"
            >
              <div className="flex items-center gap-1.5 sm:gap-2.5 text-[10px] xs:text-xs text-amber-900 font-bold min-w-0 flex-1 mr-2 text-left">
                <Gift className="text-[#e2136e] group-hover:rotate-12 transition-transform shrink-0" size={15} />
                <span className="leading-tight break-words">প্রোমোশনাল কার্ড দেখুন (View Promo Offers)</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[8px] sm:text-[9px] font-serif font-black uppercase text-amber-700 bg-amber-100 rounded-full px-1.5 py-0.5 tracking-wider">
                  {spinCoupon ? '৫ টি অফার' : '৪ টি অফার'}
                </span>
                {showPromoCards ? <ChevronUp size={14} className="text-amber-700 shrink-0" /> : <ChevronDown size={14} className="text-amber-700 shrink-0" />}
              </div>
            </button>

            {/* EXPANDABLE INTERACTIVE PROMO TICKET CARDS CANVAS LIST */}
            <AnimatePresence>
              {showPromoCards && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="py-3.5 grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[300px] overflow-y-auto no-scrollbar pt-4">
                    {/* Render saved spin wheel coupon first with a glorious glittering golden frame */}
                    {spinCoupon && (
                      <div
                        onClick={() => handleApplyCoupon(spinCoupon.code)}
                        className="relative p-4 rounded-2xl border-2 border-dashed bg-gradient-to-br from-yellow-300/15 via-amber-200/5 to-transparent border-yellow-500/50 shadow-md ring-4 ring-yellow-400/10 cursor-pointer hover:scale-[1.02] hover:border-yellow-500 hover:shadow-xl transition-all duration-300 flex flex-col gap-2.5 overflow-hidden group"
                      >
                        <div className="absolute top-0 right-0 bg-yellow-500 text-[#1C1917] text-[9px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-bl-xl shadow-md flex items-center gap-1 select-none animate-shimmer scale-95">
                          <Sparkles size={11} />
                          <span>আপনার লাকি স্পিন অফার</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-base font-serif font-black text-amber-700 bg-amber-100 p-2 rounded-xl">
                            {spinCoupon.discountType === 'flat' ? `${spinCoupon.discount}৳` : `${spinCoupon.discount}%`}
                          </span>
                          <div>
                            <p className="text-xs font-serif font-black text-amber-900 group-hover:text-amber-700">{spinCoupon.labelBn}</p>
                            <p className="text-[10px] font-bold text-gray-500">স্পিন করে জেতা সরা কুপন</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-dashed border-gray-200/50 pt-2 mt-1">
                          <span className="text-[10px] font-mono font-black text-[#1C1917] bg-white border border-gray-100 px-2 py-1 rounded tracking-widest uppercase">
                            {spinCoupon.code}
                          </span>
                          <span className="text-[10px] font-black text-emerald-600 hover:underline flex items-center gap-1 font-serif">
                            ব্যবহার করুন <Check size={12} />
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Render standard promo tickets */}
                    {STABLE_PROMO_CARDS.map((card) => {
                      const isLocked = true; // Always lock manual selection of other coupons
                      return (
                        <div
                          key={card.code}
                          onClick={() => {
                            if (spinCoupon) {
                              setFeedbackMsg({
                                text: `🔒 আপনি স্পিন কুপন "${spinCoupon.code}" জিতেছেন! অন্য কুপন ম্যানুয়ালি সিলেক্ট করা বন্ধ আছে।`,
                                isError: true
                              });
                            } else {
                              setFeedbackMsg({
                                text: `🎁 দয়া করে প্রথমে বাম পাশের লটারি স্পিন ঘুরিয়ে আকর্ষণীয় ডিসকাউন্ট কুপন কোড জিতুন!`,
                                isError: true
                              });
                            }
                          }}
                          className="relative p-4 rounded-2xl border-2 border-dashed bg-gray-100/50 border-gray-200 text-gray-400 opacity-60 cursor-not-allowed flex flex-col gap-2.5 overflow-hidden group select-none"
                        >
                          {/* Beautiful Lock Overlay */}
                          <div className="absolute inset-0 bg-white/5 backdrop-blur-[0.5px] z-10 flex items-center justify-center">
                            <span className="bg-gray-800/85 text-white text-[9px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                              🔒 লকড অফার (Locked)
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-base font-serif font-black bg-white/60 p-2 rounded-xl border border-white/80 shrink-0">
                              {card.value}%
                            </span>
                            <div>
                              <p className="text-xs font-serif font-black text-gray-400">{card.label}</p>
                              <p className="text-[10px] font-semibold text-gray-400 leading-snug">{card.desc}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border-t border-dashed border-gray-200/40 pt-2 mt-1">
                            <span className="text-[10px] font-mono font-black text-gray-400 bg-white px-2.5 py-1 rounded border border-gray-100 tracking-widest uppercase shadow-sm">
                              {card.code}
                            </span>
                            <span className="text-[10px] font-black text-gray-400 flex items-center gap-1 font-serif">
                              লকড <Check size={12} />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="pt-8 border-t-2 border-gold-200 mt-6 space-y-4 font-sans">
          <div className="flex justify-between items-center text-xs font-serif font-bold">
            <span className="italic text-gray-600">Subtotal ({cart.reduce((acc, i) => acc + i.quantity, 0)} items):</span>
            <span className="font-black text-lg text-brand-charcoal tabular-nums">{subtotal.toLocaleString('en-US')} ৳</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-xs font-serif font-black italic text-green-600">
              <span>Discount ({discountType === 'flat' ? `${discount}৳` : `${discount}%`}):</span>
              <span className="tabular-nums">-{discountAmount.toLocaleString('en-US')} ৳</span>
            </div>
          )}
          <div className="flex justify-between items-center text-xs font-serif font-bold">
            <span className="italic text-gray-600">Delivery Charge:</span>
            <span className="font-black text-lg text-brand-charcoal tabular-nums">+{deliveryCharge.toLocaleString('en-US')} ৳</span>
          </div>

          <div className="pt-6 border-t-2 border-brand-gold/20">
            <p className="text-[10px] font-serif font-black text-gray-400 uppercase tracking-[0.4em] mb-2 text-center">Order Summary</p>
            <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-inner border border-gold-100">
              <span className="text-[10px] font-serif font-black text-brand-charcoal uppercase tracking-widest">Net Total:</span>
              <span className="text-2xl font-serif font-black text-brand-gold italic tracking-tight tabular-nums px-2 border-l-2 border-brand-gold/10 ml-4 pl-4 drop-shadow-sm">
                {totalAmount.toLocaleString('en-US')} ৳
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
