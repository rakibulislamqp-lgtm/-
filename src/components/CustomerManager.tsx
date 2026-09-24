import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Sparkles, Send, MessageSquare, Phone, Search, 
  Download, Copy, Check, Filter, Trash2, ExternalLink, 
  ShoppingBag, ShieldCheck, AlertCircle, RefreshCw, 
  Megaphone, Plus, Tag, ArrowRight, Eye, Calendar, MapPin, 
  CheckCircle2, Flame, Gift, Star, Clock, UserCheck, ChevronRight
} from 'lucide-react';
import { CustomerUser, CustomerAnnouncement, Order, BrandSettings } from '../types';
import { 
  getAllRegisteredCustomers, deleteCustomerUser, 
  getAllCustomerAnnouncements, saveCustomerAnnouncement, 
  deleteCustomerAnnouncement, normalizeBanglaPhone 
} from '../services/customerAuthService';

interface CustomerManagerProps {
  orders: Order[];
  brandSettings: BrandSettings | null;
  onRefreshSettings?: () => void;
}

export default function CustomerManager({
  orders,
  brandSettings,
  onRefreshSettings
}: CustomerManagerProps) {
  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCohort, setSelectedCohort] = useState<'all' | 'zero_orders' | 'vip' | 'registered_only'>('all');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // AI Marketing Campaign Generator State
  const [campaignType, setCampaignType] = useState<string>('new_arrival');
  const [productName, setProductName] = useState('প্রিমিয়াম পাকিস্তানি আর্ট সিল্ক থ্রি-পিস ও জামদানি শাড়ি');
  const [offerDiscount, setOfferDiscount] = useState('১৫% ডিসকাউন্ট + ফ্রি ডেলিভারি');
  const [couponCode, setCouponCode] = useState('SERA15');
  const [customNotes, setCustomNotes] = useState('সীমিত স্টক, দ্রুত বুকিং করলে স্পেশাল গিফট');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [generatedMessages, setGeneratedMessages] = useState<string[]>([
    `🌸 প্রিয় {name}, আসসালামু আলাইকুম!\nসেরা ফ্যাশনে চলে এসেছে এক্সক্লুসিভ নতুন কালেকশন: "প্রিমিয়াম পাকিস্তানি আর্ট সিল্ক থ্রি-পিস"!\n✨ স্পেশাল উপহার: আজই অর্ডার করলে কুপন কোড [SERA15] ব্যবহারে উপভোগ করুন ১৫% ডিসকাউন্ট + ফ্রি ডেলিভারি!\n🛍️ এখনই দেখতে ও ক্যাশ অন ডেলিভারিতে অর্ডার করতে ভিজিট করুন: {link}`,
    `👗 প্রিয় {name}, আপনার পছন্দের সেরা কালেকশনে যুক্ত হয়েছে লেটেস্ট আকর্ষণীয় ডিজাইন!\nসীমিত স্টক, তাই এখনই আপনার পছন্দের রঙ ও সাইজ সিলেক্ট করুন।\n🎁 আপনার জন্য উপহার: কুপন [SERA15] ব্যবহারে সরাসরি ফ্রি ডেলিভারি।\n🚚 ঘরে বসে পার্সেল চেক করে পেমেন্ট করার সুবিধা: {link}`
  ]);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(0);

  // In-App Announcements State (Free Portal Broadcast)
  const [announcements, setAnnouncements] = useState<CustomerAnnouncement[]>([]);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [newAnnTitle, setNewAnnTitle] = useState('🌸 নতুন কালেকশন লঞ্চ স্পেশাল অফার!');
  const [newAnnMessage, setNewAnnMessage] = useState('আমাদের সকল রেজিস্টার্ড কাস্টমারদের জন্য যেকোনো পোশাকে থাকছে বিশেষ ১০% ছাড় ও ফ্রি ডেলিভারি!');
  const [newAnnCoupon, setNewAnnCoupon] = useState('SERA10');
  const [newAnnBadge, setNewAnnBadge] = useState('SPECIAL OFFER');
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);

  // Customer Detail / Orders Modal
  const [viewingCustomerOrders, setViewingCustomerOrders] = useState<{ customer: CustomerUser; orders: Order[] } | null>(null);

  // Quick Direct Marketing Action Target
  const [targetCustomer, setTargetCustomer] = useState<CustomerUser | null>(null);

  useEffect(() => {
    loadCustomersData();
    loadAnnouncementsData();
  }, []);

  const loadCustomersData = async () => {
    setLoading(true);
    try {
      const list = await getAllRegisteredCustomers();
      setCustomers(list);
    } catch (e) {
      console.warn('Failed to load customers:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadAnnouncementsData = async () => {
    try {
      const list = await getAllCustomerAnnouncements();
      setAnnouncements(list);
    } catch (e) {
      console.warn('Failed to load announcements:', e);
    }
  };

  // Map orders count and total spent for each customer
  const customerStatsMap = useMemo(() => {
    const stats = new Map<string, { orderCount: number; totalSpent: number; lastOrderDate: string; orders: Order[] }>();
    
    orders.forEach(order => {
      const cleanPhone = normalizeBanglaPhone(order.mobileNumber || '');
      if (!cleanPhone) return;
      
      const existing = stats.get(cleanPhone) || { orderCount: 0, totalSpent: 0, lastOrderDate: '', orders: [] };
      existing.orderCount += 1;
      existing.totalSpent += Number(order.totalAmount || 0);
      existing.orders.push(order);
      if (!existing.lastOrderDate || new Date(order.createdAt || 0) > new Date(existing.lastOrderDate)) {
        existing.lastOrderDate = order.createdAt || '';
      }
      stats.set(cleanPhone, existing);
    });

    return stats;
  }, [orders]);

  // Aggregate KPI metrics
  const totalRegistered = customers.length;
  const zeroOrderCustomers = customers.filter(c => {
    const stat = customerStatsMap.get(normalizeBanglaPhone(c.phone));
    return !stat || stat.orderCount === 0;
  });
  const buyerCustomers = customers.filter(c => {
    const stat = customerStatsMap.get(normalizeBanglaPhone(c.phone));
    return stat && stat.orderCount > 0;
  });
  const vipCustomers = customers.filter(c => {
    const stat = customerStatsMap.get(normalizeBanglaPhone(c.phone));
    return stat && stat.orderCount >= 2;
  });

  const totalRegisteredRevenue = useMemo(() => {
    let sum = 0;
    customers.forEach(c => {
      const stat = customerStatsMap.get(normalizeBanglaPhone(c.phone));
      if (stat) sum += stat.totalSpent;
    });
    return sum;
  }, [customers, customerStatsMap]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const cleanPhone = normalizeBanglaPhone(c.phone);
      const stat = customerStatsMap.get(cleanPhone);
      const count = stat ? stat.orderCount : 0;

      // Filter by Cohort
      if (selectedCohort === 'zero_orders' && count > 0) return false;
      if (selectedCohort === 'vip' && count < 2) return false;
      if (selectedCohort === 'registered_only' && c.source === 'checkout_auto') return false;

      // Filter by Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (c.name || '').toLowerCase().includes(q);
        const matchesPhone = cleanPhone.includes(q) || (c.phone || '').includes(q);
        const matchesDistrict = (c.district || '').toLowerCase().includes(q);
        return matchesName || matchesPhone || matchesDistrict;
      }

      return true;
    });
  }, [customers, selectedCohort, searchQuery, customerStatsMap]);

  // Generate AI Marketing Copy
  const handleGenerateAIMarketing = async () => {
    setIsGeneratingAI(true);
    try {
      const res = await fetch('/api/ai/marketing-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignType,
          productName,
          discount: offerDiscount,
          couponCode,
          shopName: brandSettings?.footer?.brandName || 'সেরা (Sera Fashion)',
          customNotes
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.messages) && data.messages.length > 0) {
          setGeneratedMessages(data.messages);
          setSelectedMessageIndex(0);
          return;
        }
      }
      throw new Error('API response invalid');
    } catch (err) {
      console.warn('AI Marketing generation note:', err);
      // Smart dynamic templates fallback
      const fallbackTemplates = [
        `🌸 প্রিয় {name}, আসসালামু আলাইকুম!\n${brandSettings?.footer?.brandName || 'সেরা (Sera Fashion House)'}-এ চলে এসেছে এক্সক্লুসিভ নতুন কালেকশন: "${productName}"! নিখুঁত ফিনিশিং ও প্রিমিয়াম ডিজাইনে নিজেকে সাজিয়ে নিন।\n✨ স্পেশাল অফার: আজই অর্ডার করলে কুপন কোড [${couponCode}] দিয়ে উপভোগ করুন বিশেষ ছাড়!\n🛍️ কালেকশন দেখতে ও অর্ডার করতে ভিজিট করুন: {link}`,
        `👗 প্রিয় {name}, আপনার পছন্দের সেরা কালেকশনে যুক্ত হয়েছে লেটেস্ট "${productName}"!\nসীমিত স্টক, তাই পছন্দ হলে এখনই অর্ডার কনফার্ম করে রাখুন।\n🎁 আপনার জন্য উপহার: কুপন [${couponCode}] ব্যবহার করলেই পাচ্ছেন ${offerDiscount}!\n🚚 সারা দেশে ক্যাশ অন ডেলিভারি। ভিজিট করুন: {link}`,
        `✨ হ্যালো {name}! ট্রেন্ডি ও মার্জিত ফ্যাশনে আপনাকে স্বাগতম।\nআমাদের নতুন লঞ্চ হওয়া "${productName}" এখন লাইভ! সেরা কোয়ালিটির নিশ্চয়তা।\n🔥 অফার কোড: ${couponCode}\n👉 এখনই দেখতে ক্লিক করুন: {link}`
      ];
      setGeneratedMessages(fallbackTemplates);
      setSelectedMessageIndex(0);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Helper to compile message with customer variables
  const compileMessage = (template: string, customerName?: string) => {
    const storeUrl = window.location.origin;
    const name = customerName && customerName !== 'সম্মানিত কাস্টমার' ? customerName : 'সম্মানিত গ্রাহক';
    return template
      .replace(/{name}/g, name)
      .replace(/{link}/g, storeUrl)
      .replace(/{coupon}/g, couponCode);
  };

  // 1-Click WhatsApp Direct Link
  const getWhatsAppLink = (phone: string, customerName?: string) => {
    const cleanPhone = normalizeBanglaPhone(phone);
    const internationalPhone = cleanPhone.startsWith('0') ? '88' + cleanPhone : cleanPhone.startsWith('88') ? cleanPhone : '880' + cleanPhone;
    const activeMsgTemplate = generatedMessages[selectedMessageIndex] || generatedMessages[0] || '';
    const text = compileMessage(activeMsgTemplate, customerName);
    return `https://wa.me/${internationalPhone}?text=${encodeURIComponent(text)}`;
  };

  // 1-Click Free Native SMS Link (zero-cost on mobile with SMS pack)
  const getNativeSmsLink = (phone: string, customerName?: string) => {
    const cleanPhone = normalizeBanglaPhone(phone);
    const activeMsgTemplate = generatedMessages[selectedMessageIndex] || generatedMessages[0] || '';
    const text = compileMessage(activeMsgTemplate, customerName);
    return `sms:${cleanPhone}?body=${encodeURIComponent(text)}`;
  };

  // Copy text to clipboard
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Copy all phone numbers for WhatsApp Business Broadcast list
  const handleCopyAllPhones = () => {
    const phoneList = filteredCustomers
      .map(c => normalizeBanglaPhone(c.phone))
      .filter(p => p.length >= 10)
      .join('\n');
    navigator.clipboard.writeText(phoneList);
    setCopiedText('all_phones');
    setTimeout(() => setCopiedText(null), 3000);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['কাস্টমার নাম', 'ফোন নম্বর', 'রেজিস্ট্রেশন তারিখ', 'মোট অর্ডার', 'মোট ক্রয়মূল্য (৳)', 'জেলা', 'উপজেলা'];
    const rows = filteredCustomers.map(c => {
      const cleanPhone = normalizeBanglaPhone(c.phone);
      const stat = customerStatsMap.get(cleanPhone);
      return [
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${cleanPhone}"`,
        `"${new Date(c.createdAt || '').toLocaleDateString('bn-BD')}"`,
        stat ? stat.orderCount : 0,
        stat ? stat.totalSpent : 0,
        `"${c.district || 'ঢাকা'}"`,
        `"${c.upazila || ''}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SERA_CUSTOMERS_LIST_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Delete Customer
  const handleDelete = async (c: CustomerUser) => {
    const cleanPhone = normalizeBanglaPhone(c.phone);
    const orderCount = customerStatsMap.get(cleanPhone)?.orderCount || 0;
    const confirmMsg = orderCount > 0
      ? `আপনি কি সত্যিই কাস্টমার "${c.name}" (${c.phone}) এবং তার সংশ্লিষ্ট সকল রেকর্ড ড্যাশবোর্ড থেকে স্থায়ীভাবে মুছে ফেলতে চান?`
      : `আপনি কি সত্যিই কাস্টমার "${c.name}" (${c.phone}) কে তালিকা থেকে মুছে ফেলতে চান?`;
    if (!window.confirm(confirmMsg)) {
      return;
    }
    const ok = await deleteCustomerUser(c.id, c.phone, true);
    if (ok) {
      setCustomers(prev => prev.filter(x => x.id !== c.id && normalizeBanglaPhone(x.phone) !== cleanPhone));
      window.dispatchEvent(new Event('local_orders_updated'));
    }
  };

  // Save new Announcement / In-App Offer
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnMessage.trim()) return;

    setIsSavingAnnouncement(true);
    const newAnn: CustomerAnnouncement = {
      id: `ann-${Date.now()}`,
      title: newAnnTitle.trim(),
      message: newAnnMessage.trim(),
      couponCode: newAnnCoupon.trim().toUpperCase(),
      badge: newAnnBadge.trim().toUpperCase(),
      isActive: true,
      createdAt: new Date().toISOString()
    };

    const ok = await saveCustomerAnnouncement(newAnn);
    if (ok) {
      setAnnouncements(prev => [newAnn, ...prev.filter(a => a.id !== newAnn.id)]);
      setIsAnnouncementModalOpen(false);
      setNewAnnTitle('');
      setNewAnnMessage('');
    }
    setIsSavingAnnouncement(false);
  };

  const handleToggleAnnouncement = async (ann: CustomerAnnouncement) => {
    const updated = { ...ann, isActive: !ann.isActive, updatedAt: new Date().toISOString() };
    const ok = await saveCustomerAnnouncement(updated);
    if (ok) {
      setAnnouncements(prev => prev.map(a => a.id === ann.id ? updated : a));
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm('আপনি কি এই অফার নোটিশটি মুছে ফেলতে চান?')) return;
    const ok = await deleteCustomerAnnouncement(id);
    if (ok) {
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Header Banner & Intro */}
      <div className="bg-gradient-to-r from-[#1a1c2e] via-[#242942] to-[#1a1c2e] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-white/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
              <Sparkles size={13} className="animate-spin text-rose-400" />
              স্মার্ট কাস্টমার ডিরেক্টরি ও ১০০% ফ্রি মার্কেটিং হাব
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              রেজিস্টার্ড কাস্টমার তালিকা ও এআই মার্কেটিং
            </h2>
            <p className="text-gray-300 text-xs sm:text-sm max-w-2xl font-medium leading-relaxed">
              আপনার ওয়েবসাইটে রেজিস্ট্রেশন করা সকল সম্মানিত গ্রাহকদের তালিকা দেখুন। কোনো অতিরিক্ত খরচ ছাড়া হোয়াটসঅ্যাপ, ফ্রি এসএমএস ও কাস্টমার পোর্টালে এআই-এর মাধ্যমে আকর্ষণীয় অফার পাঠান।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsAnnouncementModalOpen(true)}
              className="px-4 py-3 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-rose-900/30 transition-all cursor-pointer"
            >
              <Megaphone size={16} />
              পোর্টালে ফ্রি অফার প্রচার করুন
            </button>
            <button
              onClick={loadCustomersData}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all"
              title="রিফ্রেশ করুন"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/2 -top-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 2. Key Metrics Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">মোট কাস্টমার</span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tabular-nums">{totalRegistered}</h3>
            <p className="text-[11px] font-bold text-gray-400 mt-1">রেজিস্টার্ড ও ভেরিফাইড গ্রাহক</p>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">গরম লিড (০ অর্ডার)</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Flame size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-amber-600 tabular-nums">{zeroOrderCustomers.length}</h3>
            <p className="text-[11px] font-bold text-gray-400 mt-1">মার্কেটিং করে অর্ডার আনার সুযোগ</p>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">সক্রিয় ক্রেতা</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <UserCheck size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 tabular-nums">{buyerCustomers.length}</h3>
            <p className="text-[11px] font-bold text-gray-400 mt-1">{vipCustomers.length} জন ভিআইপি রিপিট গ্রাহক</p>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">লাইফটাইম সেলস</span>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-rose-900 tabular-nums">৳ {totalRegisteredRevenue.toLocaleString('bn-BD')}</h3>
            <p className="text-[11px] font-bold text-gray-400 mt-1">রেজিস্টার্ড কাস্টমারদের ক্রয়</p>
          </div>
        </div>
      </div>

      {/* 3. AI Marketing Generator Studio */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-gray-900 to-[#1a1c2e] p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-400 to-rose-500 rounded-2xl text-white shadow-md">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">আধুনিক এআই ফ্রি মার্কেটিং মেসেজ জেনারেটর</h3>
              <p className="text-xs text-gray-300 font-medium">নতুন পোশাক বা অফার আসলে কৃত্রিম বুদ্ধিমত্তা দিয়ে আকর্ষণীয় বার্তা বানিয়ে গ্রাহকদের পাঠান</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[11px] font-bold">
            <CheckCircle2 size={13} /> ১০০% ফ্রি মার্কেটিং (হোয়াটসঅ্যাপ ও এসএমএস)
          </span>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Form */}
          <div className="lg:col-span-5 space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1.5">
                ক্যাম্পেইনের উদ্দেশ্য (Campaign Theme)
              </label>
              <select
                value={campaignType}
                onChange={(e) => setCampaignType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none"
              >
                <option value="new_arrival">🌸 নতুন কালেকশন বা প্রোডাক্ট লঞ্চ (New Arrival)</option>
                <option value="flash_sale">🔥 ধামাকা ফ্ল্যাশ সেল ও ডিসকাউন্ট (Flash Sale)</option>
                <option value="free_delivery">🚚 সারা দেশে ফ্রি হোম ডেলিভারি অফার (Free Delivery)</option>
                <option value="reactivation">🎁 প্রথম অর্ডারে ওয়েলকাম গিফট (First Purchase Gift)</option>
                <option value="vip_special">👑 ভিআইপি গ্রাহক স্পেশাল রিওয়ার্ড (VIP Loyalty)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1.5">
                পোশাক / কালেকশনের নাম
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="যেমন: প্রিমিয়াম পাকিস্তানি লন বা জামদানি শাড়ি"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-700 mb-1.5">
                  অফার / ডিসকাউন্ট
                </label>
                <input
                  type="text"
                  value={offerDiscount}
                  onChange={(e) => setOfferDiscount(e.target.value)}
                  placeholder="যেমন: ১৫% ডিসকাউন্ট"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-700 mb-1.5">
                  কুপন কোড
                </label>
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="যেমন: SERA15"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase text-gray-800 focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-gray-700 mb-1.5">
                বিশেষ কোনো নোট বা সুবিধা
              </label>
              <input
                type="text"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="যেমন: ক্যাশ অন ডেলিভারি, পার্সেল চেক করে পেমেন্ট"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none"
              />
            </div>

            <button
              onClick={handleGenerateAIMarketing}
              disabled={isGeneratingAI}
              className="w-full py-3.5 bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-900/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={16} className={isGeneratingAI ? 'animate-spin' : ''} />
              {isGeneratingAI ? 'এআই দিয়ে বার্তা তৈরি হচ্ছে...' : '✨ জেনারেট করুন এআই মেসেজ (Generate)'}
            </button>
          </div>

          {/* Generated Previews & Quick Action Bar */}
          <div className="lg:col-span-7 bg-gray-50 p-5 rounded-2xl border border-gray-200/80 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-rose-600" />
                  তৈরিকৃত এআই মেসেজ ভ্যারিয়েশন ({generatedMessages.length})
                </span>
                <div className="flex items-center gap-1">
                  {generatedMessages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedMessageIndex(idx)}
                      className={`w-7 h-7 rounded-lg text-xs font-black transition-all ${
                        selectedMessageIndex === idx
                          ? 'bg-rose-600 text-white shadow-md'
                          : 'bg-white text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Box */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 text-gray-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-inner min-h-[140px] font-medium">
                {compileMessage(generatedMessages[selectedMessageIndex] || '', 'সম্মানিত কাস্টমার')}
              </div>

              <div className="mt-2 text-[10px] text-gray-400 font-medium">
                * বার্তা পাঠানোর সময় <span className="font-bold text-gray-600">{'{name}'}</span> কাস্টমারের আসল নাম এবং <span className="font-bold text-gray-600">{'{link}'}</span> আপনার শপ লিংকে স্বয়ংক্রিয়ভাবে পরিবর্তিত হবে।
              </div>
            </div>

            {/* Actions for this message */}
            <div className="pt-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(compileMessage(generatedMessages[selectedMessageIndex] || ''), 'active_msg')}
                  className="px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  {copiedText === 'active_msg' ? (
                    <>
                      <Check size={14} className="text-emerald-600" />
                      কপি হয়েছে!
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      টেক্সট কপি
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    // Pre-fill announcement
                    setNewAnnTitle(`🌸 ${productName}`);
                    setNewAnnMessage(generatedMessages[selectedMessageIndex] || '');
                    setNewAnnCoupon(couponCode);
                    setIsAnnouncementModalOpen(true);
                  }}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Megaphone size={14} />
                  পোর্টালে নোটিশ দিন
                </button>
              </div>

              <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={14} /> রেডি ফর হোয়াটসঅ্যাপ ও ফ্রি এসএমএস
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Active In-App Announcements Section */}
      {announcements.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500 text-white rounded-xl">
                <Megaphone size={16} />
              </div>
              <div>
                <h4 className="text-sm font-black text-gray-900">কাস্টমার পোর্টাল একটিভ ফ্রি নোটিশ (In-App Announcement)</h4>
                <p className="text-[11px] text-gray-500 font-medium">রেজিস্টার্ড কাস্টমাররা লগইন করলে তাদের ড্যাশবোর্ডে এই অফারটি দেখতে পাবেন</p>
              </div>
            </div>
            <button
              onClick={() => setIsAnnouncementModalOpen(true)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus size={14} /> নতুন নোটিশ
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {announcements.map((ann) => (
              <div 
                key={ann.id} 
                className={`p-4 rounded-2xl border transition-all ${
                  ann.isActive ? 'bg-white border-amber-300 shadow-sm' : 'bg-gray-100/70 border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md text-[10px] font-black uppercase">
                        {ann.badge || 'OFFER'}
                      </span>
                      {ann.couponCode && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[10px] font-mono font-bold">
                          কুপন: {ann.couponCode}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${ann.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                        {ann.isActive ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Off)'}
                      </span>
                    </div>
                    <h5 className="text-xs font-black text-gray-900">{ann.title}</h5>
                    <p className="text-[11px] text-gray-600 line-clamp-2">{ann.message}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleAnnouncement(ann)}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                        ann.isActive ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                      title={ann.isActive ? 'বন্ধ করুন' : 'চালু করুন'}
                    >
                      {ann.isActive ? 'বন্ধ' : 'চালু'}
                    </button>
                    <button
                      onClick={() => handleDeleteAnnouncement(ann.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Registered Customers Directory & Table */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
        
        {/* Table Top Controls & Search */}
        <div className="p-6 border-b border-gray-100 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
                <Users size={18} className="text-rose-600" />
                রেজিস্টার্ড গ্রাহকদের পূর্ণাঙ্গ তালিকা
                <span className="text-xs font-bold text-gray-400">({filteredCustomers.length} জন দেখানো হচ্ছে)</span>
              </h3>
              <p className="text-xs text-gray-500 font-medium">যেকোনো গ্রাহকের সাথে সরাসরি হোয়াটসঅ্যাপ বা ফ্রি এসএমএসে যোগাযোগ করুন</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopyAllPhones}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title="হোয়াটসঅ্যাপ বিজনেস ব্রডকাস্টের জন্য সব ফোন নম্বর কপি করুন"
              >
                {copiedText === 'all_phones' ? <Check size={14} /> : <Copy size={14} />}
                {copiedText === 'all_phones' ? 'ফোন নম্বর কপি হয়েছে!' : 'সব নম্বর কপি (Broadcast)'}
              </button>

              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download size={14} />
                CSV ডাউনলোড
              </button>
            </div>
          </div>

          {/* Filter Cohorts & Search Input */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <button
                onClick={() => setSelectedCohort('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  selectedCohort === 'all'
                    ? 'bg-[#1a1c2e] text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                সব কাস্টমার ({customers.length})
              </button>
              <button
                onClick={() => setSelectedCohort('zero_orders')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  selectedCohort === 'zero_orders'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                গরম লিড / ০ অর্ডার ({zeroOrderCustomers.length})
              </button>
              <button
                onClick={() => setSelectedCohort('vip')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  selectedCohort === 'vip'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                👑 ভিআইপি গ্রাহক ({vipCustomers.length})
              </button>
              <button
                onClick={() => setSelectedCohort('registered_only')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  selectedCohort === 'registered_only'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                শুধুমাত্র ওয়েব রেজিস্ট্রেশন
              </button>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="নাম বা মোবাইল নম্বরে খুঁজুন..."
                className="w-full pl-9 pr-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none"
              />
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-400 uppercase tracking-widest text-[10px] font-black border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">গ্রাহকের নাম ও পরিচয়</th>
                <th className="px-6 py-4">মোবাইল নম্বর</th>
                <th className="px-6 py-4">অর্ডার হিস্টোরি</th>
                <th className="px-6 py-4">রেজিস্ট্রেশন তারিখ</th>
                <th className="px-6 py-4">লোকেশন</th>
                <th className="px-6 py-4 text-right">১-ক্লিক ফ্রি মার্কেটিং</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <Users size={36} className="mx-auto mb-2 opacity-40" />
                    <p className="font-bold text-sm text-gray-500">কোনো গ্রাহক পাওয়া যায়নি</p>
                    <p className="text-xs">নতুন কোনো গ্রাহক রেজিস্ট্রেশন করলে এখানে দেখতে পাবেন।</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const cleanPhone = normalizeBanglaPhone(c.phone);
                  const stat = customerStatsMap.get(cleanPhone) || { orderCount: 0, totalSpent: 0, lastOrderDate: '', orders: [] };
                  const isVip = stat.orderCount >= 2;
                  const isZeroOrder = stat.orderCount === 0;

                  return (
                    <tr key={c.id || cleanPhone} className="hover:bg-gray-50/60 transition-colors">
                      {/* Customer Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm uppercase shrink-0 ${
                            isVip ? 'bg-amber-100 text-amber-800' : 'bg-rose-50 text-rose-600'
                          }`}>
                            {(c.name || 'G')[0]}
                          </div>
                          <div>
                            <div className="font-black text-gray-900 flex items-center gap-1.5">
                              {c.name || 'সম্মানিত গ্রাহক'}
                              {isVip && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[9px] font-bold">
                                  👑 VIP
                                </span>
                              )}
                              {isZeroOrder && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded text-[9px] font-bold">
                                  হট লিড
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium">
                              ID: {c.id || 'N/A'} • {c.source === 'checkout_auto' ? 'অর্ডার থেকে সংগৃহীত' : 'রেজিস্টার্ড একাউন্ট'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-gray-800 tracking-wide text-xs">
                          {cleanPhone}
                        </span>
                      </td>

                      {/* Orders & Spent */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setViewingCustomerOrders({ customer: c, orders: stat.orders })}
                          className="text-left group cursor-pointer"
                        >
                          <div className="font-black text-gray-900 group-hover:text-rose-600 transition-colors flex items-center gap-1">
                            {stat.orderCount} টি অর্ডার
                            <ChevronRight size={13} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                          <div className="text-[11px] font-bold text-rose-600 tabular-nums">
                            ৳ {stat.totalSpent.toLocaleString('bn-BD')}
                          </div>
                        </button>
                      </td>

                      {/* Registered Date */}
                      <td className="px-6 py-4 text-gray-500 text-[11px]">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-gray-400" />
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString('bn-BD') : 'অজানা'}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-6 py-4 text-gray-500 text-[11px]">
                        <div className="flex items-center gap-1">
                          <MapPin size={12} className="text-gray-400" />
                          {c.district || c.address ? `${c.upazila ? c.upazila + ', ' : ''}${c.district || 'ঢাকা'}` : 'প্রযোজ্য নয়'}
                        </div>
                      </td>

                      {/* Quick 1-Click Marketing Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1-Click WhatsApp Direct */}
                          <a
                            href={getWhatsAppLink(c.phone, c.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded-xl transition-all shadow-sm"
                            title="হোয়াটসঅ্যাপে এআই অফার মেসেজ পাঠান"
                          >
                            <MessageSquare size={15} />
                          </a>

                          {/* 1-Click Free Native Device SMS */}
                          <a
                            href={getNativeSmsLink(c.phone, c.name)}
                            className="p-2 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
                            title="ডিভাইস ফ্রি এসএমএসে পাঠান"
                          >
                            <Send size={15} />
                          </a>

                          {/* Direct Phone Call */}
                          <a
                            href={`tel:${cleanPhone}`}
                            className="p-2 bg-gray-100 hover:bg-gray-800 text-gray-700 hover:text-white rounded-xl transition-all"
                            title="সরাসরি কল করুন"
                          >
                            <Phone size={15} />
                          </a>

                          {/* Delete Action */}
                          <button
                            onClick={() => handleDelete(c)}
                            className="p-2 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all ml-1"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 size={15} />
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

      {/* 6. Customer Past Orders Modal */}
      {viewingCustomerOrders && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-gray-100">
            <div className="p-6 bg-gradient-to-r from-gray-900 to-[#1a1c2e] text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-black flex items-center gap-2">
                  <ShoppingBag size={18} className="text-rose-500" />
                  {viewingCustomerOrders.customer.name} - অর্ডার হিস্টোরি
                </h3>
                <p className="text-xs text-gray-300 font-mono mt-0.5">{viewingCustomerOrders.customer.phone}</p>
              </div>
              <button
                onClick={() => setViewingCustomerOrders(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {viewingCustomerOrders.orders.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <ShoppingBag size={40} className="mx-auto mb-2 opacity-30" />
                  <p className="font-bold text-sm text-gray-600">কোনো সম্পন্ন অর্ডার পাওয়া যায়নি</p>
                  <p className="text-xs text-gray-400 mt-1">এই গ্রাহক এখনো কোনো অর্ডার প্লেস করেননি। এআই অফার পাঠিয়ে অর্ডার সংগ্রহ করুন!</p>
                </div>
              ) : (
                viewingCustomerOrders.orders.map((o) => (
                  <div key={o.orderId || o.id} className="p-4 rounded-2xl border border-gray-200 hover:border-rose-200 transition-all bg-gray-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-gray-900">
                        #{o.orderId}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        o.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' :
                        o.status === 'Cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {o.status || 'Pending'}
                      </span>
                    </div>

                    <div className="text-xs text-gray-700 font-medium">
                      পোশাক: <span className="font-bold">{o.productCode || 'N/A'}</span> ({o.category || 'Three Piece'})
                      {o.quantity ? ` • পরিমাণ: ${o.quantity} পিস` : ''}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-200/60">
                      <span className="text-gray-400 text-[11px]">
                        তারিখ: {new Date(o.createdAt || o.date || 0).toLocaleDateString('bn-BD')}
                      </span>
                      <span className="font-black text-rose-600">
                        ৳ {Number(o.totalAmount || 0).toLocaleString('bn-BD')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500">
                সর্বমোট: {viewingCustomerOrders.orders.length} টি অর্ডার
              </span>
              <button
                onClick={() => setViewingCustomerOrders(null)}
                className="px-5 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Create New In-App Announcement Modal */}
      {isAnnouncementModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl flex flex-col overflow-hidden border border-gray-100">
            <div className="p-6 bg-gradient-to-r from-rose-600 to-amber-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-black flex items-center gap-2">
                  <Megaphone size={18} />
                  পোর্টালে ফ্রি অফার নোটিশ প্রকাশ করুন
                </h3>
                <p className="text-xs text-rose-100">সকল রেজিস্টার্ড গ্রাহকদের পোর্টালে এই অফারটি প্রদর্শিত হবে</p>
              </div>
              <button
                onClick={() => setIsAnnouncementModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1.5">
                  নোটিশের শিরোনাম (Title)
                </label>
                <input
                  type="text"
                  value={newAnnTitle}
                  onChange={(e) => setNewAnnTitle(e.target.value)}
                  placeholder="যেমন: 🌸 নতুন কালেকশন লঞ্চ স্পেশাল অফার!"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1.5">
                  অফার বার্তা (Message)
                </label>
                <textarea
                  value={newAnnMessage}
                  onChange={(e) => setNewAnnMessage(e.target.value)}
                  rows={3}
                  placeholder="গ্রাহকদের জন্য বিস্তারিত অফার বিবরণ..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1.5">
                    কুপন কোড (যদি থাকে)
                  </label>
                  <input
                    type="text"
                    value={newAnnCoupon}
                    onChange={(e) => setNewAnnCoupon(e.target.value.toUpperCase())}
                    placeholder="যেমন: SERA10"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1.5">
                    অফার ব্যাজ (Badge)
                  </label>
                  <input
                    type="text"
                    value={newAnnBadge}
                    onChange={(e) => setNewAnnBadge(e.target.value)}
                    placeholder="যেমন: SPECIAL OFFER"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAnnouncementModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSavingAnnouncement}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Megaphone size={14} />
                  {isSavingAnnouncement ? 'সংরক্ষণ হচ্ছে...' : 'নোটিশ প্রচার করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
