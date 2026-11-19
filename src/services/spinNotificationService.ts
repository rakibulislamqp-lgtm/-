import { sendSpinTelegramNotification } from './notificationService';
import {
  supabaseFetchVisitorSessions,
  subscribeSupabaseVisitorSessions,
} from './supabaseService';
import { VisitorSession } from '../types';

export interface SpinNotification {
  id: string;
  sessionId: string;
  customerName: string;
  mobileNumber: string;
  wonCouponCode: string;
  wonCouponLabel: string;
  wonCouponDiscount: number;
  discountType?: 'flat' | 'percentage';
  deviceInfo?: string;
  createdAt: string;
  read?: boolean;
}

const STORAGE_KEY = 'sera_spin_notifications_cache';
const READ_IDS_STORAGE_KEY = 'sera_read_spin_notif_ids';
const BC_CHANNEL_NAME = 'sera_spin_notifications_bc';

const spinBc =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel(BC_CHANNEL_NAME)
    : null;

const getReadIdsSet = (): Set<string> => {
  try {
    const raw = localStorage.getItem(READ_IDS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
};

const addReadIds = (ids: string[]) => {
  try {
    const set = getReadIdsSet();
    ids.forEach((id) => {
      if (id) set.add(String(id));
    });
    const arr = Array.from(set).slice(-300);
    localStorage.setItem(READ_IDS_STORAGE_KEY, JSON.stringify(arr));
  } catch {}
};

export const getCachedSpinNotifications = (): SpinNotification[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const readSet = getReadIdsSet();
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      ...item,
      read: Boolean(item.read || readSet.has(item.id) || (item.sessionId && readSet.has(`sess:${item.sessionId}`))),
    }));
  } catch {
    return [];
  }
};

const mergeSpinNotificationLists = (
  primary: SpinNotification[],
  secondary: SpinNotification[]
): SpinNotification[] => {
  const readSet = getReadIdsSet();
  const bySessionKey = new Map<string, SpinNotification>();

  // Process oldest/secondary first, then newer/primary so REST details win if same session
  [...secondary, ...primary].forEach((item) => {
    if (!item || (!item.id && !item.sessionId)) return;
    const dedupeKey = item.sessionId ? `sess:${item.sessionId}` : item.id;
    const prev = bySessionKey.get(dedupeKey);
    const isRead = Boolean(
      item.read ||
      prev?.read ||
      readSet.has(item.id) ||
      (item.sessionId && readSet.has(`sess:${item.sessionId}`))
    );

    if (!prev) {
      bySessionKey.set(dedupeKey, { ...item, read: isRead });
    } else {
      // Prefer richer non-fallback record (e.g. from /api/spin-notifications or richer customerName)
      const preferItem =
        !String(item.id).startsWith('supa_spin_') ||
        String(prev.id).startsWith('supa_spin_');
      const base = preferItem ? { ...prev, ...item } : { ...item, ...prev };
      bySessionKey.set(dedupeKey, {
        ...base,
        customerName:
          (base.customerName && base.customerName !== 'Anonymous Visitor' ? base.customerName : '') ||
          prev.customerName ||
          item.customerName ||
          'Anonymous Visitor',
        mobileNumber: base.mobileNumber || prev.mobileNumber || item.mobileNumber || '',
        read: isRead,
      });
    }
  });

  return Array.from(bySessionKey.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 100);
};

const persistLocalSpinNotifications = (list: SpinNotification[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 100)));
  } catch {
    // Ignore quota failures
  }
};

const mapSpunSessionToNotification = (sess: VisitorSession): SpinNotification | null => {
  if (!sess || !sess.sessionId) return null;
  const hasSpun =
    sess.hasSpun === true ||
    String(sess.hasSpun) === 'true' ||
    Boolean(sess.wonCouponCode || sess.wonCouponLabel);
  if (!hasSpun) return null;

  return {
    id: `supa_spin_${sess.sessionId}`,
    sessionId: sess.sessionId,
    customerName: (sess.customerName || 'Anonymous Visitor').trim(),
    mobileNumber: (sess.mobileNumber || '').trim(),
    wonCouponCode: sess.wonCouponCode || 'SERA_SPIN',
    wonCouponLabel: sess.wonCouponLabel || 'স্পিন অফার',
    wonCouponDiscount: Number(sess.wonCouponDiscount) || 0,
    deviceInfo: sess.deviceInfo || '📱 Mobile',
    createdAt: sess.lastActiveAt || sess.createdAt || new Date().toISOString(),
    read: false,
  };
};

