import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Upload, Image as ImageIcon, Check, RefreshCw, AlertCircle, Trash2, Bell, BellRing, Volume2, Send, Shield, ShieldAlert, ShieldCheck, BadgeHelp, Truck, Key, Lock, Building, Cpu, Target, Sparkles, Globe, Search, Copy, CheckCircle2, BarChart2, Video, Database, Share2, Eye, EyeOff, Flame, Layers } from 'lucide-react';
import { 
  getBrandSettings, 
  updateBrandSettings, 
  getBrandLogoSettings, 
  updateBrandLogoSettings,
  updateSpecificLogoSettings,
  resetSpecificLogoSettings,
  processLogoImageFile,
  LogoSlot 
} from '../services/settingsService';
import { uploadImage } from '../services/productService';
import { playNotificationSound, requestBrowserNotificationPermission, sendBrowserNotification } from '../services/notificationService';
import { getPixelLogs, clearPixelLogs, subscribePixelLogs, testPixelEvent, syncPixelFromSettings, PixelLogEntry } from '../services/pixelService';
import defaultLogo from '../assets/images/sfh_logo_1779435027377.png';
import { BrandSettings } from '../types';

// Modern Promise-based helper to read files safely
const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('ফাইল রিডার কোনো ডাটা পায়নি।'));
      }
    };
    reader.onerror = () => reject(new Error('ফাইল পড়তে সমস্যা হয়েছে।'));
    reader.readAsDataURL(file);
  });
};

// Modern Promise-based helper to load Image HTML elements safely without hanging on errors
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; 
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('ছবি লোড করা ব্যর্থ হয়েছে।'));
    img.src = src;
  });
};

const LOGO_SLOTS: Array<{
  id: LogoSlot;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  description: string;
  recommendedSize: string;
  shape: 'circle' | 'square';
}> = [
  {
    id: 'logoUrl',
    title: '১. মেইন হেডার ও ওয়েবসাইট লোগো',
    subtitle: 'Main Brand Logo',
    badge: 'মেইন লোগো',
    badgeColor: 'bg-amber-500/10 text-amber-700 border-amber-300',
    description: 'উপরে মূল হেডার বার, ৩-ডটের পাশের লোগো, মোবাইল নেভবার এবং পুরো ওয়েবসাইটের প্রধান আইডেন্টিটি হিসেবে ব্যবহৃত হয়।',
    recommendedSize: '500×500 px (স্বচ্ছ PNG বা JPG)',
    shape: 'circle'
  },
  {
    id: 'invoiceLogoUrl',
    title: '২. ডিজিটাল ইনভয়েস ও মেমো লোগো',
    subtitle: 'Invoice & Cash Memo Logo',
    badge: 'ইনভয়েস প্রিন্ট',
    badgeColor: 'bg-emerald-500/10 text-emerald-700 border-emerald-300',
    description: 'অর্ডার সফল হলে কাস্টমার যে ডিজিটাল ইনভয়েস ও পিডিএফ মেমো পান এবং প্রিন্ট করা ডেলিভারি রসিদে প্রদর্শিত হয়।',
    recommendedSize: '300×300 px (স্বচ্ছ ব্যাকগ্রাউন্ড উপযোগী)',
    shape: 'circle'
  },
  {
    id: 'footerLogoUrl',
    title: '৩. ফুটার ব্র্যান্ড লোগো',
    subtitle: 'Footer Brand Logo',
    badge: 'ফুটার ডিসপ্লে',
    badgeColor: 'bg-purple-500/10 text-purple-700 border-purple-300',
    description: 'ওয়েবসাইটের একদম নিচে ডার্ক ফুটার সেকশনে কোম্পানির পরিচিতি ও স্লোগানের সাথে চমৎকারভাবে প্রদর্শিত হয়।',
    recommendedSize: '400×400 px (গোল্ডেন বা ব্রাইট ভ্যারিয়েন্ট)',
    shape: 'circle'
  },
  {
    id: 'heroLogoUrl',
    title: '৪. হোমপেজ হিরো শোপিস লোগো',
    subtitle: 'Hero Showcase Floating Emblem',
    badge: 'হিরো শোপিস',
    badgeColor: 'bg-rose-500/10 text-rose-700 border-rose-300',
    description: 'হোমপেজের কেন্দ্রস্থলে সোনালী ফ্রেমে বৃত্তাকার ডিসপ্লে ও লাক্সারি ঘূর্ণায়মান অ্যানিমেশন এমব্লেম হিসেবে ব্যবহৃত হয়।',
    recommendedSize: '500×500 px হাই-রেজুলেশন',
    shape: 'circle'
  },
  {
    id: 'socialLogoUrl',
    title: '৫. সোশ্যাল ফলো ও ফেসবুক পপআপ লোগো',
    subtitle: 'Social & Facebook Popup Logo',
    badge: 'সোশ্যাল পপআপ',
    badgeColor: 'bg-blue-500/10 text-blue-700 border-blue-300',
    description: 'ফেসবুক পেজ ফলো পপআপ ও সোশ্যাল মিডিয়া কানেক্টিভিটি কার্ডের কেন্দ্রবিন্দুতে গ্রাহকদের দৃষ্টি আকর্ষণ করে।',
    recommendedSize: '300×300 px স্কয়ার সাইজ',
    shape: 'circle'
  },
  {
    id: 'faviconUrl',
    title: '৬. ব্রাউজার ফেভিকন / ওয়েবসাইট আইকন',
    subtitle: 'Browser Favicon / Tab Icon',
    badge: 'ব্রাউজার ট্যাব',
    badgeColor: 'bg-indigo-500/10 text-indigo-700 border-indigo-300',
    description: 'গুগল ক্রোম, মজিলা ফায়ারফক্স ও সাফারির ব্রাউজার ট্যাবের ছোট আইকন হিসেবে গ্রাহকের স্ক্রিনে সার্বক্ষণিক দৃশ্যমান থাকে।',
    recommendedSize: '64×64 বা 128×128 px স্কয়ার পিএনজি',
    shape: 'square'
  }
];

