import { collection, doc, setDoc, getDocs, query, where, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { initializeFirebase } from '../lib/firebase';
import { CustomerUser, CustomerAnnouncement, Order } from '../types';
import { getAllOrders, getMyCustomerOrdersLocally, deleteOrder } from './orderService';

const LOGGED_IN_KEY = 'sera_logged_in_customer';
const LOCAL_CUSTOMERS_KEY = 'sera_customers_db';
export const LOCAL_DELETED_CUSTOMERS_KEY = 'sera_deleted_customers';

export function getDeletedCustomerIdentifiers(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_DELETED_CUSTOMERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function recordDeletedCustomer(...identifiers: (string | undefined | null)[]) {
  try {
    const current = getDeletedCustomerIdentifiers();
    const set = new Set(current);
    identifiers.forEach(id => {
      if (id && typeof id === 'string' && id.trim()) {
        set.add(id.trim());
      }
    });
    localStorage.setItem(LOCAL_DELETED_CUSTOMERS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn("Could not record deleted customer:", e);
  }
}

export function normalizeBanglaPhone(rawPhone: string): string {
  if (!rawPhone) return '';
  // Convert Bengali digits to English
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  let cleaned = rawPhone.trim();
  bengaliDigits.forEach((digit, i) => {
    cleaned = cleaned.replace(new RegExp(digit, 'g'), String(i));
  });
  // Strip all non-digit characters
  cleaned = cleaned.replace(/\D/g, '');
  // Remove leading +88 or 88 if present
  if (cleaned.startsWith('880') && cleaned.length >= 13) {
    cleaned = cleaned.substring(2);
  }
  // Ensure starts with 0
  if (!cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}

export function getLocalCustomers(): CustomerUser[] {
  try {
    const raw = localStorage.getItem(LOCAL_CUSTOMERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalCustomer(customer: CustomerUser) {
  try {
    const list = getLocalCustomers();
    const filtered = list.filter(c => c.phone !== customer.phone && c.id !== customer.id);
    const updated = [customer, ...filtered];
    localStorage.setItem(LOCAL_CUSTOMERS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save local customer', e);
  }
}

export function getLoggedInCustomer(): CustomerUser | null {
  try {
    const raw = localStorage.getItem(LOGGED_IN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setLoggedInCustomer(customer: CustomerUser | null) {
  try {
    if (customer) {
      localStorage.setItem(LOGGED_IN_KEY, JSON.stringify(customer));
      // Also update saved profile for checkout auto-fill
      localStorage.setItem('sera_saved_customer_profile', JSON.stringify({
        customerName: customer.name,
        mobileNumber: customer.phone,
        district: customer.district || '',
        upazila: customer.upazila || '',
        address: customer.address || '',
        savedAt: new Date().toISOString()
      }));
    } else {
      localStorage.removeItem(LOGGED_IN_KEY);
    }
    window.dispatchEvent(new CustomEvent('customer_auth_changed', { detail: customer }));
  } catch (e) {
    console.warn('Failed to set logged in customer', e);
  }
}

export async function registerCustomer(data: {
  name: string;
  phone: string;
  password?: string;
  email?: string;
  address?: string;
  district?: string;
  upazila?: string;
}): Promise<{ success: boolean; customer?: CustomerUser; error?: string }> {
  try {
    const normalizedPhone = normalizeBanglaPhone(data.phone);
    if (!normalizedPhone || normalizedPhone.length < 11) {
      return { success: false, error: 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)' };
    }
    if (!data.name || data.name.trim().length < 2) {
      return { success: false, error: 'আপনার সম্পূর্ণ নাম লিখুন' };
    }

    // Check if customer already exists locally
    const localList = getLocalCustomers();
    const existingLocal = localList.find(c => c.phone === normalizedPhone);
    if (existingLocal) {
      return { success: false, error: 'এই মোবাইল নম্বর দিয়ে ইতিমধ্যে রেজিস্ট্রেশন করা আছে। দয়া করে লগইন করুন।' };
    }

    const customerId = `CUST-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    const newCustomer: CustomerUser = {
      id: customerId,
      name: data.name.trim(),
      phone: normalizedPhone,
      password: data.password || '123456',
      email: data.email?.trim() || '',
      address: data.address?.trim() || '',
      district: data.district || '',
      upazila: data.upazila || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to local storage first (reliable offline fallback)
    saveLocalCustomer(newCustomer);
    setLoggedInCustomer(newCustomer);

    // Try saving to Firestore
    try {
      const { db } = await initializeFirebase();
      if (db) {
        await setDoc(doc(db, 'customers', customerId), newCustomer);
      }
    } catch (fsErr) {
      console.warn('Firestore customer save skipped (operating with local state):', fsErr);
    }

    return { success: true, customer: newCustomer };
  } catch (error: any) {
    return { success: false, error: error?.message || 'রেজিস্ট্রেশন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।' };
  }
}

export async function loginCustomer(
  phone: string, 
  password?: string
): Promise<{ success: boolean; customer?: CustomerUser; error?: string }> {
  try {
    const normalizedPhone = normalizeBanglaPhone(phone);
    if (!normalizedPhone || normalizedPhone.length < 11) {
      return { success: false, error: 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন' };
    }

    // 1. Check local storage
    const localList = getLocalCustomers();
    let found = localList.find(c => c.phone === normalizedPhone);

    // 2. If not found locally, query Firestore
    if (!found) {
      try {
        const { db } = await initializeFirebase();
        if (db) {
          const q = query(collection(db, 'customers'), where('phone', '==', normalizedPhone));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            found = snapshot.docs[0].data() as CustomerUser;
            saveLocalCustomer(found);
          }
        }
      } catch (fsErr) {
        console.warn('Firestore customer query error:', fsErr);
      }
    }

    // 3. If customer found, verify password (or allow if no password set)
    if (found) {
      if (password && found.password && found.password !== password) {
        return { success: false, error: 'পাসওয়ার্ডটি ভুল হয়েছে। আবার চেষ্টা করুন।' };
      }
      setLoggedInCustomer(found);
      return { success: true, customer: found };
    }

    // 4. If customer does not exist, check if there are previous orders placed with this phone number!
    // If orders exist, auto-create a customer account from their order details so they can access their order history right away!
    const allOrders = await getAllOrders();
    const matchingOrder = allOrders.find(o => {
      const oPhone = normalizeBanglaPhone(o.mobileNumber || '');
      return oPhone === normalizedPhone;
    });

    if (matchingOrder) {
      const autoCustomer: CustomerUser = {
        id: `CUST-${Date.now().toString().slice(-6)}`,
        name: matchingOrder.customerName || 'সম্মানিত কাস্টমার',
        phone: normalizedPhone,
        password: password || '123456',
        address: matchingOrder.address || '',
        district: matchingOrder.district || '',
        upazila: matchingOrder.upazila || '',
        createdAt: matchingOrder.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      saveLocalCustomer(autoCustomer);
      setLoggedInCustomer(autoCustomer);
      return { success: true, customer: autoCustomer };
    }

    return { 
      success: false, 
      error: 'এই নম্বর দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি। দয়া করে রেজিস্ট্রেশন করুন।' 
    };
  } catch (error: any) {
    return { success: false, error: error?.message || 'লগইন করতে সমস্যা হয়েছে।' };
  }
}

export async function updateCustomerProfile(
  updates: Partial<CustomerUser>
): Promise<{ success: boolean; customer?: CustomerUser; error?: string }> {
  try {
    const current = getLoggedInCustomer();
    if (!current) {
      return { success: false, error: 'লগইন করা নেই।' };
    }

    const updatedCustomer: CustomerUser = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    saveLocalCustomer(updatedCustomer);
    setLoggedInCustomer(updatedCustomer);

    // Sync with Firestore
    try {
      const { db } = await initializeFirebase();
      if (db) {
        await updateDoc(doc(db, 'customers', updatedCustomer.id), {
          ...updates,
          updatedAt: updatedCustomer.updatedAt
        });
      }
    } catch (e) {
      console.warn('Firestore customer update error:', e);
    }

    return { success: true, customer: updatedCustomer };
  } catch (error: any) {
    return { success: false, error: error?.message || 'প্রোফাইল আপডেট করতে সমস্যা হয়েছে।' };
  }
}

export function logoutCustomer(): void {
  setLoggedInCustomer(null);
}

export async function getCustomerOrders(phone: string): Promise<Order[]> {
  const normalizedTarget = normalizeBanglaPhone(phone);
  if (!normalizedTarget) return [];

  // 1. Get from all orders
  const allOrders = await getAllOrders(true);
  
  // 2. Get local orders
  const localOrders = getMyCustomerOrdersLocally();

  // Combine and deduplicate
  const combinedMap = new Map<string, Order>();
  
  [...localOrders, ...allOrders].forEach(o => {
    if (!o) return;
    const key = o.orderId || o.id;
    if (!key) return;
    
    const oPhone = normalizeBanglaPhone(o.mobileNumber || '');
    // Check if phone matches (either full 11 digits or ends with last 10 digits)
    if (
      oPhone === normalizedTarget ||
      (oPhone.length >= 10 && normalizedTarget.length >= 10 && oPhone.slice(-10) === normalizedTarget.slice(-10))
    ) {
      combinedMap.set(key, o);
    }
  });

  const orders = Array.from(combinedMap.values());
  // Sort descending by createdAt or date
  orders.sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  return orders;
}

const LOCAL_ANNOUNCEMENTS_KEY = 'sera_customer_announcements';

export async function getAllRegisteredCustomers(): Promise<CustomerUser[]> {
  const customerMap = new Map<string, CustomerUser>();
  const deletedSet = new Set(getDeletedCustomerIdentifiers().map(x => x.toLowerCase().trim()));

  const isDeleted = (id?: string, phone?: string) => {
    const kId = (id || '').toLowerCase().trim();
    const kPhone = (phone || '').toLowerCase().trim();
    return (kId && deletedSet.has(kId)) || (kPhone && deletedSet.has(kPhone));
  };

  // 1. Get from localStorage
  const localCustomers = getLocalCustomers();
  localCustomers.forEach(c => {
    const cleanPhone = normalizeBanglaPhone(c.phone);
    if (cleanPhone && !isDeleted(c.id, cleanPhone)) {
      customerMap.set(cleanPhone, { ...c, phone: cleanPhone });
    }
  });

  // 2. Fetch from Firestore
  try {
    const { db } = await initializeFirebase();
    if (db) {
      const snap = await getDocs(collection(db, 'customers'));
      snap.forEach(docSnap => {
        const data = docSnap.data() as CustomerUser;
        const cleanPhone = normalizeBanglaPhone(data.phone);
        const docId = docSnap.id || data.id;
        if (cleanPhone && !isDeleted(docId, cleanPhone)) {
          const existing = customerMap.get(cleanPhone);
          customerMap.set(cleanPhone, {
            ...existing,
            ...data,
            id: docId,
            phone: cleanPhone
          });
        }
      });
    }
  } catch (err) {
    console.warn('Firestore getAllRegisteredCustomers fallback to local cache:', err);
  }

  // 3. Also discover buyers from allOrders who may not have registered explicitly
  try {
    const allOrders = await getAllOrders();
    allOrders.forEach(order => {
      const cleanPhone = normalizeBanglaPhone(order.mobileNumber || '');
      if (cleanPhone && cleanPhone.length >= 11 && !isDeleted(undefined, cleanPhone) && !customerMap.has(cleanPhone)) {
        // Create an auto-derived customer record
        customerMap.set(cleanPhone, {
          id: `CUST-AUTO-${cleanPhone.slice(-6)}`,
          name: order.customerName || 'সম্মানিত কাস্টমার',
          phone: cleanPhone,
          address: order.address || '',
          district: order.district || '',
          upazila: order.upazila || '',
          createdAt: order.createdAt || new Date().toISOString(),
          updatedAt: order.createdAt || new Date().toISOString(),
          source: 'checkout_auto'
        });
      }
    });
  } catch (err) {
    console.warn('Could not auto-derive customers from orders:', err);
  }

  const list = Array.from(customerMap.values()).filter(c => !isDeleted(c.id, c.phone));
  // Sort descending by registration date
  list.sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  // Cache back to local storage
  try {
    localStorage.setItem(LOCAL_CUSTOMERS_KEY, JSON.stringify(list));
  } catch (e) {
    // ignore
  }

  return list;
}

export async function deleteCustomerUser(customerId: string, phone: string, alsoDeleteOrders: boolean = true): Promise<boolean> {
  try {
    const cleanPhone = normalizeBanglaPhone(phone);
    recordDeletedCustomer(customerId, cleanPhone, phone);

    // Remove from local storage
    const list = getLocalCustomers().filter(c => c.id !== customerId && normalizeBanglaPhone(c.phone) !== cleanPhone);
    localStorage.setItem(LOCAL_CUSTOMERS_KEY, JSON.stringify(list));

    // Also delete orders associated with this customer so their details don't remain or resurrect
    if (alsoDeleteOrders && cleanPhone) {
      try {
        const allOrders = await getAllOrders();
        const customerOrders = allOrders.filter(o => {
          const ordPhone = normalizeBanglaPhone(o.mobileNumber || '');
          return ordPhone === cleanPhone || (phone && (o.mobileNumber || '').includes(phone));
        });
        for (const ord of customerOrders) {
          const oId = ord.id || ord.orderId;
          if (oId) {
            await deleteOrder(oId, ord.orderId);
          }
        }
      } catch (orderErr) {
        console.warn("Error deleting customer orders:", orderErr);
      }
    }

    // Remove from Firestore
    try {
      const { db } = await initializeFirebase();
      if (db && customerId) {
        await deleteDoc(doc(db, 'customers', customerId));
      }
    } catch (e) {
      console.warn('Firestore customer delete error:', e);
    }
    return true;
  } catch (e) {
    console.error('deleteCustomerUser failed:', e);
    return false;
  }
}

// ================= CUSTOMER ANNOUNCEMENTS / FREE MARKETING NOTICES =================

export function getLocalCustomerAnnouncements(): CustomerAnnouncement[] {
  try {
    const raw = localStorage.getItem(LOCAL_ANNOUNCEMENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  // Default welcome announcement
  return [
    {
      id: 'ann-welcome-01',
      title: '🌸 সেরা পরিবারের নতুন সদস্য হিসেবে বিশেষ ছাড়!',
      message: 'রেজিস্ট্রেশন করার জন্য আপনাকে ধন্যবাদ! আপনার যেকোনো পোশাকে পাচ্ছেন বিশেষ ফ্রি ডেলিভারি ও ৫% ডিসকাউন্ট সুবিধা।',
      couponCode: 'SERA5',
      badge: 'EXCLUSIVE GIFT',
      isActive: true,
      createdAt: new Date().toISOString()
    }
  ];
}

export async function getAllCustomerAnnouncements(): Promise<CustomerAnnouncement[]> {
  const map = new Map<string, CustomerAnnouncement>();
  getLocalCustomerAnnouncements().forEach(a => map.set(a.id, a));

  try {
    const { db } = await initializeFirebase();
    if (db) {
      const snap = await getDocs(collection(db, 'customer_announcements'));
      snap.forEach(docSnap => {
        const item = docSnap.data() as CustomerAnnouncement;
        map.set(docSnap.id, { ...item, id: docSnap.id });
      });
    }
  } catch (e) {
    console.warn('Firestore customer_announcements fetch fallback:', e);
  }

  const list = Array.from(map.values());
  list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return list;
}

export async function getActiveCustomerAnnouncement(): Promise<CustomerAnnouncement | null> {
  const all = await getAllCustomerAnnouncements();
  return all.find(a => a.isActive) || null;
}

export async function saveCustomerAnnouncement(announcement: CustomerAnnouncement): Promise<boolean> {
  try {
    // 1. Save local
    const local = getLocalCustomerAnnouncements().filter(a => a.id !== announcement.id);
    const updated = [announcement, ...local];
    localStorage.setItem(LOCAL_ANNOUNCEMENTS_KEY, JSON.stringify(updated));

    // 2. Save Firestore
    try {
      const { db } = await initializeFirebase();
      if (db) {
        await setDoc(doc(db, 'customer_announcements', announcement.id), announcement);
      }
    } catch (e) {
      console.warn('Firestore announcement save error:', e);
    }
    return true;
  } catch (e) {
    console.error('saveCustomerAnnouncement error:', e);
    return false;
  }
}

export async function deleteCustomerAnnouncement(id: string): Promise<boolean> {
  try {
    const local = getLocalCustomerAnnouncements().filter(a => a.id !== id);
    localStorage.setItem(LOCAL_ANNOUNCEMENTS_KEY, JSON.stringify(local));

    try {
      const { db } = await initializeFirebase();
      if (db) {
        await deleteDoc(doc(db, 'customer_announcements', id));
      }
    } catch (e) {
      console.warn('Firestore announcement delete error:', e);
    }
    return true;
  } catch (e) {
    console.error('deleteCustomerAnnouncement error:', e);
    return false;
  }
}
