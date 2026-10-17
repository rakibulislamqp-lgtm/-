export interface CustomerUser {
  id: string;
  name: string;
  phone: string;
  password?: string;
  email?: string;
  address?: string;
  district?: string;
  upazila?: string;
  createdAt: string;
  updatedAt?: string;
  avatarUrl?: string;
  source?: 'registration' | 'checkout_auto' | 'admin_imported';
}

export interface CustomerAnnouncement {
  id: string;
  title: string;
  message: string;
  couponCode?: string;
  badge?: string; // e.g., "HOT OFFER", "EID SPECIAL", "NEW ARRIVAL"
  badgeText?: string;
  link?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type Category = 'THREE PIECE' | 'SAREE' | 'OTHERS' | string;

export interface ProductCategoryItem {
  id: string;
  name: string;
  slug?: string;
  icon?: string;
  isDefault?: boolean;
  productCount?: number;
}
export type Size = 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'Free Size';
export type DeliveryOption = 'Home Delivery' | 'Courier Pickup';
export type DeliveryArea = 'Inside Dhaka' | 'Outside Dhaka';
export type PaymentMethod = 'Cash On Delivery' | 'bKash' | 'Nagad' | 'Rocket';
export type OrderStatus = 'Pending' | 'Confirmed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface CartItem {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  productCode: string;
  category: Category;
  price: number;
  quantity: number;
  size: string;
}

export interface Order {
  id?: string;
  orderId: string;
  customerName: string;
  mobileNumber: string;
  address: string;
  district: string;
  upazila: string;
  category: Category; // Keep for legacy/main category
  productCode: string; // Keep for legacy/main code
  quantity: number;    // Keep for legacy/total count
  price: number;       // Keep for legacy/base price
  items?: CartItem[];
  deliveryCharge: number;
  totalAmount: number;
  discount?: number;
  discountAmount?: number;
  discountType?: 'percentage' | 'flat';
  deliveryOption: DeliveryOption;
  deliveryArea: DeliveryArea;
  paymentMethod: PaymentMethod;
  sessionId?: string;
  transactionId?: string;
  paymentScreenshotUrl?: string;
  productScreenshotUrl?: string;
  status: OrderStatus;
  note?: string;
  createdAt: string;
  date?: string;
  productId?: string;
  productImage?: string;
  courierId?: string;
  courierTrackingCode?: string;
  courierStatus?: string;
  cancelReason?: string;
  confirmedAt?: string;
  // Fraud & Security Shield Fields
  riskLevel?: 'safe' | 'medium' | 'high';
  fraudScore?: number; // 0 (100% safe) to 100 (100% fake)
  deliverySuccessRate?: number; // e.g. 92%
  totalCourierOrders?: number;
  courierReturnRate?: number;
  riskReason?: string;
  ipAddress?: string;
  deviceFingerprint?: string;
  isBlacklisted?: boolean;
  isBotAttack?: boolean;
  // Referral & Loyalty Tracking Fields
  referralCodeUsed?: string;
  referrerPhone?: string;
  isRepeatCustomer?: boolean;
  customerOrderIndex?: number;
  referralDiscountAmount?: number;
  repeatDiscountAmount?: number;
}

export interface Product {
  id?: string;
  title: string;
  brand?: string;
  description: string;
  price: number;
  imageUrl: string;
  videoUrl?: string;
  category: Category;
  productCode: string;
  stock: number;
  discount?: number;
  isActive: boolean;
  createdAt: string;
  initialSalesCount?: number;
}

export interface BannerItem {
  id: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  buttonText?: string;
  categoryLink?: Category | 'ALL';
  desktopImageUrl: string;
  mobileImageUrl?: string;
  isActive: boolean;
  order: number;
}

export interface FooterSettings {
  brandName?: string;
  tagline?: string;
  subTagline?: string;
  address?: string;
  phone?: string;
  email?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  whatsappNumber?: string;
  showAppDownload?: boolean;
  playStoreUrl?: string;
  appStoreUrl?: string;
  showPaymentBadges?: boolean;
  paymentSectionTitle?: string;
  copyrightText?: string;
  aboutUsText?: string;
  deliveryInfoText?: string;
  returnPolicyText?: string;
  companyInfoText?: string;
  termsText?: string;
  privacyText?: string;
}

