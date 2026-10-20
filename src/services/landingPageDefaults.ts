import { LandingPageConfig } from '../types';

export const DEFAULT_LANDING_PAGE_CONFIG: LandingPageConfig = {
  enabled: true,
  pageTitle: 'স্পেশাল মেগা অফার — সেরা ফ্যাশন (SERA FASHION)',
  campaignBadge: 'লিমিটেড টাইম মেগা সেল ক্যাম্পেইন',

  // 1. Top Announcement
  showAnnouncementBar: true,
  announcementBadge: 'মেগা ছাড় অফার চলছে!',
  announcementText: 'আজকের অর্ডারে পাচ্ছেন নিশ্চিত ক্যাশব্যাক ও ফ্ল্যাট ডিসকাউন্ট',

  // 2. Hero Section
  showHero: true,
  heroBadge: 'এক্সক্লুসিভ কালেকশন',
  heroTitle: 'সেরা ফ্যাশন মেগা ডিসকাউন্ট সেল',
  heroSubtitle: 'আসল প্রিমিয়াম থ্রি-পিস ও ট্র্যাডিশনাল ঢাকাই শাড়ির সমাহার। সীমিত সময়ের বিশেষ মূল্যছাড় ও সারা দেশে দ্রুত ক্যাশ অন ডেলিভারি!',
  heroCtaText: 'অফার উপভোগ করুন',
  heroBgGlow: true,

  // 3. Countdown Timer
  showCountdown: true,
  countdownType: 'cycle',
  countdownHours: 14,
  countdownLabel: 'অফার শেষ হতে বাকি:',

  // 4. Trust Badges
  showTrustBadges: true,
  trustItems: [
    {
      id: 'cod',
      title: 'ক্যাশ অন ডেলিভারি',
      subtitle: 'সারাদেশে পণ্য হাতে পেয়ে মূল্য পরিশোধের সুবিধা',
      iconName: 'Truck'
    },
    {
      id: 'parcel_check',
      title: 'পার্সেল দেখে নেওয়ার সুযোগ',
      subtitle: 'ডেলিভারি ম্যানের সামনে কাপড় চেক করতে পারবেন',
      iconName: 'ShieldCheck'
    },
    {
      id: 'authentic',
      title: '১০০% অরিজিনাল ফেব্রিক',
      subtitle: 'প্রিমিয়াম সুতি, সিল্ক ও ঢাকাই জামদানি নিশ্চয়তা',
      iconName: 'Award'
    },
    {
      id: 'exchange',
      title: '৭ দিনের সহজ এক্সচেঞ্জ',
      subtitle: 'সাইজ বা ফিটিং সমস্যা হলে দ্রুত পরিবর্তনের সুবিধা',
      iconName: 'RotateCcw'
    }
  ],

  // 5. Products Showcase
  showProducts: true,
  productsTitle: 'অফার স্পেশাল কালেকশন',
  productsSubtitle: 'পছন্দের পোশাকটি বেছে নিয়ে সরাসরি অর্ডার করুন। সীমিত স্টক!',
  showCategoryFilters: true,
  defaultCategory: 'ALL',
  productSelectionMode: 'all_instock',
  selectedProductCodes: [],
  buyNowButtonText: 'Buy Now — সরাসরি অর্ডার',
  showStockBadge: true,
  showDiscountBadge: true,

  // 6. Delivery & Policies
  showPolicies: true,
  dhakaDeliveryCharge: '৳৮০',
  outsideDhakaDeliveryCharge: '৳১৩০',
  deliveryTimeDhaka: '২৪-৪৮ ঘণ্টা',
  deliveryTimeOutside: '২-৩ দিন',
  returnPolicyText: '৭ দিনের সহজ এক্সচেঞ্জ পলিসি',
  returnPolicyDescription: 'সাইজ অথবা ফেব্রিকে কোনো সমস্যা থাকলে ডেলিভারি পাওয়ার ৭ দিনের মধ্যে বিনামূল্যে পরিবর্তন করা যাবে।',
  paymentPolicyText: 'নিরাপদ ক্যাশ অন ডেলিভারি',
  paymentPolicyDescription: 'কোনো অগ্রিম পেমেন্ট ছাড়াই পণ্য হাতে পেয়ে টাকা দিন। এছাড়া বিকাশ বা নগদেও পেমেন্ট গ্রহণ করা হয়।',

  // 7. FAQs
  showFaq: true,
  faqTitle: 'সাধারণ জিজ্ঞাসা ও উত্তর (FAQ)',
  faqSubtitle: 'অর্ডার করার পূর্বে আপনার কোনো প্রশ্ন থাকলে নিচে দেখে নিন',
  faqItems: [
    {
      id: 'faq-1',
      question: 'কাপড়ের কোয়ালিটি ও ফেব্রিক কেমন হবে?',
      answer: 'আমাদের প্রতিটি পোশাক শতভাগ আসল সুতি, প্রিমিয়াম জর্জেট বা সিল্কের ওপর সূক্ষ্ম কারুকাজে তৈরি। ছবিতে যেমন দেখেছেন ঠিক তেমনই পাবেন, কোনো আপস নেই।'
    },
    {
      id: 'faq-2',
      question: 'হোম ডেলিভারি পেতে কতদিন সময় লাগবে?',
      answer: 'ঢাকা সিটির ভেতরে ২৪ থেকে ৪৮ ঘণ্টার মধ্যে এবং ঢাকার বাইরে ২ থেকে ৩ কর্মদিবসের মধ্যে আপনার দোরগোড়ায় পার্সেল পৌঁছে দেওয়া হবে।'
    },
    {
      id: 'faq-3',
      question: 'পণ্য পছন্দ না হলে বা সাইজ না মিললে কী হবে?',
      answer: 'ডেলিভারি ম্যানের সামনে পার্সেলটি চেক করতে পারবেন। কোনো ডিফেক্ট বা সাইজের অমিল থাকলে ৭ দিনের মধ্যে আমাদের জানালে কোনো ঝামেলা ছাড়াই এক্সচেঞ্জ করে দেওয়া হবে।'
    },
    {
      id: 'faq-4',
      question: 'অর্ডারের জন্য কি কোনো অগ্রিম টাকা দিতে হবে?',
      answer: 'না, সম্পূর্ণ ক্যাশ অন ডেলিভারি সুবিধা রয়েছে। পণ্য হাতে পেয়ে সম্পূর্ণ নিশ্চিন্ত হয়ে টাকা পরিশোধ করবেন।'
    }
  ],

  // 8. Consultation & WhatsApp
  showConsultation: true,
  consultationTitle: 'কোনো জিজ্ঞাসা বা কাস্টমাইজেশনের প্রয়োজন?',
  consultationSubtitle: 'আমাদের ফ্যাশন এক্সপার্ট টিমের সাথে সরাসরি ফোনে বা হোয়াটসঅ্যাপে কথা বলে যেকোনো প্রশ্নের উত্তর পান।',
  whatsappMessagePreset: 'হ্যালো সেরা ফ্যাশন, আমি আপনাদের স্পেশাল অফার সম্পর্কে জানতে চাই।',
  whatsappButtonText: 'হোয়াটসঅ্যাপে যোগাযোগ করুন',
  callButtonText: 'সরাসরি কল দিন',

  // 9. Mobile Sticky Bar
  showStickyMobileBar: true,
  stickyBarText: 'সীমিত সময়ের মেগা সেল অফার!',

  // 10. Section Layout & Structural Order
  sectionOrder: [
    'announcement',
    'hero',
    'trust',
    'products',
    'policies',
    'faq',
    'consultation'
  ]
};
