import { motion } from 'motion/react';
import {
  Heart, CheckCircle2, ShoppingCart,
  Package, Tag, Gift, XCircle
} from 'lucide-react';
import { Order } from '../types';

interface SuccessViewProps {
  order: Order;
}

export default function SuccessView({ order }: SuccessViewProps) {
  const isCancelled = order.status === 'Cancelled';

  // Price calculations
  const subtotal = order.items && order.items.length > 0
    ? order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    : (order.quantity * order.price);

  const discountVal = order.discountAmount || 0;
  const deliveryCharge = order.deliveryCharge || 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-3 sm:p-4 bg-brand-cream py-10 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full space-y-6"
      >
        {/* Success / Cancelled Header Card */}
        <div className="premium-card p-5 sm:p-8 rounded-3xl text-center space-y-5 relative overflow-hidden shadow-2xl bg-white border border-stone-200">
          <div className={`absolute top-0 left-0 w-full h-2 ${isCancelled ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-500 via-rose-500 to-emerald-500'}`} />
          
          {isCancelled ? (
            <>
              <div className="inline-flex items-center justify-center w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-rose-100 text-rose-600 mb-1 shadow-inner ring-4 ring-rose-50">
                <XCircle size={44} />
              </div>
              
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-serif font-black text-rose-700">অর্ডারটি বাতিল করা হয়েছে</h2>
                <p className="text-xs sm:text-sm text-gray-500">আপনার অনুরোধ অনুযায়ী অর্ডারটি সফলভাবে বাতিল তালিকাভুক্ত করা হয়েছে</p>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                  <span className="inline-block px-3.5 py-1.5 bg-rose-50 text-rose-950 rounded-xl font-mono text-sm font-black border border-rose-300">
                    অর্ডার আইডি: #{order.orderId}
                  </span>
                  <span className="inline-block px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-black">
                    স্ট্যাটাস: বাতিল (Cancelled)
                  </span>
                </div>
              </div>

              {/* Cancellation Reason Box */}
              <div className="bg-rose-50/90 p-3.5 rounded-2xl border border-rose-200 text-left space-y-1 text-xs text-rose-900">
                <p><strong className="text-rose-950">বাতিলের কারণ:</strong> {order.cancelReason || 'কাস্টমার নিজে অর্ডার বাতিল করেছেন'}</p>
                {order.cancelledAt && (
                  <p className="text-[10.5px] text-rose-600">
                    <strong>বাতিলের সময়:</strong> {new Date(order.cancelledAt).toLocaleString('en-GB')}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-emerald-100 text-emerald-600 mb-1 shadow-inner ring-4 ring-emerald-50">
                <CheckCircle2 size={44} />
              </div>
              
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-serif font-black text-slate-900">অর্ডার সফলভাবে গ্রহণ করা হয়েছে!</h2>
                <p className="text-xs sm:text-sm text-gray-500">আপনার পার্সেলটি দ্রুত ডেলিভারির জন্য প্রস্তুত করা হচ্ছে</p>
                <div className="pt-2">
                  <span className="inline-block px-3.5 py-1.5 bg-amber-100 text-amber-950 rounded-xl font-mono text-sm font-black border border-amber-300">
                    অর্ডার আইডি: #{order.orderId}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* 1. ORDER DETAILS & ALL DOCUMENTS (PRODUCT, DISCOUNT, COUPON, DELIVERY CHARGE, TOTAL) */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200 text-left space-y-3">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Package size={16} className={isCancelled ? 'text-rose-600' : 'text-amber-600'} />
                অর্ডারকৃত পণ্যের বিবরণ (Order Details)
              </h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isCancelled ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {isCancelled ? 'অর্ডার বাতিল' : 'অর্ডার কনফার্মড'}
              </span>
            </div>

            {/* Products List */}
            <div className="space-y-2">
              {order.items && order.items.length > 0 ? (
                order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-200">
                    <img
                      src={item.productImage}
                      alt={item.productTitle}
                      className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                    />
                    <div className="flex-1 min-w-0 text-xs">
                      <h6 className="font-bold text-slate-900 truncate">{item.productTitle}</h6>
                      <p className="text-[10px] text-gray-500 font-medium">
                        কোড: {item.productCode} • সাইজ: <strong className="text-amber-700">{item.size}</strong>{item.color ? <> • কালার: <strong className="text-emerald-700">{item.color}</strong></> : ''}
                      </p>
                    </div>
                    <div className="text-right text-xs shrink-0">
                      <p className="font-bold text-slate-900">৳{item.price} × {item.quantity}</p>
                      <p className="font-black text-amber-800">৳{item.price * item.quantity}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-200">
                  {order.productImage && (
                    <img
                      src={order.productImage}
                      alt="Product"
                      className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                    />
                  )}
                  <div className="flex-1 min-w-0 text-xs">
                    <h6 className="font-bold text-slate-900">{order.category || 'SERA FASHION ড্রেস'}</h6>
                    <p className="text-[10px] text-gray-500 font-medium">
                      কোড: {order.productCode} • সাইজ: {(order as any).size || '38'}{(order as any).color ? ` • কালার: ${(order as any).color}` : ''} • পরিমাণ: {order.quantity}
                    </p>
                  </div>
                  <div className="text-right text-xs shrink-0">
                    <p className="font-bold text-slate-900">৳{order.price}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Complete Price Breakdown Document */}
            <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-1.5 text-xs text-gray-700">
              <div className="flex justify-between items-center">
                <span>পণ্যের মূল দাম (Subtotal):</span>
                <span className="font-mono font-bold text-slate-900">৳{subtotal}</span>
              </div>

              {discountVal > 0 && (
                <div className="flex justify-between items-center text-emerald-700 font-medium">
                  <span className="flex items-center gap-1">
                    <Tag size={12} />
                    ডিসকাউন্ট ছাড়:
                  </span>
                  <span className="font-mono font-bold text-emerald-700">-৳{discountVal}</span>
                </div>
              )}

              {order.discount > 0 && (
                <div className="flex justify-between items-center text-indigo-700 font-medium">
                  <span className="flex items-center gap-1">
                    <Gift size={12} />
                    কুপন বিজয়ী ছাড়:
                  </span>
                  <span className="font-mono font-bold text-indigo-700">
                    {order.discount === 100 || order.discount === 200 ? `৳${order.discount}` : `${order.discount}%`}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span>ডেলিভারি চার্জ ({order.deliveryArea}):</span>
                <span className="font-mono font-bold text-slate-900">+৳{deliveryCharge}</span>
              </div>

              <div className="border-t border-dashed border-gray-200 pt-1.5 mt-1 flex justify-between items-center font-bold text-sm text-slate-900">
                <span>সর্বমোট প্রদেয় মূল্য:</span>
                <span className="font-mono text-base font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ৳{order.totalAmount}
                </span>
              </div>
            </div>

            {/* Customer Details Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-xs text-gray-700 pt-1 border-t border-gray-200 break-words">
              <p><strong className="text-gray-900">গ্রাহক:</strong> {order.customerName}</p>
              <p><strong className="text-gray-900">মোবাইল:</strong> {order.mobileNumber}</p>
              <p className="sm:col-span-2"><strong className="text-gray-900">ঠিকানা:</strong> {order.address}, {order.upazila ? `${order.upazila}, ` : ''}{order.district}</p>
            </div>
          </div>

          {/* New Order Button */}
          <div className="flex flex-col gap-2.5 pt-2">
            <button 
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 w-full py-3 bg-white border-2 border-amber-300 text-amber-900 rounded-xl font-bold hover:bg-amber-50 transition-all active:scale-95 text-xs sm:text-sm cursor-pointer"
            >
              <ShoppingCart size={18} />
              নতুন আরও অর্ডার করুন
            </button>
          </div>

          <div className="flex items-center justify-center gap-1 text-xs text-amber-800 font-serif pt-1">
            <span>Crafted with</span>
            <Heart size={12} fill="currentColor" className="text-rose-500" />
            <span>by SERA FASHION</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
