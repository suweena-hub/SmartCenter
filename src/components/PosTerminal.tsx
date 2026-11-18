import React, { useMemo, useState } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  FileText,
  Receipt,
  CheckCircle2,
  UserCheck,
  AlertTriangle,
  PackagePlus,
  X,
} from 'lucide-react';
import type {
  CategoryKey,
  CustomerInfo,
  DocumentType,
  LineItem,
  PaymentMethod,
  Product,
  StoreDocument,
  StoreSettings,
  VatMode,
} from '../types';
import {
  CATEGORY_LIST,
  calculateTotals,
  formatBaht,
  getCategoryMeta,
} from '../utils/format';

interface PosTerminalProps {
  products: Product[];
  settings: StoreSettings;
  onCompleteDocument: (payload: {
    type: DocumentType;
    customer: CustomerInfo;
    items: LineItem[];
    discountAmount: number;
    vatMode: VatMode;
    paymentMethod?: PaymentMethod;
    cashReceived?: number;
    notes?: string;
  }) => Promise<StoreDocument | null>;
  onQuickAddProduct: () => void;
}

export const PosTerminal: React.FC<PosTerminalProps> = ({
  products,
  settings,
  onCompleteDocument,
  onQuickAddProduct,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | CategoryKey>('all');
  const [cart, setCart] = useState<LineItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [vatMode, setVatMode] = useState<VatMode>(settings.defaultVatMode || 'included');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [useCustomCustomer, setUseCustomCustomer] = useState(false);
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: '',
    taxId: '',
    branch: 'สำนักงานใหญ่',
    address: '',
    phone: '',
  });
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q)
      );
    });
  }, [products, searchQuery, selectedCategory]);

  const addToCart = (product: Product) => {
    setFeedbackError(null);
    if (product.stock <= 0) {
      setFeedbackError(`สินค้า "${product.name}" หมดสต็อก กรุณารับสินค้าเข้าก่อนขาย`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((it) => it.productId === product.id);
      if (existing) {
        if (existing.qty + 1 > product.stock) {
          setFeedbackError(
            `สินค้า "${product.name}" คงเหลือในคลัง ${product.stock} ${product.unit} เท่านั้น`
          );
          return prev;
        }
        return prev.map((it) =>
          it.productId === product.id
            ? {
                ...it,
                qty: it.qty + 1,
                lineTotal: Number(((it.qty + 1) * it.unitPrice - it.discount).toFixed(2)),
              }
            : it
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          unit: product.unit,
          qty: 1,
          unitPrice: product.sellPrice,
          costPrice: product.costPrice,
          discount: 0,
          lineTotal: product.sellPrice,
        },
      ];
    });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const exactMatch = products.find(
        (p) => p.barcode.toLowerCase() === q || p.sku.toLowerCase() === q
      );
      if (exactMatch) {
        addToCart(exactMatch);
        setSearchQuery('');
      }
    }
  };

  const updateQty = (productId: string | undefined, delta: number) => {
    setFeedbackError(null);
    if (!productId) return;
    const prod = products.find((p) => p.id === productId);
    setCart((prev) =>
      prev
        .map((it) => {
          if (it.productId !== productId) return it;
          const nextQty = it.qty + delta;
          if (nextQty <= 0) return null;
          if (prod && nextQty > prod.stock) {
            setFeedbackError(`สต็อกคงเหลือสูงสุด ${prod.stock} ${prod.unit}`);
            return it;
          }
          return {
            ...it,
            qty: nextQty,
            lineTotal: Math.max(0, Number((nextQty * it.unitPrice - it.discount).toFixed(2))),
          };
        })
        .filter((x): x is LineItem => x !== null)
    );
  };

  const removeFromCart = (productId: string | undefined) => {
    setCart((prev) => prev.filter((it) => it.productId !== productId));
  };

  const rawSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.lineTotal, 0),
    [cart]
  );

  const { preVatAmount, vatAmount, grandTotal } = useMemo(
    () => calculateTotals(rawSubtotal, discountAmount, vatMode),
    [rawSubtotal, discountAmount, vatMode]
  );

  const totalQty = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);

  const parsedCash = Number(cashReceived) || 0;
  const changeDue = paymentMethod === 'cash' && parsedCash >= grandTotal ? parsedCash - grandTotal : 0;

  const handleCheckout = async (docType: DocumentType) => {
    if (cart.length === 0) {
      setFeedbackError('กรุณาเลือกสินค้าลงในตะกร้าก่อนทำรายการ');
      return;
    }

    if (docType === 'TAX_INVOICE' && useCustomCustomer && !customer.name.trim()) {
      setFeedbackError('กรุณาระบุชื่อลูกค้าหรือบริษัทสำหรับใบกำกับภาษี');
      return;
    }

    if (
      docType !== 'QUOTATION' &&
      paymentMethod === 'cash' &&
      cashReceived !== '' &&
      parsedCash < grandTotal
    ) {
      setFeedbackError('จำนวนเงินสดที่รับมาน้อยกว่ายอดสุทธิที่ต้องชำระ');
      return;
    }

    setSubmitting(true);
    setFeedbackError(null);
    try {
      const effectiveCustomer: CustomerInfo =
        useCustomCustomer && customer.name.trim()
          ? customer
          : { name: 'ลูกค้าทั่วไป (หน้าร้าน)' };

      const created = await onCompleteDocument({
        type: docType,
        customer: effectiveCustomer,
        items: cart,
        discountAmount,
        vatMode,
        paymentMethod: docType === 'QUOTATION' ? undefined : paymentMethod,
        cashReceived:
          docType !== 'QUOTATION' && paymentMethod === 'cash'
            ? cashReceived === ''
              ? grandTotal
              : parsedCash
            : undefined,
        notes: notes.trim() || undefined,
      });

      if (created) {
        setCart([]);
        setDiscountAmount(0);
        setCashReceived('');
        setNotes('');
        setMobileCartOpen(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const CartPanelContent = (
    <div className="flex flex-col h-full bg-white">
      {/* Cart Header */}
      <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">รายการขายหน้าร้าน</h2>
            <p className="text-xs text-slate-500">
              {cart.length} รายการ · {totalQty} ชิ้น
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setCart([]);
                setDiscountAmount(0);
                setCashReceived('');
              }}
              className="min-h-[36px] px-2.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              ล้างตะกร้า
            </button>
          )}
          <button
            type="button"
            onClick={() => setMobileCartOpen(false)}
            className="xl:hidden min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg bg-slate-100 text-slate-700"
            aria-label="ปิดตะกร้า"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackError && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{feedbackError}</span>
        </div>
      )}

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 custom-scrollbar">
        {cart.length === 0 ? (
          <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center py-8 px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-700">ยังไม่มีสินค้าในตะกร้า</div>
            <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
              แตะเลือกสินค้าด้านซ้าย หรือยิงบาร์โค้ดเพื่อเริ่มคิดเงินและตัดสต็อกอัตโนมัติ
            </p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.productId || item.name}
              className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 leading-snug">{item.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-mono-num">
                    {formatBaht(item.unitPrice)} / {item.unit}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.productId)}
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  aria-label="ลบรายการ"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateQty(item.productId, -1)}
                    className="w-10 h-10 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 transition-transform cursor-pointer"
                    aria-label="ลดจำนวน"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center font-mono-num text-sm font-bold text-slate-900">
                    {item.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQty(item.productId, 1)}
                    className="w-10 h-10 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 transition-transform cursor-pointer"
                    aria-label="เพิ่มจำนวน"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-sm font-bold font-mono-num text-slate-900">
                  {formatBaht(item.lineTotal)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Customer & Payment Footer */}
      <div className="border-t border-slate-200 p-4 space-y-3 bg-white shrink-0">
        {/* Customer Toggle */}
        <div>
          <button
            type="button"
            onClick={() => setUseCustomCustomer((v) => !v)}
            className={`w-full min-h-[42px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
              useCustomCustomer
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              {useCustomCustomer ? 'ระบุข้อมูลผู้ซื้อ / ออกใบกำกับภาษี' : 'ลูกค้าทั่วไป (หน้าร้าน)'}
            </span>
            <span className="text-[11px] underline">
              {useCustomCustomer ? 'ซ่อน' : 'กรอกชื่อลูกค้า'}
            </span>
          </button>

          {useCustomCustomer && (
            <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <input
                type="text"
                placeholder="ชื่อลูกค้า / บริษัท / โรงเรียน *"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="เลขผู้เสียภาษี 13 หลัก"
                  value={customer.taxId || ''}
                  onChange={(e) => setCustomer({ ...customer, taxId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono-num focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="เบอร์โทรศัพท์"
                  value={customer.phone || ''}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono-num focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <input
                type="text"
                placeholder="ที่อยู่สำหรับออกเอกสาร"
                value={customer.address || ''}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Discount & VAT */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              ส่วนลดท้ายบิล (บาท)
            </label>
            <input
              type="number"
              min={0}
              value={discountAmount || ''}
              onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono-num text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              รูปแบบภาษี (VAT 7%)
            </label>
            <select
              value={vatMode}
              onChange={(e) => setVatMode(e.target.value as VatMode)}
              className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="included">รวม VAT 7% แล้ว</option>
              <option value="excluded">คิดเพิ่ม VAT 7%</option>
              <option value="none">ไม่คิด VAT</option>
            </select>
          </div>
        </div>

        {/* Payment Method */}
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={`min-h-[42px] px-2 py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                paymentMethod === 'cash'
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Banknote className="w-4 h-4" />
              เงินสด
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('transfer')}
              className={`min-h-[42px] px-2 py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                paymentMethod === 'transfer'
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <QrCode className="w-4 h-4" />
              โอน / QR
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`min-h-[42px] px-2 py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                paymentMethod === 'card'
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              บัตรเครดิต
            </button>
          </div>

          {paymentMethod === 'cash' && grandTotal > 0 && (
            <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-emerald-900">รับเงินสด:</span>
                <input
                  type="number"
                  min={0}
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder={String(grandTotal)}
                  className="w-32 px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white text-right font-mono-num font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[grandTotal, 100, 500, 1000].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCashReceived(String(preset))}
                    className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-[11px] font-mono-num font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                  >
                    {idx === 0 ? 'พอดี' : `฿${preset}`}
                  </button>
                ))}
                <div className="ml-auto text-xs font-bold text-emerald-900 flex items-center">
                  ทอน: <span className="font-mono-num ml-1">{formatBaht(changeDue)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Totals Summary */}
        <div className="pt-2 border-t border-slate-200 space-y-1 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>มูลค่าก่อนภาษี</span>
            <span className="font-mono-num">{formatBaht(preVatAmount)}</span>
          </div>
          {vatMode !== 'none' && (
            <div className="flex justify-between text-slate-600">
              <span>ภาษีมูลค่าเพิ่ม 7%</span>
              <span className="font-mono-num">{formatBaht(vatAmount)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-1">
            <span className="text-sm font-bold text-slate-900">ยอดรวมสุทธิ</span>
            <span className="text-2xl font-extrabold font-mono-num text-blue-600">
              {formatBaht(grandTotal)}
            </span>
          </div>
        </div>

        {/* Checkout Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            disabled={submitting || cart.length === 0}
            onClick={() => handleCheckout('RECEIPT')}
            className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5" />
            ชำระเงิน & ออกใบเสร็จรับเงิน
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={submitting || cart.length === 0}
              onClick={() => handleCheckout('TAX_INVOICE')}
              className="min-h-[44px] px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Receipt className="w-4 h-4 shrink-0" />
              <span className="truncate">ใบส่งของ/กำกับภาษี</span>
            </button>
            <button
              type="button"
              disabled={submitting || cart.length === 0}
              onClick={() => handleCheckout('QUOTATION')}
              className="min-h-[44px] px-2.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 disabled:bg-slate-50 disabled:border-slate-200 disabled:text-slate-400 text-amber-900 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span className="truncate">บันทึกใบเสนอราคา</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col xl:flex-row gap-5 h-full min-h-0">
      {/* Left: Catalog Area */}
      <div className="flex-1 flex flex-col min-w-0 space-y-4">
        {/* Search & Quick Add */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="ค้นหาชื่อสินค้า, รหัส SKU หรือยิงบาร์โค้ดแล้วกด Enter..."
                className="w-full min-h-[46px] pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={onQuickAddProduct}
              className="min-h-[46px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              <PackagePlus className="w-4 h-4" />
              เพิ่มสินค้าใหม่
            </button>
          </div>

          {/* Category Filter Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              สินค้าทั้งหมด ({products.length})
            </button>
            {CATEGORY_LIST.map((cat) => {
              const active = selectedCategory === cat.key;
              const count = products.filter((p) => p.category === cat.key).length;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors cursor-pointer flex items-center gap-2 ${
                    active
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: active ? '#FFFFFF' : cat.color }}
                  />
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 2xl:grid-cols-4 gap-3 pb-24 xl:pb-4">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
              <div className="text-base font-bold text-slate-800">ไม่พบสินค้าที่ตรงกับคำค้นหา</div>
              <p className="text-xs text-slate-500">
                ลองเปลี่ยนคำค้นหา เลือกหมวดหมู่ทั้งหมด หรือเพิ่มรายการสินค้าใหม่เข้าสู่ร้านค้า
              </p>
              <button
                type="button"
                onClick={onQuickAddProduct}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                เพิ่มสินค้าเข้าคลัง
              </button>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const cat = getCategoryMeta(product.category);
              const inCartQty = cart.find((c) => c.productId === product.id)?.qty || 0;
              const outOfStock = product.stock <= 0;
              const lowStock = product.stock > 0 && product.stock <= product.minStock;

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  className={`group relative text-left bg-white border rounded-2xl p-3.5 transition-all flex flex-col justify-between min-h-[168px] cursor-pointer active:scale-[0.98] ${
                    inCartQty > 0
                      ? 'border-blue-600 ring-2 ring-blue-600/15'
                      : outOfStock
                      ? 'border-slate-200 opacity-65'
                      : 'border-slate-200 hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  {/* Top Category Accent Strip */}
                  <div
                    className="h-1.5 w-12 rounded-full mb-2.5"
                    style={{ backgroundColor: cat.color }}
                  />

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span className="truncate font-medium" style={{ color: cat.color }}>
                        {cat.label}
                      </span>
                      <span className="font-mono-num shrink-0">{product.sku}</span>
                    </div>

                    <div className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                      {product.name}
                    </div>
                  </div>

                  <div className="pt-3 mt-2 border-t border-slate-100 flex items-end justify-between gap-2">
                    <div>
                      <div className="text-lg font-extrabold font-mono-num text-slate-900">
                        {formatBaht(product.sellPrice)}
                      </div>
                      <div
                        className={`text-[11px] font-medium ${
                          outOfStock
                            ? 'text-rose-600 font-bold'
                            : lowStock
                            ? 'text-amber-700 font-semibold'
                            : 'text-slate-500'
                        }`}
                      >
                        {outOfStock
                          ? 'สินค้าหมดสต็อก'
                          : `คงเหลือ ${product.stock} ${product.unit}`}
                      </div>
                    </div>

                    {inCartQty > 0 ? (
                      <div className="h-9 min-w-[36px] px-2.5 rounded-xl bg-blue-600 text-white font-mono-num text-xs font-bold flex items-center justify-center">
                        x{inCartQty}
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-700 flex items-center justify-center transition-colors">
                        <Plus className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Desktop / Large Tablet Cart Sidebar */}
      <aside className="hidden xl:flex w-[400px] shrink-0 border border-slate-200 rounded-2xl overflow-hidden shadow-sm h-[calc(100vh-110px)] sticky top-4">
        {CartPanelContent}
      </aside>

      {/* Tablet / Mobile Floating Cart Trigger Bar */}
      <div className="xl:hidden fixed bottom-20 left-4 right-4 z-30">
        <button
          type="button"
          onClick={() => setMobileCartOpen(true)}
          className="w-full min-h-[54px] px-4 py-3 rounded-2xl bg-slate-900 text-white shadow-lg flex items-center justify-between gap-3 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-mono-num text-sm font-bold">
              {totalQty}
            </div>
            <div className="text-left">
              <div className="text-xs text-slate-300">ตะกร้าขายหน้าร้าน ({cart.length} รายการ)</div>
              <div className="text-sm font-bold">แตะเพื่อคิดเงิน & ออกเอกสาร</div>
            </div>
          </div>
          <div className="text-lg font-extrabold font-mono-num text-emerald-400">
            {formatBaht(grandTotal)}
          </div>
        </button>
      </div>

      {/* Tablet / Mobile Cart Drawer */}
      {mobileCartOpen && (
        <div className="xl:hidden fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md h-full bg-white shadow-2xl">{CartPanelContent}</div>
        </div>
      )}
    </div>
  );
};
