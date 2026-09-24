import { doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeFirebase } from '../lib/firebase';
import { BrandSettings } from '../types';
import { detectCPanelStorage, cpanelFetchSettings, cpanelSaveSettings } from './cpanelStorageService';

const SETTING_DOC_ID = 'brand';

export const getBrandSettings = async (): Promise<BrandSettings | null> => {
  let cachedData: BrandSettings | null = null;
  try {
    const local = localStorage.getItem('brand_settings');
    if (local) {
      cachedData = JSON.parse(local);
    }
  } catch (e) {
    console.warn('Error parsing brand cache:', e);
  }

  // Live background fetch to sync cloud/cPanel data with local cache
  const fetchPromise = (async () => {
    let remoteData: BrandSettings | null = null;

    // 1. Check cPanel host storage first
    try {
      const cpanelHealth = await detectCPanelStorage();
      if (cpanelHealth.isAvailable) {
        const cData = await cpanelFetchSettings();
        if (cData && typeof cData === 'object' && Object.keys(cData).length > 0) {
          remoteData = cData as BrandSettings;
        }
      }
    } catch (e) {
      console.warn('cPanel settings fetch error:', e);
    }

    // 2. Fallback to Firebase Cloud if not found in cPanel
    if (!remoteData) {
      try {
        const { db } = await initializeFirebase();
        if (db) {
          const docRef = doc(db, 'settings', SETTING_DOC_ID);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            remoteData = docSnap.data() as BrandSettings;
          }
        }
      } catch (error) {
        console.warn('Error fetching brand settings in background:', error);
      }
    }

    if (remoteData) {
      try {
        const currentLocal = localStorage.getItem('brand_settings');
        const currentObj = currentLocal ? JSON.parse(currentLocal) : null;
        const localTime = currentObj?.updatedAt ? new Date(currentObj.updatedAt).getTime() : 0;
        const remoteTime = remoteData?.updatedAt ? new Date(remoteData.updatedAt).getTime() : 0;

        // If local user has newer unsynced edits, keep local and merge remote defaults
        if (currentObj && localTime >= remoteTime) {
          const merged = { ...remoteData, ...currentObj };
          localStorage.setItem('brand_settings', JSON.stringify(merged));
          return merged;
        } else {
          localStorage.setItem('brand_settings', JSON.stringify(remoteData));
          window.dispatchEvent(new CustomEvent('brand_settings_updated', { detail: remoteData }));
          return remoteData;
        }
      } catch (e) {
        return remoteData;
      }
    }

    return null;
  })();

  // If we have cached settings, return them immediately for instant load,
  // and let the live background sync update it silently.
  if (cachedData) {
    return cachedData;
  }

  // If cache is empty, wait for live data
  const liveData = await fetchPromise;
  return liveData || cachedData;
};

