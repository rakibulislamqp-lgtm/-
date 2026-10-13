import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { initializeFirebase, markQuotaExhausted } from '../lib/firebase';
import { Order, OrderStatus } from '../types';
import { addLoyaltyPointsFromOrder } from './loyaltyService';
import { dispatchOrderSMSNotification } from './smsService';
import { detectCPanelStorage, cpanelFetchOrders, cpanelSaveOrder, cpanelUpdateOrderStatus, cpanelDeleteOrder } from './cpanelStorageService';

export const LOCAL_DELETED_ORDERS_KEY = 'sera_deleted_orders';

export const getDeletedOrderIds = (): string[] => {
  try {
    const raw = localStorage.getItem(LOCAL_DELETED_ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const recordDeletedOrderIds = (...ids: (string | undefined | null)[]) => {
  try {
    const current = getDeletedOrderIds();
    const set = new Set(current);
    ids.forEach(id => {
      if (id && typeof id === 'string' && id.trim()) {
        set.add(id.trim());
      }
    });
    localStorage.setItem(LOCAL_DELETED_ORDERS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn("Could not record deleted order ids:", e);
  }
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

async function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  let authInfo = {};
  try {
    const { auth } = await initializeFirebase();
    authInfo = {
      userId: auth?.currentUser?.uid,
      isAnonymous: auth?.currentUser?.isAnonymous,
      authenticated: !!auth?.currentUser
    };
  } catch (e) {
    console.warn("Failed to get auth info for error reporting", e);
  }

  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    code: (error as any)?.code || 'unknown',
    authInfo
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function isQuotaOrNetworkError(error: any): boolean {
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
    try {
      markQuotaExhausted();
    } catch (e) {}
  }
  return isQuota || errCode === 'permission-denied' || errCode === 'unavailable' || errMsg.includes('offline') || errMsg.includes('denied');
}

export const saveCustomerOrderLocally = (order: any) => {
  try {
    if (!order || (!order.orderId && !order.id)) return;
    const key = 'sera_my_customer_orders';
    const existingStr = localStorage.getItem(key);
    let myOrders: Order[] = existingStr ? JSON.parse(existingStr) : [];
    
    const targetId = order.orderId || order.id;
    myOrders = [order, ...myOrders.filter(o => (o.orderId || o.id) !== targetId)];
    
    localStorage.setItem(key, JSON.stringify(myOrders));
    localStorage.setItem('sera_my_last_order_id', targetId!);
    if (order.mobileNumber) {
      localStorage.setItem('sera_my_last_mobile', order.mobileNumber);
    }
  } catch (e) {
    console.warn("Failed to save customer order locally:", e);
  }
};

export const getMyCustomerOrdersLocally = (): Order[] => {
  try {
    const key = 'sera_my_customer_orders';
    const existingStr = localStorage.getItem(key);
    if (!existingStr) return [];
    return JSON.parse(existingStr);
  } catch (e) {
    return [];
  }
};

/**
 * Strips all undefined fields recursively so Firestore addDoc/setDoc never throws
 * "Unsupported field value: undefined" error.
 */
export function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (obj instanceof Date) return obj.toISOString();
  if (typeof obj === 'function') return undefined;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)).filter(item => item !== undefined);
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        const cleanedVal = sanitizeForFirestore(val);
        if (cleanedVal !== undefined) {
          cleaned[key] = cleanedVal;
        }
      }
    }
    return cleaned;
  }
  return obj;
}

/**
 * Merges multiple order lists and deduplicates by orderId / id, sorted by createdAt descending.
 * Strictly respects deleted orders tombstone list so deleted orders never reappear.
 */
