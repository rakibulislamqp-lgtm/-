import React, { useState, useEffect } from 'react';
import { Order } from '../types';
import { ShoppingBag, Phone, MapPin, Calendar, Hash } from 'lucide-react';
import brandLogo from '../assets/images/sfh_logo_1779435027377.png';
import { getBrandSettings } from '../services/settingsService';

interface DigitalInvoiceProps {
  order: Order;
  onClose?: () => void;
}

export const DigitalInvoice = React.forwardRef<HTMLDivElement, DigitalInvoiceProps>(({ order, onClose }, ref) => {
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    try {
      const cached = localStorage.getItem('brand_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && (parsed.invoiceLogoUrl || parsed.logoUrl)) {
          return parsed.invoiceLogoUrl || parsed.logoUrl;
        }
      }
    } catch (e) {
      console.warn("Failed to load cached brand logo for invoice:", e);
    }
    return brandLogo;
  });

  const [brandName, setBrandName] = useState<string>(() => {
    try {
      const cached = localStorage.getItem('brand_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.brandName) {
          return parsed.brandName;
        }
      }
    } catch (e) {}
    return 'SERA FASHION';
  });

  useEffect(() => {
    async function loadLogo() {
      try {
        const settings = await getBrandSettings();
        if (settings?.invoiceLogoUrl || settings?.logoUrl) {
          setLogoUrl(settings.invoiceLogoUrl || settings.logoUrl);
        }
        if (settings?.brandName) {
          setBrandName(settings.brandName);
        }
      } catch (err) {
        console.error("Failed to load invoice logo:", err);
      }
    }
    loadLogo();
  }, []);

  const deliveryCharge = order.deliveryCharge || 0;
  const discountAmount = order.discountAmount || 0;
  const netTotal = order.totalAmount;

  // Calculate subtotal from items if available
  const subtotal = order.items && order.items.length > 0 
    ? order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    : (order.quantity * order.price);

  return (
    <div ref={ref} className="bg-white p-3 sm:p-6 md:p-8 w-full max-w-[600px] mx-auto text-brand-charcoal font-sans relative overflow-hidden">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-4 gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <img 
            src={logoUrl} 
            alt={`${brandName} Logo`} 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-brand-gold shadow-md shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-serif font-black text-brand-gold uppercase tracking-tight truncate">
              {brandName || 'SERA FASHION'}
            </h1>
            <p className="text-[9.5px] sm:text-xs font-medium text-gray-500 italic mt-0.5 font-serif truncate">
              Premium Quality, Exceptional Style
            </p>
          </div>
        </div>
        <div className="text-right space-y-1 shrink-0">
          <div className="inline-flex items-center gap-1.5 bg-brand-gold text-white px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest shadow-xs font-serif">
            INVOICE / ইনভয়েস
          </div>
          <div className="flex flex-col items-end gap-0.5 pr-0.5 font-serif">
            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-black text-brand-charcoal">
              <Hash size={9} className="text-brand-gold" />
              <span>ID: {order.orderId}</span>
            </div>
            <div className="flex items-center gap-1 text-[8.5px] sm:text-[9.5px] font-bold text-gray-400">
              <Calendar size={9} />
              <span>Date: {new Date(order.createdAt).toLocaleDateString('en-US')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full h-[1px] bg-brand-gold/40 mb-5 sm:mb-7" />

      {/* Info Sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8 text-left">
        <div className="space-y-1.5 sm:space-y-2">
          <div className="border-b-[1.5px] border-brand-gold/30 pb-0.5 inline-block">
            <h4 className="text-[8px] sm:text-[9px] font-black text-brand-gold uppercase tracking-widest">
              CUSTOMER DETAILS / গ্রাহকের তথ্য
            </h4>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm sm:text-base font-black text-gray-900 break-words">{order.customerName}</h3>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-700 font-bold font-serif">
              <Phone size={11} className="text-brand-gold shrink-0" />
              <span className="tabular-nums">{order.mobileNumber}</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 sm:space-y-2 text-left sm:text-right">
          <div className="border-b-[1.5px] border-brand-gold/30 pb-0.5 inline-block">
            <h4 className="text-[8px] sm:text-[9px] font-black text-brand-gold uppercase tracking-widest">
              SHIPPING ADDRESS / ডেলিভারি ঠিকানা
            </h4>
          </div>
          <div className="space-y-0.5 flex flex-col items-start sm:items-end">
            <div className="flex items-start gap-1.5 text-[11px] sm:text-xs text-gray-600 font-medium max-w-full sm:max-w-[240px] leading-snug">
              <MapPin size={11} className="text-brand-gold mt-0.5 shrink-0 order-first sm:order-last" />
              <span className="break-words">
                {order.address}, {order.upazila ? `${order.upazila}, ` : ''}{order.district}, Bangladesh
              </span>
            </div>
            <p className="text-xs sm:text-sm font-black text-brand-charcoal uppercase tracking-tight">
              {order.upazila ? `${order.upazila}, ` : ''}{order.district}
            </p>
          </div>
        </div>
      </div>

      {/* Table Section - 100% Mobile Friendly & Non-Overflowing */}
      <div className="mb-6 sm:mb-8 overflow-hidden rounded-xl border border-brand-gold/20 shadow-2xs">
        <div className="bg-brand-gold/10 flex items-center py-2 px-2.5 sm:px-3 text-[8px] sm:text-[9px] font-black text-brand-gold uppercase tracking-wider font-serif">
          <div className="flex-1 min-w-0 text-left">DESCRIPTION / বর্ণনা</div>
          <div className="w-10 sm:w-14 text-center shrink-0">QTY / পরিমাণ</div>
          <div className="w-16 sm:w-22 text-right shrink-0">PRICE / মূল্য</div>
          <div className="w-18 sm:w-24 text-right shrink-0">TOTAL / মোট</div>
        </div>
        
        <div className="p-2 sm:p-3 divide-y divide-gray-100 font-serif">
          {order.items && order.items.length > 0 ? (
            order.items.map((item) => (
              <div key={item.id} className="flex items-center py-2 sm:py-2.5 gap-2 sm:gap-3">
                {item.productImage && (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden border border-gray-100 shrink-0">
                    <img src={item.productImage} alt={item.productTitle} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left pr-1">
                  <div className="text-xs sm:text-sm font-black text-gray-900 leading-tight truncate sm:whitespace-normal">
                    {item.productTitle}
                  </div>
                  <div className="text-[7.5px] sm:text-[8px] text-gray-400 font-bold mt-0.5 uppercase tracking-wider truncate">
                    Code: {item.productCode} | Size: {item.size}
                  </div>
                </div>
                <div className="w-10 sm:w-14 text-center text-xs sm:text-sm font-black text-gray-900 tabular-nums shrink-0">
                  {item.quantity}
                </div>
                <div className="w-16 sm:w-22 text-right text-xs sm:text-sm font-black text-gray-700 tabular-nums whitespace-nowrap shrink-0">
                  {item.price.toLocaleString('en-US')} ৳
                </div>
                <div className="w-18 sm:w-24 text-right text-xs sm:text-sm font-black text-gray-900 tabular-nums whitespace-nowrap shrink-0">
                  {(item.price * item.quantity).toLocaleString('en-US')} ৳
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center py-2 sm:py-2.5 gap-2 sm:gap-3">
              {order.productImage && (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden border border-gray-100 shrink-0">
                  <img src={order.productImage} alt={order.category} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0 text-left pr-1">
                <div className="text-xs sm:text-sm font-black text-gray-900 leading-tight truncate sm:whitespace-normal">
                  {order.category || 'SERA FASHION পোশাক'}
                </div>
                <div className="text-[7.5px] sm:text-[8px] text-gray-400 font-bold mt-0.5 uppercase tracking-wider truncate">
                  Code: {order.productCode}
                </div>
              </div>
              <div className="w-10 sm:w-14 text-center text-xs sm:text-sm font-black text-gray-900 tabular-nums shrink-0">
                {order.quantity}
              </div>
              <div className="w-16 sm:w-22 text-right text-xs sm:text-sm font-black text-gray-700 tabular-nums whitespace-nowrap shrink-0">
                {order.price.toLocaleString('en-US')} ৳
              </div>
              <div className="w-18 sm:w-24 text-right text-xs sm:text-sm font-black text-gray-900 tabular-nums whitespace-nowrap shrink-0">
                {(order.quantity * order.price).toLocaleString('en-US')} ৳
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Box */}
      <div className="flex justify-end mb-6 sm:mb-8">
        <div className="w-full sm:max-w-[260px] bg-gray-50/90 p-3 sm:p-4 rounded-2xl border border-gray-100 shadow-2xs space-y-2.5 font-serif">
          <div className="flex justify-between items-center text-xs sm:text-sm font-bold text-gray-600">
            <span>Subtotal:</span>
            <span className="text-gray-900 font-black tabular-nums tracking-wide whitespace-nowrap">
              {subtotal.toLocaleString('en-US')} ৳
            </span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between items-center text-[11px] sm:text-xs font-black text-emerald-600 italic">
              <span>Discount ({((order as any).discountType || (order.discount === 100 || order.discount === 200 ? 'flat' : 'percentage')) === 'flat' ? `${order.discount}৳` : `${order.discount}%`}):</span>
              <span className="tabular-nums tracking-wide whitespace-nowrap">
                -{discountAmount.toLocaleString('en-US')} ৳
              </span>
            </div>
          )}
          <div className="flex justify-between items-center text-xs sm:text-sm font-bold text-gray-600">
            <span>Shipping:</span>
            <span className="text-gray-900 font-black tabular-nums tracking-wide whitespace-nowrap">
              +{deliveryCharge.toLocaleString('en-US')} ৳
            </span>
          </div>
          <div className="h-[1.5px] bg-gray-200" />
          <div className="flex justify-between items-center pt-1 mt-1 border-t-2 border-gray-200">
            <span className="text-sm sm:text-base font-black text-brand-charcoal uppercase tracking-wider">TOTAL:</span>
            <span className="text-xl sm:text-2xl font-black text-brand-charcoal tabular-nums tracking-wide border-b-4 border-brand-gold/30 pb-0.5 whitespace-nowrap">
              {netTotal.toLocaleString('en-US')} ৳
            </span>
          </div>
        </div>
      </div>

      <div className="w-full h-px border-t border-dashed border-gray-300 mb-4" />
      
      {/* Brand Footer */}
      <div className="text-center space-y-1.5 pb-2">
        <div className="flex items-center justify-center gap-1.5 text-brand-gold font-serif font-black text-base sm:text-lg italic">
          <ShoppingBag size={16} fill="currentColor" className="opacity-80 shrink-0" />
          <span className="tracking-wide uppercase">{brandName || 'SERA FASHION'}</span>
        </div>
        <p className="text-[8.5px] sm:text-[9.5px] font-bold text-gray-500 max-w-[450px] mx-auto leading-relaxed px-2">
          আমাদের থেকে পণ্য ক্রয় করার জন্য ধন্যবাদ। কোনো সমস্যার জন্য ৭ দিনের মধ্যে রিটার্ন পলিসি প্রযোজ্য।
        </p>
      </div>
    </div>
  );
});