export const publishSpinNotification = async (payload: {
  sessionId: string;
  customerName: string;
  mobileNumber: string;
  wonCouponCode: string;
  wonCouponLabel: string;
  wonCouponDiscount: number;
  discountType?: 'flat' | 'percentage';
  deviceInfo?: string;
}): Promise<SpinNotification> => {
  const notification: SpinNotification = {
    id: `spin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    sessionId: payload.sessionId || `sess_${Date.now()}`,
    customerName: (payload.customerName || 'Anonymous Visitor').trim(),
    mobileNumber: (payload.mobileNumber || '').trim(),
    wonCouponCode: (payload.wonCouponCode || 'SERA_SPIN').trim(),
    wonCouponLabel: (payload.wonCouponLabel || 'স্পিন অফার').trim(),
    wonCouponDiscount: Number(payload.wonCouponDiscount) || 0,
    discountType: payload.discountType === 'flat' ? 'flat' : 'percentage',
    deviceInfo: payload.deviceInfo || '',
    createdAt: new Date().toISOString(),
    read: false,
  };

  // 1. Immediate same-browser cache + BroadcastChannel + window event
  const merged = mergeSpinNotificationLists([notification], getCachedSpinNotifications());
  persistLocalSpinNotifications(merged);

  if (spinBc) {
    try {
      spinBc.postMessage({ type: 'NEW_SPIN', notification });
    } catch {}
  }

  try {
    window.dispatchEvent(new CustomEvent('spin_notification_received', { detail: notification }));
  } catch {}

  // 2. Real-time Express server hub (SSE + cross-device persistence)
  try {
    fetch('/api/spin-notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification),
      keepalive: true,
    }).catch(() => {});
  } catch {}

  // 3. Optional Telegram notification if Admin configured bot credentials
  sendSpinTelegramNotification(notification).catch(() => {});

  return notification;
};

export const markSpinNotificationsRead = async (ids: string[] | 'all' = 'all'): Promise<SpinNotification[]> => {
  const cached = getCachedSpinNotifications();
  const idSet = ids === 'all' ? null : new Set(ids);

  const newlyReadTokens: string[] = [];
  const updatedLocal = cached.map((item) => {
    if (idSet === null || idSet.has(item.id)) {
      newlyReadTokens.push(item.id);
      if (item.sessionId) newlyReadTokens.push(`sess:${item.sessionId}`);
      return { ...item, read: true };
    }
    return item;
  });

  addReadIds(newlyReadTokens);
  persistLocalSpinNotifications(updatedLocal);

  if (spinBc) {
    try {
      spinBc.postMessage({ type: 'MARK_READ', ids });
    } catch {}
  }

  try {
    const res = await fetch('/api/spin-notifications/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.notifications)) {
        const merged = mergeSpinNotificationLists(data.notifications, updatedLocal);
        persistLocalSpinNotifications(merged);
        return merged;
      }
    }
  } catch {}

  return updatedLocal;
};

export const subscribeToSpinNotifications = (
  onListUpdate: (list: SpinNotification[]) => void,
  onNewNotification?: (notif: SpinNotification) => void
) => {
  let currentList = getCachedSpinNotifications();
  const seenKeys = new Set<string>(
    currentList.map((n) => (n.sessionId ? `sess:${n.sessionId}` : n.id))
  );
  const mountedAtMs = Date.now();
  let isDisposed = false;

  onListUpdate(currentList);

  const ingestIncomingList = (incoming: SpinNotification[], notifyNew: boolean) => {
    if (isDisposed || !Array.isArray(incoming)) return;
    const readSet = getReadIdsSet();
    const newlyArrived: SpinNotification[] = [];

    incoming.forEach((item) => {
      if (!item || (!item.id && !item.sessionId)) return;
      const key = item.sessionId ? `sess:${item.sessionId}` : item.id;
      const isRead = Boolean(item.read || readSet.has(item.id) || (item.sessionId && readSet.has(`sess:${item.sessionId}`)));

      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const createdMs = new Date(item.createdAt).getTime();
        // Trigger live toast/sound for spins created right around or after dashboard mount
        if (notifyNew && !isRead && createdMs >= mountedAtMs - 30000) {
          newlyArrived.push({ ...item, read: false });
        }
      }
    });

    currentList = mergeSpinNotificationLists(incoming, currentList);
    persistLocalSpinNotifications(currentList);
    onListUpdate(currentList);

    if (onNewNotification && newlyArrived.length > 0) {
      newlyArrived
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .forEach((notif) => onNewNotification(notif));
    }
  };

  const fetchServerNotifications = async (notifyNew: boolean) => {
    try {
      const res = await fetch('/api/spin-notifications', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          ingestIncomingList(data, notifyNew);
        }
      }
    } catch {
      // Ignore polling error silently
    }
  };

  const fetchSupabaseSpinNotifications = async (notifyNew: boolean) => {
    try {
      const sessions = await supabaseFetchVisitorSessions();
      if (!Array.isArray(sessions)) return;
      const mapped = sessions
        .map(mapSpunSessionToNotification)
        .filter((x): x is SpinNotification => x !== null);
      if (mapped.length > 0) {
        ingestIncomingList(mapped, notifyNew);
      }
    } catch {
      // Ignore silently
    }
  };

  // Initial fetch from both REST and Supabase Cloud (populates history silently without false alerts)
  fetchServerNotifications(false);
  fetchSupabaseSpinNotifications(false);

  // 1. Live Server-Sent Events (sub-second cross-device push on shared server)
  let eventSource: EventSource | null = null;
  if (typeof window !== 'undefined' && 'EventSource' in window) {
    try {
      eventSource = new EventSource('/api/spin-notifications/stream');
      eventSource.addEventListener('spin_notification', (evt: MessageEvent) => {
        try {
          const notif = JSON.parse(evt.data) as SpinNotification;
          if (notif && (notif.id || notif.sessionId)) {
            ingestIncomingList([notif], true);
          }
        } catch {}
      });
    } catch {}
  }

  // 2. Supabase Cloud Realtime (works globally across Vercel, Cloud Run Dev/Shared URLs, Mobile & PC!)
  const unsubSupabaseRealtime = subscribeSupabaseVisitorSessions((payload) => {
    const newRow = payload?.new;
    if (newRow && newRow.has_spun) {
      const raw = newRow.raw_data || {};
      const notif: SpinNotification = {
        id: `supa_spin_${newRow.session_id}`,
        sessionId: newRow.session_id,
        customerName: (newRow.customer_name || raw.customerName || 'Anonymous Visitor').trim(),
        mobileNumber: (newRow.mobile_number || raw.mobileNumber || '').trim(),
        wonCouponCode: raw.wonCouponCode || 'SERA_SPIN',
        wonCouponLabel: raw.wonCouponLabel || 'স্পিন অফার',
        wonCouponDiscount: Number(raw.wonCouponDiscount) || 0,
        deviceInfo: raw.deviceInfo || '📱 Mobile',
        createdAt: newRow.last_active_at || raw.lastActiveAt || new Date().toISOString(),
        read: false,
      };
      ingestIncomingList([notif], true);
    } else {
      fetchSupabaseSpinNotifications(true);
    }
  });

  // 3. Fallback polling every 6 seconds for both REST & Supabase
  const pollTimer = setInterval(() => {
    fetchServerNotifications(true);
    fetchSupabaseSpinNotifications(true);
  }, 6000);

  // 4. Same-browser BroadcastChannel + custom event + storage sync
  const handleBc = (event: MessageEvent) => {
    if (event.data?.type === 'NEW_SPIN' && event.data.notification) {
      ingestIncomingList([event.data.notification], true);
    } else if (event.data?.type === 'MARK_READ') {
      currentList = getCachedSpinNotifications();
      onListUpdate(currentList);
    }
  };
  if (spinBc) {
    spinBc.addEventListener('message', handleBc);
  }

  const handleWindowEvent = (e: any) => {
    if (e?.detail?.id || e?.detail?.sessionId) {
      ingestIncomingList([e.detail], true);
    }
  };
  window.addEventListener('spin_notification_received', handleWindowEvent);

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === READ_IDS_STORAGE_KEY) {
      currentList = getCachedSpinNotifications();
      onListUpdate(currentList);
    }
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    isDisposed = true;
    clearInterval(pollTimer);
    unsubSupabaseRealtime();
    if (eventSource) {
      eventSource.close();
    }
    if (spinBc) {
      spinBc.removeEventListener('message', handleBc);
    }
    window.removeEventListener('spin_notification_received', handleWindowEvent);
    window.removeEventListener('storage', handleStorage);
  };
};
