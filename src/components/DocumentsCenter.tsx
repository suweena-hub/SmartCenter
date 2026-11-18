import React, { useMemo, useState } from 'react';
import {
  FileText,
  Printer,
  Plus,
  Search,
  ArrowRightCircle,
  Trash2,
  X,
  Receipt,
  Files,
} from 'lucide-react';
import type {
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
  calculateTotals,
  formatBaht,
  formatThaiDateTime,
  getDocumentTitleThai,
} from '../utils/format';

interface DocumentsCenterProps {
  documents: StoreDocument[];
  products: Product[];
  settings: StoreSettings;
  onPrintDocument: (doc: StoreDocument) => void;
  onCreateDocument: (payload: {
    type: DocumentType;
    customer: CustomerInfo;
    items: LineItem[];
    discountAmount: number;
    vatMode: VatMode;
    paymentMethod?: PaymentMethod;
    notes?: string;
    validUntil?: string;
  }) => Promise<StoreDocument | null>;
  onConvertQuotation: (
    quotationId: string,
    targetType: 'TAX_INVOICE' | 'RECEIPT'
  ) => Promise<StoreDocument | null>;
}

export const DocumentsCenter: React.FC<DocumentsCenterProps> = ({
  documents,
  products,
  settings,
  onPrintDocument,
  onCreateDocument,
  onConvertQuotation,
}) => {
  const [typeFilter, setTypeFilter] = useState<'ALL' | DocumentType>('ALL');
  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Create Document Builder State
  const [docType, setDocType] = useState<DocumentType>('QUOTATION');
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: '',
    taxId: '',
    branch: 'สำนักงานใหญ่',
    address: '',
    phone: '',
  });
  const [items, setItems] = useState<LineItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [vatMode, setVatMode] = useState<VatMode>(settings.defaultVatMode || 'excluded');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [notes, setNotes] = useState('ยืนราคา 14 วัน');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((d) => {
      if (typeFilter !== 'ALL' && d.type !== typeFilter) return false;
      if (!q) return true;
      return (
        d.docNumber.toLowerCase().includes(q) ||
        d.customer.name.toLowerCase().includes(q) ||
        (d.customer.taxId || '').toLowerCase().includes(q)
      );
    });
  }, [documents, typeFilter, search]);

  const counts = useMemo(() => {
    return {
      all: documents.length,
      qt: documents.filter((d) => d.type === 'QUOTATION').length,
      iv: documents.filter((d) => d.type === 'TAX_INVOICE').length,
      rc: documents.filter((d) => d.type === 'RECEIPT').length,
    };
  }, [documents]);

  const openCreator = (initialType: DocumentType) => {
    setDocType(initialType);
    setCustomer({
      name: '',
      taxId: '',
      branch: 'สำนักงานใหญ่',
      address: '',
      phone: '',
    });
    setItems([]);
    setDiscountAmount(0);
    setVatMode(initialType === 'TAX_INVOICE' ? 'included' : 'excluded');
    setNotes(
      initialType === 'QUOTATION'
        ? 'ยืนราคา 14 วัน นับจากวันที่ออกใบเสนอราคา'
        : initialType === 'TAX_INVOICE'
        ? 'ตรวจรับสินค้าเรียบร้อยแล้ว'
        : ''
    );
    setErrorMsg(null);
    setCreateModalOpen(true);
  };

  const addProductLine = () => {
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;
    setItems((prev) => [
      ...prev,
      {
        productId: prod.id,
        sku: prod.sku,
        name: prod.name,
        unit: prod.unit,
        qty: 1,
        unitPrice: prod.sellPrice,
        costPrice: prod.costPrice,
        discount: 0,
        lineTotal: prod.sellPrice,
      },
    ]);
    setSelectedProductId('');
  };

  const addCustomLine = () => {
    setItems((prev) => [
      ...prev,
      {
        sku: 'CUSTOM',
        name: '',
        unit: 'ชิ้น',
        qty: 1,
        unitPrice: 0,
        costPrice: 0,
        discount: 0,
        lineTotal: 0,
      },
    ]);
  };

  const updateLine = (idx: number, patch: Partial<LineItem>) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const merged = { ...it, ...patch };
        merged.lineTotal = Math.max(
          0,
          Number((merged.qty * merged.unitPrice - merged.discount).toFixed(2))
        );
        return merged;
      })
    );
  };

  const rawSubtotal = items.reduce((s, it) => s + it.lineTotal, 0);
  const { vatAmount, grandTotal } = calculateTotals(rawSubtotal, discountAmount, vatMode);

  const handleSubmitDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer.name.trim()) {
      setErrorMsg('กรุณากรอกชื่อลูกค้า / หน่วยงาน / บริษัท');
      return;
    }
    const validItems = items.filter((it) => it.name.trim() && it.qty > 0);
    if (validItems.length === 0) {
      setErrorMsg('กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    const created = await onCreateDocument({
      type: docType,
      customer,
      items: validItems,
      discountAmount,
      vatMode,
      paymentMethod: docType === 'QUOTATION' ? undefined : paymentMethod,
      notes,
    });
    setSubmitting(false);

    if (created) {
      setCreateModalOpen(false);
    }
  };

  return (
    <div className="space-y-5 pb-24 lg:pb-6">
      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <button
          type="button"
          onClick={() => openCreator('QUOTATION')}
          className="bg-white hover:border-indigo-400 border border-slate-200 rounded-2xl p-4 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">สร้างใบเสนอราคา (QT)</div>
              <div className="text-xs text-slate-500">เสนอราคาโรงเรียน/บริษัท ไม่ตัดสต็อก</div>
            </div>
          </div>
          <Plus className="w-5 h-5 text-indigo-600 shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => openCreator('TAX_INVOICE')}
          className="bg-white hover:border-blue-400 border border-slate-200 rounded-2xl p-4 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Files className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">ออกใบส่งของ / ใบกำกับภาษี</div>
              <div className="text-xs text-slate-500">พิมพ์ได้ทั้งต้นฉบับและสำเนา + ตัดสต็อก</div>
            </div>
          </div>
          <Plus className="w-5 h-5 text-blue-600 shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => openCreator('RECEIPT')}
          className="bg-white hover:border-emerald-400 border border-slate-200 rounded-2xl p-4 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">ออกใบเสร็จรับเงิน (RC)</div>
              <div className="text-xs text-slate-500">ออกบิลรับเงิน A4 / สลิป + ตัดสต็อก</div>
            </div>
          </div>
          <Plus className="w-5 h-5 text-emerald-600 shrink-0" />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {[
            { key: 'ALL', label: `ทั้งหมด (${counts.all})` },
            { key: 'TAX_INVOICE', label: `ใบส่งของ/กำกับภาษี (${counts.iv})` },
            { key: 'QUOTATION', label: `ใบเสนอราคา (${counts.qt})` },
            { key: 'RECEIPT', label: `ใบเสร็จรับเงิน (${counts.rc})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTypeFilter(tab.key as 'ALL' | DocumentType)}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                typeFilter === tab.key
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาเลขที่เอกสาร หรือชื่อลูกค้า..."
            className="w-full min-h-[42px] pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4 text-left">เลขที่เอกสาร</th>
                <th className="py-3 px-4 text-left">ประเภทเอกสาร</th>
                <th className="py-3 px-4 text-left">ลูกค้า / ผู้รับ</th>
                <th className="py-3 px-4 text-left">วัน-เวลา</th>
                <th className="py-3 px-4 text-right">ยอดสุทธิ</th>
                <th className="py-3 px-4 text-right">การจัดการ / พิมพ์</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.map((doc) => {
                const typeColor =
                  doc.type === 'QUOTATION'
                    ? 'text-indigo-700'
                    : doc.type === 'TAX_INVOICE'
                    ? 'text-blue-700'
                    : 'text-emerald-700';

                return (
                  <tr key={doc.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono-num font-bold text-slate-900">
                      {doc.docNumber}
                      {doc.convertedToDocNumber && (
                        <div className="text-[11px] font-normal text-emerald-700">
                          แปลงเป็น {doc.convertedToDocNumber} แล้ว
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-bold ${typeColor}`}>
                        {getDocumentTitleThai(doc.type)}
                      </span>
                      <div className="text-[11px] text-slate-500">
                        {doc.type === 'TAX_INVOICE'
                          ? 'รองรับต้นฉบับ & สำเนา'
                          : doc.stockDeducted
                          ? 'ตัดสต็อกแล้ว'
                          : 'ยังไม่ตัดสต็อก'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{doc.customer.name}</div>
                      {doc.customer.taxId && (
                        <div className="text-[11px] text-slate-500 font-mono-num">
                          Tax ID: {doc.customer.taxId}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 font-mono-num whitespace-nowrap">
                      {formatThaiDateTime(doc.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num font-bold text-slate-900">
                      {formatBaht(doc.grandTotal)}
                      <div className="text-[11px] font-normal text-slate-500">
                        {doc.items.length} รายการ
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {doc.type === 'QUOTATION' && doc.status !== 'CONVERTED' && (
                          <button
                            type="button"
                            onClick={() => onConvertQuotation(doc.id, 'TAX_INVOICE')}
                            className="min-h-[38px] px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                          >
                            <ArrowRightCircle className="w-3.5 h-3.5" />
                            ออกใบกำกับภาษี & ตัดสต็อก
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onPrintDocument(doc)}
                          className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          ดู / พิมพ์เอกสาร
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-slate-500">
                    ไม่พบเอกสารที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Document Builder Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitDoc}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  สร้าง{getDocumentTitleThai(docType)}
                </h3>
                <p className="text-xs text-slate-500">
                  {docType === 'QUOTATION'
                    ? 'ใบเสนอราคาจะยังไม่ตัดสต็อกจนกว่าจะยืนยันการขาย'
                    : 'ระบบจะคำนวณ VAT และตัดสต็อกสินค้าในคลังให้อัตโนมัติ'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="min-h-[40px] min-w-[40px] rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar text-sm">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Doc Type Selector */}
              <div className="grid grid-cols-3 gap-2">
                {(['QUOTATION', 'TAX_INVOICE', 'RECEIPT'] as DocumentType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDocType(t)}
                    className={`min-h-[42px] px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                      docType === t
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    {getDocumentTitleThai(t)}
                  </button>
                ))}
              </div>

              {/* Customer Details */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-700">ข้อมูลลูกค้า / หน่วยงาน</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <input
                    type="text"
                    required
                    placeholder="ชื่อลูกค้า / บริษัท / โรงเรียน *"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    className="sm:col-span-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="เลขประจำตัวผู้เสียภาษี 13 หลัก"
                    value={customer.taxId || ''}
                    onChange={(e) => setCustomer({ ...customer, taxId: e.target.value })}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-mono-num focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="เบอร์โทรศัพท์"
                    value={customer.phone || ''}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-mono-num focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="ที่อยู่สำหรับออกเอกสาร"
                    value={customer.address || ''}
                    onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                    className="sm:col-span-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Pick Product */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="flex-1 min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                  >
                    <option value="">-- เลือกสินค้าจากคลัง Smart Center --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.sku}] {p.name} ({formatBaht(p.sellPrice)} · คงเหลือ {p.stock} {p.unit})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addProductLine}
                    disabled={!selectedProductId}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 disabled:bg-slate-200 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                  >
                    + เพิ่มจากคลัง
                  </button>
                  <button
                    type="button"
                    onClick={addCustomLine}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold whitespace-nowrap cursor-pointer"
                  >
                    + รายการกำหนดเอง
                  </button>
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl border border-slate-200 bg-white text-xs"
                    >
                      <input
                        type="text"
                        placeholder="ชื่อรายการสินค้า"
                        value={it.name}
                        onChange={(e) => updateLine(idx, { name: e.target.value })}
                        className="col-span-12 sm:col-span-5 px-2.5 py-2 rounded-lg border border-slate-200"
                      />
                      <input
                        type="number"
                        min={1}
                        value={it.qty}
                        onChange={(e) =>
                          updateLine(idx, { qty: Math.max(1, Number(e.target.value) || 1) })
                        }
                        className="col-span-3 sm:col-span-2 px-2 py-2 rounded-lg border border-slate-200 font-mono-num text-right"
                        aria-label="จำนวน"
                      />
                      <input
                        type="text"
                        value={it.unit}
                        onChange={(e) => updateLine(idx, { unit: e.target.value })}
                        className="col-span-3 sm:col-span-1 px-2 py-2 rounded-lg border border-slate-200 text-center"
                        aria-label="หน่วย"
                      />
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={it.unitPrice}
                        onChange={(e) =>
                          updateLine(idx, { unitPrice: Math.max(0, Number(e.target.value) || 0) })
                        }
                        className="col-span-4 sm:col-span-2 px-2 py-2 rounded-lg border border-slate-200 font-mono-num text-right"
                        aria-label="ราคาต่อหน่วย"
                      />
                      <div className="col-span-10 sm:col-span-1 text-right font-mono-num font-bold text-slate-900">
                        {formatBaht(it.lineTotal, false)}
                      </div>
                      <button
                        type="button"
                        onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="col-span-2 sm:col-span-1 min-h-[36px] flex items-center justify-center text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Options & Totals */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">ส่วนลดท้ายบิล</label>
                  <input
                    type="number"
                    min={0}
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono-num"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">ภาษีมูลค่าเพิ่ม (VAT 7%)</label>
                  <select
                    value={vatMode}
                    onChange={(e) => setVatMode(e.target.value as VatMode)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="included">รวม VAT 7%</option>
                    <option value="excluded">แยก VAT 7%</option>
                    <option value="none">ไม่คิด VAT</option>
                  </select>
                </div>
                {docType !== 'QUOTATION' && (
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">วิธีชำระเงิน</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="transfer">โอนเงิน / QR</option>
                      <option value="cash">เงินสด</option>
                      <option value="card">บัตรเครดิต</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">หมายเหตุในเอกสาร</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="space-y-0.5">
                  <div className="text-slate-300">ยอดรวมสินค้า: {formatBaht(rawSubtotal)}</div>
                  <div className="text-slate-300">VAT 7%: {formatBaht(vatAmount)}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-300">ยอดรวมสุทธิทั้งสิ้น</div>
                  <div className="text-2xl font-extrabold font-mono-num text-emerald-400">
                    {formatBaht(grandTotal)}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2.5 shrink-0 bg-slate-50">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="min-h-[44px] px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold cursor-pointer"
              >
                {submitting ? 'กำลังบันทึก...' : 'บันทึกและเปิดหน้าพิมพ์เอกสาร'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
