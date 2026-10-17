import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Lock, Phone, MapPin, Package, ShoppingBag, Truck, 
  CheckCircle2, Clock, Eye, EyeOff, Edit3, LogOut, ChevronRight, 
  X, RefreshCw, ShieldCheck, Crown, ExternalLink, 
  FileText, AlertCircle, ArrowRight, Home, Heart,
  Sparkles, Megaphone, Copy, Check, Gift, Tag, MessageSquare
} from 'lucide-react';
import { CustomerUser, CustomerAnnouncement, Order } from '../types';
import { 
  getLoggedInCustomer, registerCustomer, loginCustomer, 
  updateCustomerProfile, logoutCustomer, getCustomerOrders,
  normalizeBanglaPhone, getActiveCustomerAnnouncement 
} from '../services/customerAuthService';
import { DISTRICTS, DISTRICT_UPAZILA_MAP } from '../constants';
import { DigitalInvoice } from './DigitalInvoice';
import { generateReferralCodeForPhone } from '../services/loyaltyService';

interface CustomerPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTracking?: (orderId: string) => void;
  onStartShopping?: () => void;
}

export default function CustomerPortalModal({
  isOpen,
  onClose,
  onOpenTracking,
  onStartShopping
}: CustomerPortalModalProps) {
  const [customer, setCustomer] = useState<CustomerUser | null>(getLoggedInCustomer);
  const [activeTab, setActiveTab] = useState<'orders' | 'profile'>('orders');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login Form States
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register Form States (Simplified to Name, Phone, Password & Confirm Password)
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Profile Edit States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editUpazila, setEditUpazila] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'processing' | 'delivered'>('all');
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [activeAnnouncement, setActiveAnnouncement] = useState<CustomerAnnouncement | null>(null);
  const [copiedCouponCode, setCopiedCouponCode] = useState(false);

  // General Status Messages
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Listen to auth changes
  useEffect(() => {
    const handleAuthChange = (e: any) => {
      setCustomer(e.detail || getLoggedInCustomer());
    };
    window.addEventListener('customer_auth_changed', handleAuthChange);
    return () => window.removeEventListener('customer_auth_changed', handleAuthChange);
  }, []);

  // When modal opens or customer changes, reload orders
  useEffect(() => {
    if (isOpen) {
      const current = getLoggedInCustomer();
      setCustomer(current);
      if (current) {
        setEditName(current.name || '');
        setEditAddress(current.address || '');
        setEditDistrict(current.district || 'Dhaka');
        setEditUpazila(current.upazila || '');
        setEditEmail(current.email || '');
        loadOrders(current.phone);
      }
      // Load active promotional announcement for logged-in or viewing customers
      getActiveCustomerAnnouncement().then(ann => {
        setActiveAnnouncement(ann);
      }).catch(err => console.warn('Failed to load active promo announcement:', err));
    }
  }, [isOpen, customer?.phone]);

  const loadOrders = async (phone: string) => {
    if (!phone) return;
    setOrdersLoading(true);
    try {
      const list = await getCustomerOrders(phone);
      setOrders(list);
    } catch (e) {
      console.warn('Failed to load customer orders:', e);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setStatusMessage(null);

    const res = await loginCustomer(loginPhone, loginPassword);
    setActionLoading(false);

    if (res.success && res.customer) {
      setCustomer(res.customer);
      setStatusMessage({ type: 'success', text: `স্বাগতম, ${res.customer.name}! আপনার অ্যাকাউন্টে সফলভাবে লগইন হয়েছে।` });
      loadOrders(res.customer.phone);
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'লগইন ব্যর্থ হয়েছে।' });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const trimmedName = regName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setStatusMessage({ type: 'error', text: 'দয়া করে আপনার সম্পূর্ণ নাম লিখুন।' });
      return;
    }

    const normalizedPhone = normalizeBanglaPhone(regPhone);
    if (!normalizedPhone || normalizedPhone.length < 11) {
      setStatusMessage({ type: 'error', text: 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।' });
      return;
    }

    if (!regPassword || regPassword.length < 4) {
      setStatusMessage({ type: 'error', text: 'পাসওয়ার্ড কমপক্ষে ৪ সংখ্যার হতে হবে।' });
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setStatusMessage({ type: 'error', text: 'পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না। পুনরায় চেক করুন।' });
      return;
    }

    setActionLoading(true);

    const res = await registerCustomer({
      name: trimmedName,
      phone: normalizedPhone,
      password: regPassword
    });
    setActionLoading(false);

    if (res.success && res.customer) {
      setCustomer(res.customer);
      setStatusMessage({ type: 'success', text: `অভিনন্দন ${res.customer.name}! আপনার রেজিস্ট্রেশন সফলভাবে সম্পন্ন হয়েছে।` });
      setRegName('');
      setRegPhone('');
      setRegPassword('');
      setRegConfirmPassword('');
      loadOrders(res.customer.phone);
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে।' });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setStatusMessage(null);

    const updates: Partial<CustomerUser> = {
      name: editName,
      address: editAddress,
      district: editDistrict,
      upazila: editUpazila,
      email: editEmail
    };
    if (editPassword) {
      updates.password = editPassword;
    }

    const res = await updateCustomerProfile(updates);
    setActionLoading(false);

    if (res.success && res.customer) {
      setCustomer(res.customer);
      setIsEditingProfile(false);
      setStatusMessage({ type: 'success', text: 'প্রোফাইল তথ্য সফলভাবে আপডেট হয়েছে!' });
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'আপডেট করতে সমস্যা হয়েছে।' });
    }
  };

  const handleLogout = () => {
    logoutCustomer();
    setCustomer(null);
    setOrders([]);
    setStatusMessage({ type: 'success', text: 'সফলভাবে লগআউট করা হয়েছে।' });
  };

  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'all') return true;
    const s = (o.status || '').toLowerCase();
    if (orderFilter === 'pending') return s.includes('pend');
    if (orderFilter === 'processing') return s.includes('process') || s.includes('confirm') || s.includes('ship');
    if (orderFilter === 'delivered') return s.includes('deliver');
    return true;
  });

  const totalSpent = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const deliveredCount = orders.filter(o => (o.status || '').toLowerCase().includes('deliver')).length;
  const inProgressCount = orders.filter(o => {
    const s = (o.status || '').toLowerCase();
    return s.includes('pend') || s.includes('confirm') || s.includes('process') || s.includes('ship');
  }).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-amber-500/20 max-h-[92vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="relative bg-gradient-to-r from-slate-950 via-zinc-900 to-slate-950 text-white p-5 sm:p-6 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-rose-500 to-amber-600 flex items-center justify-center shadow-lg shadow-rose-900/40 border border-white/20">
              <User size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide text-white">
                  {customer ? 'কাস্টমার একাউন্ট পোর্টাল' : 'কাস্টমার একাউন্ট ও অর্ডার লগইন'}
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-black border border-amber-400/30">
                  <Crown size={11} /> SERA FASHION VIP
                </span>
              </div>
              <p className="text-xs text-gray-300 font-medium">
                {customer 
                  ? `লগইন আছেন: ${customer.name} (${customer.phone})` 
                  : 'রেজিস্ট্রেশন বা লগইন করে আপনার সব অর্ডার ও তথ্য এক জায়গায় দেখুন'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="বন্ধ করুন"
          >
            <X size={20} />
          </button>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div className={`px-5 py-3 text-xs font-bold flex items-center justify-between gap-2 ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-b border-rose-200'
          }`}>
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{statusMessage.text}</span>
            </div>
            <button 
              onClick={() => setStatusMessage(null)}
              className="text-xs font-black underline hover:opacity-80"
            >
              ঠিক আছে
            </button>
          </div>
        )}

        {/* Modal Body: Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 space-y-6">
          {/* VIEW 1: Customer Not Logged In */}
          {!customer ? (
            <div className="max-w-md mx-auto space-y-6 py-2">
              {/* Login / Register Tab Selector */}
              <div className="grid grid-cols-2 bg-gray-100 p-1 rounded-2xl border border-gray-200 shadow-inner">
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setStatusMessage(null); }}
                  className={`py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    authMode === 'login'
                      ? 'bg-white text-brand-charcoal shadow-md border border-gray-100'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Lock size={14} />
                  <span>লগইন (Login)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('register'); setStatusMessage(null); }}
                  className={`py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    authMode === 'register'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <span>নতুন রেজিস্ট্রেশন (Register)</span>
                </button>
              </div>

              {/* A. LOGIN FORM */}
              {authMode === 'login' ? (
                <form onSubmit={handleLogin} className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-sm space-y-4">
                  <div className="text-center space-y-1 pb-2">
                    <h3 className="text-base font-black text-brand-charcoal">আপনার অ্যাকাউন্টে লগইন করুন</h3>
                    <p className="text-xs text-gray-500">আপনার মোবাইল নম্বর দিয়ে সরাসরি অর্ডার ও প্রোফাইল চেক করুন</p>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">
                      মোবাইল নম্বর (Phone Number) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        required
                        value={loginPhone}
                        onChange={e => setLoginPhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 focus:bg-white focus:border-rose-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-black text-gray-700">
                        পাসওয়ার্ড (Password)
                      </label>
                      <span className="text-[10px] text-gray-400">(যদি আগে দিয়ে থাকেন)</span>
                    </div>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showLoginPassword ? "text" : "password"}
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        placeholder="পাসওয়ার্ড লিখুন (অথবা খালি রাখুন)"
                        className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 focus:bg-white focus:border-rose-500 focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50/80 border border-amber-200/60 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                    💡 <span className="font-bold">সহজ লগইন:</span> আপনি ইতিপূর্বে অর্ডার করে থাকলে, আপনার অর্ডার করা মোবাইল নম্বরটি লিখলেই সরাসরি অ্যাকাউন্টটি খুলে যাবে।
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full py-3.5 bg-brand-charcoal text-white hover:bg-black rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? <RefreshCw size={16} className="animate-spin" /> : <Lock size={16} />}
                    <span>লগইন করুন (Login to Account)</span>
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      নতুন কাস্টমার? এখানে ক্লিক করে রেজিস্ট্রেশন করুন →
                    </button>
                  </div>
                </form>
              ) : (
                /* B. REGISTER FORM (Simplified: Name, Phone, Password, Confirm Password) */
                <form onSubmit={handleRegister} className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-sm space-y-4">
                  <div className="text-center space-y-1 pb-2">
                    <h3 className="text-base font-black text-brand-charcoal">নতুন কাস্টমার রেজিস্ট্রেশন</h3>
                    <p className="text-xs text-gray-500">নাম, মোবাইল নম্বর ও পাসওয়ার্ড দিয়ে সরাসরি অ্যাকাউন্ট তৈরি করুন</p>
                  </div>

                  {/* 1. Name */}
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">
                      আপনার নাম (Full Name) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={e => setRegName(e.target.value)}
                        placeholder="উদা: মোসাঃ ফাতেমা খাতুন"
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 focus:bg-white focus:border-rose-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* 2. Phone */}
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">
                      মোবাইল নম্বর (Phone Number) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        required
                        value={regPhone}
                        onChange={e => setRegPhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 focus:bg-white focus:border-rose-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* 3. Password */}
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">
                      পাসওয়ার্ড (Password) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showRegPassword ? "text" : "password"}
                        required
                        value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        placeholder="কমপক্ষে ৪ সংখ্যার পাসওয়ার্ড দিন"
                        className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 focus:bg-white focus:border-rose-500 focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-1"
                        title={showRegPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                      >
                        {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* 4. Confirm Password */}
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">
                      কনফার্ম পাসওয়ার্ড (Confirm Password) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showRegConfirmPassword ? "text" : "password"}
                        required
                        value={regConfirmPassword}
                        onChange={e => setRegConfirmPassword(e.target.value)}
                        placeholder="একই পাসওয়ার্ড পুনরায় দিন"
                        className={`w-full pl-10 pr-10 py-3 bg-gray-50 border rounded-2xl text-xs font-bold text-gray-800 focus:bg-white focus:outline-none transition-all ${
                          regConfirmPassword && regPassword !== regConfirmPassword
                            ? 'border-rose-400 focus:border-rose-500'
                            : 'border-gray-200 focus:border-rose-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-1"
                        title={showRegConfirmPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                      >
                        {showRegConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {regConfirmPassword && regPassword !== regConfirmPassword && (
                      <p className="text-[11px] text-rose-500 font-bold mt-1">পাসওয়ার্ড মিলছে না</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {actionLoading && <RefreshCw size={16} className="animate-spin" />}
                    <span>রেজিস্ট্রেশন সম্পন্ন করুন (Register)</span>
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="text-xs font-bold text-gray-600 hover:text-brand-charcoal underline cursor-pointer"
                    >
                      ইতিমধ্যে অ্যাকাউন্ট আছে? এখানে লগইন করুন →
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* VIEW 2: Customer Logged In Dashboard */
            <div className="space-y-6">
              {/* Customer Profile Banner Card */}
              <div className="bg-gradient-to-br from-slate-900 via-zinc-900 to-black text-white p-5 sm:p-6 rounded-3xl border border-amber-500/30 shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-rose-500 to-amber-600 p-0.5 shadow-lg flex items-center justify-center font-black text-2xl text-white">
                      {customer.name ? customer.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-white">{customer.name}</h3>
                        <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1">
                          <Crown size={11} /> VIP
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-300 font-medium">
                        <span className="flex items-center gap-1 text-amber-300 font-bold">
                          <Phone size={13} /> {customer.phone}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-gray-400">
                          <MapPin size={13} /> {customer.district || 'ঢাকা'} {customer.upazila ? `(${customer.upazila})` : ''}
                        </span>
                      </div>
                      {customer.address && (
                        <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">
                          {customer.address}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => setIsEditingProfile(!isEditingProfile)}
                      className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border border-white/10"
                    >
                      <Edit3 size={14} />
                      <span>{isEditingProfile ? 'প্রোফাইল ভিউ' : 'তথ্য পরিবর্তন'}</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 hover:text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border border-rose-500/30"
                    >
                      <LogOut size={14} />
                      <span>লগআউট</span>
                    </button>
                  </div>
                </div>

                {/* Quick Order Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-5 border-t border-white/10">
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-center">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">মোট অর্ডার</p>
                    <p className="text-lg font-black text-amber-300">{orders.length}</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-center">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">ডেলিভার্ড</p>
                    <p className="text-lg font-black text-emerald-400">{deliveredCount}</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-center">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">প্রসেসিং এ আছে</p>
                    <p className="text-lg font-black text-sky-400">{inProgressCount}</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-center">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">মোট কেনাকাটা</p>
                    <p className="text-lg font-black text-rose-400">৳{totalSpent.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* 🎁 REGISTERED CUSTOMER REFER & EARN ৳100 BONUS CARD */}
              <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/5 border-2 border-amber-400/40 p-4 sm:p-5 rounded-3xl shadow-sm text-left space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center shadow-xs shrink-0">
                      <Gift size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 font-serif">
                        বন্ধু রেফার করুন ও পান ৳১০০ ক্যাশ বোনাস!
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium">
                        আপনার বন্ধু প্রথম অর্ডারে পাবে ৳৫০ ছাড়, আর আপনার একাউন্টে জমা হবে ৳১০০ ক্যাশ রিওয়ার্ড!
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full border border-rose-200 self-start sm:self-center">
                    +৳১০০ বোনাস
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200/80 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">আপনার রেফার কোড:</span>
                      <span className="text-xs font-mono font-black text-slate-900 tracking-wider">
                        {generateReferralCodeForPhone(customer.phone)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const code = generateReferralCodeForPhone(customer.phone);
                        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://serafashion.com';
                        navigator.clipboard.writeText(`${baseUrl}?ref=${code}`);
                        setStatusMessage({ type: 'success', text: 'রেফারেল লিংক কপি হয়েছে!' });
                        setTimeout(() => setStatusMessage(null), 2500);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                    >
                      <Copy size={12} />
                      <span>লিংক কপি</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const code = generateReferralCodeForPhone(customer.phone);
                      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://serafashion.com';
                      const link = `${baseUrl}?ref=${code}`;
                      const text = `আসসালামু আলাইকুম! সেরা ফ্যাশন (SERA FASHION) থেকে প্রিমিয়াম শাড়ি ও থ্রি-পিস অর্ডার করুন। আমার রেফারেল লিংক থেকে অর্ডার করলেই পাবেন সাথে সাথে ৳৫০ ছাড়! 🛍️\n\nঅর্ডার লিংক: ${link}\nরেফার কোড: ${code}`;
                      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    className="py-2.5 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <MessageSquare size={14} />
                    <span>WhatsApp-এ রেফার করুন</span>
                  </button>
                </div>
              </div>

              {/* ACTIVE PROMO ANNOUNCEMENT BANNER FOR REGISTERED CUSTOMER */}
              {activeAnnouncement && (
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-500/15 border-2 border-amber-400/40 p-5 shadow-lg backdrop-blur-sm">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-sm animate-pulse">
                          <Gift size={12} />
                          {activeAnnouncement.badgeText || 'এক্সক্লুসিভ অফার'}
                        </span>
                        <span className="text-[11px] font-bold text-amber-700">শুধুমাত্র আমাদের রেজিস্টার্ড গ্রাহকদের জন্য</span>
                      </div>
                      <h4 className="text-base font-black text-slate-900">{activeAnnouncement.title}</h4>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{activeAnnouncement.message}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
                      {activeAnnouncement.couponCode && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(activeAnnouncement.couponCode || '');
                            setCopiedCouponCode(true);
                            setTimeout(() => setCopiedCouponCode(false), 2000);
                          }}
                          className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-amber-400 rounded-xl shadow-sm text-xs font-black text-slate-800 hover:bg-amber-50 transition cursor-pointer"
                          title="কুপন কোড কপি করুন"
                        >
                          <Tag size={13} className="text-amber-600" />
                          <span>কুপন: <span className="font-mono text-rose-600 font-black">{activeAnnouncement.couponCode}</span></span>
                          {copiedCouponCode ? (
                            <Check size={14} className="text-emerald-600" />
                          ) : (
                            <Copy size={14} className="text-slate-400 hover:text-slate-700" />
                          )}
                        </button>
                      )}

                      {onStartShopping && (
                        <button
                          onClick={() => {
                            onClose();
                            onStartShopping();
                          }}
                          className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 text-white rounded-xl text-xs font-black shadow-md hover:shadow-rose-600/30 transition hover:scale-105 active:scale-95 cursor-pointer"
                        >
                          <ShoppingBag size={14} />
                          <span>অফার দেখুন</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* EDIT PROFILE FORM (Toggleable) */}
              <AnimatePresence>
                {isEditingProfile && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
                  >
                    <h4 className="text-xs font-black text-brand-charcoal uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Edit3 size={15} className="text-rose-600" />
                      <span>প্রোফাইল ও ডেলিভারি তথ্য সম্পাদনা</span>
                    </h4>

                    <form onSubmit={handleUpdateProfile} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-black text-gray-700 mb-1">নাম</label>
                          <input
                            type="text"
                            required
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:border-rose-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black text-gray-700 mb-1">ইমেইল (ঐচ্ছিক)</label>
                          <input
                            type="email"
                            value={editEmail}
                            onChange={e => setEditEmail(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:border-rose-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-gray-700 mb-1">সম্পূর্ণ ঠিকানা</label>
                        <textarea
                          rows={2}
                          value={editAddress}
                          onChange={e => setEditAddress(e.target.value)}
                          placeholder="বাসা নং, রোড নং, এলাকা"
                          className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:border-rose-500 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-black text-gray-700 mb-1">জেলা</label>
                          <select
                            value={editDistrict}
                            onChange={e => {
                              setEditDistrict(e.target.value);
                              setEditUpazila('');
                            }}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:border-rose-500 focus:outline-none"
                          >
                            {DISTRICTS.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-black text-gray-700 mb-1">থানা / উপজেলা</label>
                          <select
                            value={editUpazila}
                            onChange={e => setEditUpazila(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:border-rose-500 focus:outline-none"
                          >
                            <option value="">নির্বাচন করুন</option>
                            {(DISTRICT_UPAZILA_MAP[editDistrict] || []).map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-gray-700 mb-1">
                          নতুন পাসওয়ার্ড (পরিবর্তন করতে চাইলে লিখুন)
                        </label>
                        <input
                          type="password"
                          value={editPassword}
                          onChange={e => setEditPassword(e.target.value)}
                          placeholder="পরিবর্তন না করতে চাইলে খালি রাখুন"
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:border-rose-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 cursor-pointer"
                        >
                          বাতিল
                        </button>
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="px-5 py-2 bg-rose-600 text-white rounded-xl text-xs font-black hover:bg-rose-700 cursor-pointer shadow-md flex items-center gap-1.5"
                        >
                          {actionLoading && <RefreshCw size={14} className="animate-spin" />}
                          <span>সংরক্ষণ করুন</span>
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ORDERS LIST SECTION */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Package size={18} className="text-rose-600" />
                    <h4 className="text-sm font-black text-brand-charcoal">
                      আমার অর্ডারসমূহ ({orders.length}টি)
                    </h4>
                  </div>

                  {/* Filter chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    <button
                      onClick={() => setOrderFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        orderFilter === 'all'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      সকল ({orders.length})
                    </button>
                    <button
                      onClick={() => setOrderFilter('processing')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        orderFilter === 'processing'
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      চলমান ({inProgressCount})
                    </button>
                    <button
                      onClick={() => setOrderFilter('delivered')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        orderFilter === 'delivered'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      ডেলিভার্ড ({deliveredCount})
                    </button>
                    <button
                      onClick={() => loadOrders(customer.phone)}
                      className="p-1.5 bg-white text-gray-600 hover:text-rose-600 rounded-xl border border-gray-200 cursor-pointer"
                      title="অর্ডার রিফ্রেশ করুন"
                    >
                      <RefreshCw size={14} className={ordersLoading ? 'animate-spin text-rose-600' : ''} />
                    </button>
                  </div>
                </div>

                {/* Orders Content */}
                {ordersLoading ? (
                  <div className="bg-white p-12 rounded-3xl border border-gray-200 text-center space-y-3">
                    <RefreshCw size={28} className="animate-spin text-rose-600 mx-auto" />
                    <p className="text-xs font-bold text-gray-500">আপনার অর্ডারগুলো লোড করা হচ্ছে...</p>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="bg-white p-10 rounded-3xl border border-dashed border-gray-200 text-center space-y-3">
                    <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
                      <ShoppingBag size={24} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-black text-gray-700">কোনো অর্ডার পাওয়া যায়নি</p>
                      <p className="text-xs text-gray-400">
                        {orderFilter === 'all' 
                          ? 'আপনার এই মোবাইল নম্বর দিয়ে এখনও কোনো অর্ডার করা হয়নি।' 
                          : 'এই ফিল্টারে কোনো অর্ডার নেই।'}
                      </p>
                    </div>
                    {onStartShopping && (
                      <button
                        onClick={() => {
                          onClose();
                          onStartShopping();
                        }}
                        className="px-5 py-2.5 bg-rose-600 text-white rounded-2xl text-xs font-black hover:bg-rose-700 shadow-md inline-flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <ShoppingBag size={14} />
                        <span>কালেকশন দেখুন ও শপিং করুন</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {filteredOrders.map(order => {
                      const statusStr = (order.status || 'Pending').toLowerCase();
                      let statusBadgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
                      let statusLabel = 'অর্ডার গ্রহণ করা হয়েছে (পেন্ডিং)';

                      if (statusStr.includes('confirm')) {
                        statusBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                        statusLabel = 'কনফার্মড (Confirmed)';
                      } else if (statusStr.includes('process')) {
                        statusBadgeClass = 'bg-indigo-100 text-indigo-800 border-indigo-200';
                        statusLabel = 'প্রসেসিং এ আছে (Processing)';
                      } else if (statusStr.includes('ship')) {
                        statusBadgeClass = 'bg-sky-100 text-sky-800 border-sky-200';
                        statusLabel = 'ডেলিভারির পথে (Shipped)';
                      } else if (statusStr.includes('deliver')) {
                        statusBadgeClass = 'bg-emerald-600 text-white border-emerald-700';
                        statusLabel = 'ডেলিভারি সম্পন্ন (Delivered)';
                      } else if (statusStr.includes('cancel')) {
                        statusBadgeClass = 'bg-rose-100 text-rose-800 border-rose-200';
                        statusLabel = 'বাতিল করা হয়েছে (Cancelled)';
                      }

                      const orderItems = order.items && order.items.length > 0
                        ? order.items
                        : [{
                            id: '1',
                            productTitle: order.productCode || 'SERA FASHION Exclusive Collection',
                            productImage: order.productImage || '',
                            quantity: order.quantity || 1,
                            price: order.price || order.totalAmount || 0,
                            size: 'Standard',
                            category: order.category || 'THREE PIECE',
                            productCode: order.productCode || 'SFH-01',
                            productId: order.productId || ''
                          }];

                      return (
                        <div 
                          key={order.orderId || order.id}
                          className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all space-y-4"
                        >
                          {/* Order Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-xs text-brand-charcoal bg-gray-100 px-2 py-1 rounded-lg">
                                  #{order.orderId || order.id}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-black border ${statusBadgeClass}`}>
                                  {statusLabel}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                                <Clock size={12} />
                                {order.createdAt 
                                  ? new Date(order.createdAt).toLocaleDateString('bn-BD', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  : 'তারিখ সংরক্ষিত'}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-xs text-gray-400 font-bold">মোট টাকা</p>
                              <p className="text-base font-black text-rose-600">
                                ৳{(order.totalAmount || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          {/* Order Items Preview */}
                          <div className="space-y-2">
                            {orderItems.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-3 bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                                <div className="w-12 h-12 rounded-xl bg-white overflow-hidden border border-gray-200 flex-shrink-0">
                                  {item.productImage ? (
                                    <img 
                                      src={item.productImage} 
                                      alt={item.productTitle} 
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                      <Package size={18} />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="text-xs font-black text-brand-charcoal truncate">
                                    {item.productTitle}
                                  </h5>
                                  <p className="text-[11px] text-gray-500 font-medium">
                                    পরিমাণ: <span className="font-bold text-gray-800">{item.quantity}টি</span>
                                    {item.size ? ` • সাইজ: ${item.size}` : ''}
                                  </p>
                                </div>
                                <div className="text-right text-xs font-black text-brand-charcoal">
                                  ৳{(item.price * (item.quantity || 1)).toLocaleString()}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Address & Tracking footer */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
                            <div className="text-gray-500 text-[11px] flex items-center gap-1.5 max-w-sm truncate">
                              <MapPin size={13} className="text-rose-500 flex-shrink-0" />
                              <span className="truncate">
                                {order.address ? `${order.address}, ` : ''}{order.district || 'ঢাকা'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 ml-auto">
                              {/* View Invoice button */}
                              <button
                                type="button"
                                onClick={() => setSelectedInvoiceOrder(order)}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="ডিজিটাল রসিদ দেখুন"
                              >
                                <FileText size={13} />
                                <span>ইনভয়েস</span>
                              </button>

                              {/* Track order button */}
                              {onOpenTracking && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onOpenTracking(order.orderId || order.id || '');
                                  }}
                                  className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                                >
                                  <Truck size={13} />
                                  <span>লাইভ ট্র্যাকিং</span>
                                  <ArrowRight size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-500" />
            <span className="font-semibold">১০০% নিরাপদ ও সুরক্ষিত কাস্টমার ড্যাশবোর্ড</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold cursor-pointer transition-all"
          >
            বন্ধ করুন
          </button>
        </div>
      </motion.div>

      {/* Embedded Invoice Modal for viewing invoice from portal */}
      <AnimatePresence>
        {selectedInvoiceOrder && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="relative max-w-xl w-full max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setSelectedInvoiceOrder(null)}
                className="absolute -top-3 -right-3 z-20 w-8 h-8 rounded-full bg-white text-black font-black flex items-center justify-center shadow-lg hover:bg-gray-100 cursor-pointer"
              >
                ✕
              </button>
              <DigitalInvoice 
                order={selectedInvoiceOrder} 
                onClose={() => setSelectedInvoiceOrder(null)} 
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
