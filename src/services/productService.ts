import { collection, addDoc, getDocs, query, orderBy, doc, setDoc, updateDoc, deleteDoc, where, limit } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { initializeFirebase, markQuotaExhausted } from '../lib/firebase';
import { Product } from '../types';
import { detectCPanelStorage, cpanelFetchProducts, cpanelSaveProducts } from './cpanelStorageService';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  UPLOAD = 'upload',
}

async function handleFirebaseError(error: unknown, operationType: OperationType, path: string | null) {
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
  console.error('Firebase Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const COLLECTION_NAME = 'products';

export const uploadImage = async (file: File, onProgress?: (progress: number) => void): Promise<string> => {
  const { storage } = await initializeFirebase();
  if (!storage) throw new Error('Firebase Storage not initialized');

  // Sanitize filename and add timestamp
  const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const storageRef = ref(storage, `products/${fileName}`);
  
  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      }, 
      async (error) => {
        try {
          await handleFirebaseError(error, OperationType.UPLOAD, `storage/products/${fileName}`);
        } catch (err) {
          reject(err);
        }
      }, 
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          resolve(downloadURL);
        });
      }
    );
  });
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

export const createProduct = async (productData: Partial<Product>) => {
  const { db } = await initializeFirebase();
  const fullProduct = {
    ...productData,
    isActive: productData.isActive ?? true,
    createdAt: new Date().toISOString(),
  };

  const saveLocally = () => {
    try {
      const id = `prod-${Date.now()}`;
      const newProduct = { id, ...fullProduct } as Product;
      
      const all = JSON.parse(localStorage.getItem('cached_products_all') || '[]');
      localStorage.setItem('cached_products_all', JSON.stringify([newProduct, ...all]));
      
      if (newProduct.isActive) {
        const active = JSON.parse(localStorage.getItem('cached_products_active') || '[]');
        localStorage.setItem('cached_products_active', JSON.stringify([newProduct, ...active]));
      }
      
      window.dispatchEvent(new Event('local_products_updated'));
      return newProduct;
    } catch (e) {
      console.warn("Failed to create product locally:", e);
      return { id: `prod-${Date.now()}`, ...fullProduct } as Product;
    }
  };

  if (!db) {
    return saveLocally();
  }

  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), fullProduct);
    try {
      localStorage.removeItem('cached_products_active');
      localStorage.removeItem('cached_products_all');
    } catch (e) {
      console.warn("Failed to clear local cached products on creation:", e);
    }
    return { id: docRef.id, ...fullProduct };
  } catch (error) {
    if (isQuotaOrNetworkError(error)) {
      console.warn("Firestore error encountered on product creation, saving locally.", error);
      return saveLocally();
    }
    await handleFirebaseError(error, OperationType.WRITE, COLLECTION_NAME);
  }
};

