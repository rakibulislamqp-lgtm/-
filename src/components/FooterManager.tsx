import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  RefreshCw, 
  Building, 
  MapPin, 
  Phone, 
  Mail, 
  MessageCircle, 
  Smartphone, 
  CreditCard, 
  ShieldCheck, 
  Sparkles, 
  Save, 
  Upload,
  Image as ImageIcon,
  RotateCcw,
  FileText,
  Lock,
  ChevronDown,
  Info
} from 'lucide-react';
import { FacebookIcon, TwitterIcon, InstagramIcon, YoutubeIcon } from './SocialIcons';
import { BrandSettings, FooterSettings } from '../types';
import { 
  getBrandSettings, 
  updateBrandSettings, 
  updateBrandLogoSettings, 
  uploadAndSaveBrandLogo,
  updateSpecificLogoSettings
} from '../services/settingsService';
import defaultLogo from '../assets/images/sfh_logo_1779435027377.png';

interface FooterManagerProps {
  onRefreshSettings?: () => void;
}

export default function FooterManager({ onRefreshSettings }: FooterManagerProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  
  // Brand logo upload states
  const [currentLogo, setCurrentLogo] = useState<string>(defaultLogo);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoMessage, setLogoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Footer configuration state with SERA FASHION branding as first-class default
  const [footer, setFooter] = useState<FooterSettings>({
    brandName: 'SERA FASHION',
    subTagline: 'Pure & Authentic Luxury',
    tagline: 'SERA FASHION is an exclusive premium brand dedicated to providing authentic quality fashion, luxury three-piece and sarees to every home.',
    address: 'ধানমন্ডি, ঢাকা, বাংলাদেশ',
    phone: '+880 1700-000000',
    email: 'contact@serafashion.com',
    facebookUrl: 'https://www.facebook.com',
    twitterUrl: 'https://twitter.com',
    instagramUrl: 'https://instagram.com',
    youtubeUrl: 'https://youtube.com',
    whatsappNumber: '+8801700000000',
    showAppDownload: true,
    playStoreUrl: 'https://play.google.com',
    appStoreUrl: 'https://apps.apple.com',
    showPaymentBadges: true,
    paymentSectionTitle: 'Pay With',
    copyrightText: 'Copyright © 2026 SERA FASHION. All Rights Reserved.',
    aboutUsText: 'SERA FASHION একটি প্রিমিয়াম লাইফস্টাইল ও শাড়ি ব্র্যান্ড, যা খাঁটি গুণগত মান ও ঐতিহ্যবাহী ডিজাইনে প্রতিশ্রুতিবদ্ধ। প্রতিটি পণ্য শতভাগ নিখুঁতভাবে যাচাইকৃত।',
    companyInfoText: 'SERA FASHION শুরু হয়েছিল একটি স্পষ্ট স্বপ্ন নিয়ে—সবার কাছে সেরা গুণগত মানের পণ্য পৌঁছে দেওয়া। আমরা সরাসরি বিশ্বস্ত সোর্স এবং দক্ষ কারিগরদের থেকে প্রতিটি পণ্য সংগ্রহ করি।',
    deliveryInfoText: 'ঢাকা সিটিতে ২৪ ঘণ্টার মধ্যে এবং ঢাকার বাইরে ২-৩ কার্যদিবসে দ্রুত হোম ডেলিভারি। ক্যাশ অন ডেলিভারি প্রযোজ্য।',
    returnPolicyText: '৭ দিনের সহজ রিটার্ন ও এক্সচেঞ্জ সুবিধা রয়েছে। পণ্য দেখে মূল্য পরিশোধ করুন। কোনো সমস্যা থাকলে তাৎক্ষণিক এক্সচেঞ্জ বা রিফান্ড পলিসি রয়েছে।',
    termsText: 'অর্ডার করার পর আমাদের কাস্টমার কেয়ার থেকে কনফার্ম করা হবে। সারা দেশে বিশ্বস্ত কুরিয়ারে নিরাপদ হোম ডেলিভারি প্রদান করা হয়।',
    privacyText: 'আপনার নাম ও মোবাইল নম্বর সম্পূর্ণ সুরক্ষিত ও এনক্রিপ্টেড থাকে। কোনো তৃতীয় পক্ষের সাথে শেয়ার করা হয় না।'
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const brand = await getBrandSettings();
        if (brand?.footerLogoUrl || brand?.logoUrl) {
          setCurrentLogo(brand.footerLogoUrl || brand.logoUrl);
        }
        if (brand?.footer) {
          setFooter(prev => ({
            ...prev,
            ...brand.footer,
            // Ensure brandName is never empty and defaults to SERA FASHION if not set or was SERA
            brandName: (brand.footer.brandName && brand.footer.brandName !== 'SERA') ? brand.footer.brandName : 'SERA FASHION',
          }));
        } else if (brand) {
          setFooter(prev => ({
            ...prev,
            facebookUrl: brand.facebookUrl || prev.facebookUrl,
          }));
        }
      } catch (err) {
        console.error('Error loading footer settings:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Handle Logo Upload from Phone Gallery / PC
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoMessage({ type: 'error', text: 'শুধুমাত্র ছবি (JPG, PNG, WEBP) ফাইল আপলোড করতে পারবেন।' });
      return;
    }

    setIsUploadingLogo(true);
    setLogoMessage(null);

    try {
      const newLogoUrl = await uploadAndSaveBrandLogo(file);
      await updateSpecificLogoSettings('footerLogoUrl', newLogoUrl);
      setCurrentLogo(newLogoUrl);
      setLogoMessage({ type: 'success', text: 'লোগো সফলভাবে আপলোড হয়েছে এবং ফুটার সহ ওয়েবসাইটে আপডেট করা হয়েছে!' });
      if (onRefreshSettings) onRefreshSettings();
      setTimeout(() => setLogoMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to upload logo:', err);
      setLogoMessage({ type: 'error', text: err.message || 'লোগো আপলোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।' });
    } finally {
      setIsUploadingLogo(false);
      if (logoFileInputRef.current) {
        logoFileInputRef.current.value = '';
      }
    }
  };

  // Reset logo to original default
  const handleResetLogo = async () => {
    if (!confirm('আপনি কি নিশ্চিত যে লোগো রিসেট করে ডিফল্ট লোগোতে ফেরত যেতে চান?')) return;
    try {
      await updateBrandLogoSettings('');
      await updateSpecificLogoSettings('footerLogoUrl', '');
      setCurrentLogo(defaultLogo);
      setLogoMessage({ type: 'success', text: 'লোগো রিসেট করে ডিফল্ট লোগো সেট করা হয়েছে।' });
      if (onRefreshSettings) onRefreshSettings();
      setTimeout(() => setLogoMessage(null), 3000);
    } catch (err) {
      console.error('Reset logo failed:', err);
      setLogoMessage({ type: 'error', text: 'লোগো রিসেট করতে সমস্যা হয়েছে।' });
    }
  };

  // Save all Footer Settings
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      await updateBrandSettings({
        footer: footer
      });
      setSavedSuccess(true);
      if (onRefreshSettings) {
        onRefreshSettings();
      }
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err) {
      console.error('Error saving footer settings:', err);
      alert('ফুটার সেটিংস সেভ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setSaving(false);
    }
  };

  // Apply SERA FASHION Official Preset
  const applySeraPreset = () => {
    setFooter({
      brandName: 'SERA FASHION',
      subTagline: 'Pure & Authentic Luxury',
      tagline: 'SERA FASHION is an exclusive premium brand dedicated to authentic quality fashion, luxury three-piece and sarees to every home.',
      address: 'ধানমন্ডি, ঢাকা, বাংলাদেশ',
      phone: '+880 1700-000000',
      email: 'contact@serafashion.com',
      facebookUrl: 'https://www.facebook.com',
      twitterUrl: 'https://twitter.com',
      instagramUrl: 'https://instagram.com',
      youtubeUrl: 'https://youtube.com',
      whatsappNumber: '+8801700000000',
      showAppDownload: true,
      playStoreUrl: 'https://play.google.com',
      appStoreUrl: 'https://apps.apple.com',
      showPaymentBadges: true,
      paymentSectionTitle: 'Pay With',
      copyrightText: 'Copyright © 2026 SERA FASHION. All Rights Reserved.',
      aboutUsText: 'SERA FASHION একটি প্রিমিয়াম লাইফস্টাইল ও শাড়ি ব্র্যান্ড, যা খাঁটি গুণগত মান ও ঐতিহ্যবাহী ডিজাইনে প্রতিশ্রুতিবদ্ধ। প্রতিটি শাড়ি শতভাগ নিখুঁতভাবে তৈরি ও কোয়ালিটি নিশ্চিতকৃত।',
      companyInfoText: 'SERA FASHION শুরু হয়েছিল একটি স্পষ্ট স্বপ্ন নিয়ে—সবার কাছে সেরা গুণগত মানের পণ্য পৌঁছে দেওয়া। আমরা সরাসরি বিশ্বস্ত সোর্স এবং দক্ষ কারিগরদের থেকে প্রতিটি পণ্য সংগ্রহ করি।',
      deliveryInfoText: 'ঢাকা সিটিতে ২৪ ঘণ্টার মধ্যে এবং ঢাকার বাইরে ২-৩ কার্যদিবসে দ্রুত হোম ডেলিভারি। ক্যাশ অন ডেলিভারি প্রযোজ্য।',
      returnPolicyText: '৭ দিনের সহজ রিটার্ন ও এক্সচেঞ্জ সুবিধা রয়েছে। পণ্য দেখে মূল্য পরিশোধ করুন। কোনো সমস্যা থাকলে তাৎক্ষণিক এক্সচেঞ্জ বা রিফান্ড পলিসি রয়েছে।',
      termsText: 'অর্ডার করার পর আমাদের কাস্টমার কেয়ার থেকে কনফার্ম করা হবে। সারা দেশে বিশ্বস্ত কুরিয়ারে নিরাপদ হোম ডেলিভারি প্রদান করা হয়।',
      privacyText: 'আপনার নাম ও মোবাইল নম্বর সম্পূর্ণ সুরক্ষিত ও এনক্রিপ্টেড থাকে। কোনো তৃতীয় পক্ষের সাথে শেয়ার করা হয় না।'
    });
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-3xl border border-gray-150 flex flex-col items-center justify-center gap-3 text-gray-400">
        <RefreshCw className="animate-spin text-amber-600" size={24} />
        <span className="text-xs font-bold uppercase tracking-widest">ফুটার তথ্য লোড হচ্ছে...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-amber-200">
            <Sparkles size={12} />
            <span>Brand Identity & Footer Customizer</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">
            ব্র্যান্ড পরিচয় ও ফুটার সেটিংস কন্ট্রোল প্যানেল
          </h2>
          <p className="text-xs md:text-sm text-amber-100/80 max-w-2xl font-medium leading-relaxed">
            ব্র্যান্ডের নাম (SERA FASHION), লোগো আপলোড, মোবাইল-ফ্রেন্ডলি 'Pay With' পেমেন্ট রিবন, কন্টাক্ট ইনফো এবং নিচের সকল পলিসি ও লেখা এখান থেকে সরাসরি পরিবর্তন করুন।
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
            <span>পরিবর্তন সেভ করুন (Save)</span>
          </button>

          <button
            type="button"
            onClick={applySeraPreset}
            className="text-xs bg-white/15 hover:bg-white/25 text-amber-200 font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-white/10"
            title="SERA FASHION অফিসিয়াল ব্র্যান্ড ডেমো ডাটা সেট করুন"
          >
            <Sparkles size={13} />
            <span>✨ SERA FASHION ব্র্যান্ড প্রিসেট</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      <AnimatePresence>
        {savedSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-xs"
          >
            <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <Check size={16} />
            </div>
            <span>আলহামদুলিল্লাহ! ওয়েবসাইটের ফুটার সেটিংস সফলভাবে সেভ হয়েছে। কাস্টমাররা এখন নতুন তথ্য দেখতে পাবেন।</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Brand Identity & Logo Upload from Phone Gallery */}
        <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs space-y-4 md:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Building size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                  ১. ব্র্যান্ড লোগো আপলোড ও পরিচিতি (Brand Logo & Identity)
                </h3>
                <p className="text-[10px] text-gray-400">
                  আপনার ফোনের গ্যালারি থেকে ব্র্যান্ড লোগো আপলোড করুন এবং ব্র্যান্ডের নাম সেট করুন
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Logo Preview & Phone Gallery Uploader */}
            <div className="lg:col-span-5 bg-slate-50 border border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-3">
              <div className="relative group">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-950 p-1 border-[3px] border-amber-400 shadow-xl overflow-hidden ring-4 ring-amber-500/20 flex items-center justify-center">
                  <img 
                    src={currentLogo} 
                    alt={footer.brandName || 'Brand Logo'} 
                    className="w-full h-full rounded-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = defaultLogo;
                    }}
                  />
                </div>
                {isUploadingLogo && (
                  <div className="absolute inset-0 bg-black/70 rounded-full flex flex-col items-center justify-center text-white text-[10px] font-bold">
                    <RefreshCw className="animate-spin text-amber-400 mb-1" size={18} />
                    <span>আপলোড হচ্ছে...</span>
                  </div>
                )}
              </div>

              <div>
                <span className="text-xs font-bold text-gray-800 block">বর্তমান লোগো প্রিভিউ</span>
                <span className="text-[10px] text-gray-500">ফুটার ও হেডার সর্বত্র এটি প্রদর্শিত হবে</span>
              </div>

              {/* Upload Input & Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full pt-1">
                <input 
                  type="file" 
                  ref={logoFileInputRef}
                  accept="image/*" 
                  onChange={handleLogoFileChange}
                  className="hidden" 
                  id="footer-logo-file-input"
                />
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  className="w-full sm:flex-1 py-2.5 px-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 text-xs font-black rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload size={14} />
                  <span>গ্যালারি থেকে লোগো আপলোড</span>
                </button>

                {currentLogo !== defaultLogo && (
                  <button
                    type="button"
                    onClick={handleResetLogo}
                    className="py-2.5 px-3 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    title="ডিফল্ট লোগোতে ফেরত যান"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>

              {logoMessage && (
                <p className={`text-[11px] font-bold ${logoMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {logoMessage.text}
                </p>
              )}
            </div>

            {/* Brand Names & Taglines */}
            <div className="lg:col-span-7 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-800 block">ব্র্যান্ডের নাম (Brand Name):</label>
                  <input
                    type="text"
                    value={footer.brandName || ''}
                    onChange={(e) => setFooter(prev => ({ ...prev, brandName: e.target.value }))}
                    placeholder="যেমন: SERA FASHION"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-600 outline-none font-bold text-gray-900 transition-all"
                  />
                  <span className="text-[10px] text-gray-400">লোগোর পাশে বড় অক্ষরে দেখা যাবে</span>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-800 block">সাব-ট্যাগলাইন (Sub-Tagline):</label>
                  <input
                    type="text"
                    value={footer.subTagline || ''}
                    onChange={(e) => setFooter(prev => ({ ...prev, subTagline: e.target.value }))}
                    placeholder="যেমন: Pure & Authentic Luxury"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-600 outline-none font-medium text-gray-800 transition-all"
                  />
                  <span className="text-[10px] text-gray-400">ব্র্যান্ড নামের নিচে সোনালি/ধূসর ফন্টে প্রদর্শিত</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-800 block">ব্র্যান্ড বর্ণনা ও স্লোগান (Tagline / Bio):</label>
                <textarea
                  rows={2}
                  value={footer.tagline || ''}
                  onChange={(e) => setFooter(prev => ({ ...prev, tagline: e.target.value }))}
                  placeholder="যেমন: SERA FASHION is an exclusive premium brand dedicated to authentic quality fashion..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-600 outline-none font-medium text-gray-800 transition-all text-xs leading-relaxed resize-none"
                />
                <span className="text-[10px] text-gray-400">ফুটারের বাম কলামে কাস্টমারদের জন্য প্রদর্শন হবে</span>
              </div>
            </div>

          </div>
        </div>

        {/* Card 2: Contact & Address */}
        <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <MapPin size={16} />
            </div>
            <div>
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">২. ঠিকানা ও হেল্পলাইন (Contact Info)</h3>
              <p className="text-[10px] text-gray-400">গ্রাহকদের জন্য শোরুম/অফিসের ঠিকানা ও হটলাইন</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-gray-700 block">ঠিকানা / লোকেশন (Address):</label>
              <input
                type="text"
                value={footer.address || ''}
                onChange={(e) => setFooter(prev => ({ ...prev, address: e.target.value }))}
                placeholder="যেমন: ধানমন্ডি, ঢাকা, বাংলাদেশ"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-600 outline-none font-medium text-gray-800 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">হটলাইন / মোবাইল (Phone):</label>
                <input
                  type="text"
                  value={footer.phone || ''}
                  onChange={(e) => setFooter(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+880 1700-000000"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-600 outline-none font-mono text-gray-800 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">ইমেইল (Support Email):</label>
                <input
                  type="email"
                  value={footer.email || ''}
                  onChange={(e) => setFooter(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contact@serafashion.com"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-600 outline-none font-medium text-gray-800 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700 flex items-center gap-1.5">
                <MessageCircle size={14} className="text-emerald-600" /> WhatsApp Number (সরাসরি চ্যাট হবে):
              </label>
              <input
                type="text"
                value={footer.whatsappNumber || ''}
                onChange={(e) => setFooter(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                placeholder="+8801700000000"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-600 outline-none font-mono text-gray-800 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Social Media Links */}
        <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <FacebookIcon size={16} />
            </div>
            <div>
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">৩. সোশ্যাল মিডিয়া লিংক (Social Links)</h3>
              <p className="text-[10px] text-gray-400">ফেসবুক পেজ, টুইটার, ইন্সটাগ্রাম ও ইউটিউব চ্যানেল</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-gray-700 flex items-center gap-1.5">
                <FacebookIcon size={14} className="text-blue-600" /> Facebook Page:
              </label>
              <input
                type="text"
                value={footer.facebookUrl || ''}
                onChange={(e) => setFooter(prev => ({ ...prev, facebookUrl: e.target.value }))}
                placeholder="https://facebook.com/serafashion"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-mono text-[11px]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700 flex items-center gap-1.5">
                <TwitterIcon size={14} className="text-sky-500" /> Twitter / X URL:
              </label>
              <input
                type="text"
                value={footer.twitterUrl || ''}
                onChange={(e) => setFooter(prev => ({ ...prev, twitterUrl: e.target.value }))}
                placeholder="https://twitter.com/serafashion"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-mono text-[11px]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700 flex items-center gap-1.5">
                <InstagramIcon size={14} className="text-pink-600" /> Instagram URL:
              </label>
              <input
                type="text"
                value={footer.instagramUrl || ''}
                onChange={(e) => setFooter(prev => ({ ...prev, instagramUrl: e.target.value }))}
                placeholder="https://instagram.com/serafashion"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-mono text-[11px]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700 flex items-center gap-1.5">
                <YoutubeIcon size={14} className="text-red-600" /> YouTube Channel:
              </label>
              <input
                type="text"
                value={footer.youtubeUrl || ''}
                onChange={(e) => setFooter(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                placeholder="https://youtube.com/@serafashion"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-mono text-[11px]"
              />
            </div>
          </div>
        </div>

        {/* Card 4: Mobile-Friendly "Pay With" Ribbon & Badges */}
        <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs space-y-4 md:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CreditCard size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                  ৪. মোবাইল-ফ্রেন্ডলি "Pay With" পেমেন্ট রিবন (Payment Ribbon)
                </h3>
                <p className="text-[10px] text-gray-400">
                  মোবাইল স্ক্রিনে স্বয়ংক্রিয়ভাবে সুন্দর রেসপনসিভ ব্যাজ হিসেবে প্রদর্শিত হবে
                </p>
              </div>
            </div>

            {/* Toggle Badge Display */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-700">ডিসপ্লে অন:</span>
              <input
                type="checkbox"
                checked={footer.showPaymentBadges !== false}
                onChange={(e) => setFooter(prev => ({ ...prev, showPaymentBadges: e.target.checked }))}
                className="w-5 h-5 accent-amber-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-gray-700 block">পেমেন্ট সেকশন শিরোনাম (Payment Section Title):</label>
              <input
                type="text"
                value={footer.paymentSectionTitle || 'Pay With'}
                onChange={(e) => setFooter(prev => ({ ...prev, paymentSectionTitle: e.target.value }))}
                placeholder="যেমন: Pay With অথবা পেমেন্ট মাধ্যম"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-600 outline-none font-bold text-gray-800"
              />
            </div>

            {/* Live Mobile Badge Preview */}
            <div className="p-3 bg-slate-50 border border-gray-200 rounded-2xl">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                মোবাইল প্রিভিউ (Mobile Responsive Preview):
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[9px] font-black text-[#1A1F71]">VISA</span>
                <span className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[9px] font-black text-[#EB001B]">Mastercard</span>
                <span className="px-2 py-0.5 bg-[#D12053] text-white rounded text-[9px] font-bold">bKash</span>
                <span className="px-2 py-0.5 bg-[#F7931E] text-white rounded text-[9px] font-bold">নগদ</span>
                <span className="px-2 py-0.5 bg-emerald-700 text-white rounded text-[9px] font-bold">Cash On Delivery</span>
                <span className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[9px] font-bold text-blue-900">SSLCOMMERZ</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 5: Policies & Info Texts (All Footer Dialog Modals) */}
        <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs space-y-4 md:col-span-2">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText size={16} />
            </div>
            <div>
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                ৫. ফুটারের পলিসি ও পেজ কনটেন্ট (About Us, Policies & Delivery Info)
              </h3>
              <p className="text-[10px] text-gray-400">
                ফুটারের লিঙ্কগুলোতে ক্লিক করলে যে তথ্যগুলো পপআপে দেখাবে তা এখান থেকে লিখুন
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            
            {/* About Us */}
            <div className="space-y-1">
              <label className="font-bold text-gray-800 block">আমাদের সম্পর্কে (About Us Text):</label>
              <textarea
                rows={3}
                value={footer.aboutUsText || ''}
                onChange={(e) => setFooter(prev => ({ ...prev, aboutUsText: e.target.value }))}
                placeholder="SERA FASHION সম্পর্কে বিস্তারিত লিখুন..."
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-600 outline-none font-medium text-gray-800 text-xs leading-relaxed"
              />
            </div>

            {/* Company Story */}
            <div className="space-y-1">
              <label className="font-bold text-gray-800 block">কোম্পানি পরিচিতি ও গল্প (Company Story):</label>
              <textarea
                rows={3}
                value={footer.companyInfoText || ''}
                onChange={(e) => setFooter(prev => ({ ...prev, companyInfoText: e.target.value }))}
                placeholder="ব্র্যান্ডের যাত্রার গল্প ও প্রতিশ্রুতি লিখুন..."
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-600 outline-none font-medium text-gray-800 text-xs leading-relaxed"
              />
            </div>

            {/* Delivery Info */}
            <div className="space-y-1">
              <label className="font-bold text-gray-800 block">ডেলিভারি তথ্য ও সময়সীমা (Delivery Information):</label>
              <textarea
                rows={3}
                value={footer.deliveryInfoText || ''}
                onChange={(e) => setFooter(prev => ({ ...prev, deliveryInfoText: e.target.value }))}
                placeholder="কুরিয়ার, চার্জ ও ডেলিভারি সময়..."
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-600 outline-none font-medium text-gray-800 text-xs leading-relaxed"
              />
            </div>

            {/* Return Policy */}
            <div className="space-y-1">
              <label className="font-bold text-gray-800 block">রিটার্ন ও এক্সচেঞ্জ পলিসি (Return Policy):</label>
              <textarea
                rows={3}
                value={footer.returnPolicyText || ''}
                onChange={(e) => setFooter(prev => ({ ...prev, returnPolicyText: e.target.value }))}
                placeholder="রিটার্ন ও মানি-ব্যাক গ্যারান্টির নিয়মাবলী..."
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-600 outline-none font-medium text-gray-800 text-xs leading-relaxed"
              />
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-1">
              <label className="font-bold text-gray-800 block">শর্তাবলী (Terms & Conditions):</label>
              <textarea
                rows={3}
                value={footer.termsText || ''}
                onChange={(e) => setFooter(prev => ({ ...prev, termsText: e.target.value }))}
                placeholder="অর্ডার ও কেনাকাটার শর্তাবলী..."
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-600 outline-none font-medium text-gray-800 text-xs leading-relaxed"
              />
            </div>

            {/* Privacy Policy */}
            <div className="space-y-1">
              <label className="font-bold text-gray-800 block">প্রাইভেসি পলিসি (Privacy Policy):</label>
              <textarea
                rows={3}
                value={footer.privacyText || ''}
                onChange={(e) => setFooter(prev => ({ ...prev, privacyText: e.target.value }))}
                placeholder="গ্রাহকের তথ্যের নিরাপত্তা নীতি..."
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-600 outline-none font-medium text-gray-800 text-xs leading-relaxed"
              />
            </div>

          </div>
        </div>

        {/* Card 6: Mobile App & Copyright */}
        <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs space-y-4 md:col-span-2">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Smartphone size={16} />
            </div>
            <div>
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">৬. মোবাইল অ্যাপ ও কপিরাইট লাইন (App & Copyright)</h3>
              <p className="text-[10px] text-gray-400">Google Play, App Store ও ওয়েবসাইটের সর্বনিম্নের কপিরাইট লাইন</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* Show App Download Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-150">
              <div>
                <span className="font-bold text-gray-800 block">মোবাইল অ্যাপ বাটন প্রদর্শন (Show App Buttons):</span>
                <span className="text-[10px] text-gray-400">Google Play ও App Store বাটন ফুটারের প্রথম কলামে দেখাবে কি না</span>
              </div>
              <input
                type="checkbox"
                checked={footer.showAppDownload !== false}
                onChange={(e) => setFooter(prev => ({ ...prev, showAppDownload: e.target.checked }))}
                className="w-5 h-5 accent-amber-600 cursor-pointer"
              />
            </div>

            {footer.showAppDownload !== false && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-600 block">Google Play Link:</label>
                  <input
                    type="text"
                    value={footer.playStoreUrl || ''}
                    onChange={(e) => setFooter(prev => ({ ...prev, playStoreUrl: e.target.value }))}
                    placeholder="https://play.google.com/..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-mono text-[10px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-600 block">App Store Link:</label>
                  <input
                    type="text"
                    value={footer.appStoreUrl || ''}
                    onChange={(e) => setFooter(prev => ({ ...prev, appStoreUrl: e.target.value }))}
                    placeholder="https://apps.apple.com/..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-mono text-[10px]"
                  />
                </div>
              </div>
            )}

            {/* Copyright Text */}
            <div className="space-y-1">
              <label className="font-bold text-gray-800 block">কপিরাইট লাইন (Copyright Text):</label>
              <input
                type="text"
                value={footer.copyrightText || ''}
                onChange={(e) => setFooter(prev => ({ ...prev, copyrightText: e.target.value }))}
                placeholder="Copyright © 2026 SERA FASHION. All Rights Reserved."
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Bottom Save Bar */}
        <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-8 py-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
            <span>সেভ করুন ও ওয়েবসাইটে আপডেট করুন (Save Changes)</span>
          </button>
        </div>

      </form>

    </div>
  );
}