export const mergeOrderLists = (...lists: (Order[] | null | undefined)[]): Order[] => {
  const deletedIds = new Set(getDeletedOrderIds().map(x => x.toLowerCase().trim()));
  const map = new Map<string, Order>();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const ord of list) {
      if (!ord) continue;
      const idKey = (ord.id || '').trim();
      const orderIdKey = (ord.orderId || '').trim();
      if (deletedIds.has(idKey.toLowerCase()) || deletedIds.has(orderIdKey.toLowerCase())) {
        continue;
      }
      const key = orderIdKey || idKey;
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, ord);
      } else {
        const existing = map.get(key)!;
        map.set(key, { ...existing, ...ord });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const tA = new Date(a.createdAt || 0).getTime();
    const tB = new Date(b.createdAt || 0).getTime();
    return tB - tA;
  });
};

export const createOrder = async (orderData: Partial<Order>) => {
  const { db } = await initializeFirebase();
  const orderId = `SERA-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`;
  const fullOrder: Order = {
    ...orderData,
    orderId,
    status: 'Pending' as OrderStatus,
    createdAt: new Date().toISOString(),
  } as Order;

  const triggerPostOrderServices = (orderObj: Order) => {
    try {
      addLoyaltyPointsFromOrder(orderObj).catch(err => console.warn("Loyalty trigger error:", err));
      dispatchOrderSMSNotification(orderObj, 'Pending').catch(err => console.warn("SMS trigger error:", err));
    } catch (e) {
      console.warn("Post order trigger error:", e);
    }
  };

  const saveLocally = () => {
    console.warn("Saving order to local storage (Fallback Mode).");
    const existing = JSON.parse(localStorage.getItem('sera_orders') || '[]');
    const newOrder = { id: orderId, ...fullOrder } as Order;
    
    const updated = mergeOrderLists([newOrder], existing);
    localStorage.setItem('sera_orders', JSON.stringify(updated));
    localStorage.setItem('cached_orders', JSON.stringify(updated));
    saveCustomerOrderLocally(newOrder);
    
    // Save to cPanel native / server storage
    try {
      cpanelSaveOrder(newOrder).catch(() => {});
    } catch (e) {}

    window.dispatchEvent(new Event('local_orders_updated'));
    triggerPostOrderServices(newOrder);
    return newOrder;
  };

  // 1. Immediately persist to server storage (works on both Node.js Express and cPanel PHP)
  try {
    cpanelSaveOrder({ id: orderId, ...fullOrder }).catch(() => {});
  } catch (e) {}

  if (!db) {
    return saveLocally();
  }

  const path = 'orders';
  try {
    const cleanPayload = sanitizeForFirestore(fullOrder);
    const docRef = await addDoc(collection(db, path), cleanPayload);
    const result = { id: docRef.id, ...fullOrder } as Order;
    console.log("✅ [Firestore Cloud] Order saved to global cloud database:", result.orderId, docRef.id);
    
    try {
      const cached = JSON.parse(localStorage.getItem('cached_orders') || '[]');
      const updated = mergeOrderLists([result], cached);
      localStorage.setItem('cached_orders', JSON.stringify(updated));
      localStorage.setItem('sera_orders', JSON.stringify(updated));
    } catch (e) {}
    
    // Update server storage with the exact doc id
    try {
      cpanelSaveOrder(result).catch(() => {});
    } catch (e) {}

    saveCustomerOrderLocally(result);
    triggerPostOrderServices(result);
    window.dispatchEvent(new Event('local_orders_updated'));
    return result;
  } catch (error: any) {
    console.warn("⚠️ [Firestore Cloud] Failed to save to cloud database (Check Firebase Security Rules):", error?.code || error?.message || error);
    return saveLocally();
  }
};

