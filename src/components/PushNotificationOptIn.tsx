import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  isPushSupported, 
  getNotificationPermission, 
  requestPushPermission, 
  subscribeToPushCampaigns, 
  registerCurrentDeviceSubscription 
} from '../services/pushNotificationService';

const DISMISSED_KEY = 'sera_push_optin_dismissed_until';

export default function PushNotificationOptIn() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribedToast, setSubscribedToast] = useState(false);

  useEffect(() => {
    // 1. Subscribe to real-time broadcasts so this device receives any live notification
    const unsubscribe = subscribeToPushCampaigns((campaign) => {
      console.log('Push campaign received:', campaign.title);
    });

    // 2. Check if we should prompt the customer
    if (!isPushSupported()) return unsubscribe;

    const currentPerm = getNotificationPermission();
    if (currentPerm === 'granted') {
      // Auto-register subscription silently in background
      registerCurrentDeviceSubscription();
      return unsubscribe;
    }

    if (currentPerm === 'denied') {
      return unsubscribe;
    }

    // Check if dismissed recently
    try {
      const dismissedUntil = localStorage.getItem(DISMISSED_KEY);
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        return unsubscribe;
      }
    } catch (e) {}

    // Show after 18 seconds of browsing (polite & non-intrusive)
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 18000);

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const handleAllow = async () => {
    setIsSubscribing(true);
    try {
      const perm = await requestPushPermission();
      if (perm === 'granted') {
        setShowPrompt(false);
        setSubscribedToast(true);
        setTimeout(() => setSubscribedToast(false), 4000);
      } else {
        handleDismiss();
      }
    } catch (e) {
      handleDismiss();
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    try {
      // Don't ask again for 7 days
      localStorage.setItem(DISMISSED_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    } catch (e) {}
  };

  return (
    <>
      {/* Gentle Floating Opt-in Card */}
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-24 sm:bottom-6 left-4 sm:left-6 z-[80] max-w-sm w-[calc(100%-2rem)] sm:w-88 bg-slate-950/95 text-white backdrop-blur-xl border border-rose-500/30 rounded-3xl p-4 shadow-2xl shadow-black/60"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-900/40">
                <BellRing size={18} className="animate-pulse" />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                    <span>নতুন কালেকশন ও স্পেশাল অফার</span>
                    <Sparkles size={11} className="text-amber-400" />
                  </h4>
                  <button
                    onClick={handleDismiss}
                    className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                    title="বন্ধ করুন"
                  >
                    <X size={14} />
                  </button>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
                  সেরা ফ্যাশন হাউজের মেগা ডিসকাউন্ট, ফ্রি ডেলিভারি ও এক্সক্লুসিভ অফার সরাসরি ফোনের স্ক্রিনে পেতে চান?
                </p>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={handleAllow}
                    disabled={isSubscribing}
                    className="flex-1 py-2 px-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black text-[11px] rounded-xl shadow-md shadow-rose-900/30 transition-all cursor-pointer active:scale-95"
                  >
                    {isSubscribing ? 'চালু হচ্ছে...' : 'হ্যাঁ, চালু করুন 🔔'}
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="py-2 px-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-bold text-[11px] rounded-xl transition-all cursor-pointer"
                  >
                    পরে
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Confirmation Toast */}
      <AnimatePresence>
        {subscribedToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] max-w-sm w-[90%] bg-emerald-950/95 border border-emerald-500/40 text-emerald-100 p-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 backdrop-blur-md text-xs font-bold"
          >
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <span>ধন্যবাদ! স্পেশাল অফার ও নতুন ডিজাইনের নোটিফিকেশন আপনার ফোনে পৌঁছে যাবে।</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