const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod-seed-1',
    title: 'প্রিমিয়াম সুতি গর্জিয়াস থ্রি-পিস কালেকশন (Sera Designer Three Piece)',
    brand: 'Sera Fashion',
    description: 'আরামদায়ক সুতি কাপড়ের উপর গর্জিয়াস এমব্রয়ডারি এবং ডিজিটাল সিকোয়েন্স কাজ করা প্রিমিয়াম থ্রি-পিস। ওড়না ফুল ৫ হাত সুতি এবং সেলোয়ার সুতি ম্যাচিং করা। এটি উৎসব কিংবা ক্যাজুয়াল ব্যবহারের জন্য অত্যন্ত উপযোগী।',
    price: 1350,
    imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80',
    category: 'THREE PIECE',
    productCode: 'SFH-3P01',
    stock: 25,
    discount: 150,
    isActive: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 14).toISOString(),
    initialSalesCount: 142
  },
  {
    id: 'prod-seed-2',
    title: 'লক্সারি অরগাঞ্জা এক্সক্লুসিভ থ্রি-পিস (Premium Organza Collection)',
    brand: 'Sera Fashion',
    description: 'প্রিমিয়াম কোয়ালিটি অরগাঞ্জা কাপড়ের উপর হ্যান্ডলুম উইভিং এবং সুতা-জরির জমকালো ফিনিশিং ওয়ার্ক। ওড়না রাজকীয় ডিজাইনের এবং সেলোয়ার সফট বাটারসিল্ক ম্যাচিং। যেকোনো বিয়ে বা বড় অনুষ্ঠানে পরার জন্য এটি একদম পারফেক্ট।',
    price: 1850,
    imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80',
    category: 'THREE PIECE',
    productCode: 'SFH-3P02',
    stock: 18,
    discount: 250,
    isActive: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 13).toISOString(),
    initialSalesCount: 89
  },
  {
    id: 'prod-seed-3',
    title: 'ঐতিহ্যবাহী ঢাকাই সুতি জামদানি শাড়ি (Pure Cotton Dhakai Jamdani Saree)',
    brand: 'Sera Saree',
    description: 'হাফ-সিল্ক এবং প্রিমিয়াম সুতি সুতা দিয়ে মেশানো নিখুঁত হাতের বুনন করা ঐতিহ্যবাহী ঢাকাই জামদানি শাড়ি। জমিনের কাজ খুবই ঘন ও সুদৃশ্য। ১২ হাত সম্পূর্ণ শাড়ি, সাথে ব্লাউজ পিস ইনক্লুডেড আছে। কাস্টমারদের অত্যন্ত পছন্দের একটি কালেকশন।',
    price: 2450,
    imageUrl: 'https://images.unsplash.com/photo-1610030469668-93535c17b6b3?auto=format&fit=crop&w=600&q=80',
    category: 'SAREE',
    productCode: 'SFH-SR01',
    stock: 15,
    discount: 350,
    isActive: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 12).toISOString(),
    initialSalesCount: 112
  },
  {
    id: 'prod-seed-4',
    title: 'বিলাসবহুল ডিজাইনার কাঞ্জিভরম সিল্ক শাড়ি (Luxury Kanjivaram Silk Saree)',
    brand: 'Sera Saree',
    description: 'গর্জিয়াস কপার এবং গোল্ডেন জরি সুতা দিয়ে বোনা রাজকীয় অল ওভার মীনাকারি ডিজাইনার কাঞ্জিভরম সিল্ক শাড়ি। ফেব্রিক অত্যন্ত সফট ও প্রিমিয়াম গ্রেডের হওয়ায় পরতে অনেক আরামদায়ক। বিয়ে এবং উৎসবের রাতের জন্য একদম রাজকীয় লুক এনে দেবে।',
    price: 3200,
    imageUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80',
    category: 'SAREE',
    productCode: 'SFH-SR02',
    stock: 12,
    discount: 400,
    isActive: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 11).toISOString(),
    initialSalesCount: 65
  },
  {
    id: 'prod-seed-5',
    title: 'কাশ্মীরি পশমিনা সিল্ক এমব্রয়ডারি থ্রি-পিস (Kashmiri Silk Suit)',
    brand: 'Sera Fashion',
    description: 'প্রিমিয়াম কাশ্মীরি পশমিনা সফট সিল্ক কাপড়ে তৈরি আকর্ষণীয় ফ্লোরাল এমব্রয়ডারি থ্রি-পিস। ম্যাচিং জ্যাকার্ড ওড়না এবং আরামদায়ক সুতি প্যান্ট। শীত বা যেকোনো ঋতুতে ব্যবহারের উপযোগী।',
    price: 1950,
    imageUrl: 'https://images.unsplash.com/photo-1596783074918-c84cb06531ca?auto=format&fit=crop&w=600&q=80',
    category: 'THREE PIECE',
    productCode: 'SFH-3P03',
    stock: 20,
    discount: 200,
    isActive: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
    initialSalesCount: 94
  },
  {
    id: 'prod-seed-6',
    title: 'মসলিন ডিজিটাল প্রিন্ট লাক্সারি থ্রি-পিস (Muslin Digital Print)',
    brand: 'Sera Fashion',
    description: 'আল্ট্রা-লাইট প্রিমিয়াম মসলিন কাপড়ে ডিজিটাল ফ্লোরাল প্রিন্ট এবং গলার প্যানেলে নিখুঁত সুতার কাজ। ওড়নায় আকর্ষণীয় ডিজিটাল প্রিন্ট এবং বর্ডারে লেস ফিনিশিং।',
    price: 1650,
    imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=600&q=80',
    category: 'THREE PIECE',
    productCode: 'SFH-3P04',
    stock: 22,
    discount: 150,
    isActive: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 9).toISOString(),
    initialSalesCount: 77
  },
  {
    id: 'prod-seed-7',
    title: 'রাজস্থানি জরদৌসি কাজ জর্জেট পার্টি থ্রি-পিস (Zardozi Party Suit)',
    brand: 'Sera Fashion',
    description: 'ভারী জরদৌসি ও কুন্দন কারুকাজ করা জর্জেট পার্টি থ্রি-পিস। ফুল ওড়নায় স্টোন ও এমব্রয়ডারি ওয়ার্ক, সাথে আরামদায়ক স্যাান্টুন ইনার ও বটম ইনক্লুডেড।',
    price: 2200,
    imageUrl: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=600&q=80',
    category: 'THREE PIECE',
    productCode: 'SFH-3P05',
    stock: 14,
    discount: 300,
    isActive: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 8).toISOString(),
    initialSalesCount: 105
  },
  {
    id: 'prod-seed-8',
    title: 'ঐতিহ্যবাহী রাজশাহী সিল্ক কাতান শাড়ি (Rajshahi Silk Katan)',
    brand: 'Sera Saree',
    description: 'বিশুদ্ধ রাজশাহী তুত সিল্ক সুতা দ্বারা বোনা অল-ওভার কাতান বুটি ও রানি আঁচল ডিজাইন। ওজন হালকা ও আরামদায়ক, আধুনিক রমণীদের জন্য অত্যন্ত মার্জিত পোশাক।',
    price: 2800,
    imageUrl: 'https://images.unsplash.com/photo-1610030469668-93535c17b6b3?auto=format&fit=crop&w=600&q=80',
    category: 'SAREE',
    productCode: 'SFH-SR03',
    stock: 16,
    discount: 350,
    isActive: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
    initialSalesCount: 88
  },
  {
    id: 'prod-seed-9',
    title: 'টাঙ্গাইল সুতি বালুচরি এক্সক্লুসিভ শাড়ি (Tangail Cotton Baluchari)',
    brand: 'Sera Saree',
    description: 'হস্তচালিত তাঁতে বোনা ১০০% প্রিমিয়াম কম্বড কটন সুতি শাড়ি। আঁচলে বালুচরি নকশা এবং পুরো শরীরে সুক্ষ্ম মীনা কাজ। গরমের দিনের জন্য অতুলনীয় আরামদায়ক।',
    price: 1750,
    imageUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80',
    category: 'SAREE',
    productCode: 'SFH-SR04',
    stock: 30,
    discount: 200,
    isActive: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 6).toISOString(),
    initialSalesCount: 130
  },
  {
    id: 'prod-seed-10',
    title: 'পাকিস্তানি প্রিমিয়াম লন এমব্রয়ডারি থ্রি-পিস (Pakistani Lawn Suit)',
    brand: 'Sera Fashion',
    description: 'হাই-গ্রেড পিওর লন কাপড়ে কাটওয়ার্ক এমব্রয়ডারি ফ্রন্ট প্যানেল, ভয়েল ওড়না এবং ডাই করা লন প্যান্ট। স্টাইলিশ এবং ট্রেন্ডি কালার প্যালেটে প্রস্তুত।',
    price: 1550,
    imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80',
    category: 'THREE PIECE',
    productCode: 'SFH-3P06',
    stock: 28,
    discount: 150,
    isActive: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    initialSalesCount: 119
  },
  {
    id: 'prod-seed-11',
    title: 'গর্জিয়াস ব্রাইডাল বেনারসি শাড়ি (Royal Bridal Benarasi Saree)',
    brand: 'Sera Saree',
    description: 'রাজকীয় লাল ও সোনালী জরির জমকালো কাজে বোনা প্রিমিয়াম বেনারসি শাড়ি। বিয়ের অনুষ্ঠান, রিসেপশন বা ব্রাইডাল সাজের জন্য অতুলনীয় এক্সক্লুসিভ পিস। সাথে ব্লাউজ পিস অন্তর্ভুক্ত।',
    price: 4500,
    imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80',
    category: 'SAREE',
    productCode: 'SFH-SR05',
    stock: 8,
    discount: 500,
    isActive: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
    initialSalesCount: 52
  },
  {
    id: 'prod-seed-12',
    title: 'লাক্সারি সিকোয়েন্স পার্টি গাউন থ্রি-পিস (Party Gown Style)',
    brand: 'Sera Fashion',
    description: 'হেভি গ্লিটার সিকোয়েন্স এবং কাটদানা ওয়ার্ক করা লং ফ্লোর-লেন্থ গাউন স্টাইল থ্রি-পিস। পার্টি কিংবা রাতের যেকোনো অনুষ্ঠানে সবার দৃষ্টি আকর্ষণ করবে।',
    price: 2650,
    imageUrl: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=600&q=80',
    category: 'THREE PIECE',
    productCode: 'SFH-3P07',
    stock: 12,
    discount: 300,
    isActive: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    initialSalesCount: 71
  },
  {
    id: 'prod-seed-13',
    title: 'পিওর সিল্ক হ্যান্ডলুম বুটিক শাড়ি (Handloom Pure Silk Saree)',
    brand: 'Sera Saree',
    description: 'হস্তশিল্পের নিখুঁত বুননে তৈরি সফট সিল্ক বুটিক শাড়ি। ডুয়েল টোন কালার কম্বিনেশন এবং কনট্রাস্ট আঁচল ডিজাইন। যেকোনো ফর্মাল বা সামাজিক অনুষ্ঠানে পরার উপযোগী।',
    price: 2150,
    imageUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80',
    category: 'SAREE',
    productCode: 'SFH-SR06',
    stock: 17,
    discount: 250,
    isActive: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    initialSalesCount: 83
  },
  {
    id: 'prod-seed-14',
    title: 'ভেলভেট প্রিমিয়াম উইন্টার কালেকশন থ্রি-পিস (Velvet Luxury Suit)',
    brand: 'Sera Fashion',
    description: 'অরিজিনাল মাইক্রো ভেলভেট কাপড়ে গোল্ডেন জরি ও সুতার জমকালো এমব্রয়ডারি থ্রি-পিস। সাথে ডিজিটাল প্রিন্টেড পশমিনা ওড়না। আরামদায়ক ও স্টাইলিশ।',
    price: 1850,
    imageUrl: 'https://images.unsplash.com/photo-1596783074918-c84cb06531ca?auto=format&fit=crop&w=600&q=80',
    category: 'THREE PIECE',
    productCode: 'SFH-3P08',
    stock: 20,
    discount: 200,
    isActive: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
    initialSalesCount: 96
  }
];

