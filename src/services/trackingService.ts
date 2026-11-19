import { doc, setDoc, getDoc, collection, onSnapshot, query } from 'firebase/firestore';
import { initializeFirebase, checkIsQuotaExhausted, markQuotaExhausted } from '../lib/firebase';
import { VisitorSession, ProductView, VisitorStage, Product, TrackingEvent } from '../types';
import {
  supabaseSaveVisitorSession,
  supabaseFetchVisitorSessions,
  subscribeSupabaseVisitorSessions,
} from './supabaseService';

let currentSessionId: string | null = null;
let currentSessionData: VisitorSession | null = null;
let heartbeatInterval: any = null;
let isOfflineTracking = false;

// Broadcast Channel for sub-second cross-tab/window real-time session tracking
const trackingChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window 
  ? new BroadcastChannel('s_fashion_live_tracking_bc') 
  : null;

let lastServerSessionSyncAt = 0;

const syncSessionToServer = (session: VisitorSession, immediate = false) => {
  if (typeof window === 'undefined' || !session?.sessionId) return;
  const now = Date.now();
  if (!immediate && !session.hasSpun && now - lastServerSessionSyncAt < 4000) {
    return;
  }
  lastServerSessionSyncAt = now;
  try {
    fetch('/api/visitor-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Ignore network failures silently
  }
};

const saveAndBroadcastSession = (session: VisitorSession, immediateServerSync = false) => {
  if (!session || !session.sessionId) return;
  try {
    const cachedStr = localStorage.getItem('s_fashion_live_sessions_cache');
    let map: Record<string, VisitorSession> = {};
    if (cachedStr) {
      try { map = JSON.parse(cachedStr); } catch {}
    }
    map[session.sessionId] = session;

    // Prune entries older than 24 hours
    const nowMs = Date.now();
    Object.keys(map).forEach(key => {
      const activeMs = new Date(map[key].lastActiveAt).getTime();
      if (isNaN(activeMs) || nowMs - activeMs > 86400000) {
        delete map[key];
      }
    });

    localStorage.setItem('s_fashion_live_sessions_cache', JSON.stringify(map));

    if (trackingChannel) {
      trackingChannel.postMessage({ type: 'SESSION_UPDATE', session });
    }

    // Sync to server & Supabase for cross-device live tracking
    syncSessionToServer(session, immediateServerSync);
    supabaseSaveVisitorSession(session).catch(() => {});
  } catch {
    // Silently continue locally
  }
};

// Helper to check for Firebase quota or exhaustion errors
const detectQuotaError = (error: any): boolean => {
  if (!error) return false;
  const errMsg = String(error.message || error).toLowerCase();
  const errCode = String(error.code || '').toLowerCase();
  const isQuota = (
    errCode === 'resource-exhausted' ||
    errCode === 'quota-exceeded' ||
    errMsg.includes('quota') ||
    errMsg.includes('resource-exhausted') ||
    errMsg.includes('limit exceeded') ||
    errMsg.includes('exhausted')
  );
  if (isQuota) {
    markQuotaExhausted();
  }
  return isQuota || errCode === 'permission-denied' || errCode === 'unavailable' || errMsg.includes('offline');
};

// Helper to remove undefined fields recursively so Firestore doesn't reject writing them
const cleanUndefined = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      result[key] = cleanUndefined(val);
    }
  }
  return result;
};

// Helper to generate a random session ID if not already stored
export const getOrCreateSessionId = (): string => {
  if (currentSessionId) return currentSessionId;
  
  let stored = localStorage.getItem('s_fashion_session_id');
  if (!stored) {
    const prefix = 'sess_' + Math.random().toString(36).substring(2, 10);
    const suffix = Date.now().toString(36);
    stored = `${prefix}_${suffix}`;
    localStorage.setItem('s_fashion_session_id', stored);
  }
  currentSessionId = stored;
  return stored;
};

// Helper to detect device
const getDeviceInfo = (): string => {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return "🌐 Tablet";
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Opera Mini/i.test(ua)) {
    return "📱 Mobile";
  }
  return "💻 Desktop";
};

