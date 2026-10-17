import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { initializeFirebase } from '../lib/firebase';
import { Order } from '../types';

export interface LoyaltyAccount {
  phone: string;
  customerName: string;
  points: number;
  totalSpent: number;
  ordersCount: number;
  tier: 'Silver VIP' | 'Gold VIP' | 'Platinum VIP';
  referralCode: string;
  referralsCount?: number;
  referralBonusEarned?: number;
  referralBonusBalance?: number;
  referredBy?: string;
  redeemedCoupons?: { code: string; discount: number; redeemedAt: string; isUsed: boolean }[];
  updatedAt: string;
}

export interface RepeatCustomerOfferResult {
  isRepeat: boolean;
  ordersCount: number;
  discount: number;
  tier: 'Silver VIP' | 'Gold VIP' | 'Platinum VIP' | 'First Time';
  customerName: string;
  message: string;
  badgeText: string;
}

const LOCAL_LOYALTY_KEY = 'sera_loyalty_accounts_cache';

// Helper to get local cache
export const getLocalLoyaltyAccounts = (): Record<string, LoyaltyAccount> => {
  try {
    const raw = localStorage.getItem(LOCAL_LOYALTY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

// Helper to set local cache
export const saveLocalLoyaltyAccounts = (data: Record<string, LoyaltyAccount>) => {
  try {
    localStorage.setItem(LOCAL_LOYALTY_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed to cache loyalty data locally:", e);
  }
};

/**
 * Generate a consistent, readable referral code from phone number
 * e.g., 01712345678 -> SERA5678
 */
export const generateReferralCodeForPhone = (phone: string): string => {
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length >= 4) {
    return `SERA${cleanPhone.slice(-4)}`;
  }
  return `SERA${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
};

/**
 * Determine VIP tier based on total points
 */
export const calculateTier = (points: number): 'Silver VIP' | 'Gold VIP' | 'Platinum VIP' => {
  if (points >= 300) return 'Platinum VIP';
  if (points >= 100) return 'Gold VIP';
  return 'Silver VIP';
};

/**
 * Fetch or auto-create loyalty account by phone number
 */
export const getLoyaltyAccount = async (phone: string, customerName?: string): Promise<LoyaltyAccount | null> => {
  const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
  if (!cleanPhone || cleanPhone.length < 10) return null;

  // 1. Try Firestore
  try {
    const { db } = await initializeFirebase();
    if (db) {
      const ref = doc(db, 'loyalty_accounts', cleanPhone);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as LoyaltyAccount;
        // Ensure referralCode exists
        if (!data.referralCode) {
          data.referralCode = generateReferralCodeForPhone(cleanPhone);
        }
        const cache = getLocalLoyaltyAccounts();
        cache[cleanPhone] = data;
        saveLocalLoyaltyAccounts(cache);
        return data;
      }
    }
  } catch (err) {
    console.warn("Firestore loyalty fetch error:", err);
  }

  // 2. Local Cache fallback
  const cache = getLocalLoyaltyAccounts();
  if (cache[cleanPhone]) {
    const acc = cache[cleanPhone];
    if (!acc.referralCode) {
      acc.referralCode = generateReferralCodeForPhone(cleanPhone);
      cache[cleanPhone] = acc;
      saveLocalLoyaltyAccounts(cache);
    }
    return acc;
  }

  // 3. If customerName is given or checking self, generate default entry
  if (customerName) {
    const newAcc: LoyaltyAccount = {
      phone: cleanPhone,
      customerName: customerName || 'Valued Customer',
      points: 0,
      totalSpent: 0,
      ordersCount: 0,
      tier: 'Silver VIP',
      referralCode: generateReferralCodeForPhone(cleanPhone),
      referralsCount: 0,
      referralBonusEarned: 0,
      referralBonusBalance: 0,
      redeemedCoupons: [],
      updatedAt: new Date().toISOString()
    };
    cache[cleanPhone] = newAcc;
    saveLocalLoyaltyAccounts(cache);
    return newAcc;
  }

  return null;
};

/**
 * Find account by Referral Code
 */
export const findAccountByReferralCode = async (code: string): Promise<LoyaltyAccount | null> => {
  if (!code) return null;
  const cleanCode = code.trim().toUpperCase();

  // Search local cache first for superfast zero-latency lookup
  const cache = getLocalLoyaltyAccounts();
  for (const acc of Object.values(cache)) {
    if (acc.referralCode?.toUpperCase() === cleanCode) {
      return acc;
    }
  }

  // Search Firestore
  try {
    const { db } = await initializeFirebase();
    if (db) {
      const colRef = collection(db, 'loyalty_accounts');
      const snap = await getDocs(colRef);
      for (const d of snap.docs) {
        const data = d.data() as LoyaltyAccount;
        if (data.referralCode?.toUpperCase() === cleanCode) {
          cache[data.phone] = data;
          saveLocalLoyaltyAccounts(cache);
          return data;
        }
      }
    }
  } catch (err) {
    console.warn("Firestore referral lookup error:", err);
  }

  return null;
};

/**
 * Check if customer is a repeat / regular buyer and compute special discounts
 */
export const getRepeatCustomerOffer = async (
  phone: string,
  configured2ndDiscount = 50,
  configured3rdDiscount = 100
): Promise<RepeatCustomerOfferResult> => {
  const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
  if (!cleanPhone || cleanPhone.length < 10) {
    return {
      isRepeat: false,
      ordersCount: 0,
      discount: 0,
      tier: 'First Time',
      customerName: '',
      message: '',
      badgeText: ''
    };
  }

  const account = await getLoyaltyAccount(cleanPhone);
  if (!account || account.ordersCount < 1) {
    return {
      isRepeat: false,
      ordersCount: 0,
      discount: 0,
      tier: 'First Time',
      customerName: account?.customerName || '',
      message: '',
      badgeText: ''
    };
  }

  // Returning Customer!
  if (account.ordersCount === 1) {
    // 2nd Order: Special Welcome Back Bonus
    return {
      isRepeat: true,
      ordersCount: 1,
      discount: configured2ndDiscount,
      tier: account.tier,
      customerName: account.customerName,
      message: `স্বাগতম প্রিয় পুরোনো গ্রাহক! আপনি পূর্বে আমাদের সাথে ছিলেন। আপনার ২য় অর্ডারে স্পেশাল ৳${configured2ndDiscount} ছাড় স্বয়ংক্রিয়ভাবে একটিভ হয়েছে!`,
      badgeText: `২য় অর্ডার বোনাস: ৳${configured2ndDiscount} অফ!`
    };
  }

  // 3rd+ Orders: VIP Regular Customer Grand Discount
  return {
    isRepeat: true,
    ordersCount: account.ordersCount,
    discount: configured3rdDiscount,
    tier: account.tier,
    customerName: account.customerName,
    message: `👑 ভিআইপি নিয়মিত গ্রাহক সম্মাননা! আপনি আমাদের বিশ্বস্ত কাস্টমার (${account.ordersCount}টি সফল অর্ডার)। আজকের অর্ডারে স্পেশাল ৳${configured3rdDiscount} মেগা ছাড় সক্রিয়!`,
    badgeText: `ভিআইপি কাস্টমার অফার: ৳${configured3rdDiscount} অফ!`
  };
};

/**
 * Add loyalty points when an order is completed/placed & handle referral crediting
 */
export const addLoyaltyPointsFromOrder = async (order: Order): Promise<LoyaltyAccount | null> => {
  if (!order || !order.mobileNumber) return null;
  const cleanPhone = order.mobileNumber.replace(/\D/g, '');
  if (!cleanPhone) return null;

  // Calculate points: 1 point per ৳100 spent
  const earnedPoints = Math.max(1, Math.floor((order.totalAmount || 0) / 100));

  const existing = await getLoyaltyAccount(cleanPhone, order.customerName);

  const updatedAccount: LoyaltyAccount = {
    phone: cleanPhone,
    customerName: order.customerName || existing?.customerName || 'Valued Customer',
    points: (existing?.points || 0) + earnedPoints,
    totalSpent: (existing?.totalSpent || 0) + (order.totalAmount || 0),
    ordersCount: (existing?.ordersCount || 0) + 1,
    tier: calculateTier((existing?.points || 0) + earnedPoints),
    referralCode: existing?.referralCode || generateReferralCodeForPhone(cleanPhone),
    referralsCount: existing?.referralsCount || 0,
    referralBonusEarned: existing?.referralBonusEarned || 0,
    referralBonusBalance: existing?.referralBonusBalance || 0,
    referredBy: order.referralCodeUsed || existing?.referredBy,
    redeemedCoupons: existing?.redeemedCoupons || [],
    updatedAt: new Date().toISOString()
  };

  // Save to Firestore
  try {
    const { db } = await initializeFirebase();
    if (db) {
      const ref = doc(db, 'loyalty_accounts', cleanPhone);
      await setDoc(ref, updatedAccount, { merge: true });
    }
  } catch (e) {
    console.warn("Failed to update loyalty account in Firestore:", e);
  }

  // Save to local cache
  const cache = getLocalLoyaltyAccounts();
  cache[cleanPhone] = updatedAccount;
  saveLocalLoyaltyAccounts(cache);

  // If a referral code was used by this friend, credit the referrer!
  if (order.referralCodeUsed) {
    try {
      await creditReferralBonus(order.referralCodeUsed, cleanPhone, 100);
    } catch (e) {
      console.warn("Failed to credit referral bonus:", e);
    }
  }

  return updatedAccount;
};

/**
 * Credit referral bonus to the referrer when their friend buys!
 */
export const creditReferralBonus = async (
  referralCode: string,
  buyerPhone: string,
  bonusAmount = 100
): Promise<boolean> => {
  if (!referralCode) return false;
  const referrer = await findAccountByReferralCode(referralCode);
  
  // Prevent self-referral
  if (!referrer || referrer.phone === buyerPhone) {
    return false;
  }

  const updatedReferrer: LoyaltyAccount = {
    ...referrer,
    referralsCount: (referrer.referralsCount || 0) + 1,
    referralBonusEarned: (referrer.referralBonusEarned || 0) + bonusAmount,
    referralBonusBalance: (referrer.referralBonusBalance || 0) + bonusAmount,
    points: referrer.points + Math.floor(bonusAmount / 2), // Also award 50 loyalty points
    tier: calculateTier(referrer.points + Math.floor(bonusAmount / 2)),
    updatedAt: new Date().toISOString()
  };

  // Update in Firestore
  try {
    const { db } = await initializeFirebase();
    if (db) {
      const ref = doc(db, 'loyalty_accounts', referrer.phone);
      await setDoc(ref, updatedReferrer, { merge: true });
    }
  } catch (e) {
    console.warn("Failed to credit referral bonus in Firestore:", e);
  }

  // Update in local cache
  const cache = getLocalLoyaltyAccounts();
  cache[referrer.phone] = updatedReferrer;
  saveLocalLoyaltyAccounts(cache);

  return true;
};

/**
 * Redeem points for an instant discount coupon
 */
export const redeemPointsForCoupon = async (
  phone: string, 
  pointsToRedeem: number
): Promise<{ success: boolean; couponCode?: string; discountAmount?: number; message: string }> => {
  const account = await getLoyaltyAccount(phone);
  if (!account) {
    return { success: false, message: 'কাস্টমার একাউন্ট পাওয়া যায়নি। পূর্বে অন্তত ১টি সফল অর্ডার থাকতে হবে।' };
  }

  if (account.points < pointsToRedeem) {
    return { success: false, message: `অপর্যাপ্ত পয়েন্ট! আপনার বর্তমান ব্যালেন্স: ${account.points} পয়েন্ট।` };
  }

  // Discount calculation: 1 Point = ৳1 Discount
  const discountAmount = pointsToRedeem;
  const couponCode = `REWARD_${pointsToRedeem}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const updatedAccount: LoyaltyAccount = {
    ...account,
    points: account.points - pointsToRedeem,
    tier: calculateTier(account.points - pointsToRedeem),
    redeemedCoupons: [
      ...(account.redeemedCoupons || []),
      {
        code: couponCode,
        discount: discountAmount,
        redeemedAt: new Date().toISOString(),
        isUsed: false
      }
    ],
    updatedAt: new Date().toISOString()
  };

  // Update DB & Local
  try {
    const { db } = await initializeFirebase();
    if (db) {
      const ref = doc(db, 'loyalty_accounts', account.phone);
      await setDoc(ref, updatedAccount, { merge: true });
    }
  } catch (e) {
    console.warn("Firestore redeem update error:", e);
  }

  const cache = getLocalLoyaltyAccounts();
  cache[account.phone] = updatedAccount;
  saveLocalLoyaltyAccounts(cache);

  return {
    success: true,
    couponCode,
    discountAmount,
    message: `অভিনন্দন! আপনি ${pointsToRedeem} পয়েন্ট রিডিম করে ৳${discountAmount} ছাড় কুপন সক্রিয় করেছেন।`
  };
};

/**
 * Get list of all VIP Loyalty accounts for Admin Panel
 */
export const getAllLoyaltyAccounts = async (): Promise<LoyaltyAccount[]> => {
  const list: LoyaltyAccount[] = [];

  try {
    const { db } = await initializeFirebase();
    if (db) {
      const colRef = collection(db, 'loyalty_accounts');
      const snap = await getDocs(colRef);
      snap.forEach(docSnap => {
        const item = docSnap.data() as LoyaltyAccount;
        if (!item.referralCode) {
          item.referralCode = generateReferralCodeForPhone(item.phone);
        }
        list.push(item);
      });
      if (list.length > 0) return list;
    }
  } catch (e) {
    console.warn("Failed to fetch loyalty list from Firestore:", e);
  }

  const cache = getLocalLoyaltyAccounts();
  return Object.values(cache);
};
