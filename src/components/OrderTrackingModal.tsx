import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, X, Copy, Check, Share2, Package, CheckCircle2, 
  MapPin, Phone, User, FileText, Download, 
  Sparkles, RefreshCw, AlertCircle, Tag, Gift,
  Eye, Truck, Award, HeartHandshake, ShoppingBag
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { Order, OrderStatus } from '../types';
import { getOrderForTracking, getMyCustomerOrdersLocally, saveCustomerOrderLocally } from '../services/orderService';
import { DigitalInvoice } from './DigitalInvoice';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderId?: string;
}

export default function OrderTrackingModal({ isOpen, onClose, initialOrderId }: OrderTrackingModalProps) {
  const [searchQuery, setSearchQuery] = useState(initialOrderId || '');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [myCustomerOrders, setMyCustomerOrders] = useState<Order[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadingPos, setDownloadingPos] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [manualSearchDone, setManualSearchDone] = useState(false);

  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadInitialOrder();
    }
  }, [isOpen, initialOrderId]);

  const loadInitialOrder = async () => {
    setManualSearchDone(false);
    setLoading(true);

    try {
      // 1. If explicit initialOrderId is passed (e.g. from Success View or link)
      if (initialOrderId) {
        setSearchQuery(initialOrderId);
        const result = await getOrderForTracking(initialOrderId);
        if (result) {
          setOrder(result);
          saveCustomerOrderLocally(result);
          setMyCustomerOrders(getMyCustomerOrdersLocally());
          setLoading(false);
          return;
        }
      }

      // 2. Load customer's own saved orders from local storage
      const localMyOrders = getMyCustomerOrdersLocally();
      setMyCustomerOrders(localMyOrders);

      if (localMyOrders && localMyOrders.length > 0) {
        const latestOrder = localMyOrders[0];
        const targetId = latestOrder.orderId || latestOrder.id;
        if (targetId) {
          setSearchQuery(targetId);
          // Try fetching fresh database status so any admin status updates show real-time
          const freshOrder = await getOrderForTracking(targetId);
          if (freshOrder) {
            setOrder(freshOrder);
            saveCustomerOrderLocally(freshOrder);
            setLoading(false);
            return;
          }
        }
        setOrder(latestOrder);
        setLoading(false);
        return;
      }

      // 3. Check if phone number is saved
      const savedMobile = localStorage.getItem('sera_my_last_mobile');
      if (savedMobile) {
        setSearchQuery(savedMobile);
        const freshByMobile = await getOrderForTracking(savedMobile);
        if (freshByMobile) {
          setOrder(freshByMobile);
          saveCustomerOrderLocally(freshByMobile);
          setMyCustomerOrders(getMyCustomerOrdersLocally());
          setLoading(false);
          return;
        }
      }

      // 4. No order found for this specific customer/device
      setOrder(null);
    } catch (err) {
      console.error("Failed to load customer order for tracking:", err);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setManualSearchDone(true);
    try {
      const result = await getOrderForTracking(searchQuery);
      if (result) {
        setOrder(result);
        saveCustomerOrderLocally(result);
        setMyCustomerOrders(getMyCustomerOrdersLocally());
      } else {
        setOrder(null);
      }
    } catch (err) {
      console.error("Failed manual search:", err);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Generate unique order taking link
  const trackingUrl = order 
    ? `${window.location.origin}/?track=${order.orderId}`
    : '';

  const handleCopyLink = () => {
    if (!trackingUrl) return;
    navigator.clipboard.writeText(trackingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Download POS Memo PNG directly to phone gallery
  const handleDownloadPosPng = async () => {
    if (!invoiceRef.current || !order) return;
    setDownloadingPos(true);
    try {
      const dataUrl = await toPng(invoiceRef.current, { cacheBust: true, quality: 0.98, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `POS_CashMemo_${order.orderId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to download POS memo image:", err);
    } finally {
      setDownloadingPos(false);
    }
  };

  // Status Step Mapping
  const getStatusStepIndex = (status?: OrderStatus) => {
    switch (status) {
      case 'Pending': return 1;
      case 'Confirmed': return 2;
      case 'Processing': return 2;
      case 'Shipped': return 3;
      case 'Delivered': return 4;
      case 'Cancelled': return 0;
      default: return 1;
    }
  };

  const currentStep = order ? getStatusStepIndex(order.status) : 0;

  const steps = [
    { step: 1, title: 'অর্ডার গৃহীত', desc: 'অর্ডারটি সিস্টেমে গ্রহণ করা হয়েছে', icon: FileText },
    { step: 2, title: 'প্যাকেজিং ও চেক', desc: 'পণ্য কোয়ালিটি চেক ও প্যাকেজিং হচ্ছে', icon: Package },
    { step: 3, title: 'কুরিয়ারে হস্তান্তর', desc: 'স্টিডফাস্ট কুরিয়ারে সার্ভিস প্রদান করা হয়েছে', icon: Truck },
    { step: 4, title: 'সফল ডেলিভারি', desc: 'গ্রাহকের ঠিকানায় পেমেন্টসহ বুঝিয়ে দেওয়া হয়েছে', icon: CheckCircle2 },
  ];

  // Price calculations
  const subtotal = order ? (
    order.items && order.items.length > 0 
      ? order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
      : (order.quantity * order.price)
  ) : 0;

  const spinDiscount = order ? (order.discount || 0) : 0;
  const discountVal = order ? (order.discountAmount || 0) : 0;
  const effectiveSpinDiscount = spinDiscount > 0 ? spinDiscount : (discountVal > 0 ? discountVal : 0);
  const deliveryCharge = order ? (order.deliveryCharge || 0) : 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto border border-amber-100/60 max-h-[92vh] flex flex-col"
        >
          {/* Top Header with Vehicle Icon and Title */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-zinc-900 to-slate-950 text-white flex items-center justify-between shrink-0 border-b border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center justify-center p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30 shadow-inner">
                <Truck size={24} className="text-amber-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-serif font-black text-white tracking-wide flex items-center gap-2">
                  অর্ডার চেক করুন
                  <span className="bg-amber-400 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Product & Order Documents
                  </span>
                </h3>
                <p className="text-[11px] text-slate-300 font-medium">
                  পণ্যের বিবরণী, সাইজ, কোড, কাস্টমার এড্রেস, কুপন/স্পিন হুইল বিজয়ী ছাড় ও ক্যাশমেমো
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Main Content */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6">

            {/* Loading State */}
            {loading ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw size={38} className="animate-spin text-amber-500 mx-auto" />
                <p className="text-xs font-bold text-slate-600">আপনার অর্ডারের বিবরণী ও ডেলিভারি ডকুমেন্টস লোড হচ্ছে...</p>
              </div>
            ) : order ? (
              <div className="space-y-6">

                {/* MY ORDERS TAB STRIP (If customer has placed multiple orders on this device) */}
                {myCustomerOrders.length > 1 && (
                  <div className="bg-slate-100 p-3 rounded-2xl border border-slate-200/80 space-y-2">
                    <p className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                      <Package size={14} className="text-amber-600" />
                      আপনার পূর্বে প্রদত্ত অর্ডারসমূহ ({myCustomerOrders.length} টি):
                    </p>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {myCustomerOrders.map((myOrd, idx) => {
                        const targetId = myOrd.orderId || myOrd.id;
                        const isSelected = order && (order.orderId === targetId || order.id === targetId);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={async () => {
                              setOrder(myOrd);
                              if (targetId) {
                                const fresh = await getOrderForTracking(targetId);
                                if (fresh) {
                                  setOrder(fresh);
                                  saveCustomerOrderLocally(fresh);
                                }
                              }
                            }}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 border ${
                              isSelected 
                                ? 'bg-slate-900 text-amber-400 border-slate-900 shadow-md font-black' 
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <span>#{targetId}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                              isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {myOrd.status || 'Pending'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 1. PRODUCT DETAILS & FINANCIAL BREAKDOWN DOCUMENT */}
                <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Package size={16} className="text-amber-600" />
                      পণ্য বিবরণী (Product Summary & Documents)
                    </h4>
                    <span className="text-[10px] bg-slate-200 text-slate-800 font-mono font-bold px-2.5 py-1 rounded-md">
                      ID: {order.orderId}
                    </span>
                  </div>

                  {/* Product List with Image, Size, Code, Quantity */}
                  <div className="space-y-2">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                          <img
                            src={item.productImage}
                            alt={item.productTitle}
                            className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h6 className="text-xs font-bold text-slate-900 truncate">{item.productTitle}</h6>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 font-medium mt-1">
                              <span>কোড: <strong className="text-slate-900 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{item.productCode}</strong></span>
                              <span>•</span>
                              <span>সাইজ: <strong className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded">{item.size}</strong></span>
                              <span>•</span>
                              <span>কোয়ান্টিটি: <strong className="text-slate-900 font-bold">{item.quantity} টি</strong></span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-slate-500 font-medium">৳{item.price} × {item.quantity}</p>
                            <p className="text-sm text-emerald-800 font-black font-serif">৳{item.price * item.quantity}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                        {order.productImage && (
                          <img
                            src={order.productImage}
                            alt="Product"
                            className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h6 className="text-xs font-bold text-slate-900">{order.category || 'sera fashion item'}</h6>
                          <p className="text-[11px] text-slate-600 font-semibold mt-1">
                            কোড: <strong className="font-mono">{order.productCode}</strong> • সাইজ: <strong className="text-amber-800">{(order as any).size || '38'}</strong> • কোয়ান্টিটি: <strong className="text-slate-900">{order.quantity} টি</strong>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-emerald-800 font-serif">৳{order.price}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SPIN WHEEL WINNER REWARD DOCUMENT */}
                  {effectiveSpinDiscount > 0 && (
                    <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-orange-500/10 p-3.5 rounded-xl border border-amber-300 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-black text-amber-950 uppercase tracking-wide">
                          <Gift size={16} className="text-amber-700 animate-bounce" />
                          <span>স্পিন হুইল বিজয়ী অফার রিওয়ার্ড</span>
                        </div>
                        <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                          Spin Offer Winner
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-900 font-medium">
                        গ্রাহক লাকি স্পিন হুইল ঘুরায়ে বিশেষ বিজয়ী অফার ও ছাড় উপভোগ করেছেন।
                      </p>
                      <div className="flex items-center gap-3 pt-1 border-t border-amber-200 text-xs font-bold text-slate-900">
                        <span className="bg-white px-2.5 py-1 rounded-lg border border-amber-300 text-indigo-900 flex items-center gap-1.5">
                          <Sparkles size={14} className="text-amber-600" />
                          স্পিন হুইল বিজয়ী অফার ছাড়: {effectiveSpinDiscount === 100 || effectiveSpinDiscount === 200 ? `৳${effectiveSpinDiscount}` : (effectiveSpinDiscount <= 50 ? `${effectiveSpinDiscount}%` : `৳${effectiveSpinDiscount}`)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Financial Breakdown Document Table */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>সাবটোটাল (Subtotal):</span>
                      <span className="font-mono font-bold text-slate-900">৳{subtotal}</span>
                    </div>

                    {effectiveSpinDiscount > 0 && (
                      <div className="flex justify-between items-center text-indigo-700 font-medium">
                        <span className="flex items-center gap-1">
                          <Gift size={12} />
                          স্পিন হুইল বিজয়ী অফার ছাড়:
                        </span>
                        <span className="font-mono font-bold text-indigo-700">
                          {effectiveSpinDiscount === 100 || effectiveSpinDiscount === 200 ? `-৳${effectiveSpinDiscount}` : (effectiveSpinDiscount <= 50 ? `-${effectiveSpinDiscount}%` : `-৳${effectiveSpinDiscount}`)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-slate-600">
                      <span>ডেলিভারি চার্জ ({order.deliveryArea}):</span>
                      <span className="font-mono font-bold text-slate-900">+৳{deliveryCharge}</span>
                    </div>

                    <div className="border-t border-dashed border-slate-200 my-2 pt-2.5 flex justify-between items-center font-bold text-sm text-slate-900">
                      <span>সর্বমোট প্রদেয় মূল্য (Net Total):</span>
                      <span className="font-mono text-base font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                        ৳{order.totalAmount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. CUSTOMER NAME & DELIVERY ADDRESS */}
                <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-lg space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                      <User size={16} className="text-amber-400" />
                      কাস্টমার ও ডেলিভারি তথ্য (Customer & Shipping Details)
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-200">
                    <div className="space-y-1 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                      <p className="text-slate-400 text-[10px] uppercase font-bold">কাস্টমারের নাম:</p>
                      <p className="font-bold text-white text-sm flex items-center gap-1.5">
                        <User size={14} className="text-amber-400" />
                        {order.customerName}
                      </p>
                    </div>

                    <div className="space-y-1 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                      <p className="text-slate-400 text-[10px] uppercase font-bold">কাস্টমারের ফোন নম্বর:</p>
                      <p className="font-mono font-black text-amber-300 text-sm flex items-center gap-1.5">
                        <Phone size={14} className="text-emerald-400" />
                        {order.mobileNumber}
                      </p>
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-1 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                      <p className="text-slate-400 text-[10px] uppercase font-bold">কাস্টমারের ডেলিভারি অ্যাড্রেস:</p>
                      <p className="font-bold text-white leading-relaxed flex items-start gap-1.5">
                        <MapPin size={16} className="text-amber-400 shrink-0 mt-0.5" />
                        <span>{order.address}, {order.upazila ? `${order.upazila}, ` : ''}{order.district} ({order.deliveryArea})</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. HD POS CASH MEMO PREVIEW & DOWNLOAD BUTTON */}
                <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText size={16} className="text-amber-400" />
                        POS ইনভয়েস ক্যাশমেমো (HD POS Cash Memo)
                      </h4>
                      <p className="text-[10.5px] text-slate-300 mt-0.5">
                        সরাসরি কাস্টমার তার ফোনের গ্যালারিতে ক্যাশমেমো ছবি আকারে ডাউনলোড করে নিতে পারবেন।
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      <button
                        type="button"
                        onClick={handleDownloadPosPng}
                        disabled={downloadingPos}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {downloadingPos ? (
                          <RefreshCw size={15} className="animate-spin text-slate-950" />
                        ) : (
                          <Download size={15} />
                        )}
                        <span>{downloadingPos ? 'ডাউনলোড হচ্ছে...' : 'গ্যালারিতে ডাউনলোড (PNG)'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowInvoiceModal(true)}
                        className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye size={15} />
                        <span>প্রিভিউ</span>
                      </button>
                    </div>
                  </div>

                  {/* POS Memo Visible Picture Preview */}
                  <div className="rounded-2xl border-2 border-slate-800 overflow-hidden bg-white max-h-72 overflow-y-auto shadow-inner p-1">
                    <DigitalInvoice order={order} />
                  </div>
                </div>

                {/* 4. LIVE DELIVERY STATUS STEPPER GRID */}
                <div className="bg-gradient-to-br from-slate-950 via-zinc-900 to-slate-950 p-5 rounded-2xl text-white border border-slate-800 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div>
                      <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                        <Truck size={18} className="text-amber-400" />
                        লাইভ ডেলিভারি স্ট্যাটাস আপডেট
                      </h4>
                      <p className="text-[10.5px] text-slate-400">অর্ডারের বর্তমান প্যাকেজিং ও ডেলিভারি অগ্রগতি</p>
                    </div>

                    <span className={`inline-block px-3 py-0.5 rounded-full text-[11px] font-black uppercase ${
                      order.status === 'Delivered' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                      order.status === 'Cancelled' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                      'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                    }`}>
                      ● {order.status || 'Pending'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {steps.map((st) => {
                      const Icon = st.icon;
                      const isCompleted = currentStep >= st.step;
                      const isCurrent = currentStep === st.step;

                      return (
                        <div 
                          key={st.step}
                          className={`p-3 rounded-xl border text-center space-y-1 transition-all ${
                            isCurrent ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md' :
                            isCompleted ? 'bg-emerald-950/80 text-emerald-200 border-emerald-500/40' :
                            'bg-slate-900/60 text-slate-500 border-slate-800 opacity-60'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-full mx-auto flex items-center justify-center ${
                            isCurrent ? 'bg-slate-950 text-amber-400' :
                            isCompleted ? 'bg-emerald-500 text-white' :
                            'bg-slate-800 text-slate-500'
                          }`}>
                            <Icon size={14} />
                          </div>
                          <h5 className="text-[11px] font-black leading-tight">{st.title}</h5>
                          <p className="text-[9px] leading-tight font-medium opacity-80">{st.desc}</p>
                        </div>
                      );
                    })}
                  </div>

                  {order.courierTrackingCode && (
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-300">
                      <span>স্টিডফাস্ট কুরিয়ার ট্র্যাকিং কোড:</span>
                      <span className="font-mono bg-amber-400 text-slate-950 px-2.5 py-1 rounded font-black">{order.courierTrackingCode}</span>
                    </div>
                  )}
                </div>

                {/* 5. GENERATED UNIQUE SHAREABLE LINK (WITH ONLY COPY LINK BUTTON) */}
                <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-4 sm:p-5 rounded-2xl border border-amber-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                      <Share2 size={15} className="text-amber-600" />
                      আপনার এই অর্ডারের নিজস্ব ইউনিক লিংক:
                    </span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 font-black px-2 py-0.5 rounded-full">
                      Link Active
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium">
                    আপনার অর্ডারের নিজস্ব ইউনিক ট্র্যাকিং লিংক। এটি কপি করে সংরক্ষণ করে রাখলে পরবর্তীতে যেকোনো ডিভাইসে আপনার অর্ডারের সকল লাইভ ডেলিভারি স্ট্যাটাস ও ডকুমেন্টস সরাসরি দেখতে পারবেন:
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-2 bg-white p-2 rounded-xl border border-amber-300">
                    <input
                      type="text"
                      readOnly
                      value={trackingUrl}
                      className="w-full bg-transparent px-2 font-mono text-xs text-slate-800 font-bold outline-none truncate"
                    />

                    <div className="w-full sm:w-auto shrink-0">
                      <button
                        onClick={handleCopyLink}
                        className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-black text-amber-400 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        <span>{copiedLink ? 'লিংক কপি হয়েছে!' : 'লিংক কপি করুন'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 6. HEARTFELT CUSTOMER GREETING & THANK YOU CARD */}
                <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 p-5 rounded-2xl shadow-xl text-center space-y-2.5 border border-amber-300">
                  <div className="w-10 h-10 bg-slate-950 text-amber-400 rounded-full flex items-center justify-center mx-auto shadow-md">
                    <HeartHandshake size={20} className="text-amber-400 animate-pulse" />
                  </div>
                  <h4 className="font-serif font-black text-sm uppercase tracking-wide text-slate-950">
                    সেরা ফ্যাশন (SERA FASHION) তে কেনাকাটা করার জন্য আপনাকে আন্তরিক ধন্যবাদ ও শুভকামনা! 🌸
                  </h4>
                  <p className="text-xs font-semibold leading-relaxed max-w-lg mx-auto text-slate-900">
                    আপনার আস্থা ও ভালোবাসাই আমাদের মূল প্রেরণা। প্রতিটি পোশাকে ১০০% প্রিমিয়াম ফেব্রিক্স এবং নিপুণ কারুকাজ নিশ্চিত করতে আমরা প্রতিশ্রুতিবদ্ধ। দ্রুত ও নিরাপদে ডেলিভারি পেয়ে আপনার অভিজ্ঞতা আমাদের সাথে শেয়ার করার বিনীত অনুরোধ রইলো। শুভকামনা নিরন্তর!
                  </p>
                </div>

                {/* 7. HOTLINE HELPLINE */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2.5 text-xs">
                    <Phone size={18} className="text-amber-400 shrink-0" />
                    <div>
                      <p className="font-bold">ডেলিভারি সংক্রান্ত সাহায্য পেতে কল করুন</p>
                      <p className="text-[10px] text-slate-400">সরাসরি আমাদের কাস্টমার সাপোর্ট টিমের সাথে কথা বলুন</p>
                    </div>
                  </div>

                  <a
                    href="tel:01724628453"
                    className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all text-center"
                  >
                    কল করুন: 01724628453
                  </a>
                </div>

                {/* 8. [EXACTLY AT THE VERY BOTTOM - OPTIONAL] SUBMIT LINK OR SEARCH OTHER ORDER */}
                <div className="pt-4 border-t border-slate-200 mt-8">
                  <div className="bg-slate-100 p-4 sm:p-5 rounded-2xl border border-slate-300/80 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <Search size={16} className="text-amber-600" />
                      <span>অন্য কোনো অর্ডারের লিংক বা আইডি দিয়ে চেক করতে চান? (ঐচ্ছিক)</span>
                    </div>

                    <p className="text-[11px] text-slate-600 font-medium">
                      নিচের ঘরে অন্য অর্ডারের লিংক বা SERA আইডি সাবমিট করে উক্ত অর্ডারের বিস্তারিত ডেলিভারি বিবরণী দেখতে পারবেন।
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                        placeholder="যেমন: SERA-123456 বা অন্য ট্র্যাকিং লিংক"
                        className="w-full px-3.5 py-2.5 bg-white text-slate-900 placeholder-slate-400 font-mono text-xs rounded-xl border border-slate-300 outline-none focus:border-amber-500 shadow-2xs"
                      />

                      <button
                        type="button"
                        onClick={handleManualSearch}
                        disabled={loading || !searchQuery.trim()}
                        className="px-5 py-2.5 bg-slate-900 hover:bg-black text-amber-400 font-bold text-xs rounded-xl transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                      >
                        {loading ? <RefreshCw size={14} className="animate-spin text-amber-400" /> : <Search size={14} />}
                        <span>সাবমিট ও ডেলিভারি ডিটেইলস</span>
                      </button>
                    </div>

                    {manualSearchDone && !order && (
                      <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                        সঠিক লিংক বা আইডি পাওয়া যায়নি। দয়া করে পুনরায় চেক করুন।
                      </p>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="py-10 px-4 text-center space-y-6 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
                <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto shadow-sm border border-amber-200">
                  <ShoppingBag size={32} />
                </div>
                
                <div className="space-y-2 max-w-md mx-auto">
                  <h4 className="text-base font-black text-slate-900 font-serif">
                    আপনার কোনো পূর্ববর্তী অর্ডার পাওয়া যায়নি
                  </h4>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    আপনি এই ব্রাউজার বা ডিভাইস থেকে এখনও কোনো পণ্য অর্ডার সম্পন্ন করেননি। আপনার পূর্বে দেওয়া কোনো অর্ডার থাকলে আপনার <strong className="text-slate-900 font-bold">মোবাইল নম্বর</strong> (যেমন: 01712345678) অথবা <strong className="text-slate-900 font-bold">অর্ডার আইডি</strong> (যেমন: SERA-123456) নিচে লিখে সার্চ করুন।
                  </p>
                </div>

                <div className="max-w-md mx-auto space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                      placeholder="যেমন: 01712345678 বা SERA-123456"
                      className="w-full px-4 py-3 bg-white text-slate-900 placeholder-slate-400 font-sans text-xs rounded-xl border border-slate-300 outline-none focus:border-amber-500 shadow-2xs font-bold"
                    />

                    <button
                      type="button"
                      onClick={handleManualSearch}
                      disabled={loading || !searchQuery.trim()}
                      className="px-6 py-3 bg-slate-950 hover:bg-black text-amber-400 font-black text-xs rounded-xl transition-all shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                    >
                      {loading ? <RefreshCw size={15} className="animate-spin text-amber-400" /> : <Search size={15} />}
                      <span>অর্ডার খুঁজুন</span>
                    </button>
                  </div>

                  {manualSearchDone && !order && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center justify-center gap-2">
                      <AlertCircle size={16} className="text-rose-600 shrink-0" />
                      <span>উক্ত মোবাইল নম্বর বা আইডি দিয়ে কোনো অর্ডার পাওয়া যায়নি। সঠিক তথ্য দিয়ে ট্রাই করুন।</span>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </motion.div>

        {/* Off-screen Hidden DOM Container for POS PNG Canvas Generation */}
        {order && (
          <div className="fixed -left-[2000px] top-0 pointer-events-none opacity-0 overflow-hidden bg-white">
            <div ref={invoiceRef} className="bg-white">
              <DigitalInvoice order={order} />
            </div>
          </div>
        )}

        {/* Cash Memo / Invoice Preview Modal Overlay */}
        {showInvoiceModal && order && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-4 max-w-xl w-full max-h-[90vh] overflow-y-auto relative">
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 cursor-pointer z-10"
              >
                <X size={18} />
              </button>
              <DigitalInvoice order={order} />
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
