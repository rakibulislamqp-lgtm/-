import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gift, Crown, CheckCircle2, Sparkles, X, ArrowRight, 
  Phone, RefreshCcw, Tag, Users, Share2, Copy, Check, MessageCircle, ExternalLink, Zap
} from 'lucide-react';
import { getLoyaltyAccount, redeemPointsForCoupon, LoyaltyAccount, generateReferralCodeForPhone } from '../services/loyaltyService';

interface LoyaltyRewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCoupon?: (couponCode: string, discountAmount: number) => void;
  initialTab?: 'points' | 'referral';
}

export default function LoyaltyRewardsModal({ 
  isOpen, 
  onClose, 
  onApplyCoupon,
  initialTab = 'referral'
}: LoyaltyRewardsModalProps) {
  const [activeTab, setActiveTab] = useState<'points' | 'referral'>(initialTab);
  const [phoneInput, setPhoneInput] = useState('');
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [redeemSuccessMsg, setRedeemSuccessMsg] = useState<{ code: string; discount: number; msg: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Autofill phone if customer is stored locally or logged in
  useEffect(() => {
    if (isOpen) {
      try {
        const savedRaw = localStorage.getItem('sera_saved_customer_profile');
        if (savedRaw) {
          const profile = JSON.parse(savedRaw);
          if (profile?.mobileNumber && !phoneInput) {
            setPhoneInput(profile.mobileNumber);
            handleSearchAccount(undefined, profile.mobileNumber);
          }
        }
      } catch (e) {}
    }
  }, [isOpen]);

  const handleSearchAccount = async (e?: React.FormEvent, customPhone?: string) => {
    if (e) e.preventDefault();
    const targetPhone = customPhone || phoneInput;
    const cleanPhone = targetPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর লিখুন।');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setRedeemSuccessMsg(null);

    try {
      const acc = await getLoyaltyAccount(cleanPhone, 'সম্মানিত গ্রাহক');
      setAccount(acc);
      setSearched(true);
      if (!acc) {
        setErrorMsg('এই মোবাইল নম্বরে এখনো কোনো রেকর্ড নেই। সেরা (Sera) তে অর্ডার করলেই অটোমেটিক পয়েন্ট ও রেফারেল বোনাস জমা হবে! 🛍️');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('সার্চ করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
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

  const currentReferralCode = account?.referralCode || (phoneInput.length >= 10 ? generateReferralCodeForPhone(phoneInput) : 'SERA-FRIEND');
  const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://serafashion.com';
  const referralShareLink = `${baseUrl}?ref=${currentReferralCode}`;

  const copyReferralCode = () => {
    navigator.clipboard.writeText(currentReferralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralShareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareViaWhatsApp = () => {
    const text = `আসসালামু আলাইকুম! সেরা ফ্যাশন (SERA FASHION) থেকে প্রিমিয়াম শাড়ি ও থ্রি-পিস কালেকশন অর্ডার করুন। আমার রেফারেল লিংক থেকে অর্ডার করলেই পাবেন সাথে সাথে ৳৫০ ছাড়! 🎁\n\nঅর্ডার লিংক: ${referralShareLink}\nঅথবা চেকআউটে রেফার কোড দিন: ${currentReferralCode}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] overflow-y-auto flex items-center justify-center p-3 sm:p-4">
        <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white border border-slate-100 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative z-10 font-sans p-5 sm:p-6 text-left max-h-[92vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-all cursor-pointer z-10"
          >
            <X size={16} />
          </button>

          {/* Top Tabs Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-5">
            <button
              type="button"
              onClick={() => setActiveTab('referral')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'referral'
                  ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users size={15} />
              <span>বন্ধু রেফার ও বোনাস</span>
              <span className="text-[9px] bg-white text-rose-600 font-extrabold px-1.5 py-0.2 rounded-full">৳১০০</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('points')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'points'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Crown size={15} className="text-amber-400" />
              <span>ভিআইপি পয়েন্ট ও রিওয়ার্ড</span>
            </button>
          </div>

          {/* TAB 1: REFERRAL PROGRAM (বন্ধু রেফার করুন ও বোনাস পান) */}
          {activeTab === 'referral' && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-tr from-amber-500 via-rose-500 to-pink-500 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-rose-500/20 mb-2">
                  <Gift size={24} />
                </div>
                <h2 className="text-xl font-black text-slate-900 font-serif">বন্ধু রেফার করুন এবং বোনাস পান</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  বন্ধুকে পাঠান ৳৫০ ছাড়, আর আপনার একাউন্টে নিন ৳১০০ ক্যাশ রিওয়ার্ড বোনাস!
                </p>
              </div>

              {/* Phone Form to get/view own code */}
              <form onSubmit={handleSearchAccount} className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  আপনার মোবাইল নম্বর লিখুন (রেফারেল লিংক পেতে):
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
                    className="bg-gradient-to-r from-amber-500 to-rose-600 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {loading ? <RefreshCcw className="animate-spin" size={14} /> : 'লিংক তৈরি করুন'}
                  </button>
                </div>
              </form>

              {/* Referral Code & Share Link Box */}
              {phoneInput.length >= 10 && (
                <div className="bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-transparent p-4 sm:p-5 rounded-2xl border border-amber-400/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">আপনার ইউনিক রেফার কোড</span>
                      <span className="text-lg font-mono font-black text-slate-900 tracking-wider">{currentReferralCode}</span>
                    </div>
                    <button
                      type="button"
                      onClick={copyReferralCode}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white border border-amber-300 text-amber-800 hover:bg-amber-50 rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                    >
                      {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      <span>{copiedCode ? 'কপি হয়েছে' : 'কোড কপি'}</span>
                    </button>
                  </div>

                  {/* Share Link input */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-600 block mb-1">সরাসরি শেয়ার লিংক:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={referralShareLink}
                        className="flex-1 bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono text-slate-700 select-all"
                      />
                      <button
                        type="button"
                        onClick={copyReferralLink}
                        className="px-3 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm cursor-pointer active:scale-95"
                      >
                        {copiedLink ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        <span>{copiedLink ? 'কপি' : 'লিংক'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 1-Click WhatsApp Share Button */}
                  <button
                    type="button"
                    onClick={shareViaWhatsApp}
                    className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <MessageCircle size={16} />
                    <span>বন্ধুদের হোয়াটসঅ্যাপে পাঠান (WhatsApp Share)</span>
                  </button>

                  {/* Live Stats if account exists */}
                  {account && (
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-amber-300/40 text-center">
                      <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200">
                        <span className="text-[10px] text-slate-500 font-bold block">সফল রেফারেল</span>
                        <span className="text-base font-black text-slate-900 font-mono">{account.referralsCount || 0} জন</span>
                      </div>
                      <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200">
                        <span className="text-[10px] text-slate-500 font-bold block">মোট বোনাস</span>
                        <span className="text-base font-black text-emerald-600 font-mono">৳{account.referralBonusEarned || 0}</span>
                      </div>
                      <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200">
                        <span className="text-[10px] text-slate-500 font-bold block">রিডিম ব্যালেন্স</span>
                        <span className="text-base font-black text-rose-600 font-mono">৳{account.referralBonusBalance || 0}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3 Step Visual Guide */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-500" />
                  কিভাবে রেফারেল বোনাস কাজ করে?
                </h4>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">১</span>
                    <p><strong className="text-slate-900">লিংক বা কোড শেয়ার করুন:</strong> বন্ধুদের সাথে আপনার ইউনিক রেফারেল লিংক পাঠান।</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">২</span>
                    <p><strong className="text-slate-900">বন্ধু পাবে ৳৫০ ছাড়:</strong> আপনার বন্ধু লিংকে ক্লিক করে প্রথম অর্ডারে সাথে সাথে ৳৫০ ছাড় পাবে।</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">৩</span>
                    <p><strong className="text-slate-900">আপনি পাবেন ৳১০০ ক্যাশ বোনাস:</strong> বন্ধুর ডেলিভারি সফল হতেই আপনার একাউন্টে ৳১০০ ক্যাশ রিওয়ার্ড জমা হবে!</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VIP LOYALTY & POINTS (পয়েন্ট চেক ও কুপন রিডিম) */}
          {activeTab === 'points' && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-tr from-amber-500 to-yellow-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-amber-500/20 mb-2">
                  <Crown size={24} />
                </div>
                <h2 className="text-xl font-black text-slate-900 font-serif">VIP Loyalty Points & Rewards</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  আপনার অর্জিত পয়েন্ট দিয়ে ইন্সট্যান্ট ক্যাশ ডিসকাউন্ট কুপন রিডিম করুন!
                </p>
              </div>

              {/* Search Phone Form */}
              <form onSubmit={handleSearchAccount} className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
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
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-slate-900 hover:bg-black text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loading ? <RefreshCcw className="animate-spin" size={14} /> : 'পয়েন্ট খুঁজুন'}
                  </button>
                </div>
              </form>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                  {errorMsg}
                </div>
              )}

              {/* Success Redeem Banner */}
              {redeemSuccessMsg && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-emerald-50 border-2 border-emerald-300 text-emerald-900 rounded-2xl relative overflow-hidden"
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
                          কুপন দিয়ে চেকআউট করুন <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Account Details View */}
              {searched && account && (
                <div className="space-y-4">
                  {/* Profile Card */}
                  <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-2xl border border-indigo-900/50 relative overflow-hidden shadow-xl">
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
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
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
                </div>
              )}

              {/* Rule Notice */}
              <div className="mt-4 pt-4 border-t border-slate-100 text-[10.5px] text-slate-400 font-medium leading-relaxed">
                💡 <strong className="text-slate-600">নিয়মাবলী:</strong> প্রতি ৳১০০ কেনাকাটায় ১ পয়েন্ট যোগ হয়। অর্জিত পয়েন্ট রিডিম করে ডিসকাউন্ট কুপন তৈরি করতে পারবেন।
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
