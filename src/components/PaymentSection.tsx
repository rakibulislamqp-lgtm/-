import React, { useState } from 'react';
import { CreditCard, Scissors, Upload, X, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { useWatch } from 'react-hook-form';

interface PaymentSectionProps {
  register: any;
  errors: any;
  control: any;
  setValue?: any;
  requiresAdvance300?: boolean;
  advanceAmount?: number;
  dueAmount?: number;
}

const compressImageFile = (file: File, maxWidth = 720, quality = 0.72): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = () => reject(new Error('ছবিটি প্রসেস করা যায়নি'));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('ছবিটি পড়া যায়নি'));
    reader.readAsDataURL(file);
  });
};

export default function PaymentSection({
  register,
  errors,
  control,
  setValue,
  requiresAdvance300 = false,
  advanceAmount = 300,
  dueAmount = 0,
}: PaymentSectionProps) {
  const paymentMethod = useWatch({ control, name: 'paymentMethod', defaultValue: 'Cash On Delivery' });
  const paymentScreenshotUrl = useWatch({ control, name: 'paymentScreenshotUrl', defaultValue: '' });
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    if (!file.type.startsWith('image/')) {
      setUploadError('অনুগ্রহ করে শুধুমাত্র ছবি (JPG/PNG/Screenshot) সিলেক্ট করুন।');
      return;
    }

    setIsCompressing(true);
    try {
      const compressed = await compressImageFile(file);
      if (setValue) {
        setValue('paymentScreenshotUrl', compressed, { shouldDirty: true });
      }
    } catch {
      setUploadError('স্ক্রিনশট আপলোড করতে সমস্যা হয়েছে, আবার চেষ্টা করুন।');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleClearScreenshot = () => {
    setUploadError(null);
    if (setValue) {
      setValue('paymentScreenshotUrl', '', { shouldDirty: true });
    }
  };

  const getBrandColors = (method: string) => {
    switch (method) {
      case 'bKash':
        return {
          bg: 'bg-[#e2136e]/5',
          border: 'border-[#e2136e]',
          text: 'text-[#e2136e]',
          accent: 'accent-[#e2136e]',
          ring: 'ring-[#e2136e]'
        };
      case 'Nagad':
        return {
          bg: 'bg-[#f7941d]/5',
          border: 'border-[#f7941d]',
          text: 'text-[#f7941d]',
          accent: 'accent-[#f7941d]',
          ring: 'ring-[#f7941d]'
        };
      case 'Rocket':
        return {
          bg: 'bg-[#8c3494]/5',
          border: 'border-[#8c3494]',
          text: 'text-[#8c3494]',
          accent: 'accent-[#8c3494]',
          ring: 'ring-[#8c3494]'
        };
      case 'Cash On Delivery':
        return {
          bg: 'bg-gold-50',
          border: 'border-brand-gold',
          text: 'text-brand-gold',
          accent: 'accent-brand-gold',
          ring: 'ring-brand-gold'
        };
      default:
        return {
          bg: 'bg-white',
          border: 'border-gray-200',
          text: 'text-gray-600',
          accent: 'accent-brand-gold',
          ring: 'ring-brand-gold'
        };
    }
  };

  const brand = getBrandColors(paymentMethod);

  return (
    <div className="premium-card p-3 sm:p-5 md:p-8 rounded-2xl md:rounded-[2rem] space-y-4 sm:space-y-6 md:space-y-8">
      <div className="flex items-center gap-2.5 sm:gap-3 border-b border-gold-200 pb-3 sm:pb-4 mb-4 sm:mb-6">
        <CreditCard className="text-brand-gold" size={22} />
        <h2 className="text-base sm:text-lg font-serif font-black tracking-tight italic">Payment <span className="text-brand-gold">Details</span></h2>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {requiresAdvance300 && (
          <div className="p-3.5 sm:p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-950 space-y-1.5 shadow-sm">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-rose-700">
              <Scissors size={16} className="shrink-0" />
              <span>বডির মাপ অনুযায়ী বানিয়ে নেওয়ার জন্য ৳{advanceAmount} টাকা অগ্রিম প্রযোজ্য</span>
            </div>
            <p className="text-[11px] sm:text-xs font-semibold leading-relaxed text-amber-900">
              আপনার অর্ডারে বডির মাপে থ্রি-পিস বানিয়ে নেওয়ার আইটেম রয়েছে। অনুগ্রহ করে নিচের <strong>bKash / Nagad / Rocket</strong> থেকে যেকোনো একটি মাধ্যমে মাত্র <strong>৳{advanceAmount} টাকা অগ্রিম</strong> পাঠিয়ে প্রেরকের নম্বর ও Transaction ID দিন। বাকি <strong>৳{dueAmount.toLocaleString('en-US')} টাকা</strong> পার্সেল হাতে পেয়ে পরিশোধ করবেন।
            </p>
          </div>
        )}

        <label className="text-xs font-bold text-gray-800 tracking-tight block">
          {requiresAdvance300
            ? '৳৩০০ অগ্রিম পেমেন্টের মাধ্যম নির্বাচন করুন *'
            : 'Select Payment Method / পেমেন্ট মাধ্যম নির্বাচন করুন *'}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
          {['Cash On Delivery', 'bKash', 'Nagad', 'Rocket'].map((method) => {
            const mBrand = getBrandColors(method);
            const isCodBlocked = requiresAdvance300 && method === 'Cash On Delivery';
            return (
              <label 
                key={method}
                className={`flex flex-col items-center justify-center p-3 sm:p-4 border-2 rounded-xl sm:rounded-2xl transition-all duration-300 shadow-sm ${
                  isCodBlocked
                    ? 'border-gray-100 bg-gray-100/70 opacity-50 cursor-not-allowed'
                    : paymentMethod === method 
                      ? `${mBrand.border} ${mBrand.bg} ring-4 ring-brand-gold/5 cursor-pointer` 
                      : 'border-gray-100 hover:border-gold-200 bg-white cursor-pointer'
                }`}
              >
                <input 
                  type="radio" 
                  value={method} 
                  disabled={isCodBlocked}
                  {...register('paymentMethod', { required: 'Please select a payment method' })}
                  className="hidden"
                />
                <span className={`text-[11px] sm:text-xs font-black text-center uppercase tracking-wider ${
                  isCodBlocked
                    ? 'text-gray-400 line-through'
                    : paymentMethod === method
                      ? mBrand.text
                      : 'text-gray-400'
                }`}>
                  {method}
                </span>
                {isCodBlocked && (
                  <span className="text-[9px] font-bold text-rose-600 mt-1 text-center">
                    অগ্রিম প্রযোজ্য
                  </span>
                )}
              </label>
            );
          })}
        </div>
        {errors.paymentMethod && <p className="text-red-500 text-xs font-bold">{errors.paymentMethod.message}</p>}

        {paymentMethod && paymentMethod !== 'Cash On Delivery' && (
          <div className={`p-4 sm:p-8 ${brand.bg} rounded-2xl md:rounded-[2rem] border-2 ${brand.border} space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-top-4 transition-all duration-500 shadow-xl`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-lg">
              <div>
                <p className={`text-[10px] uppercase tracking-[0.2em] font-black mb-1.5 ${brand.text}`}>
                  Official Recipient Method: {paymentMethod}
                </p>
                <p className="text-sm sm:text-base font-sans tracking-tight">
                  এই নম্বরে টাকা পাঠান: <span className={`${brand.text} font-black underline decoration-2 underline-offset-4`}>01724628453</span>
                </p>
              </div>
              <div className={`text-xs font-black uppercase tracking-widest px-4 py-1.5 sm:px-6 sm:py-2 rounded-full border-2 ${brand.border} ${brand.bg} ${brand.text} self-start md:self-auto`}>
                পার্সোনাল / Personal
              </div>
            </div>

            <div className="space-y-4 bg-white/60 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/40 shadow-inner">
              <h3 className="font-black text-brand-charcoal text-xs uppercase tracking-widest flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${brand.border} border-4`}></div>
                কিভাবে পেমেন্ট করবেন? (Instructions)
              </h3>
              <ul className="text-xs text-gray-700 space-y-3 font-medium">
                <li className="flex gap-2">
                  <span className="font-black text-brand-gold">01.</span>
                  <span>আপনার <span className={`font-black ${brand.text}`}>{paymentMethod}</span> অ্যাপ অথবা মেনুতে যান।</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-black text-brand-gold">02.</span>
                  <span>'Send Money' (মানি সেন্ড) অপশনটি সিলেক্ট করুন।</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-black text-brand-gold">03.</span>
                  <span>প্রাপক হিসেবে <span className="font-black underline scale-105 inline-block">01724628453</span> নম্বরটি টাইপ করুন।</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-black text-brand-gold">04.</span>
                  {requiresAdvance300 ? (
                    <span>
                      বডির মাপে বানানোর অগ্রিম বাবদ <span className="font-black text-rose-600">৳{advanceAmount} টাকা</span> টাইপ করে পিন নম্বর দিয়ে সেন্ড করুন (বাকি ৳{dueAmount.toLocaleString('en-US')} ডেলিভারির সময় দিবেন)।
                    </span>
                  ) : (
                    <span>অর্ডারকৃত পণ্যের মোট টাকা টাইপ করে পিন নম্বর দিয়ে সফলভাবে সেন্ড করুন।</span>
                  )}
                </li>
                <li className="flex gap-2">
                  <span className="font-black text-brand-gold">05.</span>
                  <span>পেমেন্ট সফল হওয়ার পর প্রাপ্ত <span className={`font-black ${brand.text}`}>Transaction ID (TrxID)</span> এবং আপনার সেন্ডার নম্বর নিচের বক্সে দিন (চাইলে পেমেন্ট স্ক্রিনশটও যুক্ত করতে পারেন)।</span>
                </li>
              </ul>
            </div>

            <div className="pt-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-800 tracking-tight block">
                    যে নম্বর থেকে টাকা পাঠিয়েছেন {requiresAdvance300 ? '*' : '(ঐচ্ছিক)'}
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    {...register('paymentSenderNumber', {
                      required: requiresAdvance300 && paymentMethod !== 'Cash On Delivery'
                        ? 'যে নম্বর থেকে টাকা পাঠিয়েছেন সেটি লিখুন'
                        : false
                    })}
                    placeholder="যেমন: 017XXXXXXXX"
                    className={`w-full px-4 sm:px-5 py-3.5 sm:py-4 rounded-2xl border-2 border-gray-100 focus:${brand.border} focus:ring-4 focus:ring-brand-gold/10 outline-none transition-all bg-white text-sm sm:text-base font-bold tracking-wider placeholder:text-gray-300`}
                  />
                  {errors.paymentSenderNumber && (
                    <p className="text-red-500 text-xs font-bold mt-1">{errors.paymentSenderNumber.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-800 tracking-tight block">
                    Transaction Number / ট্রানজেকশন নম্বর *
                  </label>
                  <input 
                    {...register('transactionId', { required: paymentMethod !== 'Cash On Delivery' ? 'Transaction ID is required' : false })}
                    placeholder="যেমন: ABC123XYZ"
                    className={`w-full px-4 sm:px-5 py-3.5 sm:py-4 rounded-2xl border-2 border-gray-100 focus:${brand.border} focus:ring-4 focus:ring-brand-gold/10 outline-none transition-all bg-white text-sm sm:text-base font-bold uppercase tracking-widest placeholder:text-gray-300`}
                  />
                  {errors.transactionId && <p className="text-red-500 text-xs font-bold mt-1">{errors.transactionId.message}</p>}
                </div>
              </div>

              {/* Optional Payment Screenshot Proof Upload */}
              {setValue && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-800 tracking-tight flex items-center gap-1.5">
                    <ImageIcon size={14} className={brand.text} />
                    <span>পেমেন্ট স্ক্রিনশট আপলোড করুন (প্রমাণ - ঐচ্ছিক)</span>
                  </label>

                  {!paymentScreenshotUrl ? (
                    <label className="flex items-center justify-center gap-2.5 w-full px-4 py-3.5 rounded-2xl border-2 border-dashed border-gray-300 bg-white/80 hover:bg-white hover:border-brand-gold transition-all cursor-pointer text-xs sm:text-sm font-bold text-gray-700">
                      <Upload size={16} className={brand.text} />
                      <span>
                        {isCompressing
                          ? 'স্ক্রিনশট প্রসেস হচ্ছে...'
                          : 'পেমেন্টের স্ক্রিনশট ছবি বেছে নিন (ট্যাপ করুন)'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleScreenshotChange}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-2xl border-2 border-emerald-200 shadow-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={paymentScreenshotUrl}
                          alt="Payment Proof Preview"
                          className="w-14 h-14 object-cover rounded-xl border border-gray-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-black text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 size={14} className="shrink-0" />
                            <span>পেমেন্ট স্ক্রিনশট সংযুক্ত হয়েছে</span>
                          </p>
                          <p className="text-[11px] text-gray-500 font-semibold truncate">
                            অ্যাডমিন ড্যাশবোর্ডে সরাসরি দেখা যাবে
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearScreenshot}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors shrink-0 cursor-pointer"
                        title="স্ক্রিনশট সরান"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  {uploadError && (
                    <p className="text-red-500 text-xs font-bold">{uploadError}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="pt-6 border-t-2 border-gold-200">
        <label className="flex items-center gap-4 cursor-pointer group p-4 bg-brand-cream/30 rounded-2xl hover:bg-brand-cream/50 transition-all border border-transparent hover:border-brand-gold/20">
          <input 
            type="checkbox" 
            defaultChecked={true}
            {...register('agreement', { required: 'অর্ডার সম্পন্ন করার জন্য শর্তাবলীতে সম্মতি দিন' })}
            className="w-6 h-6 accent-brand-gold shrink-0 cursor-pointer"
          />
          <span className="text-xs font-bold text-gray-700 group-hover:text-brand-charcoal transition-colors">
            আমি নিশ্চিত করেছি যে উপরে সকল তথ্য সঠিক এবং আমি অর্ডারটি কনফার্ম করছি
          </span>
        </label>
        {errors.agreement && <p className="text-red-500 text-xs font-bold mt-2 ml-10 flex items-center gap-1">
          <span className="bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px]">!</span>
          {errors.agreement.message}
        </p>}
      </div>
    </div>
  );
}
