import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  Receipt,
  Download,
  Printer,
  BarChart3,
  AlertTriangle,
  Wallet,
} from 'lucide-react';
import type { CategoryKey, Product, StoreDocument, StoreSettings } from '../types';
import {
  CATEGORY_LIST,
  exportCsvWithBom,
  formatBaht,
  formatNumber,
  formatThaiDate,
  formatThaiDateTime,
  getCategoryMeta,
  getDocumentTitleThai,
  isSameLocalDay,
} from '../utils/format';

interface ReportsDashboardProps {
  documents: StoreDocument[];
  products: Product[];
  settings: StoreSettings;
  onPrintDocument: (doc: StoreDocument) => void;
  onNavigateTab: (tab: 'pos' | 'inventory' | 'documents' | 'cash' | 'reports') => void;
}

type PeriodFilter = 'today' | '7days' | 'month' | 'all';

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({
  documents,
  products,
  settings,
  onPrintDocument,
  onNavigateTab,
}) => {
  const [period, setPeriod] = useState<PeriodFilter>('today');

  const completedSales = useMemo(() => {
    const now = new Date();
    return documents.filter((d) => {
      if (d.type === 'QUOTATION' || d.status !== 'COMPLETED') return false;
      const dt = new Date(d.createdAt);
      if (period === 'today') return isSameLocalDay(d.createdAt, now);
      if (period === '7days') return now.getTime() - dt.getTime() <= 7 * 86400000;
      if (period === 'month') {
        return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
      }
      return true;
    });
  }, [documents, period]);

  const metrics = useMemo(() => {
    const totalRevenue = completedSales.reduce((s, d) => s + d.grandTotal, 0);
    const totalCost = completedSales.reduce((s, d) => s + d.totalCost, 0);
    const grossProfit = totalRevenue - totalCost;
    const billCount = completedSales.length;
    const avgTicket = billCount > 0 ? totalRevenue / billCount : 0;

    const byPayment = {
      cash: completedSales
        .filter((d) => d.paymentMethod === 'cash')
        .reduce((s, d) => s + d.grandTotal, 0),
      transfer: completedSales
        .filter((d) => d.paymentMethod === 'transfer')
        .reduce((s, d) => s + d.grandTotal, 0),
      card: completedSales
        .filter((d) => d.paymentMethod === 'card')
        .reduce((s, d) => s + d.grandTotal, 0),
    };

    const lowStockProducts = products.filter((p) => p.stock <= p.minStock);

    return {
      totalRevenue,
      totalCost,
      grossProfit,
      billCount,
      avgTicket,
      byPayment,
      lowStockProducts,
    };
  }, [completedSales, products]);

  // Hourly sales chart (8:00 - 20:00) for Today
  const hourlyBuckets = useMemo(() => {
    const todaySales = documents.filter(
      (d) => d.type !== 'QUOTATION' && d.status === 'COMPLETED' && isSameLocalDay(d.createdAt)
    );
    const hours = Array.from({ length: 13 }, (_, idx) => idx + 8); // 8..20
    const map = new Map<number, number>();
    hours.forEach((h) => map.set(h, 0));

    for (const sale of todaySales) {
      const h = new Date(sale.createdAt).getHours();
      const clamped = Math.min(20, Math.max(8, h));
      map.set(clamped, (map.get(clamped) || 0) + sale.grandTotal);
    }

    const entries = hours.map((h) => ({
      hour: `${String(h).padStart(2, '0')}:00`,
      amount: map.get(h) || 0,
    }));
    const maxVal = Math.max(500, ...entries.map((e) => e.amount));
    return { entries, maxVal };
  }, [documents]);

  // Category Revenue Breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<CategoryKey, { revenue: number; qty: number }>();
    CATEGORY_LIST.forEach((c) => map.set(c.key, { revenue: 0, qty: 0 }));

    for (const sale of completedSales) {
      for (const item of sale.items) {
        const prod = item.productId ? products.find((p) => p.id === item.productId) : undefined;
        const catKey: CategoryKey = prod?.category || 'general';
        const cur = map.get(catKey) || { revenue: 0, qty: 0 };
        cur.revenue += item.lineTotal;
        cur.qty += item.qty;
        map.set(catKey, cur);
      }
    }

    const total = Array.from(map.values()).reduce((s, v) => s + v.revenue, 0);
    return CATEGORY_LIST.map((c) => {
      const stat = map.get(c.key) || { revenue: 0, qty: 0 };
      return {
        ...c,
        revenue: stat.revenue,
        qty: stat.qty,
        percent: total > 0 ? Math.round((stat.revenue / total) * 100) : 0,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [completedSales, products]);

  // Top Selling Products
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number; unit: string }>();
    for (const sale of completedSales) {
      for (const item of sale.items) {
        const key = item.productId || item.name;
        const cur = map.get(key) || {
          name: item.name,
          qty: 0,
          revenue: 0,
          unit: item.unit,
        };
        cur.qty += item.qty;
        cur.revenue += item.lineTotal;
        map.set(key, cur);
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [completedSales]);

  const handleExportSalesCsv = () => {
    exportCsvWithBom(
      `smart-center-sales-${period}-${new Date().toISOString().slice(0, 10)}.csv`,
      ['เลขที่เอกสาร', 'ประเภท', 'วัน-เวลา', 'ลูกค้า', 'วิธีชำระ', 'ยอดสุทธิ', 'ต้นทุน', 'กำไรขั้นต้น'],
      completedSales.map((d) => [
        d.docNumber,
        getDocumentTitleThai(d.type),
        formatThaiDateTime(d.createdAt),
        d.customer.name,
        d.paymentMethod || '-',
        d.grandTotal,
        d.totalCost,
        Number((d.grandTotal - d.totalCost).toFixed(2)),
      ])
    );
  };

  return (
    <div className="space-y-5 pb-24 lg:pb-6">
      {/* Store Overview Banner + Period Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-blue-600">
              รายงานยอดขายรายวันแบบเรียลไทม์ · {formatThaiDate(new Date().toISOString())}
            </div>
            <div className="flex items-center gap-3.5">
              {settings.logoUrl && (
                <img
                  src={settings.logoUrl}
                  alt={settings.storeName}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-contain border border-slate-200 bg-white p-1 shrink-0"
                />
              )}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
                {settings.storeName}
              </h1>
            </div>
            <p className="text-sm text-slate-600 max-w-xl leading-relaxed">
              {settings.tagline}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              {[
                { key: 'today', label: 'วันนี้ (เรียลไทม์)' },
                { key: '7days', label: '7 วันล่าสุด' },
                { key: 'month', label: 'เดือนนี้' },
                { key: 'all', label: 'ทั้งหมด' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setPeriod(tab.key as PeriodFilter)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    period === tab.key
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportSalesCsv}
              className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              ส่งออกรายงาน CSV
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 relative min-h-[180px] bg-slate-100">
          <img
            src="/src/assets/images/store_stationery_banner_1794990450720.jpg"
            alt="บรรยากาศร้านจำหน่ายอุปกรณ์การเรียนและอุปกรณ์สำนักงาน Smart Center"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent flex items-end p-5">
            <div className="text-white">
              <div className="text-xs text-slate-200">{settings.branchName}</div>
              <div className="text-sm font-bold mt-0.5">
                สินค้าพร้อมขาย {products.length} รายการ · อัปเดตยอดขายอัตโนมัติ
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>ยอดขายรวม ({period === 'today' ? 'วันนี้' : 'ช่วงที่เลือก'})</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono-num text-blue-600 mt-1.5">
            {formatBaht(metrics.totalRevenue)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            รวมภาษีมูลค่าเพิ่มแล้ว
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>กำไรขั้นต้นโดยประมาณ</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono-num text-emerald-600 mt-1.5">
            {formatBaht(metrics.grossProfit)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            ต้นทุนสินค้า {formatBaht(metrics.totalCost)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>จำนวนบิลที่ขายสำเร็จ</span>
            <Receipt className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono-num text-slate-900 mt-1.5">
            {formatNumber(metrics.billCount)} <span className="text-sm font-medium text-slate-500">บิล</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            เฉลี่ย {formatBaht(metrics.avgTicket)} / บิล
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('inventory')}
          className="bg-white hover:border-amber-300 border border-slate-200 rounded-2xl p-4 sm:p-5 text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>สินค้าใกล้หมดสต็อก</span>
            <AlertTriangle
              className={`w-4 h-4 ${
                metrics.lowStockProducts.length > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            />
          </div>
          <div
            className={`text-2xl sm:text-3xl font-extrabold font-mono-num mt-1.5 ${
              metrics.lowStockProducts.length > 0 ? 'text-amber-600' : 'text-emerald-600'
            }`}
          >
            {metrics.lowStockProducts.length}{' '}
            <span className="text-sm font-medium text-slate-500">รายการ</span>
          </div>
          <div className="text-xs text-blue-600 font-semibold mt-1">
            แตะเพื่อจัดการเติมสต็อก
          </div>
        </button>
      </div>

      {/* Charts & Breakdown Row */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Hourly Sales Chart */}
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">
                กราฟยอดขายรายชั่วโมงวันนี้ (เรียลไทม์)
              </h2>
            </div>
            <span className="text-xs text-slate-500">08:00 – 20:00 น.</span>
          </div>

          <div className="h-56 flex items-end gap-2 pt-6 pb-2 border-b border-slate-200">
            {hourlyBuckets.entries.map((b) => {
              const heightPct = Math.max(4, Math.round((b.amount / hourlyBuckets.maxVal) * 100));
              const hasValue = b.amount > 0;
              return (
                <div key={b.hour} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div className="text-[10px] font-mono-num font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {hasValue ? formatBaht(b.amount, false) : ''}
                  </div>
                  <div
                    className={`w-full max-w-[34px] rounded-t-lg transition-all ${
                      hasValue
                        ? 'bg-blue-600 group-hover:bg-blue-700'
                        : 'bg-slate-100'
                    }`}
                    style={{ height: `${hasValue ? heightPct : 6}%` }}
                    title={`${b.hour}: ${formatBaht(b.amount)}`}
                  />
                  <span className="text-[10px] font-mono-num text-slate-500">{b.hour.slice(0, 2)}</span>
                </div>
              );
            })}
          </div>

          {/* Payment Methods Strip */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-[11px] font-semibold text-emerald-800">เงินสด</div>
              <div className="text-sm sm:text-base font-extrabold font-mono-num text-emerald-900 mt-0.5">
                {formatBaht(metrics.byPayment.cash)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
              <div className="text-[11px] font-semibold text-blue-800">โอนเงิน / QR</div>
              <div className="text-sm sm:text-base font-extrabold font-mono-num text-blue-900 mt-0.5">
                {formatBaht(metrics.byPayment.transfer)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
              <div className="text-[11px] font-semibold text-indigo-800">บัตรเครดิต</div>
              <div className="text-sm sm:text-base font-extrabold font-mono-num text-indigo-900 mt-0.5">
                {formatBaht(metrics.byPayment.card)}
              </div>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-bold text-slate-900">สัดส่วนยอดขายตามหมวดหมู่สินค้า</h2>
          <div className="space-y-3.5">
            {categoryBreakdown.map((cat) => (
              <div key={cat.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{cat.label}</span>
                  <span className="font-mono-num font-bold text-slate-900">
                    {formatBaht(cat.revenue)}{' '}
                    <span className="text-slate-400 font-normal">({cat.percent}%)</span>
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(cat.percent > 0 ? 4 : 0, cat.percent)}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 mb-2.5">สินค้าขายดีสูงสุด</h3>
            {topProducts.length === 0 ? (
              <div className="text-xs text-slate-500">ยังไม่มีรายการขายในช่วงเวลานี้</div>
            ) : (
              <div className="space-y-2">
                {topProducts.map((tp, idx) => (
                  <div
                    key={tp.name}
                    className="flex items-center justify-between gap-2 text-xs py-1"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-mono-num font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="truncate font-medium text-slate-800">{tp.name}</span>
                    </div>
                    <div className="shrink-0 font-mono-num text-right">
                      <span className="font-bold text-slate-900">{formatBaht(tp.revenue)}</span>
                      <span className="text-slate-400 ml-1.5">
                        ({tp.qty} {tp.unit})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sales Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">รายการขายล่าสุด ({completedSales.length} บิล)</h2>
          <button
            type="button"
            onClick={() => onNavigateTab('documents')}
            className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
          >
            ดูเอกสารทั้งหมด
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4 text-left">เลขที่บิล</th>
                <th className="py-3 px-4 text-left">วัน-เวลา</th>
                <th className="py-3 px-4 text-left">ลูกค้า</th>
                <th className="py-3 px-4 text-left">ช่องทางชำระ</th>
                <th className="py-3 px-4 text-right">ยอดขายสุทธิ</th>
                <th className="py-3 px-4 text-right">พิมพ์ซ้ำ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {completedSales.slice(0, 15).map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono-num font-bold text-slate-900">
                    {sale.docNumber}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500 font-mono-num whitespace-nowrap">
                    {formatThaiDateTime(sale.createdAt)}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">{sale.customer.name}</td>
                  <td className="py-3 px-4 text-xs text-slate-600">
                    {sale.paymentMethod === 'cash'
                      ? 'เงินสด'
                      : sale.paymentMethod === 'transfer'
                      ? 'โอนเงิน / QR'
                      : 'บัตรเครดิต'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-num font-bold text-slate-900">
                    {formatBaht(sale.grandTotal)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onPrintDocument(sale)}
                      className="min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      พิมพ์
                    </button>
                  </td>
                </tr>
              ))}
              {completedSales.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-slate-500">
                    ยังไม่มีรายการขายในช่วงเวลานี้ — เริ่มขายหน้าร้านได้ที่เมนู "ขายหน้าร้าน (POS)"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