export const getAllProducts = async (onlyActive = false, forceRefresh = false): Promise<Product[]> => {
  const cacheKey = onlyActive ? 'cached_products_active' : 'cached_products_all';
  let cachedData: Product[] = [];
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      cachedData = JSON.parse(cached);
    }
  } catch (e) {
    console.warn("Failed to retrieve cached products:", e);
  }

  // Live background synchronization function (Supports cPanel Host Storage & Firebase Cloud)
  const fetchLiveProducts = async (): Promise<Product[] | null> => {
    // 1. Check cPanel Server Storage first if running on cPanel hosting
    try {
      const cpanelHealth = await detectCPanelStorage();
      if (cpanelHealth.isAvailable) {
        const cpanelProducts = await cpanelFetchProducts();
        if (cpanelProducts && Array.isArray(cpanelProducts) && cpanelProducts.length > 0) {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(cpanelProducts));
            if (!onlyActive) {
              localStorage.setItem('cached_products_all', JSON.stringify(cpanelProducts));
              localStorage.setItem('cached_products_active', JSON.stringify(cpanelProducts.filter(p => p.isActive)));
            }
          } catch (e) {}
          window.dispatchEvent(new Event('local_products_updated'));
          return cpanelProducts;
        }
      }
    } catch (e) {
      console.warn("cPanel product fetch check error:", e);
    }

    // 2. Fallback to Firebase Cloud (Netlify / Google Cloud)
    try {
      const { db } = await initializeFirebase();
      if (!db) return null;

      let q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'), limit(100));
      if (onlyActive) {
        q = query(collection(db, COLLECTION_NAME), where('isActive', '==', true), orderBy('createdAt', 'desc'), limit(100));
      }
      const snapshot = await getDocs(q);
      const liveProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));

      if (liveProducts.length > 0) {
        // We have real cloud products! Update local cache
        try {
          localStorage.setItem(cacheKey, JSON.stringify(liveProducts));
          if (!onlyActive) {
            localStorage.setItem('cached_products_all', JSON.stringify(liveProducts));
            localStorage.setItem('cached_products_active', JSON.stringify(liveProducts.filter(p => p.isActive)));
          }
        } catch (e) {}

        // Notify app that cloud data has synced
        window.dispatchEvent(new Event('local_products_updated'));
        return liveProducts;
      }
      return null;
    } catch (error) {
      console.warn("Live Firestore product fetch error (using local cache):", error);
      return null;
    }
  };

  // If forceRefresh is requested, fetch directly from cloud
  if (forceRefresh) {
    const live = await fetchLiveProducts();
    if (live && live.length > 0) return live;
  }

  // If we already have cached products, return them immediately for instant zero-latency load,
  // and trigger a silent background sync with the cloud database.
  if (cachedData && cachedData.length > 0) {
    fetchLiveProducts(); // asynchronous background sync
    return cachedData;
  }

  // If cache is empty, attempt to load from cloud first
  const live = await fetchLiveProducts();
  if (live && live.length > 0) {
    return live;
  }

  // Only seed if both local storage AND cloud database are completely empty
  const allKey = 'cached_products_all';
  const activeKey = 'cached_products_active';
  try {
    localStorage.setItem(allKey, JSON.stringify(SEED_PRODUCTS));
    localStorage.setItem(activeKey, JSON.stringify(SEED_PRODUCTS.filter(p => p.isActive)));
  } catch (err) {}
  
  return onlyActive ? SEED_PRODUCTS.filter(p => p.isActive) : SEED_PRODUCTS;
};

