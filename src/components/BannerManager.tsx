import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Image as ImageIcon, 
  Upload, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  AlertCircle, 
  Eye, 
  ArrowUp, 
  ArrowDown, 
  Sparkles, 
  Smartphone, 
  Monitor, 
  RefreshCw,
  Clock,
  Layers,
  HelpCircle,
  Zap,
  Camera,
  CheckCircle2
} from 'lucide-react';
import { BannerItem, Category, BrandSettings } from '../types';
import { getBrandSettings, updateBrandSettings } from '../services/settingsService';
import { uploadImage } from '../services/productService';
import { DEFAULT_BANNERS } from './BannerSlider';

interface BannerManagerProps {
  onRefreshSettings?: () => void;
}

/**
 * Ultra-fast in-memory client-side canvas optimizer for 1-click instant banner uploads.
 * Downscales images to responsive banner dimensions (max 1440x800) in < 80ms
 * Produces lightweight, crisp WebP/JPEG data (approx 60KB-120KB) that saves instantly without hanging.
 */
export const fastOptimizeBannerImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('অনুগ্রহ করে একটি ছবি (Image) ফাইল নির্বাচন করুন'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1440;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        let result = '';
        try {
          result = canvas.toDataURL('image/webp', 0.82);
          if (!result.startsWith('data:image/webp')) {
            result = canvas.toDataURL('image/jpeg', 0.82);
          }
        } catch {
          result = canvas.toDataURL('image/jpeg', 0.82);
        }
        resolve(result);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('ছবি পড়তে সমস্যা হয়েছে'));
    reader.readAsDataURL(file);
  });
};

