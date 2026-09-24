import React, { useState, useMemo } from 'react';
import { 
  Target, Send, MessageSquare, Smartphone, Download, Sparkles, 
  Users, ShoppingBag, Gift, ArrowRight, CheckCircle2, Clock, 
  Search, Filter, Play, HelpCircle, AlertCircle, RefreshCw, Layers, BellRing, Eye
} from 'lucide-react';
import { Order, VisitorSession, BrandSettings } from '../types';
import { updateBrandSettings } from '../services/settingsService';

interface RetargetingManagerProps {
  orders: Order[];
  visitorSessions: VisitorSession[];
  brandSettings: BrandSettings | null;
  onRefreshSettings?: () => void;
  onOpenSmsModal?: (phoneNumbers: string[], defaultMessage?: string) => void;
}

export interface UnifiedLead {
  id: string;
  name: string;
  mobileNumber: string;
  cohort: 'abandoned_checkout' | 'spin_lead' | 'past_customer' | 'active_visitor';
  cohortLabel: string;
  district?: string;
  upazila?: string;
  lastActive: string;
  lastViewedProduct?: string;
  wonCouponCode?: string;
  wonCouponDiscount?: number;
  totalOrdersCount?: number;
  sessionId?: string;
}

export default function RetargetingManager({
  orders,
  visitorSessions,
  brandSettings,
  onRefreshSettings,
  onOpenSmsModal
}: RetargetingManagerProps) {
  const [selectedCohort, setSelectedCohort] = useState<'all' | 'abandoned_checkout' | 'spin_lead' | 'past_customer'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom Banner & Popup settings state
  const [bannerEnabled, setBannerEnabled] = useState(brandSettings?.retargetingBannerEnabled ?? true);
  const [bannerText, setBannerText] = useState(
    brandSettings?.retargetingBannerText && !brandSettings.retargetingBannerText.includes('ফিরে আসার অভিনন্দন')
      ? brandSettings.retargetingBannerText
      : 'Sera – বিশ্বস্ততার সাথে প্রিমিয়াম শাড়ি ও বাংলাদেশ এবং পাকিস্তানি থ্রি-পিস সারা বাংলাদেশে দ্রুত ডেলিভারি ক্যাশ অন ডেলিভারি, কোয়ালিটি নিশ্চিত আজই অর্ডার করুন।'
  );
  const [couponCode, setCouponCode] = useState(brandSettings?.retargetingCouponCode || 'SAVE10');
  const [popupEnabled, setPopupEnabled] = useState(brandSettings?.retargetingPopupEnabled ?? true);
  const [popupOfferText, setPopupOfferText] = useState(brandSettings?.retargetingPopupOfferText || 'আপনার পছন্দের ড্রেসটি স্টক ফুরিয়ে যাওয়ার আগেই আজ ফ্রি ডেলিভারিতে নিয়ে নিন!');
  
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Custom Campaign SMS Composer State
  const [selectedTemplate, setSelectedTemplate] = useState('abandoned_recovery');
  const [customSmsText, setCustomSmsText] = useState(
    'প্রিয় {Name}, সেরা (Sera) থেকে আপনার সিলেক্ট করা পোশাকে বিশেষ ১০% ডিসকাউন্ট সক্রিয় রয়েছে! অর্ডার সম্পন্ন করতে ভিজিট করুন: {WebsiteUrl}'
  );

  // Aggregate and deduplicate all customer leads into a unified Audience Database
  const unifiedLeads = useMemo(() => {
    const map = new Map<string, UnifiedLead>();

    // 1. Process Visitor Sessions (Live Telemetry & Form Abandonment)
    visitorSessions.forEach(sess => {
      const rawPhone = (sess.mobileNumber || '').trim();
      const phoneDigits = rawPhone.replace(/\D/g, '');
      if (!phoneDigits || phoneDigits.length < 10) return;

      const normalizedPhone = phoneDigits.startsWith('88') ? phoneDigits.substring(2) : phoneDigits;
      const key = normalizedPhone;

      const stage = sess.currentStage;
      let cohort: UnifiedLead['cohort'] = 'active_visitor';
      let cohortLabel = 'ভিজিটর লিড';

      if (stage === 'filling_checkout' || stage === 'added_to_cart') {
        cohort = 'abandoned_checkout';
        cohortLabel = '🛒 অসম্পূর্ণ চেকআউট (হট লিড)';
      } else if (sess.hasSpun) {
        cohort = 'spin_lead';
        cohortLabel = '🎡 স্পিন অফার বিজয়ী';
      }

      const lastViewed = sess.views && sess.views.length > 0 ? sess.views[0].productTitle : undefined;

      map.set(key, {
        id: sess.sessionId || key,
        name: sess.customerName && sess.customerName !== 'Anonymous Visitor' ? sess.customerName : 'প্রিয় গ্রাহক',
        mobileNumber: '0' + normalizedPhone,
        cohort,
        cohortLabel,
        district: sess.district || 'ঢাকা',
        upazila: sess.upazila,
        lastActive: sess.lastActiveAt,
        lastViewedProduct: lastViewed,
        wonCouponCode: sess.wonCouponCode,
        wonCouponDiscount: sess.wonCouponDiscount,
        sessionId: sess.sessionId
      });
    });

    // 2. Process Past Orders (Highest Trust Cohort)
    orders.forEach(ord => {
      const rawPhone = (ord.mobileNumber || '').trim();
      const phoneDigits = rawPhone.replace(/\D/g, '');
      if (!phoneDigits || phoneDigits.length < 10) return;

      const normalizedPhone = phoneDigits.startsWith('88') ? phoneDigits.substring(2) : phoneDigits;
      const key = normalizedPhone;

      const existing = map.get(key);
      const totalOrders = (existing?.totalOrdersCount || 0) + 1;

      map.set(key, {
        id: ord.id || key,
        name: ord.customerName || existing?.name || 'প্রিয় গ্রাহক',
        mobileNumber: '0' + normalizedPhone,
        cohort: 'past_customer',
        cohortLabel: '📦 প্রভিওস কাস্টমার (পুরাতন ক্রেতা)',
        district: ord.district || existing?.district || 'ঢাকা',
        upazila: ord.upazila || existing?.upazila,
        lastActive: ord.createdAt || existing?.lastActive || new Date().toISOString(),
        lastViewedProduct: ord.items && ord.items.length > 0 ? ord.items[0].productTitle : existing?.lastViewedProduct,
        totalOrdersCount: totalOrders,
        wonCouponCode: existing?.wonCouponCode,
        wonCouponDiscount: existing?.wonCouponDiscount
      });
    });

    return Array.from(map.values()).sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());
  }, [visitorSessions, orders]);

  // Cohort Counts
  const abandonedCount = useMemo(() => unifiedLeads.filter(l => l.cohort === 'abandoned_checkout').length, [unifiedLeads]);
  const spinLeadCount = useMemo(() => unifiedLeads.filter(l => l.cohort === 'spin_lead').length, [unifiedLeads]);
  const pastCustomerCount = useMemo(() => unifiedLeads.filter(l => l.cohort === 'past_customer').length, [unifiedLeads]);
  const totalLeadsCount = unifiedLeads.length;

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return unifiedLeads.filter(lead => {
      if (selectedCohort !== 'all' && lead.cohort !== selectedCohort) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (lead.name || '').toLowerCase().includes(q);
        const matchPhone = (lead.mobileNumber || '').includes(q);
        const matchDistrict = (lead.district || '').toLowerCase().includes(q);
        return matchName || matchPhone || matchDistrict;
      }
      return true;
    });
  }, [unifiedLeads, selectedCohort, searchQuery]);

  // Preset Template Handler
  const handleTemplateChange = (tplKey: string) => {
    setSelectedTemplate(tplKey);
    const domain = window.location.origin;
    if (tplKey === 'abandoned_recovery') {
      setCustomSmsText(`প্রিয় {Name}, সেরা (Sera) তে আপনার ড্রেসটির সাথে ১০% ডিসকাউন্ট কুপন {DiscountCode} ওয়েট করছে! এখনই অর্ডার নিশ্চিত করুন: ${domain}`);
    } else if (tplKey === 'free_delivery') {
      setCustomSmsText(`প্রিয় {Name}, আজ সেরা (Sera) থেকে যেকোনো কেনাকাটায় ক্যাশ অন ডেলিভারি ও ফ্রি হোম ডেলিভারি অফার! ভিজিট করুন: ${domain}`);
    } else if (tplKey === 'new_collection') {
      setCustomSmsText(`প্রিয় {Name}, সেরা (Sera) তে নতুন লাক্সারি কালেকশন ইন-স্টক হয়েছে! স্টক ফুরিয়ে যাওয়ার আগে আপনার পছন্দের থ্রি-পিসটি বেছে নিন: ${domain}`);
    } else if (tplKey === 'vip_thankyou') {
      setCustomSmsText(`প্রিয় {Name}, আমাদের থেকে কেনাকাটা করার জন্য ধন্যবাদ। পরবর্তী অর্ডারে ১০০ টাকা অতিরিক্ত ক্যাশব্যাক পেতে ব্যবহার করুন কুপন {DiscountCode}`);
    }
  };

  // Bulk SMS Handler
  const handleTriggerBulkSms = () => {
    const phones = filteredLeads.map(l => l.mobileNumber);
    if (phones.length === 0) {
      alert('কোনো ফোন নম্বর পাওয়া যায়নি!');
      return;
    }
    if (onOpenSmsModal) {
      onOpenSmsModal(phones, customSmsText);
    } else {
      alert(`মোট ${phones.length} টি ফোন নম্বরে বাল্ক এসএমএস সেন্ড করার জন্য রেড করা হয়েছে।`);
    }
  };

  // WhatsApp Direct Chat Launcher
  const getWhatsAppLink = (lead: UnifiedLead) => {
    const phone = lead.mobileNumber.replace(/\D/g, '');
    const fullPhone = phone.startsWith('88') ? phone : '88' + phone;
    const domain = window.location.origin;
    let msg = `প্রিয় ${lead.name}, সেরা (Sera) থেকে যোগাযোগ করা হচ্ছে।\n\n`;
    if (lead.cohort === 'abandoned_checkout') {
      msg += `আপনি আমাদের ওয়েবসাইট থেকে পছন্দের পোশাকটি সিলেক্ট করেছিলেন। আপনার জন্য ১০% স্পেশাল ডিসকাউন্ট সক্রিয় করা হয়েছে!\n\nঅর্ডারটি কন্টিনিউ করতে ক্লিক করুন: ${domain}`;
    } else {
      msg += `আমাদের নতুন আকর্ষণীয় কালেকশন ও স্পেশাল ছাড় দেখতে ক্লিক করুন: ${domain}`;
    }
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
  };

  // Export Audience CSV for Facebook Ads Manager
  const handleExportCsv = () => {
    if (filteredLeads.length === 0) {
      alert('এক্সপোর্ট করার মত কোনো ডাটা নেই!');
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Phone Number,Full Name,District,Cohort,Last Viewed Product\n";

    filteredLeads.forEach(l => {
      const cleanPhone = '+88' + l.mobileNumber.replace(/\D/g, '');
      const cleanName = `"${l.name.replace(/"/g, '""')}"`;
      const cleanDist = `"${(l.district || 'Dhaka').replace(/"/g, '""')}"`;
      const cleanCohort = `"${l.cohortLabel.replace(/"/g, '""')}"`;
      const cleanProd = `"${(l.lastViewedProduct || '').replace(/"/g, '""')}"`;

      csvContent += `${cleanPhone},${cleanName},${cleanDist},${cleanCohort},${cleanProd}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sera_fashion_retargeting_audience_${selectedCohort}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save Settings
  const handleSaveRetargetingSettings = async () => {
    setIsSavingSettings(true);
    setSaveSuccessMsg('');
    try {
      await updateBrandSettings({
        retargetingBannerEnabled: bannerEnabled,
        retargetingBannerText: bannerText,
        retargetingCouponCode: couponCode,
        retargetingPopupEnabled: popupEnabled,
        retargetingPopupOfferText: popupOfferText
      });
      if (onRefreshSettings) onRefreshSettings();
      setSaveSuccessMsg('অনসাইট রিটার্গেটিং অফার সেটিং সফলভাবে সেভ হয়েছে!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      alert('সেটিং সেভ করতে সমস্যা হয়েছে!');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="space-y-8 text-gray-900 font-sans pb-12">
      
      {/* Hero Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white rounded-3xl p-6 md:p-10 border border-purple-800/40 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/20 rounded-2xl border border-purple-500/30 text-purple-300">
                <Target size={28} className="animate-pulse" />
              </div>
              <div>
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-[10px] font-black uppercase tracking-widest">
                  ● 100% Free Zero-Cost Marketing Suite
                </span>
                <h1 className="text-2xl md:text-3xl font-black mt-1">ইন-হাউস জিরো-কস্ট রিটার্গেটিং অ্যাড সেন্টার</h1>
              </div>
            </div>
            
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-900/40 transition-all cursor-pointer"
            >
              <Download size={16} />
              <span>Facebook Custom Audience (CSV) এক্সপোর্ট</span>
            </button>
          </div>

          <p className="text-gray-300 text-xs md:text-sm max-w-4xl leading-relaxed">
            ফেসবুকে বিজ্ঞাপনের বাজেট শেষ হয়ে গেলেও আপনার সেলস কমবে না! আপনার ওয়েবসাইটে ভিজিট করা, অসম্পূর্ণ ফর্ম টাইপ করা এবং ড্রেস সিলেক্ট করে ছেড়ে যাওয়া প্রতিটি গ্রাহক এখানে স্বয়ংক্রিয়ভাবে সংরক্ষিত আছে। তাদের সরাসরি বিনামূল্যে এসএমএস, হোয়াটসঅ্যাপ ও ওয়েবসাইট অফার দিয়ে কেনাকাটায় ফিরিয়ে আনুন।
          </p>
        </div>
      </div>

      {/* Cohort Funnel Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Abandoned Checkouts */}
        <div 
          onClick={() => setSelectedCohort('abandoned_checkout')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            selectedCohort === 'abandoned_checkout' 
              ? 'bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/30 shadow-lg' 
              : 'bg-white border-gray-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <ShoppingBag size={20} />
            <span className="text-[10px] font-black uppercase bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">সর্বোচ্চ কনভার্সন</span>
          </div>
          <div className="text-2xl font-black text-gray-900">{abandonedCount} জন</div>
          <div className="text-xs font-bold text-gray-700 mt-1">🛒 অসম্পূর্ণ চেকআউট (হট লিড)</div>
          <p className="text-[10px] text-gray-500 mt-1">ফর্ম পূরণ শুরু করে ছেড়ে যাওয়া কাস্টমার</p>
        </div>

        {/* Spin Leads */}
        <div 
          onClick={() => setSelectedCohort('spin_lead')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            selectedCohort === 'spin_lead' 
              ? 'bg-purple-500/10 border-purple-500 ring-2 ring-purple-500/30 shadow-lg' 
              : 'bg-white border-gray-200 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <Gift size={20} />
            <span className="text-[10px] font-black uppercase bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">ডিসকাউন্ট বিজয়ী</span>
          </div>
          <div className="text-2xl font-black text-gray-900">{spinLeadCount} জন</div>
          <div className="text-xs font-bold text-gray-700 mt-1">🎡 স্পিন হুইল কুপন বিজয়ী</div>
          <p className="text-[10px] text-gray-500 mt-1">হুইল ঘুরিয়ে কুপন কোড সংগ্রহিত কাস্টমার</p>
        </div>

        {/* Past Customers */}
        <div 
          onClick={() => setSelectedCohort('past_customer')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            selectedCohort === 'past_customer' 
              ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/30 shadow-lg' 
              : 'bg-white border-gray-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <Users size={20} />
            <span className="text-[10px] font-black uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">রিপিট বাইয়ার</span>
          </div>
          <div className="text-2xl font-black text-gray-900">{pastCustomerCount} জন</div>
          <div className="text-xs font-bold text-gray-700 mt-1">📦 প্রভিওস কাস্টমার (পুরাতন ক্রেতা)</div>
          <p className="text-[10px] text-gray-500 mt-1">পূর্বের অর্ডারের বিশ্বস্ত কাস্টমার</p>
        </div>

        {/* Total Unique Audience */}
        <div 
          onClick={() => setSelectedCohort('all')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            selectedCohort === 'all' 
              ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg' 
              : 'bg-white border-gray-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <Layers size={20} />
            <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">মোট ডাটাবেস</span>
          </div>
          <div className="text-2xl font-black text-gray-900">{totalLeadsCount} জন</div>
          <div className="text-xs font-bold text-gray-700 mt-1">🎯 মোট ইউনিক কাস্টমার ডাটাবেস</div>
          <p className="text-[10px] text-gray-500 mt-1">সকল সোর্স থেকে ফিল্টারকৃত মোবাইল লিস্ট</p>
        </div>

      </div>

      {/* Main Working Grid: Left Side SMS Launch & On-Site Retargeting, Right Side Audience Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 1 Column: SMS Campaign & On-Site Offer Drivers */}
        <div className="space-y-6">
          
          {/* Section 1: SMS / WhatsApp Campaign Trigger */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <Send size={18} className="text-purple-600" />
              <h2 className="text-base font-black">১. বাল্ক ও ফিল্টারড রিটার্গেটিং ক্যাম্পেইন</h2>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-700 block">ক্যাম্পেইন টেক্সট টেমপ্লেট নির্বাচন করুন:</label>
              <select 
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold outline-none focus:border-purple-600"
              >
                <option value="abandoned_recovery">🛒 অসম্পূর্ণ চেকআউট রিকভারি (১০% কুপন অফার)</option>
                <option value="free_delivery">🚚 আজ ফ্রি ডেলিভারি ধামাকা অফার</option>
                <option value="new_collection">👗 নতুন লাক্সারি থ্রি-পিস কালেকশন এরাইভাল</option>
                <option value="vip_thankyou">🎁 পুরাতন ক্রেতাদের বিশেষ ক্যাশব্যাক উপহার</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 block">কাস্টম মেসেজ কন্টেন্ট (বাংলা):</label>
              <textarea 
                value={customSmsText}
                onChange={(e) => setCustomSmsText(e.target.value)}
                rows={5}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-purple-600 resize-none leading-relaxed"
              />
              <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold">
                <span>{customSmsText.length} টি অক্ষর</span>
                <span>অটো ডায়নামিক ভেরিয়েবল: &#123;Name&#125;, &#123;DiscountCode&#125;</span>
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <button
                onClick={handleTriggerBulkSms}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30 hover:opacity-95 transition-all cursor-pointer"
              >
                <Smartphone size={16} />
                <span>সিলেক্টেড ({filteredLeads.length} জন) লিডকে বাল্ক এসএমএস পাঠান</span>
              </button>
            </div>
          </div>

          {/* Section 2: On-Site Returning Visitor Banner Controls */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <Sparkles size={18} className="text-amber-500" />
              <h2 className="text-base font-black">২. ওয়েবসাইট রিটার্গেটিং বেনার ও পপআপ</h2>
            </div>

            <div className="space-y-4">
              {/* Sticky Top Banner Toggle */}
              <div className="flex items-center justify-between bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200/60">
                <div>
                  <span className="text-xs font-black text-amber-900 block">টপ স্টিকি অফার বেনার</span>
                  <span className="text-[10px] text-amber-700">ওয়েবসাইটে আসা রিটার্নিং ভিজিটরদের দেখাবে</span>
                </div>
                <input 
                  type="checkbox"
                  checked={bannerEnabled}
                  onChange={(e) => setBannerEnabled(e.target.checked)}
                  className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
                />
              </div>

              {bannerEnabled && (
                <div className="space-y-3 pl-2 border-l-2 border-amber-400">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">বেনার টেক্সট (Bangla):</label>
                    <input 
                      type="text"
                      value={bannerText}
                      onChange={(e) => setBannerText(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs font-semibold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">কুপন কোড:</label>
                    <input 
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs font-bold uppercase outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Exit Intent Popup */}
              <div className="flex items-center justify-between bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-200/60">
                <div>
                  <span className="text-xs font-black text-indigo-900 block">এক্সিট-ইন্টেন্ট রিকভারি পপআপ</span>
                  <span className="text-[10px] text-indigo-700">কাস্টমার ওয়েবসাইট ছেড়ে যাওয়ার সময় পপআপ শো করবে</span>
                </div>
                <input 
                  type="checkbox"
                  checked={popupEnabled}
                  onChange={(e) => setPopupEnabled(e.target.checked)}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              {popupEnabled && (
                <div className="space-y-3 pl-2 border-l-2 border-indigo-400">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">পপআপ অফার টেক্সট:</label>
                    <input 
                      type="text"
                      value={popupOfferText}
                      onChange={(e) => setPopupOfferText(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs font-semibold outline-none"
                    />
                  </div>
                </div>
              )}

              {saveSuccessMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              <button
                onClick={handleSaveRetargetingSettings}
                disabled={isSavingSettings}
                className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingSettings ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                <span>অনসাইট সেটিং সেভ করুন</span>
              </button>
            </div>
          </div>

        </div>

        {/* Right 2 Columns: Live Audience Leads Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            
            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-base font-black">৩. সংরক্ষিত কাস্টমার লিড ও কন্টাক্ট ডাটাবেস</h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">মোট নির্বাচিত লিড: <span className="font-extrabold text-purple-600">{filteredLeads.length} জন</span></p>
              </div>

              {/* Search Field */}
              <div className="relative w-full sm:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text"
                  placeholder="নাম বা মোবাইল নম্বর খুঁজুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-purple-600"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => setSelectedCohort('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  selectedCohort === 'all' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                সকল লিড ({totalLeadsCount})
              </button>
              <button
                onClick={() => setSelectedCohort('abandoned_checkout')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  selectedCohort === 'abandoned_checkout' ? 'bg-rose-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🛒 অসম্পূর্ণ চেকআউট ({abandonedCount})
              </button>
              <button
                onClick={() => setSelectedCohort('spin_lead')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  selectedCohort === 'spin_lead' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🎡 স্পিন বিজয়ী ({spinLeadCount})
              </button>
              <button
                onClick={() => setSelectedCohort('past_customer')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  selectedCohort === 'past_customer' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                📦 পুরাতন ক্রেতা ({pastCustomerCount})
              </button>
            </div>

            {/* Leads Table */}
            {filteredLeads.length === 0 ? (
              <div className="py-16 text-center text-gray-400 space-y-3">
                <Users size={36} className="mx-auto opacity-30" />
                <p className="text-sm font-bold">কোনো মিল থাকা কাস্টমার লিড পাওয়া যায়নি!</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black uppercase tracking-wider text-gray-500">
                      <th className="py-3 px-4">কাস্টমার তথ্য</th>
                      <th className="py-3 px-4">মোবাইল নম্বর</th>
                      <th className="py-3 px-4">কোহোর্ট ও ইন্টারেস্ট</th>
                      <th className="py-3 px-4">অবস্থান / জেলা</th>
                      <th className="py-3 px-4 text-right">সরাসরি অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-purple-50/30 transition-colors">
                        
                        {/* Name & Time */}
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-gray-900">{lead.name}</div>
                          <div className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mt-0.5">
                            <Clock size={10} />
                            <span>{new Date(lead.lastActive).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ({new Date(lead.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                            {lead.mobileNumber}
                          </span>
                        </td>

                        {/* Cohort & Product */}
                        <td className="py-3.5 px-4 space-y-1">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            lead.cohort === 'abandoned_checkout' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                            lead.cohort === 'spin_lead' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                            'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}>
                            {lead.cohortLabel}
                          </span>
                          {lead.lastViewedProduct && (
                            <p className="text-[10px] font-semibold text-gray-600 truncate max-w-[180px]">
                              পছন্দ: {lead.lastViewedProduct}
                            </p>
                          )}
                          {lead.wonCouponCode && (
                            <p className="text-[9px] text-emerald-600 font-bold">
                              কুপন: {lead.wonCouponCode} ({lead.wonCouponDiscount}% অফ)
                            </p>
                          )}
                        </td>

                        {/* Location */}
                        <td className="py-3.5 px-4 text-gray-600 font-medium text-xs">
                          {lead.district || 'ঢাকা'}
                          {lead.upazila ? `, ${lead.upazila}` : ''}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* WhatsApp Direct Chat Button */}
                            <a 
                              href={getWhatsAppLink(lead)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-sm transition-all"
                              title="হোয়াটসঅ্যাপে ১-ক্লিকে বার্তা পাঠান"
                            >
                              <MessageSquare size={14} />
                            </a>

                            {/* SMS Single Launcher */}
                            <button
                              onClick={() => onOpenSmsModal && onOpenSmsModal([lead.mobileNumber], customSmsText.replace('{Name}', lead.name))}
                              className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-sm transition-all cursor-pointer"
                              title="এসএমএস পাঠান"
                            >
                              <Smartphone size={14} />
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}