/**
 * Synchronize all local products into Cloud Firestore
 */
export const syncLocalProductsToCloud = async (): Promise<{ success: boolean; syncedCount: number; error?: string }> => {
  try {
    const { db } = await initializeFirebase();
    if (!db) {
      return { success: false, syncedCount: 0, error: 'ফায়ারবেস কানেক্ট করা যায়নি।' };
    }

    const allStr = localStorage.getItem('cached_products_all');
    if (!allStr) {
      return { success: true, syncedCount: 0 };
    }

    const localProducts: Product[] = JSON.parse(allStr);
    let synced = 0;

    for (const prod of localProducts) {
      const { id, ...data } = prod;
      const cleanData = {
        ...data,
        updatedAt: new Date().toISOString()
      };

      if (id && !id.startsWith('prod-seed-') && !id.startsWith('prod-')) {
        // Existing doc ID in firestore, update it
        await setDoc(doc(db, COLLECTION_NAME, id), cleanData, { merge: true });
        synced++;
      } else {
        // New or seed item to be saved in firestore
        const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanData);
        prod.id = docRef.id;
        synced++;
      }
    }

    // Update local cache with newly assigned Firestore IDs
    localStorage.setItem('cached_products_all', JSON.stringify(localProducts));
    localStorage.setItem('cached_products_active', JSON.stringify(localProducts.filter(p => p.isActive)));
    window.dispatchEvent(new Event('local_products_updated'));

    return { success: true, syncedCount: synced };
  } catch (err: any) {
    console.error("syncLocalProductsToCloud failed:", err);
    return { success: false, syncedCount: 0, error: err?.message || String(err) };
  }
};