// Start or resume visitor session
export const startVisitorSession = async (): Promise<VisitorSession> => {
  const sessionId = getOrCreateSessionId();
  const idSuffix = '#' + sessionId.split('_')[1].substring(0, 4).toUpperCase();
  const now = new Date().toISOString();

  // Return the existing data if we already computed it in memory
  if (currentSessionData) return currentSessionData;

  // Read saved spin details from local storage to auto-sync with visitor session
  const savedSpun = localStorage.getItem('sera_wheel_has_spun');
  const savedCoupon = localStorage.getItem('sera_wheel_won_coupon');
  
  let localHasSpun = false;
  let localWonCode = '';
  let localWonLabel = '';
  let localWonDiscount = 0;
  let localCustomerName = 'Anonymous Visitor';
  let localMobileNumber = '';

  if (savedSpun === 'true' && savedCoupon) {
    try {
      const couponObj = JSON.parse(savedCoupon);
      localHasSpun = true;
      localWonCode = couponObj.code || '';
      localWonLabel = couponObj.labelBn || couponObj.label || '';
      localWonDiscount = Number(couponObj.discount) || 0;
      if (couponObj.name) localCustomerName = couponObj.name;
      if (couponObj.phone) localMobileNumber = couponObj.phone;
    } catch {
      // Ignore spin read error silently
    }
  }

  const defaultSession: VisitorSession = {
    sessionId,
    idSuffix,
    customerName: localCustomerName,
    mobileNumber: localMobileNumber,
    deviceInfo: getDeviceInfo(),
    currentStage: localHasSpun ? 'product_view' : 'browsing_home',
    currentStageLabel: localHasSpun ? `স্পিন অফার পেয়েছেন 🎁` : 'হোম পেজ ভিজিট',
    views: [],
    createdAt: now,
    lastActiveAt: now,
    hasSpun: localHasSpun ? true : undefined,
    wonCouponCode: localWonCode || undefined,
    wonCouponLabel: localWonLabel || undefined,
    wonCouponDiscount: localWonDiscount || undefined
  };

  const setupHeartbeat = () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(async () => {
      const currentNow = new Date().toISOString();
      if (currentSessionData) {
        currentSessionData.lastActiveAt = currentNow;
        syncSessionToServer(currentSessionData, false);
      }

      if (isOfflineTracking || checkIsQuotaExhausted()) return;

      try {
        const { db: freshDb } = await initializeFirebase();
        if (!freshDb) return;
        const sessionDoc = doc(freshDb, 'visitor_sessions', sessionId);
        await setDoc(sessionDoc, cleanUndefined({ sessionId, lastActiveAt: currentNow }), { merge: true });
      } catch (e) {
        if (detectQuotaError(e)) {
          isOfflineTracking = true;
        }
      }
    }, 20000);
  };

  if (isOfflineTracking || checkIsQuotaExhausted()) {
    isOfflineTracking = true;
    currentSessionData = defaultSession;
    setupHeartbeat();
    return currentSessionData;
  }

  try {
    const { db } = await initializeFirebase();
    if (!db) {
      isOfflineTracking = true;
      currentSessionData = defaultSession;
      setupHeartbeat();
      return currentSessionData;
    }

    const docRef = doc(db, 'visitor_sessions', sessionId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const existingData = docSnap.data() as VisitorSession;
      currentSessionData = { ...existingData };
      currentSessionData.lastActiveAt = now;

      // Sync local spin data if not already present in Firestore
      let hasUpdates = false;
      const syncUpdates: any = { lastActiveAt: now };

      if (localHasSpun && !existingData.hasSpun) {
        currentSessionData.hasSpun = true;
        currentSessionData.wonCouponCode = localWonCode;
        currentSessionData.wonCouponLabel = localWonLabel;
        currentSessionData.wonCouponDiscount = localWonDiscount;
        syncUpdates.hasSpun = true;
        syncUpdates.wonCouponCode = localWonCode;
        syncUpdates.wonCouponLabel = localWonLabel;
        syncUpdates.wonCouponDiscount = localWonDiscount;
        hasUpdates = true;
      }

      if (localCustomerName && localCustomerName !== 'Anonymous Visitor' && (!existingData.customerName || existingData.customerName === 'Anonymous Visitor')) {
        currentSessionData.customerName = localCustomerName;
        syncUpdates.customerName = localCustomerName;
        hasUpdates = true;
      }

      if (localMobileNumber && !existingData.mobileNumber) {
        currentSessionData.mobileNumber = localMobileNumber;
        syncUpdates.mobileNumber = localMobileNumber;
        hasUpdates = true;
      }

      await setDoc(docRef, cleanUndefined(syncUpdates), { merge: true });
    } else {
      currentSessionData = { ...defaultSession };
      await setDoc(docRef, cleanUndefined(currentSessionData));
    }
  } catch (error) {
    if (detectQuotaError(error)) {
      isOfflineTracking = true;
    }
    currentSessionData = defaultSession;
  }

  setupHeartbeat();
  if (currentSessionData) {
    saveAndBroadcastSession(currentSessionData);
  }
  return currentSessionData;
};

