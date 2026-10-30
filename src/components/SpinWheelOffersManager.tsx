import React, { useState, useEffect } from 'react';
import { 
  Gift, Plus, Trash2, Edit3, MoveUp, MoveDown, Check, X, 
  RotateCcw, Sparkles, AlertCircle, Percent, Coins, Palette, 
  CheckCircle2, Eye, ShieldCheck, AlertTriangle
} from 'lucide-react';
import { SpinWheelItem } from '../types';
import { DEFAULT_SPIN_WHEEL_ITEMS, PRESET_SLICE_COLORS } from '../constants/spinWheelDefaults';
import { getBrandSettings, updateBrandSettings } from '../services/settingsService';

interface SpinWheelOffersManagerProps {
  onUpdated?: (items: SpinWheelItem[]) => void;
}

export default function SpinWheelOffersManager({ onUpdated }: SpinWheelOffersManagerProps) {
  const [items, setItems] = useState<SpinWheelItem[]>(DEFAULT_SPIN_WHEEL_ITEMS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // In-app Delete & Reset Confirmation States (avoiding window.confirm)
  const [itemToDelete, setItemToDelete] = useState<SpinWheelItem | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit modal state
  const [editingItem, setEditingItem] = useState<SpinWheelItem | null>(null);

  // Add modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItem, setNewItem] = useState<Partial<SpinWheelItem>>({
    label: '',
    labelBn: '',
    code: '',
    discount: 10,
    discountType: 'percentage',
    color: '#e2136e',
    text: '#ffffff',
    probabilityWeight: 15,
    isWinningEligible: true,
  });

  // Load saved spin wheel items
  useEffect(() => {
    const loadItems = async () => {
      try {
        const s = await getBrandSettings();
        if (s && Array.isArray(s.spinWheelItems) && s.spinWheelItems.length >= 2) {
          setItems(s.spinWheelItems);
        } else {
          // Check local storage directly
          const local = localStorage.getItem('brand_settings');
          if (local) {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed.spinWheelItems) && parsed.spinWheelItems.length >= 2) {
              setItems(parsed.spinWheelItems);
            }
          }
        }
      } catch (err) {
        console.warn("Failed to load spin items:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadItems();

    const handleUpdate = (e: any) => {
      const detail = e.detail;
      if (detail && Array.isArray(detail.spinWheelItems) && detail.spinWheelItems.length >= 2) {
        setItems(detail.spinWheelItems);
      }
    };
    window.addEventListener('brand_settings_updated', handleUpdate);
    return () => window.removeEventListener('brand_settings_updated', handleUpdate);
  }, []);

  // Save changes to database and broadcast
  const saveItems = async (updatedItems: SpinWheelItem[]) => {
    setIsSaving(true);
    setMessage(null);
    try {
      setItems(updatedItems);
      await updateBrandSettings({
        spinWheelItems: updatedItems,
      });
      onUpdated?.(updatedItems);
      setMessage({ type: 'success', text: 'স্পিন হুইলের অফার তালিকা সফলভাবে সেভ করা হয়েছে!' });
      setTimeout(() => setMessage(null), 3500);
    } catch (err) {
      console.error("Failed to save spin items:", err);
      setMessage({ type: 'error', text: 'সেভ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।' });
    } finally {
      setIsSaving(false);
    }
  };

  // Re-ordering
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newArr = [...items];
    const temp = newArr[index];
    newArr[index] = newArr[targetIndex];
    newArr[targetIndex] = temp;
    saveItems(newArr);
  };

  // Delete Offer Handlers
  const handleInitiateDelete = (item: SpinWheelItem) => {
    if (items.length <= 3) {
      setMessage({ 
        type: 'error', 
        text: 'স্পিন হুইলে কমপক্ষে ৩টি অফার থাকা আবশ্যক। ৩টির কম অফার রাখা যাবে না।' 
      });
      setTimeout(() => setMessage(null), 4000);
      return;
    }
    setItemToDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const deletedName = itemToDelete.label || itemToDelete.labelBn;
    const filtered = items.filter(i => i.id !== itemToDelete.id);
    setItemToDelete(null);
    await saveItems(filtered);
    setMessage({ 
      type: 'success', 
      text: `"${deletedName}" অফারটি সফলভাবে মুছে ফেলা হয়েছে!` 
    });
    setTimeout(() => setMessage(null), 3500);
  };

  // Toggle winning eligibility
  const handleToggleEligible = (id: string) => {
    const updated = items.map(item => {
      if (item.id === id) {
        return { ...item, isWinningEligible: !(item.isWinningEligible !== false) };
      }
      return item;
    });
    saveItems(updated);
  };

  // Reset to default presets
  const handleConfirmReset = async () => {
    setShowResetConfirm(false);
    await saveItems(DEFAULT_SPIN_WHEEL_ITEMS);
    setMessage({ 
      type: 'success', 
      text: 'পূর্বনির্ধারিত ৮টি সেরা অফার সফলভাবে পুনরুদ্ধার করা হয়েছে!' 
    });
    setTimeout(() => setMessage(null), 3500);
  };

  // Open Edit Modal
  const handleStartEdit = (item: SpinWheelItem) => {
    setFormError(null);
    setEditingItem({ ...item });
  };

  // Save Edit Item
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    if (!editingItem.label.trim()) {
      setFormError('অনুগ্রহ করে অফারের পুরো নাম লিখুন।');
      return;
    }
    if (!editingItem.labelBn.trim()) {
      setFormError('হুইলে দেখানোর জন্য ছোট নাম লিখুন (যেমন: ১০% অফ)।');
      return;
    }
    if (!editingItem.code.trim()) {
      setFormError('কুপন কোড লিখুন (যেমন: SPECIAL10)।');
      return;
    }

    const cleanCode = editingItem.code.trim().toUpperCase().replace(/\s+/g, '');
    const numDiscount = Math.max(0, Number(editingItem.discount) || 0);

    const updated = items.map(item => {
      if (item.id === editingItem.id) {
        return {
          ...editingItem,
          code: cleanCode,
          discount: numDiscount,
          probabilityWeight: Math.max(1, Number(editingItem.probabilityWeight) || 10),
        };
      }
      return item;
    });

    saveItems(updated);
    setEditingItem(null);
    setFormError(null);
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Add New Item
  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.label?.trim()) {
      setFormError('অনুগ্রহ করে নতুন অফারের পুরো নাম লিখুন।');
      return;
    }
    if (!newItem.labelBn?.trim()) {
      setFormError('হুইলে দেখানোর জন্য ছোট নাম লিখুন (যেমন: ২৫% অফ)।');
      return;
    }
    if (!newItem.code?.trim()) {
      setFormError('কুপন কোড লিখুন (যেমন: MEGA25)।');
      return;
    }

    const cleanCode = (newItem.code || '').trim().toUpperCase().replace(/\s+/g, '');
    const numDiscount = Math.max(0, Number(newItem.discount) || 0);

    const created: SpinWheelItem = {
      id: `spin-item-${Date.now()}`,
      label: newItem.label.trim(),
      labelBn: newItem.labelBn.trim(),
      code: cleanCode,
      discount: numDiscount,
      discountType: newItem.discountType || 'percentage',
      color: newItem.color || '#e2136e',
      text: newItem.text || '#ffffff',
      probabilityWeight: Math.max(1, Number(newItem.probabilityWeight) || 15),
      isWinningEligible: newItem.isWinningEligible !== false,
    };

    const updated = [...items, created];
    saveItems(updated);
    setIsAddModalOpen(false);
    setFormError(null);
    setNewItem({
      label: '',
      labelBn: '',
      code: '',
      discount: 10,
      discountType: 'percentage',
      color: '#e2136e',
      text: '#ffffff',
      probabilityWeight: 15,
      isWinningEligible: true,
    });
  };

  // Geometry for Mini Live SVG Preview
  const previewSectorAngle = 360 / items.length;
  const PCX = 90;
  const PCY = 90;
  const PR = 80;

  return (
    <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden space-y-6 p-5 sm:p-6">
      {/* Header section with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md shrink-0">
            <Sparkles size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-gray-900 tracking-tight">
                স্পিন হুইল অফার ও প্রাইজ ম্যানেজার (Wheel Offers)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                মোট {items.length} টি অফার
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              চাকার প্রতিটি স্লাইসের অফার, ডিসকাউন্ট, কুপন কোড ও রঙ নিজের মতো পরিবর্তন বা নতুন যোগ করুন।
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            disabled={isSaving}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="মূল ৮টি অফারে ফিরিয়ে আনুন"
          >
            <RotateCcw size={14} />
            <span>ডিফল্ট অফারে রিসেট</span>
          </button>

          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open_spin_wheel_preview'));
            }}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Eye size={14} />
            <span>লাইভ প্রিভিউ দেখুন</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            disabled={isSaving}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-950/20 cursor-pointer disabled:opacity-50"
          >
            <Plus size={16} />
            <span>নতুন অফার যোগ করুন</span>
          </button>
        </div>
      </div>

      {/* Alert / Notification Feedback */}
      {message && (
        <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in ${
          message.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Content: Table & Live Mini Wheel Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Offers List Table (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="bg-gray-50/70 rounded-2xl border border-gray-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100/90 text-gray-700 text-[11px] font-black uppercase tracking-wider border-b border-gray-200">
                    <th className="py-2.5 px-3 text-center w-12">স্লাইস</th>
                    <th className="py-2.5 px-3">অফারের নাম</th>
                    <th className="py-2.5 px-3">হুইলের টেক্সট</th>
                    <th className="py-2.5 px-3">কুপন কোড</th>
                    <th className="py-2.5 px-3">ছাড়</th>
                    <th className="py-2.5 px-3 text-center">জেতার সুযোগ</th>
                    <th className="py-2.5 px-3 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {items.map((item, index) => (
                    <tr 
                      key={item.id} 
                      className="hover:bg-amber-50/40 transition-colors group"
                    >
                      {/* Slice visual circle & order */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-[10px] font-bold text-gray-400">#{index + 1}</span>
                          <span 
                            className="w-5 h-5 rounded-full border border-black/10 shadow-xs block shrink-0" 
                            style={{ backgroundColor: item.color }} 
                            title={`রঙ: ${item.color}`}
                          />
                        </div>
                      </td>

                      {/* Full label */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-gray-900">{item.label}</div>
                      </td>

                      {/* Short slice text */}
                      <td className="py-3 px-3">
                        <span 
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold shadow-2xs inline-block"
                          style={{ 
                            backgroundColor: item.color, 
                            color: item.text || '#ffffff' 
                          }}
                        >
                          {item.labelBn}
                        </span>
                      </td>

                      {/* Coupon Code */}
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-[11px] bg-gray-100 text-gray-800 px-2 py-0.5 rounded border border-gray-200">
                          {item.code}
                        </span>
                      </td>

                      {/* Discount Amount */}
                      <td className="py-3 px-3">
                        <span className="font-bold text-emerald-700">
                          {item.discountType === 'flat' ? `${item.discount}৳ অফ` : `${item.discount}% ছাড়`}
                        </span>
                      </td>

                      {/* Winning eligible toggle */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleEligible(item.id)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                            item.isWinningEligible !== false
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200'
                              : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                          }`}
                          title={item.isWinningEligible !== false ? 'কাস্টমার এই পুরস্কার জিততে পারবে' : 'কাস্টমার এই পুরস্কার জিতবে না (ডিসপ্লে অনলি)'}
                        >
                          {item.isWinningEligible !== false ? '✓ চালু' : '✗ বন্ধ'}
                        </button>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Move Up */}
                          <button
                            type="button"
                            onClick={() => handleMove(index, 'up')}
                            disabled={index === 0 || isSaving}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 cursor-pointer active:scale-95 transition"
                            title="উপরে নিন"
                          >
                            <MoveUp size={13} />
                          </button>

                          {/* Move Down */}
                          <button
                            type="button"
                            onClick={() => handleMove(index, 'down')}
                            disabled={index === items.length - 1 || isSaving}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 cursor-pointer active:scale-95 transition"
                            title="নিচে নিন"
                          >
                            <MoveDown size={13} />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 bg-blue-50/80 hover:bg-blue-100 active:scale-95 transition cursor-pointer"
                            title="এডিট করুন"
                          >
                            <Edit3 size={15} />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleInitiateDelete(item)}
                            disabled={isSaving}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer active:scale-95 ${
                              items.length <= 3 
                                ? 'text-gray-400 bg-gray-100 cursor-not-allowed opacity-60' 
                                : 'text-rose-600 bg-rose-50 hover:bg-rose-100'
                            }`}
                            title={items.length <= 3 ? "কমপক্ষে ৩টি অফার থাকতে হবে" : `"${item.labelBn}" মুছে ফেলুন`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 font-medium">
            💡 টিপস: আপনি স্লাইসের ক্রম (Move Up/Down) পরিবর্তন করে হুইলে অফারগুলোর স্থান নির্ধারণ করতে পারেন।
          </p>
        </div>

        {/* Right: Live Interactive Mini Wheel Preview (4 cols on lg) */}
        <div className="lg:col-span-4 bg-gradient-to-br from-stone-900 to-black text-white p-5 rounded-3xl border border-stone-800 shadow-md flex flex-col items-center justify-center text-center space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
              লাইভ চাকা প্রিভিউ ({items.length} স্লাইস)
            </h4>
          </div>

          {/* Mini Wheel SVG */}
          <div className="relative w-[180px] h-[180px] rounded-full border-4 border-yellow-400 p-0.5 shadow-2xl bg-stone-950 flex items-center justify-center">
            {/* Pointer Needle Frame */}
            <div className="absolute top-0 z-30 drop-shadow-md flex flex-col items-center">
              <div className="w-4 h-4 bg-yellow-400 rounded-full border border-white flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-[#e2136e] rounded-full" />
              </div>
              <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[8px] border-t-yellow-400 -mt-1" />
            </div>

            <svg viewBox="0 0 180 180" className="w-full h-full rounded-full overflow-hidden">
              {items.map((item, idx) => {
                const startDeg = idx * previewSectorAngle;
                const endDeg = (idx + 1) * previewSectorAngle;
                const startRad = ((startDeg - 90) * Math.PI) / 180;
                const endRad = ((endDeg - 90) * Math.PI) / 180;

                const x1 = PCX + PR * Math.cos(startRad);
                const y1 = PCY + PR * Math.sin(startRad);
                const x2 = PCX + PR * Math.cos(endRad);
                const y2 = PCY + PR * Math.sin(endRad);

                const d = `M ${PCX} ${PCY} L ${x1} ${y1} A ${PR} ${PR} 0 0 1 ${x2} ${y2} Z`;

                // Middle angle
                const middleDeg = startDeg + previewSectorAngle / 2;
                const middleRad = ((middleDeg - 90) * Math.PI) / 180;
                const textDist = PR * 0.62;
                const tx = PCX + textDist * Math.cos(middleRad);
                const ty = PCY + textDist * Math.sin(middleRad);

                return (
                  <g key={item.id}>
                    <path d={d} fill={item.color} stroke="#ffffff" strokeWidth="1.2" />
                    <text
                      x={tx}
                      y={ty}
                      fill={item.text || '#ffffff'}
                      fontSize={items.length > 8 ? "6px" : "7px"}
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${middleDeg} ${tx} ${ty})`}
                      className="select-none font-bold"
                    >
                      {item.labelBn}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Center Logo */}
            <div className="absolute w-8 h-8 rounded-full bg-white border border-yellow-400 p-0.5 shadow flex items-center justify-center z-10 pointer-events-none">
              <div className="w-full h-full rounded-full bg-[#1C1917] flex items-center justify-center text-[5px] font-black text-yellow-300 uppercase leading-none">
                SERA
              </div>
            </div>
          </div>

          <div className="text-[11px] text-gray-300 space-y-1">
            <p className="font-semibold">যেভাবে কাস্টমার দেখতে পাবে:</p>
            <p className="text-[10px] text-gray-400">
              আপনি অফার বাড়ালে বা কমালে হুইলের স্লাইস স্বয়ংক্রিয়ভাবে সমান ভাগে বিভক্ত হয়ে যাবে।
            </p>
          </div>
        </div>
      </div>

      {/* ✏️ EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 size={18} />
                <h4 className="text-sm font-black uppercase tracking-wider">অফার এডিট করুন</h4>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingItem(null)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-shake">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  অফারের পুরো নাম (Customer Friendly Title):
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.label}
                  onChange={(e) => setEditingItem({ ...editingItem, label: e.target.value })}
                  placeholder="যেমন: ১৫% বিশেষ ছাড়"
                  className="w-full text-xs font-semibold px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    হুইলের স্লাইস টেক্সট (Short Badge):
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.labelBn}
                    onChange={(e) => setEditingItem({ ...editingItem, labelBn: e.target.value })}
                    placeholder="যেমন: ১৫% অফ"
                    className="w-full text-xs font-semibold px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    প্রোমো কোড (Promo Code):
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.code}
                    onChange={(e) => setEditingItem({ ...editingItem, code: e.target.value.toUpperCase() })}
                    placeholder="যেমন: SERA15"
                    className="w-full text-xs font-mono font-bold px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ডিসকাউন্ট পরিমাণ:
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingItem.discount}
                    onChange={(e) => setEditingItem({ ...editingItem, discount: Number(e.target.value) })}
                    className="w-full text-xs font-bold px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ডিসকাউন্ট ধরণ:
                  </label>
                  <select
                    value={editingItem.discountType || 'percentage'}
                    onChange={(e) => setEditingItem({ ...editingItem, discountType: e.target.value as any })}
                    className="w-full text-xs font-bold px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="percentage">শতাংশ (%) ডিসকাউন্ট</option>
                    <option value="flat">নির্দিষ্ট নগদ (৳) ছাড়</option>
                  </select>
                </div>
              </div>

              {/* Color Presets */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                  <span>স্লাইসের রঙ নির্বাচন করুন:</span>
                  <span className="text-[10px] text-gray-400 font-mono">{editingItem.color}</span>
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  {PRESET_SLICE_COLORS.map(c => (
                    <button
                      key={c.bg}
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, color: c.bg, text: c.text })}
                      style={{ backgroundColor: c.bg }}
                      className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                        editingItem.color.toLowerCase() === c.bg.toLowerCase()
                          ? 'border-blue-600 scale-110 shadow-md ring-2 ring-blue-300'
                          : 'border-white shadow-xs'
                      }`}
                      title={c.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={editingItem.color}
                    onChange={(e) => setEditingItem({ ...editingItem, color: e.target.value })}
                    className="w-8 h-8 rounded-full border border-gray-300 cursor-pointer p-0 overflow-hidden"
                    title="কাস্টম রঙ নির্বাচন"
                  />
                </div>
              </div>

              {/* Eligibility & Probability */}
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">কাস্টমার এই অফার জিততে পারবে?</span>
                  <button
                    type="button"
                    onClick={() => setEditingItem({ ...editingItem, isWinningEligible: !(editingItem.isWinningEligible !== false) })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition ${
                      editingItem.isWinningEligible !== false
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-300 text-gray-700'
                    }`}
                  >
                    {editingItem.isWinningEligible !== false ? 'হ্যাঁ (জেতা সম্ভব)' : 'না (শুধু ডিসপ্লে)'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
                >
                  <Check size={14} />
                  <span>পরিবর্তন সেভ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ➕ ADD NEW OFFER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus size={18} />
                <h4 className="text-sm font-black uppercase tracking-wider">নতুন অফার যোগ করুন</h4>
              </div>
              <button 
                type="button" 
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveNew} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-shake">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  অফারের পুরো নাম:
                </label>
                <input
                  type="text"
                  required
                  value={newItem.label || ''}
                  onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
                  placeholder="যেমন: ২৫% ধামাকা ছাড়"
                  className="w-full text-xs font-semibold px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    হুইলের স্লাইস টেক্সট (Short Badge):
                  </label>
                  <input
                    type="text"
                    required
                    value={newItem.labelBn || ''}
                    onChange={(e) => setNewItem({ ...newItem, labelBn: e.target.value })}
                    placeholder="যেমন: ২৫% অফ"
                    className="w-full text-xs font-semibold px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    প্রোমো কোড (Promo Code):
                  </label>
                  <input
                    type="text"
                    required
                    value={newItem.code || ''}
                    onChange={(e) => setNewItem({ ...newItem, code: e.target.value.toUpperCase() })}
                    placeholder="যেমন: DHAMAKA25"
                    className="w-full text-xs font-mono font-bold px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ডিসকাউন্ট পরিমাণ:
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newItem.discount ?? 10}
                    onChange={(e) => setNewItem({ ...newItem, discount: Number(e.target.value) })}
                    className="w-full text-xs font-bold px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ডিসকাউন্ট ধরণ:
                  </label>
                  <select
                    value={newItem.discountType || 'percentage'}
                    onChange={(e) => setNewItem({ ...newItem, discountType: e.target.value as any })}
                    className="w-full text-xs font-bold px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="percentage">শতাংশ (%) ডিসকাউন্ট</option>
                    <option value="flat">নির্দিষ্ট নগদ (৳) ছাড়</option>
                  </select>
                </div>
              </div>

              {/* Color Presets */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                  <span>স্লাইসের রঙ নির্বাচন করুন:</span>
                  <span className="text-[10px] text-gray-400 font-mono">{newItem.color}</span>
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  {PRESET_SLICE_COLORS.map(c => (
                    <button
                      key={c.bg}
                      type="button"
                      onClick={() => setNewItem({ ...newItem, color: c.bg, text: c.text })}
                      style={{ backgroundColor: c.bg }}
                      className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                        (newItem.color || '').toLowerCase() === c.bg.toLowerCase()
                          ? 'border-emerald-600 scale-110 shadow-md ring-2 ring-emerald-300'
                          : 'border-white shadow-xs'
                      }`}
                      title={c.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={newItem.color || '#e2136e'}
                    onChange={(e) => setNewItem({ ...newItem, color: e.target.value })}
                    className="w-8 h-8 rounded-full border border-gray-300 cursor-pointer p-0 overflow-hidden"
                    title="কাস্টম রঙ নির্বাচন"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
                >
                  <Plus size={15} />
                  <span>যুক্ত করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🗑️ DELETE CONFIRMATION MODAL */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-rose-500 to-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 size={20} className="text-white" />
                <h4 className="text-sm font-black uppercase tracking-wider">অফার মুছে ফেলুন</h4>
              </div>
              <button 
                type="button" 
                onClick={() => setItemToDelete(null)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200/80 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle size={22} />
                </div>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-gray-900 text-sm">
                    আপনি কি নিশ্চিত যে এই অফারটি মুছে ফেলতে চান?
                  </p>
                  <p className="text-gray-600 leading-relaxed">
                    এই অফারটি স্পিন হুইল ও কুপন তালিকা থেকে সম্পূর্ণ মুছে যাবে। চাকার অন্যান্য অফারগুলো স্বয়ংক্রিয়ভাবে পুনরায় সুষমভাবে সাজানো হবে।
                  </p>
                </div>
              </div>

              {/* Selected Offer Preview Card */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span 
                    className="px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs inline-block"
                    style={{ 
                      backgroundColor: itemToDelete.color, 
                      color: itemToDelete.text || '#ffffff' 
                    }}
                  >
                    {itemToDelete.labelBn}
                  </span>
                  <div>
                    <div className="font-bold text-gray-900 text-xs">{itemToDelete.label}</div>
                    <div className="text-[11px] text-gray-500 font-mono">কোড: {itemToDelete.code}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-xs text-rose-600">
                    {itemToDelete.discountType === 'flat' ? `${itemToDelete.discount}৳ ছাড়` : `${itemToDelete.discount}% ছাড়`}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer text-center"
                >
                  না, বাতিল করুন
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/20 disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  <span>{isSaving ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, মুছে ফেলুন'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔄 RESET CONFIRMATION MODAL */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw size={18} />
                <h4 className="text-sm font-black uppercase tracking-wider">ডিফল্ট অফারে রিসেট</h4>
              </div>
              <button 
                type="button" 
                onClick={() => setShowResetConfirm(false)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <RotateCcw size={20} />
                </div>
                <div className="text-xs text-gray-700 leading-relaxed font-medium space-y-1">
                  <p className="font-bold text-gray-900 text-sm">
                    পূর্বনির্ধারিত ৮টি সেরা অফার ফিরিয়ে আনতে চান?
                  </p>
                  <p className="text-gray-600">
                    আপনার তৈরি করা কাস্টম অফারগুলো মুছে যাবে এবং সিস্টেমের সেরা ৮টি আকর্ষণীয় অফার সেট হবে।
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleConfirmReset}
                  className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/20 disabled:opacity-50"
                >
                  <RotateCcw size={14} />
                  <span>{isSaving ? 'রিসেট হচ্ছে...' : 'হ্যাঁ, রিসেট করুন'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
