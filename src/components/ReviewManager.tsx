import React, { useState, useEffect } from 'react';
import { getAllProducts } from '../services/productService';
import { getAllReviews, getReviewsForProduct, createReview, updateReview, deleteReview, ProductReview } from '../services/reviewService';
import { Product } from '../types';
import { 
  Star, Trash2, Plus, MessageSquare, Send, CheckCircle2, User, 
  Package, Sparkles, Search, Loader2, RefreshCw, Upload, Image as ImageIcon,
  Edit2, MapPin, Heart, ShieldCheck, Globe, Check, ChevronDown, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1614283233556-f35b0c801efd?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1635488662761-fa02636ca560?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1621012430307-b4774b78d3cb?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop'
];

export default function ReviewManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [searchProductQuery, setSearchProductQuery] = useState('');

  // Mode: 'all' or specific product
  const [viewFilterMode, setViewFilterMode] = useState<'all' | string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Reviews list states
  const [allAppReviews, setAllAppReviews] = useState<ProductReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [searchReviewQuery, setSearchReviewQuery] = useState('');

  // Form states (Add or Edit)
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [locationRole, setLocationRole] = useState('উত্তরা, ঢাকা');
  const [badgeRole, setBadgeRole] = useState('Verified Buyer');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [targetProductId, setTargetProductId] = useState<string>('general');
  const [customDate, setCustomDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Custom UI Modals & Popovers
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productModalSearch, setProductModalSearch] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isCustomBadgeMode, setIsCustomBadgeMode] = useState(false);
  const [customBadgeText, setCustomBadgeText] = useState('');

  // Delete confirmation
  const [reviewToDelete, setReviewToDelete] = useState<ProductReview | null>(null);
  const [deletingInProgress, setDeletingInProgress] = useState(false);

  // Load products initially
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getAllProducts(true);
        setProducts(data);
      } catch (err) {
        console.error("Failed to load products for review manager", err);
      } finally {
        setProductsLoading(false);
      }
    };
    fetchProducts();

    const handleProductsUpdated = () => fetchProducts();
    window.addEventListener('local_products_updated', handleProductsUpdated);
    return () => window.removeEventListener('local_products_updated', handleProductsUpdated);
  }, []);

  // Fetch reviews whenever view filter changes
  const loadReviewsData = async () => {
    setReviewsLoading(true);
    try {
      const data = await getAllReviews();
      setAllAppReviews(data);
    } catch (err) {
      console.error("Failed to load reviews", err);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    loadReviewsData();

    const handleUpdate = () => {
      loadReviewsData();
    };
    window.addEventListener('reviews_updated', handleUpdate);
    return () => window.removeEventListener('reviews_updated', handleUpdate);
  }, []);

  // Filtered reviews based on mode and search
  const filteredReviews = allAppReviews.filter(r => {
    let matchesProduct = true;
    if (viewFilterMode !== 'all') {
      if (viewFilterMode === 'general') {
        matchesProduct = r.productId === 'general' || !r.productId;
      } else {
        const targetProd = products.find(p => String(p.id) === String(viewFilterMode) || p.productCode === viewFilterMode);
        matchesProduct = String(r.productId) === String(viewFilterMode) || 
                         r.productCode === viewFilterMode ||
                         (targetProd !== undefined && (String(r.productId) === String(targetProd.id) || r.productCode === targetProd.productCode));
      }
    }

    const searchLower = (searchReviewQuery || '').toLowerCase();
    const matchesSearch = !searchReviewQuery.trim() || 
      (r.customerName || '').toLowerCase().includes(searchLower) ||
      (r.comment || '').toLowerCase().includes(searchLower) ||
      (r.location ? r.location.toLowerCase().includes(searchLower) : false) ||
      (r.productName ? r.productName.toLowerCase().includes(searchLower) : false) ||
      (r.productCode ? r.productCode.toLowerCase().includes(searchLower) : false);

    return matchesProduct && matchesSearch;
  });

  // Handle Image Upload File
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setActionError('ছবির সাইজ ৩ মেগাবাইটের মধ্যে হতে হবে।');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatarUrl(event.target.result as string);
        setActionSuccess('ছবি আপলোড সফল হয়েছে!');
        setTimeout(() => setActionSuccess(''), 2500);
      }
    };
    reader.readAsDataURL(file);
  };

  // Populate form for Edit
  const handleStartEdit = (rev: ProductReview) => {
    setEditingReviewId(rev.id || null);
    setAuthorName(rev.customerName);
    setAvatarUrl(rev.avatar || '');
    setLocationRole(rev.location || 'ঢাকা, বাংলাদেশ');
    setBadgeRole(rev.role || 'Verified Buyer');
    setRating(rev.rating);
    setComment(rev.comment);
    setTargetProductId(rev.productId || 'general');
    setCustomDate(rev.createdAt ? rev.createdAt.split('T')[0] : '');
    setActionSuccess('');
    setActionError('');
  };

  const handleCancelEdit = () => {
    setEditingReviewId(null);
    setAuthorName('');
    setAvatarUrl('');
    setLocationRole('উত্তরা, ঢাকা');
    setBadgeRole('Verified Buyer');
    setRating(5);
    setComment('');
    setTargetProductId('general');
    setCustomDate('');
  };

  // Submit form (Add or Edit)
  const handleSubmitReviewForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !comment.trim()) {
      setActionError('দয়া করে কাস্টমারের নাম এবং রিভিউয়ের বিবরণ লিখুন।');
      return;
    }

    setSubmitting(true);
    setActionSuccess('');
    setActionError('');

    try {
      const selectedProd = products.find(p => String(p.id) === String(targetProductId) || p.productCode === targetProductId);

      if (editingReviewId) {
        // Edit mode
        await updateReview(editingReviewId, {
          customerName: authorName.trim(),
          avatar: avatarUrl.trim(),
          location: locationRole.trim(),
          role: badgeRole.trim(),
          rating,
          comment: comment.trim(),
          productId: targetProductId,
          productCode: selectedProd?.productCode || '',
          productName: selectedProd?.title || (targetProductId === 'general' ? 'সাধারণ শপ রিভিউ' : ''),
          createdAt: customDate ? new Date(customDate).toISOString() : new Date().toISOString()
        });
        setActionSuccess('কাস্টমার রিভিউটি সফলভাবে আপডেট করা হয়েছে! ✨');
        handleCancelEdit();
      } else {
        // Add mode
        await createReview(
          targetProductId,
          authorName.trim(),
          rating,
          comment.trim(),
          customDate ? new Date(customDate).toISOString() : undefined,
          {
            location: locationRole.trim(),
            avatar: avatarUrl.trim(),
            role: badgeRole.trim(),
            productName: selectedProd?.title || (targetProductId === 'general' ? 'সাধারণ শপ রিভিউ' : ''),
            productCode: selectedProd?.productCode || '',
            isFeatured: true
          }
        );
        setActionSuccess('নতুন কাস্টমার রিভিউ প্রকাশিত হয়েছে এবং হোম পেজে যোগ করা হয়েছে! 🎉');
        handleCancelEdit();
      }

      await loadReviewsData();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      console.error("Error submitting review form", err);
      setActionError('রিভিউ সাবমিট করতে সমস্যা হয়েছে।');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete action
  const handleDeleteReview = async () => {
    if (!reviewToDelete || !reviewToDelete.id) return;

    setDeletingInProgress(true);
    try {
      await deleteReview(reviewToDelete.id, reviewToDelete.productId);
      setReviewToDelete(null);
      setActionSuccess('রিভিউটি সফলভাবে মুছে ফেলা হয়েছে।');
      await loadReviewsData();
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err) {
      console.error("Failed to delete review", err);
      setActionError('রিভিউ মুছে ফেলতে ত্রুটি হয়েছে।');
    } finally {
      setDeletingInProgress(false);
    }
  };

  const totalReviewsCount = allAppReviews.length;
  const avgRating = totalReviewsCount > 0 
    ? (allAppReviews.reduce((acc, r) => acc + r.rating, 0) / totalReviewsCount).toFixed(1)
    : '5.0';

  return (
    <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-gray-100 space-y-8 animate-fade-in">
      
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <div className="flex items-center gap-2 text-rose-600 font-extrabold text-[10px] uppercase tracking-widest bg-rose-50 px-3 py-1.5 rounded-full w-fit">
            <Sparkles size={12} className="animate-pulse" />
            অটোমেটিক ও কাস্টম রিভিউ ম্যানেজার
          </div>
          <h2 className="text-2xl font-black text-brand-charcoal mt-2 tracking-tight">কাস্টমার রিভিউ সিস্টেম Control</h2>
          <p className="text-xs text-gray-400 font-medium mt-1">
            কাস্টমারদের দেওয়া আসল রিভিউ এবং এডমিন ড্যাশবোর্ড থেকে আপলোড করা রিভিউ কাস্টম ছবি, নাম ও লোকেশন সহ হোম পেজের "কাস্টমারদের ভালোবাসা ও রিভিউ" তে সরাসরি শো করবে।
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#fcfcfa] px-5 py-3 border border-gray-150 rounded-3xl flex items-center gap-4 text-xs font-bold shadow-sm">
            <div className="text-center">
              <div className="text-[10px] text-gray-400 font-black uppercase tracking-wider">মোট রিভিউ</div>
              <div className="text-base font-black text-brand-charcoal">{totalReviewsCount} টি</div>
            </div>
            <div className="h-6 w-px bg-gray-200" />
            <div className="text-center">
              <div className="text-[10px] text-gray-400 font-black uppercase tracking-wider">গড় রেটিং</div>
              <div className="text-base font-black text-amber-500 flex items-center gap-1 justify-center">
                <Star size={14} fill="#fbbf24" className="text-amber-400" />
                {avgRating}
              </div>
            </div>
          </div>

          <button
            onClick={loadReviewsData}
            className="p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl text-gray-600 transition-all flex items-center gap-2 text-xs font-black"
            title="রিফ্রেশ করুন"
          >
            <RefreshCw size={14} className={reviewsLoading ? "animate-spin text-rose-600" : ""} />
            রিফ্রেশ
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 animate-pulse shadow-sm">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm">
          <CheckCircle2 size={16} className="text-red-500 shrink-0 rotate-45" />
          {actionError}
        </div>
      )}

      {/* Main Grid: Left Side Form (Col 5) + Right Side Reviews List (Col 7) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Create / Edit Review Form */}
        <div className="lg:col-span-5 bg-[#fcfcfa] border border-gray-200 p-6 rounded-[2.5rem] space-y-5 shadow-sm">
          <div className="border-b border-gray-200/80 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-brand-charcoal flex items-center gap-2">
                {editingReviewId ? <Edit2 size={16} className="text-amber-500" /> : <Plus size={16} className="text-rose-600" />}
                {editingReviewId ? 'রিভিউ সম্পাদনা করুন' : 'নতুন রিভিউ যুক্ত করুন'}
              </h3>
              <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
                কাস্টমারের নাম, ছবি, লোকেশন ও মন্তব্য লিখে হোম পেজে সরাসরি দেখান
              </p>
            </div>
            {editingReviewId && (
              <button 
                onClick={handleCancelEdit}
                className="text-[10px] font-black uppercase px-2.5 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-all"
              >
                বাতিল
              </button>
            )}
          </div>

          <form onSubmit={handleSubmitReviewForm} className="space-y-4">
            
            {/* Customer Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                <User size={12} className="text-rose-600" />
                কাস্টমার / ক্রেতার নাম *
              </label>
              <input
                type="text"
                required
                placeholder="যেমন: আফরিন আক্তার বা সায়মা শান্তা"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition-all"
              />
            </div>

            {/* Customer Photo / Avatar */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                <ImageIcon size={12} className="text-rose-600" />
                কাস্টমারের ছবি (Photo / Avatar)
              </label>

              {/* Avatar Preview + Upload Box */}
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-rose-300 bg-rose-50 shrink-0 shadow-sm flex items-center justify-center relative group">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarUrl('')}
                    />
                  ) : (
                    <User size={24} className="text-rose-400" />
                  )}
                </div>

                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[10.5px] font-black flex items-center gap-1.5 transition-all shadow-sm">
                      <Upload size={12} />
                      কম্পিউটার/মোবাইল থেকে ছবি আপলোড করুন
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageFileUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="অথবা ছবিতে লিংক (Image URL) পেস্ট করুন..."
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-[10.5px] font-medium focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Quick Preset Avatars */}
              <div className="space-y-1 pt-1">
                <span className="text-[9.5px] font-extrabold text-gray-400">অথবা প্রস্তুত ছবি থেকে একটা সিলেক্ট করুন:</span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {PRESET_AVATARS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAvatarUrl(url)}
                      className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all shrink-0 ${
                        avatarUrl === url ? 'border-rose-600 scale-110 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Location & Role/Badge */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                  <MapPin size={11} className="text-rose-600" />
                  অবস্থান (Location)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: উত্তরা, ঢাকা"
                  value={locationRole}
                  onChange={(e) => setLocationRole(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-brand-charcoal focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition-all shadow-xs"
                />
              </div>

              {/* Custom Role Badge Picker */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <ShieldCheck size={11} className="text-rose-600" />
                    পদবী / ট্যাগ (Role Badge)
                  </span>
                  <span className="text-[9.5px] text-rose-600 font-extrabold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                    {badgeRole}
                  </span>
                </label>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Verified Buyer',
                    'Premium Member',
                    'Regular Customer',
                    'VIP Customer',
                    'Fashion Enthusiast'
                  ].map((roleOption) => {
                    const isSelected = badgeRole === roleOption;
                    return (
                      <button
                        key={roleOption}
                        type="button"
                        onClick={() => {
                          setBadgeRole(roleOption);
                          setIsCustomBadgeMode(false);
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-[10.5px] font-black transition-all flex items-center gap-1 cursor-pointer ${
                          isSelected && !isCustomBadgeMode
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20 scale-[1.02]'
                            : 'bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-rose-600 border border-gray-200/80'
                        }`}
                      >
                        {isSelected && !isCustomBadgeMode && <Check size={11} className="stroke-[3]" />}
                        {roleOption}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomBadgeMode(true);
                      if (badgeRole === 'Verified Buyer') setBadgeRole('কাস্টম ট্যাগ');
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-[10.5px] font-black transition-all flex items-center gap-1 cursor-pointer ${
                      isCustomBadgeMode
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                    }`}
                  >
                    ✏️ কাস্টম পদবী
                  </button>
                </div>

                {/* Optional Custom Input */}
                {isCustomBadgeMode && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="pt-1"
                  >
                    <input
                      type="text"
                      placeholder="কাস্টম পদবী লিখুন (যেমন: সেরা ক্রেতা, ১০০০+ কেনাকাটা)..."
                      value={badgeRole}
                      onChange={(e) => setBadgeRole(e.target.value)}
                      className="w-full px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-xs font-bold text-brand-charcoal focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                    />
                  </motion.div>
                )}
              </div>
            </div>

            {/* Rating Stars */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">স্টার রেটিং (১ - ৫)</label>
              <div className="flex items-center gap-2 pt-1 bg-white p-2.5 rounded-xl border border-gray-200 w-fit">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className="hover:scale-125 transition-transform"
                  >
                    <Star 
                      size={22} 
                      fill={s <= rating ? "#fbbf24" : "none"} 
                      className={s <= rating ? "text-amber-400" : "text-gray-200"} 
                    />
                  </button>
                ))}
                <span className="text-xs font-extrabold text-brand-charcoal ml-2">{rating} Stars</span>
              </div>
            </div>

            {/* Product selection (Custom Visual Picker) */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Package size={12} className="text-rose-600" />
                  সংযুক্ত প্রোডাক্ট (Linked Product)
                </span>
                <span className="text-[9.5px] text-gray-400 font-extrabold">
                  {targetProductId === 'general' ? 'সাধারণ শপ রিভিউ' : 'নির্দিষ্ট প্রোডাক্ট রিভিউ'}
                </span>
              </label>

              {/* Selected Target Display Box */}
              {targetProductId === 'general' ? (
                <div className="p-3.5 bg-rose-50/80 border-2 border-dashed border-rose-200 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-rose-500 text-white rounded-xl shrink-0 shadow-sm">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-black text-brand-charcoal">✨ সাধারণ শপ রিভিউ (General Review)</div>
                      <div className="text-[10px] text-rose-700 font-bold">হোম পেজের "কাস্টমারদের ভালোবাসা" সেকশনে দেখাবে</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(true)}
                    className="px-3 py-1.5 bg-white text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white rounded-xl text-[10.5px] font-black transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1"
                  >
                    প্রোডাক্ট লিঙ্ক করুন
                    <ChevronDown size={12} />
                  </button>
                </div>
              ) : (() => {
                const linkedProduct = products.find(p => String(p.id) === String(targetProductId) || p.productCode === targetProductId);
                return (
                  <div className="p-3 bg-white border-2 border-rose-500 rounded-2xl flex items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {linkedProduct ? (
                        <>
                          <img 
                            src={linkedProduct.imageUrl} 
                            alt={linkedProduct.title} 
                            className="w-11 h-11 rounded-xl object-cover shrink-0 border border-gray-200"
                            referrerPolicy="no-referrer"
                          />
                          <div className="overflow-hidden">
                            <span className="text-[9px] bg-rose-100 text-rose-700 font-extrabold px-1.5 py-0.5 rounded">
                              কোড: {linkedProduct.productCode}
                            </span>
                            <div className="text-xs font-black text-brand-charcoal truncate mt-0.5">{linkedProduct.title}</div>
                            <div className="text-[10px] font-bold text-rose-600">৳{linkedProduct.price}</div>
                          </div>
                        </>
                      ) : (
                        <div className="text-xs font-bold text-gray-500">প্রোডাক্ট সিলেক্টেড (ID: {targetProductId})</div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsProductModalOpen(true)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[10.5px] font-black transition-all shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      বদলাুন
                      <ChevronDown size={12} />
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Comment Textarea */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">রিভিউয়ের মন্তব্য (Review Comment) *</label>
              <textarea
                required
                rows={3}
                placeholder="কাস্টমারের দেওয়া রিভিউ এখানে বিস্তারিত লিখুন..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition-all resize-none"
              />
            </div>

            {/* Custom Date (Optional) */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">তারিখ (Optional)</label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-brand-charcoal hover:bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={13} />
              )}
              {editingReviewId ? 'রিভিউ সেভ করুন (Save Edit)' : 'হোম পেজে পাবলিশ করুন (Publish Review)'}
            </button>
          </form>
        </div>

        {/* Right Side: Reviews List & Management */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Filter Bar */}
          <div className="bg-[#fafafa] border border-gray-200 p-4 rounded-3xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-rose-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-brand-charcoal">
                  রিভিউ তালিকা ({filteredReviews.length})
                </h4>
              </div>

              {/* Interactive Custom Tab Pills for Filter */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setViewFilterMode('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                    viewFilterMode === 'all'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                      : 'bg-white text-gray-700 hover:bg-rose-50 border border-gray-200'
                  }`}
                >
                  🌐 সব
                </button>

                <button
                  type="button"
                  onClick={() => setViewFilterMode('general')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                    viewFilterMode === 'general'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                      : 'bg-white text-gray-700 hover:bg-rose-50 border border-gray-200'
                  }`}
                >
                  ✨ সাধারণ শপ
                </button>

                <button
                  type="button"
                  onClick={() => setIsFilterModalOpen(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                    viewFilterMode !== 'all' && viewFilterMode !== 'general'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                      : 'bg-white text-gray-700 hover:bg-rose-50 border border-gray-200'
                  }`}
                >
                  📦 প্রোডাক্ট ভিত্তিক
                  <ChevronDown size={12} />
                </button>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="কাস্টমারের নাম, কমেন্ট বা প্রোডাক্ট দিয়ে খুঁজুন..."
                value={searchReviewQuery}
                onChange={(e) => setSearchReviewQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:outline-none"
              />
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            </div>
          </div>

          {/* Reviews List */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 no-scrollbar">
            {reviewsLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400 text-xs font-bold">
                <Loader2 size={22} className="animate-spin text-rose-600" />
                রিভিউ লোড হচ্ছে...
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="text-center py-16 text-xs font-bold text-gray-400 bg-gray-50 border border-gray-200/80 rounded-3xl p-6">
                কোনো রিভিউ পাওয়া যায়নি! বামপাশের ফর্ম থেকে নতুন রিভিউ যুক্ত করুন।
              </div>
            ) : (
              filteredReviews.map((rev) => {
                const avatar = rev.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(rev.customerName)}&background=f43f5e&color=fff&bold=true`;

                return (
                  <div 
                    key={rev.id || Math.random().toString()}
                    className="p-4 bg-white border border-gray-200 rounded-2xl space-y-3 shadow-sm hover:border-rose-300 transition-all relative group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-rose-200 shrink-0 bg-rose-50 shadow-sm">
                          <img 
                            src={avatar} 
                            alt={rev.customerName} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(rev.customerName)}&background=f43f5e&color=fff&bold=true`;
                            }}
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h5 className="text-xs font-black text-brand-charcoal">{rev.customerName}</h5>
                            <span className="text-[8px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.2 rounded-md font-black uppercase">
                              {rev.role || 'Verified Buyer'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[9.5px] text-gray-400 font-bold mt-0.5">
                            <span className="flex items-center gap-0.5">
                              <MapPin size={9} />
                              {rev.location || 'ঢাকা, বাংলাদেশ'}
                            </span>
                            <span>•</span>
                            <span>
                              {new Date(rev.createdAt).toLocaleDateString('bn-BD', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleStartEdit(rev)}
                          className="p-1.5 text-amber-600 hover:text-white bg-amber-50 hover:bg-amber-500 border border-amber-200 rounded-xl transition-all text-[10px] font-black flex items-center gap-1"
                          title="সম্পাদনা করুন"
                        >
                          <Edit2 size={11} />
                          এডিট
                        </button>

                        <button
                          onClick={() => setReviewToDelete(rev)}
                          className="p-1.5 text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 rounded-xl transition-all text-[10px] font-black flex items-center gap-1"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 size={11} />
                          মুছুন
                        </button>
                      </div>
                    </div>

                    {/* Rating stars & Product tag */}
                    <div className="flex items-center justify-between border-t border-b border-gray-100 py-2">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={12} 
                            fill={i < rev.rating ? "#fbbf24" : "none"} 
                            className={i < rev.rating ? "text-amber-400" : "text-gray-200"} 
                          />
                        ))}
                        <span className="text-[10px] font-extrabold text-brand-charcoal ml-1">{rev.rating}/5</span>
                      </div>

                      {rev.productName && (
                        <div className="text-[9.5px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-full border border-rose-100 flex items-center gap-1 max-w-[200px] truncate">
                          <Package size={10} className="shrink-0" />
                          <span className="truncate">{rev.productName}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs font-semibold text-gray-700 leading-relaxed italic bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                      "{rev.comment}"
                    </p>
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {reviewToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-50 rounded-2xl text-red-600">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black text-brand-charcoal">রিভিউ মুছে ফেলতে চান?</h3>
                  <p className="text-xs text-gray-400 font-semibold mt-0.5">এই অ্যাকশনটি সম্পন্ন হলে রিভিউটি ওয়েবসাইট ও ডাটাবেজ থেকে মুছে যাবে।</p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-gray-800">
                  <span>{reviewToDelete.customerName}</span>
                  <span className="text-[10px] text-gray-400">({reviewToDelete.location || 'ঢাকা'})</span>
                </div>
                <p className="text-gray-600 italic bg-white p-2.5 rounded-xl border border-gray-100">
                  "{reviewToDelete.comment}"
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={deletingInProgress}
                  onClick={() => setReviewToDelete(null)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer text-center"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  disabled={deletingInProgress}
                  onClick={handleDeleteReview}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-red-200 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {deletingInProgress ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Trash2 size={11} />
                  )}
                  নিশ্চিত মুছুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Visual Product Selector Modal for Form Link */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <Package size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-brand-charcoal">সংযুক্ত প্রোডাক্ট সিলেক্ট করুন</h3>
                    <p className="text-[10px] text-gray-400 font-bold">রিভিউটি কোনো নির্দিষ্ট প্রোডাক্ট নাকি সাধারণ শপ রিভিউ</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search Bar inside Modal */}
              <div className="p-4 border-b border-gray-100 bg-white">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="প্রোডাক্টের নাম বা কোড দিয়ে খুঁজুন..."
                    value={productModalSearch}
                    onChange={(e) => setProductModalSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500/20 focus:outline-none"
                  />
                  <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                </div>
              </div>

              {/* Options List */}
              <div className="p-4 overflow-y-auto space-y-2 flex-1 no-scrollbar">
                {/* General Option */}
                <button
                  type="button"
                  onClick={() => {
                    setTargetProductId('general');
                    setIsProductModalOpen(false);
                  }}
                  className={`w-full p-3.5 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    targetProductId === 'general'
                      ? 'border-rose-500 bg-rose-50/70 shadow-sm'
                      : 'border-gray-100 hover:border-rose-200 hover:bg-rose-50/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-rose-500 text-white rounded-xl shrink-0">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-black text-brand-charcoal">✨ সাধারণ শপ রিভিউ (General Store Review)</div>
                      <div className="text-[10.5px] text-rose-700 font-extrabold mt-0.5">সব প্রোডাক্টের সাধারণ কাস্টমার ফিডব্যাক</div>
                    </div>
                  </div>
                  {targetProductId === 'general' && (
                    <div className="p-1.5 bg-rose-600 text-white rounded-full">
                      <Check size={14} className="stroke-[3]" />
                    </div>
                  )}
                </button>

                <div className="text-[10px] font-black uppercase text-gray-400 px-1 pt-2">অথবা নির্দিষ্ট প্রোডাক্ট সিলেক্ট করুন:</div>

                {products
                  .filter(p => {
                    if (!productModalSearch.trim()) return true;
                    const search = productModalSearch.toLowerCase();
                    const titleMatch = (p.title || '').toLowerCase().includes(search);
                    const codeMatch = (p.productCode || '').toLowerCase().includes(search);
                    return titleMatch || codeMatch;
                  })
                  .map(p => {
                    const isSelected = String(targetProductId) === String(p.id) || targetProductId === p.productCode;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setTargetProductId(p.id || p.productCode);
                          setIsProductModalOpen(false);
                        }}
                        className={`w-full p-3 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? 'border-rose-500 bg-rose-50/80 shadow-sm'
                            : 'border-gray-100 hover:border-rose-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <img 
                            src={p.imageUrl} 
                            alt={p.title} 
                            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-200"
                            referrerPolicy="no-referrer"
                          />
                          <div className="overflow-hidden">
                            <span className="text-[9px] bg-rose-100 text-rose-700 font-extrabold px-1.5 py-0.5 rounded">
                              কোড: {p.productCode}
                            </span>
                            <div className="text-xs font-black text-brand-charcoal truncate mt-0.5">{p.title}</div>
                            <div className="text-[10px] text-rose-600 font-extrabold">৳{p.price}</div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="p-1.5 bg-rose-600 text-white rounded-full shrink-0">
                            <Check size={14} className="stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Filter Modal for Review List Header */}
      <AnimatePresence>
        {isFilterModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <Globe size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-brand-charcoal">রিভিউ ফিল্টার সিলেক্ট করুন</h3>
                    <p className="text-[10px] text-gray-400 font-bold">কোন প্রোডাক্টের রিভিউ দেখতে চান সিলেক্ট করুন</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsFilterModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-2 flex-1 no-scrollbar">
                <button
                  type="button"
                  onClick={() => {
                    setViewFilterMode('all');
                    setIsFilterModalOpen(false);
                  }}
                  className={`w-full p-3.5 rounded-2xl border-2 text-left font-black text-xs transition-all flex items-center justify-between cursor-pointer ${
                    viewFilterMode === 'all' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <span>🌐 সব রিভিউ দেখুন (All Reviews)</span>
                  {viewFilterMode === 'all' && <Check size={16} className="text-rose-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewFilterMode('general');
                    setIsFilterModalOpen(false);
                  }}
                  className={`w-full p-3.5 rounded-2xl border-2 text-left font-black text-xs transition-all flex items-center justify-between cursor-pointer ${
                    viewFilterMode === 'general' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <span>✨ সাধারণ শপ রিভিউ (General Store Reviews)</span>
                  {viewFilterMode === 'general' && <Check size={16} className="text-rose-600" />}
                </button>

                <div className="text-[10px] font-black uppercase text-gray-400 px-1 pt-2">প্রোডাক্ট ফিল্টার:</div>

                {products.map(p => {
                  const isSelected = String(viewFilterMode) === String(p.id) || viewFilterMode === p.productCode;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setViewFilterMode(p.id || p.productCode);
                        setIsFilterModalOpen(false);
                      }}
                      className={`w-full p-3 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected ? 'border-rose-500 bg-rose-50' : 'border-gray-100 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <img src={p.imageUrl} alt={p.title} className="w-10 h-10 rounded-xl object-cover shrink-0" referrerPolicy="no-referrer" />
                        <div className="overflow-hidden">
                          <span className="text-[9px] bg-rose-100 text-rose-700 font-extrabold px-1.5 py-0.5 rounded">
                            কোড: {p.productCode}
                          </span>
                          <div className="text-xs font-black text-brand-charcoal truncate">{p.title}</div>
                        </div>
                      </div>

                      {isSelected && <Check size={16} className="text-rose-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
