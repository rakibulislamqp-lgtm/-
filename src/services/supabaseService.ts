import { supabase, checkSupabaseHealth } from '../lib/supabase';
import { Product, Order, BrandSettings, CustomerUser, VisitorSession } from '../types';
import { ProductReview } from './reviewService';

// ==========================================
// 1. PRODUCTS SUPABASE ADAPTER
// ==========================================

export const supabaseFetchProducts = async (): Promise<Product[] | null> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase products fetch warning:', error.message);
      return null;
    }

    if (!data || data.length === 0) return [];

    return data.map((row: any): Product => {
      const raw = row.raw_data || {};
      const img = raw.imageUrl || (Array.isArray(row.images) && row.images[0]) || '';
      return {
        ...raw,
        id: row.id,
        title: row.title || raw.title || 'Untitled Product',
        brand: row.brand || raw.brand || 'Sera Fashion',
        description: row.description || raw.description || '',
        price: Number(row.price ?? raw.price ?? 0),
        regularPrice: row.regular_price ? Number(row.regular_price) : raw.regularPrice,
        sizes: Array.isArray(row.sizes) ? row.sizes : (raw.sizes || ['Free Size']),
        category: row.category || raw.category || 'THREE PIECE',
        imageUrl: img,
        productCode: row.code || raw.productCode || '',
        isActive: row.is_active ?? raw.isActive ?? true,
        stock: Number(row.stock_quantity ?? raw.stock ?? 50),
        createdAt: row.created_at || raw.createdAt || new Date().toISOString(),
      };
    });
  } catch (err) {
    console.warn('Supabase fetch products error:', err);
    return null;
  }
};

export const supabaseSaveProduct = async (product: Partial<Product> & Record<string, any>): Promise<boolean> => {
  try {
    const id = product.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const row = {
      id,
      title: product.title || 'Untitled Product',
      brand: product.brand || 'Sera Fashion',
      description: product.description || '',
      price: Number(product.price || 0),
      regular_price: product.regularPrice ? Number(product.regularPrice) : null,
      sizes: product.sizes || ['Free Size'],
      category: product.category || 'THREE PIECE',
      images: product.images || (product.imageUrl ? [product.imageUrl] : []),
      code: product.productCode || product.code || '',
      is_active: product.isActive ?? true,
      is_featured: product.isFeatured ?? false,
      stock_quantity: product.stock ?? product.stockQuantity ?? 50,
      updated_at: new Date().toISOString(),
      raw_data: {
        ...product,
        id,
      },
    };

    const { error } = await supabase.from('products').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase upsert product error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase save product error:', err);
    return false;
  }
};

export const supabaseDeleteProduct = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      console.warn('Supabase delete product warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase delete product error:', err);
    return false;
  }
};

// ==========================================
// 2. ORDERS SUPABASE ADAPTER
// ==========================================

export const supabaseFetchOrders = async (): Promise<Order[] | null> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase orders fetch warning:', error.message);
      return null;
    }

    if (!data || data.length === 0) return [];

    return data.map((row: any): Order => {
      const raw = row.raw_data || {};
      return {
        ...raw,
        id: row.id,
        orderId: row.order_id || raw.orderId || row.id,
        customerName: row.customer_name || raw.customerName || '',
        mobileNumber: row.mobile_number || raw.mobileNumber || '',
        address: row.address || raw.address || '',
        district: row.district || raw.district || '',
        upazila: row.upazila || raw.upazila || '',
        category: row.category || raw.category || 'THREE PIECE',
        productCode: row.product_code || raw.productCode || '',
        quantity: Number(row.quantity ?? raw.quantity ?? 1),
        price: Number(row.price ?? raw.price ?? 0),
        items: Array.isArray(row.items) ? row.items : (raw.items || []),
        deliveryCharge: Number(row.delivery_charge ?? raw.deliveryCharge ?? 80),
        totalAmount: Number(row.total_amount ?? raw.totalAmount ?? 0),
        discount: Number(row.discount ?? raw.discount ?? 0),
        discountAmount: Number(row.discount_amount ?? raw.discountAmount ?? 0),
        discountType: row.discount_type || raw.discountType || 'percentage',
        deliveryOption: row.delivery_option || raw.deliveryOption || 'Home Delivery',
        deliveryArea: row.delivery_area || raw.deliveryArea || 'Inside Dhaka',
        paymentMethod: row.payment_method || raw.paymentMethod || 'Cash On Delivery',
        status: row.status || raw.status || 'Pending',
        note: row.note || raw.note || '',
        createdAt: row.created_at || raw.createdAt || new Date().toISOString(),
        courierTrackingCode: row.courier_tracking_code || raw.courierTrackingCode || '',
        courierStatus: row.courier_status || raw.courierStatus || '',
      };
    });
  } catch (err) {
    console.warn('Supabase fetch orders error:', err);
    return null;
  }
};

