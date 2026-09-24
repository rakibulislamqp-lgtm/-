import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Star, Quote, Heart, ShoppingBag } from 'lucide-react';
import { getAllReviews, BANGLA_SEED_COMMENTS, ProductReview } from '../services/reviewService';

export default function ReviewSection() {
  const [liveReviews, setLiveReviews] = useState<ProductReview[]>([]);

  const fetchReviews = async () => {
    try {
      const customReviews = await getAllReviews();
      const deletedIds = new Set<string>(JSON.parse(localStorage.getItem('deleted_review_ids') || '[]'));
      
      // Combine custom reviews (customer & admin created) with seed comments
      // Ensure custom real reviews appear first and filter out deleted ones
      const existingIds = new Set(customReviews.map(r => r.id));
      const seedsToAppend = BANGLA_SEED_COMMENTS.filter(s => s.id && !existingIds.has(s.id) && !deletedIds.has(s.id));
      
      const combined = [...customReviews, ...seedsToAppend].filter(r => r.id && !deletedIds.has(r.id));
      setLiveReviews(combined);
    } catch (err) {
      console.warn("Error fetching live reviews for home page:", err);
      const deletedIds = new Set<string>(JSON.parse(localStorage.getItem('deleted_review_ids') || '[]'));
      setLiveReviews(BANGLA_SEED_COMMENTS.filter(s => s.id && !deletedIds.has(s.id)));
    }
  };

  useEffect(() => {
    fetchReviews();

    const handleUpdate = () => {
      fetchReviews();
    };

    window.addEventListener('reviews_updated', handleUpdate);
    return () => window.removeEventListener('reviews_updated', handleUpdate);
  }, []);

  const displayList = liveReviews.length > 0 ? liveReviews : BANGLA_SEED_COMMENTS;
  // Duplicate for smooth seamless loop
  const doubledReviews = [...displayList, ...displayList];

  return (
    <section className="py-12 bg-brand-cream/50 overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 mb-8">
        <div className="text-center space-y-2">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="flex justify-center gap-1 text-brand-gold"
          >
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={16} fill="currentColor" />
            ))}
          </motion.div>
          <h2 className="text-lg font-serif font-black text-gray-900 tracking-tight">
            কাস্টমারদের ভালোবাসা ও <span className="text-brand-gold italic">রিভিউ</span>
          </h2>
          <p className="text-[8px] font-medium text-gray-500 uppercase tracking-[0.2em] font-serif">
            Trusted by 5,000+ Happy Customers
          </p>
        </div>
      </div>

      <div className="relative flex overflow-hidden">
        <motion.div 
          className="flex gap-3 px-4"
          animate={{
            x: [0, - (doubledReviews.length * 115)], 
          }}
          transition={{
            duration: Math.max(30, doubledReviews.length * 4), 
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {doubledReviews.map((review, idx) => {
            const avatarUrl = review.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.customerName)}&background=f43f5e&color=fff&bold=true`;
            
            return (
              <div 
                key={`${review.id || idx}-${idx}`}
                className="flex-shrink-0 w-[220px] bg-white rounded-2xl p-4 shadow-sm border border-brand-gold/10 relative group hover:border-brand-gold/30 transition-all flex flex-col justify-between"
              >
                <div className="absolute top-3 right-4 text-brand-gold/10 group-hover:text-brand-gold/20 transition-colors">
                  <Quote size={18} />
                </div>
                
                <div>
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-brand-gold/20 p-0.5 shrink-0 bg-rose-50">
                      <img 
                        src={avatarUrl} 
                        alt={review.customerName} 
                        className="w-full h-full object-cover rounded-full" 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          // Fallback to initial avatar if image link fails
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(review.customerName)}&background=f43f5e&color=fff&bold=true`;
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-extrabold text-gray-900 text-[11.5px] leading-tight truncate">{review.customerName}</h4>
                      <p className="text-[8.5px] text-gray-400 font-semibold truncate">
                        {review.location || 'ঢাকা, বাংলাদেশ'}
                      </p>
                    </div>
                  </div>

                  <p className="text-gray-700 leading-relaxed text-[10.5px] font-medium italic mb-2.5 line-clamp-3">
                    "{review.comment}"
                  </p>

                  {review.productName && (
                    <div className="inline-flex items-center gap-1 bg-rose-50/80 text-rose-700 text-[8.5px] font-bold px-2 py-0.5 rounded-full mb-2 truncate max-w-full">
                      <ShoppingBag size={9} className="shrink-0" />
                      <span className="truncate">{review.productName}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1">
                    <Heart size={8} className="text-brand-gold fill-brand-gold" />
                    <span className="text-[7px] font-black uppercase tracking-wider text-brand-gold">
                      {review.role || 'Verified Buyer'}
                    </span>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        size={8} 
                        className={i < review.rating ? "text-brand-gold fill-brand-gold" : "text-gray-200"} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