export const getOrderForTracking = async (queryInput: string): Promise<Order | null> => {
  if (!queryInput || !queryInput.trim()) return null;

  let raw = queryInput.trim();

  // If input is a URL or query string, extract parameter value
  if (raw.includes('http://') || raw.includes('https://') || raw.includes('?')) {
    try {
      const urlObj = new URL(raw.startsWith('http') ? raw : `http://localhost${raw.startsWith('?') ? '' : '/'}${raw}`);
      const trackVal = urlObj.searchParams.get('track') || urlObj.searchParams.get('orderId') || urlObj.searchParams.get('id');
      if (trackVal) {
        raw = trackVal.trim();
      }
    } catch (e) {
      // Fallback regex extraction
      const match = raw.match(/(?:track|orderId|id)=([^&]+)/i);
      if (match && match[1]) {
        raw = decodeURIComponent(match[1]).trim();
      }
    }
  }

  const cleanQuery = raw.toLowerCase();
  const cleanDigits = raw.replace(/\D/g, '');

  const orders = await getAllOrders(true);
  
  const found = orders.find(o => {
    const oId = (o.orderId || '').toLowerCase();
    const docId = (o.id || '').toLowerCase();
    const phone = (o.mobileNumber || '').replace(/\D/g, '');
    const courierCode = (o.courierTrackingCode || '').toLowerCase();

    if (oId === cleanQuery || docId === cleanQuery) return true;
    if (courierCode && courierCode === cleanQuery) return true;
    if (cleanDigits.length >= 10 && phone.endsWith(cleanDigits.slice(-10))) return true;
    if (oId.includes(cleanQuery) || docId.includes(cleanQuery)) return true;
    return false;
  });

  return found || null;
};

export const getAllOrders = async (forceRefresh = false): Promise<Order[]> => {
  let cachedOrders: Order[] = [];
  try {
    const c1 = localStorage.getItem('cached_orders');
    const c2 = localStorage.getItem('sera_orders');
    const l1 = c1 ? JSON.parse(c1) : [];
    const l2 = c2 ? JSON.parse(c2) : [];
    cachedOrders = mergeOrderLists(l1, l2);
  } catch (e) {
    console.warn("Failed to retrieve cached orders:", e);
  }

  // 1. Fetch from Server Storage (Node Express / cPanel PHP)
  let serverOrders: Order[] = [];
  try {
    const sOrders = await cpanelFetchOrders();
    if (sOrders && Array.isArray(sOrders)) {
      serverOrders = sOrders;
    }
  } catch (e) {}

  // 2. Fetch from Firestore
  let firestoreOrders: Order[] = [];
  try {
    const { db } = await initializeFirebase();
    if (db) {
      const path = 'orders';
      let snapshot;
      try {
        const q = query(collection(db, path), orderBy('createdAt', 'desc'));
        snapshot = await getDocs(q);
      } catch (qErr) {
        snapshot = await getDocs(collection(db, path));
      }
      firestoreOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
    }
  } catch (error) {
    console.warn("Could not retrieve orders from Firestore:", error);
  }

  // 3. Merge all order sources deduplicating by ID
  const allMerged = mergeOrderLists(serverOrders, firestoreOrders, cachedOrders);

  try {
    localStorage.setItem('cached_orders', JSON.stringify(allMerged));
    localStorage.setItem('sera_orders', JSON.stringify(allMerged));
  } catch (cacheErr) {}

  return allMerged;
};

