import { BrandSettings } from '../types';
import { getOrCreateSessionId } from './trackingService';

export type LiveViewerMode = 'combined' | 'real_only' | 'fake_only';

export interface LiveViewerSummary {
  totalRealOnline: number;
  byProduct: Record<string, number>;
  updatedAt: string;
}

const LOCAL_PRESENCE_KEY = 'sera_live_viewer_presence_map';
const PRESENCE_TTL_MS = 45000;

const presenceChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('sera_live_viewer_presence_bc')
    : null;

interface LocalPresenceRecord {
  sessionId: string;
  productCode?: string;
  lastSeen: number;
}

function readLocalPresenceMap(): Record<string, LocalPresenceRecord> {
  try {
    const raw = localStorage.getItem(LOCAL_PRESENCE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const now = Date.now();
    const cleaned: Record<string, LocalPresenceRecord> = {};
    for (const key of Object.keys(parsed || {})) {
      const entry = parsed[key];
      if (entry && typeof entry.lastSeen === 'number' && now - entry.lastSeen <= PRESENCE_TTL_MS) {
        cleaned[key] = entry;
      }
    }
    return cleaned;
  } catch {
    return {};
  }
}

function writeLocalPresenceEntry(sessionId: string, productCode?: string) {
  try {
    const map = readLocalPresenceMap();
    map[sessionId] = {
      sessionId,
      productCode: productCode || undefined,
      lastSeen: Date.now(),
    };
    localStorage.setItem(LOCAL_PRESENCE_KEY, JSON.stringify(map));
    if (presenceChannel) {
      presenceChannel.postMessage({ type: 'PRESENCE_UPDATE' });
    }
  } catch {}
}

function removeLocalPresenceEntry(sessionId: string) {
  try {
    const map = readLocalPresenceMap();
    if (map[sessionId]) {
      delete map[sessionId];
      localStorage.setItem(LOCAL_PRESENCE_KEY, JSON.stringify(map));
      if (presenceChannel) {
        presenceChannel.postMessage({ type: 'PRESENCE_UPDATE' });
      }
    }
  } catch {}
}

function computeLocalSummary(): LiveViewerSummary {
  const map = readLocalPresenceMap();
  const byProduct: Record<string, number> = {};
  const entries = Object.values(map);
  entries.forEach((entry) => {
    if (entry.productCode) {
      byProduct[entry.productCode] = (byProduct[entry.productCode] || 0) + 1;
    }
  });
  return {
    totalRealOnline: entries.length,
    byProduct,
    updatedAt: new Date().toISOString(),
  };
}

function mergeSummaries(serverSummary: LiveViewerSummary | null, localSummary: LiveViewerSummary): LiveViewerSummary {
  if (!serverSummary) return localSummary;
  const byProduct: Record<string, number> = { ...localSummary.byProduct };
  for (const code of Object.keys(serverSummary.byProduct || {})) {
    byProduct[code] = Math.max(byProduct[code] || 0, serverSummary.byProduct[code] || 0);
  }
  return {
    totalRealOnline: Math.max(serverSummary.totalRealOnline || 0, localSummary.totalRealOnline || 0),
    byProduct,
    updatedAt: serverSummary.updatedAt || localSummary.updatedAt,
  };
}

export const sendLiveViewerHeartbeat = async (productCode?: string): Promise<LiveViewerSummary> => {
  const sessionId = getOrCreateSessionId();
  writeLocalPresenceEntry(sessionId, productCode);
  const localSummary = computeLocalSummary();

  try {
    const res = await fetch('/api/live-viewers/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, productCode: productCode || '' }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.totalRealOnline === 'number') {
        return mergeSummaries(data, localSummary);
      }
    }
  } catch {}

  return localSummary;
};

