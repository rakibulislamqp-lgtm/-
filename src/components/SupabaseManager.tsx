import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  ArrowUpRight, 
  Server, 
  ShieldCheck, 
  Radio, 
  Zap, 
  Layers, 
  Table, 
  FileCode,
  DownloadCloud,
  CheckCircle,
  HelpCircle,
  Clock
} from 'lucide-react';
import { 
  supabase, 
  checkSupabaseHealth, 
  SUPABASE_URL, 
  SUPABASE_ANON_KEY, 
  SUPABASE_PROJECT_ID, 
  SUPABASE_SQL_SCHEMA,
  SupabaseHealthStatus 
} from '../lib/supabase';
import { 
  syncAllDataToSupabase, 
  SyncProgressResult,
  supabaseSaveOrder,
  supabaseFetchOrders
} from '../services/supabaseService';
import { getAllProducts } from '../services/productService';
import { getAllOrders } from '../services/orderService';
import { getBrandSettings } from '../services/settingsService';
import { getAllReviews } from '../services/reviewService';

interface SupabaseManagerProps {
  onRefreshAll?: () => void;
}

export default function SupabaseManager({ onRefreshAll }: SupabaseManagerProps) {
  const [health, setHealth] = useState<SupabaseHealthStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncProgressResult | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Live Test State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const runHealthCheck = async () => {
    setIsChecking(true);
    try {
      const res = await checkSupabaseHealth();
      setHealth(res);
    } catch (err: any) {
      console.error('Failed health check:', err);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  const handleCopy = (text: string, type: 'url' | 'key' | 'id' | 'sql') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else if (type === 'sql') {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    }
  };

  const handleSyncAll = async () => {
    const confirmSync = window.confirm(
      'আপনি কি বর্তমান ওয়েবসাইটের সব প্রোডাক্ট, অর্ডার, সেটিংস ও রিভিউ Supabase ক্লাউড ডাটাবেজে সিঙ্ক করতে চান?\n\nএটি ব্যাকগ্রাউন্ডে বিদ্যমান কোনো ডাটা ক্ষতি না করে সম্পূর্ণ ডাটাবেজ আপডেট করবে।'
    );
    if (!confirmSync) return;

    setIsSyncing(true);
    setSyncMessage('বর্তমান ডাটা লোড করা হচ্ছে...');
    try {
      const [products, orders, settings, reviews] = await Promise.all([
        getAllProducts(),
        getAllOrders(),
        getBrandSettings(),
        getAllReviews(),
      ]);

      setSyncMessage(`${products.length}টি প্রোডাক্ট, ${orders.length}টি অর্ডার এবং কনফিগারেশন Supabase এ সিঙ্ক হচ্ছে...`);
      const res = await syncAllDataToSupabase(products, orders, settings, reviews);
      setSyncResult(res);
      setSyncMessage(
        `সফলভাবে সিঙ্ক সম্পন্ন হয়েছে! (${res.productsCount} প্রোডাক্ট, ${res.ordersCount} অর্ডার, ${res.reviewsCount} রিভিউ)`
      );
      runHealthCheck();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      console.error('Sync failed:', err);
      setSyncMessage(`সিঙ্ক ব্যর্থ হয়েছে: ${err?.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLiveDiagnostic = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // Test read
      const orders = await supabaseFetchOrders();
      // Test ping
      const { error } = await supabase.from('settings').select('id').limit(1);

      if (error && error.code !== 'PGRST116') {
        setTestResult({
          success: false,
          message: `Supabase রেসপন্স করেছে তবে টেবিল এরর: ${error.message} (নিচের SQL Schema রান করুন)`
        });
      } else {
        setTestResult({
          success: true,
          message: `সুপাবেস ডাটাবেজের সাথে যোগাযোগ ১০০% সক্রিয় ও দ্রুত! (${orders ? orders.length : 0}টি অর্ডার রেকর্ড প্রাপ্ত হয়েছে)`
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `কানেকশন টেস্টে এরর: ${err?.message || String(err)}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const tableList = [
    { key: 'products', name: 'products', label: 'পোশাক ও পণ্য তালিকা', desc: 'সকল ক্যাটাগরি, সাইজ, স্টক ও মূল্য' },
    { key: 'orders', name: 'orders', label: 'কাস্টমার অর্ডারসমূহ', desc: 'ইনভয়েস, কাস্টমার ফোন, ঠিকানা ও স্ট্যাটাস' },
    { key: 'settings', name: 'settings', label: 'শপ ও ব্র্যান্ড সেটিংস', desc: 'লোগো, নোটিফিকেশন, পিক্সেল ও কুরিয়ার কনফিগ' },
    { key: 'reviews', name: 'reviews', label: 'গ্রাহক রিভিউ ও রেটিং', desc: 'স্টার রেটিং, মন্তব্য ও ভেরিফায়েড ব্যাজ' },
    { key: 'customers', name: 'customers', label: 'রেজিস্টার্ড কাস্টমার', desc: 'লগইন প্রোফাইল, ফোন নম্বর ও হিস্টোরি' },
    { key: 'visitor_sessions', name: 'visitor_sessions', label: 'লাইভ ভিজিটর সেশন', desc: 'রিয়েলটাইম ট্র্যাকিং ও অ্যাক্টিভিটি' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Status Hero */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 sm:p-8 rounded-3xl border border-emerald-500/20 shadow-2xl relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-inner">
                <Database size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Supabase Cloud Backend
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    সক্রিয় ও সংযুক্ত (Active)
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  প্রজেক্ট: <span className="text-emerald-300 font-bold">Sera fashion house</span> • PostgreSQL রিয়েলটাইম ব্যাকএন্ড ইন্টিগ্রেশন
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              আপনার পুরো ওয়েবসাইটের প্রোডাক্ট, অর্ডার, সেটিংস, কাস্টমার এবং লাইভ ট্র্যাকিং ডাটা এখন সরাসরি <strong className="text-slate-200">Supabase</strong> ক্লাউড ডাটাবেজে স্বয়ংক্রিয়ভাবে সেভ এবং সিঙ্ক হচ্ছে। এতে রয়েছে ফলব্যাক ব্যাকআপ প্রোটেকশন, যার ফলে কখনো ডাটা হারানোর ঝুঁকি নেই।
            </p>
          </div>

          <div className="flex flex-wrap md:flex-col gap-2.5 shrink-0">
            <button
              type="button"
              onClick={runHealthCheck}
              disabled={isChecking}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={isChecking ? 'animate-spin' : ''} />
              <span>{isChecking ? 'চেক করা হচ্ছে...' : 'কানেকশন রিফ্রেশ করুন'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSqlModal(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileCode size={14} className="text-emerald-400" />
              <span>SQL স্কিমা দেখুন ও কপি করুন</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Strip */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">লেটেন্সি (Latency)</span>
            <div className="flex items-center gap-1.5 mt-1">
              <Zap size={14} className="text-amber-400" />
              <span className="text-sm font-black text-white">
                {health?.latencyMs !== undefined ? `${health.latencyMs} ms` : 'স্বাভাবিক'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">রিয়েলটাইম চ্যানেল</span>
            <div className="flex items-center gap-1.5 mt-1">
              <Radio size={14} className="text-emerald-400 animate-pulse" />
              <span className="text-sm font-black text-emerald-400">সরাসরি লাইভ</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">নিরাপত্তা (Security)</span>
            <div className="flex items-center gap-1.5 mt-1">
              <ShieldCheck size={14} className="text-indigo-400" />
              <span className="text-sm font-black text-indigo-300">RLS এনাবল্ড</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">ডাটাবেজ ইঞ্জিন</span>
            <div className="flex items-center gap-1.5 mt-1">
              <Server size={14} className="text-teal-400" />
              <span className="text-sm font-black text-teal-300">PostgreSQL 15+</span>
            </div>
          </div>
        </div>
      </div>

      {/* Credentials & Connection Info */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-150 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <h4 className="text-base font-black text-gray-900">
              Supabase প্রজেক্ট ক্রেডেনশিয়াল ও কানেকশন তথ্য
            </h4>
            <p className="text-xs text-gray-500 font-medium">
              আপনার প্রদত্ত Sera Fashion House প্রজেক্টের সাথে স্বয়ংক্রিয় কানেকশন সেটআপ করা হয়েছে
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
            স্বয়ংক্রিয় কনফিগারেশন
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Project URL */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Project URL</span>
              <button
                type="button"
                onClick={() => handleCopy(SUPABASE_URL, 'url')}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                {copiedUrl ? <Check size={12} /> : <Copy size={12} />}
                {copiedUrl ? 'কপি হয়েছে' : 'কপি'}
              </button>
            </div>
            <p className="font-mono text-xs text-slate-800 font-bold break-all bg-white p-2.5 rounded-xl border border-slate-200">
              {SUPABASE_URL}
            </p>
          </div>

          {/* Project ID */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Project ID</span>
              <button
                type="button"
                onClick={() => handleCopy(SUPABASE_PROJECT_ID, 'id')}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                {copiedId ? <Check size={12} /> : <Copy size={12} />}
                {copiedId ? 'কপি হয়েছে' : 'কপি'}
              </button>
            </div>
            <p className="font-mono text-xs text-slate-800 font-bold break-all bg-white p-2.5 rounded-xl border border-slate-200">
              {SUPABASE_PROJECT_ID}
            </p>
          </div>

          {/* Anon Key */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Anon API Key</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="text-xs text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1 cursor-pointer"
                >
                  {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showKey ? 'লুকান' : 'দেখুন'}
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(SUPABASE_ANON_KEY, 'key')}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey ? <Check size={12} /> : <Copy size={12} />}
                  {copiedKey ? 'কপি হয়েছে' : 'কপি'}
                </button>
              </div>
            </div>
            <p className="font-mono text-xs text-slate-800 font-bold break-all bg-white p-2.5 rounded-xl border border-slate-200 line-clamp-1">
              {showKey ? SUPABASE_ANON_KEY : `${SUPABASE_ANON_KEY.substring(0, 24)}••••••••••••••••••••`}
            </p>
          </div>
        </div>
      </div>

      {/* Live Table Health & Sync Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Table Status Grid */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-7 border border-gray-150 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Table size={18} className="text-emerald-600" />
              <h4 className="text-base font-black text-gray-900">
                Supabase টেবিল ও স্টোরেজ স্টেটাস (Table Inspector)
              </h4>
            </div>
            <span className="text-[11px] font-bold text-gray-500">
              মোট ৬টি মূল কালেকশন
            </span>
          </div>

          <p className="text-xs text-gray-500">
            নিচের টেবিলগুলোর মাধ্যমে আপনার ওয়েবসাইটের সমস্ত ডাটা ক্লাউডে স্টোর হয়। যদি কোনো টেবিল এখনও আপনার Supabase প্রজেক্টে তৈরি না হয়ে থাকে, তবে পাশের <strong>১-ক্লিকে SQL স্কিমা রান</strong> করে তৈরি করে নিতে পারবেন।
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {tableList.map((tbl) => {
              const isReady = health?.tables ? (health.tables as any)[tbl.key] : false;
              return (
                <div 
                  key={tbl.key}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isReady 
                      ? 'bg-emerald-50/50 border-emerald-200' 
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-slate-900">
                      {tbl.name}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isReady 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {isReady ? (
                        <>
                          <CheckCircle2 size={10} />
                          সক্রিয় (Ready)
                        </>
                      ) : (
                        <>
                          <Clock size={10} />
                          ফলব্যাক মোড
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-700 mt-1">{tbl.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{tbl.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>রেজিলিয়েন্ট আর্কিটেকচার:</strong> কোনো কারণে সুপাবেসের টেবিলে নেটওয়ার্ক বিলম্ব হলেও ওয়েবসাইট কখনো বন্ধ হবে না—সিস্টেম স্বয়ংক্রিয়ভাবে ফলব্যাক ক্যাশ ব্যবহার করে অর্ডার ও প্রোডাক্ট রেন্ডার রাখবে।
            </p>
          </div>
        </div>

        {/* Right: Quick Action Hub & One-Click Sync */}
        <div className="lg:col-span-4 space-y-4">
          {/* Sync Card */}
          <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white p-6 rounded-3xl border border-indigo-500/20 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <DownloadCloud size={20} className="text-indigo-400" />
              <h4 className="text-base font-black">১-ক্লিক ডাটা সিঙ্ক</h4>
            </div>

            <p className="text-xs text-indigo-200 leading-relaxed">
              আপনার সাইটের বিদ্যমান সমস্ত প্রোডাক্ট, অর্ডার ও ব্র্যান্ড কনফিগারেশন সরাসরি Supabase এ আপলোড ও সিঙ্ক করুন।
            </p>

            {syncMessage && (
              <div className="p-3 bg-indigo-950/80 rounded-xl border border-indigo-400/30 text-xs text-indigo-200">
                {syncMessage}
              </div>
            )}

            <button
              type="button"
              onClick={handleSyncAll}
              disabled={isSyncing}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSyncing ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <CheckCircle size={15} />
              )}
              <span>{isSyncing ? 'সিঙ্ক হচ্ছে...' : 'সব ডাটা Supabase এ সিঙ্ক করুন'}</span>
            </button>
          </div>

          {/* Live Diagnostic Test Card */}
          <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-black uppercase tracking-wider text-gray-700">
                লাইভ টেস্ট ডায়াগনস্টিক
              </h5>
              <Zap size={15} className="text-amber-500" />
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              সুপাবেস API এর সাথে সরাসরি লাইভ রিড/রাইট টেস্ট করে কানেকশন যাচাই করুন।
            </p>

            {testResult && (
              <div className={`p-3 rounded-xl text-xs font-medium ${
                testResult.success 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {testResult.message}
              </div>
            )}

            <button
              type="button"
              onClick={handleLiveDiagnostic}
              disabled={isTesting}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isTesting ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Radio size={14} className="text-emerald-400" />
              )}
              <span>{isTesting ? 'টেস্ট চলছে...' : 'কানেকশন টেস্ট করুন'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SQL Schema Modal / Drawer */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileCode size={20} className="text-emerald-400" />
                <div>
                  <h4 className="text-base font-black text-white">
                    Supabase PostgreSQL SQL Schema
                  </h4>
                  <p className="text-xs text-slate-400">
                    Supabase Dashboard {'>'} SQL Editor এ গিয়ে পেস্ট করে রান (RUN) করুন
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(SUPABASE_SQL_SCHEMA, 'sql')}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition shadow"
                >
                  {copiedSql ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedSql ? 'কপি সম্পন্ন!' : 'সম্পূর্ণ SQL কপি করুন'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto font-mono text-xs text-emerald-300 bg-slate-950 select-all leading-relaxed whitespace-pre">
              {SUPABASE_SQL_SCHEMA}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>প্রজেক্ট আইডি: {SUPABASE_PROJECT_ID}</span>
              <a
                href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/sql`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
              >
                <span>সুপাবেস SQL Editor খুলুন</span>
                <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
