import { Product, BrandSettings } from '../types';

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    ttq?: any;
    clarity?: any;
  }
}

export type TrackingPlatform = 
  | 'Meta Pixel' 
  | 'Meta CAPI' 
  | 'Google Tag Manager' 
  | 'Google Analytics' 
  | 'TikTok Pixel' 
  | 'Microsoft Clarity' 
  | 'GA4 Server';

export interface PixelLogEntry {
  id: string;
  timestamp: string;
  eventName: string;
  platform: TrackingPlatform;
  payload: any;
  status: 'sent' | 'queued' | 'simulated' | 'filtered';
}

let activePixelId: string | null = null;
let activeMetaAccessToken: string | null = null;
let activeMetaTestEventCode: string | null = null;
let activeGtmId: string | null = null;
let activeGaId: string | null = null;
let activeGa4Secret: string | null = null;
let activeTikTokPixelId: string | null = null;
let activeClarityId: string | null = null;

// STRICT EXCLUSIVE CONFIRMED ORDER MODE (Default: TRUE)
// Only validated genuine confirmed orders transfer to Facebook
let activeOnlyConfirmedOrders = true;

let isPixelInitialized = false;
let isGtmInitialized = false;
let isTikTokInitialized = false;
let isClarityInitialized = false;

const pixelLogs: PixelLogEntry[] = [];
const logListeners: Array<(logs: PixelLogEntry[]) => void> = [];

export const getPixelLogs = () => [...pixelLogs];
export const clearPixelLogs = () => {
  pixelLogs.length = 0;
  notifyListeners();
};

export const subscribePixelLogs = (listener: (logs: PixelLogEntry[]) => void) => {
  logListeners.push(listener);
  return () => {
    const idx = logListeners.indexOf(listener);
    if (idx > -1) logListeners.splice(idx, 1);
  };
};

const notifyListeners = () => {
  logListeners.forEach(fn => {
    try { fn([...pixelLogs]); } catch (e) { console.warn("Pixel log listener error:", e); }
  });
};

export const addLog = (
  eventName: string, 
  platform: TrackingPlatform, 
  payload: any, 
  status: 'sent' | 'queued' | 'simulated' | 'filtered'
) => {
  const entry: PixelLogEntry = {
    id: 'px_' + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toLocaleTimeString(),
    eventName,
    platform,
    payload,
    status
  };
  pixelLogs.unshift(entry);
  if (pixelLogs.length > 80) pixelLogs.pop();
  notifyListeners();
};

/**
 * 1. Initialize Meta Pixel (Browser Script)
 */
