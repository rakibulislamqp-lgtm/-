import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, HelpCircle, FileText, Phone, Mail, MapPin, Truck, RefreshCw, AlertCircle, ShoppingBag, Sparkles } from 'lucide-react';
import { FooterSettings } from '../types';

export type FooterInfoType = 
  | 'about' 
  | 'contact' 
  | 'company' 
  | 'stories' 
  | 'terms' 
  | 'privacy' 
  | 'careers' 
  | 'how_to_order' 
  | 'support_center'
  | 'payment_methods' 
  | 'shipping' 
  | 'faq' 
  | 'refund_policy' 
  | 'exchange' 
  | 'cancellation' 
  | 'pre_order' 
  | 'extra_discount';

interface FooterInfoModalProps {
  type: FooterInfoType | null;
  onClose: () => void;
  footerSettings?: FooterSettings;
  onOpenOrderTracking?: () => void;
  onOpenReturnPolicy?: () => void;
}

export default function FooterInfoModal({
  type,
  onClose,
  footerSettings,
  onOpenOrderTracking,
  onOpenReturnPolicy
}: FooterInfoModalProps) {
  if (!type) return null;

  const brandName = (footerSettings?.brandName && footerSettings.brandName !== 'SERA') ? footerSettings.brandName : 'SERA FASHION';
  const phone = footerSettings?.phone || '+880 1700-000000';
  const email = footerSettings?.email || 'contact@serafashion.com';
  const address = footerSettings?.address || 'ধানমন্ডি, ঢাকা, বাংলাদেশ';

  const getContent = () => {
    switch (type) {
      case 'about':
        return {
          title: 'আমাদের সম্পর্কে (About Us)',
          subtitle: `${brandName} এর মূল লক্ষ্য ও প্রতিশ্রুতি`,
          icon: Sparkles,
          body: (
            <div className="space-y-4 text-sm text-gray-650 leading-relaxed font-sans">
              <p>
                {footerSettings?.aboutUsText || 
                  `${brandName} একটি প্রিমিয়াম ই-কমার্স প্ল্যাটফর্ম, যা সারা বাংলাদেশের সম্মানিত ক্রেতাদের জন্য খাঁটি, নিরাপদ এবং উচ্চমানের পণ্য সরবরাহ করার লক্ষ্যে অঙ্গীকারবদ্ধ। আমরা বিশ্বাস করি গ্রাহকের সন্তুষ্টি ও আস্থা আমাদের সবচেয়ে বড় শক্তি।`}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-2xl">
                  <h4 className="font-bold text-amber-950 text-xs mb-1">১০০% কোয়ালিটি নিশ্চয়তা</h4>
                  <p className="text-[11.5px] text-amber-900/80">প্রতিটি পণ্য কড়া মাননিয়ন্ত্রণের মাধ্যমে যাচাইকৃত।</p>
                </div>
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl">
                  <h4 className="font-bold text-emerald-950 text-xs mb-1">দ্রুততম ডেলিভারি</h4>
                  <p className="text-[11.5px] text-emerald-900/80">সারা বাংলাদেশে বিশ্বস্ত কুরিয়ারে নিরাপদ পৌঁছানো।</p>
                </div>
                <div className="p-3.5 bg-rose-50/70 border border-rose-200/60 rounded-2xl">
                  <h4 className="font-bold text-rose-950 text-xs mb-1">ক্যাশ অন ডেলিভারি</h4>
                  <p className="text-[11.5px] text-rose-900/80">পণ্য হাতে পেয়ে মূল্য পরিশোধের পূর্ণ নিশ্চয়তা।</p>
                </div>
              </div>
            </div>
          )
        };

      case 'contact':
        return {
          title: 'যোগাযোগ করুন (Contact Us)',
          subtitle: 'যেকোনো প্রশ্ন বা সহায়তায় আমাদের টিম আপনার পাশে আছে',
          icon: Phone,
          body: (
            <div className="space-y-5 text-sm text-gray-700">
              <p className="text-xs text-gray-500 leading-relaxed">
                আমাদের সাপোর্ট টিম সকাল ১০:০০ টা থেকে রাত ১০:০০ টা পর্যন্ত আপনার সেবায় নিয়োজিত।
              </p>
              <div className="space-y-3">
                <a 
                  href={`tel:${phone.replace(/\s+/g, '')}`} 
                  className="flex items-center gap-3.5 p-3.5 bg-slate-50 hover:bg-rose-50/50 border border-slate-200/80 rounded-2xl transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Phone size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">হটলাইন / কাস্টমার কেয়ার</span>
                    <span className="text-sm font-black text-slate-800 group-hover:text-rose-600 transition-colors font-mono">{phone}</span>
                  </div>
                </a>

                <a 
                  href={`mailto:${email}`} 
                  className="flex items-center gap-3.5 p-3.5 bg-slate-50 hover:bg-rose-50/50 border border-slate-200/80 rounded-2xl transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Mail size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">অফিসিয়াল ইমেইল</span>
                    <span className="text-sm font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{email}</span>
                  </div>
                </a>

                <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">হেড অফিস / ঠিকানা</span>
                    <span className="text-xs font-black text-slate-800">{address}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        };

      case 'company':
      case 'stories':
        return {
          title: 'কোম্পানি পরিচিতি ও গল্প (Company Story)',
          subtitle: 'আস্থা ও সুনামের সাথে আমাদের পথচলা',
          icon: ShieldCheck,
          body: (
            <div className="space-y-4 text-sm text-gray-650 leading-relaxed font-sans">
              {footerSettings?.companyInfoText ? (
                <p className="whitespace-pre-line">{footerSettings.companyInfoText}</p>
              ) : (
                <>
                  <p>
                    <strong>{brandName}</strong> শুরু হয়েছিল একটি স্পষ্ট স্বপ্ন নিয়ে—সবার কাছে সেরা গুণগত মানের পণ্য পৌঁছে দেওয়া। আমরা সরাসরি বিশ্বস্ত সোর্স এবং দক্ষ কারিগরদের থেকে প্রতিটি পণ্য সংগ্রহ করি।
                  </p>
                  <p>
                    আমাদের প্রতিটি পার্সেল প্যাকিংয়ের পূর্বে নিখুঁতভাবে কোয়ালিটি চেক করা হয়। আমাদের লক্ষ্য শুধু কেনাবেচা নয়, বরং প্রতিটি ক্রেতার সাথে দীর্ঘমেয়াদী আস্থার বন্ধন গড়ে তোলা।
                  </p>
                </>
              )}
            </div>
          )
        };

      case 'terms':
        return {
          title: 'শর্তাবলী (Terms & Conditions)',
          subtitle: 'অর্ডার করার পূর্বে নিয়মাবলী জেনে নিন',
          icon: FileText,
          body: (
            <div className="space-y-3.5 text-xs text-gray-650 leading-relaxed font-sans">
              {footerSettings?.termsText ? (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 whitespace-pre-line">
                  {footerSettings.termsText}
                </div>
              ) : (
                <>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <strong className="text-slate-900 block mb-1">১. অর্ডার কনফার্মেশন:</strong>
                    <p>অর্ডার সাবমিট করার পর আমাদের প্রতিনিধি বা অটোমেটেড ভেরিফিকেশন সিস্টেমের মাধ্যমে অর্ডার নিশ্চিত করা হয়।</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <strong className="text-slate-900 block mb-1">২. ডেলিভারি সময়সীমা:</strong>
                    <p>ঢাকা সিটির মধ্যে সাধারণত ২৪-৪৮ ঘণ্টা এবং ঢাকার বাইরে ২-৪ কার্যদিবসের মধ্যে কুরিয়ার মারফত ডেলিভারি প্রদান করা হয়।</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <strong className="text-slate-900 block mb-1">৩. পণ্য যাচাই:</strong>
                    <p>ডেলিভারিম্যানের সামনে পার্সেলটি চেক করে মূল্য পরিশোধ করতে পারেন। কোনো অসঙ্গতি দেখলে সাথে সাথে কাস্টমার কেয়ারে যোগাযোগ করুন।</p>
                  </div>
                </>
              )}
            </div>
          )
        };

      case 'privacy':
        return {
          title: 'প্রাইভেসি পলিসি (Privacy Policy)',
          subtitle: 'আপনার তথ্যের গোপনীয়তা ও সুরক্ষা নিশ্চিতকরণ',
          icon: ShieldCheck,
          body: (
            <div className="space-y-3 text-xs text-gray-650 leading-relaxed font-sans">
              {footerSettings?.privacyText ? (
                <p className="whitespace-pre-line">{footerSettings.privacyText}</p>
              ) : (
                <>
                  <p>
                    {brandName}-এ আপনার ব্যক্তিগত তথ্যের নিরাপত্তা আমাদের সর্বোচ্চ অগ্রাধিকার। অর্ডার প্রসেসিং এবং ডেলিভারি সম্পন্ন করার উদ্দেশ্যেই শুধুমাত্র আপনার নাম, মোবাইল নম্বর এবং ঠিকানা সংগ্রহ করা হয়।
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 pl-1 text-gray-700">
                    <li>আপনার মোবাইল নম্বর বা কোনো ব্যক্তিগত তথ্য তৃতীয় কোনো পক্ষের কাছে বিক্রি বা অপব্যবহার করা হয় না।</li>
                    <li>নিরাপদ পেমেন্ট ও এনক্রিপ্টেড সিস্টেমে আপনার ডাটা সুরক্ষিত থাকে।</li>
                    <li>প্রয়োজনে যেকোনো সময় আপনার তথ্য মুছে ফেলার জন্য আমাদের সাথে যোগাযোগ করতে পারেন।</li>
                  </ul>
                </>
              )}
            </div>
          )
        };

      case 'how_to_order':
        return {
          title: 'কীভাবে অর্ডার করবেন? (How to Order)',
          subtitle: 'মাত্র ৩টি সহজ ধাপে ঘরে বসে অর্ডার সম্পন্ন করুন',
          icon: ShoppingBag,
          body: (
            <div className="space-y-3 text-xs text-gray-700">
              <div className="flex gap-3 p-3 bg-rose-50/50 border border-rose-100 rounded-xl">
                <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-black text-xs flex items-center justify-center shrink-0">১</span>
                <div>
                  <strong className="text-slate-900 block">পছন্দের পণ্য নির্বাচন করুন:</strong>
                  <span>পণ্য দেখে "অর্ডার করুন" বা "কার্টে যোগ করুন" বাটনে ক্লিক করুন।</span>
                </div>
              </div>

              <div className="flex gap-3 p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0">২</span>
                <div>
                  <strong className="text-slate-900 block">ঠিকানা ও ফোন নম্বর লিখুন:</strong>
                  <span>আপনার নাম, সম্পূর্ণ ঠিকানা এবং সচল মোবাইল নম্বর পূরণ করুন।</span>
                </div>
              </div>

              <div className="flex gap-3 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">৩</span>
                <div>
                  <strong className="text-slate-900 block">অর্ডার কনফার্ম করুন:</strong>
                  <span>"অর্ডার নিশ্চিত করুন" চাপলেই অর্ডারটি সম্পন্ন হবে এবং ক্যাশ অন ডেলিভারিতে পণ্য পৌঁছাবে!</span>
                </div>
              </div>
            </div>
          )
        };

      case 'support_center':
      case 'faq':
        return {
          title: 'সাপোর্ট ও সাধারণ প্রশ্নোত্তর (FAQ)',
          subtitle: 'প্রয়োজনীয় প্রশ্নের সহজ উত্তর',
          icon: HelpCircle,
          body: (
            <div className="space-y-2.5 text-xs text-gray-650">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <strong className="text-slate-900 block mb-1">প্রশ্ন: আমি কি ডেলিভারির সময় পণ্য দেখে নিতে পারি?</strong>
                <p>উত্তর: হ্যাঁ, ডেলিভারিম্যানের সামনে পার্সেল চেক করে গ্রহণ করার পূর্ণ সুবিধা পাবেন।</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <strong className="text-slate-900 block mb-1">প্রশ্ন: ঢাকার বাইরে ডেলিভারি পেতে কতদিন সময় লাগে?</strong>
                <p>উত্তর: ঢাকার বাইরে সাধারণত ২ থেকে ৩ কার্যদিবসের মধ্যে নির্ভরযোগ্য কুরিয়ারে পৌঁছানো হয়।</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <strong className="text-slate-900 block mb-1">প্রশ্ন: পণ্যে কোনো সমস্যা থাকলে কি রিটার্ন বা এক্সচেঞ্জ করা যায়?</strong>
                <p>উত্তর: অবশ্যই! ৭ দিনের সহজ রিটার্ন ও এক্সচেঞ্জ পলিসি বিদ্যমান রয়েছে।</p>
              </div>
            </div>
          )
        };

      case 'shipping':
        return {
          title: 'শিপিং ও ডেলিভারি তথ্য (Shipping Policy)',
          subtitle: 'সারা বাংলাদেশে দ্রুত ও নিরাপদ কুরিয়ার সার্ভিস',
          icon: Truck,
          body: (
            <div className="space-y-3 text-xs text-gray-650 leading-relaxed">
              <p>
                {footerSettings?.deliveryInfoText || 
                  'আমরা বিশ্বস্ত কুরিয়ার পার্টনারদের (Steadfast, Pathao) মাধ্যমে দেশজুড়ে দ্রুত পার্সেল ডেলিভারি করে থাকি।'}
              </p>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">ঢাকা সিটি</span>
                  <span className="text-sm font-black text-slate-800 block mt-0.5">২৪ - ৪৮ ঘণ্টা</span>
                  <span className="text-[10px] text-emerald-600 font-bold">হোম ডেলিভারি</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">ঢাকার বাইরে</span>
                  <span className="text-sm font-black text-slate-800 block mt-0.5">২ - ৪ কার্যদিবস</span>
                  <span className="text-[10px] text-emerald-600 font-bold">সারা বাংলাদেশ</span>
                </div>
              </div>
            </div>
          )
        };

      case 'refund_policy':
      case 'exchange':
      case 'cancellation':
        return {
          title: 'রিটার্ন, এক্সচেঞ্জ ও রিফান্ড পলিসি',
          subtitle: 'সহজ ও গ্রাহকবান্ধব নীতিমালা',
          icon: RefreshCw,
          body: (
            <div className="space-y-3.5 text-xs text-gray-650 leading-relaxed">
              <p>
                {footerSettings?.returnPolicyText || 
                  'আপনার কেনাকাটার আনন্দ নিশ্চিন্ত করতে আমাদের রয়েছে সহজ রিটার্ন ও পরিবর্তন সুবিধা। পণ্যে ত্রুটি থাকলে আমরা দ্রুততম সময়ে সমাধান প্রদান করি।'}
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-gray-700 pl-1">
                <li>পণ্য হাতে পাওয়ার পর যেকোনো সমস্যা থাকলে ৭ দিনের মধ্যে আমাদের জানান।</li>
                <li>এক্সচেঞ্জের ক্ষেত্রে সাইজ বা মডেল পরিবর্তনের সুযোগ রয়েছে।</li>
                <li>রিফান্ডের ক্ষেত্রে পণ্য ফেরত পাওয়ার ৩-৫ কার্যদিবসের মধ্যে বিকাশ/নগদে টাকা রিফান্ড করা হয়।</li>
              </ul>
              {onOpenReturnPolicy && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenReturnPolicy();
                    }}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm"
                  >
                    সম্পূর্ণ রিটার্ন পলিসি বিস্তারিত দেখুন
                  </button>
                </div>
              )}
            </div>
          )
        };

      case 'careers':
        return {
          title: 'ক্যারিয়ার (Careers)',
          subtitle: 'আমাদের দক্ষ টিমের সাথে ক্যারিয়ার গড়ুন',
          icon: Sparkles,
          body: (
            <div className="space-y-3 text-xs text-gray-650 leading-relaxed">
              <p>
                {brandName} সবসময় উদ্যমী ও প্রতিভাবান সদস্যদের স্বাগত জানায়। আপনি যদি কাস্টমার সাপোর্ট, ডিজিটাল মার্কেটিং বা লজিস্টিকসে ক্যারিয়ার গড়তে আগ্রহী হন, তবে আপনার সিভি পাঠাতে পারেন:
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-800 text-center">
                careers@sera.com.bd
              </div>
            </div>
          )
        };

      default:
        return {
          title: 'তথ্য ও সহায়তা',
          subtitle: `${brandName} এর সাথে কেনাকাটা করুন নিশ্চিন্তে`,
          icon: HelpCircle,
          body: (
            <p className="text-xs text-gray-600 leading-relaxed">
              যেকোনো তথ্যের জন্য আমাদের হটলাইন নম্বরে ({phone}) যোগাযোগ করুন।
            </p>
          )
        };
    }
  };

  const content = getContent();
  const IconComponent = content.icon;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-150 flex flex-col max-h-[85vh]"
        >
          {/* Modal Header */}
          <div className="p-5 md:p-6 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-950 text-white flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0">
                <IconComponent size={20} />
              </div>
              <div>
                <h3 className="text-sm md:text-base font-black tracking-tight">{content.title}</h3>
                <p className="text-[10px] md:text-xs text-slate-300 font-medium">{content.subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 md:p-8 overflow-y-auto flex-1">
            {content.body}
          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-slate-50 border-t border-gray-150 flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-medium">
              © 2026 {brandName}. সর্বস্বত্ব সংরক্ষিত।
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              বন্ধ করুন
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