// Update active stage of visitor
export const updateVisitorStage = async (stage: VisitorStage, stageLabel: string) => {
  if (!currentSessionData) {
    await startVisitorSession();
  }
  if (!currentSessionData) return;

  const STAGE_RANKS: Record<VisitorStage, number> = {
    browsing_home: 1,
    product_view: 2,
    added_to_cart: 3,
    filling_checkout: 4,
    order_completed: 5
  };

  const currentStage = currentSessionData.currentStage || 'browsing_home';
  if (STAGE_RANKS[stage] < STAGE_RANKS[currentStage]) {
    // Stage downgrade is forbidden to preserve peak funnel progress!
    return;
  }

  currentSessionData.currentStage = stage;
  currentSessionData.currentStageLabel = stageLabel;
  currentSessionData.lastActiveAt = new Date().toISOString();

  saveAndBroadcastSession(currentSessionData);

  if (isOfflineTracking || checkIsQuotaExhausted()) return;

  try {
    const { db } = await initializeFirebase();
    if (!db) return;
    const docRef = doc(db, 'visitor_sessions', currentSessionData.sessionId);
    await setDoc(docRef, cleanUndefined({
      sessionId: currentSessionData.sessionId,
      currentStage: stage,
      currentStageLabel: stageLabel,
      lastActiveAt: currentSessionData.lastActiveAt
    }), { merge: true });
  } catch (err) {
    if (detectQuotaError(err)) {
      isOfflineTracking = true;
    }
  }
};

// Track specific product view
export const trackProductView = async (product: Product) => {
  if (!currentSessionData) {
    await startVisitorSession();
  }
  if (!currentSessionData) return;

  const existIndex = currentSessionData.views.findIndex(v => v.productCode === product.productCode);
  const now = new Date().toISOString();
  
  const viewItem: ProductView = {
    productCode: product.productCode,
    productTitle: product.title,
    category: product.category,
    price: product.price,
    imageUrl: product.imageUrl,
    viewedAt: now
  };

  let updatedViews = [...currentSessionData.views];
  if (existIndex > -1) {
    updatedViews.splice(existIndex, 1);
  }
  updatedViews.unshift(viewItem);
  if (updatedViews.length > 15) {
    updatedViews = updatedViews.slice(0, 15);
  }

  currentSessionData.views = updatedViews;
  
  const STAGE_RANKS: Record<VisitorStage, number> = {
    browsing_home: 1,
    product_view: 2,
    added_to_cart: 3,
    filling_checkout: 4,
    order_completed: 5
  };
  const currentStage = currentSessionData.currentStage || 'browsing_home';
  const shouldUpdateStage = STAGE_RANKS['product_view'] >= STAGE_RANKS[currentStage];

  if (shouldUpdateStage) {
    currentSessionData.currentStage = 'product_view';
    currentSessionData.currentStageLabel = `প্রোডাক্ট দেখছেন: ${product.title}`;
  }
  currentSessionData.lastActiveAt = now;

  saveAndBroadcastSession(currentSessionData);

  if (isOfflineTracking || checkIsQuotaExhausted()) return;

  try {
    const { db } = await initializeFirebase();
    if (!db) return;
    const docRef = doc(db, 'visitor_sessions', currentSessionData.sessionId);
    await setDoc(docRef, cleanUndefined({
      sessionId: currentSessionData.sessionId,
      views: updatedViews,
      ...(shouldUpdateStage && {
        currentStage: 'product_view',
        currentStageLabel: `প্রোডাক্ট দেখছেন: ${product.title}`
      }),
      lastActiveAt: now
    }), { merge: true });
  } catch (err) {
    if (detectQuotaError(err)) {
      isOfflineTracking = true;
    }
  }
};

