import React, { useEffect, useRef, useState } from 'react';
import { X, Store, Upload, Trash2, Plus, Check } from 'lucide-react';
import type { StoreSettings, VatMode } from '../types';

interface SettingsModalProps {
  open: boolean;
  settings: StoreSettings;
  stores: StoreSettings[];
  onClose: () => void;
  onSave: (updated: StoreSettings) => Promise<boolean>;
  onCreateStore: (newStore: Partial<StoreSettings>) => Promise<boolean>;
  onActivateStore: (storeId: string) => Promise<boolean>;
  onDeleteStore: (storeId: string) => Promise<boolean>;
}

async function resizeImageToDataUrl(file: File, maxSize = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพนี้ได้'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้'));
    reader.readAsDataURL(file);
  });
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  settings,
  stores,
  onClose,
  onSave,
  onCreateStore,
  onActivateStore,
  onDeleteStore,
}) => {
  const [mode, setMode] = useState<'edit' | 'create'>('edit');
  const [form, setForm] = useState<StoreSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setMode('edit');
      setForm(settings);
      setLogoError(null);
    }
  }, [open, settings]);

  if (!open) return null;

  const startCreateNewStore = () => {
    setMode('create');
    setLogoError(null);
    setForm({
      id: '',
      storeName: '',
      branchName: 'สาขาหลัก',
      logoUrl: '',
      tagline: 'จำหน่ายสินค้าเบ็ดเตล็ด อุปกรณ์การเรียนการสอน และอุปกรณ์สำนักงานครบวงจร',
      taxId: '',
      address: '',
      phone: '',
      promptPayId: '',
      defaultVatMode: 'included',
      receiptFooter: 'ขอบคุณที่อุดหนุนสินค้าและบริการของเรา',
    });
  };

  const handleSelectStore = async (storeId: string) => {
    setMode('edit');
    setLogoError(null);
    if (storeId !== settings.id) {
      await onActivateStore(storeId);
    }
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);
    if (!file.type.startsWith('image/')) {
      setLogoError('กรุณาเลือกไฟล์รูปภาพ (PNG, JPG, WEBP หรือ SVG)');
      return;
    }
    try {
      const dataUrl = await resizeImageToDataUrl(file, 320);
      setForm((prev) => ({ ...prev, logoUrl: dataUrl }));
    } catch {
      setLogoError('ไม่สามารถประมวลผลรูปโลโก้ได้ กรุณาลองไฟล์อื่น');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.storeName.trim()) return;
    setSaving(true);
    let ok = false;
    if (mode === 'create') {
      ok = await onCreateStore(form);
    } else {
      ok = await onSave(form);
    }
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                จัดการร้านค้า · ชื่อร้าน & โลโก้ร้าน
              </h3>
              <p className="text-xs text-slate-500">
                สลับร้านค้า เพิ่มร้านใหม่ หรือปรับชื่อและโลโก้สำหรับแสดงบนหน้าจอและเอกสารพิมพ์
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {/* Store Switcher Strip */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                ร้านค้าที่บันทึกไว้ในระบบ ({stores.length} ร้าน)
              </span>
              <button
                type="button"
                onClick={startCreateNewStore}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  mode === 'create'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                เพิ่มร้านค้าใหม่
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {stores.map((st) => {
                const isActive = mode === 'edit' && st.id === settings.id;
                return (
                  <div
                    key={st.id}
                    className={`flex items-center gap-2 pl-2 pr-1.5 py-1.5 rounded-xl border transition-colors ${
                      isActive
                        ? 'bg-blue-50 border-blue-300 text-blue-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectStore(st.id)}
                      className="flex items-center gap-2 text-xs font-semibold cursor-pointer min-h-[30px]"
                    >
                      {st.logoUrl ? (
                        <img
                          src={st.logoUrl}
                          alt={st.storeName}
                          referrerPolicy="no-referrer"
                          className="w-6 h-6 rounded-md object-contain bg-white border border-slate-200"
                        />
                      ) : (
                        <span className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                          <Store className="w-3.5 h-3.5" />
                        </span>
                      )}
                      <span>{st.storeName}</span>
                      {isActive && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                    {stores.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteStore(st.id)}
                        className="w-7 h-7 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center cursor-pointer"
                        title="ลบร้านค้านี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {mode === 'create' && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900">
              กำลังเพิ่มร้านค้าใหม่ — กรอกชื่อร้าน อัปโหลดโลโก้ และข้อมูลร้านด้านล่างแล้วกดบันทึกเพื่อสลับไปใช้งานทันที
            </div>
          )}

          {/* Logo Upload & Preview */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
              {form.logoUrl ? (
                <img
                  src={form.logoUrl}
                  alt="โลโก้ร้านค้า"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <Store className="w-8 h-8 text-slate-400" />
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-2 w-full">
              <div className="text-xs font-bold text-slate-800">โลโก้ร้านค้า (Store Logo)</div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  อัปโหลดรูปโลโก้
                </button>
                {form.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, logoUrl: '' })}
                    className="min-h-[40px] px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    ลบโลโก้
                  </button>
                )}
              </div>
              <input
                type="text"
                value={form.logoUrl?.startsWith('data:') ? '' : form.logoUrl || ''}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="หรือวางลิงก์รูปภาพโลโก้ (URL) ที่นี่..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {logoError && <div className="text-xs text-rose-600 font-semibold">{logoError}</div>}
            </div>
          </div>

          {/* Store Text Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อร้านค้า *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น Smart Center หรือ ร้านเครื่องเขียนสุขใจ"
                value={form.storeName}
                onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อสาขา</label>
              <input
                type="text"
                value={form.branchName}
                onChange={(e) => setForm({ ...form, branchName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                คำอธิบายร้านค้า
              </label>
              <input
                type="text"
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เลขประจำตัวผู้เสียภาษี
              </label>
              <input
                type="text"
                value={form.taxId}
                onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono-num focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono-num focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">ที่อยู่ร้านค้า</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">PromptPay ID</label>
              <input
                type="text"
                value={form.promptPayId}
                onChange={(e) => setForm({ ...form, promptPayId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono-num focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">VAT เริ่มต้น</label>
              <select
                value={form.defaultVatMode}
                onChange={(e) => setForm({ ...form, defaultVatMode: e.target.value as VatMode })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="included">รวม VAT 7%</option>
                <option value="excluded">แยก VAT 7%</option>
                <option value="none">ไม่คิด VAT</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ข้อความท้ายใบเสร็จ
              </label>
              <input
                type="text"
                value={form.receiptFooter}
                onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2.5 shrink-0 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold cursor-pointer"
          >
            ปิด
          </button>
          <button
            type="submit"
            disabled={saving}
            className="min-h-[44px] px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold cursor-pointer"
          >
            {saving
              ? 'กำลังบันทึก...'
              : mode === 'create'
              ? 'เพิ่มและใช้งานร้านค้านี้'
              : 'บันทึกการตั้งค่าร้านค้า'}
          </button>
        </div>
      </form>
    </div>
  );
};
