import React, { useState, useEffect, useRef } from 'react';
import {
  Eye, Users, Sparkles, Plus, Minus, Check, SlidersHorizontal,
  ChevronDown, ChevronUp, RotateCcw, Radio
} from 'lucide-react';
import { BrandSettings, Product } from '../types';
import {
  subscribeToBrandSettings,
  updateBrandSettings,
} from '../services/settingsService';
import {
  LiveViewerMode,
  LiveViewerSummary,
  subscribeToLiveViewerSummary,
  computeProductLiveViewers,
} from '../services/liveViewerService';
import { getAllProducts } from '../services/productService';

export default function LiveViewerControlPanel() {
  const [settings, setSettings] = useState<BrandSettings | null>(() => {
    try {
      const cached = localStorage.getItem('brand_settings');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [summary, setSummary] = useState<LiveViewerSummary>({
    totalRealOnline: 0,
    byProduct: {},
    updatedAt: new Date().toISOString(),
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [showPerProduct, setShowPerProduct] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimerRef = useRef<any>(null);

  useEffect(() => {
    const unsubSettings = subscribeToBrandSettings((nextSettings) => {
      if (nextSettings) {
        setSettings(nextSettings);
      }
    });
    const unsubViewers = subscribeToLiveViewerSummary(false, undefined, (nextSummary) => {
      setSummary(nextSummary);
    });
    getAllProducts(true)
      .then((list) => setProducts((list || []).filter((p) => p && p.isActive !== false)))
      .catch(() => {});

    return () => {
      unsubSettings();
      unsubViewers();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const enabled = settings?.liveViewerEnabled !== false;
  const mode: LiveViewerMode =
    settings?.liveViewerMode === 'real_only' ||
    settings?.liveViewerMode === 'fake_only' ||
    settings?.liveViewerMode === 'combined'
      ? settings.liveViewerMode
      : 'combined';
  const fakeCount = Math.max(0, Math.round(Number(settings?.liveViewerFakeCount ?? 5)));
  const byProductFake = settings?.liveViewerFakeCountsByProduct || {};

  const { realCount, displayCount } = computeProductLiveViewers({
    summary,
    settings,
  });

  const persistPatch = async (patch: Partial<BrandSettings>) => {
    setSettings((prev) => ({ ...(prev || {}), ...patch }));
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    try {
      await updateBrandSettings(patch);
      setSaveStatus('saved');
      saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('idle');
    }
  };

  const adjustFakeCount = (delta: number) => {
    const nextVal = Math.max(0, Math.min(999, fakeCount + delta));
    persistPatch({ liveViewerFakeCount: nextVal });
  };

  const setExactFakeCount = (rawValue: string) => {
    const parsed = parseInt(rawValue.replace(/[^0-9]/g, ''), 10);
    const nextVal = isNaN(parsed) ? 0 : Math.max(0, Math.min(999, parsed));
    persistPatch({ liveViewerFakeCount: nextVal });
  };

  const adjustProductFakeCount = (productCode: string, delta: number) => {
    const current =
      typeof byProductFake[productCode] === 'number' ? byProductFake[productCode] : fakeCount;
    const nextVal = Math.max(0, Math.min(999, current + delta));
    persistPatch({
      liveViewerFakeCountsByProduct: {
        ...byProductFake,
        [productCode]: nextVal,
      },
    });
  };

  const resetProductFakeCount = (productCode: string) => {
    const nextMap = { ...byProductFake };
    delete nextMap[productCode];
    persistPatch({ liveViewerFakeCountsByProduct: nextMap });
  };

  return (
    <div className="bg-white p-4 sm:p-6 md:p-7 rounded-3xl shadow-sm border border-rose-100/80 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200/70 text-rose-600 flex items-center justify-center shrink-0">
            <Eye size={20} className="animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-gray-900 leading-snug">
                প্রোডাক্ট লাইভ ভিউয়ার কন্ট্রোল (Real &amp; Fake)
              </h3>
              {saveStatus === 'saved' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Check size={11} strokeWidth={3} />
                  সেভ হয়েছে
                </span>
              )}
              {saveStatus === 'saving' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  সেভ হচ্ছে...
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
              কতজন কাস্টমার লাইভ প্রোডাক্ট দেখছেন — রিয়াল ও ফেক সংখ্যা একসাথে বা আলাদাভাবে নিয়ন্ত্রণ করুন
            </p>
          </div>
        </div>

        {/* Enable/Disable Badge Toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-3 bg-gray-50 px-3.5 py-2 rounded-2xl border border-gray-200 shrink-0">
          <span className="text-xs font-black text-gray-700">
            {enabled ? '🟢 সাইটে দেখাবে' : '🔴 বন্ধ আছে'}
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => persistPatch({ liveViewerEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600" />
          </label>
        </div>
      </div>

      {/* 1. Real + Fake Live Comparison Cards (Both Shown Together) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Real Count */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              রিয়াল লাইভ (Real)
            </span>
            <p className="text-2xl font-black text-emerald-950 mt-1 tabular-nums">
              {realCount} <span className="text-xs font-bold text-emerald-700">জন</span>
            </p>
            <p className="text-[10px] text-emerald-700/80 font-medium mt-0.5">
              আসল কাস্টমার এখন দেখছেন
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/90 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
            <Users size={18} />
          </div>
        </div>

        {/* Fake Count */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <Sparkles size={11} className="text-amber-600" />
              ফেক সংখ্যা (Fake)
            </span>
            <p className="text-2xl font-black text-amber-950 mt-1 tabular-nums">
              {fakeCount} <span className="text-xs font-bold text-amber-700">জন</span>
            </p>
            <p className="text-[10px] text-amber-800/80 font-medium mt-0.5">
              নিচে + / - দিয়ে বাড়ান-কমান
            </p>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <button
              type="button"
              onClick={() => adjustFakeCount(1)}
              className="w-8 h-7 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-black flex items-center justify-center shadow-xs active:scale-95 cursor-pointer"
              title="১ বাড়ান"
            >
              <Plus size={14} strokeWidth={3} />
            </button>
            <button
              type="button"
              onClick={() => adjustFakeCount(-1)}
              className="w-8 h-7 rounded-lg bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-black flex items-center justify-center shadow-xs active:scale-95 cursor-pointer"
              title="১ কমান"
            >
              <Minus size={14} strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Total Displayed On Website */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#10121d] text-white border border-slate-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <Radio size={11} className="animate-pulse" />
              ওয়েবসাইটে দেখাবে
            </span>
            <p className="text-xl sm:text-2xl font-black text-white mt-1 tabular-nums truncate">
              {enabled ? `${displayCount} জন` : 'বন্ধ'}
            </p>
            <p className="text-[10px] text-slate-300 font-medium mt-0.5 truncate">
              {!enabled
                ? 'ব্যাজ লুকানো আছে'
                : mode === 'combined'
                ? `রিয়াল (${realCount}) + ফেক (${fakeCount})`
                : mode === 'real_only'
                ? `শুধুমাত্র রিয়াল (${realCount} জন)`
                : `শুধুমাত্র ফেক (${fakeCount} জন)`}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
            <Eye size={18} />
          </div>
        </div>
      </div>

      {/* 2. 3-Way Mode Selection: Combined vs Real Only vs Fake Only */}
      <div className="space-y-2">
        <label className="text-[11px] font-black text-gray-700 uppercase tracking-wider block">
          প্রদর্শন মোড সিলেক্ট করুন (Display Mode):
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[
            {
              id: 'combined' as LiveViewerMode,
              title: 'রিয়াল + ফেক একসাথে',
              desc: `আসল (${realCount}) + ফেক (${fakeCount}) = মোট ${realCount + fakeCount} জন দেখাবে`,
              badge: 'প্রস্তাবিত',
            },
            {
              id: 'real_only' as LiveViewerMode,
              title: 'শুধুমাত্র রিয়াল (আসল)',
              desc: `শুধু আসল কাস্টমার (${realCount} জন) দেখাবে`,
              badge: '১০০% আসল',
            },
            {
              id: 'fake_only' as LiveViewerMode,
              title: 'শুধুমাত্র ফেক (কাস্টম)',
              desc: `শুধু আপনার সেট করা ফেক (${fakeCount} জন) দেখাবে`,
              badge: 'কাস্টম',
            },
          ].map((opt) => {
            const isSelected = mode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => persistPatch({ liveViewerMode: opt.id })}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                  isSelected
                    ? 'bg-rose-50/70 border-rose-500 shadow-sm ring-1 ring-rose-400/40'
                    : 'bg-gray-50/60 border-gray-200 hover:border-gray-300'
                }`}
              >
                <span
                  className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-rose-600 bg-rose-600 text-white' : 'border-gray-400 bg-white'
                  }`}
                >
                  {isSelected && <Check size={10} strokeWidth={3} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-black text-gray-900">{opt.title}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                        isSelected
                          ? 'bg-rose-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {opt.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 mt-1 leading-snug">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Fake Count Adjuster (-5, -1, Input, +1, +5) */}
      <div className="p-3.5 sm:p-4 bg-gray-50/80 rounded-2xl border border-gray-200/80 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-black text-gray-800 flex items-center gap-1.5">
            <SlidersHorizontal size={14} className="text-rose-600" />
            <span>ফেক লাইভ সংখ্যা বাড়ান / কমান:</span>
          </span>
          <span className="text-[11px] font-bold text-gray-500">
            বর্তমান ফেক: <strong className="text-gray-900">{fakeCount} জন</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => adjustFakeCount(-5)}
            className="px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-gray-800 border border-gray-300 text-xs font-black transition-all active:scale-95 cursor-pointer"
          >
            -৫
          </button>
          <button
            type="button"
            onClick={() => adjustFakeCount(-1)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-gray-800 border border-gray-300 text-xs font-black transition-all active:scale-95 cursor-pointer flex items-center gap-1"
          >
            <Minus size={13} strokeWidth={3} />
            <span>১</span>
          </button>

          <input
            type="number"
            min={0}
            max={999}
            value={fakeCount}
            onChange={(e) => setExactFakeCount(e.target.value)}
            className="w-20 text-center py-2 px-2 rounded-xl bg-white border-2 border-gray-300 focus:border-rose-500 focus:outline-none font-black text-gray-900 tabular-nums"
            aria-label="ফেক লাইভ সংখ্যা"
          />

          <button
            type="button"
            onClick={() => adjustFakeCount(1)}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-xs"
          >
            <Plus size={13} strokeWidth={3} />
            <span>১</span>
          </button>
          <button
            type="button"
            onClick={() => adjustFakeCount(5)}
            className="px-3 py-2 rounded-xl bg-[#10121d] hover:bg-black text-white text-xs font-black transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            +৫
          </button>

          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
            {[0, 3, 5, 10, 20].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => persistPatch({ liveViewerFakeCount: preset })}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer border ${
                  fakeCount === preset
                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-amber-400'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Optional Per-Product Fake Count Customizer */}
      {products.length > 0 && (
        <div className="border border-gray-200 rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowPerProduct((v) => !v)}
            className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100/80 flex items-center justify-between gap-2 text-left cursor-pointer transition-colors"
          >
            <span className="text-xs font-black text-gray-800">
              আলাদাভাবে প্রতিটি প্রোডাক্টের ফেক ও রিয়াল সংখ্যা দেখুন / কন্ট্রোল করুন ({products.length}টি)
            </span>
            {showPerProduct ? (
              <ChevronUp size={16} className="text-gray-500 shrink-0" />
            ) : (
              <ChevronDown size={16} className="text-gray-500 shrink-0" />
            )}
          </button>

          {showPerProduct && (
            <div className="p-3 sm:p-4 bg-white divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {products.map((prod) => {
                const code = prod.productCode;
                const hasCustom = typeof byProductFake[code] === 'number';
                const prodCalc = computeProductLiveViewers({
                  summary,
                  settings,
                  productCode: code,
                });

                return (
                  <div
                    key={prod.id || code}
                    className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={prod.imageUrl}
                        alt={prod.title}
                        className="w-10 h-10 rounded-xl object-cover border border-gray-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{prod.title}</p>
                        <p className="text-[10px] text-gray-500 font-semibold">
                          রিয়াল: <strong className="text-emerald-700">{prodCalc.realCount}</strong> • ফেক:{' '}
                          <strong className="text-amber-700">{prodCalc.fakeCount}</strong> • দেখাবে:{' '}
                          <strong className="text-rose-600">{prodCalc.displayCount} জন</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => adjustProductFakeCount(code, -1)}
                        className="w-8 h-8 rounded-lg border border-gray-200 bg-gray-50 hover:bg-rose-50 text-gray-800 flex items-center justify-center font-black cursor-pointer"
                        title="১ কমান"
                      >
                        <Minus size={12} strokeWidth={3} />
                      </button>
                      <span className="min-w-[2.2rem] text-center text-xs font-black text-gray-900 tabular-nums">
                        {prodCalc.fakeCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustProductFakeCount(code, 1)}
                        className="w-8 h-8 rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center font-black cursor-pointer"
                        title="১ বাড়ান"
                      >
                        <Plus size={12} strokeWidth={3} />
                      </button>
                      {hasCustom && (
                        <button
                          type="button"
                          onClick={() => resetProductFakeCount(code)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="ডিফল্ট সংখ্যায় ফেরত যান"
                        >
                          <RotateCcw size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