// Dynamically update form inputs as customer types them so live updates show up
export const updateVisitorCustomerInfo = async (info: {
  customerName?: string;
  mobileNumber?: string;
  district?: string;
  upazila?: string;
  address?: string;
}) => {
  if (!currentSessionData) {
    await startVisitorSession();
  }
  if (!currentSessionData) return;

  const now = new Date().toISOString();
  const updates: any = { lastActiveAt: now };

  if (info.customerName !== undefined) {
    updates.customerName = info.customerName || 'Anonymous Visitor';
    currentSessionData.customerName = updates.customerName;
  }
  if (info.mobileNumber !== undefined) {
    updates.mobileNumber = info.mobileNumber || '';
    currentSessionData.mobileNumber = updates.mobileNumber;
  }
  if (info.district !== undefined) {
    updates.district = info.district;
    currentSessionData.district = updates.district;
  }
  if (info.upazila !== undefined) {
    updates.upazila = info.upazila;
    currentSessionData.upazila = updates.upazila;
  }
  if (info.address !== undefined) {
    updates.address = info.address;
    currentSessionData.address = updates.address;
  }

  currentSessionData.lastActiveAt = now;

  saveAndBroadcastSession(currentSessionData);

  if (isOfflineTracking || checkIsQuotaExhausted()) return;

  try {
    const { db } = await initializeFirebase();
    if (!db) return;
    const docRef = doc(db, 'visitor_sessions', currentSessionData.sessionId);
    await setDoc(docRef, cleanUndefined({ sessionId: currentSessionData.sessionId, ...updates }), { merge: true });
  } catch (err) {
    if (detectQuotaError(err)) {
      isOfflineTracking = true;
    }
  }
};

// Update visitor spin information
export const updateVisitorSpinInfo = async (spinData: {
  hasSpun: boolean;
  wonCouponCode: string;
  wonCouponLabel: string;
  wonCouponDiscount: number;
  customerName?: string;
  mobileNumber?: string;
}) => {
  if (!currentSessionData) {
    await startVisitorSession();
  }
  if (!currentSessionData) return;

  const now = new Date().toISOString();
  currentSessionData.hasSpun = spinData.hasSpun;
  currentSessionData.wonCouponCode = spinData.wonCouponCode;
  currentSessionData.wonCouponLabel = spinData.wonCouponLabel;
  currentSessionData.wonCouponDiscount = spinData.wonCouponDiscount;
  if (spinData.customerName) {
    currentSessionData.customerName = spinData.customerName;
  }
  if (spinData.mobileNumber) {
    currentSessionData.mobileNumber = spinData.mobileNumber;
  }
  currentSessionData.lastActiveAt = now;

  saveAndBroadcastSession(currentSessionData, true);

  const updates: any = {
    sessionId: currentSessionData.sessionId,
    hasSpun: spinData.hasSpun,
    wonCouponCode: spinData.wonCouponCode,
    wonCouponLabel: spinData.wonCouponLabel,
    wonCouponDiscount: spinData.wonCouponDiscount,
    lastActiveAt: now,
    ...(spinData.customerName && { customerName: spinData.customerName }),
    ...(spinData.mobileNumber && { mobileNumber: spinData.mobileNumber })
  };

  if (isOfflineTracking || checkIsQuotaExhausted()) return;

  try {
    const { db } = await initializeFirebase();
    if (!db) return;
    const docRef = doc(db, 'visitor_sessions', currentSessionData.sessionId);
    await setDoc(docRef, cleanUndefined(updates), { merge: true });
  } catch (err) {
    if (detectQuotaError(err)) {
      isOfflineTracking = true;
    }
  }
};

