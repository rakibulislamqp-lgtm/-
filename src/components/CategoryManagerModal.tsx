import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Plus, Trash2, Tag, Layers, CheckCircle2, AlertCircle, 
  Sparkles, Loader2, ArrowRight, ShieldCheck, Box
} from 'lucide-react';
import { ProductCategoryItem } from '../types';
import { fetchAllCategories, addCustomCategory, removeCategory } from '../services/categoryService';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesChanged?: (categories: ProductCategoryItem[]) => void;
}

export default function CategoryManagerModal({
  isOpen,
  onClose,
  onCategoriesChanged
}: CategoryManagerModalProps) {
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCatName, setNewCatName] = useState('');
  const [newCatId, setNewCatId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const list = await fetchAllCategories();
      setCategories(list);
    } catch (err) {
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const name = newCatName.trim();
    if (!name) {
      setError('অনুগ্রহ করে ক্যাটাগরির নাম লিখুন');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await addCustomCategory(name, newCatId.trim() || undefined);
      setCategories(updated);
      setNewCatName('');
      setNewCatId('');
      setSuccess(`"${name}" ক্যাটাগরিটি সফলভাবে যোগ করা হয়েছে!`);
      if (onCategoriesChanged) onCategoriesChanged(updated);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err?.message || 'ক্যাটাগরি যোগ করতে সমস্যা হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`আপনি কি নিশ্চিত যে "${name}" ক্যাটাগরিটি ডিলিট করতে চান?`)) {
      return;
    }

    setDeletingId(id);
    setError(null);
    try {
      const updated = await removeCategory(id);
      setCategories(updated);
      setSuccess(`"${name}" ক্যাটাগরি সফলভাবে অপসারণ করা হয়েছে`);
      if (onCategoriesChanged) onCategoriesChanged(updated);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'ডিলিট করতে সমস্যা হয়েছে');
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden text-white my-auto"
      >
        {/* Header Ambient Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Layers size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>প্রোডাক্ট ক্যাটাগরি ম্যানেজমেন্ট</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ADMIN
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                নতুন ক্যাটাগরি যুক্ত করুন ও পরিচালনা করুন
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Notifications */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2"
              >
                <AlertCircle size={16} className="shrink-0 text-rose-400" />
                <span>{error}</span>
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2"
              >
                <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                <span>{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 1. Add New Category Form */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
              <Sparkles size={15} />
              <span>নতুন ক্যাটাগরি যুক্ত করুন</span>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">
                    ক্যাটাগরির নাম (প্রদর্শনের জন্য) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: লেহেঙ্গা (Lehenga), বোরকা (Abaya)"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/20 text-white placeholder-gray-500 text-xs font-bold focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">
                    ক্যাটাগরি আইডি / কোড (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: LEHENGA, ABAYA"
                    value={newCatId}
                    onChange={(e) => setNewCatId(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/20 text-white placeholder-gray-500 text-xs font-bold focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 tracking-wider transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting || !newCatName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>সংরক্ষণ হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={15} />
                      <span>ক্যাটাগরি যোগ করুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* 2. Current Categories List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-2">
                <Tag size={14} className="text-amber-400" />
                <span>বর্তমান সক্রিয় ক্যাটাগরিসমূহ ({categories.length})</span>
              </h4>
              <span className="text-[10.5px] text-gray-400">
                ৩ ডট মেনু ও প্রোডাক্ট শোকেসে স্বয়ংক্রিয়ভাবে দেখাবে
              </span>
            </div>

            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-gray-400">
                <Loader2 size={24} className="animate-spin text-amber-400" />
                <span className="text-xs">ক্যাটাগরি লোড হচ্ছে...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {categories.map((cat) => {
                  const isAll = cat.id === 'ALL';
                  const isSystemDefault = cat.isDefault || isAll;
                  return (
                    <div
                      key={cat.id}
                      className={`p-3 rounded-2xl flex items-center justify-between gap-3 border transition-all ${
                        isAll 
                          ? 'bg-amber-500/10 border-amber-500/30' 
                          : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-black ${
                          isAll 
                            ? 'bg-amber-400 text-slate-950 shadow-md' 
                            : 'bg-slate-800 text-amber-300 border border-white/10'
                        }`}>
                          <Box size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-white truncate">
                            {cat.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9.5px] font-mono font-semibold text-gray-400 tracking-wider">
                              ID: {cat.id}
                            </span>
                            {isSystemDefault ? (
                              <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-slate-800 text-gray-400 border border-white/10">
                                সিস্টেম
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                কাস্টম
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons (Cannot delete 'ALL') */}
                      {!isAll && (
                        <button
                          type="button"
                          disabled={deletingId === cat.id}
                          onClick={() => handleDelete(cat.id, cat.name)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors shrink-0 cursor-pointer"
                          title="ক্যাটাগরি মুছে ফেলুন"
                        >
                          {deletingId === cat.id ? (
                            <Loader2 size={15} className="animate-spin text-rose-400" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/60 flex items-center justify-between">
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>পরিবর্তন স্বয়ংক্রিয়ভাবে সংরক্ষিত ও ক্লাউডে সিঙ্ক হয়</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
          >
            সম্পন্ন
          </button>
        </div>

      </motion.div>
    </div>
  );
}
