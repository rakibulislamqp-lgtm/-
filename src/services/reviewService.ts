import { collection, addDoc, getDocs, query, orderBy, where, doc, deleteDoc } from 'firebase/firestore';
import { initializeFirebase, markQuotaExhausted } from '../lib/firebase';

function detectQuotaError(error: any): boolean {
  if (!error) return false;
  const errMsg = String(error.message || error).toLowerCase();
  const errCode = String(error.code || '').toLowerCase();
  return (
    errCode === 'resource-exhausted' ||
    errCode === 'quota-exceeded' ||
    errMsg.includes('quota') ||
    errMsg.includes('resource-exhausted') ||
    errMsg.includes('limit exceeded') ||
    errMsg.includes('exhausted') ||
    errMsg.includes('unavailable')
  );
}

export interface ProductReview {
  id?: string;
  productId?: string;
  productCode?: string;
  productName?: string;
  customerName: string;
  location?: string;
  rating: number; // 1 to 5
  comment: string;
  avatar?: string;
  role?: string; // e.g. Verified Buyer
  createdAt: string;
  isFeatured?: boolean;
}

const COLLECTION_NAME = 'reviews';

// Healthy, natural Bengali seed reviews to generate instant high-credibility realistic reviews
export const BANGLA_SEED_COMMENTS: ProductReview[] = [
  {
    id: 'seed-1',
    customerName: 'তানজিলা আক্তার',
    location: 'উত্তরা, ঢাকা',
    rating: 5,
    comment: 'সেরা (Sera) এর ড্রেসগুলো সত্যি অনন্য। কাপড়ের মান এবং ডিজাইন আমাকে মুগ্ধ করেছে। তাদের ডেলিভারি সার্ভিসও খুব দ্রুত।',
    avatar: 'https://images.unsplash.com/photo-1614283233556-f35b0c801efd?w=200&h=200&fit=crop',
    role: 'Verified Buyer',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 'seed-2',
    customerName: 'ফারহানা ইয়াসমিন',
    location: 'বনানী, ঢাকা',
    rating: 5,
    comment: 'প্রিমিয়াম কোয়ালিটির জন্য সেরা (Sera) এখন আমার প্রথম পছন্দ। গত মাসে দুটি থ্রিপিস অর্ডার করেছিলাম, একদম ছবির মতোই পেয়েছি।',
    avatar: 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=200&h=200&fit=crop',
    role: 'Premium Member',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'seed-3',
    customerName: 'নুসরাত জাহান',
    location: 'চট্টগ্রাম',
    rating: 5,
    comment: 'খুবই সুন্দর ডিজাইন। সচরাচর এমন ইউনিক কালেকশন অন্য কোথাও দেখা যায় না। ধন্যবাদ সেরা (Sera) কে।',
    avatar: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=200&h=200&fit=crop',
    role: 'Verified Buyer',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'seed-4',
    customerName: 'মাইশা কবির',
    location: 'ধানমন্ডি, ঢাকা',
    rating: 5,
    comment: 'কালার কম্বিনেশন এবং স্টিচিং কোয়ালিটি দারুন। যারা রুচিশীল পোশাক খুঁজছেন তাদের জন্য এটিই সেরা জায়গা।',
    avatar: 'https://images.unsplash.com/photo-1635488662761-fa02636ca560?w=200&h=200&fit=crop',
    role: 'Fashion Enthusiast',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString()
  },
  {
    id: 'seed-5',
    customerName: 'রাবেয়া সুলতানা',
    location: 'সিলেট',
    rating: 5,
    comment: 'অর্ডার করার ২ দিনের মধ্যেই হাতে পেয়েছি। ফিনিশিং এবং প্যাকিং দেখেই বোঝা যায় তারা কাস্টমার সার্ভিসের ব্যাপারে কতটা সিরিয়াস।',
    avatar: 'https://images.unsplash.com/photo-1621012430307-b4774b78d3cb?w=200&h=200&fit=crop',
    role: 'Regular Customer',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
  }
];

/**
 * Get stable pre-populated seed reviews for a product
 */
export const getSeedReviews = (productId: string, productCode: string): ProductReview[] => {
  const codeNum = parseInt(productCode.replace(/\D/g, '')) || 0;
  
  const selectedIndices = [
    (codeNum + 1) % BANGLA_SEED_COMMENTS.length,
    (codeNum + 3) % BANGLA_SEED_COMMENTS.length,
    (codeNum + 5) % BANGLA_SEED_COMMENTS.length
  ];

  return selectedIndices.map((commentIdx, index) => {
    const seed = BANGLA_SEED_COMMENTS[commentIdx];
    const daysAgo = index * 2 + 1;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    return {
      id: `seed-${productId}-${index}`,
      productId,
      productCode,
      customerName: seed.customerName,
      location: seed.location,
      avatar: seed.avatar,
      role: seed.role,
      rating: seed.rating,
      comment: seed.comment,
      createdAt: date.toISOString()
    };
  });
};

const triggerReviewsUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('reviews_updated'));
  }
};

/**
 * Save customer or admin review
 */
export const createReview = async (
  productId: string, 
  customerName: string, 
  rating: number, 
  comment: string,
  createdAt?: string,
  extra?: {
    location?: string;
    avatar?: string;
    role?: string;
    productName?: string;
    productCode?: string;
    isFeatured?: boolean;
  }
): Promise<ProductReview> => {
  const newReview: ProductReview = {
    productId: productId || 'general',
    productCode: extra?.productCode || '',
    productName: extra?.productName || '',
    customerName,
    location: extra?.location || '',
    avatar: extra?.avatar || '',
    role: extra?.role || 'Verified Buyer',
    rating,
    comment,
    createdAt: createdAt || new Date().toISOString(),
    isFeatured: extra?.isFeatured ?? true
  };

  const { db } = await initializeFirebase();

  // Always keep in local storage 'all_app_reviews' for instant offline/cache response
  const existingGlobal = JSON.parse(localStorage.getItem('all_app_reviews') || '[]');

  if (!db) {
    console.warn("Firestore not available, storing review in localStorage");
    const reviewWithId = { id: `local-${Date.now()}`, ...newReview };
    localStorage.setItem('all_app_reviews', JSON.stringify([reviewWithId, ...existingGlobal]));
    if (productId && productId !== 'general') {
      const localKey = `local_reviews_${productId}`;
      const existingProduct = JSON.parse(localStorage.getItem(localKey) || '[]');
      localStorage.setItem(localKey, JSON.stringify([reviewWithId, ...existingProduct]));
    }
    triggerReviewsUpdated();
    return reviewWithId;
  }

  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), newReview);
    const reviewWithId = { id: docRef.id, ...newReview };
    localStorage.setItem('all_app_reviews', JSON.stringify([reviewWithId, ...existingGlobal]));
    if (productId && productId !== 'general') {
      const localKey = `local_reviews_${productId}`;
      const existingProduct = JSON.parse(localStorage.getItem(localKey) || '[]');
      localStorage.setItem(localKey, JSON.stringify([reviewWithId, ...existingProduct]));
    }
    triggerReviewsUpdated();
    return reviewWithId;
  } catch (error) {
    if (detectQuotaError(error)) {
      markQuotaExhausted();
    }
    console.error("Error writing review to Firestore:", error);
    const reviewWithId = { id: `local-err-${Date.now()}`, ...newReview };
    localStorage.setItem('all_app_reviews', JSON.stringify([reviewWithId, ...existingGlobal]));
    if (productId && productId !== 'general') {
      const localKey = `local_reviews_${productId}`;
      const existingProduct = JSON.parse(localStorage.getItem(localKey) || '[]');
      localStorage.setItem(localKey, JSON.stringify([reviewWithId, ...existingProduct]));
    }
    triggerReviewsUpdated();
    return reviewWithId;
  }
};

/**
 * Update an existing review
 */
export const updateReview = async (
  reviewId: string,
  updatedData: Partial<ProductReview>
): Promise<boolean> => {
  const { db } = await initializeFirebase();

  // Update in localStorage
  const existingGlobal: ProductReview[] = JSON.parse(localStorage.getItem('all_app_reviews') || '[]');
  const updatedGlobal = existingGlobal.map(r => r.id === reviewId ? { ...r, ...updatedData } : r);
  localStorage.setItem('all_app_reviews', JSON.stringify(updatedGlobal));

  if (updatedData.productId && updatedData.productId !== 'general') {
    const localKey = `local_reviews_${updatedData.productId}`;
    const localReviews: ProductReview[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const updatedLocal = localReviews.map(r => r.id === reviewId ? { ...r, ...updatedData } : r);
    localStorage.setItem(localKey, JSON.stringify(updatedLocal));
  }

  if (db && reviewId && !reviewId.startsWith('local-')) {
    try {
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, COLLECTION_NAME, reviewId), updatedData);
    } catch (err) {
      console.warn("Firestore updateDoc error:", err);
    }
  }

  triggerReviewsUpdated();
  return true;
};

/**
 * Fetch all reviews across the whole app (for Home Page & Admin Review Manager)
 */
