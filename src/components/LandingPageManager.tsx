import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Flame, Eye, Save, RotateCcw, Clock, 
  ShoppingBag, Truck, HelpCircle, MessageCircle, 
  ArrowUp, ArrowDown, Plus, Trash2, Check, ExternalLink, 
  Settings2, Sliders, ShieldCheck, Tag, Zap, AlertCircle, 
  CheckCircle2, Layers, Award, Info
} from 'lucide-react';
import { BrandSettings, LandingPageConfig, LandingPageFaqItem, LandingPageTrustItem, LandingPageSectionId } from '../types';
import { DEFAULT_LANDING_PAGE_CONFIG } from '../services/landingPageDefaults';
import { updateBrandSettings } from '../services/settingsService';

interface LandingPageManagerProps {
  brandSettings: BrandSettings | null;
  onRefreshSettings: () => Promise<void>;
}

export default function LandingPageManager({
  brandSettings,
  onRefreshSettings
}: LandingPageManagerProps) {
  // Merge loaded configuration with defaults
  const [config, setConfig] = useState<LandingPageConfig>(() => {
    const existing = brandSettings?.landingPage;
    return {
      ...DEFAULT_LANDING_PAGE_CONFIG,
      ...(existing || {}),
      trustItems: existing?.trustItems?.length ? existing.trustItems : DEFAULT_LANDING_PAGE_CONFIG.trustItems,
      faqItems: existing?.faqItems?.length ? existing.faqItems : DEFAULT_LANDING_PAGE_CONFIG.faqItems,
      sectionOrder: existing?.sectionOrder?.length ? existing.sectionOrder : DEFAULT_LANDING_PAGE_CONFIG.sectionOrder,
    };
  });

  const [activeSubTab, setActiveSubTab] = useState<
    'general' | 'countdown' | 'products' | 'policies' | 'faq' | 'support' | 'layout'
  >('general');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New FAQ Item draft state
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');

  // Save changes to settings
  const handleSave = async (customConfig?: LandingPageConfig) => {
    const targetConfig = customConfig || config;
    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      const res = await updateBrandSettings({
        landingPage: targetConfig
      });

      if (res.success) {
        setSaveSuccess(true);
        await onRefreshSettings();
        setTimeout(() => setSaveSuccess(false), 3500);
      } else {
        setErrorMessage(res.error || 'সেটিংস সংরক্ষণ ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'সেটিংস সংরক্ষণকালে ত্রুটি ঘটেছে।');
    } finally {
      setSaving(false);
    }
  };

  // Reset to default template
  const handleResetDefaults = () => {
    if (window.confirm('আপনি কি ল্যান্ডিং পেজের সমস্ত কন্টেন্ট ও স্ট্রাকচার ডিফল্ট ডিজাইনে রিসেট করতে চান?')) {
      setConfig({ ...DEFAULT_LANDING_PAGE_CONFIG });
      handleSave({ ...DEFAULT_LANDING_PAGE_CONFIG });
    }
  };

  // Section Reordering
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...config.sectionOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    setConfig(prev => ({ ...prev, sectionOrder: newOrder }));
  };

  // Section names mapping in Bengali
  const sectionLabels: Record<LandingPageSectionId, { name: string; desc: string; icon: any }> = {
    announcement: { name: '১. টপ অ্যানাউন্সমেন্ট বার', desc: 'পেজের একদম শীর্ষে জ্বলজ্বলে মেগা অফার নোটিশ', icon: Flame },
    hero: { name: '২. হিরো ব্যানার ও মূল হেডলাইন', desc: 'আকর্ষণীয় গোল্ডেন গ্লো, শিরোনাম, সাব-টাইটেল ও CTA বাটন', icon: Sparkles },
    trust: { name: '৩. ট্রাস্ট ও গ্যারান্টি ব্যাজ', desc: 'ক্যাশ অন ডেলিভারি, পার্সেল চেক ও ১০০% অরিজিনাল গ্যারান্টি', icon: ShieldCheck },
    products: { name: '৪. অফার পণ্য শোকেস গ্রিড', desc: 'আসল পণ্য, লাইভ স্টক, সাইজ সিলেক্টর ও Buy Now বাটন', icon: ShoppingBag },
    policies: { name: '৫. ডেলিভারি ও রিটার্ন পলিসি কার্ড', desc: 'ঢাকা ও ঢাকার বাইরের ডেলিভারি চার্জ এবং রিটার্ন পলিসি', icon: Truck },
    faq: { name: '৬. সাধারণ প্রশ্নোত্তর (FAQ)', desc: 'ক্রেতাদের সাধারণ প্রশ্নের উত্তর সংবলিত অ্যাকর্ডিয়ন', icon: HelpCircle },
    consultation: { name: '৭. সরাসরি ফোন ও WhatsApp সাপোর্ট', desc: 'অর্ডারের জন্য ক্রেতাদের সরাসরি সাপোর্ট কল ও চ্যাট অপশন', icon: MessageCircle }
  };

  // FAQ Operations
  const handleAddFaq = () => {
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) {
      alert('অনুগ্রহ করে প্রশ্ন ও উত্তর উভয়ই পূরণ করুন।');
      return;
    }
    const newFaq: LandingPageFaqItem = {
      id: `faq-${Date.now()}`,
      question: newFaqQuestion.trim(),
      answer: newFaqAnswer.trim()
    };
    setConfig(prev => ({
      ...prev,
      faqItems: [...prev.faqItems, newFaq]
    }));
    setNewFaqQuestion('');
    setNewFaqAnswer('');
  };

  const handleUpdateFaq = (id: string, field: 'question' | 'answer', value: string) => {
    setConfig(prev => ({
      ...prev,
      faqItems: prev.faqItems.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const handleDeleteFaq = (id: string) => {
    setConfig(prev => ({
      ...prev,
      faqItems: prev.faqItems.filter(item => item.id !== id)
    }));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      
      {/* 1. TOP HEADER & QUICK ACTIONS */}
      <div className="bg-gradient-to-r from-slate-900 via-zinc-900 to-slate-900 border border-amber-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-gradient-to-tr from-amber-500 to-rose-600 rounded-xl text-slate-950 shadow-md">
                <Flame size={20} className="animate-pulse" />
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-black text-white tracking-wide">
                ল্যান্ডিং পেজ কন্ট্রোল প্যানেল <span className="text-amber-400">(/offer)</span>
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              বিজ্ঞাপন ও বিশেষ ক্যাম্পেইনের জন্য ল্যান্ডিং পেজের প্রতিটি লেখা, ব্যানার, কাউন্টডাউন, পলিসি এবং স্ট্রাকচার এখান থেকেই সরাসরি পরিবর্তন করুন।
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="/offer"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white rounded-xl text-xs font-bold border border-amber-500/30 transition-all flex items-center gap-1.5 shadow-md group"
              title="নতুন ট্যাবে ল্যান্ডিং পেজ ওপেন করুন"
            >
              <Eye size={15} className="group-hover:scale-110 transition-transform" />
              <span>লাইভ প্রিভিউ (/offer)</span>
              <ExternalLink size={12} className="opacity-70" />
            </a>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3.5 py-2.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 rounded-xl text-xs font-semibold border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
              title="ডিফল্ট টেমপ্লেটে ফিরিয়ে নিন"
            >
              <RotateCcw size={14} />
              <span>রিসেট</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave()}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Clock size={15} className="animate-spin" />
                  <span>সংরক্ষণ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>পরিবর্তন সংরক্ষণ করুন</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status Banners */}
        <AnimatePresence>
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2"
            >
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>ল্যান্ডিং পেজের সকল পরিবর্তন সফলভাবে ডেটাবেসে সংরক্ষিত হয়েছে এবং লাইভ হয়ে গেছে! 🎉</span>
            </motion.div>
          )}

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2"
            >
              <AlertCircle size={16} className="text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. SUB-TABS NAVIGATION */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-white/10">
        {[
          { id: 'general', label: '১. সাধারণ ও ব্যানার', icon: Sparkles },
          { id: 'countdown', label: '২. কাউন্টডাউন টাইমার', icon: Clock },
          { id: 'products', label: '৩. পণ্য শোকেস', icon: ShoppingBag },
          { id: 'policies', label: '৪. ডেলিভারি ও পলিসি', icon: Truck },
          { id: 'faq', label: '৫. প্রশ্নোত্তর (FAQ)', icon: HelpCircle },
          { id: 'support', label: '৬. সাপোর্ট ও WhatsApp', icon: MessageCircle },
          { id: 'layout', label: '৭. সেকশন সাজানো ও ক্রম', icon: Layers }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-slate-950' : 'text-amber-400'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. SUB-TAB CONTENTS */}

      {/* TAB 1: GENERAL & HERO */}
      {activeSubTab === 'general' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          {/* Master Toggle */}
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>ল্যান্ডিং পেজ সক্রিয়করণ (Master Status)</span>
                {config.enabled ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">সক্রিয় / ON</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-black uppercase">নিষ্ক্রিয় / OFF</span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                বন্ধ থাকলে কোনো ভিজিটর `/offer` লিংকে প্রবেশ করলে তাকে মূল শপে পাঠিয়ে দেওয়া হবে।
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={config.enabled} 
                onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* Top Announcement Bar Settings */}
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Flame size={16} className="text-amber-400" />
                <h4 className="text-sm font-bold text-white">টপ অ্যানাউন্সমেন্ট বার (Top Bar)</h4>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.showAnnouncementBar} 
                  onChange={(e) => setConfig(prev => ({ ...prev, showAnnouncementBar: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">অ্যানাউন্সমেন্ট ব্যাজ টেক্সট</label>
                <input
                  type="text"
                  value={config.announcementBadge}
                  onChange={(e) => setConfig(prev => ({ ...prev, announcementBadge: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                  placeholder="যেমন: মেগা ছাড় অফার চলছে!"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-400 block mb-1">অ্যানাউন্সমেন্ট বিস্তারিত নোটিশ</label>
                <input
                  type="text"
                  value={config.announcementText}
                  onChange={(e) => setConfig(prev => ({ ...prev, announcementText: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                  placeholder="যেমন: আজকের অর্ডারে পাচ্ছেন নিশ্চিত ক্যাশব্যাক ও ফ্ল্যাট ডিসকাউন্ট"
                />
              </div>
            </div>
          </div>

          {/* Hero Banner Section */}
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                <h4 className="text-sm font-bold text-white">হিরো ব্যানার ও মূল হেডলাইন (Hero Banner)</h4>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.showHero} 
                  onChange={(e) => setConfig(prev => ({ ...prev, showHero: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">টপ ক্যাম্পেইন ব্যাজ</label>
                <input
                  type="text"
                  value={config.heroBadge}
                  onChange={(e) => setConfig(prev => ({ ...prev, heroBadge: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                  placeholder="যেমন: এক্সক্লুসিভ কালেকশন"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">প্রধান হেডলাইন (Main Headline)</label>
                <input
                  type="text"
                  value={config.heroTitle}
                  onChange={(e) => setConfig(prev => ({ ...prev, heroTitle: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                  placeholder="যেমন: সেরা ফ্যাশন মেগা ডিসকাউন্ট সেল"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">সাব-টাইটেল / বিবরণ (Subtitle)</label>
                <textarea
                  rows={2}
                  value={config.heroSubtitle}
                  onChange={(e) => setConfig(prev => ({ ...prev, heroSubtitle: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none resize-none"
                  placeholder="আসল প্রিমিয়াম থ্রি-পিস ও ট্র্যাডিশনাল ঢাকাই শাড়ির সমাহার..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">প্রধান বাটন টেক্সট (CTA Button)</label>
                  <input
                    type="text"
                    value={config.heroCtaText}
                    onChange={(e) => setConfig(prev => ({ ...prev, heroCtaText: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                    placeholder="যেমন: অফার উপভোগ করুন"
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-white/5">
                  <span className="text-xs text-slate-300 font-semibold">অ্যাম্বিয়েন্ট গোল্ডেন ব্যাকগ্রাউন্ড গ্লো</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={config.heroBgGlow} 
                      onChange={(e) => setConfig(prev => ({ ...prev, heroBgGlow: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 2: COUNTDOWN TIMER */}
      {activeSubTab === 'countdown' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-amber-400" />
                <h4 className="text-sm font-bold text-white">কাউন্টডাউন টাইমার সেটিংস (Countdown Timer)</h4>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.showCountdown} 
                  onChange={(e) => setConfig(prev => ({ ...prev, showCountdown: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">কাউন্টডাউন টাইটেল / লেবেল</label>
                <input
                  type="text"
                  value={config.countdownLabel}
                  onChange={(e) => setConfig(prev => ({ ...prev, countdownLabel: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                  placeholder="যেমন: অফার শেষ হতে বাকি:"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">টাইমার মোড (Timer Type)</label>
                <select
                  value={config.countdownType}
                  onChange={(e) => setConfig(prev => ({ ...prev, countdownType: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="cycle">স্বয়ংক্রিয় সাইকেল মোড (প্রতিদিন নির্দিষ্ট ঘণ্টায় রিনিউ)</option>
                  <option value="fixed_date">নির্দিষ্ট তারিখ ও সময় পর্যন্ত (Fixed Target Date)</option>
                </select>
              </div>

              {config.countdownType === 'cycle' ? (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">সাইকেল সময়কাল (ঘণ্টা)</label>
                  <input
                    type="number"
                    min={1}
                    max={72}
                    value={config.countdownHours}
                    onChange={(e) => setConfig(prev => ({ ...prev, countdownHours: Number(e.target.value) || 14 }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">প্রতিদিন এই সময়সীমা অনুযায়ী ঘড়ি চলতে থাকবে</span>
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">টার্গেট শেষ হওয়ার তারিখ ও সময়</label>
                  <input
                    type="datetime-local"
                    value={config.countdownTargetDate || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, countdownTargetDate: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 3: PRODUCTS SHOWCASE */}
      {activeSubTab === 'products' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag size={16} className="text-amber-400" />
                <h4 className="text-sm font-bold text-white">পণ্য শোকেস সেটিংস (Products Showcase)</h4>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.showProducts} 
                  onChange={(e) => setConfig(prev => ({ ...prev, showProducts: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">সেকশন শিরোনাম</label>
                <input
                  type="text"
                  value={config.productsTitle}
                  onChange={(e) => setConfig(prev => ({ ...prev, productsTitle: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">সেকশন সাব-টাইটেল</label>
                <input
                  type="text"
                  value={config.productsSubtitle}
                  onChange={(e) => setConfig(prev => ({ ...prev, productsSubtitle: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">অর্ডার বাটনের টেক্সট</label>
                <input
                  type="text"
                  value={config.buyNowButtonText}
                  onChange={(e) => setConfig(prev => ({ ...prev, buyNowButtonText: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">ডিফল্ট ক্যাটাগরি চয়েস</label>
                <select
                  value={config.defaultCategory}
                  onChange={(e) => setConfig(prev => ({ ...prev, defaultCategory: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="ALL">সকল ক্যাটাগরি (All Collections)</option>
                  <option value="THREE PIECE">শুধু থ্রি-পিস (Three Piece)</option>
                  <option value="SAREE">শুধু শাড়ি (Saree)</option>
                </select>
              </div>
            </div>

            {/* Badges and Filter switches */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <label className="flex items-center gap-2 p-3 bg-slate-950/60 rounded-xl border border-white/5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.showCategoryFilters} 
                  onChange={(e) => setConfig(prev => ({ ...prev, showCategoryFilters: e.target.checked }))}
                  className="rounded text-amber-500 focus:ring-0"
                />
                <span className="text-xs text-slate-300 font-semibold">ক্যাটাগরি ফিল্টার চিপস দেখাও</span>
              </label>

              <label className="flex items-center gap-2 p-3 bg-slate-950/60 rounded-xl border border-white/5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.showDiscountBadge} 
                  onChange={(e) => setConfig(prev => ({ ...prev, showDiscountBadge: e.target.checked }))}
                  className="rounded text-amber-500 focus:ring-0"
                />
                <span className="text-xs text-slate-300 font-semibold">ডিসকাউন্ট % ব্যাজ দেখাও</span>
              </label>

              <label className="flex items-center gap-2 p-3 bg-slate-950/60 rounded-xl border border-white/5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.showStockBadge} 
                  onChange={(e) => setConfig(prev => ({ ...prev, showStockBadge: e.target.checked }))}
                  className="rounded text-amber-500 focus:ring-0"
                />
                <span className="text-xs text-slate-300 font-semibold">স্টক স্ট্যাটাস ব্যাজ দেখাও</span>
              </label>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 4: DELIVERY & POLICIES */}
      {activeSubTab === 'policies' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-amber-400" />
                <h4 className="text-sm font-bold text-white">ডেলিভারি চার্জ ও রিটার্ন পলিসি কার্ড (Policies)</h4>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.showPolicies} 
                  onChange={(e) => setConfig(prev => ({ ...prev, showPolicies: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">ঢাকা সিটি ডেলিভারি চার্জ</label>
                <input
                  type="text"
                  value={config.dhakaDeliveryCharge}
                  onChange={(e) => setConfig(prev => ({ ...prev, dhakaDeliveryCharge: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                  placeholder="যেমন: ৳৮০"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">ঢাকা সিটি ডেলিভারি সময়</label>
                <input
                  type="text"
                  value={config.deliveryTimeDhaka}
                  onChange={(e) => setConfig(prev => ({ ...prev, deliveryTimeDhaka: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                  placeholder="যেমন: ২৪-৪৮ ঘণ্টা"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">ঢাকার বাইরে ডেলিভারি চার্জ</label>
                <input
                  type="text"
                  value={config.outsideDhakaDeliveryCharge}
                  onChange={(e) => setConfig(prev => ({ ...prev, outsideDhakaDeliveryCharge: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                  placeholder="যেমন: ৳১৩০"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">ঢাকার বাইরে ডেলিভারি সময়</label>
                <input
                  type="text"
                  value={config.deliveryTimeOutside}
                  onChange={(e) => setConfig(prev => ({ ...prev, deliveryTimeOutside: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                  placeholder="যেমন: ২-৩ দিন"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">রিটার্ন পলিসি শিরোনাম</label>
                <input
                  type="text"
                  value={config.returnPolicyText}
                  onChange={(e) => setConfig(prev => ({ ...prev, returnPolicyText: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                  placeholder="যেমন: ৭ দিনের সহজ এক্সচেঞ্জ পলিসি"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">পেমেন্ট মেথড বিবরণ</label>
                <input
                  type="text"
                  value={config.paymentPolicyText}
                  onChange={(e) => setConfig(prev => ({ ...prev, paymentPolicyText: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                  placeholder="যেমন: নিরাপদ ক্যাশ অন ডেলিভারি"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 5: FAQ MANAGEMENT */}
      {activeSubTab === 'faq' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle size={16} className="text-amber-400" />
                <h4 className="text-sm font-bold text-white">প্রশ্নোত্তর সেকশন সেটিংস (FAQ Manager)</h4>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.showFaq} 
                  onChange={(e) => setConfig(prev => ({ ...prev, showFaq: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">FAQ সেকশন শিরোনাম</label>
                <input
                  type="text"
                  value={config.faqTitle}
                  onChange={(e) => setConfig(prev => ({ ...prev, faqTitle: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">FAQ সেকশন সাব-টাইটেল</label>
                <input
                  type="text"
                  value={config.faqSubtitle}
                  onChange={(e) => setConfig(prev => ({ ...prev, faqSubtitle: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* List of current FAQs */}
            <div className="space-y-3 pt-3">
              <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider">বিদ্যমান প্রশ্নোত্তর তালিকা ({config.faqItems.length})</h5>

              {config.faqItems.map((faq, idx) => (
                <div key={faq.id} className="p-4 bg-slate-950/70 border border-white/10 rounded-xl space-y-3 relative group">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">প্রশ্ন {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteFaq(faq.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                      title="এই প্রশ্নটি মুছে ফেলুন"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) => handleUpdateFaq(faq.id, 'question', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white focus:border-amber-400 focus:outline-none"
                      placeholder="প্রশ্ন লিখুন"
                    />
                  </div>

                  <div>
                    <textarea
                      rows={2}
                      value={faq.answer}
                      onChange={(e) => handleUpdateFaq(faq.id, 'answer', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-amber-400 focus:outline-none resize-none"
                      placeholder="উত্তর লিখুন"
                    />
                  </div>
                </div>
              ))}

              {/* Add New FAQ Form */}
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3 mt-4">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Plus size={14} />
                  <span>নতুন প্রশ্ন ও উত্তর যোগ করুন</span>
                </span>
                <input
                  type="text"
                  value={newFaqQuestion}
                  onChange={(e) => setNewFaqQuestion(e.target.value)}
                  placeholder="প্রশ্ন লিখুন (যেমন: ডেলিভারি ম্যানের সামনে চেক করা যাবে কি?)"
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
                <textarea
                  rows={2}
                  value={newFaqAnswer}
                  onChange={(e) => setNewFaqAnswer(e.target.value)}
                  placeholder="উত্তর লিখুন..."
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none resize-none"
                />
                <button
                  type="button"
                  onClick={handleAddFaq}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus size={14} />
                  <span>তালিকায় যুক্ত করুন</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 6: SUPPORT & WHATSAPP */}
      {activeSubTab === 'support' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <MessageCircle size={16} className="text-amber-400" />
                <h4 className="text-sm font-bold text-white">সরাসরি পরামর্শ ও WhatsApp সেটিংস</h4>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.showConsultation} 
                  onChange={(e) => setConfig(prev => ({ ...prev, showConsultation: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">পরামর্শ সেকশন শিরোনাম</label>
                <input
                  type="text"
                  value={config.consultationTitle}
                  onChange={(e) => setConfig(prev => ({ ...prev, consultationTitle: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">পরামর্শ সেকশন সাব-টাইটেল</label>
                <input
                  type="text"
                  value={config.consultationSubtitle}
                  onChange={(e) => setConfig(prev => ({ ...prev, consultationSubtitle: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">কাস্টমার ক্লিক করলে WhatsApp-এ প্রি-সেট মেসেজ</label>
                <input
                  type="text"
                  value={config.whatsappMessagePreset}
                  onChange={(e) => setConfig(prev => ({ ...prev, whatsappMessagePreset: e.target.value }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                  placeholder="হ্যালো সেরা ফ্যাশন, আমি আপনাদের স্পেশাল অফার সম্পর্কে জানতে চাই।"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">হোয়াটসঅ্যাপ বাটন টেক্সট</label>
                  <input
                    type="text"
                    value={config.whatsappButtonText}
                    onChange={(e) => setConfig(prev => ({ ...prev, whatsappButtonText: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">সরাসরি কল বাটন টেক্সট</label>
                  <input
                    type="text"
                    value={config.callButtonText}
                    onChange={(e) => setConfig(prev => ({ ...prev, callButtonText: e.target.value }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Mobile Sticky Bar */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-white">মোবাইল বটম স্টিকি বার (Mobile Sticky Bar)</h5>
                  <p className="text-[10px] text-slate-400">ফোনে স্ক্রোল করার সময় নিচে অর্ডার ও WhatsApp বার প্রদর্শন</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={config.showStickyMobileBar} 
                    onChange={(e) => setConfig(prev => ({ ...prev, showStickyMobileBar: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 7: SECTION LAYOUT & REORDERING */}
      {activeSubTab === 'layout' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-amber-400" />
                <h4 className="text-sm font-bold text-white">সেকশনের ক্রম ও ভিজিবিলিটি রি-অর্ডার (Layout Reordering)</h4>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              আপনি আপনার প্রয়োজনমতো ল্যান্ডিং পেজের সেকশনগুলোর স্থান পরিবর্তন (উপরে/নিচে সরানো) করতে পারবেন। নিচে দেওয়া অ্যারো বাটনে ক্লিক করে ক্রম পরিবর্তন করুন:
            </p>

            <div className="space-y-2.5 pt-2">
              {config.sectionOrder.map((sectionId, idx) => {
                const itemInfo = sectionLabels[sectionId];
                if (!itemInfo) return null;
                const SectionIcon = itemInfo.icon;

                return (
                  <div 
                    key={sectionId}
                    className="p-3.5 bg-slate-950/70 border border-white/10 rounded-xl flex items-center justify-between gap-3 group hover:border-amber-400/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-amber-400/10 text-amber-400 flex items-center justify-center text-xs font-black">
                        {idx + 1}
                      </div>
                      <SectionIcon size={16} className="text-amber-400 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-white block">{itemInfo.name}</span>
                        <span className="text-[10px] text-slate-400 block">{itemInfo.desc}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveSection(idx, 'up')}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-20 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="উপরে নিন"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === config.sectionOrder.length - 1}
                        onClick={() => moveSection(idx, 'down')}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-20 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="নিচে নিন"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Floating Save Bar */}
      <div className="sticky bottom-4 z-20 bg-slate-900/95 backdrop-blur-md border border-amber-500/40 rounded-2xl p-4 shadow-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-300 font-semibold">
            ল্যান্ডিং পেজ কনফিগারেশন রেডি। সেভ বাটনে চাপ দিলে সরাসরি `/offer` পেজে পরিবর্তন কার্যকর হবে।
          </span>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => handleSave()}
          className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        >
          {saving ? (
            <>
              <Clock size={15} className="animate-spin" />
              <span>সেভ হচ্ছে...</span>
            </>
          ) : (
            <>
              <Save size={15} />
              <span>সেভ করুন (Save Changes)</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}
