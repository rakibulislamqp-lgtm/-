import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  MessageCircle, 
  Database, 
  Truck, 
  RefreshCw, 
  ShieldCheck, 
  Lock, 
  ArrowUp,
  ExternalLink
} from 'lucide-react';
import { FacebookIcon, TwitterIcon, InstagramIcon, YoutubeIcon } from './SocialIcons';
import { BrandSettings, Category } from '../types';
import defaultLogo from '../assets/images/sfh_logo_1779435027377.png';
import FooterInfoModal, { FooterInfoType } from './FooterInfoModal';

interface FooterProps {
  brandSettings?: BrandSettings | null;
  onOpenAdmin?: () => void;
  onOpenOrderTracking?: () => void;
  onOpenReturnPolicy?: () => void;
  onSelectCategory?: (category: Category | 'ALL') => void;
}

export default function Footer({
  brandSettings,
  onOpenAdmin,
  onOpenOrderTracking,
  onOpenReturnPolicy,
  onSelectCategory
}: FooterProps) {
  const [modalType, setModalType] = useState<FooterInfoType | null>(null);

  const footerConfig = brandSettings?.footer;
  const brandName = (footerConfig?.brandName && footerConfig.brandName !== 'SERA') ? footerConfig.brandName : 'SERA FASHION';
  const logoUrl = brandSettings?.footerLogoUrl || brandSettings?.logoUrl || defaultLogo;
  const tagline = footerConfig?.tagline 
    ? footerConfig.tagline.replace(/\bSERA\b(?!\s*FASHION)/g, 'SERA FASHION')
    : 'SERA FASHION is an exclusive premium brand dedicated to authentic quality fashion, luxury three-piece and sarees to every home.';
  const subTagline = footerConfig?.subTagline || 'Pure & Authentic Luxury';
  const address = footerConfig?.address || 'ধানমন্ডি, ঢাকা, বাংলাদেশ';
  const phone = footerConfig?.phone || '+880 1700-000000';
  const email = footerConfig?.email || 'contact@serafashion.com';
  
  const facebookUrl = footerConfig?.facebookUrl || brandSettings?.facebookUrl || 'https://www.facebook.com';
  const twitterUrl = footerConfig?.twitterUrl || 'https://twitter.com';
  const instagramUrl = footerConfig?.instagramUrl || 'https://instagram.com';
  const youtubeUrl = footerConfig?.youtubeUrl || 'https://youtube.com';
  const whatsappNumber = footerConfig?.whatsappNumber || phone;

  const showAppDownload = footerConfig?.showAppDownload !== false;
  const playStoreUrl = footerConfig?.playStoreUrl || 'https://play.google.com';
  const appStoreUrl = footerConfig?.appStoreUrl || 'https://apps.apple.com';
  const showPaymentBadges = footerConfig?.showPaymentBadges !== false;
  const paymentSectionTitle = footerConfig?.paymentSectionTitle || 'Pay With';
  const copyrightText = footerConfig?.copyrightText || `Copyright © 2026 ${brandName}. All Rights Reserved.`;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategoryClick = (categoryName: string) => {
    if (onSelectCategory) {
      // Map category name to valid category or trigger smooth scroll
      onSelectCategory(categoryName as any);
    }
    const showcase = document.getElementById('products-showcase-section');
    if (showcase) {
      showcase.scrollIntoView({ behavior: 'smooth' });
    } else {
      scrollToTop();
    }
  };

  return (
    <footer id="main-site-footer" className="bg-white text-gray-700 font-sans border-t border-gray-200 mt-14 relative z-10">
      
      {/* Brand & Quick Navigation Bar: Brand Identity on Left, Professional Scroll to Top on Opposite Right */}
      <div className="border-b border-gray-100 bg-gradient-to-r from-amber-50/50 via-white to-amber-50/30 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-row items-center justify-between gap-4">
          
          {/* Left Side: Brand Logo & Name */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-black/90 p-1 border-2 border-brand-gold shadow-md flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-amber-500/20">
              <img 
                src={logoUrl} 
                alt={brandName} 
                className="w-full h-full object-cover rounded-xl"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = defaultLogo;
                }}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-2xl font-serif font-black tracking-tight text-slate-900 uppercase leading-none">
                {brandName}
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-gray-400 font-bold mt-1">
                {subTagline}
              </span>
            </div>
          </div>

          {/* Opposite (Right) Side: Professional "Scroll to Top" Button */}
          <button
            type="button"
            onClick={scrollToTop}
            id="footer-scroll-to-top-button"
            className="group flex items-center gap-2.5 sm:gap-3.5 px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white shadow-md hover:shadow-xl border border-amber-500/30 transition-all duration-200 active:scale-95 cursor-pointer shrink-0"
            title="পেজের শীর্ষে ফিরে যান"
          >
            <div className="flex flex-col text-right">
              <span className="text-xs sm:text-sm font-black text-amber-400 uppercase tracking-wider flex items-center justify-end gap-1 leading-tight">
                <span>উপরে উঠুন</span>
                <span className="hidden sm:inline text-[10px] text-gray-300 font-normal">(Top)</span>
              </span>
              <span className="text-[9px] sm:text-[10px] text-gray-300 font-medium leading-tight mt-0.5">
                পেজের শুরুতে যান
              </span>
            </div>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center group-hover:bg-amber-400 transition-all shadow-sm shrink-0">
              <ArrowUp size={16} strokeWidth={2.5} className="group-hover:-translate-y-1 transition-transform duration-200" />
            </div>
          </button>

        </div>
      </div>

      {/* Top Container with 4 Columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8">
          
          {/* Left Column: Mission, Contact & Social Links (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Tagline / Mission */}
            <p className="text-xs text-gray-500 leading-relaxed max-w-sm">
              {tagline}
            </p>

            {/* Contact details */}
            <div className="space-y-2.5 text-xs text-gray-600">
              <div className="flex items-start gap-2.5">
                <MapPin size={16} className="text-gray-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{address}</span>
              </div>

              <div className="flex items-center gap-2.5">
                <Phone size={16} className="text-gray-400 shrink-0" />
                <a 
                  href={`tel:${phone.replace(/\s+/g, '')}`} 
                  className="hover:text-amber-700 font-medium transition-colors font-mono"
                >
                  {phone}
                </a>
              </div>

              <div className="flex items-center gap-2.5">
                <Mail size={16} className="text-gray-400 shrink-0" />
                <a 
                  href={`mailto:${email}`} 
                  className="hover:text-amber-700 font-medium transition-colors"
                >
                  {email}
                </a>
              </div>
            </div>

            {/* Social Media Circular Buttons */}
            <div className="flex items-center gap-2.5 pt-1">
              {facebookUrl && (
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="w-9 h-9 rounded-full bg-amber-50 text-amber-800 hover:bg-amber-600 hover:text-white border border-amber-200/80 flex items-center justify-center transition-all shadow-xs"
                >
                  <FacebookIcon size={16} />
                </a>
              )}
              {twitterUrl && (
                <a
                  href={twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Twitter"
                  className="w-9 h-9 rounded-full bg-amber-50 text-amber-800 hover:bg-amber-600 hover:text-white border border-amber-200/80 flex items-center justify-center transition-all shadow-xs"
                >
                  <TwitterIcon size={16} />
                </a>
              )}
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-9 h-9 rounded-full bg-amber-50 text-amber-800 hover:bg-amber-600 hover:text-white border border-amber-200/80 flex items-center justify-center transition-all shadow-xs"
                >
                  <InstagramIcon size={16} />
                </a>
              )}
              {youtubeUrl && (
                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="w-9 h-9 rounded-full bg-amber-50 text-amber-800 hover:bg-amber-600 hover:text-white border border-amber-200/80 flex items-center justify-center transition-all shadow-xs"
                >
                  <YoutubeIcon size={16} />
                </a>
              )}
              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 flex items-center justify-center transition-all shadow-xs"
                >
                  <MessageCircle size={16} />
                </a>
              )}
            </div>

            {/* Download App on Mobile */}
            {showAppDownload && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-gray-700">
                  Download App on Mobile :
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Google Play Button */}
                  <a
                    href={playStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors shadow-xs"
                  >
                    <svg viewBox="0 0 512 512" className="w-5 h-5 fill-current text-emerald-400">
                      <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" />
                    </svg>
                    <div className="text-left leading-none">
                      <span className="text-[8px] uppercase tracking-wider block text-gray-400">GET IT ON</span>
                      <span className="text-[11px] font-bold block">Google Play</span>
                    </div>
                  </a>

                  {/* App Store Button */}
                  <a
                    href={appStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors shadow-xs"
                  >
                    <svg viewBox="0 0 170 170" className="w-5 h-5 fill-current text-white">
                      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.66-7.73-11.88-14.07-5.46-8.26-9.82-17.51-13.08-27.76-3.26-10.25-4.89-20.2-4.89-29.84 0-14.15 3.6-25.96 10.79-35.43 7.19-9.47 16.32-14.28 27.4-14.43 4.8 0 10.21 1.25 16.24 3.76 6.03 2.5 9.77 3.86 11.22 4.07 2.06-.41 6.09-1.89 12.09-4.44 6-2.55 11.37-3.72 16.12-3.52 12.87.64 23.13 5.46 30.77 14.47-11.38 6.87-16.97 16.43-16.78 28.67.2 9.69 3.85 17.77 10.96 24.23 7.11 6.46 15.35 10.02 24.71 10.68-2.22 6.53-4.93 13.06-8.15 19.59zM119.22 33.15c0-7.23 2.65-13.97 7.95-20.22 5.3-6.25 11.75-10.42 19.34-12.52.22 1.4.33 2.7.33 3.9 0 7.23-2.73 14.15-8.18 20.76-5.46 6.61-12.04 10.59-19.74 11.95-.2-.93-.3-1.9-.3-2.91z" />
                    </svg>
                    <div className="text-left leading-none">
                      <span className="text-[8px] uppercase tracking-wider block text-gray-400">Download on the</span>
                      <span className="text-[11px] font-bold block">App Store</span>
                    </div>
                  </a>
                </div>
              </div>
            )}

          </div>

          {/* Right Columns: 4 Nav Menus (lg:col-span-8) */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-6 lg:gap-6 pt-2">
            
            {/* Column 1: Information */}
            <div className="space-y-3.5">
              <h4 className="text-sm font-bold text-gray-900 tracking-tight">
                Information
              </h4>
              <ul className="space-y-2 text-xs text-gray-500">
                <li>
                  <button 
                    onClick={() => setModalType('about')}
                    className="hover:text-amber-700 transition-colors text-left cursor-pointer"
                  >
                    About us
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setModalType('contact')}
                    className="hover:text-amber-700 transition-colors text-left cursor-pointer"
                  >
                    Contact us
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setModalType('company')}
                    className="hover:text-amber-700 transition-colors text-left cursor-pointer"
                  >
                    Company Information
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setModalType('stories')}
                    className="hover:text-amber-700 transition-colors text-left cursor-pointer"
                  >
                    {brandName} Stories
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setModalType('terms')}
                    className="hover:text-amber-700 transition-colors text-left cursor-pointer"
                  >
                    Terms & Conditions
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setModalType('privacy')}
                    className="hover:text-amber-700 transition-colors text-left cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setModalType('careers')}
                    className="hover:text-amber-700 transition-colors text-left cursor-pointer"
                  >
                    Careers
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 2: Shop By */}
            <div className="space-y-3.5">
              <h4 className="text-sm font-bold text-gray-900 tracking-tight">
                Shop By
              </h4>
              <ul className="space-y-2 text-xs text-gray-500">
                <li>
                  <button 
                    onClick={() => handleCategoryClick('KATAN')}
                    className="hover:text-amber-700 transition-colors text-left cursor-pointer"
                  >
                    কাতান শাড়ি (Katan)
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleCategoryClick('SILK')}
                    className="hover:text-amber-700 transition-colors text-left cursor-pointer"
                  >
                    সিল্ক শাড়ি (Silk)
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleCategoryClick('JAMDANI')}
                    className="hover:text-amber-700 transition-colors text-left cursor-pointer"
                  >
                    জামদানি (Jamdani)
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleCategoryClick('THREE_PIECE')}
                    className="hover:text-amber-700 transition-colors text-left cursor-pointer"
                  >
                    থ্রি-পিস (Three Piece)
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleCategoryClick('COTTON')}
                    className="hover:text-amber-700 transition-colors text-left cursor-pointer"
                  >
                    সুতি শাড়ি (Cotton)
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleCategoryClick('ALL')}
                    className="hover:text-amber-700 transition-colors text-left cursor-pointer font-medium text-amber-700"
                  >
                    সবগুলো পণ্য (All Items)
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Support */}
            <div className="space-y-3.5">
              <h4 className="text-sm font-bold text-gray-900 tracking-tight">
                Support
              </h4>
              <ul className="space-y-2 text-xs text-gray-500">
                <li>
                  <button 
                    onClick={() => setModalType('support_center')}
                    className="hover:text-amber-700 transition-colors text-left cursor-pointer"
                  >
                    Support Center
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setModalType('how_to_order')}
                    className="hover:text-amber-700 transition-colors text-left cursor-pointer"
                  >
                    How to Order
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => {
                      if (onOpenOrderTracking) onOpenOrderTracking();
                      else setModalType('support_center');
                    }}
                    className="text-amber-700 font-bold hover:underline transition-all text-left flex items-center gap-1 cursor-pointer"
                  >
                    <Truck size={13} className="text-amber-600 animate-pulse" />
                    <span>Order Tracking</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setModalType('terms')}
                    className="hover:text-amber-700 transition-colors text-left cursor-pointer"
                  >
                    Payment
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setModalType('shipping')}
                    className="hover:text-amber-700 transition-colors text-left cursor-pointer"
                  >
                    Shipping
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setModalType('faq')}
                    className="hover:text-amber-700 transition-colors text-left cursor-pointer"
                  >
                    FAQ
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Consumer Policy */}
            <div className="space-y-3.5">
              <h4 className="text-sm font-bold text-gray-900 tracking-tight">
                Consumer Policy
              </h4>
              <ul className="space-y-2 text-xs text-gray-500">
                <li>
                  <button 
                    onClick={() => {
                      if (onOpenReturnPolicy) onOpenReturnPolicy();
                      else setModalType('refund_policy');
                    }}
                    className="text-emerald-700 font-bold hover:underline transition-all text-left cursor-pointer"
                  >
                    Happy Return
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setModalType('refund_policy')}
                    className="hover:text-amber-700 transition-colors text-left cursor-pointer"
                  >
                    Refund Policy
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setModalType('exchange')}
                    className="hover:text-amber-700 transition-colors text-left cursor-pointer"
                  >
                    Exchange
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setModalType('cancellation')}
                    className="hover:text-amber-700 transition-colors text-left cursor-pointer"
                  >
                    Cancellation
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setModalType('terms')}
                    className="hover:text-amber-700 transition-colors text-left cursor-pointer"
                  >
                    Pre-Order
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setModalType('how_to_order')}
                    className="hover:text-amber-700 transition-colors text-left cursor-pointer"
                  >
                    Extra Discount
                  </button>
                </li>
              </ul>
            </div>

          </div>

        </div>
      </div>

      {/* Pay With & Payment Methods Ribbon Section (Fully Mobile-Friendly & Responsive) */}
      {showPaymentBadges && (
        <div className="border-t border-gray-200 py-6 bg-slate-50/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-5">
              
              {/* "Pay With" Label & Responsive Badges Container */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start lg:items-center gap-3 w-full lg:w-auto">
                <span className="text-xs sm:text-sm font-black text-gray-800 tracking-tight uppercase sm:capitalize whitespace-nowrap bg-white/80 px-2.5 py-1 rounded-lg border border-gray-200/60 shadow-2xs">
                  {paymentSectionTitle}
                </span>

                {/* Gateway Badges: Fluid wrap on mobile, elegant grid, zero overflow scrollbar */}
                <div className="w-full sm:w-auto bg-white border border-gray-200/90 rounded-2xl p-2.5 sm:p-3 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
                    
                    {/* VISA */}
                    <span className="px-2.5 py-1 bg-white border border-gray-200/90 rounded-lg text-[10.5px] font-black text-[#1A1F71] tracking-wider shadow-2xs hover:border-gray-300 transition-colors">
                      VISA
                    </span>

                    {/* Mastercard */}
                    <span className="px-2.5 py-1 bg-white border border-gray-200/90 rounded-lg text-[10px] font-black text-[#EB001B] tracking-tight flex items-center gap-0.5 shadow-2xs hover:border-gray-300 transition-colors">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#EB001B] inline-block -mr-1"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-[#F79E1B] inline-block"></span>
                      <span className="ml-1 text-gray-800">mastercard</span>
                    </span>

                    {/* AMEX */}
                    <span className="px-2 py-1 bg-[#006FCF] text-white rounded-lg text-[10px] font-black tracking-tighter shadow-2xs">
                      AMEX
                    </span>

                    {/* bKash */}
                    <span className="px-2.5 py-1 bg-[#D12053] text-white rounded-lg text-[10px] font-black tracking-tight shadow-2xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                      <span>bKash</span>
                    </span>

                    {/* Nagad */}
                    <span className="px-2.5 py-1 bg-[#F7931E] text-white rounded-lg text-[10px] font-black tracking-tight shadow-2xs">
                      নগদ
                    </span>

                    {/* Rocket */}
                    <span className="px-2.5 py-1 bg-[#8C3494] text-white rounded-lg text-[10px] font-black tracking-tight shadow-2xs">
                      Rocket
                    </span>

                    {/* Upay */}
                    <span className="px-2 py-1 bg-white border border-gray-200/90 rounded-lg text-[9.5px] font-bold text-blue-600 shadow-2xs">
                      Upay
                    </span>

                    {/* DBBL Nexus */}
                    <span className="px-2 py-1 bg-white border border-gray-200/90 rounded-lg text-[9.5px] font-black text-[#006633] shadow-2xs">
                      DBBL Nexus
                    </span>

                    {/* City Bank */}
                    <span className="px-2 py-1 bg-white border border-gray-200/90 rounded-lg text-[9.5px] font-bold text-red-600 shadow-2xs">
                      City Bank
                    </span>

                    {/* Bank Asia */}
                    <span className="px-2 py-1 bg-white border border-gray-200/90 rounded-lg text-[9.5px] font-bold text-blue-700 shadow-2xs">
                      Bank Asia
                    </span>

                    {/* IBBL */}
                    <span className="px-2 py-1 bg-white border border-gray-200/90 rounded-lg text-[9.5px] font-bold text-emerald-700 shadow-2xs">
                      IBBL
                    </span>

                    {/* Cash on Delivery (COD) */}
                    <span className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-black tracking-wider flex items-center gap-1 shadow-2xs transition-colors">
                      <span>💵</span>
                      <span>Cash On Delivery</span>
                    </span>

                  </div>
                </div>
              </div>

              {/* Verified Badges (SSLCOMMERZ / 100% Secured) */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 shrink-0 w-full sm:w-auto">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-xl shadow-2xs">
                  <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <ShieldCheck size={14} />
                  </div>
                  <div className="text-left leading-tight">
                    <span className="text-[7.5px] uppercase tracking-wider text-gray-400 font-bold block">Verified by</span>
                    <span className="text-[11px] font-black text-blue-900 tracking-tight block">SSLCOMMERZ</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl shadow-2xs">
                  <Lock size={12} className="text-emerald-600" />
                  <span className="text-[10px] font-bold text-gray-700">100% Secured</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Bottom Copyright & Admin Access Bar */}
      <div className="border-t border-gray-200 bg-gray-100/60 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          
          <p className="text-center sm:text-left font-medium">
            {copyrightText}
          </p>

          <div className="flex items-center gap-4">
            {onOpenAdmin && (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-amber-700 transition-colors cursor-pointer"
                title="Admin Control Panel"
              >
                <Database size={12} />
                <span>Admin Access</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Information & Policy Dialog Modal */}
      <FooterInfoModal
        type={modalType}
        onClose={() => setModalType(null)}
        footerSettings={footerConfig}
        onOpenOrderTracking={onOpenOrderTracking}
        onOpenReturnPolicy={onOpenReturnPolicy}
      />

    </footer>
  );
}
