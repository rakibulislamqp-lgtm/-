import { getBrandSettings } from './settingsService';
import { Order } from '../types';

export interface SendSmsOptions {
  phone: string;
  message: string;
  orderId?: string;
}

/**
 * Sends an automated SMS to customer via configured SMS Gateway
 */
export const sendAutomatedSMS = async (options: SendSmsOptions): Promise<{ success: boolean; message: string }> => {
  const { phone, message } = options;
  const cleanPhone = phone ? phone.replace(/\D/g, '') : '';

  if (!cleanPhone || cleanPhone.length < 10) {
    return { success: false, message: 'Invalid phone number' };
  }

  try {
    const settings = await getBrandSettings();
    const gateway = settings?.smsGateway || 'device';

    if (gateway === 'device') {
      // Return log indicating device fallback or auto trigger
      console.log(`[SMS Log] Device mode selected. Target: ${cleanPhone}, Msg: ${message}`);
      return { success: true, message: 'Device mode ready' };
    }

    if (gateway === 'greenweb' && settings?.smsGreenwebToken) {
      const url = `https://api.greenweb.com.bd/api.php?json&token=${encodeURIComponent(settings.smsGreenwebToken)}&to=${encodeURIComponent(cleanPhone)}&message=${encodeURIComponent(message)}`;
      const res = await fetch(url);
      if (res.ok) {
        return { success: true, message: 'SMS sent via Greenweb' };
      }
    }

    if (gateway === 'elitbuzz' && settings?.smsElitbuzzApiKey && settings?.smsElitbuzzSenderId) {
      const url = `https://api.elitbuzz-bd.com/smsapi?api_key=${encodeURIComponent(settings.smsElitbuzzApiKey)}&type=text&contacts=${encodeURIComponent(cleanPhone)}&senderid=${encodeURIComponent(settings.smsElitbuzzSenderId)}&msg=${encodeURIComponent(message)}`;
      const res = await fetch(url);
      if (res.ok) {
        return { success: true, message: 'SMS sent via Elitbuzz' };
      }
    }

    if (gateway === 'mimsms' && settings?.smsMimsmsApiKey && settings?.smsMimsmsSenderId) {
      const url = `https://mimsmsprov2.com/api/sendsms?api_key=${encodeURIComponent(settings.smsMimsmsApiKey)}&type=text&phone=${encodeURIComponent(cleanPhone)}&sender_id=${encodeURIComponent(settings.smsMimsmsSenderId)}&message=${encodeURIComponent(message)}`;
      const res = await fetch(url);
      if (res.ok) {
        return { success: true, message: 'SMS sent via MIM SMS' };
      }
    }

    if (gateway === 'twilio' && settings?.smsTwilioSid && settings?.smsTwilioAuthToken && settings?.smsTwilioFrom) {
      const b64 = btoa(`${settings.smsTwilioSid}:${settings.smsTwilioAuthToken}`);
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${settings.smsTwilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${b64}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: cleanPhone.startsWith('+') ? cleanPhone : `+88${cleanPhone}`,
          From: settings.smsTwilioFrom,
          Body: message
        })
      });
      if (res.ok) {
        return { success: true, message: 'SMS sent via Twilio' };
      }
    }

    return { success: false, message: 'SMS Gateway not configured or response failed' };
  } catch (err: any) {
    console.warn("SMS Dispatch Exception:", err);
    return { success: false, message: err.message || 'Network error sending SMS' };
  }
};

/**
 * Dispatch automated order update notification SMS when order status changes or order is placed
 */
export const dispatchOrderSMSNotification = async (
  order: Order, 
  status: 'Pending' | 'Confirmed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled'
) => {
  if (!order || !order.mobileNumber) return;

  const trackingUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}?track=${encodeURIComponent(order.orderId)}`
    : `https://serafashion.com?track=${encodeURIComponent(order.orderId)}`;

  let message = '';

  switch (status) {
    case 'Pending':
    case 'Confirmed':
      message = `প্রিয় ${order.customerName || 'কাস্টমার'}, অভিনন্দন! সেরা (Sera) থেকে আপনার #${order.orderId} নং অর্ডারটি সফলভাবে নেওয়া হয়েছে। মোট মূল্য: ৳${order.totalAmount}। অর্ডার ট্র্যাকিং করুন: ${trackingUrl}`;
      break;
    case 'Processing':
      message = `সালামু আলাইকুম ${order.customerName || 'কাস্টমার'}, আপনার #${order.orderId} নং অর্ডারটির প্যা্যাকিং শুরু হয়েছে। শীঘ্রই কুরিয়ারে শিফট করা হবে। অর্ডার স্টেটাস: ${trackingUrl}`;
      break;
    case 'Shipped':
      message = `প্রিয় ${order.customerName || 'কাস্টমার'}, আপনার #${order.orderId} নং পার্সেলটি কুরিয়ারে হস্তান্তর করা হয়েছে। পার্সেল রিসিভ করতে প্রস্তুত থাকুন। লাইভ ট্র্যাকিং: ${trackingUrl}`;
      break;
    case 'Delivered':
      message = `প্রিয় ${order.customerName || 'কাস্টমার'}, সেরা (Sera) থেকে আপনার #${order.orderId} নং অর্ডারটি সফলভাবে ডেলিভারি হয়েছে। আমাদের সাথে থাকার জন্য ধন্যবাদ!`;
      break;
    case 'Cancelled':
      message = `প্রিয় ${order.customerName || 'কাস্টমার'}, দুঃখিত! সেরা (Sera) থেকে আপনার #${order.orderId} নং অর্ডারটি বাতিল করা হয়েছে। যেকোনো তথ্যের জন্য আমাদের পেজে ইনবক্স করুন।`;
      break;
    default:
      message = `প্রিয় ${order.customerName || 'কাস্টমার'}, আপনার #${order.orderId} নং অর্ডারের বর্তমান অবস্থা: ${status}। ট্র্যাকিং: ${trackingUrl}`;
      break;
  }

  return sendAutomatedSMS({
    phone: order.mobileNumber,
    message,
    orderId: order.orderId
  });
};