export interface BrandSettings {
  updatedAt?: string;
  logoUrl?: string;
  invoiceLogoUrl?: string;
  footerLogoUrl?: string;
  heroLogoUrl?: string;
  socialLogoUrl?: string;
  faviconUrl?: string;
  facebookUrl?: string;
  telegramToken?: string;
  telegramChatId?: string;
  soundEnabled?: boolean;
  pushEnabled?: boolean;
  steadfastApiKey?: string;
  steadfastSecretKey?: string;
  steadfastMerchantId?: string;
  pathaoClientId?: string;
  pathaoClientSecret?: string;
  pathaoUsername?: string;
  pathaoPassword?: string;
  pathaoStoreId?: string;
  pathaoAccessToken?: string;
  smsGateway?: 'device' | 'greenweb' | 'elitbuzz' | 'mimsms' | 'twilio';
  smsGreenwebToken?: string;
  smsElitbuzzApiKey?: string;
  smsElitbuzzSenderId?: string;
  smsMimsmsApiKey?: string;
  smsMimsmsSenderId?: string;
  smsTwilioSid?: string;
  smsTwilioAuthToken?: string;
  smsTwilioFrom?: string;
  retargetingBannerEnabled?: boolean;
  retargetingBannerText?: string;
  retargetingCouponCode?: string;
  retargetingPopupEnabled?: boolean;
  retargetingPopupOfferText?: string;
  metaPixelEnabled?: boolean;
  metaPixelId?: string;
  metaAccessToken?: string;
  metaTestEventCode?: string;
  metaAdvancedMatchingEnabled?: boolean;
  metaOnlyConfirmedOrders?: boolean; // When true, ONLY send data to Facebook (Meta Pixel & CAPI) when real order is confirmed. Blocks PageView, ViewContent, AddToCart, InitiateCheckout, and fake test data from Facebook.
  googleTagManagerId?: string;
  googleAnalyticsId?: string;
  ga4ApiSecret?: string;
  tiktokPixelEnabled?: boolean;
  tiktokPixelId?: string;
  microsoftClarityId?: string;
  googleSearchConsoleCode?: string;
  lookerStudioEnabled?: boolean;
  lookerStudioApiKey?: string;
  // Anti-Fraud & Spam Shield Settings
  fraudShieldEnabled?: boolean;
  maxOrdersPerIp?: number;
  rateLimitCooldownSeconds?: number;
  blockGibberishAddresses?: boolean;
  requireAdvanceForHighRisk?: boolean;
  highRiskReturnThreshold?: number; // e.g., 40% return rate
  blacklistedPhones?: string[];
  blacklistedIps?: string[];
  banners?: BannerItem[];
  bannerAutoSlideInterval?: number;
  categories?: ProductCategoryItem[];
  footer?: FooterSettings;
  // Live Customer Order Notification & Floating Orb Controls
  orderNotificationEnabled?: boolean; // Master switch: true = active, false = totally disabled
  orderNotificationDisplayMode?: 'popup_and_circle' | 'circle_badge_only' | 'disabled'; // popup card + circle, circle only with counter, or disabled
  orderNotificationDataSource?: 'only_real' | 'mixed'; // 'only_real': show only real buying customers, 'mixed': real + verified fallback
  orderNotificationDuration?: number; // seconds to display popup (e.g. 4, 5, 7)
  orderNotificationInterval?: number; // interval between popups in seconds (e.g. 15, 20, 30)
  orderNotificationSize?: 'compact' | 'standard'; // 'compact' = mini sleek popup, 'standard' = standard card
  // Customer Referral & Repeat Loyalty Settings
  referralProgramEnabled?: boolean;
  referralFriendDiscount?: number; // ৳ discount for the friend (default ৳50)
  referralBonusAmount?: number; // ৳ bonus credited to the referrer (default ৳100)
  repeatCustomerOfferEnabled?: boolean;
  repeatCustomer2ndOrderDiscount?: number; // ৳ discount on 2nd purchase (default ৳50)
  repeatCustomer3rdOrderDiscount?: number; // ৳ discount on 3rd+ purchase (default ৳100)
  repeatCustomerOfferBannerText?: string;
}

export interface ProductView {
  productCode: string;
  productTitle: string;
  category: string;
  price: number;
  imageUrl: string;
  viewedAt: string;
}

export type VisitorStage = 'browsing_home' | 'product_view' | 'added_to_cart' | 'filling_checkout' | 'order_completed';

export interface TrackingEvent {
  id: string;
  type: 'click' | 'scroll' | 'input' | 'page_view' | 'system' | 'input_focus' | 'typing';
  description: string;
  target: string;
  path: string; // "home" | "product_details" | "checkout" | "completed"
  scrollDepth?: number;
  timestamp: string;
  elapsedTime: number; // seconds since start
}

export interface VisitorSession {
  id?: string;
  sessionId: string;
  idSuffix?: string;
  customerName: string;
  mobileNumber: string;
  district?: string;
  upazila?: string;
  address?: string;
  deviceInfo: string;
  device?: string;
  browser?: string;
  startedAt?: string;
  currentStage: VisitorStage;
  currentStageLabel: string;
  highestStage?: VisitorStage;
  highestStageLabel?: string;
  views: ProductView[];
  events?: TrackingEvent[];
  createdAt: string;
  lastActiveAt: string;
  hasSpun?: boolean;
  wonCouponCode?: string;
  wonCouponLabel?: string;
  wonCouponDiscount?: number;
}