export const updateOrderStatus = async (id: string, status: string) => {
  let targetOrder: Order | null = null;

  const saveLocally = () => {
    try {
      const existing = JSON.parse(localStorage.getItem('sera_orders') || '[]');
      const updated = existing.map((o: any) => {
        if (o.id === id || o.orderId === id) {
          targetOrder = { ...o, status };
          return targetOrder;
        }
        return o;
      });
      localStorage.setItem('sera_orders', JSON.stringify(updated));

      const cached = JSON.parse(localStorage.getItem('cached_orders') || '[]');
      const updatedCached = cached.map((o: any) => o.id === id || o.orderId === id ? { ...o, status } : o);
      localStorage.setItem('cached_orders', JSON.stringify(updatedCached));

      window.dispatchEvent(new Event('local_orders_updated'));

      // Also persist to cPanel storage if active
      try {
        detectCPanelStorage().then(h => {
          if (h.isAvailable) {
            cpanelUpdateOrderStatus(id, status);
          }
        });
      } catch (e) {}

      if (targetOrder) {
        dispatchOrderSMSNotification(targetOrder, status as any).catch(e => console.warn("SMS status trigger error:", e));
      }
    } catch (e) {
      console.warn("Failed to update status locally:", e);
    }
  };

  const { db } = await initializeFirebase();
  if (!db) {
    saveLocally();
    return;
  }

  const path = 'orders';
  try {
    const docRef = doc(db, path, id);
    await updateDoc(docRef, { status });
    saveLocally();
  } catch (error) {
    if (isQuotaOrNetworkError(error)) {
      console.warn("Encountered Firestore quota/network error on update status.", error);
      saveLocally();
    } else {
      await handleFirestoreError(error, OperationType.UPDATE, `${path}/${id}`);
    }
  }
};

export const updateOrder = async (id: string, data: Partial<Order>) => {
  const saveLocally = () => {
    try {
      const existing = JSON.parse(localStorage.getItem('sera_orders') || '[]');
      const updated = existing.map((o: any) => o.id === id || o.orderId === id ? { ...o, ...data } : o);
      localStorage.setItem('sera_orders', JSON.stringify(updated));

      const cached = JSON.parse(localStorage.getItem('cached_orders') || '[]');
      const updatedCached = cached.map((o: any) => o.id === id || o.orderId === id ? { ...o, ...data } : o);
      localStorage.setItem('cached_orders', JSON.stringify(updatedCached));

      window.dispatchEvent(new Event('local_orders_updated'));
    } catch (e) {
      console.warn("Failed to update order locally:", e);
    }
  };

  const { db } = await initializeFirebase();
  if (!db) {
    saveLocally();
    return;
  }

  const path = 'orders';
  try {
    const docRef = doc(db, path, id);
    await updateDoc(docRef, data);
    saveLocally();
  } catch (error) {
    if (isQuotaOrNetworkError(error)) {
      console.warn("Encountered Firestore quota/network error on update order.", error);
      saveLocally();
    } else {
      await handleFirestoreError(error, OperationType.UPDATE, `${path}/${id}`);
    }
  }
};

export const deleteOrder = async (id: string, altOrderId?: string) => {
  const targetIds = [id, altOrderId].filter(Boolean).map(x => String(x).trim()) as string[];
  recordDeletedOrderIds(...targetIds);

  const saveLocally = () => {
    try {
      const isTarget = (o: any) => targetIds.some(tId => 
        String(o.id || '').trim() === tId || 
        String(o.orderId || '').trim() === tId || 
        (o.order && (String(o.order.id || '').trim() === tId || String(o.order.orderId || '').trim() === tId))
      );

      const existing = JSON.parse(localStorage.getItem('sera_orders') || '[]');
      const updated = existing.filter((o: any) => !isTarget(o));
      localStorage.setItem('sera_orders', JSON.stringify(updated));

      const cached = JSON.parse(localStorage.getItem('cached_orders') || '[]');
      const updatedCached = cached.filter((o: any) => !isTarget(o));
      localStorage.setItem('cached_orders', JSON.stringify(updatedCached));

      window.dispatchEvent(new Event('local_orders_updated'));
    } catch (e) {
      console.warn("Failed to delete order locally:", e);
    }
  };

  saveLocally();

  // 1. Delete from Server Storage (cPanel / Node Express)
  try {
    for (const tId of targetIds) {
      await cpanelDeleteOrder(tId);
    }
  } catch (serverErr) {
    console.warn("Server order delete error:", serverErr);
  }

  // 2. Delete from Firestore
  try {
    const { db } = await initializeFirebase();
    if (db) {
      const path = 'orders';
      for (const tId of targetIds) {
        try {
          const docRef = doc(db, path, tId);
          await deleteDoc(docRef);
        } catch (e) {}
      }
    }
  } catch (error) {
    if (isQuotaOrNetworkError(error)) {
      console.warn("Encountered Firestore quota/network error on delete order.", error);
    } else {
      console.warn("Firestore delete order note:", error);
    }
  }
};