export default function BannerManager({ onRefreshSettings }: BannerManagerProps) {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [autoSlideInterval, setAutoSlideInterval] = useState<number>(4000);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1-Click Fast Processing States
  const [processingBannerId, setProcessingBannerId] = useState<string | null>(null);
  const [quickAdding, setQuickAdding] = useState(false);
  const [activeTargetBannerId, setActiveTargetBannerId] = useState<string | null>(null);

  const quickAddInputRef = useRef<HTMLInputElement>(null);
  const singleBannerInputRef = useRef<HTMLInputElement>(null);

  // Edit / Modal state
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form input states
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formBadge, setFormBadge] = useState('');
  const [formButtonText, setFormButtonText] = useState('');
  const [formCategoryLink, setFormCategoryLink] = useState<Category | 'ALL'>('ALL');
  const [formDesktopImageUrl, setFormDesktopImageUrl] = useState('');
  const [formMobileImageUrl, setFormMobileImageUrl] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // Uploading progress
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);

  const desktopFileInputRef = useRef<HTMLInputElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);

  // Auto hide success or error notification after 4 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Load Settings
  useEffect(() => {
    async function loadData() {
      try {
        const settings = await getBrandSettings();
        if (settings && settings.banners && settings.banners.length > 0) {
          setBanners(settings.banners);
        } else {
          // Initialize with default 5 banners
          setBanners(DEFAULT_BANNERS);
        }
        if (settings?.bannerAutoSlideInterval) {
          setAutoSlideInterval(settings.bannerAutoSlideInterval);
        }
      } catch (err) {
        console.error('Error loading banner settings:', err);
        setBanners(DEFAULT_BANNERS);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Save All Banners to Settings
  const handleSaveAll = async (updatedList: BannerItem[], interval: number = autoSlideInterval) => {
    setIsSaving(true);
    setMessage(null);
    try {
      await updateBrandSettings({
        banners: updatedList,
        bannerAutoSlideInterval: interval,
      });
      setBanners(updatedList);
      setMessage({ type: 'success', text: 'অভিনন্দন! আপনার ব্যানার সেটিংস সফলভাবে সেভ করা হয়েছে।' });
      if (onRefreshSettings) {
        onRefreshSettings();
      }
    } catch (err: any) {
      console.error('Error saving banners:', err);
      setMessage({ type: 'error', text: 'ব্যানার সেভ করতে সমস্যা হয়েছে: ' + (err.message || 'Error') });
    } finally {
      setIsSaving(false);
    }
  };

  // ⚡ 1-Click Instant Add New Banner From Device Gallery
  const handleQuickAddFromGallery = async (file: File) => {
    setQuickAdding(true);
    try {
      const optimizedImage = await fastOptimizeBannerImage(file);
      const newId = 'banner-' + Date.now();
      const newBanner: BannerItem = {
        id: newId,
        title: `স্পেশাল ব্যানার #${banners.length + 1}`,
        subtitle: 'সেরা কালেকশন ও আকর্ষণীয় অফার',
        badge: 'হট অফার',
        buttonText: 'অর্ডার করুন',
        categoryLink: 'ALL',
        desktopImageUrl: optimizedImage,
        mobileImageUrl: optimizedImage,
        isActive: true,
        order: banners.length + 1,
      };

      const updated = [...banners, newBanner];
      // Instant optimistic UI update (0.05s)
      setBanners(updated);
      setMessage({ type: 'success', text: '⚡ গ্যালারি থেকে ১-ক্লিকে নতুন ব্যানার সাথে সাথে লাইভ যুক্ত হয়েছে!' });

      // Save asynchronously in background without delaying user
      await updateBrandSettings({
        banners: updated,
        bannerAutoSlideInterval: autoSlideInterval,
      });
      if (onRefreshSettings) {
        onRefreshSettings();
      }
    } catch (err: any) {
      console.error('Quick add banner error:', err);
      setMessage({ type: 'error', text: 'ব্যানার যোগ করতে সমস্যা: ' + (err.message || 'Error') });
    } finally {
      setQuickAdding(false);
    }
  };

  // ⚡ 1-Click Instant Photo Change for any existing banner
  const handleQuickChangeBannerImage = async (bannerId: string, file: File) => {
    setProcessingBannerId(bannerId);
    try {
      const optimizedImage = await fastOptimizeBannerImage(file);
      const updated = banners.map((b) =>
        b.id === bannerId
          ? { ...b, desktopImageUrl: optimizedImage, mobileImageUrl: optimizedImage }
          : b
      );

      // Instant optimistic UI update (0.05s)
      setBanners(updated);
      setMessage({ type: 'success', text: '⚡ ব্যানার ছবিটি ১-ক্লিকে সাথে সাথে আপডেট হয়ে গেছে!' });

      // Save asynchronously in background
      await updateBrandSettings({
        banners: updated,
        bannerAutoSlideInterval: autoSlideInterval,
      });
      if (onRefreshSettings) {
        onRefreshSettings();
      }
    } catch (err: any) {
      console.error('Quick change banner image error:', err);
      setMessage({ type: 'error', text: 'ছবি আপডেট করতে সমস্যা: ' + (err.message || 'Error') });
    } finally {
      setProcessingBannerId(null);
    }
  };

  // Open Form for Adding New Banner
  const handleOpenNewForm = () => {
    setEditingBanner(null);
    setFormTitle('');
    setFormSubtitle('');
    setFormBadge('ঈদ স্পেশাল');
    setFormButtonText('অর্ডার করুন');
    setFormCategoryLink('ALL');
    setFormDesktopImageUrl('');
    setFormMobileImageUrl('');
    setFormIsActive(true);
    setIsFormOpen(true);
  };

  // Open Form for Editing Existing Banner
  const handleOpenEditForm = (item: BannerItem) => {
    setEditingBanner(item);
    setFormTitle(item.title || '');
    setFormSubtitle(item.subtitle || '');
    setFormBadge(item.badge || '');
    setFormButtonText(item.buttonText || 'অর্ডার করুন');
    setFormCategoryLink(item.categoryLink || 'ALL');
    setFormDesktopImageUrl(item.desktopImageUrl || '');
    setFormMobileImageUrl(item.mobileImageUrl || '');
    setFormIsActive(item.isActive !== false);
    setIsFormOpen(true);
  };

  // Form Submit (Add or Update)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDesktopImageUrl) {
      alert('অনুগ্রহ করে অন্তত একটি ডেস্কটপ ব্যানার ইমেজ দিন।');
      return;
    }

    let newList: BannerItem[] = [];

    if (editingBanner) {
      // Update existing
      newList = banners.map((item) =>
        item.id === editingBanner.id
          ? {
              ...item,
              title: formTitle,
              subtitle: formSubtitle,
              badge: formBadge,
              buttonText: formButtonText,
              categoryLink: formCategoryLink,
              desktopImageUrl: formDesktopImageUrl,
              mobileImageUrl: formMobileImageUrl || formDesktopImageUrl,
              isActive: formIsActive,
            }
          : item
      );
    } else {
      // Add new banner
      const newBanner: BannerItem = {
        id: 'banner-' + Date.now(),
        title: formTitle,
        subtitle: formSubtitle,
        badge: formBadge,
        buttonText: formButtonText,
        categoryLink: formCategoryLink,
        desktopImageUrl: formDesktopImageUrl,
        mobileImageUrl: formMobileImageUrl || formDesktopImageUrl,
        isActive: formIsActive,
        order: banners.length + 1,
      };
      newList = [...banners, newBanner];
    }

    // Instant UI close & apply
    setIsFormOpen(false);
    setBanners(newList);
    setMessage({ type: 'success', text: '⚡ ব্যানার সফলভাবে আপডেট করা হয়েছে!' });
    await handleSaveAll(newList);
  };

  // Toggle Active Status
  const handleToggleActive = async (id: string) => {
    const updated = banners.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b));
    await handleSaveAll(updated);
  };

  // Delete Banner
  const handleDelete = async (id: string) => {
    if (window.confirm('আপনি কি সত্যিই এই ব্যানারটি ডিলিট করতে চান?')) {
      const updated = banners.filter((b) => b.id !== id);
      await handleSaveAll(updated);
    }
  };

  // Move Position Order Up
  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newList = [...banners];
    const temp = newList[index];
    newList[index] = newList[index - 1];
    newList[index - 1] = temp;

    // re-assign order property
    const reordered = newList.map((item, idx) => ({ ...item, order: idx + 1 }));
    await handleSaveAll(reordered);
  };

  // Move Position Order Down
  const handleMoveDown = async (index: number) => {
    if (index === banners.length - 1) return;
    const newList = [...banners];
    const temp = newList[index];
    newList[index] = newList[index + 1];
    newList[index + 1] = temp;

    const reordered = newList.map((item, idx) => ({ ...item, order: idx + 1 }));
    await handleSaveAll(reordered);
  };

  // Restore Default 5 Banners
  const handleResetDefaults = async () => {
    if (window.confirm('আপনি কি ডিফল্ট ৫টি রেডিমেড ব্যানার দিয়ে রিস্টোর করতে চান?')) {
      await handleSaveAll(DEFAULT_BANNERS);
    }
  };

  // Mode toggles for URL input vs Gallery upload
  const [showDesktopUrlInput, setShowDesktopUrlInput] = useState(false);
  const [showMobileUrlInput, setShowMobileUrlInput] = useState(false);

  // Fast file upload in form modal (< 80ms)
  const handleFileUpload = async (file: File, isDesktop: boolean) => {
    if (isDesktop) setUploadingDesktop(true);
    else setUploadingMobile(true);

    try {
      const optimizedUrl = await fastOptimizeBannerImage(file);
      if (isDesktop) {
        setFormDesktopImageUrl(optimizedUrl);
        if (!formMobileImageUrl) {
          setFormMobileImageUrl(optimizedUrl);
        }
      } else {
        setFormMobileImageUrl(optimizedUrl);
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      alert('ছবি প্রসেস বা আপলোড করতে সমস্যা হয়েছে, আবার চেষ্টা করুন।');
    } finally {
      if (isDesktop) setUploadingDesktop(false);
      else setUploadingMobile(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 font-sans">
      
      {/* Hidden file input for 1-click new banner add from gallery */}
      <input
        type="file"
        ref={quickAddInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleQuickAddFromGallery(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />

      {/* Hidden file input for 1-click single banner image replacement */}
      <input
        type="file"
        ref={singleBannerInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          if (e.target.files && e.target.files[0] && activeTargetBannerId) {
            handleQuickChangeBannerImage(activeTargetBannerId, e.target.files[0]);
            e.target.value = '';
          }
        }}
      />

      {/* Header & Control Bar */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <ImageIcon size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">ওয়েবসাইট ব্যানার ম্যানেজার (Banner System)</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                <Zap size={11} className="fill-emerald-600 text-emerald-600 animate-pulse" />
                ১-ক্লিক ফাস্ট আপডেট সক্রিয়
              </span>
            </div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">গ্যালারি থেকে কোনো লোডিং ছাড়াই সাথে সাথে ব্যানার আপলোড ও আপডেট করুন</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* ⚡ 1-Click Direct Gallery Upload Button */}
          <button
            type="button"
            disabled={quickAdding || isSaving}
            onClick={() => quickAddInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md hover:shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 border border-emerald-400/30"
            title="গ্যালারি থেকে ১-ক্লিকে সরাসরি নতুন ব্যানার যোগ করুন"
          >
            {quickAdding ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                <span>ব্যানার যোগ হচ্ছে...</span>
              </>
            ) : (
              <>
                <Zap size={15} className="text-amber-300 fill-amber-300 animate-pulse" />
                <span>⚡ ১-ক্লিকে গ্যালারি থেকে নতুন ব্যানার</span>
              </>
            )}
          </button>

          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>ডিফল্ট ৫টি ব্যানার</span>
          </button>

          <button
            onClick={handleOpenNewForm}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>কাস্টম ফর্ম ব্যানার</span>
          </button>
        </div>
      </div>

      {/* Recommended Banner Dimensions Notice (HIGHLIGHTED) */}
      <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-purple-500/10 border border-amber-300/40 p-5 md:p-6 rounded-3xl space-y-4">
        <div className="flex items-center gap-2 text-amber-800 font-extrabold text-sm uppercase tracking-wider">
          <Sparkles size={18} className="text-amber-600 animate-bounce" />
          <span>ব্যানার সাইজ ও ডাইমেনশন নির্দেশনা (Banner Dimensions Guide)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-medium text-slate-700">
          
          {/* 1. Desktop Dimensions */}
          <div className="bg-white/80 p-4 rounded-2xl border border-amber-200/50 flex items-start gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl shrink-0">
              <Monitor size={18} />
            </div>
            <div>
              <span className="block font-black text-gray-900 text-xs">💻 ডেস্কটপ ব্যানার (Desktop)</span>
              <span className="block text-rose-600 font-bold text-xs mt-0.5">1920 × 600 Pixel</span>
              <span className="block text-[10px] text-gray-500 mt-0.5">(Aspect Ratio 16:5 / 3:1 widescreen)</span>
            </div>
          </div>

          {/* 2. Mobile Dimensions */}
          <div className="bg-white/80 p-4 rounded-2xl border border-amber-200/50 flex items-start gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
              <Smartphone size={18} />
            </div>
            <div>
              <span className="block font-black text-gray-900 text-xs">📱 মোবাইল ব্যানার (Mobile)</span>
              <span className="block text-emerald-600 font-bold text-xs mt-0.5">800 × 800 বা 800 × 600 Pixel</span>
              <span className="block text-[10px] text-gray-500 mt-0.5">(Aspect Ratio 1:1 বা 4:3 মোবাইল ফ্রেন্ডলি)</span>
            </div>
          </div>

          {/* 3. File Specs */}
          <div className="bg-white/80 p-4 rounded-2xl border border-amber-200/50 flex items-start gap-3">
            <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl shrink-0">
              <Layers size={18} />
            </div>
            <div>
              <span className="block font-black text-gray-900 text-xs">⚡ ফরম্যাট ও সাইজ লিমিট</span>
              <span className="block text-purple-700 font-bold text-xs mt-0.5">সর্বোচ্চ ২ MB (JPG, PNG, WebP)</span>
              <span className="block text-[10px] text-gray-500 mt-0.5">কম ফাইল সাইজে ওয়েবসাইট দ্রুত লোড হবে</span>
            </div>
          </div>

        </div>

        <div className="flex items-center gap-2 text-[11px] text-amber-900 font-bold bg-amber-100/60 p-2.5 rounded-xl border border-amber-200">
          <HelpCircle size={15} className="text-amber-700 shrink-0" />
          <span>টিপস: অন্তত ৫টি ব্যানার আপলোড করে ওয়েবসাইটকে আকর্ষণীয় রাখুন। একক ছবি দিলে সেটি স্বয়ংক্রিয়ভাবে মোবাইল ও ডেস্কটপ উভয় জায়গায় ফিট হয়ে যাবে।</span>
        </div>
      </div>

      {/* Auto Slide Settings */}
      <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 text-amber-700 rounded-2xl">
            <Clock size={18} />
          </div>
          <div>
            <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">অটো স্লাইড ইন্টারভাল (Auto Slide Timer)</h4>
            <p className="text-[10px] text-gray-400 font-bold mt-0.5">কত সেকেন্ড পর পর ব্যানার স্লাইড চেঞ্জ হবে</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {[3000, 4000, 5000, 7000].map((interval) => (
            <button
              key={interval}
              onClick={() => {
                setAutoSlideInterval(interval);
                handleSaveAll(banners, interval);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                autoSlideInterval === interval
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {interval / 1000} সেকেন্ড
            </button>
          ))}
        </div>
      </div>

      {/* Alert Messages */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            <span>{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Banners List Section */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-800 flex items-center gap-2">
            <span>সক্রিয় ব্যানার সমূহের তালিকা</span>
            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] rounded-full font-black">
              {banners.length} টি
            </span>
          </h3>
          <span className="text-[10px] font-bold text-gray-400">সর্বনিম্ন ৫টি ব্যানার রেকমেন্ডেড</span>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
            <RefreshCw size={24} className="animate-spin text-rose-500" />
            <span className="text-xs font-bold uppercase tracking-wider">ব্যানার লোড হচ্ছে...</span>
          </div>
        ) : banners.length === 0 ? (
          <div className="py-12 text-center text-gray-400 space-y-3">
            <ImageIcon size={40} className="mx-auto text-gray-300" />
            <p className="text-xs font-bold">কোনো ব্যানার নেই। "নতুন ব্যানার যোগ করুন" ক্লিক করুন।</p>
          </div>
        ) : (
          <div className="space-y-4">
            {banners.map((item, idx) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  item.isActive ? 'bg-slate-50/50 border-gray-200' : 'bg-gray-100/60 border-gray-200 opacity-60'
                }`}
              >
                {/* Image Preview & Content */}
                <div className="flex items-start md:items-center gap-4 flex-1">
                  
                  {/* Banner Image Thumbnail with 1-click tap to change */}
                  <div 
                    onClick={() => {
                      setActiveTargetBannerId(item.id);
                      singleBannerInputRef.current?.click();
                    }}
                    className="group/thumb relative w-28 sm:w-36 h-18 sm:h-20 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-gray-200 shadow-sm cursor-pointer hover:border-amber-400 transition-all"
                    title="ছবিতে ক্লিক করে গ্যালারি থেকে ১-ক্লিকে নতুন ছবি বেছে নিন"
                  >
                    <img
                      src={item.desktopImageUrl}
                      alt={item.title || 'Banner'}
                      className="w-full h-full object-cover group-hover/thumb:scale-105 transition-all duration-200"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-slate-950/80 text-white text-[9px] font-black rounded">
                      #{idx + 1}
                    </div>

                    {/* Hover & Tap Overlay */}
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/thumb:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                      <Camera size={16} className="text-amber-300" />
                      <span className="text-[9px] font-bold text-amber-200 mt-0.5">ছবি পাল্টান</span>
                    </div>

                    {processingBannerId === item.id && (
                      <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center text-white">
                        <RefreshCw size={18} className="animate-spin text-amber-400" />
                      </div>
                    )}
                  </div>

                  {/* Banner Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-gray-900">{item.title || 'ব্যানার হিরো টাইটেল'}</span>
                      {item.badge && (
                        <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[9px] rounded-md uppercase">
                          {item.badge}
                        </span>
                      )}
                      {!item.isActive && (
                        <span className="px-2 py-0.5 bg-gray-400 text-white font-black text-[9px] rounded-md uppercase">
                          হাইড করা
                        </span>
                      )}
                    </div>
                    {item.subtitle && <p className="text-xs text-gray-500 font-medium line-clamp-1">{item.subtitle}</p>}
                    <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 pt-0.5">
                      <span>বাটন: <strong className="text-rose-600">{item.buttonText || 'অর্ডার করুন'}</strong></span>
                      <span>লিংক: <strong className="text-gray-700">{item.categoryLink || 'ALL'}</strong></span>
                    </div>
                  </div>

                </div>

                {/* Actions: Quick Change, Reorder, Active Toggle, Edit, Delete */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-auto border-t md:border-t-0 pt-2 md:pt-0 flex-wrap">
                  
                  {/* ⚡ 1-Click Fast Photo Change */}
                  <button
                    type="button"
                    disabled={processingBannerId === item.id || isSaving}
                    onClick={() => {
                      setActiveTargetBannerId(item.id);
                      singleBannerInputRef.current?.click();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white rounded-xl text-xs font-black shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
                    title="গ্যালারি থেকে ১-ক্লিকে এই ব্যানারটির ছবি সরাসরি পরিবর্তন করুন"
                  >
                    {processingBannerId === item.id ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>আপডেট হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={13} className="text-amber-200 fill-amber-200" />
                        <span>১-ক্লিকে ছবি পরিবর্তন</span>
                      </>
                    )}
                  </button>

                  {/* Move Up */}
                  <button
                    disabled={idx === 0 || isSaving}
                    onClick={() => handleMoveUp(idx)}
                    className="p-2 bg-white hover:bg-gray-100 disabled:opacity-30 text-gray-700 rounded-xl border border-gray-200 text-xs font-bold cursor-pointer"
                    title="উপরে সরান"
                  >
                    <ArrowUp size={14} />
                  </button>

                  {/* Move Down */}
                  <button
                    disabled={idx === banners.length - 1 || isSaving}
                    onClick={() => handleMoveDown(idx)}
                    className="p-2 bg-white hover:bg-gray-100 disabled:opacity-30 text-gray-700 rounded-xl border border-gray-200 text-xs font-bold cursor-pointer"
                    title="নিচে সরান"
                  >
                    <ArrowDown size={14} />
                  </button>

                  {/* Active Toggle Switch */}
                  <button
                    onClick={() => handleToggleActive(item.id)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      item.isActive
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {item.isActive ? '✓ সক্রিয়' : 'অফ'}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => handleOpenEditForm(item)}
                    className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl border border-amber-200 text-xs font-bold cursor-pointer"
                    title="এডিট করুন"
                  >
                    <Edit3 size={14} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200 text-xs font-bold cursor-pointer"
                    title="ডিলিট করুন"
                  >
                    <Trash2 size={14} />
                  </button>

                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 my-8"
            >
              {/* Form Modal Header */}
              <div className="p-6 bg-gradient-to-r from-slate-900 to-rose-950 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider">
                    {editingBanner ? 'ব্যানার এডিট করুন' : 'নতুন ব্যানার যোগ করুন'}
                  </h3>
                  <p className="text-[11px] text-amber-300 font-bold mt-0.5">
                    ডেস্কটপ ও মোবাইলের জন্য প্রফেশনাল ব্যানার সেট করুন
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleFormSubmit} className="p-6 md:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                
                {/* 1. Desktop Image Upload Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-black text-gray-800 uppercase tracking-wider">
                    <span>১. ডেস্কটপ ব্যানার ছবি (DESKTOP BANNER - 1920×600) *</span>
                    <button
                      type="button"
                      onClick={() => setShowDesktopUrlInput(!showDesktopUrlInput)}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                    >
                      {showDesktopUrlInput ? 'TRY GALLERY UPLOAD' : 'ENTER URL INSTEAD'}
                    </button>
                  </div>

                  <input
                    type="file"
                    ref={desktopFileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0], true);
                      }
                    }}
                  />

                  {showDesktopUrlInput ? (
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://... (ইমেজ লিঙ্ক ডিরেক্ট দিন)"
                        value={formDesktopImageUrl}
                        onChange={(e) => setFormDesktopImageUrl(e.target.value)}
                        className="flex-1 px-4 py-2.5 bg-gray-50 text-gray-800 text-xs rounded-xl border border-gray-200 outline-none focus:border-rose-500 font-mono"
                      />
                    </div>
                  ) : formDesktopImageUrl ? (
                    <div className="relative group rounded-2xl overflow-hidden bg-slate-900 border-2 border-rose-200 shadow-md">
                      <img src={formDesktopImageUrl} alt="Desktop Banner" className="w-full h-36 object-cover" />
                      <div className="absolute inset-0 bg-slate-950/60 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3 p-2">
                        <button
                          type="button"
                          disabled={uploadingDesktop}
                          onClick={() => desktopFileInputRef.current?.click()}
                          className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
                        >
                          {uploadingDesktop ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                          <span>গ্যালারি থেকে ছবি পরিবর্তন করুন</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormDesktopImageUrl('')}
                          className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-lg flex items-center gap-1 cursor-pointer transition-all hover:scale-105"
                        >
                          <Trash2 size={14} />
                          <span>মুছুন</span>
                        </button>
                      </div>
                      <span className="absolute bottom-2 left-2 bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded shadow">
                        ✓ অটো অপটিমাইজড HD
                      </span>
                    </div>
                  ) : (
                    <div
                      onClick={() => desktopFileInputRef.current?.click()}
                      className="border-2 border-dashed border-rose-300 hover:border-rose-500 bg-rose-50/40 hover:bg-rose-50/80 p-6 rounded-2xl text-center cursor-pointer transition-all space-y-2 group"
                    >
                      <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                        {uploadingDesktop ? <RefreshCw size={22} className="animate-spin" /> : <Upload size={22} />}
                      </div>
                      <div>
                        <span className="block text-xs font-black text-gray-900">গ্যালারি থেকে ডেস্কটপ ছবি সিলেক্ট করুন</span>
                        <span className="block text-[10px] text-gray-500 font-bold mt-0.5">ক্লিক করুন (অটোমেটিক অটো-সাইজ ও হাই কোয়ালিটি HD অপটিমাইজ হবে)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Mobile Image Upload Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-black text-gray-800 uppercase tracking-wider">
                    <span>২. মোবাইল ব্যানার ছবি (MOBILE BANNER - 800×800)</span>
                    <button
                      type="button"
                      onClick={() => setShowMobileUrlInput(!showMobileUrlInput)}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                    >
                      {showMobileUrlInput ? 'TRY GALLERY UPLOAD' : 'ENTER URL INSTEAD'}
                    </button>
                  </div>

                  <input
                    type="file"
                    ref={mobileFileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0], false);
                      }
                    }}
                  />

                  {showMobileUrlInput ? (
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://... (মোবাইলের জন্য ডিরেক্ট লিঙ্ক)"
                        value={formMobileImageUrl}
                        onChange={(e) => setFormMobileImageUrl(e.target.value)}
                        className="flex-1 px-4 py-2.5 bg-gray-50 text-gray-800 text-xs rounded-xl border border-gray-200 outline-none focus:border-rose-500 font-mono"
                      />
                    </div>
                  ) : formMobileImageUrl ? (
                    <div className="relative group rounded-2xl overflow-hidden bg-slate-900 border-2 border-emerald-200 shadow-md">
                      <img src={formMobileImageUrl} alt="Mobile Banner" className="w-full h-32 object-cover" />
                      <div className="absolute inset-0 bg-slate-950/60 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3 p-2">
                        <button
                          type="button"
                          disabled={uploadingMobile}
                          onClick={() => mobileFileInputRef.current?.click()}
                          className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
                        >
                          {uploadingMobile ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                          <span>গ্যালারি থেকে ছবি পরিবর্তন করুন</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormMobileImageUrl('')}
                          className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-lg flex items-center gap-1 cursor-pointer transition-all hover:scale-105"
                        >
                          <Trash2 size={14} />
                          <span>মুছুন</span>
                        </button>
                      </div>
                      <span className="absolute bottom-2 left-2 bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded shadow">
                        ✓ মোবাইল অটো অপটিমাইজড HD
                      </span>
                    </div>
                  ) : (
                    <div
                      onClick={() => mobileFileInputRef.current?.click()}
                      className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/70 p-5 rounded-2xl text-center cursor-pointer transition-all space-y-2 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                        {uploadingMobile ? <RefreshCw size={20} className="animate-spin" /> : <Smartphone size={20} />}
                      </div>
                      <div>
                        <span className="block text-xs font-black text-gray-900">গ্যালারি থেকে মোবাইল ছবি সিলেক্ট করুন (ঐচ্ছিক)</span>
                        <span className="block text-[10px] text-gray-500 font-bold mt-0.5">ফাঁকা রাখলে অটোমেটিক ডেস্কটপ ছবি থেকে মোবাইল ভার্সন তৈরি হবে</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Title & Subtitle */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-wider">
                      ৩. হিরো টাইটেল (Title):
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: Sera"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 text-gray-800 text-xs rounded-xl border border-gray-200 outline-none focus:border-rose-500 font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-wider">
                      ৪. সাবটাইটেল (Subtitle):
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: প্রিমিয়াম থ্রি-পিস ও শাড়ি কালেকশন"
                      value={formSubtitle}
                      onChange={(e) => setFormSubtitle(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 text-gray-800 text-xs rounded-xl border border-gray-200 outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* 4. Badge & Button Text */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-wider">
                      ৫. ব্যাজ ট্যাগ (Badge Tag):
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: ঈদ স্পেশাল, হট অফার, বেস্ট সেলার"
                      value={formBadge}
                      onChange={(e) => setFormBadge(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 text-gray-800 text-xs rounded-xl border border-gray-200 outline-none focus:border-rose-500 font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-wider">
                      ৬. বাটন টেক্সট (CTA Text):
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: অর্ডার করুন, কালেকশন দেখুন"
                      value={formButtonText}
                      onChange={(e) => setFormButtonText(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 text-gray-800 text-xs rounded-xl border border-gray-200 outline-none focus:border-rose-500 font-bold"
                    />
                  </div>
                </div>

                {/* 5. Category Target & Active */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-wider">
                      ৭. বাটনে ক্লিক করলে ক্যাটাগরি ফিল্টার:
                    </label>
                    <select
                      value={formCategoryLink}
                      onChange={(e) => setFormCategoryLink(e.target.value as Category | 'ALL')}
                      className="w-full px-4 py-2.5 bg-gray-50 text-gray-800 text-xs font-extrabold rounded-xl border border-gray-200 outline-none focus:border-rose-500"
                    >
                      <option value="ALL">সকল প্রোডাক্ট (ALL)</option>
                      <option value="THREE PIECE">থ্রি-পিস (THREE PIECE)</option>
                      <option value="SAREE">শাড়ি (SAREE)</option>
                      <option value="OTHERS">অন্যান্য (OTHERS)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      id="formActive"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-5 h-5 accent-rose-600 rounded cursor-pointer"
                    />
                    <label htmlFor="formActive" className="text-xs font-black text-gray-800 uppercase tracking-wider cursor-pointer">
                      ব্যানারটি সক্রিয় রাখুন (Show on Website)
                    </label>
                  </div>
                </div>

                {/* Form Footer Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-extrabold rounded-xl transition-all cursor-pointer"
                  >
                    বাতিল
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
                  >
                    {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={16} />}
                    <span>{editingBanner ? 'আপডেট করুন' : 'সেভ করুন'}</span>
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