export default function SettingsManager() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [useBase64, setUseBase64] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [copiedFeed, setCopiedFeed] = useState(false);
  const [copiedSitemap, setCopiedSitemap] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multi-Logo Management States
  const [uploadingSlot, setUploadingSlot] = useState<LogoSlot | null>(null);
  const [slotProgress, setSlotProgress] = useState<number>(0);
  const [activeLogoTab, setActiveLogoTab] = useState<'all' | LogoSlot>('all');
  const slotInputRefs = useRef<{ [key in LogoSlot]?: HTMLInputElement | null }>({});

  // Notification states
  const [settings, setSettings] = useState<BrandSettings>({
    logoUrl: '',
    facebookUrl: 'https://www.facebook.com/share/1aiFNcrxJm/',
    telegramToken: '',
    telegramChatId: '',
    soundEnabled: true,
    pushEnabled: true,
    orderNotificationEnabled: true,
    orderNotificationDisplayMode: 'popup_and_circle',
    orderNotificationDataSource: 'only_real',
    orderNotificationDuration: 5,
    orderNotificationInterval: 20,
    orderNotificationSize: 'compact',
    steadfastApiKey: '',
    steadfastSecretKey: '',
    steadfastMerchantId: '',
    pathaoClientId: '',
    pathaoClientSecret: '',
    pathaoUsername: '',
    pathaoPassword: '',
    pathaoStoreId: '',
    pathaoAccessToken: '',
    smsGateway: 'device',
    smsGreenwebToken: '',
    smsElitbuzzApiKey: '',
    smsElitbuzzSenderId: '',
    smsMimsmsApiKey: '',
    smsMimsmsSenderId: '',
    smsTwilioSid: '',
    smsTwilioAuthToken: '',
    smsTwilioFrom: '',
    metaPixelEnabled: true,
    metaPixelId: '',
    metaAccessToken: '',
    metaTestEventCode: '',
    metaAdvancedMatchingEnabled: true,
    googleTagManagerId: '',
    googleAnalyticsId: '',
    ga4ApiSecret: '',
    tiktokPixelEnabled: true,
    tiktokPixelId: '',
    microsoftClarityId: '',
    googleSearchConsoleCode: '',
    lookerStudioEnabled: true,
    lookerStudioApiKey: '',
  });
  const [pixelLogsState, setPixelLogsState] = useState<PixelLogEntry[]>(() => getPixelLogs());
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramTestStatus, setTelegramTestStatus] = useState<'success' | 'error' | null>(null);
  const [pushPermissionStatus, setPushPermissionStatus] = useState<string>('');

  // Steadfast Test Connection state
  const [testingSteadfast, setTestingSteadfast] = useState(false);
  const [steadfastTestStatus, setSteadfastTestStatus] = useState<{ success: boolean; balance?: number; message?: string } | null>(null);

  // Pathao Test Connection state
  const [testingPathao, setTestingPathao] = useState(false);
  const [pathaoTestStatus, setPathaoTestStatus] = useState<{ success: boolean; message?: string } | null>(null);

  const handleTestPathao = async () => {
    if (!settings.pathaoClientId || !settings.pathaoClientSecret || !settings.pathaoUsername || !settings.pathaoPassword) {
      alert("অনুগ্রহ করে কুরিয়ার সেটিংস টেস্ট করার জন্য Client ID, Client Secret, Username এবং Password বসান।");
      return;
    }
    setTestingPathao(true);
    setPathaoTestStatus(null);
    try {
      const response = await fetch("/api/pathao/check-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          clientId: settings.pathaoClientId.trim(),
          clientSecret: settings.pathaoClientSecret.trim(),
          username: settings.pathaoUsername.trim(),
          password: settings.pathaoPassword.trim(),
          storeId: (settings.pathaoStoreId || '').trim()
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setPathaoTestStatus({
          success: true,
          message: data.message || "Connection successful!"
        });
      } else {
        setPathaoTestStatus({
          success: false,
          message: data.message || "კავშირი ვერ დამყარდა. Incorrect credentials."
        });
      }
    } catch (err: any) {
      console.error("Error testing Pathao Connection:", err);
      setPathaoTestStatus({
        success: false,
        message: err.message || "Network issue connecting to pathao."
      });
    } finally {
      setTestingPathao(false);
    }
  };

  const handleTestSteadfast = async () => {
    if (!settings.steadfastApiKey || !settings.steadfastSecretKey) {
      alert("অনুগ্রহ করে কুরিয়ার সেটিংস টেস্ট করার জন্য API Key এবং Secret Key বসান।");
      return;
    }
    setTestingSteadfast(true);
    setSteadfastTestStatus(null);
    try {
      const response = await fetch("/api/steadfast/check-balance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          apiKey: settings.steadfastApiKey.trim(),
          secretKey: settings.steadfastSecretKey.trim()
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSteadfastTestStatus({
          success: true,
          balance: data.balance
        });
      } else {
        setSteadfastTestStatus({
          success: false,
          message: data.message || "Connection failed. Please check your credentials."
        });
      }
    } catch (err: any) {
      console.error("Error testing SteadFast Connection:", err);
      setSteadfastTestStatus({
        success: false,
        message: err.message || "Could not connect to the proxy service."
      });
    } finally {
      setTestingSteadfast(false);
    }
  };

  useEffect(() => {
    const unsubLogs = subscribePixelLogs(setPixelLogsState);
    async function loadSettings() {
      try {
        const fullSettings = await getBrandSettings();
        if (fullSettings) {
          setSettings({
            ...fullSettings,
            facebookUrl: fullSettings.facebookUrl || 'https://www.facebook.com/share/1aiFNcrxJm/',
            orderNotificationEnabled: fullSettings.orderNotificationEnabled !== false,
            orderNotificationDisplayMode: fullSettings.orderNotificationDisplayMode || 'popup_and_circle',
            orderNotificationDataSource: fullSettings.orderNotificationDataSource || 'only_real',
            orderNotificationDuration: fullSettings.orderNotificationDuration || 5,
            orderNotificationInterval: fullSettings.orderNotificationInterval || 20,
            orderNotificationSize: fullSettings.orderNotificationSize || 'compact',
          });
          setLogoUrl(fullSettings.logoUrl || defaultLogo);
          syncPixelFromSettings(fullSettings);
        } else {
          setLogoUrl(defaultLogo);
        }

        if ('Notification' in window) {
          setPushPermissionStatus(Notification.permission);
        } else {
          setPushPermissionStatus('unsupported');
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
    return () => unsubLogs();
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'শুধুমাত্র ছবি (Image) ফাইল আপলোড করতে পারবেন।' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'ফাইলের সাইজ অনেক বড় (সর্বোচ্চ ৫ মেগাবাইট)।' });
      return;
    }

    setIsUploading(true);
    setProgress(5);
    setMessage(null);

    // If useBase64 (Internal Mode) is selected
    if (useBase64) {
      try {
        setProgress(25);
        const dataUrl = await readFileAsDataURL(file);
        setProgress(50);
        
        const img = await loadImage(dataUrl);
        setProgress(70);

        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 500; 
        
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const mimeType = file.type || 'image/png';
        const quality = mimeType === 'image/jpeg' ? 0.7 : undefined;
        const base64 = canvas.toDataURL(mimeType, quality);
        
        setProgress(85);
        await updateBrandLogoSettings(base64);
        setProgress(100);
        
        setLogoUrl(base64);
        setSettings(prev => ({ ...prev, logoUrl: base64 }));
        setMessage({ type: 'success', text: 'লোগো সফলভাবে ইন্টারনাল মোডে আপলোড এবং আপডেট করা হয়েছে!' });
      } catch (err: any) {
        console.error('Failed to save base64 logo:', err);
        setMessage({ type: 'error', text: `লোগো সেভ করা ব্যর্থ হয়েছে: ${err.message || err}` });
      } finally {
        setIsUploading(false);
      }
      return;
    }

    // Try Cloud Mode (Standard Storage Upload)
    try {
      setProgress(15);
      const downloadUrl = await uploadImage(file, (pct) => {
        setProgress(Math.round(15 + (pct * 0.7)));
      });

      setProgress(90);
      await updateBrandLogoSettings(downloadUrl);
      setProgress(100);
      
      setLogoUrl(downloadUrl);
      setSettings(prev => ({ ...prev, logoUrl: downloadUrl }));
      setMessage({ type: 'success', text: 'লোগো সফলভাবে ক্লাউড মোডে আপলোড এবং আপডেট করা হয়েছে!' });
    } catch (error) {
      console.warn('Failed to upload via Cloud Storage. Falling back to Internal Mode...', error);
      setMessage({ type: 'success', text: 'ক্লাউড লিমিটের কারণে লোগোকে অপ্টিমাইজ ক্যানভাস প্রসেসে সেভ করা হচ্ছে...' });
      
      try {
        setProgress(40);
        const dataUrl = await readFileAsDataURL(file);
        setProgress(65);
        
        const img = await loadImage(dataUrl);
        setProgress(80);

        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 500;
        
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const mimeType = file.type || 'image/png';
        const quality = mimeType === 'image/jpeg' ? 0.7 : undefined;
        const base64 = canvas.toDataURL(mimeType, quality);
        
        setProgress(95);
        await updateBrandLogoSettings(base64);
        setProgress(100);
        
        setLogoUrl(base64);
        setSettings(prev => ({ ...prev, logoUrl: base64 }));
        setMessage({ type: 'success', text: 'লোগোটি অত্যন্ত সফলভাবে রিমোট ডেটাবেজে ব্যাকআপ সহ আপডেট করা হয়েছে!' });
      } catch (fallbackErr: any) {
        console.error('All backup upload modes failed:', fallbackErr);
        setMessage({ type: 'error', text: `লোগো আপলোড করা ব্যর্থ হয়েছে: ${fallbackErr.message || fallbackErr}` });
      } finally {
        setIsUploading(false);
      }
    } finally {
      setTimeout(() => setIsUploading(false), 500);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const handleReset = async () => {
    if (window.confirm('আপনি কি সত্যিই লোগোটি রিমুভ করে ডিফল্ট ক্লাসিক লোগোতে ফিরে যেতে চান?')) {
      setIsLoading(true);
      try {
        await updateBrandLogoSettings(''); 
        setLogoUrl(defaultLogo);
        setSettings(prev => ({ ...prev, logoUrl: '' }));
        setMessage({ type: 'success', text: 'লোগো সফলভাবে রিমুভ করা হয়েছে এবং ডিফল্ট লোগো সেট করা হয়েছে।' });
      } catch (error) {
        console.error('Reset failed:', error);
        setMessage({ type: 'error', text: 'ডিফল্ট লোগোতে রিমুভ করা ব্যর্থ হয়েছে।' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const getSlotDisplayUrl = (slotId: LogoSlot): { url: string; isCustom: boolean } => {
    const customVal = settings[slotId];
    if (customVal && typeof customVal === 'string' && customVal.trim() !== '') {
      return { url: customVal, isCustom: true };
    }
    const mainVal = settings.logoUrl || logoUrl || defaultLogo;
    return { url: mainVal, isCustom: false };
  };

  const handleSlotFileChange = async (slot: LogoSlot, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'শুধুমাত্র ছবি (JPG, PNG, WEBP) ফাইল আপলোড করতে পারবেন।' });
      return;
    }

    setUploadingSlot(slot);
    setSlotProgress(25);
    setMessage(null);

    try {
      setSlotProgress(60);
      const base64Url = await processLogoImageFile(file);
      setSlotProgress(85);
      await updateSpecificLogoSettings(slot, base64Url);
      
      setSettings(prev => ({
        ...prev,
        [slot]: base64Url
      }));

      if (slot === 'logoUrl') {
        setLogoUrl(base64Url);
      }

      setSlotProgress(100);
      setMessage({ 
        type: 'success', 
        text: 'লোগো সফলভাবে গ্যালারি থেকে আপলোড ও সেভ হয়েছে এবং পুরো সাইটে কার্যকর হয়েছে!' 
      });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      console.error(`Failed to upload ${slot}:`, err);
      setMessage({ type: 'error', text: err.message || 'লোগো আপলোড করতে সমস্যা হয়েছে।' });
    } finally {
      setUploadingSlot(null);
      setSlotProgress(0);
      if (slotInputRefs.current[slot]) {
        slotInputRefs.current[slot]!.value = '';
      }
    }
  };

  const handleSlotReset = async (slot: LogoSlot) => {
    const isMain = slot === 'logoUrl';
    const msg = isMain
      ? 'আপনি কি মূল লোগো রিসেট করে অরিজিনাল ক্লাসিক লোগোতে ফেরত যেতে চান?'
      : 'আপনি কি এই কাস্টম লোগোটি সরিয়ে দিয়ে মূল ব্র্যান্ড লোগো (Main Logo) ব্যবহার করতে চান?';
    
    if (!window.confirm(msg)) return;

    setIsLoading(true);
    try {
      await resetSpecificLogoSettings(slot);
      setSettings(prev => ({
        ...prev,
        [slot]: ''
      }));
      if (isMain) {
        setLogoUrl(defaultLogo);
      }
      setMessage({ type: 'success', text: 'লোগো সফলভাবে রিসেট করা হয়েছে।' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(`Failed to reset ${slot}:`, err);
      setMessage({ type: 'error', text: 'লোগো রিসেট করতে সমস্যা হয়েছে।' });
    } finally {
      setIsLoading(false);
    }
  };

  // Notification Control logic
  const handleSaveNotificationSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setMessage(null);
    try {
      await updateBrandSettings({
        facebookUrl: settings.facebookUrl,
        telegramToken: settings.telegramToken,
        telegramChatId: settings.telegramChatId,
        soundEnabled: settings.soundEnabled,
        pushEnabled: settings.pushEnabled,
        orderNotificationEnabled: settings.orderNotificationEnabled,
        orderNotificationDisplayMode: settings.orderNotificationDisplayMode,
        orderNotificationDataSource: settings.orderNotificationDataSource,
        orderNotificationDuration: settings.orderNotificationDuration,
        orderNotificationInterval: settings.orderNotificationInterval,
        orderNotificationSize: settings.orderNotificationSize || 'compact',
        steadfastApiKey: settings.steadfastApiKey,
        steadfastSecretKey: settings.steadfastSecretKey,
        steadfastMerchantId: settings.steadfastMerchantId,
        pathaoClientId: settings.pathaoClientId,
        pathaoClientSecret: settings.pathaoClientSecret,
        pathaoUsername: settings.pathaoUsername,
        pathaoPassword: settings.pathaoPassword,
        pathaoStoreId: settings.pathaoStoreId,
        pathaoAccessToken: settings.pathaoAccessToken,
        smsGateway: settings.smsGateway,
        smsGreenwebToken: settings.smsGreenwebToken,
        smsElitbuzzApiKey: settings.smsElitbuzzApiKey,
        smsElitbuzzSenderId: settings.smsElitbuzzSenderId,
        smsMimsmsApiKey: settings.smsMimsmsApiKey,
        smsMimsmsSenderId: settings.smsMimsmsSenderId,
        smsTwilioSid: settings.smsTwilioSid,
        smsTwilioAuthToken: settings.smsTwilioAuthToken,
        smsTwilioFrom: settings.smsTwilioFrom,
        metaPixelEnabled: settings.metaPixelEnabled,
        metaPixelId: settings.metaPixelId,
        metaAccessToken: settings.metaAccessToken,
        metaTestEventCode: settings.metaTestEventCode,
        metaAdvancedMatchingEnabled: settings.metaAdvancedMatchingEnabled,
        googleTagManagerId: settings.googleTagManagerId,
        googleAnalyticsId: settings.googleAnalyticsId,
        ga4ApiSecret: settings.ga4ApiSecret,
        tiktokPixelEnabled: settings.tiktokPixelEnabled,
        tiktokPixelId: settings.tiktokPixelId,
        microsoftClarityId: settings.microsoftClarityId,
        googleSearchConsoleCode: settings.googleSearchConsoleCode,
        lookerStudioEnabled: settings.lookerStudioEnabled,
        lookerStudioApiKey: settings.lookerStudioApiKey,
      });
      syncPixelFromSettings(settings);
      setMessage({ type: 'success', text: 'অভিনন্দন! আপনার সব সেটিংস (কুরিয়ার, নোটিফিকেশন ও পিক্সেল) সফলভাবে সেভ করা হয়েছে।' });
    } catch (err) {
      console.error("Failed to save notifications settings:", err);
      setMessage({ type: 'error', text: 'সেটিংস সেভ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRequestPushPermission = async () => {
    const granted = await requestBrowserNotificationPermission();
    if (granted) {
      setPushPermissionStatus('granted');
      sendBrowserNotification('🔔 নোটিফিকেশন সচল হয়েছে!', 'এখন থেকে আপনার ব্রাউজারে নতুন অর্ডারের ইনস্ট্যান্ট নোটিফিকেশন দেখা যাবে।');
    } else {
      setPushPermissionStatus(Notification.permission);
    }
  };

  const handleTestTelegram = async () => {
    if (!settings.telegramToken || !settings.telegramChatId) {
      alert("অনুগ্রহ করে প্রথমে নিচে বট টোকেন এবং চ্যাট আইডি টাইপ করুন।");
      return;
    }
    setTestingTelegram(true);
    setTelegramTestStatus(null);
    try {
      const url = `https://api.telegram.org/bot${settings.telegramToken.trim()}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: settings.telegramChatId.trim(),
          text: `🔔 *Sera - টেস্ট নোটিফিকেশন* 🔔\n\nঅভিনন্দন! আপনার ফোনে রিয়েল-টাইম অর্ডার নোটিফিকেশন অত্যন্ত সফলভাবে যুক্ত হয়েছে। 🚀\n\nএখন কাস্টমার পেজ থেকে কোনো অর্ডার সাবমিট করার সাথে সাথে আপনার ফোনে রিংটোন সহ বিস্তারিত মেসেজ চলে আসবে! 🎉`,
          parse_mode: 'Markdown',
        })
      });
      if (response.ok) {
        setTelegramTestStatus('success');
        playNotificationSound();
      } else {
        setTelegramTestStatus('error');
      }
    } catch (err) {
      console.error("Telegram testing failed:", err);
      setTelegramTestStatus('error');
    } finally {
      setTestingTelegram(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* 1. Main Header */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl">
            <Settings size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">ব্র্যান্ড ও নোটিফিকেশন সেটিংস (Settings)</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Control Brand Identity, Sounds & Real-Time Alerts</p>
          </div>
        </div>

        {/* Upload Mode Switcher inspired by ProductManager */}
        <div className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100/80 transition-colors p-2 px-3 rounded-2xl border border-gray-100 self-start md:self-auto">
          <span className={`w-2 h-2 rounded-full ${useBase64 ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
          <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 mr-2">লোগো মোড:</span>
          <button
            type="button"
            onClick={() => {
              setUseBase64(!useBase64);
              setMessage(null);
            }}
            className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-xl transition-all ${
              useBase64 
                ? 'bg-rose-600 text-white shadow-md' 
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {useBase64 ? '✓ Internal Mode' : 'Cloud Mode'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex items-center gap-2.5 p-4 rounded-2xl text-xs font-bold leading-relaxed border ${
              message.type === 'success' 
                ? 'bg-emerald-50/50 text-emerald-700 border-emerald-100' 
                : 'bg-rose-50/50 text-rose-700 border-rose-100'
            }`}
          >
            {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            <span>{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="bg-white p-12 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 text-gray-400">
          <RefreshCw className="animate-spin text-rose-500" size={24} />
          <span className="text-xs font-bold tracking-widest uppercase">লোডিং হচ্ছে... (Loading settings)</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Comprehensive Multi-Logo Gallery Manager */}
          <div className="lg:col-span-12 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-black text-[#1a1c2e] uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon size={18} className="text-amber-500" />
                  ব্র্যান্ড ও মাল্টি-লোগো গ্যালারি ম্যানেজার (Brand Logos & Badges)
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  এডমিন ড্যাশবোর্ড থেকে সরাসরি আপনার মোবাইল বা পিসির গ্যালারি থেকে ছবি সিলেক্ট করে ওয়েবসাইটের সকল স্থানের লোগো আপলোড ও পরিবর্তন করুন।
                </p>
              </div>

              {/* Quick Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveLogoTab('all')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeLogoTab === 'all'
                      ? 'bg-slate-900 text-amber-300 shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  সকল লোগো (৬টি)
                </button>
                {LOGO_SLOTS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveLogoTab(s.id)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                      activeLogoTab === s.id
                        ? 'bg-slate-900 text-amber-300 shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s.badge}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid of Logo Slots */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {LOGO_SLOTS.filter(s => activeLogoTab === 'all' || activeLogoTab === s.id).map((slot) => {
                const { url: displayUrl, isCustom } = getSlotDisplayUrl(slot.id);
                const isThisSlotUploading = uploadingSlot === slot.id;

                return (
                  <div 
                    key={slot.id}
                    className={`rounded-2xl p-5 border transition-all flex flex-col justify-between bg-gradient-to-b from-gray-50/50 to-white ${
                      isCustom 
                        ? 'border-amber-200 shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Hidden input for phone gallery or PC file selection */}
                    <input 
                      type="file"
                      ref={(el) => { slotInputRefs.current[slot.id] = el; }}
                      accept="image/*"
                      onChange={(e) => handleSlotFileChange(slot.id, e)}
                      className="hidden"
                      id={`logo-upload-${slot.id}`}
                    />

                    {/* Card Header */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${slot.badgeColor}`}>
                          {slot.badge}
                        </span>
                        {isCustom ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 size={11} className="text-emerald-600" />
                            কাস্টম সক্রিয়
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                            {slot.id === 'logoUrl' ? 'ডিফল্ট লোগো' : 'মেইন লোগো সিঙ্কড'}
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-gray-900 leading-snug">
                          {slot.title}
                        </h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          {slot.subtitle}
                        </p>
                      </div>

                      <p className="text-[11px] text-gray-600 leading-relaxed">
                        {slot.description}
                      </p>
                    </div>

                    {/* Logo Preview Stage */}
                    <div className="my-4 py-3 px-4 bg-gray-100/70 rounded-xl flex items-center justify-center border border-gray-200/60">
                      <div className="relative group">
                        <div className={`p-1 bg-black/90 shadow-md flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 ${
                          slot.shape === 'circle' 
                            ? 'rounded-full border-2 border-brand-gold w-20 h-20' 
                            : 'rounded-xl border-2 border-slate-700 w-16 h-16'
                        }`}>
                          <img 
                            src={displayUrl} 
                            alt={slot.title}
                            className={`w-full h-full object-cover ${slot.shape === 'circle' ? 'rounded-full' : 'rounded-lg'}`}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = defaultLogo;
                            }}
                          />
                        </div>

                        {isThisSlotUploading && (
                          <div className="absolute inset-0 bg-black/80 rounded-full flex items-center justify-center">
                            <RefreshCw size={20} className="animate-spin text-amber-400" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Upload progress if active */}
                    {isThisSlotUploading && (
                      <div className="mb-3 space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-amber-600">
                          <span>আপলোড ও কমপ্রেস হচ্ছে...</span>
                          <span>{slotProgress}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-amber-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${slotProgress}%` }}
                            transition={{ duration: 0.15 }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Recommended Size Note */}
                    <div className="text-[10px] text-gray-400 font-medium mb-3 flex items-center gap-1">
                      <Sparkles size={11} className="text-amber-500 shrink-0" />
                      <span>{slot.recommendedSize}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => slotInputRefs.current[slot.id]?.click()}
                        disabled={isThisSlotUploading}
                        className="flex-1 py-2.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                      >
                        <Upload size={13} strokeWidth={2.5} />
                        <span>গ্যালারি থেকে আপলোড</span>
                      </button>

                      {(isCustom || (slot.id === 'logoUrl' && displayUrl !== defaultLogo)) && (
                        <button
                          type="button"
                          onClick={() => handleSlotReset(slot.id)}
                          disabled={isThisSlotUploading}
                          title={slot.id === 'logoUrl' ? 'ডিফল্ট লোগোতে ফিরুন' : 'মেইন লোগোতে রিসেট করুন'}
                          className="p-2.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real-time Order Alerts Configuration Section */}
          <div className="lg:col-span-12 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
            
            <h3 className="text-sm font-black text-[#1a1c2e] uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-gray-50">
              <Bell size={16} className="text-rose-500 animate-bounce" />
              ফোনে নোটিফিকেশন ও অ্যালার্ট সেটিংস (Phone & Control Notifications)
            </h3>

            <form onSubmit={handleSaveNotificationSettings} className="space-y-6">
              
              {/* Local Browser Chimes and Popups checkboxes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Ringtone Switcher */}
                <div className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100/50 rounded-2xl border border-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                      <Volume2 size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">শব্দ সংকেত (Alert Sound)</h4>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">নতুন অর্ডার আসলে রিংটোন বাজবে</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => playNotificationSound()}
                      className="px-2.5 py-1.5 text-[9px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl uppercase tracking-widest transition-colors"
                    >
                      টেস্ট সাউন্ড
                    </button>
                    <input
                      type="checkbox"
                      checked={settings.soundEnabled !== false}
                      onChange={(e) => setSettings(prev => ({ ...prev, soundEnabled: e.target.checked }))}
                      className="accent-rose-600 w-5 h-5 rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* 2. Browser Push Popups */}
                <div className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100/50 rounded-2xl border border-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                      <Bell size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">ব্রাউজার পুশ (Browser Push)</h4>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">স্ক্রিনের উপরে সাথে সাথে অ্যালার্ট আসবে</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {pushPermissionStatus !== 'granted' && (
                      <button
                        type="button"
                        onClick={handleRequestPushPermission}
                        className="px-2.5 py-1.5 text-[9px] font-black text-white bg-black hover:bg-black/90 shadow-sm rounded-xl uppercase tracking-widest transition-all"
                      >
                        অনুমতি দিন
                      </button>
                    )}
                    <input
                      type="checkbox"
                      checked={settings.pushEnabled !== false}
                      onChange={(e) => setSettings(prev => ({ ...prev, pushEnabled: e.target.checked }))}
                      className="accent-rose-600 w-5 h-5 rounded cursor-pointer"
                    />
                  </div>
                </div>

              </div>

              {/* Customer Live Order Notification & Floating Control Panel */}
              <div className="bg-gradient-to-br from-amber-500/5 via-slate-900/[0.02] to-rose-500/5 p-5 md:p-6 rounded-3xl border-2 border-amber-400/30 space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-amber-300 p-[1.5px] shadow-md flex items-center justify-center shrink-0">
                      <div className="w-full h-full rounded-2xl bg-[#090d18] flex items-center justify-center text-amber-400">
                        <BellRing size={18} className="animate-pulse" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-900 tracking-wide flex items-center gap-2">
                        গ্রাহক লাইভ অর্ডার নোটিফিকেশন বার ও ফ্লোটিং কন্ট্রোল
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                          লাইভ শপ কন্ট্রোল
                        </span>
                      </h4>
                      <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                        ওয়েবসাইটে ক্রেতাদের সামনে ভেসে ওঠা নোটিফিকেশন বার, পপ-আপ ও ডানপাশের গোলাকার আইকন সম্পূর্ণ নিয়ন্ত্রণ করুন
                      </p>
                    </div>
                  </div>

                  {/* Master Switch */}
                  <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-gray-200 shadow-xs self-start sm:self-center">
                    <span className="text-xs font-black text-gray-700">
                      {settings.orderNotificationEnabled !== false ? '🟢 নোটিফিকেশন চালু' : '🔴 নোটিফিকেশন বন্ধ'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.orderNotificationEnabled !== false}
                        onChange={(e) => setSettings(prev => ({ ...prev, orderNotificationEnabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                </div>

                {settings.orderNotificationEnabled !== false ? (
                  <div className="space-y-5">
                    {/* 1. Display Mode Selection (Full Popup vs Circle Only vs Disabled) */}
                    <div>
                      <label className="text-[11px] font-black text-gray-700 uppercase tracking-wider block mb-2">
                        ১. নোটিফিকেশন ডিসপ্লে মোড (Display Style & Mode):
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Option 1: Popup Bar + Circle Badge */}
                        <div 
                          onClick={() => setSettings(prev => ({ ...prev, orderNotificationDisplayMode: 'popup_and_circle' }))}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                            (settings.orderNotificationDisplayMode || 'popup_and_circle') === 'popup_and_circle'
                              ? 'bg-amber-50/70 border-amber-500 shadow-sm ring-1 ring-amber-400/40'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input 
                              type="radio" 
                              name="notifDisplayMode"
                              checked={(settings.orderNotificationDisplayMode || 'popup_and_circle') === 'popup_and_circle'}
                              onChange={() => {}}
                              className="mt-1 accent-amber-600 cursor-pointer"
                            />
                            <div>
                              <h5 className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                                🌟 পপ-আপ ও গোলাকার আইকন উভয়ই (Popup + Circle)
                              </h5>
                              <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                                নতুন অর্ডার আসলে ডিসপ্লেতে ছোট স্লিম মিনি-ক্যাপসুল বার ভেসে উঠবে এবং ডানপাশের গোলাকার আইকনে সংখ্যা (১, ২...) বাড়বে।
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Option 2: Circle Badge Only (No popups) */}
                        <div 
                          onClick={() => setSettings(prev => ({ ...prev, orderNotificationDisplayMode: 'circle_badge_only' }))}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                            settings.orderNotificationDisplayMode === 'circle_badge_only'
                              ? 'bg-amber-50/70 border-amber-500 shadow-sm ring-1 ring-amber-400/40'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input 
                              type="radio" 
                              name="notifDisplayMode"
                              checked={settings.orderNotificationDisplayMode === 'circle_badge_only'}
                              onChange={() => {}}
                              className="mt-1 accent-amber-600 cursor-pointer"
                            />
                            <div>
                              <h5 className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                                🔘 শুধু গোলাকার আইকন ও সংখ্যা (Circular Orb Only - No Popup)
                              </h5>
                              <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                                ডিসপ্লেতে কোনো পপ-আপ বার আসবে না! শুধু ডান সাইডে প্রিমিয়াম গোলাকার চিহ্ন ও নোটিফিকেশনের সংখ্যা দেখা যাবে। কাস্টমার ক্লিক করে লাইভ অর্ডার দেখতে পারবেন।
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. Customer Data Source: Real Only vs Mixed */}
                    <div>
                      <label className="text-[11px] font-black text-gray-700 uppercase tracking-wider block mb-2">
                        ২. অর্ডার ডাটা সোর্স (Customer Notification Filter):
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Option A: Only Real Customers */}
                        <div 
                          onClick={() => setSettings(prev => ({ ...prev, orderNotificationDataSource: 'only_real' }))}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                            (settings.orderNotificationDataSource || 'only_real') === 'only_real'
                              ? 'bg-emerald-50/70 border-emerald-500 shadow-sm ring-1 ring-emerald-400/40'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input 
                              type="radio" 
                              name="notifDataSource"
                              checked={(settings.orderNotificationDataSource || 'only_real') === 'only_real'}
                              onChange={() => {}}
                              className="mt-1 accent-emerald-600 cursor-pointer"
                            />
                            <div>
                              <h5 className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                                🛍️ শুধুমাত্র আসল ক্রেতাদের অর্ডার (Only Real Customers)
                              </h5>
                              <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                                যারা ওয়েবসাইট থেকে রিয়েল কেনাকাটা করেছে এবং নতুন অর্ডার দিচ্ছে শুধুমাত্র তাদের নাম, জেলা ও প্রোডাক্ট ডিসপ্লেতে আসবে।
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Option B: Mixed */}
                        <div 
                          onClick={() => setSettings(prev => ({ ...prev, orderNotificationDataSource: 'mixed' }))}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                            settings.orderNotificationDataSource === 'mixed'
                              ? 'bg-emerald-50/70 border-emerald-500 shadow-sm ring-1 ring-emerald-400/40'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input 
                              type="radio" 
                              name="notifDataSource"
                              checked={settings.orderNotificationDataSource === 'mixed'}
                              onChange={() => {}}
                              className="mt-1 accent-emerald-600 cursor-pointer"
                            />
                            <div>
                              <h5 className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                                ⚡ আসল ও স্মার্ট ভেরিফাইড অর্ডার (Real + Verified System)
                              </h5>
                              <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                                আসল ক্রেতাদের অর্ডারের পাশাপাশি সিস্টেমের ভেরিফাইড অর্ডারগুলোও সোশ্যাল প্রুফ হিসেবে সুন্দরভাবে ঘুরবে।
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. Notification Size Selection */}
                    <div>
                      <label className="text-[11px] font-black text-gray-700 uppercase tracking-wider block mb-2">
                        ৩. নোটিফিকেশন পপ-আপ সাইজ (Popup Size):
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div 
                          onClick={() => setSettings(prev => ({ ...prev, orderNotificationSize: 'compact' }))}
                          className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                            (settings.orderNotificationSize || 'compact') === 'compact'
                              ? 'bg-amber-50/70 border-amber-500 shadow-sm ring-1 ring-amber-400/40'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input 
                              type="radio" 
                              name="notifSize"
                              checked={(settings.orderNotificationSize || 'compact') === 'compact'}
                              onChange={() => {}}
                              className="mt-1 accent-amber-600 cursor-pointer"
                            />
                            <div>
                              <h5 className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                                📱 ছোট / মিনি সাইজ (Compact Mini - প্রস্তাবিত)
                              </h5>
                              <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                                অত্যন্ত স্লিম ও ছোট যা মোবাইল স্ক্রিনের বাটন ব্লক করে না এবং দেখতে পরিচ্ছন্ন ও প্রফেশনাল লাগে।
                              </p>
                            </div>
                          </div>
                        </div>

                        <div 
                          onClick={() => setSettings(prev => ({ ...prev, orderNotificationSize: 'standard' }))}
                          className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                            settings.orderNotificationSize === 'standard'
                              ? 'bg-amber-50/70 border-amber-500 shadow-sm ring-1 ring-amber-400/40'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input 
                              type="radio" 
                              name="notifSize"
                              checked={settings.orderNotificationSize === 'standard'}
                              onChange={() => {}}
                              className="mt-1 accent-amber-600 cursor-pointer"
                            />
                            <div>
                              <h5 className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                                💻 স্ট্যান্ডার্ড সাইজ (Standard Size)
                              </h5>
                              <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                                সাধারণ সাইজ, যা টেক্সট এবং প্রোডাক্টের ছবি একটু বড় আকারে প্রদর্শন করে।
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 4. Duration & Interval Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="bg-white p-3.5 rounded-2xl border border-gray-200">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-wider block mb-1">
                          পপ-আপ প্রদর্শনের সময় (Popup Duration):
                        </label>
                        <select
                          value={settings.orderNotificationDuration || 5}
                          onChange={(e) => setSettings(prev => ({ ...prev, orderNotificationDuration: Number(e.target.value) }))}
                          className="w-full px-3 py-2 bg-gray-50 text-xs font-bold text-gray-800 rounded-xl border border-gray-200 focus:outline-none focus:border-amber-400 cursor-pointer"
                        >
                          <option value={3}>৩ সেকেন্ড (খুব দ্রুত)</option>
                          <option value={4}>৪ সেকেন্ড</option>
                          <option value={5}>৫ সেকেন্ড (প্রস্তাবিত)</option>
                          <option value={7}>৭ সেকেন্ড</option>
                        </select>
                      </div>

                      <div className="bg-white p-3.5 rounded-2xl border border-gray-200">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-wider block mb-1">
                          কতক্ষণ পর পর আসবে (Interval Delay):
                        </label>
                        <select
                          value={settings.orderNotificationInterval || 20}
                          onChange={(e) => setSettings(prev => ({ ...prev, orderNotificationInterval: Number(e.target.value) }))}
                          className="w-full px-3 py-2 bg-gray-50 text-xs font-bold text-gray-800 rounded-xl border border-gray-200 focus:outline-none focus:border-amber-400 cursor-pointer"
                        >
                          <option value={15}>১৫ সেকেন্ড পর পর</option>
                          <option value={20}>২০ সেকেন্ড পর পর (প্রস্তাবিত)</option>
                          <option value={30}>৩০ সেকেন্ড পর পর</option>
                          <option value={45}>৪৫ সেকেন্ড পর পর</option>
                        </select>
                      </div>
                    </div>

                    {/* 4. Live Mini Visual Preview */}
                    <div className="bg-slate-900 p-4 rounded-2xl border border-amber-400/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                          কাস্টমার ডিসপ্লে প্রিভিউ (Ultra-Compact Live Preview):
                        </span>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          {settings.orderNotificationDisplayMode === 'circle_badge_only' 
                            ? 'বর্তমানে শুধুমাত্র ডান পাশের গোল আইকন ও সংখ্যা দেখাবে, স্ক্রিনে কোনো পপ-আপ আসবে না।'
                            : 'নতুন ছোট ও স্লিম লাক্সারি ক্যাপসুল সাইজ যা মোবাইলে খুবই কম জায়গা নেয় এবং সুন্দর দেখায়।'}
                        </p>
                      </div>

                      {/* Mini visual mockup */}
                      <div className="flex items-center gap-2 shrink-0">
                        {settings.orderNotificationDisplayMode !== 'circle_badge_only' && (
                          <div className="w-[210px] bg-[#0c1222] border border-amber-400/40 rounded-xl p-2 flex items-center gap-2 shadow-lg">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 p-[1px] shrink-0">
                              <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-[8px] font-bold text-white">
                                👗
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[9.5px] font-black text-amber-300 leading-tight truncate">
                                ● সুমাইয়া (মিরপুর)
                              </p>
                              <p className="text-[8.5px] text-slate-300 leading-tight truncate">
                                থ্রি-পিস • ৳১,৮৫০
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 p-[1.5px] relative shadow-md">
                          <div className="w-full h-full rounded-full bg-[#080c16] flex items-center justify-center text-amber-400">
                            <BellRing size={13} />
                          </div>
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-600 text-white rounded-full text-[7.5px] font-bold flex items-center justify-center border border-[#080c16]">
                            ১
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-center text-gray-500 text-xs font-semibold">
                    🚫 গ্রাহক লাইভ অর্ডার নোটিফিকেশন সিস্টেম সম্পূর্ণ বন্ধ রয়েছে। চালু করতে উপরের সুইচ অন করুন।
                  </div>
                )}
              </div>

              {/* Facebook Page Link Settings */}
              <div className="bg-gradient-to-tr from-[#1877F2]/5 via-white to-[#1877F2]/10 p-5 rounded-3xl border border-[#1877F2]/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#1877F2] text-white rounded-2xl shadow-md shrink-0">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">ফেসবুক পেজ সেটিংস (Facebook Page Link)</h4>
                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">অর্ডার ফর্মের ভাসমান ফেসবুক আইকনে ক্লিক করলে এই পেজে নিয়ে যাবে</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    ফেসবুক পেজ লিংক (Facebook Page URL):
                  </label>
                  <input
                    type="url"
                    placeholder="যেমন: https://www.facebook.com/serafashionhouse.bd"
                    value={settings.facebookUrl || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, facebookUrl: e.target.value }))}
                    className="w-full px-4 py-3 bg-white text-gray-800 placeholder-gray-400 font-mono text-xs rounded-2xl border border-blue-100 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Telegram Phone Push Integration Card */}
              <div className="bg-gradient-to-tr from-sky-50/40 via-white to-indigo-50/20 p-5 rounded-3xl border border-sky-100 space-y-6">
                
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-sky-500 text-white rounded-2xl shadow-md shadow-sky-500/10">
                      <Send size={18} className="transform -rotate-12 translate-x-0.5 -translate-y-0.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-sky-900 uppercase tracking-wider">টেলিগ্রাম ইনস্ট্যান্ট অ্যালার্ট (Telegram Phone Alerts)</h4>
                      <p className="text-[10px] text-sky-600 font-bold">কাস্টমার অর্ডার করা মাত্র ফোনে রিয়েল-টাইম নোটিফিকেশন আসবে</p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    disabled={testingTelegram}
                    onClick={handleTestTelegram}
                    className="flex items-center gap-2 px-3 py-2 bg-sky-600 hover:bg-sky-500 hover:shadow-lg hover:shadow-sky-500/15 disabled:opacity-50 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md shrink-0"
                  >
                    {testingTelegram ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                    ফোনে টেস্ট করুন
                  </button>
                </div>

                {/* Telegram verification messages status */}
                <AnimatePresence>
                  {telegramTestStatus && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`p-3.5 rounded-2xl text-[11px] font-bold flex items-center gap-2 border leading-relaxed ${
                        telegramTestStatus === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {telegramTestStatus === 'success' ? (
                        <>
                          <Check size={16} />
                          <span>মেসেজ সফলভাবে পাঠানো হয়েছে! যদি ফোনে নোটিফিকেশন না পেয়ে থাকেন, অনুগ্রহ করে আপনার চ্যাট আইডি বা বট সেটিংস চেক করুন।</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={16} />
                          <span>মেসেজ পাঠানো ব্যর্থ হয়েছে। আপনার বট টোকেন এবং চ্যাট আইডি চেক করুন এবং নিশ্চিত করুন যে আপনার বটে স্টার্ট (/start) বাটন প্রেস করেছেন।</span>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Telegram inputs form layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                  
                  {/* Bot Token field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                      ১. টেলিগ্রাম বট টোকেন (Telegram Bot Token):
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                      value={settings.telegramToken || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, telegramToken: e.target.value }))}
                      className="w-full px-4 py-3 bg-white text-gray-800 placeholder-gray-400 font-mono text-xs rounded-2xl border border-sky-100 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition-all shadow-inner"
                    />
                  </div>

                  {/* Chat ID Input Field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                      ২. টেলিগ্রাম চ্যাট আইডি (Telegram Chat ID):
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: 987654321"
                      value={settings.telegramChatId || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, telegramChatId: e.target.value }))}
                      className="w-full px-4 py-3 bg-white text-gray-800 placeholder-gray-400 font-mono text-xs rounded-2xl border border-sky-100 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition-all shadow-inner"
                    />
                  </div>

                </div>

                {/* Detailed Bengali Step-by-Step Instructions card for customer safety */}
                <div className="bg-sky-50 bg-opacity-40 p-4 rounded-2xl mt-4 space-y-2 border border-sky-100/50">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-sky-700">
                    <BadgeHelp size={14} />
                    টেলিগ্রাম বট সেটআপ করার সহজ গাইড (Easy Setup Guide):
                  </div>
                  <ol className="text-gray-600 text-[11px] leading-relaxed list-decimal list-inside space-y-1.5 pl-1">
                    <li>টেলিগ্রাম অ্যাপে সার্চ করুন <strong className="text-sky-800 font-bold">@BotFather</strong> এবং স্টার্ট দিন।</li>
                    <li><strong className="text-sky-800 font-bold">/newbot</strong> কমান্ড দিন, আপনার বটের নাম লিখুন এবং শেষে "bot" যুক্ত ইউজারনেম টাইপ করে টোকেনটি কপি করুন।</li>
                    <li>টেলিগ্রামে <strong className="text-sky-800 font-bold">@userinfobot</strong> দিয়ে আপনার নিজস্ব <strong className="font-bold">Chat ID (আইডি নম্বর)</strong> কপি করুন।</li>
                    <li>আপনার তৈরি করা টেলিগ্রাম চ্যাট বটে গিয়ে অবশ্যই একবার <strong className="text-rose-600 font-bold">/start</strong> দিবেন।</li>
                    <li>উপরে টোকেন ও চ্যাট আইডি বসিয়ে দিয়ে <strong className="text-sky-600 font-bold">"ফোনে টেস্ট করুন"</strong> ক্লিক করুন। টেস্ট সফল হলে সেভ করুন!</li>
                  </ol>
                </div>

              </div>

              {/* SteadFast Courier Integration Card */}
              <div className="bg-gradient-to-tr from-rose-50/40 via-white to-red-50/10 p-5 rounded-3xl border border-red-100 space-y-6">
                
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-rose-600 text-white rounded-2xl shadow-md shadow-rose-600/10">
                      <Truck size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-rose-900 uppercase tracking-wider">স্টেট ফাস্ট কুরিয়ার সার্ভিস সেটিংস (SteadFast Courier Connection)</h4>
                      <p className="text-[10px] text-rose-600 font-bold">অর্ডারগুলোকে এক ক্লিকে সরাসরি স্টেট ফাস্ট কুরিয়ারে বুকিং করুন</p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    disabled={testingSteadfast}
                    onClick={handleTestSteadfast}
                    className="flex items-center gap-2 px-3 py-2 bg-rose-600 hover:bg-rose-700 hover:shadow-lg disabled:opacity-50 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md shrink-0 cursor-pointer border border-transparent"
                  >
                    {testingSteadfast ? <RefreshCw size={12} className="animate-spin" /> : <Truck size={12} />}
                    টেস্ট কানেকশন
                  </button>
                </div>

                {/* Steadfast connection test messages status */}
                <AnimatePresence>
                  {steadfastTestStatus && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`p-3.5 rounded-2xl text-[11px] font-bold flex items-center gap-2 border leading-relaxed ${
                        steadfastTestStatus.success
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {steadfastTestStatus.success ? (
                        <>
                          <Check size={16} />
                          <span>স্টেট ফাস্ট এ সফলভাবে কানেক্ট হয়েছে! আপনার চলতি একাউন্ট ব্যালেন্স: <strong className="font-sans text-rose-600 bg-white px-2 py-0.5 rounded-lg border border-rose-100 ml-1">৳{steadfastTestStatus.balance}</strong></span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={16} />
                          <span>কানেক্ট করা যায়নি। ত্রুটি: {steadfastTestStatus.message}</span>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Steadfast inputs form layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
                  
                  {/* API Key field */}
                  <div className="space-y-1.5 col-span-1 md:col-span-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Key size={12} className="text-gray-400" />
                      ১. এপিআই কী (SteadFast API Key):
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: sf_api_key_..."
                      value={settings.steadfastApiKey || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, steadfastApiKey: e.target.value }))}
                      className="w-full px-4 py-3 bg-white text-gray-800 placeholder-gray-400 font-mono text-xs rounded-2xl border border-red-100 focus:border-red-400 focus:ring-1 focus:ring-red-400 outline-none transition-all shadow-inner"
                    />
                  </div>

                  {/* Secret Key Input Field */}
                  <div className="space-y-1.5 col-span-1 md:col-span-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Lock size={12} className="text-gray-400" />
                      ২. সিক্রেট কী (Secret Key / Token):
                    </label>
                    <input
                      type="password"
                      placeholder="যেমন: sf_secret_key_..."
                      value={settings.steadfastSecretKey || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, steadfastSecretKey: e.target.value }))}
                      className="w-full px-4 py-3 bg-white text-gray-800 placeholder-gray-400 font-mono text-xs rounded-2xl border border-red-100 focus:border-red-400 focus:ring-1 focus:ring-red-400 outline-none transition-all shadow-inner"
                    />
                  </div>

                  {/* Merchant ID Input Field */}
                  <div className="space-y-1.5 col-span-1 md:col-span-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Building size={12} className="text-gray-400" />
                      ৩. মার্চেন্ট আইডি (Merchant ID):
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: 12345"
                      value={settings.steadfastMerchantId || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, steadfastMerchantId: e.target.value }))}
                      className="w-full px-4 py-3 bg-white text-gray-800 placeholder-gray-400 font-mono text-xs rounded-2xl border border-red-100 focus:border-red-400 focus:ring-1 focus:ring-red-400 outline-none transition-all shadow-inner"
                    />
                  </div>

                </div>

                {/* Detailed steps to get details from SteadFast Panel */}
                <div className="bg-red-50 bg-opacity-40 p-4 rounded-2xl mt-4 space-y-2 border border-red-100/50">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#be123c]">
                    <BadgeHelp size={14} />
                    স্টেট ফাস্ট কুরিয়ার কানেক্ট করার গাইড (SteadFast Setup Guide):
                  </div>
                  <ol className="text-gray-600 text-[11px] leading-relaxed list-decimal list-inside space-y-1.5 pl-1 font-sans">
                    <li>প্রথমে আপনার <strong className="text-rose-800 font-bold">SteadFast Courier Merchant Panel</strong>-এ লগইন করুন।</li>
                    <li>বাম পাশের মেনু থেকে <strong className="text-rose-800 font-bold">API Settings</strong> বা <strong className="text-rose-800 font-bold">Developer Options</strong> অপশনে যান।</li>
                    <li>সেখান থেকে আপনার <strong className="font-bold text-rose-800">API Key</strong> এবং <strong className="font-bold text-rose-800">Secret Key / Token</strong> কপি করে এখানে বসান।</li>
                    <li>আপনার প্যানেলের প্রোফাইল বা হোম পেইজ থেকে <strong className="font-bold text-rose-800">Merchant ID</strong> কপি করে ৩ নম্বর বক্সে বসান।</li>
                    <li>উপরে ডান পাশে থাকা <strong className="text-emerald-750 font-bold">"টেস্ট কানেকশন"</strong> বাটনে ক্লিক করে কানেক্ট করুন। টেস্ট সফল হলে সেভ করুন!</li>
                  </ol>
                </div>

              </div>

              {/* Pathao Courier Integration Card */}
              <div className="bg-gradient-to-tr from-red-50/40 via-white to-orange-50/10 p-5 rounded-3xl border border-red-105 space-y-6">
                
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#E52E2E] text-white rounded-2xl shadow-md shadow-red-600/10">
                      <Truck size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-red-900 uppercase tracking-wider">পাঠাও কুরিয়ার সার্ভিস সেটিংস (Pathao Courier Connection)</h4>
                      <p className="text-[10px] text-red-600 font-bold">অর্ডারগুলোকে এক ক্লিকে সরাসরি পাঠাও কুরিয়ার মার্চেন্ট এপিআই-তে বুকিং করুন</p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    disabled={testingPathao}
                    onClick={handleTestPathao}
                    className="flex items-center gap-2 px-3 py-2 bg-[#E52E2E] hover:bg-red-700 hover:shadow-lg disabled:opacity-50 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md shrink-0 cursor-pointer border border-transparent animate-pulse"
                  >
                    {testingPathao ? <RefreshCw size={12} className="animate-spin" /> : <Truck size={12} />}
                    টেস্ট কানেকশন
                  </button>
                </div>

                {/* Pathao connection test messages status */}
                <AnimatePresence>
                  {pathaoTestStatus && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`p-3.5 rounded-2xl text-[11px] font-bold flex items-center gap-2 border leading-relaxed ${
                        pathaoTestStatus.success
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {pathaoTestStatus.success ? (
                        <>
                          <Check size={16} />
                          <span>পাঠাও এপিআই এর সাথে সফলভাবে কানেক্ট হয়েছে! আপনার মার্চেন্ট একাউন্ট সচল আছে। 🎉</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={16} />
                          <span>কানেক্ট করা যায়নি। ত্রুটি: {pathaoTestStatus.message}</span>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Pathao inputs form layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
                  
                  {/* Client ID field */}
                  <div className="space-y-1.5 col-span-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Key size={12} className="text-gray-400" />
                      ১. ক্লায়েন্ট আইডি (Pathao Client ID):
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: pt_client_id_..."
                      value={settings.pathaoClientId || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, pathaoClientId: e.target.value }))}
                      className="w-full px-4 py-3 bg-white text-gray-800 placeholder-gray-400 font-mono text-xs rounded-2xl border border-red-100 focus:border-red-400 focus:ring-1 focus:ring-red-400 outline-none transition-all shadow-inner"
                    />
                  </div>

                  {/* Client Secret Input Field */}
                  <div className="space-y-1.5 col-span-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Lock size={12} className="text-gray-400" />
                      ২. ক্লায়েন্ট সিক্রেট (Client Secret):
                    </label>
                    <input
                      type="password"
                      placeholder="যেমন: pt_client_secret_..."
                      value={settings.pathaoClientSecret || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, pathaoClientSecret: e.target.value }))}
                      className="w-full px-4 py-3 bg-white text-gray-800 placeholder-gray-400 font-mono text-xs rounded-2xl border border-red-100 focus:border-red-400 focus:ring-1 focus:ring-red-400 outline-none transition-all shadow-inner"
                    />
                  </div>

                  {/* Username Field */}
                  <div className="space-y-1.5 col-span-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Lock size={12} className="text-gray-400" />
                      ৩. মার্চেন্ট ইমেইল/ইউজারনেম:
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: user@example.com"
                      value={settings.pathaoUsername || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, pathaoUsername: e.target.value }))}
                      className="w-full px-4 py-3 bg-white text-gray-800 placeholder-gray-400 font-sans text-xs rounded-2xl border border-red-100 focus:border-red-400 focus:ring-1 focus:ring-red-400 outline-none transition-all shadow-inner"
                    />
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1.5 col-span-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Lock size={12} className="text-gray-400" />
                      ৪. মার্চেন্ট পাসওয়ার্ড (Password):
                    </label>
                    <input
                      type="password"
                      placeholder="আপনার পাসওয়ার্ড..."
                      value={settings.pathaoPassword || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, pathaoPassword: e.target.value }))}
                      className="w-full px-4 py-3 bg-white text-gray-800 placeholder-gray-400 text-xs rounded-2xl border border-red-100 focus:border-red-400 focus:ring-1 focus:ring-red-400 outline-none transition-all shadow-inner"
                    />
                  </div>

                  {/* Store ID Field */}
                  <div className="space-y-1.5 col-span-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Building size={12} className="text-gray-400" />
                      ৫. স্টোর আইডি (Store ID):
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: 98765"
                      value={settings.pathaoStoreId || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, pathaoStoreId: e.target.value }))}
                      className="w-full px-4 py-3 bg-white text-gray-800 placeholder-gray-400 font-mono text-xs rounded-2xl border border-red-100 focus:border-red-400 focus:ring-1 focus:ring-red-400 outline-none transition-all shadow-inner"
                    />
                  </div>

                </div>

                {/* Detailed steps to get details from Pathao Panel */}
                <div className="bg-red-50 bg-opacity-40 p-4 rounded-2xl mt-4 space-y-2 border border-red-100/50">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-red-650">
                    <BadgeHelp size={14} />
                    পাঠাও কুরিয়ার কানেক্ট করার গাইড (Pathao Setup Guide):
                  </div>
                  <ol className="text-gray-600 text-[11px] leading-relaxed list-decimal list-inside space-y-1.5 pl-1 font-sans">
                    <li>প্রথমে আপনার <strong className="text-red-750 font-bold">Pathao Merchant Panel</strong>-এ লগইন করুন।</li>
                    <li>এপিআই ক্রেডেনশিয়াল পেতে <strong className="text-red-750 font-bold">Developer Portal</strong> বা <strong className="text-red-750 font-bold">API Settings</strong> এ গিয়ে নতুন ক্লায়েন্ট তৈরি করুন।</li>
                    <li>সেখান থেকে প্রাপ্ত <strong className="font-bold text-red-750">Client ID</strong> এবং <strong className="font-bold text-red-750">Client Secret</strong> কপি করে এখানে বসান।</li>
                    <li>আপনার মার্চেন্ট একাউন্টের লগইন <strong className="font-bold text-red-750">ইমেইল (Username)</strong> এবং <strong className="font-bold text-red-750">পাসওয়ার্ড</strong> বসান।</li>
                    <li>মার্চেন্ট প্রোফাইলের স্টোর লিস্ট থেকে আপনার <strong className="font-bold text-red-750">Store ID</strong> কপি করে স্টোর বক্সে বসান।</li>
                    <li>উপরে থাকা <strong className="text-emerald-750 font-bold">"টেস্ট কানেকশন"</strong> বাটনে ক্লিক করে কানেক্ট করুন। টেস্ট সফল হলে সেভ করুন!</li>
                  </ol>
                </div>

              </div>

              {/* 🛡️ OPTION 2 & 3: Anti-Fraud, Courier Return Guard & Bot Shield Card */}
              <div className="bg-gradient-to-tr from-emerald-50/50 via-white to-slate-50 p-5 sm:p-6 rounded-3xl border-2 border-emerald-200/80 space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-md shadow-emerald-600/20">
                      <Shield size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-emerald-950 uppercase tracking-wider">
                        🛡️ কুরিয়ার ফ্রড গার্ড ও স্প্যাম শিল্ড সেটিংস (Anti-Fraud & Flood Protection)
                      </h4>
                      <p className="text-[10px] text-emerald-700 font-bold">
                        ফেক অর্ডার, রিটার্ন ঝুঁকি ও রোবট বট ট্র্যাপ প্রতিরোধে স্বয়ংক্রিয় সুরক্ষা
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-emerald-800">শিল্ড স্ট্যাটাস:</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={settings.fraudShieldEnabled !== false}
                        onChange={(e) => setSettings(prev => ({ ...prev, fraudShieldEnabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cooldown timer */}
                  <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-xs space-y-1.5">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                      ডিভাইস অর্ডার কুলডাউন টাইমার (Cooldown):
                    </label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number"
                        min="10"
                        max="300"
                        value={settings.rateLimitCooldownSeconds || 45}
                        onChange={(e) => setSettings(prev => ({ ...prev, rateLimitCooldownSeconds: Number(e.target.value) || 45 }))}
                        className="w-24 px-3 py-2 bg-stone-50 text-slate-900 font-mono font-bold text-xs rounded-xl border border-stone-200 focus:border-emerald-500 outline-none"
                      />
                      <span className="text-xs text-slate-500 font-bold">সেকেন্ড (ডিফল্ট: ৪৫ সেকেন্ড)</span>
                    </div>
                    <p className="text-[9px] text-slate-400">একই ডিভাইস থেকে খুব দ্রুত বারবার স্প্যাম অর্ডার ঠেকাতে ন্যূনতম বিরতি।</p>
                  </div>

                  {/* Max orders per IP */}
                  <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-xs space-y-1.5">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                      আইপি প্রতি সর্বোচ্চ অর্ডার (Rate Limit):
                    </label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number"
                        min="1"
                        max="10"
                        value={settings.maxOrdersPerIp || 3}
                        onChange={(e) => setSettings(prev => ({ ...prev, maxOrdersPerIp: Number(e.target.value) || 3 }))}
                        className="w-24 px-3 py-2 bg-stone-50 text-slate-900 font-mono font-bold text-xs rounded-xl border border-stone-200 focus:border-emerald-500 outline-none"
                      />
                      <span className="text-xs text-slate-500 font-bold">টি / ১০ মিনিট (ডিফল্ট: ৩টি)</span>
                    </div>
                    <p className="text-[9px] text-slate-400">একই আইপি অ্যাড্রেস থেকে ১০ মিনিটে সর্বোচ্চ অনুমোদনযোগ্য অর্ডার।</p>
                  </div>

                  {/* Gibberish filter */}
                  <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-xs flex items-center justify-between gap-3">
                    <div>
                      <h5 className="text-[11px] font-black text-slate-800">অর্থহীন ও ভুয়া ঠিকানা ফিল্টার (Gibberish Filter)</h5>
                      <p className="text-[9px] text-slate-400">"asdfgh", "111111", "test test" ইত্যাদি ফেক টেক্সট অর্ডার ব্লক করবে</p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={settings.blockGibberishAddresses !== false}
                      onChange={(e) => setSettings(prev => ({ ...prev, blockGibberishAddresses: e.target.checked }))}
                      className="w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                    />
                  </div>

                  {/* Require Advance for High Risk */}
                  <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-xs flex items-center justify-between gap-3">
                    <div>
                      <h5 className="text-[11px] font-black text-slate-800">উচ্চ ঝুঁকিপূর্ণ কাস্টমারে সতর্কতা (High Return Warning)</h5>
                      <p className="text-[9px] text-slate-400">কুরিয়ারে ৫০%+ রিটার্ন হিস্টোরি থাকা কাস্টমারদের Red Zone ট্যাগ করবে</p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={settings.requireAdvanceForHighRisk !== false}
                      onChange={(e) => setSettings(prev => ({ ...prev, requireAdvanceForHighRisk: e.target.checked }))}
                      className="w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                    />
                  </div>
                </div>
              </div>

              {/* SMS Gateway Configurations Card */}
              <div className="bg-gradient-to-tr from-indigo-50/40 via-white to-purple-50/10 p-5 rounded-3xl border border-indigo-100 space-y-6">
                
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-600/10">
                    <Send size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider">অটোমেটেড এসএমএস গেটওয়ে সেটিংস (SMS Gateway Connectivity)</h4>
                    <p className="text-[10px] text-indigo-600 font-bold">কাস্টমারদের ফলোআপ ও ডিসকাউন্ট কোড সরাসরি SMS পাঠানোর জন্য কানেক্ট করুন</p>
                  </div>
                </div>

                {/* Gateway Type Selector */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-1">
                  {[
                    { key: 'device', label: 'DEVICE / FREE' },
                    { key: 'greenweb', label: 'GREENWEB' },
                    { key: 'elitbuzz', label: 'ELITBUZZ' },
                    { key: 'mimsms', label: 'MIM SMS' },
                    { key: 'twilio', label: 'TWILIO GLOBAL' }
                  ].map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, smsGateway: g.key as any }))}
                      className={`py-2.5 px-2 rounded-xl border text-[10px] font-black transition-all flex items-center justify-center text-center ${
                        settings.smsGateway === g.key
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>

                <div className="pt-1">
                  {settings.smsGateway === 'device' && (
                    <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10 text-left">
                      <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5 mb-1">
                        <Cpu size={12} className="text-emerald-500" />
                        ডিভাইস মেসেঞ্জার গেটওয়ে (100% Free):
                      </h5>
                      <p className="text-[10px] text-slate-600 leading-normal font-semibold">
                        মেসেজ অ্যাপ খোলার জন্য বিশেষ প্রোটোকল। ড্যাশবোর্ড থেকে SMS বাটনে চাপলে আপনার ডিভাইস এর SMS ম্যানেজার ওপেন হবে এবং বার্তাটি অটোমেটিক লিখে কাস্টমারের নম্বরে নিয়ে যাবে। কোন API কী লাগবে না।
                      </p>
                    </div>
                  )}

                  {settings.smsGateway === 'greenweb' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-indigo-805 uppercase tracking-widest block text-left">Greenweb API Token:</label>
                      <input 
                        type="password"
                        value={settings.smsGreenwebToken || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, smsGreenwebToken: e.target.value }))}
                        placeholder="যেমন: m61409228-5696-2917-..."
                        className="w-full px-4 py-3 bg-white text-gray-805 placeholder-gray-400 font-mono text-xs rounded-2xl border border-indigo-100 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all shadow-inner"
                      />
                    </div>
                  )}

                  {settings.smsGateway === 'elitbuzz' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left font-sans">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-indigo-800 uppercase tracking-widest block">Elitbuzz API Key:</label>
                        <input 
                          type="password"
                          value={settings.smsElitbuzzApiKey || ''}
                          onChange={(e) => setSettings(prev => ({ ...prev, smsElitbuzzApiKey: e.target.value }))}
                          placeholder="আপনার এপিআই কী..."
                          className="w-full px-4 py-3 bg-white text-gray-800 placeholder-gray-400 font-mono text-xs rounded-2xl border border-indigo-100 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all shadow-inner"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-indigo-800 uppercase tracking-widest block">Elitbuzz Sender ID:</label>
                        <input 
                          type="text"
                          value={settings.smsElitbuzzSenderId || ''}
                          onChange={(e) => setSettings(prev => ({ ...prev, smsElitbuzzSenderId: e.target.value }))}
                          placeholder="যেমন: 8801844..."
                          className="w-full px-4 py-3 bg-white text-gray-800 placeholder-gray-400 font-bold text-xs rounded-2xl border border-indigo-100 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all shadow-inner"
                        />
                      </div>
                    </div>
                  )}

                  {settings.smsGateway === 'mimsms' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left font-sans">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-indigo-800 uppercase tracking-widest block">MiM SMS API Key:</label>
                        <input 
                          type="password"
                          value={settings.smsMimsmsApiKey || ''}
                          onChange={(e) => setSettings(prev => ({ ...prev, smsMimsmsApiKey: e.target.value }))}
                          placeholder="মিম এপিআই টোকেন..."
                          className="w-full px-4 py-3 bg-white text-gray-800 placeholder-gray-400 font-mono text-xs rounded-2xl border border-indigo-100 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all shadow-inner"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-indigo-800 uppercase tracking-widest block">MiM Approved Sender ID:</label>
                        <input 
                          type="text"
                          value={settings.smsMimsmsSenderId || ''}
                          onChange={(e) => setSettings(prev => ({ ...prev, smsMimsmsSenderId: e.target.value }))}
                          placeholder="যেমন: SERAFASHION"
                          className="w-full px-4 py-3 bg-white text-gray-800 placeholder-gray-400 font-bold text-xs rounded-2xl border border-indigo-100 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all shadow-inner"
                        />
                      </div>
                    </div>
                  )}

                  {settings.smsGateway === 'twilio' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left font-sans">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-indigo-800 uppercase tracking-widest block">Account SID:</label>
                        <input 
                          type="text"
                          value={settings.smsTwilioSid || ''}
                          onChange={(e) => setSettings(prev => ({ ...prev, smsTwilioSid: e.target.value }))}
                          placeholder="AC..."
                          className="w-full px-4 py-3 bg-white text-gray-800 placeholder-gray-400 font-mono text-xs rounded-2xl border border-indigo-100 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all shadow-inner"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-indigo-800 uppercase tracking-widest block">Auth Token:</label>
                        <input 
                          type="password"
                          value={settings.smsTwilioAuthToken || ''}
                          onChange={(e) => setSettings(prev => ({ ...prev, smsTwilioAuthToken: e.target.value }))}
                          placeholder="সিক্রেট অবজেক্ট..."
                          className="w-full px-4 py-3 bg-white text-gray-800 placeholder-gray-400 font-mono text-xs rounded-2xl border border-indigo-100 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all shadow-inner"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-indigo-800 uppercase tracking-widest block">From Number:</label>
                        <input 
                          type="text"
                          value={settings.smsTwilioFrom || ''}
                          onChange={(e) => setSettings(prev => ({ ...prev, smsTwilioFrom: e.target.value }))}
                          placeholder="+1xxxxxxxxxx"
                          className="w-full px-4 py-3 bg-white text-gray-800 placeholder-gray-400 font-bold text-xs rounded-2xl border border-indigo-100 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all shadow-inner"
                        />
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* 8-in-1 Complete Enterprise Tracking & Analytics Suite Card */}
              <div className="bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white p-7 rounded-3xl border border-indigo-500/30 space-y-7 shadow-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-indigo-500/20">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-rose-500 text-white rounded-2xl shadow-lg shadow-indigo-500/25 shrink-0">
                      <Target size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                        🎯 8-in-1 Omnichannel Tracking & Growth Engine
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          100% Pro Live
                        </span>
                      </h4>
                      <p className="text-xs text-indigo-200/80 font-medium mt-0.5">
                        Meta Pixel (CAPI), GTM DataLayer, GA4 Server Protocol, TikTok Pixel, Looker Studio, Search Console & Clarity
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 bg-indigo-900/60 px-4 py-2 rounded-2xl border border-indigo-400/30">
                    <span className="text-[11px] font-black uppercase text-indigo-200">সার্বজনীন ট্র্যাকিং সচল</span>
                    <input
                      type="checkbox"
                      checked={settings.metaPixelEnabled !== false}
                      onChange={(e) => setSettings(prev => ({ ...prev, metaPixelEnabled: e.target.checked }))}
                      className="accent-indigo-500 w-5 h-5 rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* 8 Tools Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">

                  {/* 1. Meta Pixel ID (Browser) */}
                  <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-2">
                    <label className="text-[11px] font-black text-indigo-300 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded font-mono text-[9px]">1</span>
                        Meta Pixel ID (Facebook Browser Pixel)
                      </span>
                      {settings.metaPixelId && (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md font-bold">Active</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={settings.metaPixelId || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, metaPixelId: e.target.value }))}
                      placeholder="যেমন: 890123456789012"
                      className="w-full px-3.5 py-2.5 bg-slate-900 text-white placeholder-slate-500 font-mono text-xs font-bold rounded-xl border border-slate-700 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all"
                    />
                    <p className="text-[10px] text-slate-400">Meta Business Suite থেকে ১৫-১৬ ডিজিটের পিক্সেল আইডি দিন।</p>
                  </div>

                  {/* 2. Meta Conversions API (CAPI Server-Side) */}
                  <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-2">
                    <label className="text-[11px] font-black text-indigo-300 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-blue-700 text-white rounded font-mono text-[9px]">2</span>
                        Meta CAPI Access Token (Server-Side)
                      </span>
                      {settings.metaAccessToken && (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md font-bold">CAPI Connected</span>
                      )}
                    </label>
                    <input
                      type="password"
                      value={settings.metaAccessToken || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, metaAccessToken: e.target.value }))}
                      placeholder="EAA..."
                      className="w-full px-3.5 py-2.5 bg-slate-900 text-white placeholder-slate-500 font-mono text-xs font-bold rounded-xl border border-slate-700 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all"
                    />
                    <p className="text-[10px] text-slate-400">Events Manager &gt; Settings &gt; Generate Access Token থেকে টোকেন নিন।</p>
                  </div>

                  {/* 2b. Meta Test Event Code */}
                  <div className="bg-indigo-950/70 p-4 rounded-2xl border border-indigo-500/40 space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-amber-500 text-black rounded font-mono text-[9px] font-black">🧪 TEST</span>
                        Meta Test Event Code (ফেসবুক লাইভ টেস্ট মোড)
                      </label>
                      {settings.metaTestEventCode && (
                        <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full">
                          Test Mode Active
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={settings.metaTestEventCode || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, metaTestEventCode: e.target.value }))}
                      placeholder="যেমন: TEST12345 (Events Manager > Test Events কোড)"
                      className="w-full px-3.5 py-2.5 bg-slate-900 text-white placeholder-slate-500 font-mono text-xs font-bold rounded-xl border border-indigo-400/50 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-300 outline-none transition-all"
                    />
                    <p className="text-[10px] text-indigo-300/80">
                      💡 Facebook Events Manager-এর "Test Events" কোড দিলে ব্রাউজার ও সার্ভার CAPI ইভেন্ট লাইভ টেস্ট মনিটরে দেখা যাবে।
                    </p>
                  </div>

                  {/* 3. Google Tag Manager (GTM) Container ID */}
                  <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-2">
                    <label className="text-[11px] font-black text-indigo-300 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded font-mono text-[9px]">3</span>
                        Google Tag Manager (GTM with Data Layer)
                      </span>
                      {settings.googleTagManagerId && (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md font-bold">GTM Active</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={settings.googleTagManagerId || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, googleTagManagerId: e.target.value }))}
                      placeholder="যেমন: GTM-ABC123X"
                      className="w-full px-3.5 py-2.5 bg-slate-900 text-white placeholder-slate-500 font-mono text-xs font-bold rounded-xl border border-slate-700 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all"
                    />
                    <p className="text-[10px] text-slate-400">GTM কন্টেইনার আইডি। window.dataLayer স্বয়ংক্রিয়ভাবে একটিভ থাকবে।</p>
                  </div>

                  {/* 4. Google Analytics 4 (GA4) ID & Server Secret */}
                  <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-2">
                    <label className="text-[11px] font-black text-indigo-300 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-emerald-700 text-white rounded font-mono text-[9px]">4</span>
                        GA4 Measurement ID (Google Analytics 4)
                      </span>
                      {settings.googleAnalyticsId && (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md font-bold">GA4 Active</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={settings.googleAnalyticsId || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, googleAnalyticsId: e.target.value }))}
                      placeholder="যেমন: G-XXXXXXXXXX"
                      className="w-full px-3.5 py-2.5 bg-slate-900 text-white placeholder-slate-500 font-mono text-xs font-bold rounded-xl border border-slate-700 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all"
                    />
                    <p className="text-[10px] text-slate-400">Google Analytics 4 মেজারমেন্ট আইডি (G-...) বসান।</p>
                  </div>

                  {/* 5. TikTok Pixel ID (Data Layer সহ) */}
                  <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-rose-600 text-white rounded font-mono text-[9px]">5</span>
                        TikTok Pixel ID (Data Layer সহ)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-slate-400 font-bold">Active</span>
                        <input
                          type="checkbox"
                          checked={settings.tiktokPixelEnabled !== false}
                          onChange={(e) => setSettings(prev => ({ ...prev, tiktokPixelEnabled: e.target.checked }))}
                          className="accent-rose-500 w-4 h-4 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      value={settings.tiktokPixelId || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, tiktokPixelId: e.target.value }))}
                      placeholder="যেমন: C1234567890ABCDEF"
                      className="w-full px-3.5 py-2.5 bg-slate-900 text-white placeholder-slate-500 font-mono text-xs font-bold rounded-xl border border-slate-700 focus:border-rose-400 focus:ring-1 focus:ring-rose-400 outline-none transition-all"
                    />
                    <p className="text-[10px] text-slate-400">TikTok Ads Manager থেকে Pixel Code আইডি বসান (সব ইভেন্ট ট্র্যাক হবে)।</p>
                  </div>

                  {/* 6. Microsoft Clarity Project ID */}
                  <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-2">
                    <label className="text-[11px] font-black text-indigo-300 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-cyan-600 text-white rounded font-mono text-[9px]">6</span>
                        Microsoft Clarity (Heatmap & Recording)
                      </span>
                      {settings.microsoftClarityId && (
                        <span className="text-[9px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-md font-bold">Clarity Active</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={settings.microsoftClarityId || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, microsoftClarityId: e.target.value }))}
                      placeholder="যেমন: clarity_project_id"
                      className="w-full px-3.5 py-2.5 bg-slate-900 text-white placeholder-slate-500 font-mono text-xs font-bold rounded-xl border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-all"
                    />
                    <p className="text-[10px] text-slate-400">কাস্টমার স্ক্রোল, ক্লিক হিটম্যাপ ও ভিডিও রেকর্ডিংয়ের জন্য Clarity আইডি।</p>
                  </div>

                  {/* 7. Google Search Console & SEO XML Sitemap */}
                  <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-2 md:col-span-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-[11px] font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-amber-600 text-white rounded font-mono text-[9px]">7</span>
                        Google Search Console & SEO Indexing (গুগল সার্চ কনসোল)
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const url = `${window.location.origin}/sitemap.xml`;
                            navigator.clipboard.writeText(url);
                            setCopiedSitemap(true);
                            setTimeout(() => setCopiedSitemap(false), 2000);
                          }}
                          className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                        >
                          {copiedSitemap ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          <span>{copiedSitemap ? 'Sitemap কপি হয়েছে' : 'Sitemap URL কপি'}</span>
                        </button>
                        <a
                          href={`${window.location.origin}/sitemap.xml`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold rounded-lg hover:bg-amber-500/30 transition-all flex items-center gap-1"
                        >
                          <Eye size={12} />
                          <span>View XML</span>
                        </a>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={settings.googleSearchConsoleCode || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, googleSearchConsoleCode: e.target.value }))}
                      placeholder="যেমন: google-site-verification কোড বা HTML ট্যাগ টোকেন"
                      className="w-full px-3.5 py-2.5 bg-slate-900 text-white placeholder-slate-500 font-mono text-xs font-bold rounded-xl border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-all"
                    />
                    <p className="text-[10px] text-slate-400">
                      Google Search Console &gt; Settings &gt; Ownership verification থেকে ভেরিফিকেশন কোড বসান।
                    </p>
                  </div>

                  {/* 8. Looker Studio BI Analytics Connector Feed */}
                  <div className="bg-gradient-to-br from-indigo-950/80 to-purple-950/70 p-4 rounded-2xl border border-indigo-400/40 space-y-3 md:col-span-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-indigo-500 text-white rounded font-mono text-[9px] font-black">8</span>
                        <h5 className="text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                          📊 Looker Studio Live Dashboard Feed (লুকার স্টুডিও কানেক্টর)
                        </h5>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const feedUrl = `${window.location.origin}/api/looker/orders-feed`;
                            navigator.clipboard.writeText(feedUrl);
                            setCopiedFeed(true);
                            setTimeout(() => setCopiedFeed(false), 2000);
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                        >
                          {copiedFeed ? <CheckCircle2 size={13} className="text-emerald-300" /> : <Copy size={13} />}
                          <span>{copiedFeed ? 'Feed URL কপি হয়েছে!' : 'Copy Looker Feed URL'}</span>
                        </button>
                        <a
                          href="https://lookerstudio.google.com"
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all shadow-md"
                        >
                          <Share2 size={13} />
                          <span>Open Looker Studio</span>
                        </a>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-900/90 rounded-xl border border-indigo-500/20 font-mono text-[11px] text-indigo-300 flex items-center justify-between">
                      <span className="truncate">{typeof window !== 'undefined' ? `${window.location.origin}/api/looker/orders-feed` : '/api/looker/orders-feed'}</span>
                      <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-bold uppercase shrink-0 ml-2">JSON / CSV Feed</span>
                    </div>
                    <p className="text-[10px] text-indigo-300/80">
                      💡 Google Looker Studio-তে আপনার রেভিনিউ, এডস ROAS, কুরিয়ার স্ট্যাটাস ও জেলা ভিত্তিক সেলস গ্রাফ লাইভ দেখতে উপরের Feed URL টি Google Sheets / Looker REST Connector-এ কানেক্ট করুন।
                    </p>
                  </div>

                </div>

                {/* Exclusive Verified Orders Only Filter Toggle (Facebook Anti-Fake Protection) */}
                <div className="p-4 bg-gradient-to-r from-emerald-950/70 via-slate-800/90 to-emerald-950/70 border border-emerald-500/40 rounded-2xl flex items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0 border border-emerald-500/30">
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                        🛡️ শুধুমাত্র কনফার্ম হওয়া আসল অর্ডারের ডাটা ফেসবুকে যাবে (Anti-Fake & Zero Waste Mode)
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/40">
                          100% Verified
                        </span>
                      </h5>
                      <p className="text-[10.5px] text-emerald-200/90 font-medium mt-0.5">
                        অর্ডার কনফার্ম ছাড়া পেজভিউ বা অন্যান্য ফেক ডাটা ফেসবুকে যাবে না। শুধুমাত্র সঠিক নাম ও মোবাইল নম্বর যাচাইকৃত আসল ক্রেতাদের ডাটাই ফেসবুকে কানেক্ট হবে।
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.metaOnlyConfirmedOrders !== false}
                    onChange={(e) => setSettings(prev => ({ ...prev, metaOnlyConfirmedOrders: e.target.checked }))}
                    className="accent-emerald-500 w-5 h-5 rounded cursor-pointer shrink-0"
                  />
                </div>

                {/* Advanced Matching Option */}
                <div className="p-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl flex items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl shrink-0">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                        Meta Advanced Matching (স্মার্ট কাস্টমার তথ্য এনক্রিপশন)
                      </h5>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        অর্ডার করার সময় কাস্টমারের নাম ও মোবাইল হ্যাশ করে পাঠায় (Ads Event Match Quality 90%+ বৃদ্ধি করে)।
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.metaAdvancedMatchingEnabled !== false}
                    onChange={(e) => setSettings(prev => ({ ...prev, metaAdvancedMatchingEnabled: e.target.checked }))}
                    className="accent-indigo-500 w-5 h-5 rounded cursor-pointer shrink-0"
                  />
                </div>

                {/* Pixel & Multi-Platform Live Diagnostics Inspector Console */}
                <div className="bg-[#020617] text-slate-100 p-5 rounded-2xl space-y-4 border border-indigo-950 shadow-inner text-left">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <h5 className="text-xs font-black uppercase tracking-widest text-emerald-400">
                        লাইভ অমনিচ্যানেল ইভেন্ট ইন্সপেক্টর (Omnichannel Diagnostics Inspector)
                      </h5>
                    </div>
                    <button
                      type="button"
                      onClick={() => clearPixelLogs()}
                      className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                    >
                      ক্লিয়ার লগ
                    </button>
                  </div>

                  {/* Multi-Platform Fast Trigger Buttons */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                      এক ক্লিকে সব প্ল্যাটফর্মে ইভেন্ট ফায়ার করে টেস্ট করুন (Meta, GTM, GA4, TikTok, Clarity):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { name: 'PageView', label: '📄 PageView', payload: {} },
                        { name: 'ViewContent', label: '👁️ ViewContent (পণ্য ভিউ)', payload: { content_name: 'কাতান শাড়ি', value: 1850 } },
                        { name: 'AddToCart', label: '🛒 AddToCart (কার্টে যোগ)', payload: { content_name: 'কাতান শাড়ি', value: 1850 } },
                        { name: 'InitiateCheckout', label: '✍️ InitiateCheckout (চেকআউট)', payload: { value: 1850 } },
                        { name: 'Purchase', label: '🎉 Purchase / CompletePayment (৳১,৮৫০)', payload: { value: 1850, order_id: 'TEST_ORD_123' } },
                        { name: 'Lead', label: '🎁 Lead / Subscribe (স্পিন হুইল)', payload: { content_name: 'Spin Lead' } }
                      ].map((b) => (
                        <button
                          key={b.name}
                          type="button"
                          onClick={() => testPixelEvent(b.name, b.payload)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-[10px] font-black uppercase tracking-wider transition-all border border-slate-700 cursor-pointer active:scale-95 shadow-sm"
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Realtime Event Stream */}
                  <div className="bg-[#0b1120] p-3 rounded-xl border border-slate-800/80 max-h-56 overflow-y-auto space-y-1.5 font-mono text-[10px]">
                    {pixelLogsState.length === 0 ? (
                      <p className="text-slate-500 italic text-center py-3">
                        এখনও কোনো ট্র্যাকিং ইভেন্ট রেকর্ড হয়নি। উপরের টেস্ট বাটন প্রেস করুন।
                      </p>
                    ) : (
                      pixelLogsState.map((log) => (
                        <div key={log.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                              log.status === 'sent' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              log.status === 'simulated' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                              'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}>
                              {log.status === 'sent' ? '✅ Live Sent' : log.status === 'simulated' ? '⚡ Simulated' : '⏳ Queued'}
                            </span>
                            <span className="text-slate-200 font-bold">{log.eventName}</span>
                            <span className="text-indigo-400 text-[9px]">[{log.platform}]</span>
                          </div>
                          <div className="flex items-center gap-2 text-right">
                            <span className="text-slate-400 text-[9px] truncate max-w-[240px]">{JSON.stringify(log.payload)}</span>
                            <span className="text-slate-500 text-[8px]">{log.timestamp}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Form submit footer button */}
              <div className="flex justify-end pt-3 border-t border-gray-150">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-rose-600/10 hover:shadow-rose-600/25 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {savingSettings ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
                  সেটিংস সেভ করুন (Save Settings)
                </button>
              </div>

            </form>

          </div>

          <div className="lg:col-span-12 p-4 bg-brand-gold/10 border border-brand-gold/20 rounded-2xl space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-brand-gold">
              <ShieldAlert size={14} />
              <span>নিরাপত্তা ও কনফিগারেশন নোট (Important Configuration)</span>
            </div>
            <p className="text-gray-600 text-xs shadow-none border-none py-0 leading-relaxed pl-1">
              লোগো ফাইল এবং নোটিফিকেশন তথ্য সম্পূর্ণ সুরক্ষিতভাবে ক্লাউড রিমোট ডাটাবেজে স্টোর হয়। টেলিগ্রাম বট কনফিগারেশনের ফলে আপনার ক্লায়েন্ট অর্ডার করামাত্র সরাসরি টেলিগ্রাম সার্ভার হয়ে আপনার ফোনে পুশ নোটিফিকেশন সচল হবে।
            </p>
          </div>
          
        </div>
      )}
    </div>
  );
}
