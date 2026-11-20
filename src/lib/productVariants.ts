import { Product, ProductColorDesignVariant } from '../types';

export const DEFAULT_PRODUCT_SIZES = ['36', '38', '40', '42', '44', 'Free Size'];

export const ADMIN_PRESET_SIZES = [
  '34', '36', '38', '40', '42', '44', '46', '48',
  'S', 'M', 'L', 'XL', 'XXL', 'Free Size',
];

export const ADMIN_PRESET_COLORS: Array<{ name: string; hex: string }> = [
  { name: 'লাল', hex: '#dc2626' },
  { name: 'মেরুন', hex: '#7f1d1d' },
  { name: 'কালো', hex: '#171717' },
  { name: 'সাদা', hex: '#f8fafc' },
  { name: 'সবুজ', hex: '#15803d' },
  { name: 'নীল', hex: '#1d4ed8' },
  { name: 'গোলাপি', hex: '#ec4899' },
  { name: 'হলুদ', hex: '#eab308' },
  { name: 'গোল্ডেন', hex: '#d97706' },
  { name: 'বেগুনি', hex: '#7e22ce' },
  { name: 'পেস্ট', hex: '#6ee7b7' },
  { name: 'কফি', hex: '#5c4033' },
  { name: 'আকাশি', hex: '#38bdf8' },
  { name: 'কমলা', hex: '#f97316' },
];

export const ADMIN_PRESET_DESIGNS: string[] = [
  'ডিজাইন ১',
  'ডিজাইন ২',
  'ডিজাইন ৩',
  'ফ্লোরাল',
  'এমব্রয়ডারি',
  'জামদানি',
  'কাতান',
  'সিকোয়েন্স',
  'ডিজিটাল প্রিন্ট',
];

export interface ResolvedPhotoVariant {
  imageUrl: string;
  label: string;
  colorName?: string;
  designName?: string;
  colorHex?: string;
}

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

export function formatColorDesignLabel(
  variant: Partial<ProductColorDesignVariant> | null | undefined,
  index: number,
  total: number
): string {
  const color = (variant?.colorName || '').trim();
  const design = (variant?.designName || '').trim();
  if (color && design) return `${color} • ${design}`;
  if (color) return color;
  if (design) return design;
  return getPhotoVariantLabel(index, total);
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
  if (Array.isArray(product.colorDesigns)) {
    product.colorDesigns.forEach((variant) => {
      if (variant?.imageUrl && variant.imageUrl.trim() && !list.includes(variant.imageUrl.trim())) {
        list.push(variant.imageUrl.trim());
      }
      if (Array.isArray(variant?.extraImages)) {
        variant.extraImages.forEach((extraImg) => {
          if (extraImg && extraImg.trim() && !list.includes(extraImg.trim())) {
            list.push(extraImg.trim());
          }
        });
      }
    });
  }
  return list;
}

export function getProductPhotoVariants(product?: Partial<Product> | null): ResolvedPhotoVariant[] {
  const images = getProductImagesList(product);
  if (images.length === 0) return [];

  const colorDesignByUrl = new Map<string, ProductColorDesignVariant>();
  if (Array.isArray(product?.colorDesigns)) {
    product.colorDesigns.forEach((variant) => {
      if (!variant) return;
      const mainUrl = (variant.imageUrl || '').trim();
      if (mainUrl && !colorDesignByUrl.has(mainUrl)) {
        colorDesignByUrl.set(mainUrl, variant);
      }
      if (Array.isArray(variant.extraImages)) {
        variant.extraImages.forEach((extraImg) => {
          const cleanExtra = (extraImg || '').trim();
          if (cleanExtra && !colorDesignByUrl.has(cleanExtra)) {
            colorDesignByUrl.set(cleanExtra, variant);
          }
        });
      }
    });
  }

  return images.map((imgUrl, idx) => {
    const matched = colorDesignByUrl.get(imgUrl);
    return {
      imageUrl: imgUrl,
      label: formatColorDesignLabel(matched, idx, images.length),
      colorName: matched?.colorName?.trim() || undefined,
      designName: matched?.designName?.trim() || undefined,
      colorHex: matched?.colorHex || undefined,
    };
  });
}

export function getPhotoVariantLabel(index: number, total: number): string {
  if (total <= 1) return 'ছবির কালার ও ডিজাইন';
  return `ডিজাইন ${toBanglaDigits(index + 1)}`;
}

export function getDefaultColorForProduct(product?: Partial<Product> | null): string {
  const variants = getProductPhotoVariants(product);
  if (variants.length > 0) return variants[0].label;
  return getPhotoVariantLabel(0, 1);
}
