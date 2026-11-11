import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, CheckCircle2, ShoppingCart, Download, Printer, Loader2, 
  Package, Tag, Gift, Users, Copy, Check, MessageCircle, Sparkles,
  AlertTriangle, XCircle, X, Clock
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { toPng } from 'html-to-image';
import { DigitalInvoice } from './DigitalInvoice';
import { Order } from '../types';
import { generateReferralCodeForPhone } from '../services/loyaltyService';
import { cancelCustomerOrder } from '../services/orderService';

interface SuccessViewProps {
  order: Order;
}

export default function SuccessView({ order }: SuccessViewProps) {
  const [currentOrder, setCurrentOrder] = useState<Order>(order);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReasonOption, setCancelReasonOption] = useState('ভুল পণ্য বা সাইজ নির্বাচন করেছি');
  const [customReasonText, setCustomReasonText] = useState('');
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  const handleConfirmCancel = async () => {
    setCancelling(true);
    const finalReason = cancelReasonOption === 'অন্যান্য' 
      ? (customReasonText.trim() || 'অন্যান্য কারণ') 
      : cancelReasonOption;
    const targetId = currentOrder.orderId || currentOrder.id!;
    const res = await cancelCustomerOrder(targetId, finalReason);
    setCancelling(false);
    if (res.success) {
      setCurrentOrder(prev => ({
        ...prev,
        status: 'Cancelled',
        cancelledBy: 'customer',
        cancelReason: finalReason,
        cancelledAt: new Date().toISOString()
      }));
      setShowCancelModal(false);
    }
  };

  const isCancelled = currentOrder.status === 'Cancelled';
  const myReferralCode = generateReferralCodeForPhone(currentOrder.mobileNumber || '');
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://serafashion.com';
  const referralLink = `${baseUrl}?ref=${myReferralCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = `আসসালামু আলাইকুম! সেরা ফ্যাশন (SERA FASHION) থেকে আমি দারুণ শাড়ি ও থ্রি-পিস অর্ডার করেছি। আমার এই রেফারেল লিংক থেকে অর্ডার করলে তুমি পাবে সাথে সাথে ৳৫০ ছাড়! 🛍️\n\nঅর্ডার লিংক: ${referralLink}\nঅথবা চেকআউটে কোড দাও: ${myReferralCode}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Original Print Functionality
  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: `SERA-FASHION-INVOICE-${currentOrder.orderId}`,
  });

  // Real Download Functionality using html-to-image to Phone Gallery
  const handleDownload = async () => {
    if (!invoiceRef.current) return;
    
    setDownloading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const dataUrl = await toPng(invoiceRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      
      const link = document.createElement('a');
      link.download = `POS_CashMemo_${currentOrder.orderId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
      handlePrint();
    } finally {
      setDownloading(false);
    }
  };

  // Price calculations
  const subtotal = currentOrder.items && currentOrder.items.length > 0 
    ? currentOrder.items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    : (currentOrder.quantity * currentOrder.price);

  const discountVal = currentOrder.discountAmount || 0;
  const deliveryCharge = currentOrder.deliveryCharge || 0;

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
                    অর্ডার আইডি: #{currentOrder.orderId}
                  </span>
                  <span className="inline-block px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-black">
                    স্ট্যাটাস: বাতিল (Cancelled)
                  </span>
                </div>
              </div>

              {/* Cancellation Reason Box */}
              <div className="bg-rose-50/90 p-3.5 rounded-2xl border border-rose-200 text-left space-y-1 text-xs text-rose-900">
                <p><strong className="text-rose-950">বাতিলের কারণ:</strong> {currentOrder.cancelReason || 'কাস্টমার নিজে অর্ডার বাতিল করেছেন'}</p>
                {currentOrder.cancelledAt && (
                  <p className="text-[10.5px] text-rose-600">
                    <strong>বাতিলের সময়:</strong> {new Date(currentOrder.cancelledAt).toLocaleString('en-GB')}
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
                    অর্ডার আইডি: #{currentOrder.orderId}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* 1. ORDER DETAILS & ALL DOCUMENTS (PRODUCT, DISCOUNT, COUPON, DELIVERY CHARGE, POS) */}
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
              {currentOrder.items && currentOrder.items.length > 0 ? (
                currentOrder.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-200">
                    <img
                      src={item.productImage}
                      alt={item.productTitle}
                      className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                    />
                    <div className="flex-1 min-w-0 text-xs">
                      <h6 className="font-bold text-slate-900 truncate">{item.productTitle}</h6>
                      <p className="text-[10px] text-gray-500 font-medium">
                        কোড: {item.productCode} • সাইজ: <strong className="text-amber-700">{item.size}</strong>
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
                  {currentOrder.productImage && (
                    <img
                      src={currentOrder.productImage}
                      alt="Product"
                      className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                    />
                  )}
                  <div className="flex-1 min-w-0 text-xs">
                    <h6 className="font-bold text-slate-900">{currentOrder.category || 'SERA FASHION ড্রেস'}</h6>
                    <p className="text-[10px] text-gray-500 font-medium">
                      কোড: {currentOrder.productCode} • সাইজ: {(currentOrder as any).size || '38'} • পরিমাণ: {currentOrder.quantity}
                    </p>
                  </div>
                  <div className="text-right text-xs shrink-0">
                    <p className="font-bold text-slate-900">৳{currentOrder.price}</p>
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

              {currentOrder.discount > 0 && (
                <div className="flex justify-between items-center text-indigo-700 font-medium">
                  <span className="flex items-center gap-1">
                    <Gift size={12} />
                    কুপন বিজয়ী ছাড়:
                  </span>
                  <span className="font-mono font-bold text-indigo-700">
                    {currentOrder.discount === 100 || currentOrder.discount === 200 ? `৳${currentOrder.discount}` : `${currentOrder.discount}%`}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span>ডেলিভারি চার্জ ({currentOrder.deliveryArea}):</span>
                <span className="font-mono font-bold text-slate-900">+৳{deliveryCharge}</span>
              </div>

              <div className="border-t border-dashed border-gray-200 pt-1.5 mt-1 flex justify-between items-center font-bold text-sm text-slate-900">
                <span>সর্বমোট প্রদেয় মূল্য:</span>
                <span className="font-mono text-base font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ৳{currentOrder.totalAmount}
                </span>
              </div>
            </div>

            {/* Customer Details Summary */}
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-700 pt-1 border-t border-gray-200">
              <p><strong className="text-gray-900">গ্রাহক:</strong> {currentOrder.customerName}</p>
              <p><strong className="text-gray-900">মোবাইল:</strong> {currentOrder.mobileNumber}</p>
              <p className="col-span-2"><strong className="text-gray-900">ঠিকানা:</strong> {currentOrder.address}, {currentOrder.upazila ? `${currentOrder.upazila}, ` : ''}${currentOrder.district}</p>
            </div>
          </div>

          {/* Customer Self-Cancellation Trigger Card (Only when order is active) */}
          {!isCancelled && (
            <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-rose-950">ভুলবশত বা অনিচ্ছাকৃত অর্ডার হয়েছে?</p>
                  <p className="text-[10.5px] text-rose-700">পার্সেল প্রসেসিংয়ের পূর্বে যেকোনো সময় আপনি নিজে অর্ডারটি বাতিল করতে পারবেন।</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
              >
                অর্ডার বাতিল করুন
              </button>
            </div>
          )}

          {/* 🎁 HIGH-CONVERTING REFER & EARN ৳100 BONUS CARD */}
          <div className="bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-amber-500/5 p-4 sm:p-5 rounded-2xl border-2 border-amber-400/50 text-left space-y-3.5 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center shadow-xs">
                  <Gift size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 font-serif">বন্ধুকে রেফার করে আয় করুন ৳১০০ বোনাস!</h4>
                  <p className="text-[10px] text-slate-500 font-medium">বন্ধু পাবে ৳৫০ ছাড়, আর আপনার একাউন্টে জমা হবে ৳১০০ ক্যাশ রিওয়ার্ড!</p>
                </div>
              </div>
              <span className="text-[10px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">
                +৳১০০ বোনাস
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-amber-200/80 flex items-center justify-between gap-2 shadow-2xs">
              <div>
                <span className="text-[9.5px] font-bold text-slate-400 block uppercase">আপনার রেফারেল কোড:</span>
                <span className="text-sm font-mono font-black text-slate-900 tracking-wider">{myReferralCode}</span>
              </div>
              <button
                type="button"
                onClick={copyLink}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                {copiedRef ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                <span>{copiedRef ? 'কপি হয়েছে' : 'লিংক কপি'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={shareWhatsApp}
              className="w-full py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98"
            >
              <MessageCircle size={15} />
              <span>বন্ধুদের হোয়াটসঅ্যাপে রেফার করুন (WhatsApp Share)</span>
            </button>
          </div>

          {/* Download & Print Buttons */}
          <div className="flex flex-col gap-2.5 pt-2">
            <button 
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-950 text-amber-400 rounded-xl font-black hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed text-xs sm:text-sm cursor-pointer border border-amber-500/30"
            >
              {downloading ? (
                <Loader2 className="animate-spin text-amber-400" size={18} />
              ) : (
                <Download size={18} />
              )}
              {downloading ? 'ডাউনলোড হচ্ছে...' : 'ফোনের গ্যালারিতে POS ইনভয়েস ক্যাশমেমো ডাউনলোড'}
            </button>

            <button 
              onClick={() => handlePrint()}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all active:scale-95 text-xs cursor-pointer shadow-2xs"
            >
              <Printer size={16} />
              প্রিন্ট ইনভয়েস ক্যাশমেমো
            </button>

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

        {/* Off-screen Invoice Template for Image Generation / Print */}
        <div className="fixed -left-[2000px] top-0 pointer-events-none overflow-hidden bg-white">
          <div ref={invoiceRef} className="bg-white">
            <DigitalInvoice order={currentOrder} />
          </div>
        </div>

        {/* Customer Self-Cancellation Modal */}
        <AnimatePresence>
          {showCancelModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 relative"
              >
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X size={18} />
                </button>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <XCircle size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">অর্ডার বাতিল নিশ্চিতকরণ</h3>
                    <p className="text-xs text-gray-500">অর্ডার #{currentOrder.orderId}</p>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed">
                  ⚠️ আপনি কি নিশ্চিত যে আপনি এই অর্ডারটি বাতিল করতে চান? বাতিল করার পর সিস্টেম থেকে পার্সেল প্রস্তুতি বন্ধ হয়ে যাবে।
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 block">
                    বাতিল করার কারণ নির্বাচন করুন:
                  </label>
                  <div className="space-y-1.5">
                    {[
                      'ভুল পণ্য বা সাইজ নির্বাচন করেছি',
                      'ভুলবশত ডুপ্লিকেট সেম অর্ডার হয়েছে',
                      'ঠিকানা বা মোবাইল নম্বর পরিবর্তন করতে হবে',
                      'ব্যক্তিগত বা আর্থিক কারণে এখন নিতে পারছি না',
                      'অন্যান্য'
                    ].map((reason) => (
                      <label
                        key={reason}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          cancelReasonOption === reason 
                            ? 'bg-rose-50/80 border-rose-300 text-rose-950 font-bold' 
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="cancelReason"
                          value={reason}
                          checked={cancelReasonOption === reason}
                          onChange={(e) => setCancelReasonOption(e.target.value)}
                          className="accent-rose-600"
                        />
                        <span>{reason}</span>
                      </label>
                    ))}
                  </div>

                  {cancelReasonOption === 'অন্যান্য' && (
                    <textarea
                      value={customReasonText}
                      onChange={(e) => setCustomReasonText(e.target.value)}
                      placeholder="অর্ডার বাতিলে আপনার কারণ বিস্তারিত লিখুন..."
                      rows={2}
                      className="w-full mt-2 p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs outline-none focus:border-rose-500 focus:bg-white transition-all"
                    />
                  )}
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(false)}
                    disabled={cancelling}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    ফিরে যান
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCancel}
                    disabled={cancelling}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-60"
                  >
                    {cancelling ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-white" />
                        <span>বাতিল হচ্ছে...</span>
                      </>
                    ) : (
                      <span>হ্যাঁ, অর্ডার বাতিল করুন</span>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
