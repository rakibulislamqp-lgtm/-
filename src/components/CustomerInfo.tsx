import React, { useState, useEffect, useRef } from 'react';
import { User, Search, MapPin, ChevronDown, Sparkles, Zap, RotateCcw, ShieldCheck, Check, Crown } from 'lucide-react';
import { DISTRICTS, DISTRICT_UPAZILA_MAP } from '../constants';
import { updateVisitorCustomerInfo, updateVisitorStage } from '../services/trackingService';
import { getLoggedInCustomer } from '../services/customerAuthService';
import { getRepeatCustomerOffer, RepeatCustomerOfferResult } from '../services/loyaltyService';

interface CustomerInfoProps {
  register: any;
  errors: any;
  getValues: any;
  setValue: any;
}

interface SavedCustomerProfile {
  customerName: string;
  mobileNumber: string;
  district: string;
  upazila: string;
  address: string;
  savedAt: string;
}

const STORAGE_KEY = 'sera_saved_customer_profile';

export default function CustomerInfo({ register, errors, getValues, setValue }: CustomerInfoProps) {
  const [selectedDistrict, setSelectedDistrict] = useState(() => {
    return getValues ? getValues('district') || '' : '';
  });
  const [districtInput, setDistrictInput] = useState(() => {
    return getValues ? getValues('district') || '' : '';
  });
  const [upazilaInput, setUpazilaInput] = useState(() => {
    return getValues ? getValues('upazila') || '' : '';
  });

  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const [showUpazilaDropdown, setShowUpazilaDropdown] = useState(false);
  const [activeDistrictIndex, setActiveDistrictIndex] = useState(-1);
  const [activeUpazilaIndex, setActiveUpazilaIndex] = useState(-1);
  
  // Smart Saved Profile State
  const [savedProfile, setSavedProfile] = useState<SavedCustomerProfile | null>(null);
  const [isAutofilled, setIsAutofilled] = useState(false);
  const [repeatOffer, setRepeatOffer] = useState<RepeatCustomerOfferResult | null>(null);

  const districtListRef = useRef<HTMLDivElement>(null);
  const upazilaListRef = useRef<HTMLDivElement>(null);

  // Load saved profile on mount
  useEffect(() => {
    try {
      const logged = getLoggedInCustomer();
      if (logged && logged.name && logged.phone) {
        const profile: SavedCustomerProfile = {
          customerName: logged.name,
          mobileNumber: logged.phone,
          district: logged.district || '',
          upazila: logged.upazila || '',
          address: logged.address || '',
          savedAt: logged.createdAt || new Date().toISOString()
        };
        setSavedProfile(profile);

        // If form fields are currently empty, auto-populate immediately
        const currentName = getValues ? getValues('customerName') : '';
        const currentPhone = getValues ? getValues('mobileNumber') : '';
        if (!currentName && !currentPhone) {
          setValue('customerName', profile.customerName, { shouldValidate: true });
          setValue('mobileNumber', profile.mobileNumber, { shouldValidate: true });
          if (profile.district) {
            setDistrictInput(profile.district);
            setSelectedDistrict(profile.district);
            setValue('district', profile.district, { shouldValidate: true });
            const isDhaka = profile.district.toLowerCase().includes('dhaka') || profile.district.includes('ঢাকা');
            setValue('deliveryArea', isDhaka ? 'Inside Dhaka' : 'Outside Dhaka', { shouldValidate: true });
          }
          if (profile.upazila) {
            setUpazilaInput(profile.upazila);
            setValue('upazila', profile.upazila, { shouldValidate: true });
          }
          if (profile.address) {
            setValue('address', profile.address, { shouldValidate: true });
          }
          setIsAutofilled(true);
        }
        return;
      }

      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.customerName && parsed.mobileNumber) {
          setSavedProfile(parsed);
        }
      }
    } catch (e) {
      console.warn("Could not read saved profile:", e);
    }
  }, []);

  // Sync state if form value changes externally
  const currentDistrictValue = getValues ? getValues('district') : '';
  const currentUpazilaValue = getValues ? getValues('upazila') : '';

  useEffect(() => {
    if (currentDistrictValue !== districtInput) {
      setDistrictInput(currentDistrictValue || '');
      setSelectedDistrict(currentDistrictValue || '');
    }
  }, [currentDistrictValue]);

  // Check for repeat customer loyalty & special re-engagement offer
  const checkRepeatStatus = async (phone: string) => {
    const clean = phone ? phone.replace(/\D/g, '') : '';
    if (clean.length === 11) {
      try {
        const res = await getRepeatCustomerOffer(clean);
        if (res.isRepeat && res.discount > 0) {
          setRepeatOffer(res);
          setValue('discount', res.discount, { shouldValidate: true });
          setValue('discountType', 'flat', { shouldValidate: true });
        } else {
          setRepeatOffer(null);
        }
      } catch (e) {
        console.warn("Error checking repeat customer offer:", e);
      }
    } else {
      setRepeatOffer(null);
    }
  };

  useEffect(() => {
    if (currentUpazilaValue !== upazilaInput) {
      setUpazilaInput(currentUpazilaValue || '');
    }
  }, [currentUpazilaValue]);

  const upazilas = selectedDistrict ? DISTRICT_UPAZILA_MAP[selectedDistrict] || [] : [];

  // Filter districts based on input
  const filteredDistricts = DISTRICTS.filter(district => {
    const search = districtInput.toLowerCase().trim();
    if (!search) return true;
    return district.toLowerCase().includes(search);
  });

  // Filter upazilas based on input
  const filteredUpazilas = upazilas.filter(upazila => {
    const search = upazilaInput.toLowerCase().trim();
    if (!search) return true;
    return upazila.toLowerCase().includes(search);
  });

  const handleSelectDistrict = (district: string) => {
    setDistrictInput(district);
    setSelectedDistrict(district);
    setValue('district', district, { shouldValidate: true });

    // Instant smart delivery area auto-selection
    const isDhaka = district.toLowerCase().includes('dhaka') || district.includes('ঢাকা');
    setValue('deliveryArea', isDhaka ? 'Inside Dhaka' : 'Outside Dhaka', { shouldValidate: true });

    updateVisitorCustomerInfo({ district });
    
    // Clear and reset upazila field
    setUpazilaInput('');
    setValue('upazila', '', { shouldValidate: true });
    
    setShowDistrictDropdown(false);
    setActiveDistrictIndex(-1);
    saveCurrentFormState();
  };

  const handleSelectUpazila = (upazila: string) => {
    setUpazilaInput(upazila);
    setValue('upazila', upazila, { shouldValidate: true });
    updateVisitorCustomerInfo({ upazila });
    setShowUpazilaDropdown(false);
    setActiveUpazilaIndex(-1);
    saveCurrentFormState();
  };

  // Helper to persist current form state
  const saveCurrentFormState = () => {
    try {
      const name = getValues ? getValues('customerName') : '';
      const mobile = getValues ? getValues('mobileNumber') : '';
      const dist = getValues ? getValues('district') : '';
      const upz = getValues ? getValues('upazila') : '';
      const addr = getValues ? getValues('address') : '';

      if (name && mobile) {
        const payload: SavedCustomerProfile = {
          customerName: name,
          mobileNumber: mobile,
          district: dist || '',
          upazila: upz || '',
          address: addr || '',
          savedAt: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      }
    } catch (e) {
      // localStorage policy
    }
  };

  // Smart 1-Tap Autofill Handler
  const handleApplySavedProfile = () => {
    if (!savedProfile) return;

    if (savedProfile.customerName) {
      setValue('customerName', savedProfile.customerName, { shouldValidate: true });
    }
    if (savedProfile.mobileNumber) {
      setValue('mobileNumber', savedProfile.mobileNumber, { shouldValidate: true });
    }
    if (savedProfile.district) {
      setDistrictInput(savedProfile.district);
      setSelectedDistrict(savedProfile.district);
      setValue('district', savedProfile.district, { shouldValidate: true });
    }
    if (savedProfile.upazila) {
      setUpazilaInput(savedProfile.upazila);
      setValue('upazila', savedProfile.upazila, { shouldValidate: true });
    }
    if (savedProfile.address) {
      setValue('address', savedProfile.address, { shouldValidate: true });
    }

    updateVisitorCustomerInfo({
      customerName: savedProfile.customerName,
      mobileNumber: savedProfile.mobileNumber,
      district: savedProfile.district,
      upazila: savedProfile.upazila,
      address: savedProfile.address
    });
    updateVisitorStage('filling_checkout', `১-ট্যাপ অটোফিল ব্যবহার করেছেন: ${savedProfile.customerName}`);

    setIsAutofilled(true);
  };

  const handleClearSavedProfile = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setSavedProfile(null);
      setIsAutofilled(false);
    } catch (e) {}
  };

  // Keyboard navigation for District
  const handleDistrictKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDistrictDropdown) {
      if (e.key === 'ArrowDown') {
        setShowDistrictDropdown(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveDistrictIndex(prev => {
        const next = prev < filteredDistricts.length - 1 ? prev + 1 : 0;
        const el = districtListRef.current?.children[next] as HTMLElement;
        if (el) el.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveDistrictIndex(prev => {
        const next = prev > 0 ? prev - 1 : filteredDistricts.length - 1;
        const el = districtListRef.current?.children[next] as HTMLElement;
        if (el) el.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeDistrictIndex >= 0 && activeDistrictIndex < filteredDistricts.length) {
        handleSelectDistrict(filteredDistricts[activeDistrictIndex]);
      } else if (filteredDistricts.length > 0) {
        handleSelectDistrict(filteredDistricts[0]);
      } else {
        handleSelectDistrict(districtInput);
      }
    } else if (e.key === 'Escape') {
      setShowDistrictDropdown(false);
    }
  };

  // Keyboard navigation for Upazila
  const handleUpazilaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showUpazilaDropdown) {
      if (e.key === 'ArrowDown') {
        setShowUpazilaDropdown(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveUpazilaIndex(prev => {
        const next = prev < filteredUpazilas.length - 1 ? prev + 1 : 0;
        const el = upazilaListRef.current?.children[next] as HTMLElement;
        if (el) el.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveUpazilaIndex(prev => {
        const next = prev > 0 ? prev - 1 : filteredUpazilas.length - 1;
        const el = upazilaListRef.current?.children[next] as HTMLElement;
        if (el) el.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeUpazilaIndex >= 0 && activeUpazilaIndex < filteredUpazilas.length) {
        handleSelectUpazila(filteredUpazilas[activeUpazilaIndex]);
      } else if (filteredUpazilas.length > 0) {
        handleSelectUpazila(filteredUpazilas[0]);
      } else {
        handleSelectUpazila(upazilaInput);
      }
    } else if (e.key === 'Escape') {
      setShowUpazilaDropdown(false);
    }
  };

  return (
    <div className="space-y-8" id="customer-info-container">
      {/* Header */}
      <div className="flex flex-col items-center text-center space-y-2">
         <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center mb-1 border border-amber-500/20 shadow-xs">
            <User size={24} />
         </div>
         <h2 className="text-2xl font-black text-gray-900 leading-tight">আপনার তথ্য প্রদান করুন</h2>
         <p className="text-sm font-medium text-gray-500">অর্ডারটি সঠিক ভাবে ডেলিভারির জন্য নিচের তথ্যগুলো দিন</p>
      </div>

      {/* 🌟 SMART 1-TAP AUTOFILL MEMORY BANNER */}
      {savedProfile && (
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-50 via-emerald-50 to-amber-50 border-2 border-amber-300/80 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-md">
                <Sparkles size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-black text-gray-900 truncate">
                    স্বাগতম, <span className="text-amber-800">{savedProfile.customerName}</span>!
                  </h4>
                  <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-md">
                    সেভ করা প্রোফাইল
                  </span>
                </div>
                <p className="text-xs text-gray-600 truncate mt-0.5">
                  পূর্বের ডেলিভারি ঠিকানা: {savedProfile.address ? `${savedProfile.address}, ` : ''}{savedProfile.district}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={handleApplySavedProfile}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-black text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer ${
                  isAutofilled
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:brightness-105'
                }`}
              >
                {isAutofilled ? (
                  <>
                    <Check size={14} className="stroke-[3]" />
                    <span>অটোফিল সম্পন্ন</span>
                  </>
                ) : (
                  <>
                    <Zap size={14} className="fill-slate-950 text-slate-950" />
                    <span>⚡ ১-ট্যাপে অটোফিল</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClearSavedProfile}
                className="px-3 py-2.5 text-gray-500 hover:text-rose-600 bg-white/80 border border-gray-200 rounded-xl hover:bg-white transition-colors text-xs font-bold cursor-pointer"
                title="নতুন তথ্য দিতে চান?"
              >
                রিসেট
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* 🤖 Anti-Bot Honeypot Invisible Trap Field */}
        <input 
          type="text" 
          {...register('honeypot')} 
          tabIndex={-1} 
          autoComplete="off" 
          aria-hidden="true"
          style={{ opacity: 0, position: 'absolute', top: 0, left: 0, height: 0, width: 0, zIndex: -1 }}
        />

        {/* Name Field */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-shadow space-y-2.5">
          <label className="text-sm sm:text-base font-bold text-gray-800 flex items-center gap-1.5">
            আপনার নাম (Full Name) <span className="text-rose-500">*</span>
          </label>
          <input 
            {...register('customerName', { 
              required: 'নাম লেখা জরুরি',
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                const val = e.target.value;
                updateVisitorCustomerInfo({ customerName: val });
                if (val.length >= 2) {
                  updateVisitorStage('filling_checkout', `চেকআউট ফর্ম পূরণ করছেন: ${val}`);
                }
                saveCurrentFormState();
              }
            })}
            placeholder="আপনার পূর্ণ নাম লিখুন"
            className="w-full bg-stone-50 border-2 border-stone-200 focus:border-amber-500 focus:bg-white px-3.5 py-3.5 text-base font-medium outline-none transition-all placeholder:text-gray-400 rounded-xl"
          />
          {errors.customerName && <p className="text-rose-600 text-xs font-bold uppercase tracking-tight">{errors.customerName.message}</p>}
        </div>

        {/* Mobile Number Field */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-shadow space-y-2.5">
          <label className="text-sm sm:text-base font-bold text-gray-800 flex items-center justify-between">
            <span>মোবাইল নম্বর (Mobile Number) <span className="text-rose-500">*</span></span>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <ShieldCheck size={11} /> এসএমএস কনফার্মেশন যাবে
            </span>
          </label>
          <input 
            type="tel"
            {...register('mobileNumber', { 
              required: 'মোবাইল নম্বর দেওয়া জরুরি',
              pattern: {
                value: /^01[3-9]\d{8}$/,
                message: 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01XXXXXXXXX)'
              },
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                const val = e.target.value;
                updateVisitorCustomerInfo({ mobileNumber: val });
                if (val.length >= 5) {
                  updateVisitorStage('filling_checkout', `মোবাইল টাইপ করছেন: ${val}`);
                }
                if (val.replace(/\D/g, '').length === 11) {
                  checkRepeatStatus(val);
                }
                saveCurrentFormState();
              }
            })}
            placeholder="01XXXXXXXXX"
            className="w-full bg-stone-50 border-2 border-stone-200 focus:border-amber-500 focus:bg-white px-3.5 py-3.5 text-xl sm:text-2xl font-black tracking-widest outline-none transition-all placeholder:text-gray-400 rounded-xl"
          />
          {errors.mobileNumber && <p className="text-rose-600 text-xs font-bold uppercase tracking-tight">{errors.mobileNumber.message}</p>}

          {/* 👑 Repeat Customer Welcome Back Loyalty Offer Banner */}
          {repeatOffer?.isRepeat && (
            <div className="p-3.5 sm:p-4 bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 border-2 border-amber-400/70 rounded-2xl flex items-start gap-3 shadow-md animate-fade-in text-left">
              <div className="w-9 h-9 bg-gradient-to-tr from-amber-500 to-rose-600 text-white rounded-xl shadow-xs flex items-center justify-center shrink-0 mt-0.5">
                <Crown size={20} className="animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full border border-amber-300">
                    {repeatOffer.badgeText}
                  </span>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                    -৳{repeatOffer.discount} অফ সক্রিয় 🎉
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-800 mt-1.5 leading-relaxed">
                  {repeatOffer.message}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* District & Upazila */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* District Autocomplete Field */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-shadow space-y-2.5 relative">
            <label className="text-sm sm:text-base font-bold text-gray-800 flex items-center justify-between">
              <span>District / জেলা <span className="text-rose-500">*</span></span>
              <span className="text-[10px] text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">জেলা নির্বাচন করুন</span>
            </label>
            <div className="relative">
              <input 
                type="text"
                {...register('district', { required: 'জেলা সিলেক্ট করা জরুরি' })}
                value={districtInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setDistrictInput(val);
                  setValue('district', val, { shouldValidate: true });
                  setShowDistrictDropdown(true);
                  setActiveDistrictIndex(-1);
                  
                  const matched = DISTRICTS.find(d => d.toLowerCase() === val.toLowerCase().trim());
                  if (matched) {
                    setSelectedDistrict(matched);
                  } else {
                    setSelectedDistrict(val);
                  }
                  saveCurrentFormState();
                }}
                onKeyDown={handleDistrictKeyDown}
                onFocus={() => {
                  setShowDistrictDropdown(true);
                  setActiveDistrictIndex(-1);
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setShowDistrictDropdown(false);
                  }, 200);
                }}
                placeholder="যেমন: Dhaka / চট্টগ্রাম"
                className="w-full bg-stone-50 border-2 border-stone-200 focus:border-amber-500 focus:bg-white px-3.5 py-3.5 pr-10 text-base font-semibold outline-none transition-all rounded-xl"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none flex items-center gap-1">
                <Search size={16} />
                <ChevronDown size={14} />
              </div>
            </div>

            {/* District Dropdown Overlay */}
            {showDistrictDropdown && (
              <div className="absolute left-4 right-4 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto z-50 py-2 divide-y divide-gray-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div ref={districtListRef}>
                  {filteredDistricts.length > 0 ? (
                    filteredDistricts.map((district, index) => (
                      <button
                        key={district}
                        type="button"
                        onClick={() => handleSelectDistrict(district)}
                        className={`w-full text-left px-4 py-3 text-sm font-semibold transition-colors flex items-center gap-2 ${
                          index === activeDistrictIndex 
                            ? 'bg-amber-500 text-slate-950 font-bold' 
                            : 'text-gray-700 hover:bg-amber-50'
                        }`}
                      >
                        <MapPin size={14} className={index === activeDistrictIndex ? 'text-slate-950' : 'text-amber-600'} />
                        {district}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-xs font-bold text-amber-700 bg-amber-50">
                      " {districtInput} " - আপনি এটি লিখেও অর্ডার সম্পন্ন করতে পারেন।
                    </div>
                  )}
                </div>
              </div>
            )}
            {errors.district && <p className="text-rose-600 text-xs font-bold uppercase tracking-tight">{errors.district.message}</p>}
          </div>

          {/* Upazila Autocomplete Field */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-shadow space-y-2.5 relative">
            <label className="text-sm sm:text-base font-bold text-gray-800 flex items-center justify-between">
              <span>Upazila / উপজেলা / এলাকা</span>
              <span className="text-[10px] text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">ঐচ্ছিক</span>
            </label>
            <div className="relative">
              <input 
                type="text"
                {...register('upazila')}
                value={upazilaInput}
                disabled={!selectedDistrict}
                onChange={(e) => {
                  const val = e.target.value;
                  setUpazilaInput(val);
                  setValue('upazila', val, { shouldValidate: true });
                  setShowUpazilaDropdown(true);
                  setActiveUpazilaIndex(-1);
                  saveCurrentFormState();
                }}
                onKeyDown={handleUpazilaKeyDown}
                onFocus={() => {
                  setShowUpazilaDropdown(true);
                  setActiveUpazilaIndex(-1);
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setShowUpazilaDropdown(false);
                  }, 200);
                }}
                placeholder={selectedDistrict ? "যেমন: Savar / মিরপুর / সদর" : "আগে জেলা নির্বাচন করুন"}
                className="w-full bg-stone-50 border-2 border-stone-200 focus:border-amber-500 focus:bg-white px-3.5 py-3.5 pr-10 text-base font-semibold outline-none transition-all disabled:opacity-60 rounded-xl"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none flex items-center gap-1">
                <Search size={16} />
                <ChevronDown size={14} />
              </div>
            </div>

            {/* Upazila Dropdown Overlay */}
            {showUpazilaDropdown && selectedDistrict && (
              <div className="absolute left-4 right-4 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto z-50 py-2 divide-y divide-gray-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div ref={upazilaListRef}>
                  {filteredUpazilas.length > 0 ? (
                    filteredUpazilas.map((upazila, index) => (
                      <button
                        key={upazila}
                        type="button"
                        onClick={() => handleSelectUpazila(upazila)}
                        className={`w-full text-left px-4 py-3 text-sm font-semibold transition-colors flex items-center gap-2 ${
                          index === activeUpazilaIndex 
                             ? 'bg-amber-500 text-slate-950 font-bold' 
                             : 'text-gray-700 hover:bg-amber-50'
                        }`}
                      >
                        <MapPin size={14} className={index === activeUpazilaIndex ? 'text-slate-950' : 'text-amber-600'} />
                        {upazila}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-xs font-bold text-amber-700 bg-amber-50">
                      " {upazilaInput} " - আপনি এটি ব্যবহার করে অর্ডার করতে পারেন।
                    </div>
                  )}
                </div>
              </div>
            )}
            {errors.upazila && <p className="text-rose-600 text-xs font-bold uppercase tracking-tight">{errors.upazila.message}</p>}
          </div>
        </div>

        {/* Address Field */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-shadow space-y-2.5">
          <label className="text-sm sm:text-base font-bold text-gray-800">
            বিস্তারিত ঠিকানা (Shipping Address) <span className="text-rose-500">*</span>
          </label>
          <p className="text-xs text-gray-500 font-medium">বাসা নম্বর, রোড নম্বর, এলাকা ইত্যাদি বিস্তারিত লিখুন যাতে কুরিয়ার সহজে পৌঁছে যেতে পারে</p>
          <textarea 
            {...register('address', { 
              required: 'ঠিকানা লেখা জরুরি',
              onChange: () => {
                saveCurrentFormState();
              }
            })}
            placeholder="আপনার সম্পূর্ণ ঠিকানা এখানে লিখুন (যেমন: বাড়ি নং ১২, রোড নং ৫, ব্লক সি...)"
            rows={3}
            className="w-full bg-stone-50 border-2 border-stone-200 focus:border-amber-500 focus:bg-white px-3.5 py-3.5 text-base font-medium outline-none transition-all placeholder:text-gray-400 resize-none rounded-xl"
          />
          {errors.address && <p className="text-rose-600 text-xs font-bold uppercase tracking-tight">{errors.address.message}</p>}
        </div>
      </div>
    </div>
  );
}
