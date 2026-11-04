import React, { useState, useEffect } from 'react';
import { RefreshCcw, ShieldCheck, AlertCircle, Phone, MessageCircle, X, Headphones, Clock, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { BrandSettings } from '../types';
import { getBrandSettings } from '../services/settingsService';

interface ReturnPolicyProps {
  onClose?: () => void;
  brandSettings?: BrandSettings | null;
}

export default function ReturnPolicy({ onClose, brandSettings: initialSettings }: ReturnPolicyProps) {
  const [settings, setSettings] = useState<BrandSettings | null>(() => {
    if (initialSettings) return initialSettings;
    try {
      const cached = localStorage.getItem('brand_settings');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return null;
  });

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    } else {
      getBrandSettings().then(data => {
        if (data) setSettings(data);
      }).catch(() => {});
    }

    const handleSettingsUpdate = (e: any) => {
      if (e.detail) {
        setSettings(e.detail);
      } else {
        getBrandSettings().then(data => {
          if (data) setSettings(data);
        }).catch(() => {});
      }
    };

    window.addEventListener('brand_settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('brand_settings_updated', handleSettingsUpdate);
  }, [initialSettings]);

  // Dynamic Contact Numbers configured from Admin Panel
  const helplinePhone = settings?.helplinePhone || settings?.footer?.phone || '01724628453';
  const rawWhatsApp = settings?.whatsappNumber || settings?.footer?.whatsappNumber || helplinePhone || '01724628453';
  const customWaMessage = settings?.whatsappMessage || 'হ্যালো সেরা ফ্যাশন, আমি আপনাদের পণ্য ও রিটার্ন পলিসি সংক্রান্ত বিষয়ে সরাসরি কথা বলতে চাই।';

  // Format WhatsApp number for international link (8801XXXXXXXXX)
  const formatWhatsAppNumber = (num: string) => {
    const digitsOnly = num.replace(/\D/g, '');
    if (digitsOnly.startsWith('880')) return digitsOnly;
    if (digitsOnly.startsWith('01')) return `88${digitsOnly}`;
    if (digitsOnly.startsWith('1')) return `880${digitsOnly}`;
    return digitsOnly || '8801724628453';
  };

  const cleanWaNumber = formatWhatsAppNumber(rawWhatsApp);
  const waUrl = `https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(customWaMessage)}`;
  const cleanPhone = helplinePhone.replace(/[^\d+]/g, '');

  return (
    <div className="premium-card p-6 md:p-8 rounded-2xl sm:rounded-3xl space-y-6 md:space-y-8 bg-white border border-amber-200/80 shadow-2xl relative max-w-4xl mx-auto select-none font-sans">
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
          title="বন্ধ করুন"
        >
          <X size={20} />
        </button>
      )}

      {/* Header Banner */}
      <div className="text-center space-y-2 border-b border-amber-100 pb-5">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-amber-400/30 to-amber-500/10 text-amber-700 border border-amber-300 shadow-sm mb-1">
          <RefreshCcw size={28} className="animate-spin-slow" />
        </div>
        <h2 className="text-xl sm:text-2xl font-serif font-black text-slate-900 tracking-tight">
          রিটার্ন ও এক্সচেঞ্জ পলিসি (Return Policy)
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 font-medium">
          SERA FASHION - ক্রেতার সন্তুষ্টি ও আস্থা আমাদের সর্বোচ্চ অগ্রাধিকার
        </p>
      </div>

      {/* Policy Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100">
            <div className="mt-0.5 text-emerald-600 shrink-0">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">রিটার্ন কখন সহজে গ্রহণ করা হবে?</h3>
              <ul className="text-xs text-gray-650 list-disc ml-4 space-y-1.5 mt-2 font-medium">
                <li>পণ্যের রঙ বা ডিজাইন যদি ছবির সাথে মিল না থাকে।</li>
                <li>পণ্যের কোয়ালিটি বা ফেব্রিক্স আশানুরূপ না হলে।</li>
                <li>পণ্যটি যদি ছেঁড়া, ক্ষতিগ্রস্ত বা কোনোভাবে ত্রুটিপূর্ণ থাকে।</li>
                <li>ডেলিভারির সময় সাইজ পরিবর্তনের প্রয়োজন হলে।</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-amber-50/60 p-4 rounded-2xl border border-amber-100">
            <div className="mt-0.5 text-amber-600 shrink-0">
              <AlertCircle size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">বিশেষ দ্রষ্টব্য (Note):</h3>
              <p className="text-xs text-gray-650 mt-1.5 leading-relaxed font-medium">
                পণ্য সম্পূর্ণ ঠিক থাকা সত্ত্বেও যদি আপনি কোনো ব্যক্তিগত কারণে রিটার্ন করতে চান, সেক্ষেত্রে শুধুমাত্র <strong>ডেলিভারি চার্জ ও রিটার্ন কুরিয়ার ফি</strong> প্রদান করতে হবে।
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-orange-500/10 p-4 rounded-2xl border border-amber-200/80 text-xs sm:text-sm text-slate-800 leading-relaxed font-semibold">
            ✨ "অবশ্যই ডেলিভারি ম্যানের সামনে পার্সেলটি খুলে পণ্য দেখে রিসিভ করবেন। কোনো ত্রুটি পরিলক্ষিত হলে ডেলিভারি ম্যান থাকা অবস্থাতেই আমাদের হেল্পলাইনে কল দিন।"
          </div>

          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">রিটার্ন প্রযোজ্য হবে না যদি:</h3>
            <ul className="text-xs text-gray-600 list-disc ml-4 space-y-1 font-medium">
              <li>পণ্যটি ব্যবহার বা ওয়াশ (ধৌত) করা হয়ে থাকে।</li>
              <li>পণ্যটির আসল ট্যাগ বা প্যাকেজিং নষ্ট করা হয়ে থাকে।</li>
              <li>ডেলিভারি গ্রহণের দীর্ঘ সময় পর অবহেলাজনিত ক্ষতি হলে।</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Dynamic WhatsApp and Call Action Buttons Section */}
      <div className="pt-6 border-t border-amber-100 bg-slate-50/70 p-5 rounded-2xl border border-slate-200/70">
        <div className="text-center space-y-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 text-[10.5px] font-black uppercase tracking-wider border border-emerald-200">
              <Headphones size={13} className="text-emerald-600" />
              <span>২৪/৭ ডেডিকেটেড কাস্টমার হেল্পলাইন</span>
            </div>
            <p className="text-sm font-bold text-slate-900">
              যেকোনো সহযোগিতার জন্য আমাদের সাথে সরাসরি যোগাযোগ করুন
            </p>
            <p className="text-xs text-gray-500 font-medium">
              আপনার যে-কোনো সমস্যা বা রিটার্নের বিষয়ে আমরা সর্বোচ্চ আন্তরিকতার সাথে তাৎক্ষণিক সমাধান দিতে প্রস্তুত।
            </p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {/* WhatsApp Button */}
            <a 
              href={waUrl} 
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-[#25D366] hover:bg-[#1ebe57] text-white rounded-xl text-xs sm:text-sm font-black transition-all shadow-lg shadow-emerald-500/20 active:scale-95 group cursor-pointer"
              title="সরাসরি হোয়াটসঅ্যাপে কথা বলুন"
            >
              <MessageCircle size={18} className="group-hover:scale-110 transition-transform" />
              <span>WhatsApp : {rawWhatsApp}</span>
            </a>

            {/* Call Now Button */}
            <a 
              href={`tel:${cleanPhone}`} 
              className="flex items-center gap-2 px-6 py-3 bg-slate-950 hover:bg-black text-amber-400 hover:text-amber-300 rounded-xl text-xs sm:text-sm font-black transition-all shadow-lg shadow-black/20 border border-amber-400/40 active:scale-95 group cursor-pointer"
              title="সরাসরি আমাদের নম্বরে কল করুন"
            >
              <Phone size={18} className="text-amber-400 group-hover:scale-110 transition-transform animate-pulse" />
              <span>কল করুন : {helplinePhone}</span>
            </a>
          </div>

          <p className="text-[10.5px] text-gray-400 font-medium pt-1">
            (অফিসিয়াল হেল্পলাইন ও হোয়াটসঅ্যাপ নম্বর এডমিন প্যানেল থেকে সার্বক্ষণিক পরিচালিত)
          </p>
        </div>
      </div>

      <div className="text-center">
        <p className="text-brand-gold font-serif italic text-xs sm:text-sm font-bold">
          সেরা ফ্যাশন (SERA FASHION) এর সাথে আপনার প্রতিটি কেনাকাটা নিরাপদ ও নির্ভরযোগ্য। ❤️
        </p>
      </div>
    </div>
  );
}
