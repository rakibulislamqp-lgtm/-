import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Award, Crown, CheckCircle2, Sparkles, X, ArrowRight, Phone, RefreshCcw, Tag } from 'lucide-react';
import { getLoyaltyAccount, redeemPointsForCoupon, LoyaltyAccount } from '../services/loyaltyService';

interface LoyaltyRewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCoupon?: (couponCode: string, discountAmount: number) => void;
}

export default function LoyaltyRewardsModal({ isOpen, onClose, onApplyCoupon }: LoyaltyRewardsModalProps) {
  const [phoneInput, setPhoneInput] = useState('');
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [redeemSuccessMsg, setRedeemSuccessMsg] = useState<{ code: string; discount: number; msg: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSearchAccount = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = phoneInput.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর লিখুন।');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setRedeemSuccessMsg(null);

    try {
      const acc = await getLoyaltyAccount(cleanPhone);
      setAccount(acc);
      setSearched(true);
      if (!acc) {
        setErrorMsg('এই মোবাইল নম্বরে এখনো কোনো পয়েন্ট জমার রেকর্ড নেই। সেরা (Sera) তে কেনাকাটা করলেই অটোমেটিক পয়েন্ট জমা হবে! 🛍️');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('পয়েন্ট সার্চ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (pointsToRedeem: number) => {
    if (!account) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await redeemPointsForCoupon(account.phone, pointsToRedeem);
      if (res.success && res.couponCode) {
        setRedeemSuccessMsg({
          code: res.couponCode,
          discount: res.discountAmount || pointsToRedeem,
          msg: res.message
        });
        // Refresh account details
        const refreshed = await getLoyaltyAccount(account.phone);
        setAccount(refreshed);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'পয়েন্ট রিডিম করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] overflow-y-auto flex items-center justify-center p-4">
        <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white border border-slate-100 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative z-10 font-sans p-6"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-all cursor-pointer"
          >
            <X size={16} />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-tr from-amber-500 to-rose-500 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-amber-500/20 mb-2">
              <Crown size={24} />
            </div>
            <h2 className="text-xl font-black text-slate-900 font-serif">Sera VIP Loyalty Rewards</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              আপনার অর্জিত পয়েন্ট দিয়ে ইন্সট্যান্ট ক্যাশ ডিসকাউন্ট কুপন রিডিম করুন!
            </p>
          </div>

          {/* Search Phone Form */}
          <form onSubmit={handleSearchAccount} className="space-y-3 mb-6">
            <label className="text-xs font-bold text-slate-700 block text-left">
              মোবাইল নম্বর দিয়ে পয়েন্ট চেক করুন:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCcw className="animate-spin" size={14} /> : 'পয়েন্ট খুঁজুন'}
              </button>
            </div>
          </form>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium mb-4 text-left">
              {errorMsg}
            </div>
          )}

          {/* Success Redeem Banner */}
          {redeemSuccessMsg && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-emerald-50 border-2 border-emerald-300 text-emerald-900 rounded-2xl text-left mb-6 relative overflow-hidden"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5">
                  <Tag size={18} />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block">
                    কুপন সক্রিয় হয়েছে!
                  </span>
                  <p className="text-xs font-bold text-emerald-950 mt-0.5">{redeemSuccessMsg.msg}</p>
                  
                  <div className="mt-2.5 p-2 bg-white border border-emerald-200 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-mono font-black text-rose-600 tracking-wider">
                      {redeemSuccessMsg.code}
                    </span>
                    <span className="text-[10px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md">
                      ৳{redeemSuccessMsg.discount} ডিসকাউন্ট
                    </span>
                  </div>

                  {onApplyCoupon && (
                    <button
                      type="button"
                      onClick={() => {
                        onApplyCoupon(redeemSuccessMsg.code, redeemSuccessMsg.discount);
                        onClose();
                      }}
                      className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      কুপন অ্যাপ্লাই করে চেকআউট করুন <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Account Details View */}
          {searched && account && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Profile Card */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-2xl border border-indigo-900/50 relative overflow-hidden shadow-xl text-left">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">
                      {account.tier} MEMBER
                    </span>
                    <h3 className="text-lg font-black text-white mt-0.5">{account.customerName}</h3>
                    <p className="text-xs text-slate-300 font-mono">{account.phone}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">মোট পয়েন্ট</span>
                    <span className="text-2xl font-black text-amber-400 font-mono">{account.points}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">মোট কেনাকাটা:</span>
                    <span className="font-bold text-emerald-400 font-mono">৳{account.totalSpent}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">অর্ডার সংখ্যা:</span>
                    <span className="font-bold text-white font-mono">{account.ordersCount}টি</span>
                  </div>
                </div>
              </div>

              {/* Redemption Options */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Gift size={14} className="text-rose-500" />
                  পয়েন্ট রিডিম অফারসমূহ:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  <button
                    type="button"
                    disabled={account.points < 50 || loading}
                    onClick={() => handleRedeem(50)}
                    className="p-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-all disabled:opacity-40 cursor-pointer"
                  >
                    <span className="text-xs font-bold text-slate-800 block">৫০ পয়েন্ট = ৳৫০ ডিসকাউন্ট</span>
                    <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">ইন্সট্যান্ট কুপন পান</span>
                  </button>

                  <button
                    type="button"
                    disabled={account.points < 100 || loading}
                    onClick={() => handleRedeem(100)}
                    className="p-3 bg-gradient-to-r from-amber-500/10 to-rose-500/10 border border-amber-500/30 rounded-xl text-left transition-all disabled:opacity-40 cursor-pointer"
                  >
                    <span className="text-xs font-bold text-slate-900 block">১০০ পয়েন্ট = ৳১০০ ডিসকাউন্ট</span>
                    <span className="text-[10px] text-amber-600 font-bold block mt-0.5">সেরা অফার! 🔥</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Rule Notice */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-[10.5px] text-slate-400 font-medium leading-relaxed text-left">
            💡 <strong className="text-slate-600">নিয়মাবলী:</strong> প্রতি ৳১০০ কেনাকাটায় ১ পয়েন্ট যোগ হয়। অর্জিত পয়েন্ট রিডিম করে ডিসকাউন্ট কুপন তৈরি করতে পারবেন।
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