export const subscribeOrders = async (callback: (orders: Order[]) => void) => {
  let currentList: Order[] = [];

  const updateAndNotify = (newList: Order[], isAuthoritative = false) => {
    const deletedIds = new Set(getDeletedOrderIds().map(x => x.toLowerCase().trim()));
    const filterOut = (list: Order[]) => list.filter(o => {
      if (!o) return false;
      const k1 = String(o.id || '').toLowerCase().trim();
      const k2 = String(o.orderId || '').toLowerCase().trim();
      return !deletedIds.has(k1) && !deletedIds.has(k2);
    });

    const updated = isAuthoritative 
      ? filterOut(newList) 
      : filterOut(mergeOrderLists(newList, currentList));

    // Prevent redundant state updates and re-renders if list hasn't changed
    const prevKey = currentList.map(o => `${o.id || o.orderId}_${o.status}_${o.totalAmount}`).join('|');
    const newKey = updated.map(o => `${o.id || o.orderId}_${o.status}_${o.totalAmount}`).join('|');
    if (currentList.length > 0 && prevKey === newKey) {
      return;
    }

    currentList = updated;

    try {
      localStorage.setItem('cached_orders', JSON.stringify(currentList));
      localStorage.setItem('sera_orders', JSON.stringify(currentList));
    } catch (e) {}
    callback(currentList);
  };

  const getOfflineOrders = () => {
    try {
      const c1 = localStorage.getItem('cached_orders');
      const c2 = localStorage.getItem('sera_orders');
      const l1 = c1 ? JSON.parse(c1) : [];
      const l2 = c2 ? JSON.parse(c2) : [];
      return mergeOrderLists(l1, l2);
    } catch (e) {
      return [];
    }
  };

  // 1. Deliver local cached orders immediately (instant 0ms response)
  const initialLocal = getOfflineOrders();
  if (initialLocal.length > 0) {
    updateAndNotify(initialLocal, true);
  }

  const triggerLocalOrders = () => {
    updateAndNotify(getOfflineOrders(), true);
  };
  window.addEventListener('local_orders_updated', triggerLocalOrders);

  // 2. Fetch from server API immediately
  cpanelFetchOrders().then(serverList => {
    if (serverList && Array.isArray(serverList)) {
      updateAndNotify(serverList);
    }
  }).catch(() => {});

  // 3. Set up active server sync polling interval (every 6 seconds)
  // Ensures any order submitted by customers reflects immediately without resurrecting deleted items
  const pollInterval = setInterval(() => {
    cpanelFetchOrders().then(serverList => {
      if (serverList && Array.isArray(serverList)) {
        updateAndNotify(serverList);
      }
    }).catch(() => {});
  }, 6000);

  // 4. Set up Firestore onSnapshot listener if db is configured
  let firestoreUnsub: (() => void) | null = null;
  initializeFirebase().then(({ db }) => {
    if (!db) return;
    const path = 'orders';
    try {
      let q;
      try {
        q = query(collection(db, path), orderBy('createdAt', 'desc'));
      } catch {
        q = collection(db, path);
      }
      
      firestoreUnsub = onSnapshot(q as any, (snapshot: any) => {
        const list = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Order));
        updateAndNotify(list);
      }, (error: any) => {
        console.warn("Firestore subscription note:", error?.message || error);
      });
    } catch (err) {
      console.warn("Could not attach Firestore onSnapshot:", err);
    }
  }).catch(() => {});

  return () => {
    window.removeEventListener('local_orders_updated', triggerLocalOrders);
    clearInterval(pollInterval);
    if (firestoreUnsub) {
      firestoreUnsub();
    }
  };
};
