import { ProductCategoryItem } from '../types';
import { getBrandSettings, updateBrandSettings } from './settingsService';

export const DEFAULT_CATEGORIES: ProductCategoryItem[] = [
  { id: 'ALL', name: 'সবগুলো (All)', isDefault: true },
  { id: 'THREE PIECE', name: 'থ্রি-পিস (Three Piece)', isDefault: true },
  { id: 'SAREE', name: 'শাড়ি (Saree)', isDefault: true },
  { id: 'OTHERS', name: 'অন্যান্য (Others)', isDefault: true }
];

const LOCAL_STORAGE_KEY = 'cached_product_categories';

export const getStoredCategories = (): ProductCategoryItem[] => {
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading cached categories:', e);
  }
  return DEFAULT_CATEGORIES;
};

export const fetchAllCategories = async (): Promise<ProductCategoryItem[]> => {
  try {
    const settings = await getBrandSettings();
    if (settings?.categories && Array.isArray(settings.categories) && settings.categories.length > 0) {
      // Merge with default to guarantee ALL exists
      const hasAll = settings.categories.some(c => c.id === 'ALL');
      const merged = hasAll ? settings.categories : [DEFAULT_CATEGORIES[0], ...settings.categories];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('Error fetching categories from settings:', err);
  }

  const fallback = getStoredCategories();
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fallback));
  return fallback;
};

export const saveAllCategories = async (categories: ProductCategoryItem[]): Promise<void> => {
  try {
    // Ensure 'ALL' is at the top
    const filtered = categories.filter(c => c.id !== 'ALL');
    const finalCategories: ProductCategoryItem[] = [
      DEFAULT_CATEGORIES[0],
      ...filtered
    ];

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(finalCategories));
    window.dispatchEvent(new CustomEvent('categories_updated', { detail: finalCategories }));

    await updateBrandSettings({ categories: finalCategories });
  } catch (err) {
    console.error('Failed to save categories:', err);
    throw err;
  }
};

export const addCustomCategory = async (name: string, customId?: string): Promise<ProductCategoryItem[]> => {
  const current = await fetchAllCategories();
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error('ক্যাটাগরির নাম দিন');

  // Generate ID if not provided
  let id = customId?.trim().toUpperCase();
  if (!id) {
    // Create clean slug/id
    id = trimmedName
      .toUpperCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_');
    if (!id || id.length < 2) {
      id = `CAT_${Date.now().toString().slice(-4)}`;
    }
  }

  // Check duplicate
  const existing = current.find(c => c.id === id || c.name.toLowerCase() === trimmedName.toLowerCase());
  if (existing) {
    throw new Error('এই নামের ক্যাটাগরি ইতিমধ্যে বিদ্যমান রয়েছে');
  }

  const newCat: ProductCategoryItem = {
    id,
    name: trimmedName,
    isDefault: false
  };

  const updated = [...current, newCat];
  await saveAllCategories(updated);
  return updated;
};

export const removeCategory = async (id: string): Promise<ProductCategoryItem[]> => {
  if (id === 'ALL') {
    throw new Error('মূল "সবগুলো" ক্যাটাগরি ডিলিট করা সম্ভব নয়');
  }

  const current = await fetchAllCategories();
  const updated = current.filter(c => c.id !== id);
  await saveAllCategories(updated);
  return updated;
};
