import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShoppingBag,
  BarChart3,
  Package,
  FileText,
  Calculator,
  Settings,
  CheckCircle2,
  AlertCircle,
  Store,
} from 'lucide-react';
import type {
  CashSession,
  CustomerInfo,
  DocumentType,
  LineItem,
  PaymentMethod,
  Product,
  StoreDatabase,
  StoreDocument,
  StoreSettings,
  VatMode,
} from './types';
import { formatBaht, isSameLocalDay } from './utils/format';
import { PosTerminal } from './components/PosTerminal';
import { ReportsDashboard } from './components/ReportsDashboard';
import { InventoryManager } from './components/InventoryManager';
import { DocumentsCenter } from './components/DocumentsCenter';
import { CashCalculator } from './components/CashCalculator';
import { DocumentPrintModal } from './components/DocumentPrintModal';
import { SettingsModal } from './components/SettingsModal';

type ActiveTab = 'pos' | 'reports' | 'inventory' | 'documents' | 'cash';

const NAV_ITEMS: {
  key: ActiveTab;
  label: string;
  shortLabel: string;
  icon: React.FC<{ className?: string }>;
  accentClass: string;
}[] = [
  {
    key: 'pos',
    label: 'ขายหน้าร้าน (POS)',
    shortLabel: 'ขายหน้าร้าน',
    icon: ShoppingBag,
    accentClass: 'bg-blue-600 text-white',
  },
  {
    key: 'reports',
    label: 'รายงานเรียลไทม์',
    shortLabel: 'รายงาน',
    icon: BarChart3,
    accentClass: 'bg-indigo-600 text-white',
  },
  {
    key: 'inventory',
    label: 'คลังสินค้า & สต็อก',
    shortLabel: 'สินค้า',
    icon: Package,
    accentClass: 'bg-emerald-600 text-white',
  },
  {
    key: 'documents',
    label: 'ใบเสนอราคา & ใบกำกับภาษี',
    shortLabel: 'เอกสาร',
    icon: FileText,
    accentClass: 'bg-amber-600 text-white',
  },
  {
    key: 'cash',
    label: 'คำนวณเงินรวมร้านค้า',
    shortLabel: 'คำนวณเงิน',
    icon: Calculator,
    accentClass: 'bg-rose-600 text-white',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [db, setDb] = useState<StoreDatabase | null>(null);
  const [loading, setLoading] = useState(true);
  const [printDoc, setPrintDoc] = useState<StoreDocument | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quickAddSignal, setQuickAddSignal] = useState(0);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((cur) => (cur?.message === message ? null : cur));
    }, 4000);
  }, []);

  const fetchStore = useCallback(async () => {
    try {
      const res = await fetch('/api/store');
      if (!res.ok) throw new Error('โหลดข้อมูลร้านค้าไม่สำเร็จ');
      const data = (await res.json()) as StoreDatabase;
      setDb(data);
    } catch (err) {
      console.error(err);
      showToast('error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ร้านค้าได้');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchStore();

    // Real-time SSE listener for multi-tablet / multi-tab live sync
    const es = new EventSource('/api/events');
    es.addEventListener('store-updated', () => {
      fetchStore();
    });
    return () => {
      es.close();
    };
  }, [fetchStore]);

  const todaySalesTotal = useMemo(() => {
    if (!db) return 0;
    return db.documents
      .filter((d) => d.type !== 'QUOTATION' && d.status === 'COMPLETED' && isSameLocalDay(d.createdAt))
      .reduce((s, d) => s + d.grandTotal, 0);
  }, [db]);

  const lowStockCount = useMemo(() => {
    if (!db) return 0;
    return db.products.filter((p) => p.stock <= p.minStock).length;
  }, [db]);

  const handleCompleteDocument = async (payload: {
    type: DocumentType;
    customer: CustomerInfo;
    items: LineItem[];
    discountAmount: number;
    vatMode: VatMode;
    paymentMethod?: PaymentMethod;
    cashReceived?: number;
    notes?: string;
    validUntil?: string;
  }): Promise<StoreDocument | null> => {
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'ไม่สามารถบันทึกเอกสารได้');
        return null;
      }
      await fetchStore();
      const created = data as StoreDocument;
      showToast(
        'success',
        created.stockDeducted
          ? `บันทึก ${created.docNumber} และตัดสต็อกสินค้าอัตโนมัติเรียบร้อย`
          : `บันทึกใบเสนอราคา ${created.docNumber} เรียบร้อย`
      );
      setPrintDoc(created);
      return created;
    } catch {
      showToast('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ');
      return null;
    }
  };

  const handleConvertQuotation = async (
    quotationId: string,
    targetType: 'TAX_INVOICE' | 'RECEIPT'
  ): Promise<StoreDocument | null> => {
    try {
      const res = await fetch(`/api/documents/${quotationId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, paymentMethod: 'transfer' }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'แปลงใบเสนอราคาไม่สำเร็จ');
        return null;
      }
      await fetchStore();
      const created = data as StoreDocument;
      showToast('success', `ออกเอกสาร ${created.docNumber} และตัดสต็อกอัตโนมัติแล้ว`);
      setPrintDoc(created);
      return created;
    } catch {
      showToast('error', 'ไม่สามารถแปลงใบเสนอราคาได้');
      return null;
    }
  };

  const handleSaveProduct = async (
    data: Partial<Product>,
    existingId?: string
  ): Promise<boolean> => {
    try {
      const url = existingId ? `/api/products/${existingId}` : '/api/products';
      const method = existingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast('error', json.error || 'บันทึกสินค้าไม่สำเร็จ');
        return false;
      }
      await fetchStore();
      showToast('success', existingId ? 'แก้ไขข้อมูลสินค้าแล้ว' : 'เพิ่มสินค้าใหม่เข้าคลังเรียบร้อย');
      return true;
    } catch {
      showToast('error', 'บันทึกข้อมูลสินค้าไม่สำเร็จ');
      return false;
    }
  };

  const handleRestockProduct = async (
    id: string,
    qty: number,
    note?: string
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/products/${id}/restock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qty, note }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast('error', json.error || 'ปรับสต็อกไม่สำเร็จ');
        return false;
      }
      await fetchStore();
      showToast('success', 'ปรับยอดสต็อกสินค้าเรียบร้อย');
      return true;
    } catch {
      showToast('error', 'ปรับสต็อกสินค้าไม่สำเร็จ');
      return false;
    }
  };

  const handleDeleteProduct = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        showToast('error', 'ลบสินค้าไม่สำเร็จ');
        return false;
      }
      await fetchStore();
      showToast('success', 'ลบรายการสินค้าออกจากระบบแล้ว');
      return true;
    } catch {
      showToast('error', 'ลบสินค้าไม่สำเร็จ');
      return false;
    }
  };

  const handleSaveCashSession = async (
    payload: Omit<CashSession, 'id' | 'createdAt'>
  ): Promise<CashSession | null> => {
    try {
      const res = await fetch('/api/cash-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        showToast('error', 'บันทึกยอดเงินรวมไม่สำเร็จ');
        return null;
      }
      const created = (await res.json()) as CashSession;
      await fetchStore();
      showToast('success', 'บันทึกสรุปยอดเงินรวมของร้านเรียบร้อย');
      return created;
    } catch {
      showToast('error', 'เกิดข้อผิดพลาดขณะบันทึกยอดเงิน');
      return null;
    }
  };

  const handleSaveSettings = async (updated: StoreSettings): Promise<boolean> => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (!res.ok) {
        showToast('error', 'บันทึกการตั้งค่าร้านค้าไม่สำเร็จ');
        return false;
      }
      await fetchStore();
      showToast('success', 'อัปเดตข้อมูลและโลโก้ร้านค้าเรียบร้อย');
      return true;
    } catch {
      showToast('error', 'ไม่สามารถบันทึกการตั้งค่าได้');
      return false;
    }
  };

  const handleCreateStore = async (newStore: Partial<StoreSettings>): Promise<boolean> => {
    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStore),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast('error', json.error || 'เพิ่มร้านค้าใหม่ไม่สำเร็จ');
        return false;
      }
      await fetchStore();
      showToast('success', `เพิ่มและสลับไปใช้งานร้าน "${json.storeName}" เรียบร้อย`);
      return true;
    } catch {
      showToast('error', 'ไม่สามารถเพิ่มร้านค้าใหม่ได้');
      return false;
    }
  };

  const handleActivateStore = async (storeId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/stores/${storeId}/activate`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        showToast('error', json.error || 'สลับร้านค้าไม่สำเร็จ');
        return false;
      }
      await fetchStore();
      showToast('success', `สลับไปใช้งานร้าน "${json.storeName}" แล้ว`);
      return true;
    } catch {
      showToast('error', 'ไม่สามารถสลับร้านค้าได้');
      return false;
    }
  };

  const handleDeleteStore = async (storeId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/stores/${storeId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        showToast('error', json.error || 'ลบร้านค้าไม่สำเร็จ');
        return false;
      }
      await fetchStore();
      showToast('success', 'ลบร้านค้าที่เลือกออกจากระบบแล้ว');
      return true;
    } catch {
      showToast('error', 'ไม่สามารถลบร้านค้าได้');
      return false;
    }
  };

  if (loading || !db) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F6F8FC] p-6">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-4">
          <Store className="w-6 h-6" />
        </div>
        <div className="text-lg font-bold text-slate-900 font-display">Smart Center</div>
        <div className="text-xs text-slate-500 mt-1">กำลังเตรียมข้อมูลสินค้าและระบบขายหน้าร้าน...</div>
      </div>
    );
  }

  const currentNav = NAV_ITEMS.find((n) => n.key === activeTab) || NAV_ITEMS[0];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F6F8FC] text-slate-900">
      {/* Desktop / Landscape Tablet Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-slate-200 sticky top-0 h-screen">
        {/* Brand */}
        <div className="p-5 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="w-full text-left flex items-center gap-3 group cursor-pointer"
            title="คลิกเพื่อเปลี่ยนชื่อร้าน โลโก้ หรือสลับร้านค้า"
          >
            {db.settings.logoUrl ? (
              <img
                src={db.settings.logoUrl}
                alt={db.settings.storeName}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-xl object-contain border border-slate-200 bg-white p-0.5 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Store className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-lg font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors font-display tracking-tight truncate">
                {db.settings.storeName}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {db.settings.branchName || 'คลิกเพื่อเปลี่ยนร้าน / โลโก้'}
              </div>
            </div>
          </button>
        </div>

        {/* Today Real-time Sales Quick Box */}
        <div className="mx-4 mt-4 p-3.5 rounded-2xl bg-slate-900 text-white space-y-1">
          <div className="text-[11px] text-slate-300">ยอดขายวันนี้ (เรียลไทม์)</div>
          <div className="text-xl font-extrabold font-mono-num text-emerald-400">
            {formatBaht(todaySalesTotal)}
          </div>
          {lowStockCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className="text-[11px] text-amber-300 hover:underline pt-0.5 block cursor-pointer"
            >
              แจ้งเตือน: สินค้าใกล้หมด {lowStockCount} รายการ
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto" aria-label="เมนูหลัก">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? item.accentClass
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Store Settings Button */}
        <div className="p-3.5 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 shrink-0" />
            จัดการชื่อร้าน โลโก้ & สลับร้าน
          </button>
        </div>
      </aside>

      {/* Portrait Tablet / Mobile Top App Bar (Strict 3-zone) */}
      <header className="lg:hidden sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-2 min-w-0 shrink-0 cursor-pointer"
        >
          {db.settings.logoUrl && (
            <img
              src={db.settings.logoUrl}
              alt={db.settings.storeName}
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-lg object-contain border border-slate-200 bg-white shrink-0"
            />
          )}
          <span className="text-base font-extrabold text-slate-900 font-display whitespace-nowrap truncate max-w-[140px]">
            {db.settings.storeName}
          </span>
        </button>
        <span className="text-xs font-semibold text-slate-600 truncate">
          {currentNav.label}
        </span>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="min-h-[40px] min-w-[40px] rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 cursor-pointer"
          aria-label="ตั้งค่าร้านค้าและโลโก้"
        >
          <Settings className="w-4 h-4" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-5 lg:p-6">
        {/* Desktop Context Header */}
        <div className="hidden lg:flex items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 font-display">{currentNav.label}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {db.settings.storeName} · {db.settings.branchName}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeTab !== 'pos' && (
              <button
                type="button"
                onClick={() => setActiveTab('pos')}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                ไปหน้าขายหน้าร้าน (POS)
              </button>
            )}
          </div>
        </div>

        {/* Active View */}
        {activeTab === 'pos' && (
          <PosTerminal
            products={db.products}
            settings={db.settings}
            onCompleteDocument={handleCompleteDocument}
            onQuickAddProduct={() => {
              setActiveTab('inventory');
              setQuickAddSignal((s) => s + 1);
            }}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsDashboard
            documents={db.documents}
            products={db.products}
            settings={db.settings}
            onPrintDocument={(d) => setPrintDoc(d)}
            onNavigateTab={(t) => setActiveTab(t)}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryManager
            products={db.products}
            movements={db.stockMovements}
            onSaveProduct={handleSaveProduct}
            onRestockProduct={handleRestockProduct}
            onDeleteProduct={handleDeleteProduct}
            externalOpenAddSignal={quickAddSignal}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentsCenter
            documents={db.documents}
            products={db.products}
            settings={db.settings}
            onPrintDocument={(d) => setPrintDoc(d)}
            onCreateDocument={handleCompleteDocument}
            onConvertQuotation={handleConvertQuotation}
          />
        )}

        {activeTab === 'cash' && (
          <CashCalculator
            documents={db.documents}
            cashSessions={db.cashSessions}
            onSaveCashSession={handleSaveCashSession}
          />
        )}
      </main>

      {/* Portrait Tablet / Mobile Bottom Navigation Bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-5 items-center"
        aria-label="แถบเมนูด่วน"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key)}
              className={`h-full flex flex-col items-center justify-center gap-0.5 px-1 transition-colors cursor-pointer ${
                active ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-tight truncate max-w-full">
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Printable Document Modal */}
      <DocumentPrintModal
        doc={printDoc}
        settings={db.settings}
        onClose={() => setPrintDoc(null)}
      />

      {/* Store Settings Modal */}
      <SettingsModal
        open={settingsOpen}
        settings={db.settings}
        stores={db.stores || [db.settings]}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
        onCreateStore={handleCreateStore}
        onActivateStore={handleActivateStore}
        onDeleteStore={handleDeleteStore}
      />

      {/* Global Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[60] max-w-sm px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2.5 ${
            toast.type === 'success'
              ? 'bg-emerald-600 border-emerald-500 text-white'
              : 'bg-rose-600 border-rose-500 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