export const supabaseSaveOrder = async (order: Order): Promise<boolean> => {
  try {
    const id = order.id || order.orderId || `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const row = {
      id,
      order_id: order.orderId || id,
      customer_name: order.customerName,
      mobile_number: order.mobileNumber,
      address: order.address,
      district: order.district || '',
      upazila: order.upazila || '',
      category: order.category || 'THREE PIECE',
      product_code: order.productCode || '',
      quantity: Number(order.quantity || 1),
      price: Number(order.price || 0),
      items: order.items || [],
      delivery_charge: Number(order.deliveryCharge || 80),
      total_amount: Number(order.totalAmount || 0),
      discount: Number(order.discount || 0),
      discount_amount: Number(order.discountAmount || 0),
      discount_type: order.discountType || 'percentage',
      delivery_option: order.deliveryOption || 'Home Delivery',
      delivery_area: order.deliveryArea || 'Inside Dhaka',
      payment_method: order.paymentMethod || 'Cash On Delivery',
      status: order.status || 'Pending',
      note: order.note || '',
      courier_tracking_code: order.courierTrackingCode || '',
      courier_status: order.courierStatus || '',
      raw_data: {
        ...order,
        id,
      },
    };

    const { error } = await supabase.from('orders').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase upsert order warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase save order error:', err);
    return false;
  }
};

export const supabaseUpdateOrderStatus = async (id: string, status: string, extra?: Record<string, any>): Promise<boolean> => {
  try {
    const updatePayload: Record<string, any> = {
      status,
    };
    if (extra?.courierTrackingCode) updatePayload.courier_tracking_code = extra.courierTrackingCode;
    if (extra?.courierStatus) updatePayload.courier_status = extra.courierStatus;

    const { error } = await supabase.from('orders').update(updatePayload).eq('id', id);
    if (error) {
      console.warn('Supabase update order status warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase update status error:', err);
    return false;
  }
};

export const supabaseDeleteOrder = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) {
      console.warn('Supabase delete order warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase delete order error:', err);
    return false;
  }
};

// ==========================================
// 3. SETTINGS SUPABASE ADAPTER
// ==========================================

export const supabaseFetchSettings = async (): Promise<BrandSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('data')
      .eq('id', 'brand')
      .maybeSingle();

    if (error) {
      console.warn('Supabase settings fetch warning:', error.message);
      return null;
    }

    if (data && data.data) {
      return data.data as BrandSettings;
    }
    return null;
  } catch (err) {
    console.warn('Supabase fetch settings error:', err);
    return null;
  }
};

export const supabaseSaveSettings = async (settings: BrandSettings): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('settings')
      .upsert({
        id: 'brand',
        data: settings,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase save settings warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase save settings error:', err);
    return false;
  }
};

// ==========================================
// 4. REVIEWS SUPABASE ADAPTER
// ==========================================

export const supabaseFetchReviews = async (): Promise<ProductReview[] | null> => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase reviews fetch warning:', error.message);
      return null;
    }

    if (!data) return [];

    return data.map((row: any): ProductReview => {
      const raw = row.raw_data || {};
      return {
        ...raw,
        id: row.id,
        productId: row.product_id || raw.productId,
        customerName: row.customer_name || raw.customerName,
        rating: Number(row.rating || raw.rating || 5),
        comment: row.comment || raw.comment || '',
        location: row.location || raw.location,
        avatar: row.avatar || raw.avatar,
        role: row.role || raw.role || 'Verified Buyer',
        isFeatured: row.is_featured ?? raw.isFeatured ?? false,
        createdAt: row.created_at || raw.createdAt || new Date().toISOString(),
      };
    });
  } catch (err) {
    console.warn('Supabase fetch reviews error:', err);
    return null;
  }
};

export const supabaseSaveReview = async (review: ProductReview): Promise<boolean> => {
  try {
    const id = review.id || `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const row = {
      id,
      product_id: review.productId || '',
      customer_name: review.customerName,
      rating: review.rating || 5,
      comment: review.comment,
      location: review.location || '',
      avatar: review.avatar || '',
      role: review.role || 'Verified Buyer',
      is_featured: review.isFeatured ?? false,
      created_at: review.createdAt || new Date().toISOString(),
      raw_data: {
        ...review,
        id,
      },
    };

    const { error } = await supabase.from('reviews').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase save review warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase save review error:', err);
    return false;
  }
};

