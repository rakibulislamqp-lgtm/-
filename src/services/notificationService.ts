import { getBrandSettings } from './settingsService';
import { Order } from '../types';
import { formatBodyMeasurements } from '../lib/productVariants';

// Chime sound for new orders
const ORDER_ALERT_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav';

export const playNotificationSound = () => {
  try {
    const audio = new Audio(ORDER_ALERT_SOUND_URL);
    audio.volume = 0.8;
    audio.play().catch(err => {
      console.warn("Browser audio autoplay blocked or deferred:", err);
    });
  } catch (err) {
    console.error("Failed to play notification sound:", err);
  }
};

// Request browser notification permission
export const requestBrowserNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn("Browser does not support desktop notifications");
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

// Send browser standard desktop/mobile push alert
export const sendBrowserNotification = (title: string, body: string, icon?: string) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  
  try {
    const n = new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
      tag: 'new-order',
      requireInteraction: true
    });
    
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch (err) {
    console.error("Failed to trigger browser notification:", err);
  }
};

// Send Telegram bot notification to client's chat ID
export const sendTelegramNotification = async (order: any): Promise<boolean> => {
  try {
    const settings = await getBrandSettings();
    if (!settings || !settings.telegramToken || !settings.telegramChatId) {
      console.log("Telegram settings are not configured yet in Admin.");
      return false;
    }

    const { telegramToken, telegramChatId } = settings;
    const token = telegramToken.trim();
    const chatId = telegramChatId.trim();

    if (!token || !chatId) return false;

    // Format clean product items list
    const itemsDetails = order.items && order.items.length > 0
      ? order.items.map((item: any, index: number) => {
          const meas = item.isCustomTailored ? formatBodyMeasurements(item.customMeasurements) : '';
          return `${index + 1}. 🛍️ *${item.productTitle}* (${item.productCode})\n📏 সাইজ: ${item.size}${item.color ? ` | 🎨 কালার: ${item.color}` : ''} | পরিমাণ: ${item.quantity}টি | মূল্য: ৳${item.price}${item.isCustomTailored ? `\n✂️ *বডির মাপ:* ${meas || 'কাস্টম সেলাই (৳৩০০ অগ্রিম)'}` : ''}`;
        }).join('\n\n')
      : `🛍️ *${order.category || 'Product'}* (${order.productCode || 'N/A'})\n📏 সাইজ: ${order.size || 'Free Size'}${order.color ? ` | 🎨 কালার: ${order.color}` : ''} | পরিমাণ: ${order.quantity || 1}টি | মূল্য: ৳${order.price || 0}${order.customMeasurementsSummary ? `\n✂️ *বডির মাপ:* ${order.customMeasurementsSummary}` : ''}`;

    const cleanDistrict = order.district || 'Unspecified';
    const cleanUpazila = order.upazila || 'Unspecified';
    const advPaid = Number(order.advanceAmount || 0);
    const codDue = advPaid > 0 ? (order.dueAmount ?? Math.max(0, Number(order.totalAmount || 0) - advPaid)) : null;

    const messageText = `🔔 *নতুন অর্ডার কনফার্ম হয়েছে! (NEW ORDER)* 🔔
-------------------------------------------
🆔 *অর্ডার আইডি (Order ID):* \`${order.orderId}\`
👤 *কাস্টমার নাম (Name):* _${order.customerName}_
📞 *মোবাইল নাম্বার (Mobile):* \`${order.mobileNumber}\`
📍 *ঠিকানা (Address):* _${order.address}_, ${cleanUpazila}, ${cleanDistrict}

📋 *অর্ডারের প্রোডাক্টস (Items):*
${itemsDetails}

💵 *ডেলিভারি চার্জ (Delivery):* ৳${order.deliveryCharge}
💰 *সর্বমোট বিল (Net Total):* ৳${order.totalAmount}
${advPaid > 0 ? `✂️ *অগ্রিম পরিশোধিত (Advance Paid):* ৳${advPaid}\n📦 *ডেলিভারিতে বাকি (Due COD):* ৳${codDue}\n` : ''}💳 *পেমেন্ট পদ্ধতি (Payment):* *${order.paymentMethod}*
${order.paymentSenderNumber ? `📲 *প্রেরক নম্বর (Sender):* \`${order.paymentSenderNumber}\`\n` : ''}${order.transactionId ? `🔑 *ট্রানজেকশন (TxID):* \`${order.transactionId}\`\n` : ''}${order.paymentScreenshotUrl ? `📸 *পেমেন্ট স্ক্রিনশট:* সংযুক্ত (অ্যাডমিন ড্যাশবোর্ডে দেখুন)\n` : ''}${order.note ? `📝 *স্পেশাল নোট (Note):* _${order.note}_` : ''}
-------------------------------------------
⚡ *Sera Order System* ⚡`;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'Markdown',
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Telegram API Error response:", text);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
    return false;
  }
};

// Unified dispatcher for order confirmations
export const dispatchOrderNotifications = async (order: any) => {
  try {
    // 1. Play chime alert
    const settings = await getBrandSettings();
    if (!settings || settings.soundEnabled !== false) {
      playNotificationSound();
    }
    
    // 2. Trigger browser notification if authorized
    if (!settings || settings.pushEnabled !== false) {
      sendBrowserNotification(
        '🛍️ নতুন অর্ডার পাওয়া গেছে!',
        `অর্ডার আইডি: ${order.orderId}\nকাস্টমার: ${order.customerName}\nমোবাইল: ${order.mobileNumber}\nমোট মূল্য: ৳${order.totalAmount}`
      );
    }
  } catch (e) {
    console.warn("Local notification dispatcher error:", e);
  }

  // 3. Deliver instantly to Telegram-enabled phone
  await sendTelegramNotification(order);
};

// Send Telegram bot notification when a customer spins the wheel
export const sendSpinTelegramNotification = async (spinData: {
  customerName: string;
  mobileNumber: string;
  wonCouponCode: string;
  wonCouponLabel: string;
  wonCouponDiscount?: number;
  discountType?: 'flat' | 'percentage';
  deviceInfo?: string;
}): Promise<boolean> => {
  try {
    const settings = await getBrandSettings();
    if (!settings || !settings.telegramToken || !settings.telegramChatId) {
      return false;
    }
    const token = settings.telegramToken.trim();
    const chatId = settings.telegramChatId.trim();
    if (!token || !chatId) return false;

    const discountText = spinData.discountType === 'flat'
      ? `${spinData.wonCouponDiscount || 0}৳`
      : `${spinData.wonCouponDiscount || 0}%`;

    const messageText = `🎰 *নতুন স্পিন হুইল উইনার! (LIVE SPIN)* 🎁
-------------------------------------------
👤 *কাস্টমার নাম:* _${spinData.customerName || 'Anonymous Visitor'}_
📞 *মোবাইল নাম্বার:* \`${spinData.mobileNumber || 'N/A'}\`
🏆 *বিজয়ী অফার:* *${spinData.wonCouponLabel}*
🎟️ *কুপন কোড:* \`${spinData.wonCouponCode}\` (${discountText})
${spinData.deviceInfo ? `📱 *ডিভাইস:* ${spinData.deviceInfo}` : ''}
-------------------------------------------
⚡ *Sera Live Spin Alert* ⚡`;

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'Markdown',
      }),
    });

    return response.ok;
  } catch (err) {
    console.warn('Failed to send Spin Telegram notification:', err);
    return false;
  }
};

// Play chime & browser notification in Admin Dashboard when a customer spins
export const dispatchAdminSpinAlert = async (spinData: {
  id: string;
  customerName: string;
  mobileNumber: string;
  wonCouponCode: string;
  wonCouponLabel: string;
}) => {
  try {
    const settings = await getBrandSettings();
    if (!settings || settings.soundEnabled !== false) {
      playNotificationSound();
    }
    if (!settings || settings.pushEnabled !== false) {
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const n = new Notification('🎁 নতুন কাস্টমার স্পিন করেছেন!', {
            body: `${spinData.customerName || 'কাস্টমার'} (${spinData.mobileNumber || ''}) জিতেছেন: ${spinData.wonCouponLabel} (${spinData.wonCouponCode})`,
            icon: '/favicon.ico',
            tag: `spin-${spinData.id}`,
          });
          n.onclick = () => {
            window.focus();
            n.close();
          };
        } catch {}
      }
    }
  } catch (e) {
    console.warn('Admin spin alert error:', e);
  }
};

