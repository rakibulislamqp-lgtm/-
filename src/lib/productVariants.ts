import { Product } from '../types';

export const DEFAULT_PRODUCT_SIZES = ['36', '38', '40', '42', '44', 'Free Size'];

export const ADMIN_PRESET_SIZES = [
  '34', '36', '38', '40', '42', '44', '46', '48',
  'S', 'M', 'L', 'XL', 'XXL', 'Free Size',
];

export const toBanglaDigits = (num: number | string): string => {
  const digits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (w) => digits[+w]);
};

export function getProductSizes(product?: Partial<Product> | null): string[] {
  if (product?.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) {
    return product.sizes;
  }
  if ((product?.category || '').toUpperCase() === 'SAREE') {
    return ['Free Size'];
  }
  return DEFAULT_PRODUCT_SIZES;
}

export function getDefaultSizeForProduct(product?: Partial<Product> | null): string {
  const sizes = getProductSizes(product);
  if (sizes.includes('38')) return '38';
  return sizes[0] || 'Free Size';
}

export function getProductImagesList(product?: Partial<Product> | null): string[] {
  if (!product) return [];
  const list: string[] = [];
  if (product.imageUrl && typeof product.imageUrl === 'string' && product.imageUrl.trim()) {
    if (product.imageUrl.includes(',') || product.imageUrl.includes('\n')) {
      product.imageUrl
        .split(/[,\n]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((s) => {
          if (!list.includes(s)) list.push(s);
        });
    } else {
      list.push(product.imageUrl.trim());
    }
  }
  if (Array.isArray(product.galleryImages)) {
    product.galleryImages.forEach((img) => {
      if (img && typeof img === 'string' && img.trim() && !list.includes(img.trim())) {
        list.push(img.trim());
      }
    });
  }
  return list;
}

export function getPhotoVariantLabel(index: number, total: number): string {
  if (total <= 1) return 'ছবির কালার ও ডিজাইন';
  return `ডিজাইন ${toBanglaDigits(index + 1)}`;
}

export function getDefaultColorForProduct(product?: Partial<Product> | null): string {
  const imgs = getProductImagesList(product);
  return getPhotoVariantLabel(0, imgs.length);
}