export const updateBrandSettings = async (
  settings: Partial<BrandSettings>
): Promise<{ success: boolean; savedToCloud: boolean; error?: string }> => {
  const saveLocally = () => {
    try {
      const existing = localStorage.getItem('brand_settings');
      const current = existing ? JSON.parse(existing) : {};
      const updated = { ...current, ...settings, updatedAt: new Date().toISOString() };
      localStorage.setItem('brand_settings', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('brand_settings_updated', { detail: updated }));

      // Also persist to cPanel / API server native storage immediately
      try {
        cpanelSaveSettings(updated).catch(() => {});
      } catch (e) {}

      return updated;
    } catch (e) {
      console.warn('Error saving brand settings locally:', e);
      return settings;
    }
  };

  const locallySaved = saveLocally();

  try {
    const { db } = await initializeFirebase();
    if (!db) {
      return { 
        success: true, 
        savedToCloud: false, 
        error: 'ফায়ারবেস ডাটাবেস উপলব্ধ নয়, সার্ভার ও লোকাল মেমোরিতে সংরক্ষিত হয়েছে।' 
      };
    }

    const docRef = doc(db, 'settings', SETTING_DOC_ID);
    await setDoc(docRef, {
      ...locallySaved,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    return { success: true, savedToCloud: true };
  } catch (error: any) {
    console.warn('Firestore updateBrandSettings error, saved to server/local storage:', error);
    const isPermission = error?.code === 'permission-denied' || String(error?.message).includes('permission');
    const msg = isPermission 
      ? 'ফায়ারবেস সিকিউরিটি রুলস ব্লকের কারণে ক্লাউডে সেভ হয়নি। লোকাল ও সার্ভার স্টোরেজে সংরক্ষিত হয়েছে।' 
      : (error?.message || 'ক্লাউড সেভে সমস্যা হয়েছে।');
    return { success: true, savedToCloud: false, error: msg };
  }
};

/**
 * Push current local brand settings to Firestore
 */
export const syncBrandSettingsToCloud = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const { db } = await initializeFirebase();
    if (!db) return { success: false, error: 'ফায়ারবেস ডাটাবেস ইনিশিয়ালাইজ হয়নি।' };

    const local = localStorage.getItem('brand_settings');
    if (!local) return { success: true };

    const data = JSON.parse(local);
    const docRef = doc(db, 'settings', SETTING_DOC_ID);
    await setDoc(docRef, {
      ...data,
      syncedAt: new Date().toISOString()
    }, { merge: true });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
};

/**
 * Export 100% complete website data (Products, Banners, Footer, Settings, Reviews, Categories)
 * into a single JSON file for offline backup or migration
 */
export const exportFullStoreData = (): string => {
  const backup = {
    exportedAt: new Date().toISOString(),
    version: '2.0',
    brandSettings: (() => {
      try { return JSON.parse(localStorage.getItem('brand_settings') || '{}'); } catch { return {}; }
    })(),
    products: (() => {
      try { return JSON.parse(localStorage.getItem('cached_products_all') || '[]'); } catch { return []; }
    })(),
    categories: (() => {
      try { return JSON.parse(localStorage.getItem('cached_product_categories') || '[]'); } catch { return []; }
    })(),
    reviews: (() => {
      try { return JSON.parse(localStorage.getItem('all_app_reviews') || '[]'); } catch { return []; }
    })(),
    footerSettings: (() => {
      try { return JSON.parse(localStorage.getItem('brand_settings') || '{}')?.footer || null; } catch { return null; }
    })()
  };
  return JSON.stringify(backup, null, 2);
};

/**
 * Import and restore website data from a backup JSON file
 */
export const importFullStoreData = async (
  jsonData: string
): Promise<{ success: boolean; message: string; savedToCloud: boolean }> => {
  try {
    const parsed = JSON.parse(jsonData);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('অকার্যকর ব্যাকআপ ফাইল ফরম্যাট।');
    }

    // 1. Restore Brand Settings
    if (parsed.brandSettings && typeof parsed.brandSettings === 'object') {
      localStorage.setItem('brand_settings', JSON.stringify(parsed.brandSettings));
      window.dispatchEvent(new Event('brand_settings_updated'));
    }

    // 2. Restore Products
    if (Array.isArray(parsed.products) && parsed.products.length > 0) {
      localStorage.setItem('cached_products_all', JSON.stringify(parsed.products));
      localStorage.setItem('cached_products_active', JSON.stringify(parsed.products.filter((p: any) => p.isActive !== false)));
      window.dispatchEvent(new Event('local_products_updated'));
    }

    // 3. Restore Categories
    if (Array.isArray(parsed.categories) && parsed.categories.length > 0) {
      localStorage.setItem('cached_product_categories', JSON.stringify(parsed.categories));
      window.dispatchEvent(new CustomEvent('categories_updated', { detail: parsed.categories }));
    }

    // 4. Restore Reviews
    if (Array.isArray(parsed.reviews) && parsed.reviews.length > 0) {
      localStorage.setItem('all_app_reviews', JSON.stringify(parsed.reviews));
      window.dispatchEvent(new Event('reviews_updated'));
    }

    // 5. Attempt to sync to cloud Firestore if available
    let savedToCloud = false;
    try {
      const { db } = await initializeFirebase();
      if (db) {
        if (parsed.brandSettings) {
          await setDoc(doc(db, 'settings', SETTING_DOC_ID), parsed.brandSettings, { merge: true });
        }
        savedToCloud = true;
      }
    } catch (e) {
      console.warn("Could not sync imported data to Firestore cloud:", e);
    }

    return {
      success: true,
      message: 'সব ডাটা সফলভাবে রিস্টোর হয়েছে!',
      savedToCloud
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'ডাটা রিস্টোর করতে ব্যর্থ হয়েছে।',
      savedToCloud: false
    };
  }
};

export const getBrandLogoSettings = async (): Promise<string | null> => {
  const settings = await getBrandSettings();
  return settings?.logoUrl || null;
};

export const updateBrandLogoSettings = async (logoUrl: string): Promise<void> => {
  await updateBrandSettings({ logoUrl });
};

/**
 * Optimizes an image file from device storage/gallery (max 500px, compressed)
 * and returns high quality web-ready data URL
 */
export const processLogoImageFile = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('শুধুমাত্র ছবি (Image) ফাইল আপলোড করতে পারবেন।'));
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 500;
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round(height * (MAX_SIZE / width));
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round(width * (MAX_SIZE / height));
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const mimeType = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
          const quality = mimeType === 'image/jpeg' ? 0.85 : undefined;
          resolve(canvas.toDataURL(mimeType, quality));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => reject(new Error('লোগো ছবি লোড করতে ব্যর্থ হয়েছে'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('ফাইল রিড করতে সমস্যা হয়েছে'));
    reader.readAsDataURL(file);
  });
};

export type LogoSlot = 'logoUrl' | 'invoiceLogoUrl' | 'footerLogoUrl' | 'heroLogoUrl' | 'socialLogoUrl' | 'faviconUrl';

export const updateSpecificLogoSettings = async (slot: LogoSlot, url: string): Promise<void> => {
  await updateBrandSettings({ [slot]: url });
  if (slot === 'faviconUrl' || slot === 'logoUrl') {
    applyFaviconToHead(url);
  }
};

export const resetSpecificLogoSettings = async (slot: LogoSlot): Promise<void> => {
  await updateBrandSettings({ [slot]: '' });
};

export const uploadAndSaveSpecificLogo = async (slot: LogoSlot, file: File): Promise<string> => {
  const base64Url = await processLogoImageFile(file);
  await updateSpecificLogoSettings(slot, base64Url);
  return base64Url;
};

export const applyFaviconToHead = (iconUrl: string) => {
  if (!iconUrl || typeof document === 'undefined') return;
  try {
    const links = document.querySelectorAll("link[rel~='icon'], link[rel='apple-touch-icon'], link[rel='shortcut icon']");
    if (links.length > 0) {
      links.forEach((el) => {
        (el as HTMLLinkElement).href = iconUrl;
      });
    } else {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = iconUrl;
      document.getElementsByTagName('head')[0]?.appendChild(link);
    }
  } catch (e) {
    console.warn('Could not update favicon in head:', e);
  }
};

/**
 * Directly processes and saves logo to database and local cache
 */
export const uploadAndSaveBrandLogo = async (file: File): Promise<string> => {
  const base64Url = await processLogoImageFile(file);
  await updateBrandLogoSettings(base64Url);
  return base64Url;
};


