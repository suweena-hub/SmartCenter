import React, { useEffect, useMemo, useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit3,
  Trash2,
  ArrowUpCircle,
  AlertTriangle,
  Download,
  X,
  History,
} from 'lucide-react';
import type { CategoryKey, Product, StockMovement } from '../types';
import {
  CATEGORY_LIST,
  exportCsvWithBom,
  formatBaht,
  formatNumber,
  formatThaiDateTime,
  getCategoryMeta,
} from '../utils/format';

interface InventoryManagerProps {
  products: Product[];
  movements: StockMovement[];
  onSaveProduct: (data: Partial<Product>, existingId?: string) => Promise<boolean>;
  onRestockProduct: (id: string, qty: number, note?: string) => Promise<boolean>;
  onDeleteProduct: (id: string) => Promise<boolean>;
  externalOpenAddSignal?: number;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  products,
  movements,
  onSaveProduct,
  onRestockProduct,
  onDeleteProduct,
  externalOpenAddSignal,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'low' | CategoryKey>('all');
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'movements'>('products');

  // Product Form Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formState, setFormState] = useState<Partial<Product>>({
    name: '',
    sku: '',
    barcode: '',
    category: 'school',
    unit: 'ชิ้น',
    costPrice: 0,
    sellPrice: 0,
    stock: 0,
    minStock: 10,
    description: '',
  });
  const [saving, setSaving] = useState(false);

  // Restock Modal
  const [restockTarget, setRestockTarget] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState<number>(10);
  const [restockNote, setRestockNote] = useState<string>('รับสินค้าเข้าคลัง');

  useEffect(() => {
    if (externalOpenAddSignal && externalOpenAddSignal > 0) {
      setEditingProduct(null);
      setFormState({
        name: '',
        sku: `PRD-${String(products.length + 1).padStart(3, '0')}`,
        barcode: String(885000100000 + products.length + 1),
        category: 'school',
        unit: 'ชิ้น',
        costPrice: 0,
        sellPrice: 0,
        stock: 0,
        minStock: 10,
        description: '',
      });
      setModalOpen(true);
    }
  }, [externalOpenAddSignal]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormState({
      name: '',
      sku: `PRD-${String(products.length + 1).padStart(3, '0')}`,
      barcode: String(885000100000 + products.length + 1),
      category: 'school',
      unit: 'ชิ้น',
      costPrice: 0,
      sellPrice: 0,
      stock: 0,
      minStock: 10,
      description: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setFormState({ ...prod });
    setModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name?.trim()) return;
    setSaving(true);
    const ok = await onSaveProduct(formState, editingProduct?.id);
    setSaving(false);
    if (ok) {
      setModalOpen(false);
    }
  };

  const handleConfirmRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockTarget || restockQty === 0) return;
    const ok = await onRestockProduct(restockTarget.id, restockQty, restockNote);
    if (ok) {
      setRestockTarget(null);
      setRestockQty(10);
    }
  };

  const stats = useMemo(() => {
    const totalSkus = products.length;
    const totalUnits = products.reduce((s, p) => s + p.stock, 0);
    const totalCostValue = products.reduce((s, p) => s + p.stock * p.costPrice, 0);
    const totalRetailValue = products.reduce((s, p) => s + p.stock * p.sellPrice, 0);
    const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;
    return { totalSkus, totalUnits, totalCostValue, totalRetailValue, lowStockCount };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryFilter === 'low' && p.stock > p.minStock) return false;
      if (categoryFilter !== 'all' && categoryFilter !== 'low' && p.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q)
      );
    });
  }, [products, search, categoryFilter]);

  const handleExportCsv = () => {
    exportCsvWithBom(
      `smart-center-inventory-${new Date().toISOString().slice(0, 10)}.csv`,
      ['รหัส SKU', 'บาร์โค้ด', 'ชื่อสินค้า', 'หมวดหมู่', 'หน่วย', 'ราคาทุน', 'ราคาขาย', 'คงเหลือ', 'จุดแจ้งเตือน'],
      products.map((p) => [
        p.sku,
        p.barcode,
        p.name,
        getCategoryMeta(p.category).label,
        p.unit,
        p.costPrice,
        p.sellPrice,
        p.stock,
        p.minStock,
      ])
    );
  };

  return (
    <div className="space-y-5 pb-24 lg:pb-6">
      {/* Top KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs font-medium text-slate-500">รายการสินค้าทั้งหมด</div>
          <div className="text-2xl font-extrabold font-mono-num text-slate-900 mt-1">
            {formatNumber(stats.totalSkus)} <span className="text-sm font-medium text-slate-500">รายการ</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            รวมจำนวนคงคลัง {formatNumber(stats.totalUnits)} ชิ้น
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs font-medium text-slate-500">มูลค่าสินค้าทุนคงคลัง</div>
          <div className="text-2xl font-extrabold font-mono-num text-blue-600 mt-1">
            {formatBaht(stats.totalCostValue)}
          </div>
          <div className="text-xs text-slate-500 mt-1">คำนวณจากต้นทุนปัจจุบัน</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs font-medium text-slate-500">มูลค่าขายปลีกรวม</div>
          <div className="text-2xl font-extrabold font-mono-num text-emerald-600 mt-1">
            {formatBaht(stats.totalRetailValue)}
          </div>
          <div className="text-xs text-slate-500 mt-1">ประเมินรายได้หากขายหมดคลัง</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs font-medium text-slate-500">สินค้าใกล้หมด / ต้องเติมสต็อก</div>
          <div
            className={`text-2xl font-extrabold font-mono-num mt-1 ${
              stats.lowStockCount > 0 ? 'text-amber-600' : 'text-emerald-600'
            }`}
          >
            {stats.lowStockCount} <span className="text-sm font-medium text-slate-500">รายการ</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {stats.lowStockCount > 0 ? 'ควรสั่งซื้อเพิ่มเข้าหน้าร้าน' : 'สต็อกสินค้าทุกรายการเพียงพอ'}
          </div>
        </div>
      </div>

      {/* Controls & Sub-tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveSubTab('products')}
              className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                activeSubTab === 'products'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-4 h-4" />
              รายการสินค้าและสต็อก
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('movements')}
              className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                activeSubTab === 'movements'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4" />
              ประวัติการตัด/รับสต็อก ({movements.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              ส่งออก CSV
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              เพิ่มสินค้าใหม่
            </button>
          </div>
        </div>

        {activeSubTab === 'products' && (
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อสินค้า รหัส SKU หรือบาร์โค้ด..."
                className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                  categoryFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('low')}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  categoryFilter === 'low'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                สินค้าใกล้หมด ({stats.lowStockCount})
              </button>
              {CATEGORY_LIST.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategoryFilter(cat.key)}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 border cursor-pointer ${
                    categoryFilter === cat.key
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Product Table / Movement Table */}
      {activeSubTab === 'products' ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 text-left">รหัส / สินค้า</th>
                  <th className="py-3 px-4 text-left">หมวดหมู่</th>
                  <th className="py-3 px-4 text-right">ราคาทุน</th>
                  <th className="py-3 px-4 text-right">ราคาขาย</th>
                  <th className="py-3 px-4 text-right">คงเหลือ</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const cat = getCategoryMeta(p.category);
                  const isLow = p.stock <= p.minStock;
                  const isOut = p.stock <= 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-xs text-slate-500 font-mono-num mt-0.5">
                          SKU: {p.sku} · บาร์โค้ด: {p.barcode}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-semibold" style={{ color: cat.color }}>
                          {cat.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num text-slate-600">
                        {formatBaht(p.costPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num font-bold text-slate-900">
                        {formatBaht(p.sellPrice)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div
                          className={`font-mono-num font-bold ${
                            isOut
                              ? 'text-rose-600'
                              : isLow
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {formatNumber(p.stock)} {p.unit}
                        </div>
                        {isLow && (
                          <div className="text-[11px] text-amber-700">
                            {isOut ? 'หมดสต็อก' : `ต่ำกว่าเกณฑ์ (${p.minStock})`}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setRestockTarget(p);
                              setRestockQty(10);
                              setRestockNote('รับสินค้าเข้าคลัง');
                            }}
                            className="min-h-[38px] px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            title="เติมสต็อก"
                          >
                            <ArrowUpCircle className="w-3.5 h-3.5" />
                            รับเข้า
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="min-h-[38px] min-w-[38px] rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
                            aria-label="แก้ไขสินค้า"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteProduct(p.id)}
                            className="min-h-[38px] min-w-[38px] rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer"
                            aria-label="ลบสินค้า"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-slate-500">
                      ไม่พบสินค้าในหมวดหมู่หรือคำค้นหานี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 text-left">วัน-เวลา</th>
                  <th className="py-3 px-4 text-left">รายการสินค้า</th>
                  <th className="py-3 px-4 text-left">ประเภท</th>
                  <th className="py-3 px-4 text-right">เปลี่ยนแปลง</th>
                  <th className="py-3 px-4 text-right">คงเหลือหลังทำรายการ</th>
                  <th className="py-3 px-4 text-left">หมายเหตุ / อ้างอิง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.slice(0, 60).map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 text-xs text-slate-500 font-mono-num whitespace-nowrap">
                      {formatThaiDateTime(m.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{m.productName}</td>
                    <td className="py-3 px-4 text-xs">
                      <span
                        className={`font-semibold ${
                          m.type === 'SALE'
                            ? 'text-blue-700'
                            : m.type === 'RESTOCK'
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {m.type === 'SALE'
                          ? 'ตัดสต็อกขาย'
                          : m.type === 'RESTOCK'
                          ? 'รับสินค้าเข้า'
                          : 'ปรับยอดสต็อก'}
                      </span>
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono-num font-bold ${
                        m.qtyChange >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {m.qtyChange >= 0 ? `+${m.qtyChange}` : m.qtyChange}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num text-slate-800">
                      {m.stockAfter}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {m.referenceDoc ? `${m.referenceDoc} · ` : ''}
                      {m.note || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitForm}
            className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                {editingProduct ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มรายการสินค้าใหม่เข้าสู่ร้าน'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[40px] min-w-[40px] rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อสินค้า *
                </label>
                <input
                  type="text"
                  required
                  value={formState.name || ''}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  placeholder="เช่น สมุดปกแข็ง A4 ตราช้าง, ปากกาลูกลื่น..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมวดหมู่สินค้า
                </label>
                <select
                  value={formState.category || 'school'}
                  onChange={(e) =>
                    setFormState({ ...formState, category: e.target.value as CategoryKey })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORY_LIST.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หน่วยนับ (เช่น เล่ม, ด้าม, รีม, กล่อง)
                </label>
                <input
                  type="text"
                  required
                  value={formState.unit || ''}
                  onChange={(e) => setFormState({ ...formState, unit: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสสินค้า (SKU)
                </label>
                <input
                  type="text"
                  value={formState.sku || ''}
                  onChange={(e) => setFormState({ ...formState, sku: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono-num focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสบาร์โค้ด
                </label>
                <input
                  type="text"
                  value={formState.barcode || ''}
                  onChange={(e) => setFormState({ ...formState, barcode: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono-num focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ราคาทุน (บาท)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formState.costPrice ?? 0}
                  onChange={(e) =>
                    setFormState({ ...formState, costPrice: Number(e.target.value) || 0 })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono-num focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ราคาขายปลีก (บาท) *
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={formState.sellPrice ?? 0}
                  onChange={(e) =>
                    setFormState({ ...formState, sellPrice: Number(e.target.value) || 0 })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono-num font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  จำนวนสต็อกเริ่มต้น / ปัจจุบัน
                </label>
                <input
                  type="number"
                  min={0}
                  value={formState.stock ?? 0}
                  onChange={(e) =>
                    setFormState({ ...formState, stock: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono-num focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  จุดแจ้งเตือนสินค้าใกล้หมด
                </label>
                <input
                  type="number"
                  min={0}
                  value={formState.minStock ?? 5}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      minStock: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono-num focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รายละเอียดเพิ่มเติม
                </label>
                <input
                  type="text"
                  value={formState.description || ''}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  placeholder="ขนาด สี ยี่ห้อ หรือหมายเหตุสินค้า"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="min-h-[44px] px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold cursor-pointer"
              >
                {saving ? 'กำลังบันทึก...' : editingProduct ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้าเข้าคลัง'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Restock Modal */}
      {restockTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmRestock}
            className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">รับสินค้าเข้าคลัง / ปรับสต็อก</h3>
              <button
                type="button"
                onClick={() => setRestockTarget(null)}
                className="min-h-[36px] min-w-[36px] rounded-lg bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900 text-sm">{restockTarget.name}</div>
              <div className="text-slate-600">
                คงเหลือปัจจุบัน:{' '}
                <span className="font-mono-num font-bold text-slate-900">
                  {restockTarget.stock} {restockTarget.unit}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                จำนวนที่รับเข้าเพิ่ม (ใส่ค่าลบเพื่อปรับลด)
              </label>
              <input
                type="number"
                value={restockQty}
                onChange={(e) => setRestockQty(Number(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono-num text-lg font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเหตุ</label>
              <input
                type="text"
                value={restockNote}
                onChange={(e) => setRestockNote(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRestockTarget(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer"
              >
                ยืนยันปรับสต็อก
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
