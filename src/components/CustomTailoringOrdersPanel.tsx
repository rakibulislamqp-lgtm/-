import React, { useMemo, useState } from 'react';
import {
  Scissors,
  Phone,
  MapPin,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  Printer,
  ZoomIn,
  CreditCard,
  Image as ImageIcon,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Order } from '../types';
import { formatBodyMeasurements } from '../lib/productVariants';

interface CustomTailoringOrdersPanelProps {
  orders: Order[];
  onToggleAdvanceVerified: (order: Order) => Promise<void> | void;
  onUpdateStatus: (orderId: string, newStatus: string, extraData?: Partial<Order>) => Promise<void> | void;
  onViewOrder: (order: Order) => void;
  onPrintOrder: (order: Order) => void;
  onPreviewImage: (url: string) => void;
}

export default function CustomTailoringOrdersPanel({
  orders,
  onToggleAdvanceVerified,
  onUpdateStatus,
  onViewOrder,
  onPrintOrder,
  onPreviewImage,
}: CustomTailoringOrdersPanelProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'unverified' | 'verified'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const customOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        Boolean(o.hasCustomTailoring) ||
        (Number(o.advanceAmount) || 0) > 0 ||
        Boolean(o.items?.some((i) => i.isCustomTailored))
    );
  }, [orders]);

  const stats = useMemo(() => {
    const activeOrders = customOrders.filter((o) => o.status !== 'Cancelled');
    const unverifiedCount = activeOrders.filter((o) => !o.advanceVerified).length;
    const verifiedCount = activeOrders.filter((o) => Boolean(o.advanceVerified)).length;
    const totalAdvance = activeOrders.reduce(
      (sum, o) => sum + (Number(o.advanceAmount) || 300),
      0
    );
    return {
      total: customOrders.length,
      unverifiedCount,
      verifiedCount,
      totalAdvance,
    };
  }, [customOrders]);

  const filteredOrders = useMemo(() => {
    if (filterMode === 'unverified') {
      return customOrders.filter((o) => !o.advanceVerified && o.status !== 'Cancelled');
    }
    if (filterMode === 'verified') {
      return customOrders.filter((o) => Boolean(o.advanceVerified));
    }
    return customOrders;
  }, [customOrders, filterMode]);

  const handleCopy = (value: string, key: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value).catch(() => {});
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#16192b] via-[#24162d] to-[#16192b] text-white p-5 sm:p-7 rounded-3xl shadow-xl border border-rose-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 bg-rose-600/25 border border-rose-400/40 rounded-2xl text-rose-300 shrink-0">
              <Scissors size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black tracking-tight">
                বডির মাপে পোশাক ও ৳৩০০ অগ্রিম প্রমাণ হাব
              </h2>
              <p className="text-xs text-rose-200/80 font-semibold mt-0.5 leading-relaxed">
                কাস্টমারের বিস্তারিত বডি মাপ (ছাতি, কোমর, লম্বা, হাতা), টাকা পাঠানোর নম্বর, TrxID ও স্ক্রিনশট এক জায়গা থেকে যাচাই করুন
              </p>
            </div>
          </div>

          {stats.unverifiedCount > 0 && (
            <div className="px-3.5 py-2 bg-amber-400 text-slate-950 rounded-2xl text-xs font-black flex items-center gap-2 self-start sm:self-auto shadow-lg shrink-0">
              <AlertCircle size={15} />
              <span>{stats.unverifiedCount}টি অগ্রিম যাচাই বাকি</span>
            </div>
          )}
        </div>
      </div>

      {/* Responsive KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">মোট কাস্টম অর্ডার</p>
          <p className="text-2xl font-black text-slate-900 mt-1 tabular-nums">{stats.total} টি</p>
        </div>
        <div className="bg-amber-50/70 p-4 sm:p-5 rounded-2xl border border-amber-200 shadow-sm">
          <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider">অগ্রিম যাচাই বাকি</p>
          <p className="text-2xl font-black text-amber-900 mt-1 tabular-nums">{stats.unverifiedCount} টি</p>
        </div>
        <div className="bg-emerald-50/70 p-4 sm:p-5 rounded-2xl border border-emerald-200 shadow-sm">
          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">পেমেন্ট যাচাই সম্পন্ন</p>
          <p className="text-2xl font-black text-emerald-800 mt-1 tabular-nums">{stats.verifiedCount} টি</p>
        </div>
        <div className="bg-rose-50/70 p-4 sm:p-5 rounded-2xl border border-rose-200 shadow-sm">
          <p className="text-[10px] font-black text-rose-700 uppercase tracking-wider">মোট অগ্রিম হিসাব</p>
          <p className="text-2xl font-black text-rose-700 mt-1 tabular-nums">৳{stats.totalAdvance.toLocaleString('en-US')}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
        {[
          { key: 'all', label: `সব অর্ডার (${customOrders.length})` },
          { key: 'unverified', label: `অগ্রিম যাচাই বাকি (${stats.unverifiedCount})` },
          { key: 'verified', label: `যাচাইকৃত (${stats.verifiedCount})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilterMode(tab.key as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              filterMode === tab.key
                ? 'bg-slate-900 text-white shadow'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Custom Tailoring Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white p-12 sm:p-16 rounded-3xl border border-dashed border-gray-200 text-center space-y-3">
          <div className="w-16 h-16 bg-rose-50 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
            <Scissors size={30} />
          </div>
          <h3 className="text-sm sm:text-base font-black text-gray-800">
            কোনো কাস্টম সেলাই অর্ডার পাওয়া যায়নি
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
            কাস্টমার যখনই কোনো থ্রি-পিস &ldquo;বডির মাপে বানান&rdquo; অপশন সিলেক্ট করে ৳৩০০ অগ্রিম দিয়ে অর্ডার করবে, তার মাপ এবং পেমেন্ট প্রমাণ এখানে চলে আসবে।
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredOrders.map((order) => {
            const advancePaid = Number(order.advanceAmount || 300);
            const totalAmt = Number(order.totalAmount || 0);
            const dueAmt = order.dueAmount ?? Math.max(0, totalAmt - advancePaid);
            const customItems = (order.items || []).filter((i) => i.isCustomTailored);
            const displayItems =
              customItems.length > 0
                ? customItems
                : order.items && order.items.length > 0
                  ? order.items
                  : [
                      {
                        id: order.orderId,
                        productId: order.productId || '',
                        productTitle: order.category || 'Three Piece',
                        productImage: order.productImage || '',
                        productCode: order.productCode || 'N/A',
                        category: order.category || 'THREE PIECE',
                        price: order.price || 0,
                        quantity: order.quantity || 1,
                        size: order.size || 'Custom Body Fit',
                        color: order.color,
                        isCustomTailored: true,
                      },
                    ];

            return (
              <div
                key={order.id || order.orderId}
                className={`bg-white rounded-3xl border-2 p-4 sm:p-6 shadow-sm space-y-5 transition-all ${
                  order.advanceVerified
                    ? 'border-emerald-200'
                    : 'border-amber-300/80'
                }`}
              >
                {/* Order Top Info Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-gray-100 pb-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-black text-slate-900">
                        {order.customerName}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-mono text-[11px] font-black">
                        #{order.orderId}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          order.status === 'Pending'
                            ? 'bg-amber-100 text-amber-800'
                            : order.status === 'Confirmed'
                              ? 'bg-indigo-100 text-indigo-800'
                              : order.status === 'Delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'Cancelled'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 font-semibold">
                      <a
                        href={`tel:${order.mobileNumber}`}
                        className="inline-flex items-center gap-1 text-rose-600 font-black hover:underline"
                      >
                        <Phone size={13} />
                        {order.mobileNumber}
                      </a>
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={13} className="text-gray-400 shrink-0" />
                        <span>
                          {order.address}
                          {order.upazila ? `, ${order.upazila}` : ''}
                          {order.district ? `, ${order.district}` : ''}
                        </span>
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-400 font-bold">
                      অর্ডার সময়: {new Date(order.createdAt).toLocaleString('en-GB')}
                    </p>
                  </div>

                  {/* Advance Verified Pill */}
                  <div className="shrink-0">
                    {order.advanceVerified ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-200">
                        <CheckCircle2 size={14} />
                        ✓ অগ্রিম পেমেন্ট যাচাইকৃত
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 text-xs font-black border border-amber-300">
                        <Clock size={14} />
                        ⏳ পেমেন্ট যাচাই বাকি
                      </span>
                    )}
                  </div>
                </div>

                {/* Two-Column Mobile-Friendly Grid: Left = Measurements, Right = Payment Proof */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                  {/* Left: Garment & Body Measurements */}
                  <div className="bg-rose-50/40 border border-rose-200/80 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black text-rose-800 uppercase tracking-wider">
                      <Scissors size={15} />
                      <span>পোশাক ও বডির মাপের বিবরণ</span>
                    </div>

                    <div className="space-y-3">
                      {displayItems.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="bg-white rounded-xl p-3 border border-rose-100 space-y-2.5"
                        >
                          <div className="flex items-start gap-3">
                            {item.productImage && (
                              <button
                                type="button"
                                onClick={() => onPreviewImage(item.productImage)}
                                className="relative group shrink-0 cursor-pointer"
                                title="ছবি বড় করে দেখুন"
                              >
                                <img
                                  src={item.productImage}
                                  alt={item.productTitle}
                                  className="w-14 h-14 object-cover rounded-xl border border-gray-200"
                                />
                              </button>
                            )}
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs sm:text-sm font-black text-gray-900 leading-snug">
                                {item.productTitle}
                              </h4>
                              <p className="text-[11px] font-bold text-gray-500 mt-0.5">
                                কোড: {item.productCode} • পরিমাণ: {item.quantity}টি
                                {item.color ? ` • কালার/ডিজাইন: ${item.color}` : ''}
                              </p>
                            </div>
                          </div>

                          {/* Structured Measurements Grid */}
                          {item.customMeasurements ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                              <div className="bg-rose-50 px-2.5 py-2 rounded-lg border border-rose-100">
                                <span className="block text-[10px] font-bold text-rose-600">বডি / ছাতি</span>
                                <span className="text-xs font-black text-slate-900">
                                  {item.customMeasurements.chest || '—'}&quot;
                                </span>
                              </div>
                              <div className="bg-rose-50 px-2.5 py-2 rounded-lg border border-rose-100">
                                <span className="block text-[10px] font-bold text-rose-600">কোমর</span>
                                <span className="text-xs font-black text-slate-900">
                                  {item.customMeasurements.waist ? `${item.customMeasurements.waist}"` : '—'}
                                </span>
                              </div>
                              <div className="bg-rose-50 px-2.5 py-2 rounded-lg border border-rose-100">
                                <span className="block text-[10px] font-bold text-rose-600">জামার লম্বা</span>
                                <span className="text-xs font-black text-slate-900">
                                  {item.customMeasurements.length ? `${item.customMeasurements.length}"` : '—'}
                                </span>
                              </div>
                              <div className="bg-rose-50 px-2.5 py-2 rounded-lg border border-rose-100">
                                <span className="block text-[10px] font-bold text-rose-600">হাতা</span>
                                <span className="text-xs font-black text-slate-900">
                                  {item.customMeasurements.sleeve ? `${item.customMeasurements.sleeve}"` : '—'}
                                </span>
                              </div>
                              {item.customMeasurements.note && (
                                <div className="col-span-2 sm:col-span-4 bg-amber-50/80 px-2.5 py-2 rounded-lg border border-amber-200 text-[11px] font-bold text-amber-950">
                                  📝 দর্জির জন্য নোট: {item.customMeasurements.note}
                                </div>
                              )}
                            </div>
                          ) : order.customMeasurementsSummary ? (
                            <p className="text-xs font-black text-rose-800 bg-rose-50 px-3 py-2 rounded-lg border border-rose-100">
                              ✂️ {order.customMeasurementsSummary}
                            </p>
                          ) : (
                            <p className="text-xs font-bold text-rose-700">
                              কাস্টম বডির মাপে তৈরি (বিস্তারিত কল করে নিশ্চিত করুন)
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Payment Proof & Verification */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
                        <CreditCard size={15} className="text-indigo-600" />
                        <span>টাকা পাঠানোর প্রমাণ (Payment Proof)</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 text-[11px] font-black uppercase">
                        {order.paymentMethod || 'N/A'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                        <span className="block text-[10px] font-bold text-gray-500">মোট বিল</span>
                        <span className="text-sm font-black text-slate-900 tabular-nums">
                          ৳{totalAmt.toLocaleString('en-US')}
                        </span>
                      </div>
                      <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                        <span className="block text-[10px] font-bold text-rose-700">অগ্রিম পাঠানো</span>
                        <span className="text-sm font-black text-rose-700 tabular-nums">
                          ৳{advancePaid.toLocaleString('en-US')}
                        </span>
                      </div>
                      <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                        <span className="block text-[10px] font-bold text-amber-800">বাকি (COD)</span>
                        <span className="text-sm font-black text-amber-900 tabular-nums">
                          ৳{dueAmt.toLocaleString('en-US')}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                        <span className="font-bold text-gray-500">যে নম্বর থেকে পাঠিয়েছে:</span>
                        {order.paymentSenderNumber ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:${order.paymentSenderNumber}`}
                              className="font-mono font-black text-slate-900 hover:underline"
                            >
                              {order.paymentSenderNumber}
                            </a>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(order.paymentSenderNumber!, `snd-${order.orderId}`)
                              }
                              className="p-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer"
                              title="নম্বর কপি করুন"
                            >
                              {copiedId === `snd-${order.orderId}` ? (
                                <Check size={12} className="text-emerald-600" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 font-semibold">দেওয়া হয়নি</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-gray-500">Transaction ID:</span>
                        {order.transactionId ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                              {order.transactionId}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(order.transactionId!, `trx-${order.orderId}`)
                              }
                              className="p-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 cursor-pointer"
                              title="TrxID কপি করুন"
                            >
                              {copiedId === `trx-${order.orderId}` ? (
                                <Check size={12} className="text-emerald-600" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-rose-500 font-bold">TrxID নেই</span>
                        )}
                      </div>
                    </div>

                    {/* Screenshot Proof Box */}
                    {order.paymentScreenshotUrl ? (
                      <div className="bg-white rounded-xl border border-emerald-200 p-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => onPreviewImage(order.paymentScreenshotUrl!)}
                            className="relative group shrink-0 cursor-pointer rounded-xl overflow-hidden border border-gray-200"
                          >
                            <img
                              src={order.paymentScreenshotUrl}
                              alt="Payment Proof"
                              className="w-16 h-16 object-cover group-hover:scale-105 transition-transform"
                            />
                            <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <ZoomIn size={16} />
                            </span>
                          </button>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-emerald-700 flex items-center gap-1">
                              <ImageIcon size={13} />
                              <span>পেমেন্ট স্ক্রিনশট সংযুক্ত আছে</span>
                            </p>
                            <p className="text-[11px] text-gray-500 font-semibold">
                              বড় করে দেখতে ছবিতে ট্যাপ করুন
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onPreviewImage(order.paymentScreenshotUrl!)}
                          className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <ZoomIn size={13} />
                          <span>জুম করুন</span>
                        </button>
                      </div>
                    ) : (
                      <div className="bg-white/70 rounded-xl border border-dashed border-gray-300 px-3 py-2.5 text-[11px] text-gray-500 font-semibold flex items-center gap-2">
                        <ImageIcon size={14} className="text-gray-400 shrink-0" />
                        <span>কাস্টমার স্ক্রিনশট আপলোড করেননি — প্রেরকের নম্বর ও TrxID দিয়ে মোবাইল ব্যাংকিং স্টেটমেন্ট চেক করুন।</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Footer */}
                <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => onToggleAdvanceVerified(order)}
                    className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      order.advanceVerified
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                        : 'bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-sm'
                    }`}
                  >
                    <ShieldCheck size={15} />
                    <span>
                      {order.advanceVerified
                        ? '✓ পেমেন্ট যাচাই সম্পন্ন (বাতিল করতে ট্যাপ করুন)'
                        : 'পেমেন্ট যাচাই নিশ্চিত করুন'}
                    </span>
                  </button>

                  {order.status === 'Pending' && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateStatus(order.id!, 'Confirmed', {
                          confirmedAt: new Date().toISOString(),
                          ...(order.advanceVerified ? {} : { advanceVerified: true, advanceVerifiedAt: new Date().toISOString() }),
                        })
                      }
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 size={14} />
                      <span>কনফার্ম করুন</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onPrintOrder(order)}
                    className="px-3.5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer size={14} />
                    <span>মেজারমেন্ট স্লিপ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onViewOrder(order)}
                    className="px-3.5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-indigo-700 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye size={14} />
                    <span>বিস্তারিত</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