// Log a specific interaction event (e.g. click, scroll, input, visit)
export const logVisitorEvent = async (
  type: 'click' | 'scroll' | 'input' | 'page_view' | 'system',
  target: string,
  description: string,
  path: string,
  scrollDepth?: number
) => {
  if (!currentSessionData) {
    try {
      await startVisitorSession();
    } catch {
      return;
    }
  }
  if (!currentSessionData) return;

  const now = new Date();
  const elapsed = Math.round((now.getTime() - new Date(currentSessionData.createdAt).getTime()) / 1000);

  const event: TrackingEvent = {
    id: 'evt_' + Math.random().toString(36).substring(2, 9),
    type,
    description,
    target,
    path,
    timestamp: now.toISOString(),
    elapsedTime: Math.max(0, elapsed)
  };

  if (scrollDepth !== undefined) {
    event.scrollDepth = scrollDepth;
  }

  if (!currentSessionData.events) {
    currentSessionData.events = [];
  }

  // Deduplicate scroll logs within 4 seconds
  if (type === 'scroll') {
    const lastEvent = currentSessionData.events[0];
    if (lastEvent && lastEvent.type === 'scroll') {
      const diff = now.getTime() - new Date(lastEvent.timestamp).getTime();
      if (diff < 4000) {
        lastEvent.scrollDepth = scrollDepth;
        lastEvent.description = description;
        lastEvent.timestamp = event.timestamp;
        lastEvent.elapsedTime = Math.max(0, elapsed);

        saveAndBroadcastSession(currentSessionData);

        if (isOfflineTracking || checkIsQuotaExhausted()) return;

        try {
          const { db } = await initializeFirebase();
          if (!db) return;
          const docRef = doc(db, 'visitor_sessions', currentSessionData.sessionId);
          await setDoc(docRef, cleanUndefined({ sessionId: currentSessionData.sessionId, events: currentSessionData.events }), { merge: true });
        } catch (e) {
          if (detectQuotaError(e)) {
            isOfflineTracking = true;
          }
        }
        return;
      }
    }
  }

  // Deduplicate input field typing logs within 5 seconds for the same target
  if (type === 'input') {
    const lastEvent = currentSessionData.events[0];
    if (lastEvent && lastEvent.type === 'input' && lastEvent.target === target) {
      const diff = now.getTime() - new Date(lastEvent.timestamp).getTime();
      if (diff < 5000) {
        lastEvent.description = description;
        lastEvent.timestamp = event.timestamp;
        lastEvent.elapsedTime = Math.max(0, elapsed);

        saveAndBroadcastSession(currentSessionData);

        if (isOfflineTracking || checkIsQuotaExhausted()) return;

        try {
          const { db } = await initializeFirebase();
          if (!db) return;
          const docRef = doc(db, 'visitor_sessions', currentSessionData.sessionId);
          await setDoc(docRef, cleanUndefined({ sessionId: currentSessionData.sessionId, events: currentSessionData.events }), { merge: true });
        } catch (e) {
          if (detectQuotaError(e)) {
            isOfflineTracking = true;
          }
        }
        return;
      }
    }
  }

  // Add search/click/visit event to the front of the list
  currentSessionData.events.unshift(event);

  if (currentSessionData.events.length > 60) {
    currentSessionData.events = currentSessionData.events.slice(0, 60);
  }

  saveAndBroadcastSession(currentSessionData, target === 'spin_wheel_completed');

  if (isOfflineTracking || checkIsQuotaExhausted()) return;

  try {
    const { db } = await initializeFirebase();
    if (!db) return;
    const docRef = doc(db, 'visitor_sessions', currentSessionData.sessionId);
    await setDoc(docRef, cleanUndefined({
      sessionId: currentSessionData.sessionId,
      events: currentSessionData.events,
      lastActiveAt: now.toISOString()
    }), { merge: true });
  } catch (err) {
    if (detectQuotaError(err)) {
      isOfflineTracking = true;
    }
  }
};