export const supabaseDeleteReview = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) {
      console.warn('Supabase delete review warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase delete review error:', err);
    return false;
  }
};

// ==========================================
// 5. CUSTOMERS & SESSIONS SUPABASE ADAPTER
// ==========================================

export const supabaseFetchCustomers = async (): Promise<CustomerUser[] | null> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return null;
    if (!data) return [];

    return data.map((row: any) => ({
      ...(row.raw_data || {}),
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      district: row.district,
      upazila: row.upazila,
      avatarUrl: row.avatar_url,
      createdAt: row.created_at,
    }));
  } catch {
    return null;
  }
};

export const supabaseSaveCustomer = async (cust: CustomerUser): Promise<boolean> => {
  try {
    const row = {
      id: cust.id,
      name: cust.name,
      phone: cust.phone,
      email: cust.email || '',
      address: cust.address || '',
      district: cust.district || '',
      upazila: cust.upazila || '',
      avatar_url: cust.avatarUrl || '',
      created_at: cust.createdAt || new Date().toISOString(),
      raw_data: cust,
    };
    const { error } = await supabase.from('customers').upsert(row, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
};

export const supabaseSaveVisitorSession = async (session: VisitorSession): Promise<boolean> => {
  try {
    const row = {
      session_id: session.sessionId,
      customer_name: session.customerName || '',
      mobile_number: session.mobileNumber || '',
      current_stage: session.currentStage || 'browsing_catalog',
      last_active_at: session.lastActiveAt || new Date().toISOString(),
      district: session.district || '',
      upazila: session.upazila || '',
      has_spun: session.hasSpun || false,
      raw_data: session,
    };
    const { error } = await supabase.from('visitor_sessions').upsert(row, { onConflict: 'session_id' });
    return !error;
  } catch {
    return false;
  }
};

// ==========================================
// 6. REAL-TIME SUBSCRIPTIONS
// ==========================================

export const subscribeSupabaseOrders = (onUpdate: () => void) => {
  try {
    const channel = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        onUpdate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Supabase orders realtime subscription error:', err);
    return () => {};
  }
};

export const subscribeSupabaseProducts = (onUpdate: () => void) => {
  try {
    const channel = supabase
      .channel('public:products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        onUpdate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Supabase products realtime subscription error:', err);
    return () => {};
  }
};

// ==========================================
// 7. ONE-CLICK BULK DATA MIGRATION TO SUPABASE
// ==========================================

export interface SyncProgressResult {
  productsCount: number;
  ordersCount: number;
  settingsSynced: boolean;
  reviewsCount: number;
  errors: string[];
}

export const syncAllDataToSupabase = async (
  products: Product[],
  orders: Order[],
  settings: BrandSettings | null,
  reviews: ProductReview[]
): Promise<SyncProgressResult> => {
  const result: SyncProgressResult = {
    productsCount: 0,
    ordersCount: 0,
    settingsSynced: false,
    reviewsCount: 0,
    errors: [],
  };

  // 1. Sync Products
  for (const p of products) {
    const ok = await supabaseSaveProduct(p);
    if (ok) result.productsCount++;
    else result.errors.push(`Product "${p.title}" sync failed`);
  }

  // 2. Sync Orders
  for (const o of orders) {
    const ok = await supabaseSaveOrder(o);
    if (ok) result.ordersCount++;
    else result.errors.push(`Order #${o.orderId} sync failed`);
  }

  // 3. Sync Settings
  if (settings) {
    const ok = await supabaseSaveSettings(settings);
    result.settingsSynced = ok;
    if (!ok) result.errors.push('Brand settings sync failed');
  }

  // 4. Sync Reviews
  for (const r of reviews) {
    const ok = await supabaseSaveReview(r);
    if (ok) result.reviewsCount++;
    else result.errors.push(`Review by "${r.customerName}" sync failed`);
  }

  return result;
};
