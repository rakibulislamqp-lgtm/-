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
  redeemedCoupons?: { code: string; discount: number; redeemedAt: string; isUsed: boolean }[];
  updatedAt: string;
}

const LOCAL_LOYALTY_KEY = 'sera_loyalty_accounts_cache';

// Helper to get local cache
const getLocalLoyaltyAccounts = (): Record<string, LoyaltyAccount> => {
  try {
    const raw = localStorage.getItem(LOCAL_LOYALTY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

// Helper to set local cache
const saveLocalLoyaltyAccounts = (data: Record<string, LoyaltyAccount>) => {
  try {
    localStorage.setItem(LOCAL_LOYALTY_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed to cache loyalty data locally:", e);
  }
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
 * Fetch loyalty account by phone number
 */
export const getLoyaltyAccount = async (phone: string): Promise<LoyaltyAccount | null> => {
  const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
  if (!cleanPhone) return null;

  // 1. Try Firestore
  try {
    const { db } = await initializeFirebase();
    if (db) {
      const ref = doc(db, 'loyalty_accounts', cleanPhone);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as LoyaltyAccount;
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
    return cache[cleanPhone];
  }

  return null;
};

/**
 * Add loyalty points when an order is completed/placed
 */
export const addLoyaltyPointsFromOrder = async (order: Order): Promise<LoyaltyAccount | null> => {
  if (!order || !order.mobileNumber) return null;
  const cleanPhone = order.mobileNumber.replace(/\D/g, '');
  if (!cleanPhone) return null;

  // Calculate points: 1 point per ৳100 spent
  const earnedPoints = Math.max(1, Math.floor((order.totalAmount || 0) / 100));

  const existing = await getLoyaltyAccount(cleanPhone);

  const updatedAccount: LoyaltyAccount = {
    phone: cleanPhone,
    customerName: order.customerName || existing?.customerName || 'Valued Customer',
    points: (existing?.points || 0) + earnedPoints,
    totalSpent: (existing?.totalSpent || 0) + (order.totalAmount || 0),
    ordersCount: (existing?.ordersCount || 0) + 1,
    tier: calculateTier((existing?.points || 0) + earnedPoints),
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

  return updatedAccount;
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
        list.push(docSnap.data() as LoyaltyAccount);
      });
      if (list.length > 0) return list;
    }
  } catch (e) {
    console.warn("Failed to fetch loyalty list from Firestore:", e);
  }

  const cache = getLocalLoyaltyAccounts();
  return Object.values(cache);
};
