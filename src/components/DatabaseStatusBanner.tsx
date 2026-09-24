import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertTriangle, RefreshCw, Copy, Check, ExternalLink, ArrowUpRight, Download, Upload } from 'lucide-react';
import { checkFirestoreHealth, clearQuotaExhausted } from '../lib/firebase';
import { syncLocalProductsToCloud } from '../services/productService';
import { syncBrandSettingsToCloud, exportFullStoreData, importFullStoreData } from '../services/settingsService';
import { detectCPanelStorage, CPanelHealthInfo } from '../services/cpanelStorageService';

const RECOMMENDED_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;

export const DatabaseStatusBanner: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [health, setHealth] = useState<{
    status: 'checking' | 'healthy' | 'permission_denied' | 'quota_exhausted' | 'unreachable';
    projectId?: string;
    errorDetails?: string;
  }>({ status: 'checking' });
  const [copiedRules, setCopiedRules] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [cpanelInfo, setCpanelInfo] = useState<CPanelHealthInfo | null>(null);

  const runCheck = async () => {
    setHealth({ status: 'checking' });
    setSyncResult(null);

    // 1. Check if running on cPanel host
    try {
      const cpInfo = await detectCPanelStorage();
      if (cpInfo.isAvailable) {
        setCpanelInfo(cpInfo);
      }
    } catch (e) {}

    // 2. Check Firestore health
    clearQuotaExhausted();
    const result = await checkFirestoreHealth();

    let status: 'healthy' | 'permission_denied' | 'quota_exhausted' | 'unreachable' = 'healthy';
    if (result.canWrite) {
      status = 'healthy';
    } else if (result.errorCode === 'permission-denied' || String(result.errorMessage).includes('permission')) {
      status = 'permission_denied';
    } else if (result.errorCode === 'resource-exhausted') {
      status = 'quota_exhausted';
    } else {
      status = 'permission_denied';
    }

    setHealth({
      status,
      projectId: result.projectId,
      errorDetails: result.errorMessage
    });
  };

  useEffect(() => {
    runCheck();
  }, []);

  const handleCopyRules = () => {
    navigator.clipboard.writeText(RECOMMENDED_RULES);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 3000);
  };

  const handleSyncToCloud = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const [prodRes, settingsRes] = await Promise.all([
        syncLocalProductsToCloud(),
        syncBrandSettingsToCloud()
      ]);

      if (prodRes.success && settingsRes.success) {
        setSyncResult(`সফল! ${prodRes.syncedCount}টি প্রোডাক্ট ও সকল সেটিংস ক্লাউডে পার্মানেন্টলি সিঙ্ক হয়েছে।`);
        runCheck();
      } else {
        setSyncResult(`সিঙ্ক ত্রুটি: ${prodRes.error || settingsRes.error || 'ক্লাউড পারমিশন চেক করুন'}`);
      }
    } catch (e: any) {
      setSyncResult(`সিঙ্ক ব্যর্থ: ${e.message || String(e)}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleExportBackup = () => {
    try {
      const dataStr = exportFullStoreData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sera-store-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('ব্যাকআপ ডাউনলোড করতে সমস্যা হয়েছে।');
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const result = await importFullStoreData(text);
        alert(result.message);
        window.location.reload();
      } catch (err: any) {
        alert('ফাইল লোড করতে ব্যর্থ: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  if (isDismissed && (health.status === 'healthy' || cpanelInfo?.isAvailable)) {
    return null;
  }

  // 0. cPanel Host Mode (Active when hosted on cPanel)
  if (cpanelInfo && cpanelInfo.isAvailable) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-950 rounded-2xl p-3.5 px-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
          <div>
            <span className="font-bold flex items-center gap-1.5 text-blue-900">
              <CheckCircle2 size={16} className="text-blue-600" />
              cPanel সার্ভার স্টোরেজ সক্রিয় (Native Host Storage Active)
            </span>
            <p className="text-[11px] text-blue-700 mt-0.5">
              সমস্ত প্রোডাক্ট, ব্যানার, সেটিংস ও অর্ডার সরাসরি আপনার সিপ্যানেল সার্ভারে (<code className="bg-blue-100/80 px-1 py-0.5 rounded font-mono text-[10px]">public_html/api/data/</code>) পার্মানেন্টলি সেভ হচ্ছে।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncToCloud}
            disabled={syncing}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'সিঙ্ক হচ্ছে...' : 'ডাটা সিঙ্ক পুশ'}
          </button>
          <button
            onClick={handleExportBackup}
            className="px-2.5 py-1 bg-white border border-blue-200 text-blue-800 hover:bg-blue-100/50 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 shadow-sm"
          >
            <Download size={11} />
            ব্যাকআপ
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-blue-700 hover:text-blue-950 font-bold px-1 text-[11px]"
            title="লুকান"
          >
            ✕
          </button>
        </div>
        {syncResult && (
          <div className="w-full text-[11px] font-bold text-blue-800 bg-blue-100/80 p-1.5 rounded-lg px-2.5">
            {syncResult}
          </div>
        )}
      </div>
    );
  }

  // 1. Healthy State
  if (health.status === 'healthy') {
    return (
      <div className="bg-emerald-50/90 border border-emerald-200 text-emerald-900 rounded-2xl p-3.5 px-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold flex items-center gap-1.5">
            <CheckCircle2 size={16} className="text-emerald-600" />
            গুগল ফায়ারবেস ক্লাউড ডাটাবেস সম্পূর্ণ সক্রিয় (Cloud Persistence Active)
          </span>
          <span className="hidden sm:inline text-[11px] text-emerald-700">
            • আপনার সব এডিট, প্রোডাক্ট ও ব্যানার ক্লাউডে পার্মানেন্টলি সেভ হচ্ছে।
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncToCloud}
            disabled={syncing}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'সিঙ্ক হচ্ছে...' : 'এখনই সিঙ্ক পুশ করুন'}
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-emerald-700 hover:text-emerald-950 font-bold px-1 text-[11px]"
            title="লুকান"
          >
            ✕
          </button>
        </div>
        {syncResult && (
          <div className="w-full text-[11px] font-bold text-emerald-800 bg-emerald-100/80 p-1.5 rounded-lg px-2.5">
            {syncResult}
          </div>
        )}
      </div>
    );
  }

  // 2. Checking State
  if (health.status === 'checking') {
    return (
      <div className="bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl p-3 px-4 flex items-center gap-2 text-xs font-semibold">
        <RefreshCw size={14} className="animate-spin text-slate-500" />
        <span>গুগল ফায়ারবেস ক্লাউড ডাটাবেস কানেকশন যাচাই করা হচ্ছে...</span>
      </div>
    );
  }

  // 3. Permission Denied or Unreachable State (The root cause of data loss on reload)
  const isDenied = health.status === 'permission_denied';
  const consoleRulesUrl = `https://console.firebase.google.com/project/${health.projectId || 'rakib-8cc2a'}/firestore/rules`;

  return (
    <div className="bg-gradient-to-br from-amber-50 to-rose-50 border-2 border-rose-300 text-slate-900 rounded-3xl p-5 md:p-6 shadow-md space-y-4">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-rose-500 text-white rounded-2xl shadow-sm shrink-0 mt-0.5">
            <AlertTriangle size={22} />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-extrabold text-sm text-rose-950">
                {isDenied 
                  ? 'সতর্কতা: ফায়ারবেস ক্লাউড ডাটাবেসে সেভ হচ্ছে না (রিলোড দিলে ডাটা হারানোর কারণ)' 
                  : 'ক্লাউড ডাটাবেস কানেকশন ত্রুটি'}
              </h3>
              <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded-md uppercase tracking-wider">
                {health.status}
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              আপনার ফায়ারবেস প্রজেক্টের (<span className="font-mono font-bold text-rose-800">{health.projectId}</span>) Firestore Security Rules-এ লেখার অনুমতি (write access) বন্ধ রয়েছে।
              এর ফলে এডমিন ড্যাশবোর্ড থেকে কোনো তথ্য সেভ করলে তা ক্লাউডে সেভ না হয়ে শুধুমাত্র এই ব্রাউজারের সাময়িক মেমোরিতে (localStorage) থাকে।
              অন্য ব্রাউজার দিয়ে ঢুকলে বা গুগল ক্রোম রিলোড দিলে অথবা Netlify আপডেট হলে সেই এডিটগুলো পাওয়া যায় না।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
          <button
            onClick={runCheck}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <RefreshCw size={13} />
            পুনরায় টেস্ট
          </button>
        </div>
      </div>

      {/* Solutions and Quick Fix */}
      <div className="bg-white/90 border border-rose-200/80 rounded-2xl p-4 space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
          <span>⚡ ১ মিনিটে স্থায়ী সমাধান (Quick Fix):</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-800">
          <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100 flex flex-col justify-between space-y-2">
            <div>
              <span className="font-black text-rose-700 block mb-1">ধাপ ১: কনসোল ওপেন করুন</span>
              <p className="text-[11px] text-slate-600">নিচের বাটনে ক্লিক করে ফায়ারবেসের Rules পেজে যান:</p>
            </div>
            <a
              href={consoleRulesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-sm transition-colors"
            >
              ফায়ারবেস Rules পেজ খুলুন <ExternalLink size={12} />
            </a>
          </div>

          <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 flex flex-col justify-between space-y-2">
            <div>
              <span className="font-black text-amber-700 block mb-1">ধাপ ২: রুলস কোড কপি করুন</span>
              <p className="text-[11px] text-slate-600">নিচের কোডটি কপি করে ফায়ারবেসে পেস্ট করে 'Publish' দিন:</p>
            </div>
            <button
              onClick={handleCopyRules}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-850 hover:bg-slate-950 text-white rounded-lg font-bold text-xs shadow-sm transition-colors"
            >
              {copiedRules ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              {copiedRules ? 'কপি হয়েছে!' : 'রুলস কোড কপি করুন'}
            </button>
          </div>

          <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 flex flex-col justify-between space-y-2">
            <div>
              <span className="font-black text-emerald-700 block mb-1">ধাপ ৩: টেস্ট ও সিঙ্ক করুন</span>
              <p className="text-[11px] text-slate-600">রুলস সেভ করার পর সব লোকাল ডাটা ক্লাউডে পাঠিয়ে দিন:</p>
            </div>
            <button
              onClick={handleSyncToCloud}
              disabled={syncing}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'সিঙ্ক হচ্ছে...' : 'লোকাল ডাটা ক্লাউডে সিঙ্ক'}
            </button>
          </div>
        </div>

        {/* Code Snippet Box */}
        <div className="relative mt-2">
          <div className="text-[10px] text-slate-500 font-mono font-semibold mb-1 flex justify-between">
            <span>ফায়ারবেস Rules এ যা থাকবে:</span>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-rose-600 hover:underline font-bold"
            >
              {showDetails ? 'লুকান' : 'কোড দেখুন'}
            </button>
          </div>
          {showDetails && (
            <pre className="p-3 bg-slate-900 text-emerald-400 text-[11px] font-mono rounded-xl overflow-x-auto leading-relaxed border border-slate-800">
              {RECOMMENDED_RULES}
            </pre>
          )}
        </div>
      </div>

      {/* Offline Backup Tools */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-rose-200/60 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportBackup}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition-all"
            title="সকল প্রোডাক্ট, ব্যানার ও সেটিংসের অফলাইন JSON ব্যাকআপ নামিয়ে রাখুন"
          >
            <Download size={13} className="text-blue-600" />
            সম্পূর্ণ স্টোর ব্যাকআপ ডাউনলোড (JSON)
          </button>

          <label className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
            <Upload size={13} className="text-emerald-600" />
            ব্যাকআপ ফাইল রিস্টোর করুন
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
        </div>

        {syncResult && (
          <span className="text-[11px] font-bold text-rose-800 bg-rose-100 p-1.5 rounded-lg px-2.5">
            {syncResult}
          </span>
        )}
      </div>
    </div>
  );
};
