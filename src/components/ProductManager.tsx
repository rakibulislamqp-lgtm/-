import React, { useState, useEffect, useRef } from 'react';
import { getAllProducts, createProduct, updateProduct, deleteProduct, uploadImage } from '../services/productService';
import { signInWithGoogle, initializeFirebase } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Product, Category, ProductCategoryItem } from '../types';
import { fetchAllCategories, getStoredCategories } from '../services/categoryService';
import CategoryManagerModal from './CategoryManagerModal';
import { 
  Plus, Search, Edit, Trash2, Package, Tag, Hash, 
  DollarSign, Image as ImageIcon, Check, X, AlertCircle, Loader2,
  Eye, EyeOff, Upload, Camera, ShieldCheck, LogIn, Video, Play, Film,
  ChevronLeft, ChevronRight, Layers, ImagePlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ProductManager() {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const cached = localStorage.getItem('cached_products_all');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_products_all');
      return cached ? JSON.parse(cached).length === 0 : true;
    } catch {
      return true;
    }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isAuthAuthorized, setIsAuthAuthorized] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [useBase64, setUseBase64] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for delete confirmation and notifications
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; text: string } | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoriesList, setCategoriesList] = useState<ProductCategoryItem[]>(() => getStoredCategories());

  // Listen to categories updates
  useEffect(() => {
    fetchAllCategories().then(cats => setCategoriesList(cats)).catch(() => {});

    const handleCatUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setCategoriesList(e.detail);
      } else {
        fetchAllCategories().then(cats => setCategoriesList(cats)).catch(() => {});
      }
    };

    window.addEventListener('categories_updated', handleCatUpdate);
    return () => window.removeEventListener('categories_updated', handleCatUpdate);
  }, []);

  const showNotification = (text: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(prev => prev?.text === text ? null : prev);
    }, 4500);
  };

  useEffect(() => {
    let unsubscribe: any;
    
    const initAuthListener = async () => {
      try {
        const { auth } = await initializeFirebase();
        if (auth) {
          unsubscribe = onAuthStateChanged(auth, (user) => {
            setIsAuthAuthorized(!!user);
            setIsAnonymous(user?.isAnonymous || false);
            if (user) {
              console.log("Auth State Changed:", { uid: user.uid, isAnonymous: user.isAnonymous });
            }
          });
        }
      } catch (err) {
        console.warn("Auth initialization failed for ProductManager", err);
      }
    };

    initAuthListener();
    return () => unsubscribe && typeof unsubscribe === 'function' && unsubscribe();
  }, []);

  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  const handleGoogleLogin = async () => {
    setLoggingIn(true);
    setLoginError(null);
    try {
      await signInWithGoogle();
      // onAuthStateChanged will handle setIsAuthAuthorized
    } catch (err: any) {
      console.error("Login Error:", err);
      setLoginError(err.message || 'Unknown error');
      // alert(`লগইন ব্যর্থ হয়েছে: ${err.message || 'Unknown error'}`);
    } finally {
      setLoggingIn(false);
    }
  };

  const [formEntries, setFormEntries] = useState<Partial<Product>[]>([{
    title: '',
    brand: '',
    description: '',
    price: 0,
    imageUrl: '',
    category: 'THREE PIECE',
    productCode: '',
    stock: 0,
    discount: 0,
    isActive: true,
    initialSalesCount: 0
  }]);

  const addFormEntry = () => {
    setFormEntries(prev => [...prev, {
      title: '',
      brand: '',
      description: '',
      price: 0,
      imageUrl: '',
      category: 'THREE PIECE',
      productCode: '',
      stock: 50,
      discount: 0,
      isActive: true,
      initialSalesCount: 0
    }]);
    
    // Smooth scroll to bottom after adding
    setTimeout(() => {
      const modalScroll = document.getElementById('modal-scroll-area');
      if (modalScroll) {
        modalScroll.scrollTo({ top: modalScroll.scrollHeight, behavior: 'smooth' });
      }
    }, 100);
  };

  const removeFormEntry = (index: number) => {
    if (formEntries.length === 1) return;
    setFormEntries(prev => prev.filter((_, i) => i !== index));
  };

  const fillTenEntries = () => {
    const currentCount = formEntries.length;
    if (currentCount >= 10) return;
    const needed = 10 - currentCount;
    const newItems: Partial<Product>[] = Array.from({ length: needed }, (_, i) => ({
      title: '',
      brand: 'Sera Fashion',
      description: 'আরামদায়ক ও আকর্ষণীয় প্রিমিয়াম কোয়ালিটি কালেকশন।',
      price: 1500,
      imageUrl: '',
      category: 'THREE PIECE',
      productCode: `SFH-P${String(products.length + currentCount + i + 1).padStart(2, '0')}`,
      stock: 25,
      discount: 100,
      isActive: true,
      initialSalesCount: 15
    }));
    setFormEntries(prev => [...prev, ...newItems]);
    showNotification(`একসাথে ১০টি প্রোডাক্ট এন্ট্রি ফরম প্রস্তুত করা হয়েছে।`, 'success');
  };

  const handleBatchImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files: File[] = (Array.from(fileList) as File[]).slice(0, 10);

    showNotification(`${files.length}টি ছবি লোড করা হচ্ছে...`, 'info');

    const newEntries: Partial<Product>[] = [];

    for (let i = 0; i < files.length; i++) {
      const file: File = files[i];
      if (!file.type.startsWith('image/')) continue;

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX_SIZE = 500;
            if (width > height) {
              if (width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
              }
            } else {
              if (height > MAX_SIZE) {
                width *= MAX_SIZE / height;
                height = MAX_SIZE;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.45));
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      });

      const cleanName = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ")
        .trim();

      newEntries.push({
        title: cleanName || `প্রোডাক্ট কালেকশন #${products.length + i + 1}`,
        brand: 'Sera Fashion',
        description: 'আরামদায়ক কাপড়ের উপর নিখুঁত কাজ করা প্রিমিয়াম কালেকশন।',
        price: 1500,
        imageUrl: base64,
        category: 'THREE PIECE',
        productCode: `SFH-P${String(products.length + i + 1).padStart(2, '0')}`,
        stock: 25,
        discount: 100,
        isActive: true,
        initialSalesCount: 15
      });
    }

    if (newEntries.length > 0) {
      setFormEntries(newEntries);
      showNotification(`সফলভাবে ${newEntries.length}টি প্রোডাক্টের ছবি যুক্ত করা হয়েছে!`, 'success');
    }
  };

  const updateFormEntry = (index: number, updates: Partial<Product>) => {
    setFormEntries(prev => {
      const newEntries = [...prev];
      newEntries[index] = { ...newEntries[index], ...updates };
      return newEntries;
    });
  };

  const fetchProducts = async () => {
    const hasCache = products && products.length > 0;
    if (!hasCache) {
      setLoading(true);
    }
    const data = await getAllProducts(false, true); // forceRefresh = true to get fresh network updates in background
    setProducts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (products && products.length > 0) {
      try {
        localStorage.setItem('cached_products_all', JSON.stringify(products));
      } catch (cacheErr) {
        console.warn("Failed to write updated products cache to localStorage:", cacheErr);
      }
    }
  }, [products]);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormEntries([{
        ...product,
        initialSalesCount: product.initialSalesCount ?? 0
      }]);
    } else {
      setEditingProduct(null);
      setFormEntries([{
        title: '',
        brand: '',
        description: '',
        price: 0,
        imageUrl: '',
        category: 'THREE PIECE',
        productCode: '',
        stock: 50,
        discount: 0,
        isActive: true,
        initialSalesCount: 0
      }]);
    }
    setIsModalOpen(true);
  };

  const [uploadProgress, setUploadProgress] = useState<{ [key: number]: number }>({});
  const [uploadingEntry, setUploadingEntry] = useState<{ [key: number]: boolean }>({});

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('শুধুমাত্র ছবি (Image) ফাইল আপলোড করা সম্ভব।', 'warning');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotification('ফাইলের সাইজ অনেক বড় (সর্বোচ্চ ৫ মেগাবাইট)।', 'warning');
      return;
    }

    setUploadingEntry(prev => ({ ...prev, [index]: true }));
    setUploadProgress(prev => ({ ...prev, [index]: 0 }));

    const convertToBase64 = () => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 500;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', 0.4);
          updateFormEntry(index, { imageUrl: base64 });
          setUploadingEntry(prev => ({ ...prev, [index]: false }));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    };

    try {
      if (useBase64) {
        convertToBase64();
        return;
      }

      const url = await uploadImage(file, (progress) => {
        setUploadProgress(prev => ({ ...prev, [index]: progress }));
      });
      if (url) {
        updateFormEntry(index, { imageUrl: url });
        setUploadingEntry(prev => ({ ...prev, [index]: false }));
      }
    } catch (error: any) {
      console.warn("Upload failed. Falling back to Internal Base64 mode:", error);
      showNotification("ক্লাউড সীমার কারণে স্বয়ংক্রিয়ভাবে ইন্টারনাল মোডে ছবি প্রসেস করা হচ্ছে...", "info");
      convertToBase64();
    } finally {
      // If we are in base64 mode, convertToBase64 handles setting uploadingEntry to false on load.
      // So only clean up if we didn't do base64 mode, or if an error happened.
      if (!useBase64) {
        setUploadingEntry(prev => ({ ...prev, [index]: false }));
        setUploadProgress(prev => ({ ...prev, [index]: 0 }));
      }
    }
  };

  const [uploadingVideoEntry, setUploadingVideoEntry] = useState<{ [key: number]: boolean }>({});
  const [videoUploadProgress, setVideoUploadProgress] = useState<{ [key: number]: number }>({});
  const [showVideoUrlInput, setShowVideoUrlInput] = useState<{ [key: number]: boolean }>({});

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      showNotification('শুধুমাত্র ভিডিও (Video) ফাইল সিলেক্ট করতে পারবেন।', 'warning');
      return;
    }

    if (file.size > 80 * 1024 * 1024) {
      showNotification('ভিডিও ফাইলের সাইজ অনেক বড় (সর্বোচ্চ ৮০ মেগাবাইট)।', 'warning');
      return;
    }

    setUploadingVideoEntry(prev => ({ ...prev, [index]: true }));
    setVideoUploadProgress(prev => ({ ...prev, [index]: 15 }));

    const processVideoFile = () => {
      const reader = new FileReader();
      reader.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const percent = Math.round((evt.loaded / evt.total) * 100);
          setVideoUploadProgress(prev => ({ ...prev, [index]: Math.max(15, percent) }));
        }
      };
      reader.onload = (event) => {
        const result = event.target?.result as string;
        updateFormEntry(index, { videoUrl: result });
        setUploadingVideoEntry(prev => ({ ...prev, [index]: false }));
        showNotification('প্রোডাক্টের ভিডিও সফলভাবে সংযুক্ত করা হয়েছে!', 'success');
      };
      reader.onerror = () => {
        showNotification('ভিডিও ফাইল পড়তে সমস্যা হয়েছে, আবার চেষ্টা করুন।', 'error');
        setUploadingVideoEntry(prev => ({ ...prev, [index]: false }));
      };
      reader.readAsDataURL(file);
    };

    try {
      if (useBase64) {
        processVideoFile();
        return;
      }

      const url = await uploadImage(file, (progress) => {
        setVideoUploadProgress(prev => ({ ...prev, [index]: progress }));
      });
      if (url) {
        updateFormEntry(index, { videoUrl: url });
        setUploadingVideoEntry(prev => ({ ...prev, [index]: false }));
        showNotification('প্রোডাক্ট ভিডিও সফলভাবে আপলোড করা হয়েছে!', 'success');
      } else {
        processVideoFile();
      }
    } catch (err) {
      console.warn("Video upload falling back to FileReader Data URL:", err);
      processVideoFile();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const invalidEntries = formEntries.filter(entry => !entry.imageUrl || !entry.title || !entry.price);
    if (invalidEntries.length > 0) {
      showNotification("অসম্পূর্ণ তথ্য: সকল প্রোডাক্টের ছবি, নাম এবং মূল্য অবশ্যই দিতে হবে।", "warning");
      return;
    }

    setSubmitting(true);
    try {
      for (const entry of formEntries) {
        if (editingProduct?.id) {
          // Remove ID from the data to avoid Firestore update errors
          const { id, ...saveData } = entry as Product;
          await updateProduct(editingProduct.id, saveData);
        } else {
          await createProduct(entry);
        }
      }
      setIsModalOpen(false);
      await fetchProducts();
      showNotification(`সফল: ${formEntries.length} টি প্রোডাক্ট ক্যাটালগে সেভ করা হয়েছে।`, "success");
    } catch (error: any) {
      console.error("Failed to save products:", error);
      showNotification(`প্রোডাক্ট সেভ করতে সমস্যা হয়েছে: ${error.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (product: Product) => {
    setProductToDelete(product);
  };

  const confirmDelete = async () => {
    if (!productToDelete?.id) return;
    setDeleting(true);
    try {
      await deleteProduct(productToDelete.id);
      showNotification(`${productToDelete.title} সফলভাবে ক্যাটালগ থেকে ডিলিট করা হয়েছে।`, 'success');
      setProductToDelete(null);
      await fetchProducts();
    } catch (error: any) {
      console.error("Failed to delete product:", error);
      showNotification(`প্রোডাক্ট ডিলিট করতে সমস্যা হয়েছে: ${error.message || error}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (product: Product) => {
    if (!product.id) return;
    const newActive = !product.isActive;
    // 1. Optimistic immediate state update
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isActive: newActive } : p));
    showNotification(
      newActive 
        ? `"${product.title}" সফলভাবে ওয়েবসাইটে দৃশ্যমান (Active) করা হয়েছে!` 
        : `"${product.title}" ওয়েবসাইট থেকে হাইড (Hidden) করা হয়েছে!`, 
      'info'
    );
    // 2. Persist to storage & cloud
    await updateProduct(product.id, { isActive: newActive });
  };

  const ADMIN_PRODUCTS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const filteredProducts = products.filter(p => {
    const s = (searchTerm || '').toLowerCase();
    const titleMatch = (p.title || '').toLowerCase().includes(s);
    const codeMatch = (p.productCode || '').toLowerCase().includes(s);
    return titleMatch || codeMatch;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredProducts.length / ADMIN_PRODUCTS_PER_PAGE) || 1;
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedProducts = filteredProducts.slice(
    (validCurrentPage - 1) * ADMIN_PRODUCTS_PER_PAGE,
    validCurrentPage * ADMIN_PRODUCTS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm focus:ring-2 focus:ring-rose-500/20 outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-300/80 rounded-2xl font-bold transition-all shadow-sm cursor-pointer text-sm"
            title="ক্যাটাগরি পরিচালনা ও নতুন ক্যাটাগরি তৈরি করুন"
          >
            <Layers size={18} className="text-amber-600" />
            <span>ক্যাটাগরি ম্যানেজমেন্ট</span>
          </button>

          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-2xl font-bold transition-all hover:bg-rose-700 shadow-lg shadow-rose-900/20 text-sm"
          >
            <Plus size={20} />
            নতুন প্রোডাক্ট যোগ করুন
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          [...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-[2rem] border border-gray-100 p-4 animate-pulse">
              <div className="aspect-square bg-gray-100 rounded-2xl mb-4" />
              <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-50 rounded w-1/2" />
            </div>
          ))
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full py-20 bg-white rounded-[2rem] border border-dashed border-gray-200 text-center">
            <Package className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No products found</p>
          </div>
        ) : (
          paginatedProducts.map(product => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              key={product.id}
              className={`bg-white rounded-[2rem] border overflow-hidden transition-all group hover:shadow-xl ${!product.isActive ? 'opacity-60 border-gray-100' : 'border-gray-100 shadow-sm'}`}
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <img 
                  src={product.imageUrl} 
                  alt={product.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                />
                <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                  <button 
                    type="button"
                    onClick={() => toggleActive(product)}
                    className={`p-2 rounded-xl backdrop-blur-md transition-all shadow-lg ${product.isActive ? 'bg-white/95 text-emerald-600 hover:bg-emerald-50' : 'bg-brand-charcoal/95 text-amber-300 hover:bg-black ring-2 ring-amber-400/50'}`}
                    title={product.isActive ? 'ওয়েবসাইট থেকে প্রোডাক্টটি হাইড করতে ক্লিক করুন' : 'প্রোডাক্টটি ওয়েবসাইটে দৃশ্যমান (Active) করতে ক্লিক করুন'}
                  >
                    {product.isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleOpenModal(product)}
                    className="p-2 bg-white/90 text-rose-500 rounded-xl backdrop-blur-md hover:bg-rose-500 hover:text-white transition-all shadow-lg"
                    title="প্রোডাক্ট এডিট করুন"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleDelete(product)}
                    className="p-2 bg-white/90 text-gray-400 rounded-xl backdrop-blur-md hover:bg-rose-600 hover:text-white transition-all shadow-lg"
                    title="প্রোডাক্ট ডিলিট করুন"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                {!product.isActive && (
                  <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full bg-brand-charcoal/90 text-amber-300 text-[10.5px] font-black uppercase tracking-wider backdrop-blur-md shadow-lg border border-amber-400/40 flex items-center gap-1.5">
                    <EyeOff size={12} className="text-amber-400" />
                    <span>হাইড করা (Hidden)</span>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                  <span className="bg-brand-charcoal text-white px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                    {product.category}
                  </span>
                  {product.videoUrl && (
                    <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1 border border-purple-400/40">
                      <Video size={11} /> 🎬 ভিডিও
                    </span>
                  )}
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight line-clamp-1">{product.title}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{product.productCode}</p>
                  </div>
                  <div className="text-rose-600 font-black text-lg tabular-nums">৳{product.price.toLocaleString()}</div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                    <Package size={12} className="text-rose-500" />
                    <span>Stock: {product.stock}</span>
                  </div>
                  <div className={`text-[9px] font-black uppercase tracking-widest ${product.stock > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Admin Pagination Bar (10 products per page) */}
      {totalPages > 1 && (
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-bold text-gray-500">
            মোট <span className="font-black text-brand-charcoal">{filteredProducts.length}</span>টি প্রোডাক্টের মধ্যে <span className="font-black text-brand-charcoal">{(validCurrentPage - 1) * ADMIN_PRODUCTS_PER_PAGE + 1}–{Math.min(validCurrentPage * ADMIN_PRODUCTS_PER_PAGE, filteredProducts.length)}</span>টি দেখাচ্ছে (পেজ {validCurrentPage} এর {totalPages})
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            <button
              type="button"
              disabled={validCurrentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 transition-all cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>পূর্ববর্তী</span>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`min-w-[2.25rem] h-9 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  pageNum === validCurrentPage
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-900/20'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              type="button"
              disabled={validCurrentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="px-3 py-2 rounded-xl bg-brand-charcoal text-white hover:bg-black disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 text-xs font-bold transition-all cursor-pointer"
            >
              <span>পরবর্তী</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Product Edit/Add Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-[#0f111a]/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8 bg-brand-charcoal text-white flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-widest">{editingProduct ? 'প্রোডাক্ট এডিট করুন' : 'নতুন প্রোডাক্ট যোগ করুন'}</h2>
                  <p className="text-[10px] text-rose-500 font-bold uppercase tracking-[0.2em] mt-1">ক্যাটালগ ম্যানেজমেন্ট</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-10 max-h-[70vh] overflow-y-auto" id="modal-scroll-area">
                {!editingProduct && (
                  <div className="bg-rose-50/70 border border-rose-100/80 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Layers size={16} className="text-rose-600" />
                        <span className="text-xs font-black text-rose-950 uppercase tracking-wider">
                          একসাথে ১০টি প্রোডাক্ট আপলোড
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 font-semibold mt-0.5">
                        বর্তমানে <span className="text-rose-600 font-bold">{formEntries.length}</span>টি প্রোডাক্ট ফর্ম তৈরি আছে (প্রতি ব্যাচে সর্বোচ্চ ১০টি)।
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="px-3.5 py-2 bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm flex items-center gap-1.5 active:scale-95">
                        <ImagePlus size={15} />
                        <span>📸 ছবি সিলেক্ট করুন (১০টি পর্যন্ত)</span>
                        <input 
                          type="file" 
                          multiple 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleBatchImageUpload}
                        />
                      </label>
                      {formEntries.length < 10 && (
                        <button
                          type="button"
                          onClick={fillTenEntries}
                          className="px-3.5 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer"
                        >
                          <Plus size={15} />
                          <span>১০টি ফর্ম খুলুন ({10 - formEntries.length}টি বাকি)</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {formEntries.map((entry, index) => (
                  <div key={index} className={`space-y-6 ${index > 0 ? 'pt-10 border-t-2 border-dashed border-gray-100 relative' : ''}`}>
                    {index > 0 && (
                      <button 
                        type="button"
                        onClick={() => removeFormEntry(index)}
                        className="absolute top-6 right-0 p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    
                    <div className="flex items-center gap-3 mb-2">
                       <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center text-[10px] font-black">
                         {index + 1}
                       </div>
                       <h3 className="text-xs font-black text-brand-charcoal uppercase tracking-widest">
                         Product Item {index + 1} {formEntries.length > 1 ? `of ${formEntries.length}` : ''}
                       </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Auth Warning for Storage - Only show for first item or if not auth */}
                      {index === 0 && (!isAuthAuthorized || isAnonymous) && (
                        <div className="col-span-2 bg-amber-50 border border-amber-200 p-4 rounded-3xl flex items-start gap-4">
                          <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
                            <ShieldCheck size={20} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[11px] font-black text-amber-900 uppercase tracking-widest">{isAnonymous ? 'Logged in Anonymously' : 'Storage Authorization Required'}</p>
                            <p className="text-[10px] text-amber-700 font-medium mt-1">
                              {isAnonymous 
                                ? 'আপনি বর্তমানে অতিথি (Anonymous) হিসেবে আছেন। ছবি আপলোড করার জন্য গুগল লগইন করা জরুরি।' 
                                : 'ছবি আপলোড করার জন্য গুগল লগইন প্রয়োজন। Anonymous Auth দিয়ে অনেক সময় আপলোড হতে সমস্যা হতে পারে।'}
                            </p>
                            <button 
                              type="button"
                              disabled={loggingIn}
                              onClick={handleGoogleLogin}
                              className="mt-3 flex items-center gap-2 px-6 py-2 bg-[#1a1c2e] text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg disabled:opacity-50"
                            >
                              {loggingIn ? <Loader2 size={12} className="animate-spin" /> : <LogIn size={12} />} 
                              {loginError ? 'Retry Login' : (loggingIn ? 'Logging in...' : 'Log in with Google')}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Image & Video Upload Area (Side-by-Side) */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 col-span-2">
                        {/* 1. Image Upload Column */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                              <Camera size={14} className="text-rose-500" />
                              <span>প্রোডাক্টের ছবি (Product Image) *</span>
                            </label>
                            <div className="flex gap-2">
                              {index === 0 && (
                                <button 
                                  type="button"
                                  onClick={() => setUseBase64(!useBase64)}
                                  className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md transition-all ${useBase64 ? 'bg-rose-100 text-rose-600' : 'text-gray-400 hover:text-rose-500'}`}
                                >
                                  {useBase64 ? '✓ Local' : 'Cloud'}
                                </button>
                              )}
                              <button 
                                type="button"
                                onClick={() => setShowUrlInput(!showUrlInput)}
                                className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                              >
                                {showUrlInput ? 'Upload' : 'URL'}
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200/60 rounded-lg px-2.5 py-1 text-[10px] text-emerald-700 font-semibold">
                            <span>📐 আদর্শ সাইজ: <strong>800 × 1000 px</strong> (4:5 রেশিও)</span>
                            <span className="text-[9px] bg-emerald-200/60 px-1.5 py-0.2 rounded font-bold">Best Fit</span>
                          </div>

                          {showUrlInput ? (
                            <div className="relative">
                              <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                              <input 
                                type="url"
                                placeholder="https://example.com/image.jpg"
                                value={entry.imageUrl}
                                onChange={(e) => updateFormEntry(index, { imageUrl: e.target.value })}
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all text-sm font-medium"
                              />
                            </div>
                          ) : (
                            <div 
                              onClick={() => !uploadingEntry[index] && document.getElementById(`file-input-${index}`)?.click()}
                              className={`relative group h-60 rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden gap-2 ${
                                entry.imageUrl 
                                  ? 'border-emerald-500/40 bg-emerald-50/10' 
                                  : 'border-gray-200 hover:border-rose-400 bg-gray-50'
                              }`}
                            >
                              <input 
                                type="file"
                                id={`file-input-${index}`}
                                onChange={(e) => handleFileChange(e, index)}
                                accept="image/*"
                                className="hidden"
                              />
                              
                              {entry.imageUrl ? (
                                <>
                                  <img 
                                    src={entry.imageUrl} 
                                    alt="Preview" 
                                    className="absolute inset-0 w-full h-full object-cover group-hover:opacity-40 transition-opacity"
                                  />
                                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-brand-charcoal/40 backdrop-blur-sm">
                                    <Upload className="text-white mb-1" size={28} />
                                    <span className="text-white text-[11px] font-black uppercase tracking-widest">ছবি পরিবর্তন করুন</span>
                                  </div>
                                </>
                              ) : (
                                <div className="text-center p-4">
                                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-rose-500 mx-auto mb-2 group-hover:scale-110 transition-transform">
                                    <Camera size={24} />
                                  </div>
                                  <p className="text-xs font-black text-gray-800 uppercase tracking-widest">গ্যালারি থেকে ছবি আপলোড</p>
                                  <p className="text-[10px] text-gray-400 font-bold mt-1">গ্যালারি থেকে ফটো নির্বাচন করুন</p>
                                </div>
                              )}

                              {uploadingEntry[index] && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10 flex-col gap-2">
                                  <Loader2 className="animate-spin text-rose-600" size={28} />
                                  <div className="w-1/2 h-1 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${uploadProgress[index] || 0}%` }} />
                                  </div>
                                  <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{Math.round(uploadProgress[index] || 0)}%</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 2. Video Upload Column */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] font-black text-purple-700 uppercase tracking-widest flex items-center gap-1.5">
                              <Video size={14} className="text-purple-600" />
                              <span>প্রোডাক্টের ভিডিও (Product Video) 🎬</span>
                            </label>
                            <button 
                              type="button"
                              onClick={() => setShowVideoUrlInput(prev => ({ ...prev, [index]: !prev[index] }))}
                              className="text-[9px] font-black text-purple-600 uppercase tracking-widest hover:underline"
                            >
                              {showVideoUrlInput[index] ? 'Upload File' : 'Enter URL'}
                            </button>
                          </div>

                          {showVideoUrlInput[index] ? (
                            <div className="relative">
                              <Video className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-500" size={18} />
                              <input 
                                type="url"
                                placeholder="https://example.com/video.mp4"
                                value={entry.videoUrl || ''}
                                onChange={(e) => updateFormEntry(index, { videoUrl: e.target.value })}
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-purple-50/50 border border-purple-100 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all text-sm font-medium"
                              />
                            </div>
                          ) : (
                            <div 
                              onClick={() => !uploadingVideoEntry[index] && document.getElementById(`video-input-${index}`)?.click()}
                              className={`relative group h-60 rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden gap-2 ${
                                entry.videoUrl 
                                  ? 'border-purple-500/40 bg-purple-50/20' 
                                  : 'border-purple-200 hover:border-purple-400 bg-purple-50/30'
                              }`}
                            >
                              <input 
                                type="file"
                                id={`video-input-${index}`}
                                onChange={(e) => handleVideoFileChange(e, index)}
                                accept="video/*"
                                className="hidden"
                              />
                              
                              {entry.videoUrl ? (
                                <div className="relative w-full h-full group">
                                  <video 
                                    src={entry.videoUrl} 
                                    controls={false}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center text-white gap-2 opacity-95 group-hover:opacity-100 transition-opacity p-2">
                                    <div className="w-12 h-12 rounded-full bg-purple-600/90 flex items-center justify-center text-white shadow-lg">
                                      <Play size={22} className="ml-0.5" />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-wider bg-black/60 px-3 py-1 rounded-full border border-white/20">
                                      ভিডিও সংযুক্ত আছে
                                    </span>
                                    <div className="flex gap-2 mt-1">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          document.getElementById(`video-input-${index}`)?.click();
                                        }}
                                        className="text-[9px] font-black uppercase bg-white text-gray-900 px-3 py-1 rounded-lg shadow hover:bg-purple-100 transition-all cursor-pointer"
                                      >
                                        পরিবর্তন
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateFormEntry(index, { videoUrl: '' });
                                        }}
                                        className="text-[9px] font-black uppercase bg-rose-600 text-white px-3 py-1 rounded-lg shadow hover:bg-rose-700 transition-all cursor-pointer"
                                      >
                                        রিমুভ
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center p-4">
                                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform border border-purple-100">
                                    <Film size={24} />
                                  </div>
                                  <p className="text-xs font-black text-purple-900 uppercase tracking-widest">গ্যালারি থেকে ভিডিও আপলোড</p>
                                  <p className="text-[10px] text-purple-500 font-bold mt-1">গ্যালারি থেকে পছন্দমত ভিডিও সিলেক্ট করুন (MP4/WebM)</p>
                                </div>
                              )}

                              {uploadingVideoEntry[index] && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm z-10 flex-col gap-2 p-4 text-center">
                                  <Loader2 className="animate-spin text-purple-600" size={30} />
                                  <div className="w-2/3 h-1.5 bg-purple-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-600 transition-all duration-300" style={{ width: `${videoUploadProgress[index] || 0}%` }} />
                                  </div>
                                  <span className="text-[10px] font-black text-purple-700 uppercase tracking-widest">ভিডিও প্রসেস হচ্ছে... {Math.round(videoUploadProgress[index] || 0)}%</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Title & Brand */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 col-span-2">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">প্রোডাক্ট এর নাম (Title)</label>
                          <div className="relative">
                            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                              required
                              type="text"
                              placeholder="যেমন: প্রিমিয়াম সিল্ক থ্রি পিস"
                              value={entry.title}
                              onChange={(e) => updateFormEntry(index, { title: e.target.value })}
                              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all text-sm font-medium"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ব্র্যান্ডের নাম (Brand Name)</label>
                          <div className="relative">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                              type="text"
                              placeholder="যেমন: SERA FASHION"
                              value={entry.brand}
                              onChange={(e) => updateFormEntry(index, { brand: e.target.value })}
                              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all text-sm font-medium"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Category & Product Code */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 col-span-2">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ক্যাটাগরি</label>
                            <button
                              type="button"
                              onClick={() => setIsCategoryModalOpen(true)}
                              className="text-[10px] font-bold text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Plus size={12} />
                              <span>নতুন ক্যাটাগরি</span>
                            </button>
                          </div>
                          <select 
                            value={entry.category}
                            onChange={(e) => {
                              if (e.target.value === '__ADD_NEW__') {
                                setIsCategoryModalOpen(true);
                              } else {
                                updateFormEntry(index, { category: e.target.value as Category });
                              }
                            }}
                            className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all text-sm font-bold uppercase tracking-widest"
                          >
                            {categoriesList.filter(c => c.id !== 'ALL').map(cat => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name} ({cat.id})
                              </option>
                            ))}
                            {entry.category && !categoriesList.some(c => c.id === entry.category) && (
                              <option value={entry.category}>{entry.category}</option>
                            )}
                            <option value="__ADD_NEW__" className="text-amber-600 font-bold">+ নতুন ক্যাটাগরি তৈরি করুন...</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">প্রোডাক্ট কোড</label>
                          <div className="relative">
                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                              required
                              type="text"
                              placeholder="SFH-101"
                              value={entry.productCode}
                              onChange={(e) => updateFormEntry(index, { productCode: e.target.value.toUpperCase() })}
                              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all text-sm font-bold tracking-widest"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Price & Stock & Discount */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 col-span-2">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">মূল্য (Price ৳)</label>
                          <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                              required
                              type="number"
                              placeholder="0"
                              value={entry.price}
                              onChange={(e) => updateFormEntry(index, { price: Number(e.target.value) })}
                              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all text-lg font-black tabular-nums"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ডিসকাউন্ট (৳)</label>
                          <div className="relative">
                            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                              type="number"
                              placeholder="0"
                              value={entry.discount || 0}
                              onChange={(e) => updateFormEntry(index, { discount: Number(e.target.value) })}
                              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all text-lg font-black tabular-nums text-rose-600"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ষ্টক পরিমাণ</label>
                          <div className="relative">
                            <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                              required
                              type="number"
                              placeholder="0"
                              value={entry.stock}
                              onChange={(e) => updateFormEntry(index, { stock: Number(e.target.value) })}
                              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all text-lg font-black tabular-nums"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-3 col-span-2 bg-rose-50/35 p-6 rounded-3xl border border-rose-100/50">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-brand-charcoal uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            পণ্যর বিস্তারিত বিবরণ / ডিটেইলস (Detailed Description)
                          </label>
                          <span className="text-[10px] bg-rose-500/15 text-rose-700 px-3 py-1 rounded-full font-bold">
                            লাইন ব্রেক বা এন্টার কী সমর্থিত ⏎
                          </span>
                        </div>
                        <textarea 
                          rows={10}
                          placeholder={`উদাহরণস্বরূপ:\n\n✅ প্রিমিয়াম কোয়ালিটি ১০০% সিল্ক ফেব্রিক\n✅ আকর্ষণীয় মেরুন ও গোল্ডেন কালার কম্বিনেশন\n✅ প্রিমিয়াম ডাবল-স্টিচ ফিনিশিং\n✅ আরামদায়ক এবং দীর্ঘস্থায়ী শাড়ি\n✅ বিবাহ, উৎসব, পার্টি বা বিশেষ অনুষ্ঠানের জন্য উপযোগী`}
                          value={entry.description}
                          onChange={(e) => updateFormEntry(index, { description: e.target.value })}
                          className="w-full px-6 py-4 rounded-2xl bg-white border border-gray-250 focus:ring-4 focus:ring-rose-550/20 focus:border-rose-500 outline-none transition-all text-sm font-semibold leading-relaxed shadow-inner placeholder-gray-400"
                        />
                        <div className="flex items-start gap-1.5 text-[11px] text-gray-500 leading-normal pl-1">
                          <span className="animate-pulse text-amber-500">💡</span>
                          <span className="font-bold">টিপস:</span>
                          <span className="font-medium">ডিটেইলস লেখার সময় প্রতিটি পয়েন্ট আলাদা লাইনে (এন্টার প্রেস করে) লিখুন। আপনি আপনার ইচ্ছামতো ইমোজি (যেমন- ✅, 🌟, 🌸) কিংবা বুলেট পয়েন্ট ব্যবহার করতে পারেন। কাস্টমার ঠিক একইভাবে গুছানো লিস্ট আকারে আপনার লেখাটি দেখতে পাবে।</span>
                        </div>
                      </div>

                      {/* Social Proof & Live Sales Customization segment */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 col-span-2 bg-[#f9fafb] p-6 rounded-[2rem] border border-gray-100">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Plus size={12} className="text-rose-500 font-extrabold" />
                            ইনিশিয়াল সেলস কাউন্ট (Baseline Orders)
                          </label>
                          <input 
                            type="number"
                            placeholder="যেমন: ৫০"
                            value={entry.initialSalesCount ?? 0}
                            onChange={(e) => updateFormEntry(index, { initialSalesCount: Number(e.target.value) })}
                            className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 outline-none transition-all text-sm font-bold tabular-nums"
                          />
                          <p className="text-[9.5px] text-gray-400 font-medium">এটি কাস্টমারদের দেখানোর জন্য প্রাথমিক সেলস বেসলাইন। এর সাথে রিয়েল-টাইম কাস্টমার লাইভ অর্ডারসমূহ স্বয়ংক্রিয়ভাবে যোগ হবে।</p>
                        </div>
                        <div className="space-y-1 justify-center flex flex-col pl-2 border-l border-gray-200 md:pl-4">
                          <span className="text-[10.5px] font-black text-brand-charcoal uppercase tracking-widest">সরাসরি ডেটাবেজ সংযোগ</span>
                          <p className="text-[11px] text-gray-500 leading-normal font-medium">
                            কাস্টমার কোনো অর্ডার প্লেস করলেই তা সরাসরি অ্যাডমিন প্যানেল এবং কাস্টমার ইন্টারফেসে সেকেন্ডের মধ্যে লাইভ কাউন্ট আপডেট করবে। ১০০% নিখুঁত রিয়েল-টাইম ডাটা ইন্টিগ্রেশন।
                          </p>
                        </div>
                      </div>

                      {/* Visibility */}
                      <div className="col-span-2 pt-2">
                        <label className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-100 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all">
                          <input 
                            type="checkbox"
                            checked={entry.isActive}
                            onChange={(e) => updateFormEntry(index, { isActive: e.target.checked })}
                            className="w-5 h-5 accent-rose-600 rounded"
                          />
                          <div>
                            <span className="text-xs font-black text-gray-800 uppercase tracking-widest">Active & Visible (চালু আছে)</span>
                            <p className="text-[10px] text-gray-400 font-bold">এটি আনচেক করলে ওয়েবসাইট থেকে প্রোডাক্টটি হাইড হয়ে যাবে।</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}

                {!editingProduct && (
                  formEntries.length < 10 ? (
                    <button 
                      type="button"
                      onClick={addFormEntry}
                      className="w-full py-6 border-2 border-dashed border-gray-200 rounded-[2rem] text-gray-400 font-black uppercase tracking-widest text-[10px] hover:border-rose-500 hover:text-rose-500 hover:bg-rose-50/30 transition-all flex flex-col items-center gap-2 group cursor-pointer"
                    >
                      <Plus size={24} className="group-hover:scale-125 transition-transform" />
                      + Add More Product ({formEntries.length}/১০টি এন্ট্রি)
                    </button>
                  ) : (
                    <div className="w-full py-4 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-center text-xs font-bold text-gray-400">
                      ✓ প্রতি ব্যাচে সর্বোচ্চ ১০টি প্রোডাক্ট ফর্ম পূর্ণ হয়েছে
                    </div>
                  )
                )}

                <div className="pt-6 flex gap-4 sticky bottom-0 bg-white/80 backdrop-blur-md pb-4 z-10 border-t border-gray-50">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-100 transition-all"
                  >
                    বাতিল করুন (Discard)
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting || Object.values(uploadingEntry).some(v => v)}
                    className="flex-[2] py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-rose-700 transition-all shadow-xl shadow-rose-900/20 disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                    {Object.values(uploadingEntry).some(v => v) ? 'Uploading Image...' : (editingProduct ? 'আপডেট করুন (Update)' : 'ক্যাটালগে যোগ করুন (Add to Catalog)')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deleting && setProductToDelete(null)}
              className="absolute inset-0 bg-[#0f111a]/75 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border border-rose-50 p-8 text-center"
            >
              <button 
                disabled={deleting}
                onClick={() => setProductToDelete(null)}
                className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 hover:text-rose-500 rounded-xl transition-all cursor-pointer disabled:opacity-50 animate-fade"
              >
                <X size={20} />
              </button>

              <div className="mx-auto w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
                <Trash2 size={24} className="animate-pulse text-rose-500" />
              </div>

              <h3 className="text-lg font-black text-[#1a1c2e] mb-2 font-sans">প্রোডাক্টটি ডিলিট করতে চান?</h3>
              <p className="text-[11px] text-gray-500 font-semibold mb-6 uppercase tracking-wide">
                আপনি কি নিশ্চিত যে ক্যাটালগ থেকে <span className="text-rose-600 font-extrabold">"{productToDelete.title}"</span> প্রোডাক্টটি চিরতরে ডিলিট করতে চান?
              </p>

              {productToDelete.imageUrl && (
                <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden border border-gray-150 mb-6 bg-gray-50 flex items-center justify-center">
                  <img src={productToDelete.imageUrl} referrerPolicy="no-referrer" alt="ToDelete" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex gap-4">
                <button 
                  type="button"
                  disabled={deleting}
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                >
                  ক্যান্সেল
                </button>
                <button 
                  type="button"
                  disabled={deleting}
                  onClick={confirmDelete}
                  className="flex-[2] py-3 bg-rose-600 text-white hover:bg-rose-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-rose-900/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                  নিশ্চিত ডিলিট
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Manager Modal for Admin */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCategoriesChanged={(cats) => setCategoriesList(cats)}
      />

      {/* Sleek Auto-Dismiss Notification Toast */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] w-full max-w-sm px-4 pointer-events-none">
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              className={`p-4 rounded-2xl shadow-xl flex items-center gap-3 pointer-events-auto border text-xs font-bold leading-relaxed ${
                notification.type === 'success' ? 'bg-[#f0fdf4] border-emerald-100 text-emerald-800' :
                notification.type === 'error' ? 'bg-[#fef2f2] border-rose-100 text-rose-800' :
                notification.type === 'warning' ? 'bg-[#fffbeb] border-amber-100 text-amber-800' :
                'bg-blue-50 border-blue-100 text-blue-800'
              }`}
            >
              {notification.type === 'success' ? <ShieldCheck className="text-emerald-500 shrink-0" size={18} /> : <AlertCircle className="text-rose-500 shrink-0" size={18} />}
              <span className="flex-1 text-left">{notification.text}</span>
              <button onClick={() => setNotification(null)} className="p-1 hover:bg-black/5 rounded-lg transition-colors ml-auto text-gray-500">
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
