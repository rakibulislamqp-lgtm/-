// Universal cPanel Server Storage Adapter
// When uploaded to cPanel with PHP, this enables 100% native server-side storage in public_html/api/data/
// If not on cPanel (e.g. Netlify), it gracefully yields to Firebase Firestore

let isCPanelDetected: boolean | null = null;
let lastCheckTime = 0;

export interface CPanelHealthInfo {
  isAvailable: boolean;
  writable: boolean;
  phpVersion?: string;
  serverTime?: string;
}

/**
 * Detects if the current host environment has the cPanel PHP storage endpoints active.
 */
export async function detectCPanelStorage(): Promise<CPanelHealthInfo> {
  const now = Date.now();
  // Cache check for 15 seconds to avoid repeated calls
  if (isCPanelDetected !== null && (now - lastCheckTime) < 15000) {
    return {
      isAvailable: isCPanelDetected,
      writable: isCPanelDetected
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch('/api/health.php', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'ok' && data.mode === 'cpanel_native') {
        isCPanelDetected = true;
        lastCheckTime = now;
        return {
          isAvailable: true,
          writable: !!data.writable,
          phpVersion: data.php_version,
          serverTime: data.server_time
        };
      }
    }
    isCPanelDetected = false;
    lastCheckTime = now;
    return { isAvailable: false, writable: false };
  } catch (e) {
    isCPanelDetected = false;
    lastCheckTime = now;
    return { isAvailable: false, writable: false };
  }
}

/**
 * Quick synchronous or cached check
 */
export function isCPanelStorageActive(): boolean {
  return isCPanelDetected === true;
}

// ---------------- PRODUCTS ----------------

export async function cpanelFetchProducts(): Promise<any[] | null> {
  try {
    const res = await fetch('/api/products.php', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch (e) {
    return null;
  }
}

export async function cpanelSaveProducts(products: any[]): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/products.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products })
    });
    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: err };
    }
    const data = await res.json();
    return { success: !!data.success };
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
}

// ---------------- SETTINGS ----------------

export async function cpanelFetchSettings(): Promise<any | null> {
  try {
    const res = await fetch('/api/settings.php', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data && typeof data === 'object') ? data : null;
  } catch (e) {
    return null;
  }
}

export async function cpanelSaveSettings(settings: any): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/settings.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: err };
    }
    const data = await res.json();
    return { success: !!data.success };
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
}

// ---------------- ORDERS ----------------

export async function cpanelFetchOrders(): Promise<any[] | null> {
  try {
    const res = await fetch('/api/orders.php', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch (e) {
    return null;
  }
}

export async function cpanelSaveOrder(order: any): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    const res = await fetch('/api/orders.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });
    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: err };
    }
    const data = await res.json();
    return { success: !!data.success, orderId: data.orderId };
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
}

export async function cpanelUpdateOrderStatus(
  orderId: string, 
  status: string, 
  courierStatus?: string, 
  adminNote?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/orders.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_status',
        orderId,
        status,
        courierStatus,
        adminNote
      })
    });
    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: err };
    }
    const data = await res.json();
    return { success: !!data.success };
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
}

export async function cpanelDeleteOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/orders.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        orderId
      })
    });
    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: err };
    }
    const data = await res.json();
    return { success: !!data.success };
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
}

// ---------------- FAST 1-CLICK UPLOADS ----------------

export async function cpanelUploadFile(file: File): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload.php', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: err };
    }
    const data = await res.json();
    return { success: !!data.success, url: data.url };
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
}