export const updateProduct = async (id: string, data: Partial<Product>) => {
  const saveLocally = () => {
    try {
      const all = JSON.parse(localStorage.getItem('cached_products_all') || '[]');
      const updatedAll = all.map((p: any) => p.id === id ? { ...p, ...data } : p);
      localStorage.setItem('cached_products_all', JSON.stringify(updatedAll));
      
      const active = JSON.parse(localStorage.getItem('cached_products_active') || '[]');
      const updatedActive = active
        .map((p: any) => p.id === id ? { ...p, ...data } : p)
        .filter((p: any) => p.isActive !== false);
      localStorage.setItem('cached_products_active', JSON.stringify(updatedActive));
      
      window.dispatchEvent(new Event('local_products_updated'));

      // Persist to cPanel storage if active
      try {
        detectCPanelStorage().then(h => {
          if (h.isAvailable) {
            cpanelSaveProducts(updatedAll);
          }
        });
      } catch (e) {}
    } catch (e) {
      console.warn("Failed to update product locally:", e);
    }
  };

  const { db } = await initializeFirebase();
  if (!db) {
    saveLocally();
    return;
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, data);
    saveLocally();
  } catch (error) {
    if (isQuotaOrNetworkError(error)) {
      console.warn("Firestore error encountered on product update, saving locally.", error);
      saveLocally();
    } else {
      await handleFirebaseError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    }
  }
};

export const deleteProduct = async (id: string) => {
  const saveLocally = () => {
    try {
      const all = JSON.parse(localStorage.getItem('cached_products_all') || '[]');
      const filteredAll = all.filter((p: any) => p.id !== id);
      localStorage.setItem('cached_products_all', JSON.stringify(filteredAll));
      
      const active = JSON.parse(localStorage.getItem('cached_products_active') || '[]');
      const filteredActive = active.filter((p: any) => p.id !== id);
      localStorage.setItem('cached_products_active', JSON.stringify(filteredActive));
      
      window.dispatchEvent(new Event('local_products_updated'));

      // Persist to cPanel storage if active
      try {
        detectCPanelStorage().then(h => {
          if (h.isAvailable) {
            cpanelSaveProducts(filteredAll);
          }
        });
      } catch (e) {}
    } catch (e) {
      console.warn("Failed to delete product locally:", e);
    }
  };

  const { db } = await initializeFirebase();
  if (!db) {
    saveLocally();
    return;
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    saveLocally();
  } catch (error) {
    if (isQuotaOrNetworkError(error)) {
      console.warn("Firestore error encountered on product deletion, saving locally.", error);
      saveLocally();
    } else {
      await handleFirebaseError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    }
  }
};
