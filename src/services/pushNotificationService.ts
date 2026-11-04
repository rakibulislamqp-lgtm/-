import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { getFirebaseDb } from '../lib/firebase';
import { supabase } from '../lib/supabase';

export interface PushCampaignPayload {
  id: string;
  title: string;
  body: string;
  image?: string; // 🖼️ Large picture banner (as shown in Android notification screenshot)
  icon?: string;  // 🛍️ App icon (defaults to /pwa-192x192.png)
  badge?: string; // 📱 Monochromatic status bar badge
  url: string;    // 🔗 Target URL when tapped
  targetAudience?: 'all' | 'past_buyers' | 'abandoned_cart';
  createdAt: string;
  sentCount?: number;
  author?: string;
}

export interface PushSubscriber {
  id: string;
  endpoint?: string;
  token?: string;
  userAgent: string;
  deviceType: 'Android' | 'iOS' | 'Desktop';
  subscribedAt: string;
  customerName?: string;
  mobileNumber?: string;
}

const STORAGE_KEY_SUBSCRIBERS = 'sera_push_subscribers_local';
const STORAGE_KEY_CAMPAIGNS = 'sera_push_campaigns_local';
const STORAGE_KEY_SEEN_CAMPAIGNS = 'sera_seen_push_campaigns';

// Check browser notification capabilities
export const isPushSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
};

// Current permission state
export const getNotificationPermission = (): NotificationPermission => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.permission;
};

// Request permission with pleasant user consent
export const requestPushPermission = async (): Promise<NotificationPermission> => {
  if (!isPushSupported()) return 'denied';
  try {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      await registerCurrentDeviceSubscription();
    }
    return perm;
  } catch (e) {
    console.warn('Notification permission error:', e);
    return 'denied';
  }
};

// Detect simple device category
const detectDeviceType = (): 'Android' | 'iOS' | 'Desktop' => {
  if (typeof window === 'undefined') return 'Desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/.test(ua)) return 'iOS';
  return 'Desktop';
};

// Register this device to subscriber list
export const registerCurrentDeviceSubscription = async (customerData?: { name?: string; phone?: string }): Promise<void> => {
  const deviceId = localStorage.getItem('sera_push_device_id') || `sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  localStorage.setItem('sera_push_device_id', deviceId);

  const subscriber: PushSubscriber = {
    id: deviceId,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    deviceType: detectDeviceType(),
    subscribedAt: new Date().toISOString(),
    customerName: customerData?.name || localStorage.getItem('saved_customer_name') || undefined,
    mobileNumber: customerData?.phone || localStorage.getItem('saved_customer_phone') || undefined,
  };

  // 1. Save to localStorage
  try {
    const local = JSON.parse(localStorage.getItem(STORAGE_KEY_SUBSCRIBERS) || '[]');
    const filtered = local.filter((s: PushSubscriber) => s.id !== deviceId);
    filtered.push(subscriber);
    localStorage.setItem(STORAGE_KEY_SUBSCRIBERS, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Local subscriber save warning:', e);
  }

  // 2. Persist to Supabase Cloud
  try {
    supabase.from('push_subscribers').upsert({
      id: deviceId,
      device_type: subscriber.deviceType,
      user_agent: subscriber.userAgent,
      customer_name: subscriber.customerName || '',
      mobile_number: subscriber.mobileNumber || '',
      subscribed_at: subscriber.subscribedAt,
      raw_data: subscriber
    }).then(() => {}, () => {});
  } catch (e) {}

  // 3. Persist to Firestore
  try {
    const db = await getFirebaseDb();
    if (db) {
      const subRef = doc(db, 'push_subscribers', deviceId);
      await setDoc(subRef, subscriber, { merge: true });
    }
  } catch (e) {
    console.warn('Firestore subscriber save warning (continuing with local cache):', e);
  }
};

// Count total subscribers for admin
export const getSubscribersCount = async (): Promise<number> => {
  try {
    const db = await getFirebaseDb();
    if (db) {
      const snap = await getDocs(collection(db, 'push_subscribers'));
      if (snap.size > 0) return snap.size;
    }
  } catch (e) {
    // Fall back to local
  }

  try {
    const local = JSON.parse(localStorage.getItem(STORAGE_KEY_SUBSCRIBERS) || '[]');
    return Math.max(1, local.length);
  } catch {
    return 1;
  }
};

// 📲 Trigger real Native Android/Desktop Notification on the current device
export const showRichSystemNotification = async (payload: PushCampaignPayload): Promise<boolean> => {
  if (!isPushSupported()) return false;

  const title = payload.title || 'SERA FASHION';
  const options: NotificationOptions = {
    body: payload.body || 'নতুন কালেকশন ও এক্সক্লুসিভ অফার দেখতে ট্যাপ করুন!',
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/pwa-192x192.png',
    // @ts-ignore - 'image' is standard in Chromium / Android NotificationOptions
    image: payload.image || undefined,
    tag: `sera-push-${payload.id || Date.now()}`,
    renotify: true,
    requireInteraction: false,
    silent: false,
    // @ts-ignore - vibration pattern
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: payload.url || '/'
    }
  };

  // Try Service Worker registration first (standard for Android Chrome & PWA)
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, options);
        return true;
      }
    }
  } catch (err) {
    console.warn('SW showNotification warning, trying fallback window.Notification:', err);
  }

  // Fallback to standard window Notification
  try {
    if (Notification.permission === 'granted') {
      const n = new Notification(title, options);
      n.onclick = (e) => {
        e.preventDefault();
        window.focus();
        if (payload.url && payload.url !== '#') {
          window.location.href = payload.url;
        }
        n.close();
      };
      return true;
    }
  } catch (err) {
    console.error('Failed to trigger window Notification:', err);
  }

  return false;
};

// 📢 Broadcast Push Campaign to all customers
export const broadcastPushCampaign = async (payload: Omit<PushCampaignPayload, 'id' | 'createdAt'>): Promise<PushCampaignPayload> => {
  const count = await getSubscribersCount();
  const campaign: PushCampaignPayload = {
    ...payload,
    id: `push_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    sentCount: Math.max(1, count),
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/pwa-192x192.png',
  };

  // 1. Save to Local Storage Cache
  try {
    const list: PushCampaignPayload[] = JSON.parse(localStorage.getItem(STORAGE_KEY_CAMPAIGNS) || '[]');
    list.unshift(campaign);
    // Keep last 30
    localStorage.setItem(STORAGE_KEY_CAMPAIGNS, JSON.stringify(list.slice(0, 30)));
  } catch (e) {
    console.warn('Failed to save campaign locally:', e);
  }

  // 2. Save to Supabase Cloud
  try {
    supabase.from('push_campaigns').upsert({
      id: campaign.id,
      title: campaign.title,
      body: campaign.body,
      image: campaign.image || '',
      url: campaign.url || '/',
      target_audience: campaign.targetAudience || 'all',
      sent_count: campaign.sentCount || 1,
      created_at: campaign.createdAt,
      raw_data: campaign
    }).then(() => {}, () => {});
  } catch (e) {}

  // 3. Save to Firestore Push Campaigns
  try {
    const db = await getFirebaseDb();
    if (db) {
      const docRef = doc(db, 'push_campaigns', campaign.id);
      await setDoc(docRef, campaign);
    }
  } catch (e) {
    console.warn('Failed to persist campaign to Firestore:', e);
  }

  // 4. Post to Service Worker controller
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        payload: campaign
      });
    }
  } catch (e) {
    // Ignore postMessage warnings
  }

  // 4. Trigger test on sender's device if allowed
  if (getNotificationPermission() === 'granted') {
    await showRichSystemNotification(campaign);
  }

  return campaign;
};