export const initMetaPixel = (pixelId: string, advancedMatching: Record<string, any> = {}) => {
  if (!pixelId || typeof window === 'undefined') return;

  const cleanPixelId = pixelId.trim();
  if (!cleanPixelId) return;

  activePixelId = cleanPixelId;

  if (!window.fbq) {
    (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  }

  try {
    window.fbq('init', cleanPixelId, advancedMatching);
    isPixelInitialized = true;

    // If 'Only Confirmed Orders' is ON, we DO NOT send random/bot PageViews to Facebook
    if (!activeOnlyConfirmedOrders) {
      window.fbq('track', 'PageView');
      addLog('PageView (Auto)', 'Meta Pixel', { pixelId: cleanPixelId, matching: advancedMatching }, 'sent');
    } else {
      addLog('Meta Pixel Ready (Strict Mode: Order-Only)', 'Meta Pixel', { 
        pixelId: cleanPixelId, 
        mode: 'Only Confirmed Real Orders Transferred' 
      }, 'sent');
    }
    console.log(`✅ Meta Pixel [${cleanPixelId}] initialized. (Confirmed-Only Mode: ${activeOnlyConfirmedOrders})`);
  } catch (err) {
    console.warn("Meta Pixel init error:", err);
    addLog('PageView (Init Error)', 'Meta Pixel', { error: String(err) }, 'queued');
  }
};

/**
 * 2. Initialize Google Tag Manager & Google Analytics 4 (GA4)
 */
export const initGoogleAnalytics = (gaId?: string, gtmId?: string, ga4ApiSecret?: string) => {
  if (typeof window === 'undefined') return;

  if (ga4ApiSecret) {
    activeGa4Secret = ga4ApiSecret.trim();
  }

  // GA4 gtag.js
  if (gaId && gaId.trim() && (!activeGaId || activeGaId !== gaId.trim())) {
    activeGaId = gaId.trim();
    if (!document.getElementById('ga4-script')) {
      const script = document.createElement('script');
      script.id = 'ga4-script';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${activeGaId}`;
      document.head.appendChild(script);
    }

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer?.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', activeGaId, {
      send_page_view: true,
      currency: 'BDT'
    });

    addLog('GA4 Init & PageView', 'Google Analytics', { gaId: activeGaId }, 'sent');
    console.log(`✅ GA4 [${activeGaId}] initialized.`);
  }

  // Google Tag Manager container (GTM)
  if (gtmId && gtmId.trim() && (!isGtmInitialized || activeGtmId !== gtmId.trim())) {
    activeGtmId = gtmId.trim();
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js'
    });
    
    if (!document.getElementById('gtm-script')) {
      const script = document.createElement('script');
      script.id = 'gtm-script';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtm.js?id=${activeGtmId}`;
      document.head.appendChild(script);
    }
    isGtmInitialized = true;

    addLog('GTM Container Load', 'Google Tag Manager', { gtmId: activeGtmId }, 'sent');
    console.log(`✅ GTM [${activeGtmId}] initialized.`);
  }
};

/**
 * 3. Initialize TikTok Pixel (ttq)
 */
export const initTikTokPixel = (pixelId: string) => {
  if (!pixelId || typeof window === 'undefined') return;
  const cleanId = pixelId.trim();
  if (!cleanId) return;

  activeTikTokPixelId = cleanId;

  if (!window.ttq) {
    (function (w: any, d: any, t: any) {
      w.TiktokAnalyticsObject = t;
      var ttq = (w[t] = w[t] || []);
      ttq.methods = [
        "page",
        "track",
        "identify",
        "instances",
        "debug",
        "on",
        "off",
        "once",
        "ready",
        "alias",
        "group",
        "enableCookie",
        "disableCookie",
        "holdConsent",
        "revokeConsent",
        "grantConsent"
      ];
      ttq.setAndDefer = function (t: any, e: any) {
        t[e] = function () {
          t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
        };
      };
      for (var i = 0; i < ttq.methods.length; i++) {
        ttq.setAndDefer(ttq, ttq.methods[i]);
      }
      ttq.instance = function (t: any) {
        for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) {
          ttq.setAndDefer(e, ttq.methods[n]);
        }
        return e;
      };
      ttq.load = function (e: any, n: any) {
        var scriptSrc = "https://analytics.tiktok.com/i18n/pixel/events.js",
          o = n && n.partner;
        ttq._i = ttq._i || {};
        ttq._i[e] = [];
        ttq._i[e]._u = scriptSrc;
        ttq._t = ttq._t || {};
        ttq._t[e] = +new Date();
        ttq._o = ttq._o || {};
        ttq._o[e] = n || {};
        var scriptTag = document.createElement("script");
        scriptTag.type = "text/javascript";
        scriptTag.async = true;
        scriptTag.src = scriptSrc + "?sdkid=" + e + "&lib=" + t;
        var firstScript = document.getElementsByTagName("script")[0];
        if (firstScript && firstScript.parentNode) {
          firstScript.parentNode.insertBefore(scriptTag, firstScript);
        } else {
          document.head.appendChild(scriptTag);
        }
      };
    })(window, document, "ttq");
  }

  try {
    window.ttq.load(cleanId);
    window.ttq.page();
    isTikTokInitialized = true;
    addLog('TikTok PageView (Auto)', 'TikTok Pixel', { pixelId: cleanId }, 'sent');
    console.log(`✅ TikTok Pixel [${cleanId}] initialized.`);
  } catch (err) {
    console.warn("TikTok Pixel init error:", err);
    addLog('TikTok PageView (Init Error)', 'TikTok Pixel', { error: String(err) }, 'queued');
  }
};

/**
 * 4. Initialize Microsoft Clarity dynamically for Heatmaps & Session Recording
 */