export const sendLiveViewerLeave = () => {
  const sessionId = getOrCreateSessionId();
  removeLocalPresenceEntry(sessionId);
  try {
    const payload = JSON.stringify({ sessionId });
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/live-viewers/leave', blob);
    } else {
      fetch('/api/live-viewers/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {}
};

export const fetchLiveViewerSummary = async (): Promise<LiveViewerSummary> => {
  const localSummary = computeLocalSummary();
  try {
    const res = await fetch('/api/live-viewers/summary', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.totalRealOnline === 'number') {
        return mergeSummaries(data, localSummary);
      }
    }
  } catch {}
  return localSummary;
};

/**
 * Subscribe to real-time product live viewer counts.
 * @param isStorefrontViewer True when running on the customer-facing storefront; false when running in Admin Dashboard.
 */
export const subscribeToLiveViewerSummary = (
  isStorefrontViewer: boolean,
  activeProductCode: string | undefined,
  callback: (summary: LiveViewerSummary) => void
): (() => void) => {
  let isActive = true;

  const syncOnce = async () => {
    if (!isActive) return;
    const summary = isStorefrontViewer
      ? await sendLiveViewerHeartbeat(activeProductCode)
      : await fetchLiveViewerSummary();
    if (isActive) {
      callback(summary);
    }
  };

  syncOnce();

  const heartbeatInterval = setInterval(syncOnce, isStorefrontViewer ? 12000 : 5000);

  const handleStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_PRESENCE_KEY && isActive) {
      fetchLiveViewerSummary().then((s) => isActive && callback(s));
    }
  };

  const handleBc = (e: MessageEvent) => {
    if (e.data?.type === 'PRESENCE_UPDATE' && isActive) {
      fetchLiveViewerSummary().then((s) => isActive && callback(s));
    }
  };

  const handlePageHide = () => {
    if (isStorefrontViewer) {
      sendLiveViewerLeave();
    }
  };

  window.addEventListener('storage', handleStorage);
  presenceChannel?.addEventListener('message', handleBc);
  if (isStorefrontViewer) {
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);
  }

  return () => {
    isActive = false;
    clearInterval(heartbeatInterval);
    window.removeEventListener('storage', handleStorage);
    presenceChannel?.removeEventListener('message', handleBc);
    if (isStorefrontViewer) {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
    }
  };
};

export interface ComputedLiveViewerCounts {
  enabled: boolean;
  mode: LiveViewerMode;
  realCount: number;
  fakeCount: number;
  displayCount: number;
}

export function computeProductLiveViewers(params: {
  summary: LiveViewerSummary | null;
  settings: BrandSettings | null;
  productCode?: string;
}): ComputedLiveViewerCounts {
  const { summary, settings, productCode } = params;
  const enabled = settings?.liveViewerEnabled !== false;
  const mode: LiveViewerMode =
    settings?.liveViewerMode === 'real_only' ||
    settings?.liveViewerMode === 'fake_only' ||
    settings?.liveViewerMode === 'combined'
      ? settings.liveViewerMode
      : 'combined';

  const globalFake = Math.max(0, Math.round(Number(settings?.liveViewerFakeCount ?? 5)));
  const productOverride =
    productCode &&
    settings?.liveViewerFakeCountsByProduct &&
    typeof settings.liveViewerFakeCountsByProduct[productCode] === 'number'
      ? Math.max(0, Math.round(settings.liveViewerFakeCountsByProduct[productCode]))
      : null;

  const fakeCount = productOverride !== null ? productOverride : globalFake;

  const totalReal = Math.max(0, summary?.totalRealOnline || 0);
  const specificReal =
    productCode && summary?.byProduct && typeof summary.byProduct[productCode] === 'number'
      ? summary.byProduct[productCode]
      : 0;
  const realCount = Math.max(totalReal, specificReal);

  let displayCount = realCount + fakeCount;
  if (mode === 'real_only') {
    displayCount = realCount;
  } else if (mode === 'fake_only') {
    displayCount = fakeCount;
  }

  return {
    enabled,
    mode,
    realCount,
    fakeCount,
    displayCount,
  };
}