// Listen to all live visitor sessions (combining Firestore + Supabase + Server API + Local Cross-Tab Broadcast)
export const subscribeToVisitorSessions = async (callback: (sessions: VisitorSession[]) => void) => {
  let firestoreSessions: VisitorSession[] = [];
  let serverSessions: VisitorSession[] = [];
  let supabaseSessions: VisitorSession[] = [];

  const mergeSessionEntry = (existing: VisitorSession | undefined, incoming: VisitorSession): VisitorSession => {
    if (!existing) return incoming;
    const incomingNewer =
      new Date(incoming.lastActiveAt).getTime() >= new Date(existing.lastActiveAt).getTime();
    const base = incomingNewer ? { ...existing, ...incoming } : { ...incoming, ...existing };
    return {
      ...base,
      customerName:
        (base.customerName && base.customerName !== 'Anonymous Visitor' ? base.customerName : '') ||
        (existing.customerName && existing.customerName !== 'Anonymous Visitor' ? existing.customerName : '') ||
        incoming.customerName ||
        'Anonymous Visitor',
      mobileNumber: base.mobileNumber || existing.mobileNumber || incoming.mobileNumber || '',
      hasSpun: Boolean(existing.hasSpun || incoming.hasSpun),
      wonCouponCode: base.wonCouponCode || existing.wonCouponCode || incoming.wonCouponCode,
      wonCouponLabel: base.wonCouponLabel || existing.wonCouponLabel || incoming.wonCouponLabel,
      wonCouponDiscount: base.wonCouponDiscount ?? existing.wonCouponDiscount ?? incoming.wonCouponDiscount,
    };
  };

  const getMergedSessions = (): VisitorSession[] => {
    const map = new Map<string, VisitorSession>();

    // 1. Load from localStorage cache
    try {
      const cachedStr = localStorage.getItem('s_fashion_live_sessions_cache');
      if (cachedStr) {
        const localMap: Record<string, VisitorSession> = JSON.parse(cachedStr);
        Object.values(localMap).forEach((sess) => {
          if (sess && sess.sessionId) {
            map.set(sess.sessionId, mergeSessionEntry(map.get(sess.sessionId), sess));
          }
        });
      }
    } catch {
      // Silently handle read cache issue
    }

    // 2. Merge with Supabase Cloud sessions (works across ALL devices & deployments)
    supabaseSessions.forEach((sess) => {
      if (sess && sess.sessionId) {
        map.set(sess.sessionId, mergeSessionEntry(map.get(sess.sessionId), sess));
      }
    });

    // 3. Merge with Server cross-device sessions
    serverSessions.forEach((sess) => {
      if (sess && sess.sessionId) {
        map.set(sess.sessionId, mergeSessionEntry(map.get(sess.sessionId), sess));
      }
    });

    // 4. Merge with Firestore sessions
    firestoreSessions.forEach((sess) => {
      if (sess && sess.sessionId) {
        map.set(sess.sessionId, mergeSessionEntry(map.get(sess.sessionId), sess));
      }
    });

    // 5. Ensure current local session is always present and updated
    if (currentSessionData && currentSessionData.sessionId) {
      map.set(currentSessionData.sessionId, mergeSessionEntry(map.get(currentSessionData.sessionId), currentSessionData));
    }

    const list = Array.from(map.values());
    list.sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());
    return list;
  };

  const fetchServerSessions = async () => {
    try {
      const res = await fetch('/api/visitor-sessions', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          serverSessions = data;
          callback(getMergedSessions());
        }
      }
    } catch {
      // Ignore network polling errors silently
    }
  };

  const fetchSupabaseSessions = async () => {
    try {
      const data = await supabaseFetchVisitorSessions();
      if (Array.isArray(data)) {
        supabaseSessions = data;
        callback(getMergedSessions());
      }
    } catch {
      // Ignore network errors silently
    }
  };

  // Immediate emission + initial cross-device fetches
  callback(getMergedSessions());
  fetchSupabaseSessions();
  fetchServerSessions();

  const pollInterval = setInterval(() => {
    fetchSupabaseSessions();
    fetchServerSessions();
  }, 8000);

  const unsubscribeSupabase = subscribeSupabaseVisitorSessions(() => {
    fetchSupabaseSessions();
  });

  // Listen for BroadcastChannel updates
  const handleBcMessage = (event: MessageEvent) => {
    if (event.data && event.data.type === 'SESSION_UPDATE') {
      callback(getMergedSessions());
    }
  };

  if (trackingChannel) {
    trackingChannel.addEventListener('message', handleBcMessage);
  }

  // Listen for StorageEvent updates
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === 's_fashion_live_sessions_cache') {
      callback(getMergedSessions());
    }
  };
  window.addEventListener('storage', handleStorageEvent);

  let unsubscribeFirestore = () => {};

  try {
    if (!checkIsQuotaExhausted() && !isOfflineTracking) {
      const { db } = await initializeFirebase();
      if (db && !isOfflineTracking) {
        const sessionsCol = collection(db, 'visitor_sessions');
        const q = query(sessionsCol);
        unsubscribeFirestore = onSnapshot(q, (snapshot) => {
          firestoreSessions = [];
          snapshot.forEach((docSnap) => {
            firestoreSessions.push({ id: docSnap.id, ...docSnap.data() } as VisitorSession);
          });
          callback(getMergedSessions());
        }, (err) => {
          const code = String((err as any)?.code || '').toLowerCase();
          if (code !== 'permission-denied' && detectQuotaError(err)) {
            isOfflineTracking = true;
          }
          callback(getMergedSessions());
        });
      }
    }
  } catch (err) {
    if (detectQuotaError(err)) {
      isOfflineTracking = true;
    }
    callback(getMergedSessions());
  }

  return () => {
    clearInterval(pollInterval);
    unsubscribeSupabase();
    unsubscribeFirestore();
    if (trackingChannel) {
      trackingChannel.removeEventListener('message', handleBcMessage);
    }
    window.removeEventListener('storage', handleStorageEvent);
  };
};
