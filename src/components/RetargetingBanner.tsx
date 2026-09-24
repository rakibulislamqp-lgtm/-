import React from 'react';
import { Sparkles, ShieldCheck, Truck, ShoppingBag } from 'lucide-react';
import { BrandSettings } from '../types';

interface RetargetingBannerProps {
  brandSettings: BrandSettings | null;
}

export default function RetargetingBanner({ brandSettings }: RetargetingBannerProps) {
  if (brandSettings?.retargetingBannerEnabled === false) {
    return null;
  }

  const rawText = brandSettings?.retargetingBannerText;
  // Use requested text default and strip out any old "ফিরে আসার অভিনন্দন" if present in cached settings
  const baseText = rawText && !rawText.includes('ফিরে আসার অভিনন্দন')
    ? rawText
    : 'SERA FASHION – বিশ্বস্ততার সাথে প্রিমিয়াম শাড়ি ও বাংলাদেশ এবং পাকিস্তানি থ্রি-পিস সারা বাংলাদেশে দ্রুত ডেলিভারি ক্যাশ অন ডেলিভারি, কোয়ালিটি নিশ্চিত আজই অর্ডার করুন।';
  const announcementText = baseText.replace(/^Sera\s*–/i, 'SERA FASHION –');

  return (
    <div className="relative bg-slate-950 text-white text-xs font-bold border-b border-amber-500/30 shadow-md overflow-hidden select-none">
      
      {/* Dynamic Keyframe Style Block for Silky Smooth Infinite Marquee */}
      <style>{`
        @keyframes bannerMarquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-banner-marquee {
          display: flex;
          width: max-content;
          animation: bannerMarquee 32s linear infinite !important;
        }
      `}</style>

      {/* Background Gradient & Glow Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-rose-950 via-purple-950 to-slate-950 opacity-90 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-32 h-full bg-rose-500/10 blur-md pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-32 h-full bg-amber-500/10 blur-md pointer-events-none" />

      <div className="relative max-w-7xl mx-auto flex items-center justify-between py-2 px-3 md:px-4 gap-3">
        
        {/* Left Live Badge Icon */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 bg-rose-600/30 border border-rose-500/40 rounded-full shrink-0 text-amber-300 text-[10px] uppercase font-black tracking-wider">
          <Sparkles size={12} className="animate-pulse text-amber-400" />
          <span>অফিসিয়াল অ্যানাউন্সমেন্ট</span>
        </div>

        {/* Middle Running Ticker Container */}
        <div className="flex-1 overflow-hidden relative pointer-events-none py-0.5">
          <div className="animate-banner-marquee items-center gap-8 text-xs font-semibold text-rose-100 whitespace-nowrap">
            
            {/* Repeat 1 */}
            <div className="flex items-center gap-4">
              <span className="text-amber-300 font-extrabold tracking-wide flex items-center gap-1.5">
                <ShoppingBag size={13} className="text-amber-400 inline shrink-0" />
                {announcementText}
              </span>
              <span className="text-rose-400/60 font-bold">•</span>
              <span className="text-emerald-300 font-bold flex items-center gap-1">
                <Truck size={13} className="text-emerald-400 shrink-0" />
                সারা বাংলাদেশে ক্যাশ অন ডেলিভারি
              </span>
              <span className="text-rose-400/60 font-bold">•</span>
              <span className="text-amber-200 font-bold flex items-center gap-1">
                <ShieldCheck size={13} className="text-amber-400 shrink-0" />
                ১০০% কোয়ালিটি গ্যারান্টি
              </span>
            </div>

            {/* Repeat 2 for seamless infinite scroll loop */}
            <div className="flex items-center gap-4">
              <span className="text-amber-300 font-extrabold tracking-wide flex items-center gap-1.5">
                <ShoppingBag size={13} className="text-amber-400 inline shrink-0" />
                {announcementText}
              </span>
              <span className="text-rose-400/60 font-bold">•</span>
              <span className="text-emerald-300 font-bold flex items-center gap-1">
                <Truck size={13} className="text-emerald-400 shrink-0" />
                সারা বাংলাদেশে ক্যাশ অন ডেলিভারি
              </span>
              <span className="text-rose-400/60 font-bold">•</span>
              <span className="text-amber-200 font-bold flex items-center gap-1">
                <ShieldCheck size={13} className="text-amber-400 shrink-0" />
                ১০০% কোয়ালিটি গ্যারান্টি
              </span>
            </div>

          </div>
        </div>

        {/* Ticker marquee is full-width and uninterrupted */}
      </div>
    </div>
  );
}

