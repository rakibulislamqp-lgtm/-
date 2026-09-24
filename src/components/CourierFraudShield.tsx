import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, ShieldAlert, AlertTriangle, Search, Phone, User, 
  MapPin, CheckCircle2, XCircle, RefreshCw, Lock, Zap, Shield, 
  Trash2, Plus, ArrowUpRight, TrendingUp, Check, AlertCircle, 
  MessageSquare, Copy, Eye, Clock, Activity, Cpu, Database
} from 'lucide-react';
import { 
  checkCourierFraud, 
  getSecurityIncidents, 
  FraudCheckResult, 
  SecurityIncident, 
  recordSecurityIncident 
} from '../services/fraudShieldService';
import { Order, BrandSettings } from '../types';
import { updateBrandSettings } from '../services/settingsService';

interface CourierFraudShieldProps {
  orders: Order[];
  brandSettings: BrandSettings | null;
  onRefreshSettings?: () => void;
}

export default function CourierFraudShield({ orders, brandSettings, onRefreshSettings }: CourierFraudShieldProps) {
  const [searchPhone, setSearchPhone] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchResult, setSearchResult] = useState<FraudCheckResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [incidents, setIncidents] = useState<SecurityIncident[]>(() => getSecurityIncidents());
  const [newBlacklistPhone, setNewBlacklistPhone] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Settings local state
  const [localSettings, setLocalSettings] = useState<{
    fraudShieldEnabled: boolean;
    maxOrdersPerIp: number;
    rateLimitCooldownSeconds: number;
    blockGibberishAddresses: boolean;
    requireAdvanceForHighRisk: boolean;
    highRiskReturnThreshold: number;
    blacklistedPhones: string[];
  }>({
    fraudShieldEnabled: brandSettings?.fraudShieldEnabled !== false,
    maxOrdersPerIp: brandSettings?.maxOrdersPerIp || 3,
    rateLimitCooldownSeconds: brandSettings?.rateLimitCooldownSeconds || 45,
    blockGibberishAddresses: brandSettings?.blockGibberishAddresses !== false,
    requireAdvanceForHighRisk: brandSettings?.requireAdvanceForHighRisk !== false,
    highRiskReturnThreshold: brandSettings?.highRiskReturnThreshold || 40,
    blacklistedPhones: brandSettings?.blacklistedPhones || ['01700000000', '01800000000']
  });

  useEffect(() => {
    if (brandSettings) {
      setLocalSettings({
        fraudShieldEnabled: brandSettings.fraudShieldEnabled !== false,
        maxOrdersPerIp: brandSettings.maxOrdersPerIp || 3,
        rateLimitCooldownSeconds: brandSettings.rateLimitCooldownSeconds || 45,
        blockGibberishAddresses: brandSettings.blockGibberishAddresses !== false,
        requireAdvanceForHighRisk: brandSettings.requireAdvanceForHighRisk !== false,
        highRiskReturnThreshold: brandSettings.highRiskReturnThreshold || 40,
        blacklistedPhones: brandSettings.blacklistedPhones || ['01700000000', '01800000000']
      });
    }
  }, [brandSettings]);

  // Listen for real-time security events
  useEffect(() => {
    const handleSecurityEvent = () => {
      setIncidents(getSecurityIncidents());
    };
    window.addEventListener('security_incident_logged', handleSecurityEvent);
    return () => window.removeEventListener('security_incident_logged', handleSecurityEvent);
  }, []);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchPhone || searchPhone.trim().length < 5) return;

    setIsSearching(true);
    setTimeout(() => {
      const result = checkCourierFraud(
        searchPhone.trim(),
        searchName.trim() || undefined,
        undefined,
        orders,
        { ...brandSettings, ...localSettings }
      );
      setSearchResult(result);
      setIsSearching(false);
    }, 300);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleToggleBlacklist = async (phoneToToggle: string) => {
    const clean = phoneToToggle.replace(/\D/g, '');
    if (!clean) return;

    const currentList = localSettings.blacklistedPhones || [];
    const exists = currentList.map(p => p.replace(/\D/g, '')).includes(clean);
    
    let updated: string[];
    if (exists) {
      updated = currentList.filter(p => p.replace(/\D/g, '') !== clean);
    } else {
      updated = [...currentList, clean];
    }

    setLocalSettings(prev => ({ ...prev, blacklistedPhones: updated }));

    // Re-evaluate search result if active
    if (searchResult && searchResult.cleanPhone === clean) {
      const rechecked = checkCourierFraud(clean, searchName, undefined, orders, {
        ...brandSettings,
        blacklistedPhones: updated
      });
      setSearchResult(rechecked);
    }

    try {
      await updateBrandSettings({ blacklistedPhones: updated });
      if (onRefreshSettings) onRefreshSettings();
    } catch (e) {
      console.warn("Failed to persist blacklist:", e);
    }
  };

  const handleAddCustomBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newBlacklistPhone.replace(/\D/g, '');
    if (clean.length < 11) {
      alert("সঠিক ১১ ডিজিটের মোবাইল নম্বর লিখুন।");
      return;
    }

    await handleToggleBlacklist(clean);
    setNewBlacklistPhone('');
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await updateBrandSettings(localSettings);
      if (onRefreshSettings) onRefreshSettings();
      alert("কুরিয়ার ফ্রড গার্ড ও স্প্যাম শিল্ড সেটিংস সফলভাবে সেভ হয়েছে!");
    } catch (e) {
      alert("সেটিংস সেভ করতে সমস্যা হয়েছে।");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Calculate total saved return money
  const totalSavedCost = incidents.reduce((acc, curr) => acc + (curr.estimatedCostSaved || 150), 0);
  const totalBlockedThreats = incidents.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-850 to-emerald-950 text-white p-6 sm:p-8 rounded-3xl border border-emerald-500/30 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-black tracking-wider uppercase border border-emerald-500/30">
              <ShieldCheck size={14} className="animate-pulse" />
              <span>Anti-Fake & Courier Return Guard v2.6</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              🚚 কুরিয়ার ফ্রড গার্ড & স্প্যাম শিল্ড
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              SteadFast, Pathao এবং RedX ডেলিভারি নেটওয়ার্কের সাহায্যে ফেক কাস্টমার ও ইচ্ছাকৃত রিটার্ন ঝুঁকি সনাক্ত করুন। রোবট বট ট্র্যাপ ও রেট লিমিটিং দিয়ে আপনার বিজ্ঞাপনের বাজেট ও কুরিয়ার লস বাঁচান।
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="bg-slate-800/80 border border-emerald-500/40 p-4 rounded-2xl text-center">
              <span className="text-[11px] text-slate-400 font-bold block uppercase tracking-wider">বাঁচানো কুরিয়ার লস 💰</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400">৳{totalSavedCost.toLocaleString()}</span>
            </div>
            <div className="bg-slate-800/80 border border-rose-500/40 p-4 rounded-2xl text-center">
              <span className="text-[11px] text-slate-400 font-bold block uppercase tracking-wider">আটকে দেওয়া ফেক থ্রেট 🚫</span>
              <span className="text-xl sm:text-2xl font-black text-rose-400">{totalBlockedThreats} টি</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: LIVE COURIER PHONE NUMBER FRAUD CHECKER */}
      <div className="bg-white rounded-3xl border border-gray-200/90 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-gray-900 flex items-center gap-2">
              <Search className="text-amber-500" size={22} />
              <span>লাইভ কুরিয়ার হিস্টোরি ও রিটার্ন রেশিও চেকার</span>
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              যেকোনো কাস্টমারের ১১ ডিজিটের মোবাইল নম্বর লিখুন এবং সাথে সাথে ওনার পার্সেল গ্রহণের সাফল্যের হার যাচাই করুন।
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchPhone('01712345678');
                setSearchName('করিম সাহেব');
                handleSearch();
              }}
              className="text-[11px] bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer"
            >
              সবুজ টেস্ট 🟢
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchPhone('01700000000');
                setSearchName('সন্দেহভাজন');
                handleSearch();
              }}
              className="text-[11px] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer"
            >
              ফেক/ঝুঁকি টেস্ট 🔴
            </button>
          </div>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <input
              type="tel"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              placeholder="মোবাইল নম্বর (যেমন: 017XXXXXXXX)"
              className="w-full bg-stone-50 border-2 border-stone-200 focus:border-amber-500 focus:bg-white px-4 py-3 text-base font-bold outline-none rounded-xl transition-all"
            />
          </div>
          <div className="sm:col-span-4 relative">
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="কাস্টমারের নাম (ঐচ্ছিক)"
              className="w-full bg-stone-50 border-2 border-stone-200 focus:border-amber-500 focus:bg-white px-4 py-3 text-base font-medium outline-none rounded-xl transition-all"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isSearching}
              className="w-full h-full bg-slate-900 hover:bg-slate-800 text-white font-black px-5 py-3 rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
            >
              {isSearching ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
              <span>যাচাই করুন</span>
            </button>
          </div>
        </form>

        {/* Search Result Display Card */}
        <AnimatePresence>
          {searchResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-6 rounded-3xl border-2 transition-all ${
                searchResult.colorZone === 'green'
                  ? 'bg-emerald-50/50 border-emerald-300 text-emerald-950'
                  : searchResult.colorZone === 'yellow'
                  ? 'bg-amber-50/50 border-amber-300 text-amber-950'
                  : 'bg-rose-50/50 border-rose-300 text-rose-950'
              }`}
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-current/15">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl shrink-0 ${
                    searchResult.colorZone === 'green'
                      ? 'bg-emerald-600 text-white'
                      : searchResult.colorZone === 'yellow'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-rose-600 text-white'
                  }`}>
                    {searchResult.colorZone === 'green' ? <ShieldCheck size={28} /> : <ShieldAlert size={28} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xl font-black font-mono tracking-wider">{searchResult.cleanPhone}</h4>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                        searchResult.colorZone === 'green'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : searchResult.colorZone === 'yellow'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                      }`}>
                        {searchResult.badgeTitle}
                      </span>
                    </div>
                    <p className="text-xs opacity-80 mt-0.5 font-medium">
                      সারাদেশের কুরিয়ার নেটওয়ার্কে সর্বমোট {searchResult.totalOrders}টি অর্ডারের ডাটা বিশ্লেষণ করা হয়েছে।
                    </p>
                  </div>
                </div>

                {/* Blacklist Toggle Button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleBlacklist(searchResult.cleanPhone)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                      searchResult.isBlacklisted
                        ? 'bg-stone-800 text-white hover:bg-stone-900'
                        : 'bg-rose-600 text-white hover:bg-rose-700'
                    }`}
                  >
                    <Lock size={13} />
                    <span>{searchResult.isBlacklisted ? 'কালো তালিকা থেকে বাদ দিন' : 'কালো তালিকায় যুক্ত করুন (Blacklist)'}</span>
                  </button>
                </div>
              </div>

              {/* Stats Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
                <div className="bg-white/80 p-3.5 rounded-2xl border border-current/10 text-center">
                  <span className="text-[10px] font-bold opacity-70 block uppercase tracking-wider">ডেলিভারি সাকসেস রেট</span>
                  <span className={`text-2xl font-black ${
                    searchResult.colorZone === 'green' ? 'text-emerald-700' : searchResult.colorZone === 'yellow' ? 'text-amber-700' : 'text-rose-700'
                  }`}>
                    {searchResult.deliverySuccessRate}%
                  </span>
                </div>
                <div className="bg-white/80 p-3.5 rounded-2xl border border-current/10 text-center">
                  <span className="text-[10px] font-bold opacity-70 block uppercase tracking-wider">পার্সেল রিটার্ন রেট</span>
                  <span className={`text-2xl font-black ${searchResult.returnRate > 30 ? 'text-rose-600' : 'text-slate-700'}`}>
                    {searchResult.returnRate}%
                  </span>
                </div>
                <div className="bg-white/80 p-3.5 rounded-2xl border border-current/10 text-center">
                  <span className="text-[10px] font-bold opacity-70 block uppercase tracking-wider">সফল ডেলিভারি সম্পন্ন</span>
                  <span className="text-2xl font-black text-emerald-600">{searchResult.deliveredCount} টি</span>
                </div>
                <div className="bg-white/80 p-3.5 rounded-2xl border border-current/10 text-center">
                  <span className="text-[10px] font-bold opacity-70 block uppercase tracking-wider">বাতিল / কুরিয়ার রিটার্ন</span>
                  <span className="text-2xl font-black text-rose-600">{searchResult.cancelledCount} টি</span>
                </div>
              </div>

              {/* AI Guidance & Recommended Action */}
              <div className="space-y-2 bg-white/90 p-4 rounded-2xl border border-current/15">
                <div className="flex items-start gap-2.5">
                  <Zap size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-black uppercase tracking-wider">বিশ্লেষণ ও কারণ:</h5>
                    <p className="text-xs font-medium leading-relaxed mt-0.5">{searchResult.riskReason}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 pt-2 border-t border-current/10">
                  <Shield size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-black uppercase tracking-wider">সুপারিশকৃত পদক্ষেপ (Recommended Action):</h5>
                    <p className="text-xs font-bold leading-relaxed mt-0.5">{searchResult.recommendedAction}</p>
                  </div>
                </div>
              </div>

              {/* Courier Breakdown Table */}
              <div className="mt-4 pt-3 border-t border-current/15">
                <h5 className="text-[11px] font-black uppercase tracking-wider opacity-80 mb-2">কুরিয়ার অনুযায়ী বিস্তারিত হিস্টোরি:</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {searchResult.courierBreakdown.map((c) => (
                    <div key={c.courierName} className="bg-white/70 p-3 rounded-xl border border-current/10 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold block text-gray-900">{c.courierName}</span>
                        <span className="text-[10px] opacity-70">সফল: {c.delivered} | রিটার্ন: {c.returned}</span>
                      </div>
                      <span className={`font-black px-2 py-0.5 rounded-md text-[10px] ${
                        c.successRate >= 80 ? 'bg-emerald-100 text-emerald-800' : c.successRate >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {c.successRate}% সাকসেস
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SECTION 2: LIVE AUDIT LOGS & BLOCKED THREATS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Security Incident Log */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-200/90 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                <Activity className="text-rose-500" size={20} />
                <span>লাইভ স্প্যাম & বট প্রতিরোধ লগ (Live Threat Feed)</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">স্বয়ংক্রিয়ভাবে আটকে দেওয়া রোবট বট, ফেক অর্ডার ও স্প্যাম ট্র্যাপ</p>
            </div>
            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-mono text-xs font-black rounded-lg border border-rose-200">
              {incidents.length} Records
            </span>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {incidents.map((incident) => (
              <div key={incident.id} className="p-3.5 bg-stone-50 hover:bg-stone-100 rounded-2xl border border-stone-200/80 transition-colors flex items-start justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wider ${
                      incident.type === 'bot_honeypot'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : incident.type === 'rate_limit_exceeded'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {incident.type === 'bot_honeypot' ? '🤖 Bot Honeypot Trap' : incident.type === 'rate_limit_exceeded' ? '⚡ Rate Limit Exceeded' : '🚫 Blacklist / Gibberish'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">{incident.timestamp}</span>
                  </div>
                  <p className="text-gray-800 font-medium">{incident.details}</p>
                  {incident.phone && (
                    <div className="text-[11px] text-gray-500 font-mono">
                      Phone: <span className="font-bold text-gray-700">{incident.phone}</span> {incident.name ? `(${incident.name})` : ''}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md block">
                    +৳{incident.estimatedCostSaved} সংরক্ষিত
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Blacklist Management & Rules */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-gray-200/90 p-6 shadow-sm space-y-4">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
              <Lock className="text-stone-800" size={20} />
              <span>কালো তালিকাভুক্ত মোবাইল নম্বর (Blacklist)</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">যেসব নম্বর থেকে কোনোভাবেই কোনো অর্ডার গ্রহণ করা হবে না</p>
          </div>

          {/* Add Blacklist Input */}
          <form onSubmit={handleAddCustomBlacklist} className="flex gap-2">
            <input
              type="tel"
              value={newBlacklistPhone}
              onChange={(e) => setNewBlacklistPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="flex-1 bg-stone-50 border border-stone-200 focus:border-rose-500 px-3.5 py-2 text-xs font-bold rounded-xl outline-none"
            />
            <button
              type="submit"
              className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
            >
              <Plus size={14} />
              <span>ব্লক করুন</span>
            </button>
          </form>

          {/* Blacklisted List */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 divide-y divide-gray-100">
            {(localSettings.blacklistedPhones || []).map((phone) => (
              <div key={phone} className="pt-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span className="font-mono font-bold text-gray-800">{phone}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleBlacklist(phone)}
                  className="text-stone-400 hover:text-rose-600 transition-colors cursor-pointer p-1"
                  title="আনব্লক করুন"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 3: SECURITY & FLOOD CONTROLS */}
      <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <Cpu className="text-emerald-400" size={22} />
              <span>স্প্যাম ফ্লাড ও স্বয়ংক্রিয় রেট লিমিটিং কনফিগারেশন</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              একই আইপি বা ডিভাইস থেকে দ্রুত পরপর একাধিক ফেক অর্ডার বা স্ক্রিপ্ট আক্রমণ প্রতিরোধ নিয়ন্ত্রণ করুন
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSavingSettings}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
          >
            {isSavingSettings ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
            <span>সেটিংস আপডেট করুন</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Rate Limiting Toggle */}
          <div className="p-4 bg-slate-850 rounded-2xl border border-slate-750 flex items-center justify-between gap-4">
            <div>
              <h5 className="text-xs font-black text-white uppercase tracking-wider">১. ডিভাইস অর্ডার কুলডাউন টাইমার (Cooldown)</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">একই ডিভাইস থেকে ১টি অর্ডারের পর দ্বিতীয় অর্ডারের মধ্যকার ন্যূনতম বিরতি</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                type="number"
                min="10"
                max="300"
                value={localSettings.rateLimitCooldownSeconds}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, rateLimitCooldownSeconds: Number(e.target.value) || 45 }))}
                className="w-16 bg-slate-950 border border-slate-700 px-2 py-1.5 rounded-lg text-xs font-mono font-bold text-center text-emerald-400 outline-none"
              />
              <span className="text-xs text-slate-400">সেকেন্ড</span>
            </div>
          </div>

          {/* Max Orders per IP */}
          <div className="p-4 bg-slate-850 rounded-2xl border border-slate-750 flex items-center justify-between gap-4">
            <div>
              <h5 className="text-xs font-black text-white uppercase tracking-wider">২. আইপি প্রতি সর্বোচ্চ অর্ডার (Rate Limit)</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">১০ মিনিটের মধ্যে একই আইপি অ্যাড্রেস থেকে সর্বোচ্চ অর্ডার সংখ্যা</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                type="number"
                min="1"
                max="10"
                value={localSettings.maxOrdersPerIp}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, maxOrdersPerIp: Number(e.target.value) || 3 }))}
                className="w-16 bg-slate-950 border border-slate-700 px-2 py-1.5 rounded-lg text-xs font-mono font-bold text-center text-emerald-400 outline-none"
              />
              <span className="text-xs text-slate-400">টি</span>
            </div>
          </div>

          {/* Honeypot Bot Trap Toggle */}
          <div className="p-4 bg-slate-850 rounded-2xl border border-slate-750 flex items-center justify-between gap-4">
            <div>
              <h5 className="text-xs font-black text-white uppercase tracking-wider">৩. অদৃশ্য বট ফাঁদ (Honeypot Trap)</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">চেকআউট ফর্মে অদৃশ্য ফিল্ড দিয়ে স্বয়ংক্রিয় রোবট/স্ক্রিপ্ট স্প্যাম আটকানো</p>
            </div>
            <input
              type="checkbox"
              checked={localSettings.fraudShieldEnabled}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, fraudShieldEnabled: e.target.checked }))}
              className="w-5 h-5 accent-emerald-500 cursor-pointer rounded shrink-0"
            />
          </div>

          {/* Gibberish Address Blocker */}
          <div className="p-4 bg-slate-850 rounded-2xl border border-slate-750 flex items-center justify-between gap-4">
            <div>
              <h5 className="text-xs font-black text-white uppercase tracking-wider">৪. অর্থহীন টেক্সট ও ফেক নাম ফিল্টার (Gibberish Filter)</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">নাম ও ঠিকানায় "asdfgh", "111111", "test" ইত্যাদি লিখলে অর্ডার আটকে দেবে</p>
            </div>
            <input
              type="checkbox"
              checked={localSettings.blockGibberishAddresses}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, blockGibberishAddresses: e.target.checked }))}
              className="w-5 h-5 accent-emerald-500 cursor-pointer rounded shrink-0"
            />
          </div>
        </div>
      </div>

    </div>
  );
}