// Fetch campaign history
export const getCampaignHistory = async (): Promise<PushCampaignPayload[]> => {
  try {
    const db = await getFirebaseDb();
    if (db) {
      const q = query(collection(db, 'push_campaigns'), orderBy('createdAt', 'desc'), limit(20));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map(d => d.data() as PushCampaignPayload);
      }
    }
  } catch (e) {
    console.warn('Failed to fetch campaigns from Firestore:', e);
  }

  try {
    const local = localStorage.getItem(STORAGE_KEY_CAMPAIGNS);
    if (local) return JSON.parse(local);
  } catch (e) {}

  // Initial defaults if empty
  return [
    {
      id: 'demo_push_1',
      title: 'Small Details, Big Style 😍',
      body: 'নতুন এক্সক্লুসিভ শাড়ি ও ডিজাইনার থ্রি-পিস কালেকশন এখন লাইভ! স্টক ফুরিয়ে যাওয়ার আগেই পছন্দের ড্রেসটি বেছে নিন 🛍️',
      image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=900&auto=format&fit=crop&q=80',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      url: '/',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      sentCount: 142
    },
    {
      id: 'demo_push_2',
      title: '🔥 অফারের শেষ হয়েও শেষ নেই!',
      body: 'আজ রাত ১২টা পর্যন্ত ১০০/- ও ২০০/- টাকার স্পেশাল ভাউচার চলবে। ফ্রি ক্যাশ অন ডেলিভারিতে অর্ডার করুন!',
      image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=900&auto=format&fit=crop&q=80',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      url: '/',
      createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
      sentCount: 189
    }
  ];
};

// Delete campaign
export const deletePushCampaign = async (id: string): Promise<void> => {
  try {
    const db = await getFirebaseDb();
    if (db) {
      await deleteDoc(doc(db, 'push_campaigns', id));
    }
  } catch (e) {}

  try {
    const list: PushCampaignPayload[] = JSON.parse(localStorage.getItem(STORAGE_KEY_CAMPAIGNS) || '[]');
    const filtered = list.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY_CAMPAIGNS, JSON.stringify(filtered));
  } catch (e) {}
};

// Real-time listener for incoming push broadcasts on customer devices
export const subscribeToPushCampaigns = (onNewCampaign: (campaign: PushCampaignPayload) => void) => {
  let unsubscribeFirestore = () => {};

  (async () => {
    try {
      const db = await getFirebaseDb();
      if (db) {
        const q = query(collection(db, 'push_campaigns'), orderBy('createdAt', 'desc'), limit(1));
        unsubscribeFirestore = onSnapshot(q, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const campaign = change.doc.data() as PushCampaignPayload;
              // Check if already seen
              try {
                const seen = JSON.parse(localStorage.getItem(STORAGE_KEY_SEEN_CAMPAIGNS) || '[]');
                if (!seen.includes(campaign.id)) {
                  seen.push(campaign.id);
                  localStorage.setItem(STORAGE_KEY_SEEN_CAMPAIGNS, JSON.stringify(seen.slice(-50)));
                  
                  // Only display if campaign was created within last 30 minutes
                  const ageMs = Date.now() - new Date(campaign.createdAt).getTime();
                  if (ageMs < 1800000) {
                    onNewCampaign(campaign);
                    if (getNotificationPermission() === 'granted') {
                      showRichSystemNotification(campaign);
                    }
                  }
                }
              } catch (e) {}
            }
          });
        });
      }
    } catch (e) {
      console.warn('Real-time push campaign listener notice:', e);
    }
  })();

  return () => {
    unsubscribeFirestore();
  };
};
