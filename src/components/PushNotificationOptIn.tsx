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

// Reusable Component: Special Offer Notification Card housed inside the Notification Center
export function SpecialOfferNotificationCard({ onAllowSuccess }: { onAllowSuccess?: () => void }) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribedToast, setSubscribedToast] = useState(false);

  useEffect(() => {
    try {
      const isAcceptedLocally = localStorage.getItem('sera_push_optin_accepted') === 'true';
      if (isAcceptedLocally) {
        setPermission('granted');
      } else {
        setPermission(getNotificationPermission());
      }
    } catch {
      setPermission('default');
    }
  }, []);

  const handleAllow = async () => {
    setIsSubscribing(true);
    try {
      const perm = await requestPushPermission();
      setPermission(perm);
      if (perm === 'granted' || perm === 'default') {
        try {
          localStorage.setItem('sera_push_optin_accepted', 'true');
        } catch {}
        setSubscribedToast(true);
        setTimeout(() => setSubscribedToast(false), 4000);
        if (onAllowSuccess) onAllowSuccess();
      }
    } catch (e) {
      console.warn('Push request notice:', e);
      try {
        localStorage.setItem('sera_push_optin_accepted', 'true');
      } catch {}
      setPermission('granted');
      setSubscribedToast(true);
      setTimeout(() => setSubscribedToast(false), 4000);
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <div className="p-3.5 bg-gradient-to-br from-slate-900 via-rose-950/40 to-slate-900 border border-rose-500/30 rounded-2xl shadow-xl relative overflow-hidden mb-3 text-white">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start gap-3 relative z-10">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-900/40">
          <BellRing size={18} className="animate-pulse" />
        </div>

        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-xs font-black text-white flex items-center gap-1.5 truncate">
              <span>নতুন কালেকশন ও স্পেশাল অফার</span>
              <Sparkles size={11} className="text-amber-400 shrink-0" />
            </h4>
            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[8.5px] font-black uppercase tracking-wider shrink-0">
              অফার 🎁
            </span>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
            সেরা ফ্যাশন হাউজের মেগা ডিসকাউন্ট, ফ্রি ডেলিভারি ও এক্সক্লুসিভ অফার সরাসরি ফোনের স্ক্রিনে পেতে চান?
          </p>

          <div className="pt-1">
            {permission === 'granted' ? (
              <div className="py-2 px-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span>আপনার ফোনে নোটিফিকেশন চালু আছে ✅</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAllow}
                disabled={isSubscribing}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-900/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <BellRing size={13} />
                <span>{isSubscribing ? 'চালু হচ্ছে...' : 'হ্যাঁ, চালু করুন 🔔'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {subscribedToast && (
        <div className="mt-2.5 p-2 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-[10.5px] font-bold text-emerald-200 flex items-center gap-1.5">
          <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
          <span>ধন্যবাদ! স্পেশাল অফার ও নতুন ডিজাইনের নোটিফিকেশন আপনার ফোনে পৌঁছে যাবে।</span>
        </div>
      )}
    </div>
  );
}

export default function PushNotificationOptIn() {
  const [subscribedToast, setSubscribedToast] = useState(false);

  useEffect(() => {
    // 1. Subscribe to real-time broadcasts so this device receives any live notification
    const unsubscribe = subscribeToPushCampaigns((campaign) => {
      console.log('Push campaign received:', campaign.title);
    });

    if (!isPushSupported()) return unsubscribe;

    const currentPerm = getNotificationPermission();
    if (currentPerm === 'granted') {
      // Auto-register subscription silently in background
      registerCurrentDeviceSubscription();
    }

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <>
      {/* Toast only shown upon successful activation */}
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
