import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Crown, Gift, Sparkles, MessageCircle, Copy, Check, Search, 
  Settings, Save, RefreshCw, ArrowUpRight, Award, DollarSign, Tag, 
  ExternalLink, ShoppingBag, ShieldCheck, CheckCircle2, ChevronRight, Share2
} from 'lucide-react';
import { Order, BrandSettings } from '../types';
import { 
  getAllLoyaltyAccounts, LoyaltyAccount, creditReferralBonus, 
  generateReferralCodeForPhone 
} from '../services/loyaltyService';
import { updateBrandSettings } from '../services/settingsService';

interface ReferralLoyaltyManagerProps {
  orders: Order[];
  brandSettings: BrandSettings | null;
  onRefreshSettings: () => Promise<void>;
}

export default function ReferralLoyaltyManager({
  orders,
  brandSettings,
  onRefreshSettings
}: ReferralLoyaltyManagerProps) {
  // Config States
  const [referralEnabled, setReferralEnabled] = useState(brandSettings?.referralProgramEnabled !== false);
  const [friendDiscount, setFriendDiscount] = useState(brandSettings?.referralFriendDiscount || 50);
  const [referrerBonus, setReferrerBonus] = useState(brandSettings?.referralBonusAmount || 100);
  const [repeatOfferEnabled, setRepeatOfferEnabled] = useState(brandSettings?.repeatCustomerOfferEnabled !== false);
  const [secondOrderDiscount, setSecondOrderDiscount] = useState(brandSettings?.repeatCustomer2ndOrderDiscount || 50);
  const [thirdOrderDiscount, setThirdOrderDiscount] = useState(brandSettings?.repeatCustomer3rdOrderDiscount || 100);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Accounts List State
  const [loyaltyAccounts, setLoyaltyAccounts] = useState<LoyaltyAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCohort, setFilterCohort] = useState<'all' | 'repeat' | 'vip' | 'top_referrers'>('all');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const list = await getAllLoyaltyAccounts();
      setLoyaltyAccounts(list);
    } catch (e) {
      console.warn("Failed to load loyalty accounts:", e);
    } finally {
      setLoading(false);
    }
  };

  // Sync settings when brandSettings prop changes
  useEffect(() => {
    if (brandSettings) {
      setReferralEnabled(brandSettings.referralProgramEnabled !== false);
      setFriendDiscount(brandSettings.referralFriendDiscount || 50);
      setReferrerBonus(brandSettings.referralBonusAmount || 100);
      setRepeatOfferEnabled(brandSettings.repeatCustomerOfferEnabled !== false);
      setSecondOrderDiscount(brandSettings.repeatCustomer2ndOrderDiscount || 50);
      setThirdOrderDiscount(brandSettings.repeatCustomer3rdOrderDiscount || 100);
    }
  }, [brandSettings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSavedSuccess(false);

    try {
      await updateBrandSettings({
        referralProgramEnabled: referralEnabled,
        referralFriendDiscount: Number(friendDiscount),
        referralBonusAmount: Number(referrerBonus),
        repeatCustomerOfferEnabled: repeatOfferEnabled,
        repeatCustomer2ndOrderDiscount: Number(secondOrderDiscount),
        repeatCustomer3rdOrderDiscount: Number(thirdOrderDiscount)
      });
      await onRefreshSettings();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Save settings error:", err);
    } finally {
      setSavingSettings(false);
    }
  };

  // Map orders by phone to compute repeat counts
  const ordersByPhone = useMemo(() => {
    const map = new Map<string, Order[]>();
    orders.forEach(o => {
      const clean = o.mobileNumber ? o.mobileNumber.replace(/\D/g, '') : '';
      if (!clean) return;
      const list = map.get(clean) || [];
      list.push(o);
      map.set(clean, list);
    });
    return map;
  }, [orders]);

  // Combined accounts list merged with order data
  const combinedAccounts = useMemo(() => {
    const accountMap = new Map<string, LoyaltyAccount>();

    // 1. Add loaded loyalty accounts
    loyaltyAccounts.forEach(acc => {
      accountMap.set(acc.phone, { ...acc });
    });

    // 2. Synthesize accounts from orders if not already in loyalty collection
    ordersByPhone.forEach((orderList, phone) => {
      if (!accountMap.has(phone)) {
        const firstOrder = orderList[0];
        const totalSpent = orderList.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
        const count = orderList.length;
        const pts = Math.floor(totalSpent / 100);
        const tier = pts >= 300 ? 'Platinum VIP' : (pts >= 100 ? 'Gold VIP' : 'Silver VIP');

        accountMap.set(phone, {
          phone,
          customerName: firstOrder.customerName || 'সম্মানিত গ্রাহক',
          points: pts,
          totalSpent,
          ordersCount: count,
          tier,
          referralCode: generateReferralCodeForPhone(phone),
          referralsCount: 0,
          referralBonusEarned: 0,
          referralBonusBalance: 0,
          updatedAt: firstOrder.createdAt || new Date().toISOString()
        });
      } else {
        // Sync order count if orders collection has newer records
        const existing = accountMap.get(phone)!;
        if (orderList.length > existing.ordersCount) {
          existing.ordersCount = orderList.length;
          existing.totalSpent = orderList.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
        }
      }
    });

    return Array.from(accountMap.values());
  }, [loyaltyAccounts, ordersByPhone]);

  // Metrics calculation
  const totalRepeatCustomers = useMemo(() => {
    return combinedAccounts.filter(a => a.ordersCount >= 2).length;
  }, [combinedAccounts]);

  const totalReferralsMade = useMemo(() => {
    return combinedAccounts.reduce((sum, a) => sum + (a.referralsCount || 0), 0);
  }, [combinedAccounts]);

  const totalBonusGiven = useMemo(() => {
    return combinedAccounts.reduce((sum, a) => sum + (a.referralBonusEarned || 0), 0);
  }, [combinedAccounts]);

  // Filtered List
  const filteredList = useMemo(() => {
    return combinedAccounts.filter(acc => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        acc.customerName?.toLowerCase().includes(q) || 
        acc.phone?.includes(q) || 
        acc.referralCode?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filterCohort === 'repeat') {
        return acc.ordersCount === 2;
      }
      if (filterCohort === 'vip') {
        return acc.ordersCount >= 3;
      }
      if (filterCohort === 'top_referrers') {
        return (acc.referralsCount || 0) > 0;
      }
      return true;
    }).sort((a, b) => (b.ordersCount || 0) - (a.ordersCount || 0));
  }, [combinedAccounts, searchQuery, filterCohort]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // WhatsApp Re-engagement Link Generator
  const sendReengagementWhatsApp = (acc: LoyaltyAccount) => {
    const isVip = acc.ordersCount >= 2;
    const discountAmount = isVip ? thirdOrderDiscount : secondOrderDiscount;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://serafashion.com';
    const text = `আসসালামু আলাইকুম ${acc.customerName} আপু/ভাইয়া! 🌸\nসেরা ফ্যাশন (SERA FASHION) এ আপনি পূর্বে কেনাকাটা করেছিলেন। আমাদের সম্মানিত পুরোনো নিয়মিত গ্রাহক হিসেবে আপনার জন্য আজকের অর্ডারে রয়েছে স্পেশাল ৳${discountAmount} ক্যাশ ডিসকাউন্ট কুপন! 🎁\n\n✨ এছাড়াও বন্ধুদের রেফার করলেই পাচ্ছেন ৳১০০ বোনাস!\n👉 নতুন আকর্ষণীয় কালেকশন দেখতে এখনই ভিজিট করুন: ${baseUrl}\n\nআপনার কোনো সাহায্য লাগলে আমাদের জানান। ধন্যবাদ! ❤️`;
    
    const url = `https://api.whatsapp.com/send?phone=88${acc.phone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans pb-12">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 rounded-3xl border border-amber-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 text-left">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-rose-600 text-slate-950 font-black text-[10px] rounded-full uppercase tracking-wider flex items-center gap-1 shadow-md">
                <Gift size={13} className="text-slate-950" />
                গ্রোথ ও রিটেনশন ইঞ্জিন
              </span>
              <span className="text-xs text-amber-400 font-bold">লয়্যালটি ও রেফারেল হাব</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-serif">
              বন্ধু রেফারেল ও নিয়মিত কাস্টমার অফার
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-2xl">
              পুরোনো গ্রাহকদের বারবার কেনাকাটায় উৎসাহিত করতে স্পেশাল ক্যাশ ডিসকাউন্ট এবং বন্ধুদের রেফার করে ৳১০০ বোনাস আয়ের সম্পূর্ণ ম্যানেজমেন্ট হাব।
            </p>
          </div>

          <button
            onClick={loadAccounts}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black transition-all border border-white/10 cursor-pointer self-start md:self-center"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>তালিকা রিফ্রেশ</span>
          </button>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-left">
            <span className="text-[10.5px] uppercase font-bold text-slate-400 block tracking-wider">পুরোনো নিয়মিত কাস্টমার</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-amber-400 font-mono">{totalRepeatCustomers}</span>
              <span className="text-xs text-slate-400 font-bold">জন (২+ বার)</span>
            </div>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-left">
            <span className="text-[10.5px] uppercase font-bold text-slate-400 block tracking-wider">সফল বন্ধু রেফারেল</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-400 font-mono">{totalReferralsMade}</span>
              <span className="text-xs text-slate-400 font-bold">টি সফল অর্ডার</span>
            </div>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-left">
            <span className="text-[10.5px] uppercase font-bold text-slate-400 block tracking-wider">মোট রেফারেল বোনাস</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-rose-400 font-mono">৳{totalBonusGiven.toLocaleString()}</span>
              <span className="text-xs text-slate-400 font-bold">প্রদান</span>
            </div>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-left">
            <span className="text-[10.5px] uppercase font-bold text-slate-400 block tracking-wider">মোট লয়্যালটি মেম্বার</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-sky-400 font-mono">{combinedAccounts.length}</span>
              <span className="text-xs text-slate-400 font-bold">জন গ্রাহক</span>
            </div>
          </div>
        </div>
      </div>

      {/* Program Settings Panel */}
      <div className="bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl text-left">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Settings size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">রেফারেল ও ডিসকাউন্ট পলিসি কনফিগারেশন</h3>
              <p className="text-xs text-slate-400 font-medium">কাস্টমারকে কী পরিমাণ ক্যাশ ছাড় ও রেফারেল বোনাস দেওয়া হবে তা নির্ধারণ করুন</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* BOX 1: Friend Referral Settings */}
            <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-rose-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-300">১. বন্ধু রেফারেল প্রোগ্রাম</h4>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={referralEnabled} 
                    onChange={e => setReferralEnabled(e.target.checked)} 
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                </label>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    বন্ধুর ১ম অর্ডারে নিশ্চিত ছাড় (টাকায়):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">৳</span>
                    <input 
                      type="number" 
                      min="0"
                      value={friendDiscount}
                      onChange={e => setFriendDiscount(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm font-bold text-white outline-none focus:border-rose-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">বন্ধু লিংকে ক্লিক করে অর্ডার করলেই এই ছাড় পাবেন</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    রেফারারের ক্যাশ রিওয়ার্ড বোনাস (টাকায়):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">৳</span>
                    <input 
                      type="number" 
                      min="0"
                      value={referrerBonus}
                      onChange={e => setReferrerBonus(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm font-bold text-white outline-none focus:border-rose-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">বন্ধুর অর্ডার সম্পন্ন হলে রেফারারের একাউন্টে জমা হবে</span>
                </div>
              </div>
            </div>

            {/* BOX 2: Repeat Customer Settings */}
            <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown size={16} className="text-amber-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">২. পুরোনো ও নিয়মিত কাস্টমার অফার</h4>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={repeatOfferEnabled} 
                    onChange={e => setRepeatOfferEnabled(e.target.checked)} 
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    ২য় অর্ডারে পুরোনো কাস্টমার ছাড় (টাকায়):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">৳</span>
                    <input 
                      type="number" 
                      min="0"
                      value={secondOrderDiscount}
                      onChange={e => setSecondOrderDiscount(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm font-bold text-white outline-none focus:border-amber-400"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">পূর্বে ১টি সফল অর্ডার থাকলে ২য় অর্ডারে অটোমেটিক সক্রিয় হবে</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    ৩য়+ অর্ডারে ভিআইপি নিয়মিত কাস্টমার মেগা ছাড় (টাকায়):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">৳</span>
                    <input 
                      type="number" 
                      min="0"
                      value={thirdOrderDiscount}
                      onChange={e => setThirdOrderDiscount(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm font-bold text-white outline-none focus:border-amber-400"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">২টি বা তার বেশি অর্ডার থাকা গ্রাহকদের জন্য বিশেষ সম্মাননা ছাড়</span>
                </div>
              </div>
            </div>

          </div>

          <div className="flex items-center justify-between pt-2">
            {savedSuccess ? (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-fade-in">
                <CheckCircle2 size={16} />
                <span>সেটিংস সফলভাবে সেভ ও কার্যকর করা হয়েছে!</span>
              </span>
            ) : <div />}

            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 via-rose-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {savingSettings ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
              <span>সেটিংস সেভ করুন (Save Changes)</span>
            </button>
          </div>
        </form>
      </div>

      {/* Customer Registry & Re-engagement Section */}
      <div className="bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Users size={18} className="text-amber-400" />
              <span>নিয়মিত ও পুরোনো কাস্টমার রেজিস্ট্রি ({filteredList.length} জন)</span>
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              পুরোনো গ্রাহকদের আবার কেনাকাটায় উৎসাহিত করতে WhatsApp এ ১-ক্লিকে স্পেশাল অফার মেসেজ পাঠান
            </p>
          </div>

          {/* Cohort Filter Tabs */}
          <div className="flex flex-wrap bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setFilterCohort('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${filterCohort === 'all' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
            >
              সবাই ({combinedAccounts.length})
            </button>
            <button
              onClick={() => setFilterCohort('repeat')}
              className={`px-3 py-1.5 rounded-lg transition-all ${filterCohort === 'repeat' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
            >
              ২য় অর্ডার কাস্টমার ({combinedAccounts.filter(a => a.ordersCount === 2).length})
            </button>
            <button
              onClick={() => setFilterCohort('vip')}
              className={`px-3 py-1.5 rounded-lg transition-all ${filterCohort === 'vip' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
            >
              ভিআইপি নিয়মিত (৩+) ({combinedAccounts.filter(a => a.ordersCount >= 3).length})
            </button>
            <button
              onClick={() => setFilterCohort('top_referrers')}
              className={`px-3 py-1.5 rounded-lg transition-all ${filterCohort === 'top_referrers' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
            >
              টপ রেফারার ({combinedAccounts.filter(a => (a.referralsCount || 0) > 0).length})
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="নাম, মোবাইল নম্বর বা রেফারেল কোড দিয়ে সার্চ করুন..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-white outline-none focus:border-amber-500"
          />
        </div>

        {/* Table of Customers */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[9.5px] font-black tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5">কাস্টমার নাম ও মোবাইল</th>
                <th className="p-3.5">অর্ডার সংখ্যা</th>
                <th className="p-3.5">মোট কেনাকাটা</th>
                <th className="p-3.5">লয়্যালটি পয়েন্ট</th>
                <th className="p-3.5">ইউনিক রেফার কোড</th>
                <th className="p-3.5">রেফারেল আর্নিং</th>
                <th className="p-3.5 text-right">রি-এনগেজমেন্ট অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    কোনো কাস্টমার রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredList.map((acc) => {
                  const isVipRegular = acc.ordersCount >= 3;
                  const isSecondOrder = acc.ordersCount === 2;

                  return (
                    <tr key={acc.phone} className="hover:bg-slate-850/50 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                            {acc.customerName ? acc.customerName.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white">{acc.customerName}</span>
                              {isVipRegular && (
                                <span className="text-[8px] font-black uppercase bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded">VIP (3+)</span>
                              )}
                              {isSecondOrder && (
                                <span className="text-[8px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded">2nd Order</span>
                              )}
                            </div>
                            <span className="text-slate-400 font-mono text-[11px] block">{acc.phone}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 font-bold font-mono text-white">
                        <span className={`px-2 py-0.5 rounded-lg text-xs ${acc.ordersCount >= 2 ? 'bg-amber-500/20 text-amber-300 font-black' : 'text-slate-300'}`}>
                          {acc.ordersCount} টি
                        </span>
                      </td>

                      <td className="p-3.5 font-bold font-mono text-emerald-400">
                        ৳{acc.totalSpent.toLocaleString()}
                      </td>

                      <td className="p-3.5 font-mono">
                        <span className="text-amber-400 font-bold">{acc.points}</span>
                        <span className="text-slate-500 text-[10px] ml-1">pts ({acc.tier})</span>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 font-mono text-slate-300 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 w-fit">
                          <span className="font-bold text-amber-300">{acc.referralCode}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(acc.referralCode, `code_${acc.phone}`)}
                            className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                            title="কোড কপি"
                          >
                            {copiedText === `code_${acc.phone}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono">
                        <span className="text-slate-300">{acc.referralsCount || 0} বন্ধু</span>
                        <span className="text-rose-400 font-bold block text-[11px]">৳{acc.referralBonusEarned || 0} বোনাস</span>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => sendReengagementWhatsApp(acc)}
                            className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                            title="WhatsApp-এ রি-অর্ডার অফার মেসেজ পাঠান"
                          >
                            <MessageCircle size={13} />
                            <span>অফার পাঠান</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
