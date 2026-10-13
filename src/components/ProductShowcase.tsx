import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getAllProducts } from '../services/productService';
import { getAllOrders } from '../services/orderService';
import { getReviewsForProduct, createReview, deleteReview, getProductSalesCount, ProductReview } from '../services/reviewService';
import { Product, ProductCategoryItem } from '../types';
import { trackProductView, logVisitorEvent, updateVisitorStage } from '../services/trackingService';
import { trackPixelViewContent } from '../services/pixelService';
import { fetchAllCategories, getStoredCategories } from '../services/categoryService';
import { ShoppingBag, Eye, ShoppingCart, Loader2, Sparkles, X, Star, Share2, Info, Hash, ArrowDown, ArrowUp, Flame, SlidersHorizontal, Gift, Trophy, MessageSquare, Send, CheckCircle, ZoomIn, ZoomOut, Maximize2, Video, Play, Film, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreVertical, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PRODUCTS_PER_PAGE = 10;

const toBengaliNumber = (num: number | string): string => {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (w) => banglaDigits[+w]);
};

interface ProductShowcaseProps {
  onOrderNow: (product: Product, quantity: number, size: string) => void;
  onAddToCart?: (product: Product, quantity: number, size: string) => void;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
}

export default function ProductShowcase({ 
  onOrderNow, 
  onAddToCart, 
  selectedCategory, 
  onCategoryChange 
}: ProductShowcaseProps) {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const cached = localStorage.getItem('cached_products_active');
      const parsed = cached ? JSON.parse(cached) : [];
      return Array.isArray(parsed) ? parsed.filter((p: any) => p && p.isActive !== false) : [];
    } catch (e) {
      return [];
    }
  });
  const [orders, setOrders] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('cached_orders');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_products_active');
      const parsed = cached ? JSON.parse(cached) : [];
      return parsed.length === 0;
    } catch (e) {
      return true;
    }
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeMediaTab, setActiveMediaTab] = useState<'photo' | 'video'>('photo');
  const [activeCategory, setActiveCategory] = useState<string>(selectedCategory || 'ALL');
  const [categories, setCategories] = useState<ProductCategoryItem[]>(() => getStoredCategories());
  const [sortBy, setSortBy] = useState<'default' | 'price-desc' | 'price-asc' | 'top-selling'>('default');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortMenuRef = React.useRef<HTMLDivElement>(null);

  // Close sorting dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setIsSortMenuOpen(false);
      }
    };
    if (isSortMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSortMenuOpen]);

  // Synchronize category with parent or external 3-dot trigger
  useEffect(() => {
    if (selectedCategory && selectedCategory !== activeCategory) {
      setActiveCategory(selectedCategory);
    }
  }, [selectedCategory]);

  // Load and subscribe to categories updates
  useEffect(() => {
    fetchAllCategories().then(cats => setCategories(cats)).catch(() => {});

    const handleUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setCategories(e.detail);
      } else {
        fetchAllCategories().then(cats => setCategories(cats)).catch(() => {});
      }
    };

    window.addEventListener('categories_updated', handleUpdate);

    return () => {
      window.removeEventListener('categories_updated', handleUpdate);
    };
  }, []);

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('38');
  const sizes = ['34', '36', '38', '40', '42', '44', '46', '48'];

  // Reviews states
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newReviewName, setNewReviewName] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMessage, setReviewSuccessMessage] = useState('');

  // Zooming & Lightbox States
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const [isZoomed, setIsZoomed] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxScale, setLightboxScale] = useState(1);

  const handleZoomMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  const handleOpenProductModal = (product: Product) => {
    setSelectedProduct(product);
    trackPixelViewContent(product);
  };

  useEffect(() => {
    const loadShowcaseData = async () => {
      // First, get cached or immediate active products for instant loading speed
      const data = await getAllProducts(true);
      setProducts(data.filter((p: any) => p && p.isActive !== false));
      setLoading(false);

      // Load orders in background without blocking product rendering
      getAllOrders().then(orderData => {
        if (orderData && orderData.length > 0) {
          setOrders(orderData);
          try {
            localStorage.setItem('cached_orders', JSON.stringify(orderData));
          } catch (e) {}
        }
      }).catch(e => {
        console.warn("Could not load orders for sales counter", e);
      });

      // Perform a background network fresh-fetch to reflect any recent admin visibility or product edits instantly
      try {
        const freshData = await getAllProducts(true, true);
        if (freshData && freshData.length > 0) {
          setProducts(freshData.filter((p: any) => p && p.isActive !== false));
        }
      } catch (e) {
        console.warn("Could not get background fresh products updates:", e);
      }
    };
    loadShowcaseData();

    // Listen to local_products_updated events (triggered by Admin hide/show or edit)
    const handleProductsUpdated = async () => {
      const updated = await getAllProducts(true);
      setProducts(updated.filter((p: any) => p && p.isActive !== false));
    };
    window.addEventListener('local_products_updated', handleProductsUpdated);

    return () => {
      window.removeEventListener('local_products_updated', handleProductsUpdated);
    };
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      setQuantity(1);
      setSelectedSize('38');
      setReviewSuccessMessage('');
      
      const fetchModalReviews = () => {
        setReviewsLoading(true);
        getReviewsForProduct(selectedProduct.id || '', selectedProduct.productCode)
          .then(data => {
            setReviews(data);
            setReviewsLoading(false);
          })
          .catch(err => {
            console.error("Failed to load reviews", err);
            setReviewsLoading(false);
          });
      };

      fetchModalReviews();

      // Listen for review updates (e.g., deletion from Admin Dashboard)
      window.addEventListener('reviews_updated', fetchModalReviews);

      // Track product view and stage update
      trackProductView(selectedProduct).catch(err => console.warn(err));
      logVisitorEvent('page_view', `view_${selectedProduct.productCode}`, `প্রোডাক্ট বিস্তারিত দেখছেন: "${selectedProduct.title}" 🔍`, 'product_details');

      return () => {
        window.removeEventListener('reviews_updated', fetchModalReviews);
      };
    } else {
      setReviews([]);
    }
  }, [selectedProduct]);

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !newReviewName.trim() || !newReviewComment.trim()) return;

    setIsSubmittingReview(true);
    try {
      const added = await createReview(
        selectedProduct.id || '',
        newReviewName,
        newReviewRating,
        newReviewComment,
        undefined,
        {
          productName: selectedProduct.title,
          productCode: selectedProduct.productCode,
          location: 'ঢাকা, বাংলাদেশ',
          role: 'Verified Buyer'
        }
      );
      
      setReviews(prev => [added, ...prev]);
      logVisitorEvent('click', 'submit_review', `রিভিউ সাবমিট করেছেন: "★${newReviewRating} - ${newReviewComment.substring(0, 20)}..." ✍️`, 'product_details');
      setNewReviewName('');
      setNewReviewComment('');
      setNewReviewRating(5);
      setReviewSuccessMessage('ধন্যবাদ! আপনার কাস্টমার রিভিউটি সফলভাবে প্রকাশিত হয়েছে। 🎉');
      
      setTimeout(() => setReviewSuccessMessage(''), 4000);
    } catch (err) {
      console.error("Error adding review", err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 5.0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return parseFloat((sum / reviews.length).toFixed(1));
  }, [reviews]);

  const handleOrder = () => {
    if (selectedProduct) {
      onOrderNow(selectedProduct, quantity, selectedSize);
      setSelectedProduct(null);
    }
  };

  const sortedProducts = useMemo(() => {
    let filtered = products
      .filter(p => p && p.isActive !== false)
      .filter(p => {
        if (activeCategory === 'ALL') return true;
        return (p.category || '').toUpperCase() === activeCategory.toUpperCase();
      });
    let result = [...filtered];
    
    if (sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'top-selling') {
      // High pseudo relevance algorithm logic for Top-Selling tag
      const getPseudoSales = (p: Product) => {
        const codeNum = parseInt(p.productCode.replace(/\D/g, '')) || 0;
        const discountVal = p.discount || 0;
        return (codeNum % 31) + (discountVal * 1.5) + (p.title.length * 2);
      };
      result.sort((a, b) => getPseudoSales(b) - getPseudoSales(a));
    }
    return result;
  }, [products, activeCategory, sortBy]);

  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever category or sort filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, sortBy]);

  const totalPages = Math.ceil(sortedProducts.length / PRODUCTS_PER_PAGE) || 1;
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedProducts = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * PRODUCTS_PER_PAGE;
    return sortedProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [sortedProducts, validCurrentPage]);

  // Smart pagination items generator for modern professional display
  const paginationItems = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const items: (number | string)[] = [1];
    if (validCurrentPage > 3) {
      items.push('ellipsis-start');
    }
    const start = Math.max(2, validCurrentPage - 1);
    const end = Math.min(totalPages - 1, validCurrentPage + 1);
    for (let p = start; p <= end; p++) {
      items.push(p);
    }
    if (validCurrentPage < totalPages - 2) {
      items.push('ellipsis-end');
    }
    items.push(totalPages);
    return items;
  }, [totalPages, validCurrentPage]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    logVisitorEvent('click', `page_${page}`, `প্রোডাক্ট পেজ পরিবর্তন করেছেন: পেজ ${page} 📄`, 'home');

    // Smooth scroll to top of product showcase section
    const section = document.getElementById('products-showcase-section');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse bg-white rounded-[2rem] h-80 border border-gray-100" />
        ))}
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <section id="products-showcase-section" className="py-12 bg-white/50 scroll-mt-20">
      <div className="max-w-4xl mx-auto px-4 mb-10">
        <div className="flex flex-col items-center text-center space-y-3">
          <h2 className="text-2xl font-serif font-black text-brand-charcoal italic">
            আমাদের <span className="text-brand-gold">এক্সক্লুসিভ</span> কালেকশন
          </h2>
          <div className="w-20 h-1 bg-brand-gold/30 rounded-full" />
        </div>
      </div>

      {/* Active Category Filter Tag (if filtered via 3-dots menu or banner) */}
      {activeCategory !== 'ALL' && (
        <div className="max-w-4xl mx-auto px-4 mb-6 flex items-center justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-900 text-xs font-bold shadow-xs">
            <span>ক্যাটাগরি: <strong>{categories.find(c => c.id === activeCategory)?.name || activeCategory}</strong></span>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('ALL');
                if (onCategoryChange) onCategoryChange('ALL');
              }}
              className="w-4 h-4 rounded-full bg-amber-500/20 hover:bg-amber-500/40 text-amber-950 flex items-center justify-center transition-colors cursor-pointer ml-1"
              title="সব প্রোডাক্ট দেখুন"
            >
              <X size={11} />
            </button>
          </div>
        </div>
      )}

      {/* Product Utility Bar with Professional 3-Dot Sorting Dropdown placed where product count was */}
      <div className="max-w-6xl mx-auto px-2 md:px-4 mb-6">
        <div className="flex items-center justify-start">
          
          {/* Three Dot Sorting Trigger (placed directly where the product count was) */}
          <div className="relative" ref={sortMenuRef}>
            <button
              type="button"
              onClick={() => setIsSortMenuOpen(prev => !prev)}
              aria-label="সর্টিং অপশনসমূহ"
              aria-expanded={isSortMenuOpen}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border transition-all duration-200 cursor-pointer shadow-xs ${
                isSortMenuOpen
                  ? 'bg-brand-charcoal text-white border-brand-charcoal shadow-md ring-2 ring-brand-gold/30'
                  : 'bg-[#fbfbfa] hover:bg-white text-gray-800 border-gray-200 hover:border-brand-gold/50'
              }`}
            >
              {/* 3-Dot (Three Dots) Button Icon */}
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
                isSortMenuOpen ? 'bg-white/20 text-brand-gold' : 'bg-white text-gray-700 border border-gray-200/80 shadow-xs'
              }`}>
                <MoreVertical size={16} />
              </div>

              {/* Selected Sort Option Label */}
              <div className="flex items-center gap-1.5 text-xs font-bold tracking-wide pr-1">
                <span className="text-gray-400 font-medium">সর্ট:</span>
                <span className="font-black text-brand-charcoal group-hover:text-black">
                  {sortBy === 'default' && 'সবগুলো'}
                  {sortBy === 'price-asc' && 'কম দাম থেকে বেশি'}
                  {sortBy === 'price-desc' && 'বেশি দাম থেকে কম'}
                  {sortBy === 'top-selling' && 'টপ সেলিং 🔥'}
                </span>
              </div>
            </button>

            {/* Three Dot Sorting Dropdown Menu */}
            <AnimatePresence>
              {isSortMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.95 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className="absolute left-0 top-full mt-2 w-64 bg-white/98 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl shadow-black/15 p-2 z-40 text-gray-800 ring-1 ring-black/5"
                >
                  <div className="px-3 py-2 mb-1 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-[10.5px] font-black uppercase tracking-wider text-gray-400">
                      সর্টিং নির্বাচন করুন
                    </span>
                    <SlidersHorizontal size={12} className="text-brand-gold" />
                  </div>

                  <div className="space-y-1">
                    {/* 1. সবগুলো (All) */}
                    <button
                      type="button"
                      onClick={() => {
                        setSortBy('default');
                        setIsSortMenuOpen(false);
                        logVisitorEvent('click', 'sort_default', 'প্রোডাক্ট সর্টিং করেছেন: "সবগুলো" 📊', 'home');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        sortBy === 'default'
                          ? 'bg-brand-charcoal text-white shadow-sm'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-brand-charcoal'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                          sortBy === 'default' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <Sparkles size={13} />
                        </div>
                        <span>সবগুলো (ডিফল্ট)</span>
                      </div>
                      {sortBy === 'default' && <Check size={14} strokeWidth={3} className="text-brand-gold" />}
                    </button>

                    {/* 2. কম দাম থেকে বেশি (Price: Low to High) */}
                    <button
                      type="button"
                      onClick={() => {
                        setSortBy('price-asc');
                        setIsSortMenuOpen(false);
                        logVisitorEvent('click', 'sort_price_asc', 'প্রোডাক্ট সর্টিং করেছেন: "কম দাম থেকে বেশি" 📊', 'home');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        sortBy === 'price-asc'
                          ? 'bg-brand-charcoal text-white shadow-sm'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-brand-charcoal'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                          sortBy === 'price-asc' ? 'bg-white/20 text-white' : 'bg-gray-100 text-amber-600'
                        }`}>
                          <ArrowUp size={13} />
                        </div>
                        <span>কম দাম থেকে বেশি</span>
                      </div>
                      {sortBy === 'price-asc' && <Check size={14} strokeWidth={3} className="text-brand-gold" />}
                    </button>

                    {/* 3. বেশি দাম থেকে কম (Price: High to Low) */}
                    <button
                      type="button"
                      onClick={() => {
                        setSortBy('price-desc');
                        setIsSortMenuOpen(false);
                        logVisitorEvent('click', 'sort_price_desc', 'প্রোডাক্ট সর্টিং করেছেন: "বেশি দাম থেকে কম" 📊', 'home');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        sortBy === 'price-desc'
                          ? 'bg-brand-charcoal text-white shadow-sm'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-brand-charcoal'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                          sortBy === 'price-desc' ? 'bg-white/20 text-white' : 'bg-gray-100 text-amber-600'
                        }`}>
                          <ArrowDown size={13} />
                        </div>
                        <span>বেশি দাম থেকে কম</span>
                      </div>
                      {sortBy === 'price-desc' && <Check size={14} strokeWidth={3} className="text-brand-gold" />}
                    </button>

                    {/* 4. টপ সেলিং (Top Selling) */}
                    <button
                      type="button"
                      onClick={() => {
                        setSortBy('top-selling');
                        setIsSortMenuOpen(false);
                        logVisitorEvent('click', 'sort_top_selling', 'প্রোডাক্ট সর্টিং করেছেন: "টপ সেলিং" 📊', 'home');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        sortBy === 'top-selling'
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-sm font-black'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-brand-charcoal'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                          sortBy === 'top-selling' ? 'bg-black/20 text-slate-950' : 'bg-orange-50 text-orange-600'
                        }`}>
                          <Flame size={13} fill="currentColor" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span>টপ সেলিং</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                            sortBy === 'top-selling' ? 'bg-slate-950/20 text-slate-950' : 'bg-orange-100 text-orange-700'
                          }`}>
                            HOT
                          </span>
                        </div>
                      </div>
                      {sortBy === 'top-selling' && <Check size={14} strokeWidth={3} className="text-slate-950" />}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>



      <div className="max-w-6xl mx-auto px-2 md:px-4 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8">
        {paginatedProducts
          .map((product, index) => {
          const discount = product.discount || 0;
          const originalPrice = product.price + discount;
          
          return (
            <motion.div 
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              className="group bg-white rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-500 border border-gray-100 flex flex-col"
            >
              {/* Image Container */}
              <div 
                className="relative aspect-[4/5] overflow-hidden cursor-pointer"
                onClick={() => handleOpenProductModal(product)}
              >
                <img 
                  src={product.imageUrl} 
                  alt={product.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                
                {/* Product Tags Badges */}
                <div className="absolute top-2 left-2 md:top-4 md:left-4 flex flex-col gap-1.5">
                   <div className="bg-brand-charcoal/80 backdrop-blur-md text-white text-[7px] md:text-[9px] font-black uppercase tracking-widest px-2 py-1 md:px-3 md:py-1.5 rounded-full inline-flex items-center gap-1 md:gap-2 shadow">
                     <Hash size={8} className="text-brand-gold" />
                     {product.productCode}
                   </div>
                   
                   {product.videoUrl && (
                     <span className="bg-purple-600/90 backdrop-blur-md text-white text-[7px] md:text-[8.5px] font-black uppercase tracking-widest px-2 py-1 rounded-full inline-flex items-center gap-1 shadow-md border border-purple-300/30">
                       <Video size={9} className="text-yellow-300 animate-pulse" />
                       <span>🎬 ভিডিও আছে</span>
                     </span>
                   )}

                   {/* Top Selling Badge option indicators */}
                   {(sortBy === 'top-selling' || discount > 150) && (
                     <span className="bg-[#ffc300] backdrop-blur-md text-[#10121d] text-[6px] md:text-[8.5px] font-bold uppercase tracking-widest px-2 py-1 rounded-full inline-flex items-center gap-0.5 shadow-md">
                       <Flame size={8} fill="currentColor" className="text-red-650 shrink-0" />
                       Hanger Hot
                     </span>
                   )}
                </div>
              </div>
 
              {/* Content Container */}
              <div className="p-3 md:p-6 flex-1 flex flex-col text-center space-y-2 md:space-y-4">
                <div className="space-y-0.5 md:space-y-1">
                  {product.brand && (
                    <p className="text-[8px] md:text-[9px] font-black text-brand-gold uppercase tracking-[0.15em] md:tracking-[0.2em]">{product.brand}</p>
                  )}
                  <h3 className="text-xs md:text-lg font-bold text-gray-800 leading-tight line-clamp-2 md:line-clamp-1 min-h-[2rem] md:min-h-auto flex items-center justify-center">
                    {product.title}
                  </h3>
                </div>
                
                <div className="flex items-center justify-center gap-1.5 md:gap-3">
                  <span className="text-sm md:text-xl font-black text-[#1a1c2e] tabular-nums">৳{product.price.toLocaleString()}</span>
                  {discount > 0 && (
                    <span className="text-[10px] md:text-sm text-gray-400 line-through font-medium">৳{originalPrice.toLocaleString()}</span>
                  )}
                </div>

                {/* Customer Purchase Count Social Proof & Live Viewer Urgency */}
                <div className="flex flex-col gap-1 items-center">
                  <div className="inline-flex items-center justify-center gap-1.5 bg-emerald-50/70 border border-emerald-100 px-3 py-1 rounded-2xl text-[9.5px] md:text-[11px] text-emerald-800 font-bold tracking-normal select-none shadow-sm mx-auto w-fit">
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span><b className="font-extrabold text-emerald-600">{getProductSalesCount(product.productCode, orders, product.initialSalesCount)} জন</b> ইতিমধ্যে কিনেছেন</span>
                  </div>

                  <div className="inline-flex items-center gap-2 text-[9px] md:text-[10px] font-bold text-slate-500 bg-amber-50/50 border border-amber-200/50 px-2.5 py-0.5 rounded-xl">
                    <span className="flex items-center gap-1 text-rose-600 font-extrabold">
                      <Eye size={10} className="animate-pulse" />
                      {((index * 3) % 4) + 3} জন লাইভ দেখছেন
                    </span>
                    <span>•</span>
                    <span className="text-amber-800 font-extrabold">
                      ⚡ স্টক বাকি {product.stock > 0 ? product.stock : ((index % 3) + 2)}টি
                    </span>
                  </div>
                </div>

                <div className="pt-1 md:pt-2 flex items-center gap-1.5 md:gap-2">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOrderNow(product, 1, '38');
                    }}
                    className="flex-1 py-2.5 md:py-3.5 bg-[#438a1a] text-white rounded-lg md:rounded-xl text-[9px] md:text-xs font-black uppercase tracking-wider transition-all hover:bg-[#346b14] active:scale-95 shadow-md flex items-center justify-center gap-1 md:gap-1.5"
                    title="সরাসরি অর্ডার পেজে যান"
                  >
                    <ShoppingCart size={12} className="md:w-3.5 md:h-3.5" />
                    এখনই অর্ডার করুন
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenProductModal(product);
                    }}
                    className="px-2.5 md:px-3 py-2.5 md:py-3.5 bg-brand-charcoal text-white hover:bg-black rounded-lg md:rounded-xl text-[9px] md:text-xs font-bold transition-all active:scale-95 shadow-md flex items-center justify-center gap-1 shrink-0"
                    title="বিস্তারিত ও সাইজ দেখুন"
                  >
                    <Eye size={12} className="md:w-3.5 md:h-3.5" />
                    <span className="hidden sm:inline">বিস্তারিত</span>
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Single Unified Modern Luxury Pagination Bar */}
      {totalPages > 1 && (
        <div className="max-w-xl mx-auto mt-10 px-4 flex justify-center">
          <div className="bg-white/95 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl border border-amber-500/20 shadow-xl shadow-slate-900/5 flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
            {/* Previous Page Button */}
            <button
              type="button"
              onClick={() => handlePageChange(validCurrentPage - 1)}
              disabled={validCurrentPage <= 1}
              className="h-10 px-3.5 rounded-xl sm:rounded-2xl border border-gray-200 text-xs font-black text-gray-700 bg-white hover:bg-amber-50 hover:border-amber-300 disabled:opacity-25 disabled:pointer-events-none flex items-center gap-1.5 transition-all cursor-pointer shadow-xs select-none"
              title="পূর্ববর্তী পেজ"
            >
              <ChevronLeft size={16} />
              <span className="hidden xs:inline">পূর্ববর্তী</span>
            </button>

            {/* Number Buttons */}
            {paginationItems.map((item, idx) => {
              if (typeof item === 'string') {
                return (
                  <span
                    key={item + idx}
                    className="w-7 h-10 flex items-center justify-center text-gray-400 font-black text-xs tracking-widest select-none"
                  >
                    •••
                  </span>
                );
              }

              const isActive = item === validCurrentPage;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => handlePageChange(item)}
                  className={`min-w-[2.4rem] sm:min-w-[2.6rem] h-10 px-2.5 sm:px-3 rounded-xl sm:rounded-2xl text-xs font-black transition-all cursor-pointer select-none flex items-center justify-center ${
                    isActive
                      ? 'bg-gradient-to-br from-slate-950 via-zinc-900 to-slate-950 text-brand-gold border-2 border-brand-gold/60 shadow-md shadow-black/25 scale-105 ring-2 ring-brand-gold/20'
                      : 'bg-white text-gray-700 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-300 border border-gray-200 shadow-xs'
                  }`}
                >
                  {toBengaliNumber(item)}
                </button>
              );
            })}

            {/* Next Page Button */}
            <button
              type="button"
              onClick={() => handlePageChange(validCurrentPage + 1)}
              disabled={validCurrentPage >= totalPages}
              className={`h-10 px-4 rounded-xl sm:rounded-2xl text-xs font-black transition-all cursor-pointer select-none flex items-center gap-1.5 shadow-md ${
                validCurrentPage < totalPages
                  ? 'bg-gradient-to-r from-brand-charcoal via-zinc-900 to-black text-white hover:text-brand-gold hover:border-brand-gold/50 border border-gray-800 active:scale-95'
                  : 'bg-gray-100 text-gray-400 opacity-25 pointer-events-none border border-gray-200'
              }`}
              title="পরবর্তী পেজ"
            >
              <span>পরবর্তী</span>
              <ChevronRight size={16} className={validCurrentPage < totalPages ? 'text-brand-gold' : ''} />
            </button>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedProduct && (
            <div className="fixed inset-0 z-[99998] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedProduct(null)}
                className="fixed inset-0 bg-slate-950/98 backdrop-blur-2xl"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl relative z-10 overflow-hidden flex flex-col md:flex-row max-h-[92vh]"
              >
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-3 right-3 p-2 bg-gray-100 hover:bg-rose-600 hover:text-white text-gray-700 rounded-full transition-all z-30 shadow-md"
                  aria-label="Close Product Details"
                >
                  <X size={18} />
                </button>

              {/* Left: Image, Video & Thumbnails */}
              <div className="w-full md:w-[45%] flex flex-col p-4 md:p-6 bg-white overflow-y-auto">
                {selectedProduct.videoUrl && (
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setActiveMediaTab('photo')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        activeMediaTab === 'photo'
                          ? 'bg-[#1C1917] text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span>📷 ফটো (Photo)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMediaTab('video')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        activeMediaTab === 'video'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                      }`}
                    >
                      <Video size={14} className="text-yellow-300" />
                      <span>🎬 ভিডিও (Video)</span>
                    </button>
                  </div>
                )}

                {activeMediaTab === 'video' && selectedProduct.videoUrl ? (
                  <div className="relative aspect-[4/5] rounded-xl overflow-hidden border border-purple-200 bg-black shadow-lg">
                    <video
                      src={selectedProduct.videoUrl}
                      controls
                      autoPlay
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div 
                    className="relative aspect-[4/5] rounded-xl overflow-hidden border border-gray-150 cursor-zoom-in group shadow-md"
                    onMouseEnter={() => setIsZoomed(true)}
                    onMouseLeave={() => {
                      setIsZoomed(false);
                      setZoomPos({ x: 50, y: 50 });
                    }}
                    onMouseMove={handleZoomMouseMove}
                    onClick={() => {
                      setIsLightboxOpen(true);
                      setLightboxScale(1.8);
                    }}
                  >
                    <img 
                      src={selectedProduct.imageUrl} 
                      alt={selectedProduct.title}
                      className="w-full h-full object-cover transition-transform duration-75 select-none"
                      style={{
                        transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                        transform: isZoomed ? 'scale(2.3)' : 'scale(1)',
                      }}
                      referrerPolicy="no-referrer"
                    />
                    {/* Zoom indicator label overlay */}
                    <div className="absolute bottom-3 left-3 right-3 bg-black/75 backdrop-blur-md text-[9px] md:text-[10px] text-white px-3 py-2 rounded-xl font-bold tracking-normal flex items-center justify-center gap-1.5 pointer-events-none transition-all opacity-95 group-hover:opacity-100 shadow-lg text-center">
                      <ZoomIn size={12} className="text-brand-gold shrink-0 animate-bounce" />
                      <span>জুম করতে কার্সার রাখুন অথবা ক্লিক করে বড় করুন</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2.5 mt-4 overflow-x-auto pb-1">
                  <div 
                    onClick={() => setActiveMediaTab('photo')}
                    className={`w-20 h-20 shrink-0 rounded-xl border-2 p-0.5 cursor-pointer overflow-hidden transition-all ${
                      activeMediaTab === 'photo' ? 'border-[#438a1a] ring-2 ring-emerald-500/20' : 'border-gray-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={selectedProduct.imageUrl} className="w-full h-full object-cover rounded-lg" />
                  </div>

                  {selectedProduct.videoUrl && (
                    <div 
                      onClick={() => setActiveMediaTab('video')}
                      className={`w-20 h-20 shrink-0 rounded-xl border-2 p-0.5 cursor-pointer overflow-hidden relative transition-all bg-black ${
                        activeMediaTab === 'video' ? 'border-purple-600 ring-2 ring-purple-500/20' : 'border-purple-200 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <video src={selectedProduct.videoUrl} className="w-full h-full object-cover opacity-60 rounded-lg" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg">
                          <Play size={14} className="ml-0.5" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Info */}
              <div className="w-full md:w-[55%] p-6 md:p-8 space-y-4 overflow-y-auto bg-white">
                <nav className="text-[10px] md:text-sm text-gray-400 font-medium">
                  Home / {selectedProduct.category} / <span className="text-gray-600 font-bold">{selectedProduct.title}</span>
                </nav>

                <div className="space-y-1">
                  <h2 className="text-xl md:text-3xl font-black text-gray-900 leading-tight">
                    {selectedProduct.title}
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-2xl md:text-4xl font-black text-gray-900">৳{selectedProduct.price}</span>
                  {selectedProduct.discount && selectedProduct.discount > 0 && (
                    <span className="text-sm md:text-lg text-gray-400 line-through font-medium">৳{selectedProduct.price + selectedProduct.discount}</span>
                  )}
                </div>

                <div className="flex items-center gap-4 bg-[#fbfbfa] p-2.5 px-3.5 border border-gray-150 rounded-2xl w-fit">
                   <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        size={13} 
                        fill={i < Math.round(averageRating) ? "#fbbf24" : "none"} 
                        className={i < Math.round(averageRating) ? "text-amber-400" : "text-gray-300"} 
                      />
                    ))}
                  </div>
                  <span className="text-xs font-black text-[#1a1c2e] tracking-tight">{averageRating}/5</span>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">{reviews.length} টি কাস্টমার রিভিউ</span>
                </div>

                <div className="inline-block px-4 py-1.5 bg-[#438a1a] text-white rounded-r-full text-[11px] font-black tracking-tight -ml-8 pl-8 relative shadow-lg">
                  প্রোডাক্ট কোড : {selectedProduct.productCode}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/20" />
                </div>

                <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-2">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                     <span className="bg-[#ee1d24] text-white px-2 py-0.5 rounded text-[10px] uppercase">Note :</span> 
                     পণ্যর বিবরণ (Product Details)
                   </p>
                   <div className="text-sm font-semibold text-gray-750 leading-relaxed whitespace-pre-wrap break-words tracking-wide">
                     {selectedProduct.description || 'Sera brings you premium quality and exceptional style.'}
                   </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-black text-gray-900 pt-2">
                  <span>Brand :</span>
                  <span className="text-gray-500 uppercase tracking-widest">{selectedProduct.brand || 'Sera'}</span>
                </div>



                <div className="flex flex-col gap-4 pt-4">
                  {/* Quantity */}
                  <div className="flex items-center gap-4">
                    <div className="inline-flex items-center border-2 border-gray-200 rounded-xl bg-gray-50 p-1">
                      <button 
                        onClick={() => {
                          const newQty = Math.max(1, quantity - 1);
                          setQuantity(newQty);
                          logVisitorEvent('click', 'change_quantity', `প্রোডাক্টের পরিমাণ কমিয়েছেন: ${newQty} টি 🔢`, 'product_details');
                        }}
                        className="w-10 h-10 flex items-center justify-center font-black text-xl text-gray-600 hover:bg-white rounded-lg transition-colors"
                      >
                        -
                      </button>
                      <span className="w-12 text-center font-black text-lg text-gray-900">{quantity}</span>
                      <button 
                        onClick={() => {
                          const newQty = quantity + 1;
                          setQuantity(newQty);
                          logVisitorEvent('click', 'change_quantity', `প্রোডাক্টের পরিমাণ বাড়িয়েছেন: ${newQty} টি 🔢`, 'product_details');
                        }}
                        className="w-10 h-10 flex items-center justify-center font-black text-xl text-gray-600 hover:bg-white rounded-lg transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 pt-2">
                    <button 
                      onClick={() => {
                        onAddToCart?.(selectedProduct, quantity, selectedSize);
                        setSelectedProduct(null);
                      }}
                      className="w-full py-4 bg-[#438a1a] text-white rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-[#346b14] transition-all shadow-lg active:scale-95"
                    >
                      কার্টে যোগ করুন
                    </button>
                    <button 
                      onClick={handleOrder}
                      className="w-full py-4 bg-[#ffc300] text-gray-900 rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-[#e6b000] transition-all shadow-lg active:scale-95"
                    >
                      অর্ডার করুন
                    </button>
                  </div>
                </div>

                {/* Brand New Professional Customer Reviews & Live Form Segment */}
                <div className="border-t border-gray-150 pt-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#161824] flex items-center gap-2">
                      <MessageSquare size={16} className="text-brand-gold" />
                      কাস্টমার রিভিউ ({reviews.length})
                    </h3>
                    <div className="text-xs font-black text-[#438a1a] bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
                      ★ {averageRating} গড় রেটিং
                    </div>
                  </div>

                  {/* Real-time statistics badge */}
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-3xl flex items-center gap-3 shadow-sm select-none">
                    <div className="p-2.5 bg-[#438a1a] text-white rounded-2xl shadow-md">
                      <ShoppingBag size={16} className="animate-bounce" />
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-black tracking-widest text-emerald-600">হট সেলিং প্রোডাক্ট</p>
                      <p className="text-xs font-bold mt-0.5 leading-snug">
                        এই ড্রেসটি ইতিমধ্যে <span className="text-red-500 font-extrabold text-sm">{getProductSalesCount(selectedProduct.productCode, orders, selectedProduct.initialSalesCount)} জন</span> কাস্টমার সফলভাবে ক্রয় করেছেন!
                      </p>
                    </div>
                  </div>

                  {/* Success Alert Banner for Review submission */}
                  <AnimatePresence>
                    {reviewSuccessMessage && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-medium flex items-center gap-2"
                      >
                        <CheckCircle size={16} className="text-[#438a1a] shrink-0 animate-bounce" />
                        <span>{reviewSuccessMessage}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Write a Review Block */}
                  <form onSubmit={handleAddReview} className="bg-[#fbfbfa] p-5 rounded-3xl border border-gray-150 space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-[#1a1c2e]">আপনার মূল্যবান রিভিউ লিখুন</h4>
                      <p className="text-gray-400 text-[10px] font-medium">ড্রেসের মান এবং আমাদের সার্ভিস কেমন লেগেছে তা অন্য কাস্টমারদের জানান</p>
                    </div>

                    <div className="space-y-3">
                      {/* Rating Selection */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-gray-500">আপনার রেটিং:</span>
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map((stars) => (
                            <button
                              key={stars}
                              type="button"
                              onClick={() => setNewReviewRating(stars)}
                              className="p-1 hover:scale-125 transition-transform"
                            >
                              <Star
                                size={18}
                                fill={stars <= newReviewRating ? "#fbbf24" : "none"}
                                className={stars <= newReviewRating ? "text-amber-400" : "text-gray-300"}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Customer Name input */}
                      <input
                        type="text"
                        required
                        value={newReviewName}
                        onChange={(e) => setNewReviewName(e.target.value)}
                        placeholder="আপনার নাম লিখুন (যেমন: তাসনিম রেজা)"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#438a1a] focus:outline-none focus:border-transparent transition-all"
                      />

                      {/* Comment body */}
                      <textarea
                        required
                        rows={3}
                        value={newReviewComment}
                        onChange={(e) => setNewReviewComment(e.target.value)}
                        placeholder="আপনার মতামত বিস্তারিত লিখুন (কাপড়, কালার এবং প্যাকেজিং কেমন লেগেছে?)"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#438a1a] focus:outline-none focus:border-transparent transition-all resize-none"
                      />

                      <button
                        type="submit"
                        disabled={isSubmittingReview}
                        className="w-full py-3 bg-brand-charcoal text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50 font-black"
                      >
                        {isSubmittingReview ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Send size={11} />
                        )}
                        রিভিউ সাবমিট করুন
                      </button>
                    </div>
                  </form>

                  {/* Review list */}
                  <div className="space-y-3 max-h-80 overflow-y-auto no-scrollbar pr-1">
                    {reviewsLoading ? (
                      <div className="flex items-center justify-center py-8 gap-2 text-gray-400 text-xs font-bold">
                        <Loader2 size={14} className="animate-spin text-brand-gold" />
                        রিভিউ লোড হচ্ছে...
                      </div>
                    ) : reviews.length === 0 ? (
                      <div className="text-center py-6 text-xs font-medium text-gray-400">
                        এখনো কোনো কাস্টমার রিভিউ দেয়া হয়নি। প্রথম রিভিউটি আপনি দিন!
                      </div>
                    ) : (
                      reviews.map((rev) => (
                        <div 
                          key={rev.id || Math.random().toString()} 
                          className="p-4 bg-white border border-gray-100 rounded-2xl space-y-2 shadow-sm transition-all hover:border-gray-200"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-brand-gold/10 text-brand-gold flex items-center justify-center text-[10px] font-black uppercase">
                                {rev.customerName ? rev.customerName.charAt(0).toUpperCase() : 'C'}
                              </div>
                              <div>
                                <h5 className="text-[11.5px] font-black text-gray-800 flex items-center gap-1">
                                  {rev.customerName || 'সম্মানিত কাস্টমার'}
                                  <span className="text-[8px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-1 py-0.2 rounded font-black uppercase tracking-widest leading-none scale-90">Verified Buyer</span>
                                </h5>
                                <span className="text-[9px] text-gray-400 font-medium">
                                  {new Date(rev.createdAt).toLocaleDateString('bn-BD', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  size={10} 
                                  fill={i < rev.rating ? "#fbbf24" : "none"} 
                                  className={i < rev.rating ? "text-amber-400" : "text-gray-200"} 
                                />
                              ))}
                            </div>
                          </div>

                          <p className="text-xs font-medium text-gray-600 leading-relaxed bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                            {rev.comment}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}

      {/* Lightbox full-screen zoom explorer */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isLightboxOpen && selectedProduct && (
            <div className="fixed inset-0 z-[999999] flex flex-col items-center justify-between bg-slate-950 p-2 sm:p-4 select-none overflow-hidden h-screen w-screen inset-x-0 top-0 bottom-0">
              
              {/* Mobile-Optimized Top Controls Bar Card */}
              <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 p-2.5 sm:p-3 rounded-2xl shadow-2xl flex flex-col gap-2 z-[1000000] text-white shrink-0 my-1">
                {/* Row 1: Title + Prominent Red Close Button */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
                      <Sparkles size={11} />
                      এইচডি প্রোডাক্ট প্রিভিউ
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold truncate text-slate-100 max-w-[170px] xs:max-w-[220px] sm:max-w-[320px]">
                      {selectedProduct.title}
                    </span>
                  </div>

                  {/* Big High-Visibility Red Close Button */}
                  <button 
                    onClick={() => {
                      setIsLightboxOpen(false);
                      setLightboxScale(1);
                    }}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-rose-950/50 shrink-0 cursor-pointer"
                    aria-label="Close Preview"
                  >
                    <X size={16} />
                    <span>বন্ধ করুন</span>
                  </button>
                </div>

                {/* Row 2: Touch-Friendly Responsive Zoom Controls */}
                <div className="flex items-center justify-between gap-1.5 bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Zoom Out Button */}
                    <button 
                      onClick={() => setLightboxScale(prev => Math.max(1, prev - 0.5))}
                      className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white rounded-xl transition-all flex items-center gap-1 text-[11px] sm:text-xs font-extrabold cursor-pointer border border-slate-700 shadow-sm"
                      title="Zoom Out"
                    >
                      <ZoomOut size={14} className="text-amber-400" />
                      <span>জুম কমান</span>
                    </button>

                    {/* Scale Badge */}
                    <div className="bg-amber-400 text-slate-950 font-black text-xs px-2.5 py-1.5 rounded-xl shadow-md select-none min-w-[40px] text-center">
                      {lightboxScale.toFixed(1)}x
                    </div>

                    {/* Zoom In Button */}
                    <button 
                      onClick={() => setLightboxScale(prev => Math.min(4, prev + 0.5))}
                      className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl transition-all flex items-center gap-1 text-[11px] sm:text-xs font-extrabold cursor-pointer shadow-md shadow-emerald-950/40"
                      title="Zoom In"
                    >
                      <ZoomIn size={14} />
                      <span>জুম বাড়ান</span>
                    </button>
                  </div>

                  {/* Reset Zoom Button */}
                  {lightboxScale > 1 && (
                    <button
                      onClick={() => setLightboxScale(1)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] sm:text-[11px] font-bold rounded-xl transition-all border border-slate-700 cursor-pointer shrink-0"
                    >
                      ১.০x রিসেট
                    </button>
                  )}
                </div>
              </div>

              {/* Main Interactive Zoom Canvas Area */}
              <div className="relative w-full max-w-xl flex-1 overflow-hidden rounded-2xl border border-slate-800 shadow-2xl flex items-center justify-center bg-slate-900/60 my-2">
                <motion.img 
                  src={selectedProduct.imageUrl} 
                  alt={selectedProduct.title}
                  key={lightboxScale}
                  initial={{ scale: 0.95 }}
                  animate={{ scale: lightboxScale }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="max-h-[60vh] sm:max-h-[68vh] object-contain cursor-grab active:cursor-grabbing selection:bg-transparent"
                  style={{
                    touchAction: "none"
                  }}
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Bottom Help Tag */}
              <div className="text-center text-slate-400 max-w-sm px-4 pb-1 z-[1000000] shrink-0">
                <div className="inline-flex items-center gap-1.5 bg-slate-900/95 border border-slate-800 px-3 py-1 rounded-full text-[10px] font-bold text-slate-300 shadow-md">
                  <Info size={12} className="text-amber-400 shrink-0" />
                  <span>ড্রেসের কালার ও সুতার কাজ নিখুঁত দেখতে বাটন দিয়ে জুম করুন</span>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </section>
  );
}
