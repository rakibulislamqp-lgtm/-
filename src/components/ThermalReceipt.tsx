import React from 'react';

export interface ThermalReceiptItem {
  id?: string;
  title: string;
  code?: string;
  size?: string;
  quantity: number;
  price: number;
}

export interface ThermalReceiptProps {
  widthMode: '58mm' | '80mm';
  brandName?: string;
  logoUrl?: string;
  tagline?: string;
  storeAddress?: string;
  hotline?: string;
  invoiceId: string;
  dateStr: string;
  customerName: string;
  mobileNumber: string;
  shippingAddress: string;
  paymentMethod?: string;
  items: ThermalReceiptItem[];
  subtotal: number;
  discountLabel?: string;
  discountAmount: number;
  shippingLabel?: string;
  shippingCharge: number;
  netTotal: number;
  noteText?: string;
}

export const ThermalReceipt = React.forwardRef<HTMLDivElement, ThermalReceiptProps>(({
  widthMode,
  brandName = 'SERA FASHION',
  logoUrl,
  tagline = 'Premium Quality, Exceptional Style',
  storeAddress = 'Mirpur-1, Dhaka, Bangladesh',
  hotline = '01724628453',
  invoiceId,
  dateStr,
  customerName,
  mobileNumber,
  shippingAddress,
  paymentMethod,
  items,
  subtotal,
  discountLabel = 'Discount',
  discountAmount,
  shippingLabel = 'Shipping',
  shippingCharge,
  netTotal,
  noteText = 'আমাদের থেকে পণ্য ক্রয় করার জন্য ধন্যবাদ। কোনো সমস্যার জন্য ৭ দিনের মধ্যে মেমোসহ রিটার্ন পলিসি প্রযোজ্য।'
}, ref) => {
  const is58 = widthMode === '58mm';

  return (
    <div
      ref={ref}
      style={{
        width: is58 ? '54mm' : '74mm',
        maxWidth: '100%',
      }}
      className={`mx-auto bg-white text-black font-sans select-text ${
        is58
          ? 'px-[2mm] py-[2.5mm] text-[10px] leading-[1.35]'
          : 'px-[3mm] py-[3.5mm] text-[11px] leading-[1.4]'
      }`}
    >
      {/* Store Header */}
      <div className="text-center pb-2 border-b border-dashed border-black">
        {logoUrl && (
          <img
            src={logoUrl}
            alt={brandName}
            referrerPolicy="no-referrer"
            className={`mx-auto mb-1 rounded-full object-cover border border-black grayscale contrast-125 ${
              is58 ? 'w-7 h-7' : 'w-9 h-9'
            }`}
          />
        )}
        <h1
          className={`font-black uppercase tracking-wider text-black ${
            is58 ? 'text-[13px]' : 'text-[16px]'
          }`}
        >
          {brandName}
        </h1>
        {tagline && (
          <p className={`${is58 ? 'text-[8px]' : 'text-[9px]'} font-semibold text-black/80`}>
            {tagline}
          </p>
        )}
        {storeAddress && (
          <p className={`${is58 ? 'text-[8px]' : 'text-[9px]'} font-medium text-black mt-0.5 break-words`}>
            {storeAddress}
          </p>
        )}
        {hotline && (
          <p className={`${is58 ? 'text-[8.5px]' : 'text-[9.5px]'} font-bold text-black`}>
            Hotline: {hotline}
          </p>
        )}
      </div>

      {/* Receipt Title & Meta */}
      <div className="py-1.5 border-b border-dashed border-black space-y-0.5">
        <div className="text-center font-black uppercase tracking-widest border border-black py-0.5 mb-1 text-[9.5px]">
          CASH MEMO / INVOICE
        </div>
        <div className="flex justify-between items-center gap-1 font-bold">
          <span>ID:</span>
          <span className="font-mono font-black text-right break-all">{invoiceId}</span>
        </div>
        <div className="flex justify-between items-center gap-1 font-semibold">
          <span>Date:</span>
          <span className="tabular-nums text-right">{dateStr}</span>
        </div>
        {paymentMethod && (
          <div className="flex justify-between items-center gap-1 font-semibold">
            <span>Payment:</span>
            <span className="font-bold uppercase text-right">{paymentMethod}</span>
          </div>
        )}
      </div>

      {/* Customer Details */}
      <div className="py-1.5 border-b border-dashed border-black space-y-0.5">
        <p className="font-black uppercase tracking-wider text-[8.5px]">Customer Info:</p>
        <p className="font-black break-words">{customerName || '---'}</p>
        <p className="font-bold tabular-nums">{mobileNumber || '---'}</p>
        {shippingAddress && shippingAddress !== '---' && (
          <p className={`${is58 ? 'text-[9px]' : 'text-[10px]'} font-medium break-words leading-snug`}>
            {shippingAddress}
          </p>
        )}
      </div>

      {/* Items List */}
      <div className="py-1.5 border-b border-dashed border-black">
        {is58 ? (
          /* 58mm Narrow Thermal Layout: Two-line row per item prevents horizontal squeezing */
          <div>
            <div className="flex justify-between font-black uppercase text-[8.5px] pb-1 mb-1 border-b border-black">
              <span>Item / Qty x Rate</span>
              <span>Total</span>
            </div>
            <div className="space-y-1.5">
              {items.map((item, idx) => (
                <div key={item.id || idx} className="pb-1 border-b border-dotted border-black/40 last:border-b-0 last:pb-0">
                  <div className="font-bold text-black break-words leading-tight">
                    {idx + 1}. {item.title || '---'}
                  </div>
                  {(item.code || item.size) && (
                    <div className="text-[8px] font-semibold text-black/80">
                      {[item.code ? `Code: ${item.code}` : '', item.size ? `Size: ${item.size}` : '']
                        .filter(Boolean)
                        .join(' | ')}
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-0.5 tabular-nums">
                    <span className="text-[9.5px] font-semibold">
                      {item.quantity} x {item.price.toLocaleString('en-US')} ৳
                    </span>
                    <span className="font-black text-[10px]">
                      {(item.quantity * item.price).toLocaleString('en-US')} ৳
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* 80mm Wide Thermal Layout: Structured POS table */
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-black text-[9px] font-black uppercase">
                <th className="py-1 text-left">Item</th>
                <th className="py-1 text-center w-8">Qty</th>
                <th className="py-1 text-right w-14">Rate</th>
                <th className="py-1 text-right w-16">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dotted divide-black/40">
              {items.map((item, idx) => (
                <tr key={item.id || idx} className="align-top">
                  <td className="py-1.5 pr-1">
                    <div className="font-bold text-black break-words leading-tight">
                      {idx + 1}. {item.title || '---'}
                    </div>
                    {(item.code || item.size) && (
                      <div className="text-[8.5px] font-semibold text-black/80 mt-0.5">
                        {[item.code ? `Code: ${item.code}` : '', item.size ? `Size: ${item.size}` : '']
                          .filter(Boolean)
                          .join(' | ')}
                      </div>
                    )}
                  </td>
                  <td className="py-1.5 text-center font-bold tabular-nums">{item.quantity}</td>
                  <td className="py-1.5 text-right font-semibold tabular-nums whitespace-nowrap">
                    {item.price.toLocaleString('en-US')}
                  </td>
                  <td className="py-1.5 text-right font-black tabular-nums whitespace-nowrap">
                    {(item.quantity * item.price).toLocaleString('en-US')}৳
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Totals */}
      <div className="py-1.5 space-y-1 border-b border-dashed border-black tabular-nums">
        <div className="flex justify-between items-center font-bold">
          <span>Subtotal:</span>
          <span>{subtotal.toLocaleString('en-US')} ৳</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between items-center font-bold">
            <span>{discountLabel}:</span>
            <span>-{discountAmount.toLocaleString('en-US')} ৳</span>
          </div>
        )}
        {shippingCharge > 0 && (
          <div className="flex justify-between items-center font-bold">
            <span>{shippingLabel}:</span>
            <span>+{shippingCharge.toLocaleString('en-US')} ৳</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-1 mt-1 border-t-2 border-black font-black">
          <span className={is58 ? 'text-[11px]' : 'text-[12.5px]'}>NET TOTAL:</span>
          <span className={is58 ? 'text-[13px]' : 'text-[15px]'}>
            {netTotal.toLocaleString('en-US')} ৳
          </span>
        </div>
      </div>

      {/* Footer Note */}
      <div className="pt-2 text-center space-y-1">
        <p className={`${is58 ? 'text-[8.5px]' : 'text-[9.5px]'} font-bold leading-snug break-words`}>
          {noteText}
        </p>
        <p className="text-[9px] font-black uppercase tracking-widest pt-0.5">
          *** {brandName} ***
        </p>
      </div>
    </div>
  );
});
ThermalReceipt.displayName = 'ThermalReceipt';