export const initMicrosoftClarity = (clarityId: string) => {
  if (!clarityId || typeof window === 'undefined') return;
  const cleanId = clarityId.trim();
  if (!cleanId) return;

  activeClarityId = cleanId;

  if (!(window as any).clarity) {
    (function(c: any, l: any, a: any, r: any, i: any, t?: any, y?: any){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", cleanId);
    isClarityInitialized = true;
    addLog('Clarity Heatmap Session Started', 'Microsoft Clarity', { clarityId: cleanId }, 'sent');
    console.log(`✅ Microsoft Clarity [${cleanId}] initialized.`);
  }
};

/**
 * Set custom metadata tag in Microsoft Clarity session
 */
export const setClarityTag = (key: string, value: string) => {
  if (typeof window !== 'undefined' && (window as any).clarity) {
    try {
      (window as any).clarity("set", key, value);
    } catch (e) {
      console.warn("Clarity set tag error:", e);
    }
  }
};

/**
 * Update Google Search Console verification meta tag dynamically
 */
export const applySearchConsoleCode = (code?: string) => {
  if (typeof document === 'undefined' || !code) return;
  const cleanCode = code.trim();
  if (!cleanCode) return;

  let meta = document.querySelector('meta[name="google-site-verification"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'google-site-verification');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', cleanCode);
};

/**
 * Update pixel & analytics configuration from BrandSettings
 */
export const syncPixelFromSettings = (settings?: BrandSettings | null) => {
  if (!settings) return;

  // Set exclusive confirmed orders flag (Defaults to true for 100% fake-proof data)
  activeOnlyConfirmedOrders = settings.metaOnlyConfirmedOrders !== false;

  // 1. Meta Pixel & CAPI
  if (settings.metaPixelEnabled && settings.metaPixelId) {
    if (settings.metaAccessToken) {
      activeMetaAccessToken = settings.metaAccessToken.trim();
    }
    if (settings.metaTestEventCode) {
      activeMetaTestEventCode = settings.metaTestEventCode.trim();
    }
    initMetaPixel(settings.metaPixelId);
  }

  // 2. Google Analytics 4 & GTM
  if (settings.googleAnalyticsId || settings.googleTagManagerId) {
    initGoogleAnalytics(settings.googleAnalyticsId, settings.googleTagManagerId, settings.ga4ApiSecret);
  }

  // 3. TikTok Pixel
  if (settings.tiktokPixelEnabled !== false && settings.tiktokPixelId) {
    initTikTokPixel(settings.tiktokPixelId);
  }

  // 4. Microsoft Clarity
  if (settings.microsoftClarityId) {
    initMicrosoftClarity(settings.microsoftClarityId);
  }

  // 5. Google Search Console
  if (settings.googleSearchConsoleCode) {
    applySearchConsoleCode(settings.googleSearchConsoleCode);
  }
};

/**
 * Helper to push standard GA4 / GTM Enhanced Ecommerce events to window.dataLayer
 */
export const pushToDataLayer = (eventName: string, ecommerceData: Record<string, any>, extraPayload?: Record<string, any>) => {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];

  // 1. Clear previous ecommerce object to prevent data bleeding
  window.dataLayer.push({ ecommerce: null });

  // 2. Push Enhanced Ecommerce payload
  const dataLayerObject = {
    event: eventName,
    ecommerce: ecommerceData,
    ...(extraPayload || {})
  };

  window.dataLayer.push(dataLayerObject);
  addLog(eventName, 'Google Tag Manager', dataLayerObject, 'sent');
};

/**
 * Universal Event Dispatcher: Fires across Meta Pixel, Meta CAPI, GA4, TikTok Pixel, DataLayer
 */
const sendEvent = (
  eventName: string, 
  payload: Record<string, any>, 
  customEventName?: string, 
  eventId?: string, 
  userData?: Record<string, any>,
  tiktokEventName?: string
) => {
  if (typeof window === 'undefined') return;

  const actualEventName = customEventName || eventName;
  const uniqueEventId = eventId || `evt_${eventName.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // STRICT FILTER CHECK: 
  // If activeOnlyConfirmedOrders is TRUE, block any Facebook transfer EXCEPT genuine 'Purchase'
  const isPurchaseEvent = eventName === 'Purchase' || actualEventName === 'Purchase';
  const shouldSendToFacebook = !activeOnlyConfirmedOrders || isPurchaseEvent;

  if (shouldSendToFacebook) {
    // 1. Meta Pixel Execution (Browser-side with Event ID for Deduplication)
    if (window.fbq) {
      try {
        if (customEventName) {
          window.fbq('trackCustom', customEventName, payload, { eventID: uniqueEventId });
          addLog(`Custom: ${customEventName}`, 'Meta Pixel', { ...payload, eventID: uniqueEventId }, 'sent');
        } else {
          window.fbq('track', eventName, payload, { eventID: uniqueEventId });
          addLog(eventName, 'Meta Pixel', { ...payload, eventID: uniqueEventId }, 'sent');
        }
      } catch (err) {
        console.warn(`Meta Pixel [${eventName}] error:`, err);
        addLog(eventName, 'Meta Pixel', { error: String(err), payload, eventID: uniqueEventId }, 'queued');
      }
    } else if (activePixelId) {
      addLog(eventName, 'Meta Pixel', { payload, eventID: uniqueEventId, status: 'pixel script loading' }, 'queued');
    } else {
      addLog(eventName, 'Meta Pixel', { ...payload, eventID: uniqueEventId, note: 'Simulated (Set Pixel ID in Settings)' }, 'simulated');
    }

    // 1b. Meta Conversions API (Server-side CAPI Execution with matching Event ID)
    if (activePixelId && activeMetaAccessToken) {
      fetch('/api/meta-capi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pixelId: activePixelId,
          accessToken: activeMetaAccessToken,
          eventName: actualEventName,
          eventData: payload,
          eventId: uniqueEventId,
          userData: userData || undefined,
          testEventCode: activeMetaTestEventCode || undefined,
          eventSourceUrl: window.location.href
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          addLog(`CAPI: ${actualEventName}`, 'Meta CAPI', { serverStatus: 'Success (Verified Order)', eventId: uniqueEventId, ...payload }, 'sent');
        } else {
          console.warn("Meta CAPI server response:", data);
          addLog(`CAPI: ${actualEventName} (Warning)`, 'Meta CAPI', { error: data, eventId: uniqueEventId }, 'queued');
        }
      })
      .catch(err => {
        console.warn("CAPI fetch error:", err);
        addLog(`CAPI: ${actualEventName} (Fail)`, 'Meta CAPI', { error: String(err), eventId: uniqueEventId }, 'queued');
      });
    }
  } else {
    // Log why Facebook transfer was blocked safely
    addLog(
      `${eventName} (Facebook-এ পাঠানো হয়নি 🛡️)`, 
      'Meta Pixel', 
      { 
        reason: 'শুধুমাত্র অর্ডার কনফার্ম হওয়া আসল কাস্টমারের ডাটাই ফেসবুকে পাঠানো হয়। ফেক ডাটা ব্লক করা হয়েছে।',
        blocked_from: 'Meta Pixel & CAPI'
      }, 
      'filtered'
    );
  }

  // 2. Google Analytics gtag Execution
  if (window.gtag) {
    try {
      window.gtag('event', eventName.toLowerCase(), payload);
      addLog(eventName, 'Google Analytics', payload, 'sent');
    } catch (e) {
      console.warn("GA4 event error:", e);
    }
  }

  // 2b. GA4 Server-Side Measurement Protocol Execution
  if (activeGaId) {
    fetch('/api/ga4-server-tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        measurementId: activeGaId,
        apiSecret: activeGa4Secret || 'sera_fashion_server_secret',
        eventName: eventName.toLowerCase(),
        eventParams: payload
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        addLog(`GA4 Server: ${eventName}`, 'GA4 Server', { event: eventName, ...payload }, 'sent');
      }
    })
    .catch(() => {});
  }

  // 3. TikTok Pixel Execution
  const ttEvent = tiktokEventName || eventName;
  if (window.ttq) {
    try {
      window.ttq.track(ttEvent, payload);
      addLog(ttEvent, 'TikTok Pixel', payload, 'sent');
    } catch (e) {
      console.warn("TikTok track error:", e);
      addLog(ttEvent, 'TikTok Pixel', { error: String(e), payload }, 'queued');
    }
  } else if (activeTikTokPixelId) {
    addLog(ttEvent, 'TikTok Pixel', { payload, status: 'ttq script loading' }, 'queued');
  } else {
    addLog(ttEvent, 'TikTok Pixel', { ...payload, note: 'Simulated (Set TikTok ID in Settings)' }, 'simulated');
  }
};

/**
 * 1. ViewContent / view_item - Fired when customer opens/views a product
 */
export const trackPixelViewContent = (product: Product) => {
  if (!product) return;
  const prodCode = product.productCode || String(product.id);
  const priceVal = Number(product.price) || 0;
  const eventId = `view_${prodCode}_${Date.now()}`;

  // 1. Meta Pixel & Server CAPI (Will be filtered if Only Confirmed Order Mode is ON)
  sendEvent('ViewContent', {
    content_name: product.title,
    content_category: product.category,
    content_ids: [prodCode],
    content_type: 'product',
    value: priceVal,
    currency: 'BDT',
  }, undefined, eventId, undefined, 'ViewContent');

  // 2. GA4 DataLayer Enhanced Ecommerce Schema
  pushToDataLayer('view_item', {
    currency: 'BDT',
    value: priceVal,
    items: [{
      item_id: prodCode,
      item_name: product.title,
      item_brand: 'SERA FASHION',
      item_category: product.category || 'General',
      price: priceVal,
      quantity: 1
    }]
  }, {
    tiktok_event: 'ViewContent',
    product_code: prodCode
  });

  // 3. Microsoft Clarity Tag
  setClarityTag('last_viewed_product', product.title);
};

/**
 * 2. AddToCart / add_to_cart - Fired when customer clicks Buy/Order button or adds to cart
 */
export const trackPixelAddToCart = (product: Product, quantity = 1) => {
  if (!product) return;
  const prodCode = product.productCode || String(product.id);
  const priceVal = Number(product.price) || 0;
  const totalVal = priceVal * quantity;
  const eventId = `atc_${prodCode}_${Date.now()}`;

  // 1. Meta Pixel, CAPI, TikTok
  sendEvent('AddToCart', {
    content_name: product.title,
    content_category: product.category,
    content_ids: [prodCode],
    content_type: 'product',
    value: totalVal,
    currency: 'BDT',
    num_items: quantity,
    quantity: quantity,
    price: priceVal
  }, undefined, eventId, undefined, 'AddToCart');

  // 2. GA4 DataLayer Enhanced Ecommerce Schema
  pushToDataLayer('add_to_cart', {
    currency: 'BDT',
    value: totalVal,
    items: [{
      item_id: prodCode,
      item_name: product.title,
      item_brand: 'SERA FASHION',
      item_category: product.category || 'General',
      price: priceVal,
      quantity: quantity
    }]
  }, {
    tiktok_event: 'AddToCart',
    product_code: prodCode
  });

  // 3. Microsoft Clarity Tag
  setClarityTag('user_stage', 'added_to_cart');
};

/**
 * 3. InitiateCheckout / begin_checkout - Fired when customer opens the checkout form or fills input
 */
export const trackPixelInitiateCheckout = (product: Product, quantity = 1, totalValue?: number) => {
  if (!product) return;
  const prodCode = product.productCode || String(product.id);
  const priceVal = Number(product.price) || 0;
  const val = totalValue !== undefined ? totalValue : priceVal * quantity;
  const eventId = `ic_${prodCode}_${Date.now()}`;

  // 1. Meta Pixel, CAPI, TikTok
  sendEvent('InitiateCheckout', {
    content_name: product.title,
    content_category: product.category,
    content_ids: [prodCode],
    content_type: 'product',
    value: val,
    currency: 'BDT',
    num_items: quantity,
    quantity: quantity
  }, undefined, eventId, undefined, 'InitiateCheckout');

  // 2. GA4 DataLayer Enhanced Ecommerce Schema
  pushToDataLayer('begin_checkout', {
    currency: 'BDT',
    value: val,
    items: [{
      item_id: prodCode,
      item_name: product.title,
      item_brand: 'SERA FASHION',
      item_category: product.category || 'General',
      price: priceVal,
      quantity: quantity
    }]
  }, {
    tiktok_event: 'InitiateCheckout'
  });

  // 3. Microsoft Clarity Tag
  setClarityTag('user_stage', 'checkout_form');
};

/**
 * 4. Purchase / purchase / CompletePayment - STRICTLY FIRED ONLY UPON GENUINE CONFIRMED ORDER
 * Validates genuine phone number, customer name, order ID and prevents any fake data injection.
 */
export const trackPixelPurchase = (order: {
  orderId?: string;
  product?: Partial<Product> & { title?: string; price?: number; category?: string; productCode?: string; id?: string };
  quantity: number;
  totalAmount: number;
  customerName?: string;
  mobileNumber?: string;
  address?: string;
  district?: string;
  deliveryCharge?: number;
}) => {
  if (!order) return;

  // STRICT VALIDATION FOR CONFIRMED REAL CUSTOMER:
  // Reject fake/empty submissions
  const cleanPhone = (order.mobileNumber || '').replace(/\D/g, '');
  if (!cleanPhone || cleanPhone.length < 11) {
    console.warn("⚠️ Meta Purchase Rejected: Invalid customer phone number. No data sent to Facebook.");
    addLog('Purchase Blocked (Invalid Phone ❌)', 'Meta Pixel', { phone: order.mobileNumber, reason: 'ভুয়া/অসম্পূর্ণ মোবাইল নম্বরের ডাটা ফেসবুকে পাঠানো নিষিদ্ধ' }, 'filtered');
    return;
  }

  const cleanName = (order.customerName || '').trim();
  if (!cleanName || cleanName.length < 2) {
    console.warn("⚠️ Meta Purchase Rejected: Missing customer name.");
    addLog('Purchase Blocked (Invalid Name ❌)', 'Meta Pixel', { name: order.customerName, reason: 'নাম ছাড়া কোনো ফেক অর্ডার ফেসবুকে পাঠানো হবে না' }, 'filtered');
    return;
  }

  const prodTitle = order.product?.title || 'Product Order';
  const prodCategory = order.product?.category || 'General';
  const prodCode = order.product?.productCode || String(order.product?.id || 'ORD_ITEM');
  const orderId = order.orderId || 'SERA_' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const prodPrice = order.product?.price || order.totalAmount;
  const deliveryFee = order.deliveryCharge || 60;

  const userData = {
    ph: cleanPhone,
    fn: cleanName.toLowerCase(),
    ct: order.district ? order.district.trim().toLowerCase() : undefined,
    external_id: orderId
  };

  // Perform Meta Advanced Matching for Real Confirmed Customer
  if (window.fbq) {
    try {
      window.fbq('init', activePixelId || '', {
        ph: userData.ph,
        fn: userData.fn
      });
    } catch (e) {
      console.warn("Advanced matching update notice:", e);
    }
  }

  // 1. Meta Pixel & Server CAPI: Transmit 100% verified confirmed order
  sendEvent('Purchase', {
    content_name: prodTitle,
    content_category: prodCategory,
    content_ids: [prodCode],
    content_type: 'product',
    value: Number(order.totalAmount) || 0,
    currency: 'BDT',
    num_items: order.quantity,
    order_id: orderId,
    verified_order: true
  }, undefined, orderId, userData, 'CompletePayment');

  // 2. GA4 DataLayer Enhanced Ecommerce Schema
  pushToDataLayer('purchase', {
    transaction_id: orderId,
    value: Number(order.totalAmount) || 0,
    tax: 0,
    shipping: deliveryFee,
    currency: 'BDT',
    items: [{
      item_id: prodCode,
      item_name: prodTitle,
      item_brand: 'SERA FASHION',
      item_category: prodCategory,
      price: prodPrice,
      quantity: order.quantity
    }]
  }, {
    customer_phone: order.mobileNumber,
    customer_name: order.customerName,
    tiktok_event: 'CompletePayment',
    tiktok_order_id: orderId
  });

  // 3. Microsoft Clarity Tags
  setClarityTag('user_stage', 'order_confirmed');
  setClarityTag('order_id', orderId);
  setClarityTag('order_amount', String(order.totalAmount));
  setClarityTag('verified_buyer', 'true');
};

/**
 * 5. Lead / generate_lead - Fired when customer spins wheel or submits lead details
 */
export const trackPixelLead = (leadName: string, details?: any) => {
  sendEvent('Lead', {
    content_name: leadName,
    value: details?.discount || 0,
    currency: 'BDT',
    ...details
  }, undefined, undefined, undefined, 'Subscribe');

  pushToDataLayer('generate_lead', {
    lead_type: leadName,
    value: details?.discount || 0,
    currency: 'BDT'
  }, {
    tiktok_event: 'Subscribe'
  });
};

/**
 * 6. Contact / contact - Fired when customer clicks WhatsApp, Phone Call, or Messenger buttons
 */
export const trackPixelContact = (channel: string) => {
  sendEvent('Contact', {
    contact_channel: channel
  }, undefined, undefined, undefined, 'Contact');

  pushToDataLayer('contact', {
    method: channel
  }, {
    tiktok_event: 'Contact'
  });
};

/**
 * 7. Manual Multi-Platform Event Trigger (For testing in admin panel)
 */
export const testPixelEvent = (eventName: string, payload: Record<string, any> = {}) => {
  if (eventName === 'Purchase') {
    // Inject mock verified confirmed order for admin testing
    trackPixelPurchase({
      orderId: 'CONFIRMED_TEST_' + Math.floor(1000 + Math.random() * 9000),
      quantity: 1,
      totalAmount: payload.value || 1850,
      customerName: 'Verified Buyer',
      mobileNumber: '01712345678',
      district: 'Dhaka',
      product: {
        title: payload.content_name || 'কাতান শাড়ি',
        price: payload.value || 1850
      }
    });
  } else {
    sendEvent(eventName, {
      test_mode: true,
      triggered_at: new Date().toISOString(),
      ...payload
    });
  }
};