export const getAllReviews = async (): Promise<ProductReview[]> => {
  const { db } = await initializeFirebase();

  let allReviews: ProductReview[] = [];
  const deletedIds = new Set<string>(JSON.parse(localStorage.getItem('deleted_review_ids') || '[]'));

  // Read local storage global cache first
  const localGlobal: ProductReview[] = JSON.parse(localStorage.getItem('all_app_reviews') || '[]');
  allReviews = [...localGlobal];

  if (db) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const firebaseReviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductReview));
      
      const existingIds = new Set(allReviews.map(r => r.id));
      firebaseReviews.forEach(fr => {
        if (!existingIds.has(fr.id)) {
          allReviews.push(fr);
        }
      });
      // Save merged to localStorage for offline
      localStorage.setItem('all_app_reviews', JSON.stringify(allReviews));
    } catch (error) {
      if (detectQuotaError(error)) {
        markQuotaExhausted();
      }
      console.warn("Could not load all reviews from Firestore, using local cache:", error);
    }
  }

  // Include BANGLA_SEED_COMMENTS so seed reviews are visible and deletable in admin dashboard
  const existingIds = new Set(allReviews.map(r => r.id));
  BANGLA_SEED_COMMENTS.forEach(seed => {
    if (seed.id && !existingIds.has(seed.id)) {
      allReviews.push({
        ...seed,
        productId: seed.productId || 'general',
        productName: seed.productName || 'সাধারণ শপ রিভিউ'
      });
    }
  });

  // Filter out any deleted review IDs
  const activeReviews = allReviews.filter(r => r.id && !deletedIds.has(r.id));

  return activeReviews.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

/**
 * Fetch reviews for a specific product code or ID
 */
export const getReviewsForProduct = async (productId: string, productCode: string): Promise<ProductReview[]> => {
  const { db } = await initializeFirebase();

  let realReviews: ProductReview[] = [];
  const deletedIds = new Set<string>(JSON.parse(localStorage.getItem('deleted_review_ids') || '[]'));

  const localKey = `local_reviews_${productId}`;
  const localReviews = JSON.parse(localStorage.getItem(localKey) || '[]');
  const globalReviews: ProductReview[] = JSON.parse(localStorage.getItem('all_app_reviews') || '[]');
  const matchedGlobal = globalReviews.filter(r => r.productId === productId || (r.productCode && r.productCode === productCode));

  realReviews = [...localReviews, ...matchedGlobal];

  if (db) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('productId', '==', productId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const firebaseReviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductReview));
      
      const existingIds = new Set(realReviews.map(r => r.id));
      firebaseReviews.forEach(fr => {
        if (!existingIds.has(fr.id)) {
          realReviews.push(fr);
        }
      });
    } catch (error) {
      if (detectQuotaError(error)) {
        markQuotaExhausted();
      }
      console.warn("Could not load reviews from Firestore, using offline cache:", error);
    }
  }

  // Deduplicate by ID and filter out deleted ones
  const uniqueMap = new Map<string, ProductReview>();
  realReviews.forEach(r => {
    if (r.id && !deletedIds.has(r.id)) uniqueMap.set(r.id, r);
  });

  const finalReviews = Array.from(uniqueMap.values());

  // If no custom reviews exist for this product, attach seed reviews (filtering out deleted seeds)
  if (finalReviews.length === 0) {
    const seeds = getSeedReviews(productId, productCode).filter(s => s.id && !deletedIds.has(s.id));
    return seeds;
  }

  return finalReviews.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

/**
 * Delete a review (Admin action)
 */
export const deleteReview = async (reviewId: string, productId?: string): Promise<boolean> => {
  const { db } = await initializeFirebase();

  // 1. Record ID in deleted_review_ids so it never shows up again anywhere
  const deletedIds: string[] = JSON.parse(localStorage.getItem('deleted_review_ids') || '[]');
  if (!deletedIds.includes(reviewId)) {
    deletedIds.push(reviewId);
    localStorage.setItem('deleted_review_ids', JSON.stringify(deletedIds));
  }

  // 2. Remove from localStorage global cache
  const existingGlobal: ProductReview[] = JSON.parse(localStorage.getItem('all_app_reviews') || '[]');
  const filteredGlobal = existingGlobal.filter(r => r.id !== reviewId);
  localStorage.setItem('all_app_reviews', JSON.stringify(filteredGlobal));

  if (productId && productId !== 'general') {
    const localKey = `local_reviews_${productId}`;
    const localReviews: ProductReview[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const filteredLocal = localReviews.filter(r => r.id !== reviewId);
    localStorage.setItem(localKey, JSON.stringify(filteredLocal));
  }

  // 3. Remove from Firestore if online and valid doc ID
  if (db && reviewId && !reviewId.startsWith('local-') && !reviewId.startsWith('seed-')) {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, reviewId));
    } catch (error) {
      console.error("Could not delete review from Firestore:", error);
    }
  }

  triggerReviewsUpdated();
  return true;
};

/**
 * Computes professional sales/purchases count dynamically
 */
export const getProductSalesCount = (productCode: string, orders: any[] = [], initialSalesCount?: number): number => {
  const baseSales = typeof initialSalesCount === 'number' ? initialSalesCount : 0;

  let realSales = 0;
  orders.forEach(order => {
    if (order.productCode === productCode) {
      realSales += (order.quantity || 1);
    }
    if (order.items) {
      order.items.forEach((item: any) => {
        if (item.productCode === productCode) {
          realSales += (item.quantity || 1);
        }
      });
    }
  });

  return baseSales + realSales;
};
