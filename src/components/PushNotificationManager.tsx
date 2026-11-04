import React, { useState, useEffect } from 'react';
import { 
  Bell, BellRing, Smartphone, Send, Sparkles, Image as ImageIcon, 
  CheckCircle2, RefreshCw, AlertCircle, Trash2, ExternalLink, 
  ChevronRight, Users, Eye, Layers, Flame, ArrowUpRight, Copy, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PushCampaignPayload, 
  isPushSupported, 
  getNotificationPermission, 
  requestPushPermission, 
  showRichSystemNotification, 
  broadcastPushCampaign, 
  getCampaignHistory, 
  deletePushCampaign, 
  getSubscribersCount,
  registerCurrentDeviceSubscription
} from '../services/pushNotificationService';

interface PushNotificationManagerProps {
  onRefreshStats?: () => void;
}

export default function PushNotificationManager({ onRefreshStats }: PushNotificationManagerProps) {
  // Composer Form State
  const [title, setTitle] = useState('Small Details, Big Style 😍');
  const [body, setBody] = useState('কালকের ফ্যাশন কালেকশন চোখে লেগেছিল মনে আছে? 👀 এখনো আপনার অপেক্ষায়! আজই বিশেষ ছাড়ে লুফে নিন।');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=900&auto=format&fit=crop&q=80');
  const [targetUrl, setTargetUrl] = useState('/');
  const [targetAudience, setTargetAudience] = useState<'all' | 'past_buyers' | 'abandoned_cart'>('all');

  // Permission & Device Status
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribersCount, setSubscribersCount] = useState<number>(1);
  const [isSupported, setIsSupported] = useState(true);

  // UI state
  const [isSending, setIsSending] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [campaigns, setCampaigns] = useState<PushCampaignPayload[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(true);

  // Presets matching the user's screenshot and popular eCommerce use cases
  const PRESET_TEMPLATES = [
    {
      label: 'Small Details (স্ক্রিনশটের মতো)',
      title: 'Small Details, Big Style 😍',
      body: 'কালকের Mens & Women Fashion চোখে লেগেছিল মনে আছে? 👀 এখনো আপনার অপেক্ষায়! আজই লুফে নিন।',
      image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=900&auto=format&fit=crop&q=80',
      url: '/'
    },
    {
      label: '🔥 অফারের শেষ নেই (ডিসকাউন্ট)',
      title: '🔥 অফারের শেষ হয়েও শেষ নেই!',
      body: 'আজ রাত ১২টা পর্যন্ত ১০০/- ও ২০০/- টাকার ক্যাশ ভাউচার চলবে। ফ্রি ক্যাশ অন ডেলিভারিতে এখনই অর্ডার করুন!',
      image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=900&auto=format&fit=crop&q=80',
      url: '/'
    },
    {
      label: '🚚 ফ্রি ক্যাশ অন ডেলিভারি',
      title: '🚚 আজ সারা বাংলাদেশে সম্পূর্ণ ফ্রি ডেলিভারি!',
      body: 'কোনো অগ্রিম পেমেন্ট ছাড়াই সারা দেশে ক্যাশ অন ডেলিভারিতে অর্ডার করুন। সীমিত সময়ের সুযোগ!',
      image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=900&auto=format&fit=crop&q=80',
      url: '/'
    },
    {
      label: '🛍️ এক্সক্লুসিভ শাড়ি ও থ্রি-পিস',
      title: '👑 নতুন প্রিমিয়াম শাড়ি কালেকশন এখন লাইভ!',
      body: 'কাতান, সিল্ক ও জর্জেটের এক্সক্লুসিভ কালেকশনে বিশেষ ১৫% ছাড় চলছে। এখনই ভিজিট করুন।',
      image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=900&auto=format&fit=crop&q=80',
      url: '/'
    },
    {
      label: '🛒 কার্ট ড্রপ ও রিমাইন্ডার',
      title: '👀 আপনার পছন্দের পোশাকটি কার্টে অপেক্ষা করছে!',
      body: 'স্টক দ্রুত শেষ হয়ে যাচ্ছে! আপনার জন্য অতিরিক্ত ৫% ডিসকাউন্ট সংরক্ষিত রয়েছে। অর্ডার সম্পন্ন করুন।',
      image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&auto=format&fit=crop&q=80',
      url: '/'
    }
  ];

  // Quick banner presets
  const BANNER_PRESETS = [
    { label: 'প্রিমিয়াম শাড়ি', url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=900&auto=format&fit=crop&q=80' },
    { label: 'ফ্যাশন ওয়াচ', url: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=900&auto=format&fit=crop&q=80' },
    { label: 'মেগা ডিসকাউন্ট ব্যানার', url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=900&auto=format&fit=crop&q=80' },
    { label: 'ডিজাইনার থ্রি-পিস', url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=900&auto=format&fit=crop&q=80' }
  ];

  useEffect(() => {
    setIsSupported(isPushSupported());
    setPermission(getNotificationPermission());
    loadHistoryAndSubscribers();
  }, []);

  const formatSafeBengaliDate = (isoString?: string) => {
    if (!isoString) return 'সাম্প্রতিক';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return 'সাম্প্রতিক';
      return d.toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return 'সাম্প্রতিক';
    }
  };

  const loadHistoryAndSubscribers = async () => {
    setIsLoadingHistory(true);
    try {
      const hist = await getCampaignHistory().catch(() => []);
      const count = await getSubscribersCount().catch(() => 1);
      setCampaigns(hist || []);
      setSubscribersCount(count || 1);
    } catch (e) {
      console.warn('History load notice:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleRequestPermission = async () => {
    const res = await requestPushPermission();
    setPermission(res);
    if (res === 'granted') {
      await registerCurrentDeviceSubscription({ name: 'Admin Device' });
      setSuccessMessage('আপনার ব্রাউজার ও ডিভাইসে নোটিফিকেশন সফলভাবে চালু হয়েছে!');
      const count = await getSubscribersCount();
      setSubscribersCount(count);
      setTimeout(() => setSuccessMessage(''), 4000);
    } else {
      setErrorMessage('নোটিফিকেশনের অনুমতি দেওয়া হয়নি। অনুগ্রহ করে ব্রাউজার সেটিংস থেকে অনুমতি চালু করুন।');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  // Send Test Notification to Admin's own device
  const handleSendTestNotification = async () => {
    if (permission !== 'granted') {
      const res = await requestPushPermission();
      setPermission(res);
      if (res !== 'granted') {
        setErrorMessage('টেস্ট নোটিফিকেশন দেখার জন্য প্রথমে নোটিফিকেশনের অনুমতি দিন।');
        setTimeout(() => setErrorMessage(''), 4000);
        return;
      }
    }

    setIsTesting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const testPayload: PushCampaignPayload = {
        id: `test_${Date.now()}`,
        title: title || 'Small Details, Big Style 😍',
        body: body || 'কালকের ফ্যাশন কালেকশন চোখে লেগেছিল মনে আছে? 👀 এখনই দেখুন।',
        image: imageUrl || undefined,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        url: targetUrl || '/',
        createdAt: new Date().toISOString()
      };

      const shown = await showRichSystemNotification(testPayload);
      if (shown) {
        setSuccessMessage('🎉 আপনার ফোনে টেস্ট নোটিফিকেশন পাঠানো হয়েছে! ফোনের নোটিফিকেশন ড্রয়ার চেক করুন।');
      } else {
        setSuccessMessage('নোটিফিকেশন পাঠানো হয়েছে (ব্রাউজার ব্যাকগ্রাউন্ডে থাকলে নোটিফিকেশন সেন্টারে ড্রপ করবে)।');
      }
    } catch (e: any) {
      setErrorMessage(`টেস্ট নোটিফিকেশনে সমস্যা: ${e.message || 'Error'}`);
    } finally {
      setIsTesting(false);
      setTimeout(() => setSuccessMessage(''), 6000);
    }
  };

  // Broadcast to all customers
  const handleBroadcast = async () => {
    if (!title.trim() || !body.trim()) {
      setErrorMessage('অনুগ্রহ করে নোটিফিকেশনের শিরোনাম এবং বার্তা লিখুন।');
      setTimeout(() => setErrorMessage(''), 4000);
      return;
    }

    setIsSending(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await broadcastPushCampaign({
        title,
        body,
        image: imageUrl || undefined,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        url: targetUrl || '/',
        targetAudience
      });

      setSuccessMessage(`🚀 সফলভাবে ${result.sentCount} জন কাস্টমারের ডিভাইসে নোটিফিকেশন সম্প্রচার (Broadcast) করা হয়েছে!`);
      await loadHistoryAndSubscribers();
      if (onRefreshStats) onRefreshStats();
    } catch (e: any) {
      setErrorMessage(`নোটিফিকেশন পাঠাতে সমস্যা হয়েছে: ${e.message || 'Error'}`);
    } finally {
      setIsSending(false);
      setTimeout(() => setSuccessMessage(''), 6000);
    }
  };

  const handleDelete = async (id: string) => {
    await deletePushCampaign(id);
    setCampaigns(prev => prev.filter(c => c.id !== id));
  };

  const applyTemplate = (t: typeof PRESET_TEMPLATES[0]) => {
    setTitle(t.title);
    setBody(t.body);
    setImageUrl(t.image);
    setTargetUrl(t.url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-rose-500/20 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <BellRing size={12} className="animate-pulse" />
                মোবাইল রিচ পুশ ব্রডকাস্টার (RICH PUSH NOTIFICATION STUDIO)
              </span>
              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-full text-[10px] font-bold">
                অ্যান্ড্রয়েড নোটিফিকেশন ড্রয়ার সাপোর্ট 📲
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              কাস্টমারদের ফোনের নোটিফিকেশন সেন্টারে ব্যানারসহ অফার পাঠান
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              আপনার আপলোড করা স্ক্রিনশটের মতো ঠিক একইভাবে কাস্টমারের অ্যান্ড্রয়েড ও আইওএস ফোনের নোটিফিকেশন ড্রয়ারে বড় আকর্ষণীয় পোশাকের ব্যানার ছবি, বাংলা আকর্ষণীয় অফার টেক্সট ও কুপন কোড পৌঁছে যাবে।
            </p>
          </div>

          {/* Quick Stats & Permission Pill */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Users size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">মোট সাবস্ক্রাইবার ডিভাইস</span>
                  <span className="text-lg font-black text-white tabular-nums">{subscribersCount} জন গ্রাহক</span>
                </div>
              </div>
              <button 
                onClick={loadHistoryAndSubscribers} 
                className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
                title="রিফ্রেশ"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {/* Admin Device Status */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${permission === 'granted' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="text-slate-300 text-[11px] font-semibold">
                  {permission === 'granted' ? 'আমার ডিভাইসে নোটিফিকেশন সক্রিয়' : 'এই ফোনে অনুমতি দেওয়া হয়নি'}
                </span>
              </div>
              {permission !== 'granted' && (
                <button
                  onClick={handleRequestPermission}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  অনুমতি দিন
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-3"
          >
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
            <span>{successMessage}</span>
          </motion.div>
        )}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-3"
          >
            <AlertCircle size={18} className="text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: Composer on Left, Live Android Shade Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Composer & Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 p-6 md:p-8 shadow-sm space-y-6">
            
            {/* Presets Row */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                ১-ক্লিকে রেডিমেড অফার টেমপ্লেট নির্বাচন করুন (Quick Presets)
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyTemplate(tmpl)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-50 hover:bg-rose-50 hover:text-rose-600 border border-gray-200 transition-all text-gray-700 flex items-center gap-1.5"
                  >
                    <Sparkles size={11} className="text-rose-500" />
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Notification Title */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 inline-flex items-center justify-center text-[10px] font-black">১</span>
                  নোটিফিকেশন টাইটেল (Notification Title)
                </label>
                <span className="text-[10px] text-gray-400 font-bold">{title.length}/65 অক্ষর</span>
              </div>
              <input
                type="text"
                value={title}
                maxLength={65}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="যেমন: Small Details, Big Style 😍"
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all"
              />
            </div>

            {/* Bengali Body Text */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 inline-flex items-center justify-center text-[10px] font-black">২</span>
                  অফার বার্তা (Bengali Message Body)
                </label>
                <span className="text-[10px] text-gray-400 font-bold">{body.length}/180 অক্ষর</span>
              </div>
              <textarea
                rows={3}
                value={body}
                maxLength={180}
                onChange={(e) => setBody(e.target.value)}
                placeholder="কালকের Mens Fashion Watches চোখে লেগেছিল মনে আছে? 👀 এখনো অপেক্ষায়"
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all resize-none leading-relaxed"
              />
            </div>

            {/* Large Picture Banner URL (Screenshot-exact feature!) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 inline-flex items-center justify-center text-[10px] font-black">৩</span>
                  বড় ব্যানার ছবি (Large Expandable Picture Banner)
                </label>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                  অ্যান্ড্রয়েড ড্রয়ার ছবি ✨
                </span>
              </div>
              <p className="text-[11px] text-gray-500 leading-normal">
                কাস্টমারের মোবাইলের নোটিফিকেশন ড্রয়ারে বড় হয়ে যে ছবিটি প্রদর্শিত হবে (যেমন আপনার স্ক্রিনশটে ঘড়ির ছবি ছিল)।
              </p>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://... ছবির URL লিখুন"
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-mono text-gray-800 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all"
                />
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="p-3 bg-gray-100 hover:bg-gray-200 rounded-2xl text-gray-500 text-xs font-bold"
                  >
                    ক্লিয়ার
                  </button>
                )}
              </div>

              {/* Banner Presets */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] font-bold text-gray-400">নমুনা ছবি:</span>
                {BANNER_PRESETS.map((bp, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setImageUrl(bp.url)}
                    className="text-[10px] font-semibold bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-gray-600 px-2.5 py-1 rounded-lg transition-all"
                  >
                    {bp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Click Link & Audience Target */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-800 uppercase tracking-wider block">
                  ৪. ট্যাপ করলে কোথায় যাবে (Target Link)
                </label>
                <select
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="/">হোমপেইজ (Storefront Home)</option>
                  <option value="/#catalog">প্রোডাক্ট ক্যাটালগ (All Products)</option>
                  <option value="/offer">স্পেশাল অফার পেজ (/offer)</option>
                  <option value="/#spin-wheel">লাকি স্পিন হুইল ও গিফট</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-800 uppercase tracking-wider block">
                  ৫. টার্গেট অডিয়েন্স (Target Audience)
                </label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value as any)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="all">সমস্ত কাস্টমার (All Subscribed Devices)</option>
                  <option value="abandoned_cart">অসম্পূর্ণ চেকআউট ভিজিটর (Cart Drop)</option>
                  <option value="past_buyers">বিগত সফল ক্রেতাগণ (Past Buyers)</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={isTesting}
                onClick={handleSendTestNotification}
                className="flex-1 py-4 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
              >
                {isTesting ? (
                  <RefreshCw size={16} className="animate-spin text-rose-400" />
                ) : (
                  <Smartphone size={16} className="text-rose-400" />
                )}
                আমার ফোনে টেস্ট দেখুন (Send Test)
              </button>

              <button
                type="button"
                disabled={isSending}
                onClick={handleBroadcast}
                className="flex-[1.4] py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-rose-600/30 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
              >
                {isSending ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                কাস্টমারদের ফোনে নোটিফিকেশন পাঠান ({subscribersCount} জন)
              </button>
            </div>

          </div>
        </div>

        {/* Right: Live Android Notification Shade Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#121318] p-5 md:p-6 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-4 text-white">
            
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone size={16} className="text-rose-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                  কাস্টমারের ফোনে যেমন দেখা যাবে (Live Mockup)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewExpanded(!previewExpanded)}
                className="text-[10px] text-rose-400 hover:text-rose-300 font-bold"
              >
                {previewExpanded ? 'সংক্ষিপ্ত করুন' : 'বড় করুন'}
              </button>
            </div>

            {/* Android System Status Bar Simulation */}
            <div className="flex items-center justify-between px-3 text-[11px] font-sans text-slate-400 font-semibold select-none">
              <span>8:03 Sun, Nov 1</span>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="border border-slate-500 px-1 rounded text-[8px]">VoLTE</span>
                <span>📶</span>
                <span>98% 🔋</span>
              </div>
            </div>

            {/* ANDROID NOTIFICATION CARD (Exact replica of user screenshot!) */}
            <div className="bg-[#1e2029] hover:bg-[#252834] transition-all rounded-[1.8rem] p-4 border border-white/5 shadow-xl space-y-3">
              
              {/* App Brand Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center text-white shadow-sm shrink-0">
                    <span className="text-[10px] font-black">🛍️</span>
                  </div>
                  <span className="text-xs font-bold text-slate-300">Sera Fashion</span>
                  <span className="text-[10px] text-slate-500 font-medium">• এখনই</span>
                </div>
                <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-slate-400">
                  <span className="text-[9px]">⌃</span>
                </div>
              </div>

              {/* Title & Body with Optional Right Thumbnail */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <h4 className="text-sm font-black text-white leading-snug">
                    {title || 'Small Details, Big Style 😍'}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    {body || 'কালকের Mens Fashion Watches চোখে লেগেছিল মনে আছে? 👀 এখনো অপেক্ষায়'}
                  </p>
                </div>
                {imageUrl && (
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-white/10 shadow-sm">
                    <img 
                      src={imageUrl} 
                      alt="Thumbnail" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* EXPANDABLE LARGE BANNER PICTURE (The hallmark of the user's screenshot!) */}
              {previewExpanded && imageUrl && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="rounded-2xl overflow-hidden border border-white/10 shadow-lg relative bg-black/40"
                >
                  <img 
                    src={imageUrl} 
                    alt="Rich Push Banner" 
                    className="w-full aspect-[16/9] object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=900';
                    }}
                  />
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[9px] font-bold text-white flex items-center gap-1">
                    <Sparkles size={10} className="text-rose-400" />
                    <span>সেরা অফার</span>
                  </div>
                </motion.div>
              )}

              {/* Action Bar */}
              <div className="pt-1 flex items-center justify-between text-[11px] font-bold text-rose-400">
                <span className="flex items-center gap-1 hover:text-rose-300 cursor-pointer">
                  অফারটি দেখুন 🛍️
                  <ChevronRight size={13} />
                </span>
                <span className="text-[10px] text-slate-500 font-normal">Sera Fashion System</span>
              </div>

            </div>

            {/* Info hint */}
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-[11px] text-slate-400 leading-relaxed space-y-1">
              <p className="font-bold text-slate-300">💡 নোটিফিকেশন ডেলিভারি তথ্য:</p>
              <p>
                • কাস্টমার অ্যান্ড্রয়েড ফোন, ট্যাবলেট বা কম্পিউটারে গুগল ক্রোম / এজ ব্রাউজারে অনুমতি দিলে সরাসরি সিস্টেম ট্রে-তে এই ব্যানার নোটিফিকেশনটি পপ করবে।
              </p>
              <p>
                • নোটিফিকেশনে চাপ দিলে স্বয়ংক্রিয়ভাবে আপনার শপের টার্গেট পেজ খুলে যাবে।
              </p>
            </div>

          </div>
        </div>

      </div>

      {/* Past Notification Broadcast History */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900">পূর্বে পাঠানো পুশ নোটিফিকেশন হিস্টোরি</h3>
              <p className="text-xs text-gray-500 font-semibold">আপনার পূর্বের সকল ক্যাম্পেইন ও ব্রডকাস্ট রেকর্ড</p>
            </div>
          </div>
          <button
            onClick={loadHistoryAndSubscribers}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all"
          >
            <RefreshCw size={13} className={isLoadingHistory ? 'animate-spin' : ''} />
            রিফ্রেশ
          </button>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-xs font-bold space-y-2">
            <Bell size={32} className="mx-auto text-gray-300" />
            <p>এখনো কোনো পুশ নোটিফিকেশন পাঠানো হয়নি। উপরের ফর্ম থেকে প্রথম নোটিফিকেশন পাঠান!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((camp) => (
              <div 
                key={camp.id}
                className="bg-gray-50 hover:bg-gray-100/70 rounded-2xl p-4 border border-gray-200/80 flex flex-col justify-between gap-3 transition-all group"
              >
                <div className="space-y-2.5">
                  {camp.image && (
                    <div className="w-full aspect-[16/9] rounded-xl overflow-hidden bg-gray-200 border border-gray-200">
                      <img 
                        src={camp.image} 
                        alt="Campaign Banner" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] text-gray-400 font-mono block">
                      {formatSafeBengaliDate(camp.createdAt)}
                    </span>
                    <h5 className="text-xs font-black text-gray-900 mt-1 line-clamp-1">{camp.title}</h5>
                    <p className="text-[11px] text-gray-600 line-clamp-2 mt-0.5 leading-relaxed">{camp.body}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between text-xs font-bold">
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                    🚀 {camp.sentCount || 1} জনকে পাঠানো হয়েছে
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setTitle(camp.title);
                        setBody(camp.body);
                        if (camp.image) setImageUrl(camp.image);
                        if (camp.url) setTargetUrl(camp.url);
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      className="p-1.5 hover:bg-rose-50 text-gray-500 hover:text-rose-600 rounded-lg transition-all"
                      title="এই নোটিফিকেশন আবার লোড করুন"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(camp.id)}
                      className="p-1.5 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-lg transition-all"
                      title="মুছুন"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
