import React, { useMemo, useState } from 'react';
import {
  Calculator,
  Banknote,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  QrCode,
  CreditCard,
  Delete,
} from 'lucide-react';
import type { CashAdjustment, CashSession, StoreDocument } from '../types';
import { formatBaht, formatThaiDateTime, isSameLocalDay } from '../utils/format';

interface CashCalculatorProps {
  documents: StoreDocument[];
  cashSessions: CashSession[];
  onSaveCashSession: (
    payload: Omit<CashSession, 'id' | 'createdAt'>
  ) => Promise<CashSession | null>;
}

const DENOMINATIONS = [
  { key: '1000', label: 'ธนบัตร ฿1,000', value: 1000, color: 'bg-amber-50 border-amber-200 text-amber-900' },
  { key: '500', label: 'ธนบัตร ฿500', value: 500, color: 'bg-purple-50 border-purple-200 text-purple-900' },
  { key: '100', label: 'ธนบัตร ฿100', value: 100, color: 'bg-rose-50 border-rose-200 text-rose-900' },
  { key: '50', label: 'ธนบัตร ฿50', value: 50, color: 'bg-sky-50 border-sky-200 text-sky-900' },
  { key: '20', label: 'ธนบัตร ฿20', value: 20, color: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
  { key: '10', label: 'เหรียญ ฿10', value: 10, color: 'bg-slate-50 border-slate-200 text-slate-900' },
  { key: '5', label: 'เหรียญ ฿5', value: 5, color: 'bg-slate-50 border-slate-200 text-slate-900' },
  { key: '2', label: 'เหรียญ ฿2', value: 2, color: 'bg-slate-50 border-slate-200 text-slate-900' },
  { key: '1', label: 'เหรียญ ฿1', value: 1, color: 'bg-slate-50 border-slate-200 text-slate-900' },
  { key: '0.5', label: 'เหรียญ 50 สต.', value: 0.5, color: 'bg-slate-50 border-slate-200 text-slate-900' },
  { key: '0.25', label: 'เหรียญ 25 สต.', value: 0.25, color: 'bg-slate-50 border-slate-200 text-slate-900' },
];

export const CashCalculator: React.FC<CashCalculatorProps> = ({
  documents,
  cashSessions,
  onSaveCashSession,
}) => {
  // System sales today
  const todayStats = useMemo(() => {
    const todaySales = documents.filter(
      (d) => d.type !== 'QUOTATION' && d.status === 'COMPLETED' && isSameLocalDay(d.createdAt)
    );
    const cashSales = todaySales
      .filter((d) => d.paymentMethod === 'cash')
      .reduce((s, d) => s + d.grandTotal, 0);
    const transferSales = todaySales
      .filter((d) => d.paymentMethod === 'transfer')
      .reduce((s, d) => s + d.grandTotal, 0);
    const cardSales = todaySales
      .filter((d) => d.paymentMethod === 'card')
      .reduce((s, d) => s + d.grandTotal, 0);

    return {
      cashSales,
      transferSales,
      cardSales,
      totalSales: cashSales + transferSales + cardSales,
      billCount: todaySales.length,
    };
  }, [documents]);

  const [cashierName, setCashierName] = useState('แคชเชียร์หน้าร้าน');
  const [openingFloat, setOpeningFloat] = useState<number>(2000);
  const [counts, setCounts] = useState<Record<string, number>>({
    '1000': 0,
    '500': 0,
    '100': 0,
    '50': 0,
    '20': 0,
    '10': 0,
    '5': 0,
    '2': 0,
    '1': 0,
    '0.5': 0,
    '0.25': 0,
  });

  const [manualTransfer, setManualTransfer] = useState<string>('');
  const [manualCard, setManualCard] = useState<string>('');
  const [adjustments, setAdjustments] = useState<CashAdjustment[]>([]);
  const [adjType, setAdjType] = useState<'IN' | 'OUT'>('OUT');
  const [adjLabel, setAdjLabel] = useState('');
  const [adjAmount, setAdjAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  // Quick Desk Calculator Pad State
  const [calcExpr, setCalcExpr] = useState('0');
  const [calcResult, setCalcResult] = useState<string>('');

  const countedCash = useMemo(() => {
    return DENOMINATIONS.reduce((sum, d) => sum + (counts[d.key] || 0) * d.value, 0);
  }, [counts]);

  const totalAdjIn = adjustments
    .filter((a) => a.type === 'IN')
    .reduce((s, a) => s + a.amount, 0);
  const totalAdjOut = adjustments
    .filter((a) => a.type === 'OUT')
    .reduce((s, a) => s + a.amount, 0);

  const expectedCashInDrawer = openingFloat + todayStats.cashSales + totalAdjIn - totalAdjOut;
  const variance = countedCash - expectedCashInDrawer;

  const effectiveTransfer =
    manualTransfer !== '' ? Number(manualTransfer) || 0 : todayStats.transferSales;
  const effectiveCard = manualCard !== '' ? Number(manualCard) || 0 : todayStats.cardSales;
  const grandStoreTotal = countedCash + effectiveTransfer + effectiveCard;

  const updateCount = (key: string, delta: number) => {
    setCounts((prev) => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || 0) + delta),
    }));
  };

  const addAdjustment = () => {
    const amt = Number(adjAmount) || 0;
    if (!adjLabel.trim() || amt <= 0) return;
    setAdjustments((prev) => [
      ...prev,
      { id: `adj-${Date.now()}`, type: adjType, label: adjLabel.trim(), amount: amt },
    ]);
    setAdjLabel('');
    setAdjAmount('');
  };

  const handleSaveSession = async () => {
    setSaving(true);
    const saved = await onSaveCashSession({
      cashierName: cashierName.trim() || 'แคชเชียร์หน้าร้าน',
      openingFloat,
      denominations: counts,
      countedCash,
      transferTotal: effectiveTransfer,
      cardTotal: effectiveCard,
      adjustments,
      expectedCashInDrawer,
      variance,
      grandStoreTotal,
      note,
    });
    setSaving(false);
    if (saved) {
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3500);
    }
  };

  // Safe arithmetic evaluator for the quick desk calculator
  const handleCalcButton = (val: string) => {
    if (val === 'C') {
      setCalcExpr('0');
      setCalcResult('');
      return;
    }
    if (val === 'DEL') {
      setCalcExpr((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
      return;
    }
    if (val === '=') {
      try {
        const sanitized = calcExpr.replace(/[^0-9+\-*/.()]/g, '');
        if (!sanitized) return;
        const result = Function(`"use strict"; return (${sanitized})`)();
        if (typeof result === 'number' && Number.isFinite(result)) {
          const rounded = Number(result.toFixed(2));
          setCalcResult(formatBaht(rounded));
          setCalcExpr(String(rounded));
        }
      } catch {
        setCalcResult('รูปแบบไม่ถูกต้อง');
      }
      return;
    }
    setCalcExpr((prev) => (prev === '0' && /[0-9]/.test(val) ? val : prev + val));
  };

  return (
    <div className="space-y-5 pb-24 lg:pb-6">
      {/* Top Grand Store Money Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5">
          <div className="text-xs text-slate-300">จำนวนเงินรวมทั้งหมดของร้านค้า</div>
          <div className="text-3xl font-extrabold font-mono-num text-emerald-400 mt-1">
            {formatBaht(grandStoreTotal)}
          </div>
          <div className="text-xs text-slate-400 mt-1.5">
            เงินสดนับจริง + ยอดโอน/QR + บัตรเครดิต
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <div className="text-xs font-medium text-slate-500">เงินสดนับได้ในลิ้นชัก</div>
          <div className="text-2xl font-extrabold font-mono-num text-slate-900 mt-1">
            {formatBaht(countedCash)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            ควรมีในลิ้นชัก: <span className="font-mono-num font-semibold">{formatBaht(expectedCashInDrawer)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <div className="text-xs font-medium text-slate-500">ยอดขายในระบบวันนี้ ({todayStats.billCount} บิล)</div>
          <div className="text-2xl font-extrabold font-mono-num text-blue-600 mt-1">
            {formatBaht(todayStats.totalSales)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            เงินสด {formatBaht(todayStats.cashSales)} · โอน {formatBaht(todayStats.transferSales)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
          <div className="text-xs font-medium text-slate-500">ส่วนต่างเงินสด (เกิน / ขาด)</div>
          <div
            className={`text-2xl font-extrabold font-mono-num mt-1 ${
              variance === 0
                ? 'text-emerald-600'
                : variance > 0
                ? 'text-blue-600'
                : 'text-rose-600'
            }`}
          >
            {variance >= 0 ? `+${formatBaht(variance)}` : formatBaht(variance)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            {variance === 0
              ? 'ยอดเงินสดตรงกับระบบพอดี'
              : variance > 0
              ? 'เงินสดในลิ้นชักเกินจากระบบ'
              : 'เงินสดในลิ้นชักขาดจากระบบ'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left: Thai Baht Denomination Counter */}
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">นับธนบัตรและเหรียญในลิ้นชัก</h2>
                <p className="text-xs text-slate-500">แตะปุ่ม + / - หรือกรอกจำนวนฉบับ/เหรียญเพื่อคำนวณอัตโนมัติ</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setCounts({
                  '1000': 0,
                  '500': 0,
                  '100': 0,
                  '50': 0,
                  '20': 0,
                  '10': 0,
                  '5': 0,
                  '2': 0,
                  '1': 0,
                  '0.5': 0,
                  '0.25': 0,
                })
              }
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              รีเซ็ตตัวเลข
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {DENOMINATIONS.map((d) => {
              const qty = counts[d.key] || 0;
              const subtotal = qty * d.value;
              return (
                <div
                  key={d.key}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${d.color}`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold">{d.label}</div>
                    <div className="text-xs font-mono-num opacity-80">
                      = {formatBaht(subtotal)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateCount(d.key, -1)}
                      className="w-10 h-10 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-800 cursor-pointer"
                      aria-label={`ลด ${d.label}`}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={qty}
                      onChange={(e) =>
                        setCounts((prev) => ({
                          ...prev,
                          [d.key]: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                        }))
                      }
                      className="w-14 h-10 rounded-lg border border-slate-200 bg-white text-center font-mono-num text-sm font-bold text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => updateCount(d.key, 1)}
                      className="w-10 h-10 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-800 cursor-pointer"
                      aria-label={`เพิ่ม ${d.label}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Store Total Reconciliation & Quick Calculator */}
        <div className="xl:col-span-5 space-y-5">
          {/* Reconciliation & Save Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900">สรุปยอดเงินร้านค้า & ปิดกะ</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">ชื่อผู้ตรวจนับ / แคชเชียร์</label>
                <input
                  type="text"
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">เงินทอนตั้งต้นเปิดร้าน (บาท)</label>
                <input
                  type="number"
                  min={0}
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono-num font-bold"
                />
              </div>
              <div>
                <label className="flex items-center gap-1 font-semibold text-slate-600 mb-1">
                  <QrCode className="w-3.5 h-3.5 text-blue-600" />
                  ยอดโอนเข้าบัญชี / QR (ระบบ: {formatBaht(todayStats.transferSales)})
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder={String(todayStats.transferSales)}
                  value={manualTransfer}
                  onChange={(e) => setManualTransfer(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono-num"
                />
              </div>
              <div>
                <label className="flex items-center gap-1 font-semibold text-slate-600 mb-1">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                  ยอดบัตรเครดิต (ระบบ: {formatBaht(todayStats.cardSales)})
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder={String(todayStats.cardSales)}
                  value={manualCard}
                  onChange={(e) => setManualCard(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono-num"
                />
              </div>
            </div>

            {/* Petty Cash Adjustments */}
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <div className="text-xs font-bold text-slate-700">
                รายรับ-รายจ่ายเงินสดย่อยหน้าร้าน (เช่น ค่าขนส่ง, ซื้ออุปกรณ์แพ็คของ)
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <select
                  value={adjType}
                  onChange={(e) => setAdjType(e.target.value as 'IN' | 'OUT')}
                  className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
                >
                  <option value="OUT">จ่ายออก (-)</option>
                  <option value="IN">รับเข้า (+)</option>
                </select>
                <input
                  type="text"
                  placeholder="รายการ..."
                  value={adjLabel}
                  onChange={(e) => setAdjLabel(e.target.value)}
                  className="flex-1 min-w-[120px] px-3 py-2 rounded-xl border border-slate-200"
                />
                <input
                  type="number"
                  placeholder="บาท"
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  className="w-24 px-3 py-2 rounded-xl border border-slate-200 font-mono-num"
                />
                <button
                  type="button"
                  onClick={addAdjustment}
                  className="min-h-[38px] px-3.5 py-2 rounded-xl bg-slate-900 text-white font-semibold cursor-pointer"
                >
                  เพิ่ม
                </button>
              </div>

              {adjustments.length > 0 && (
                <div className="space-y-1.5">
                  {adjustments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    >
                      <span>
                        <span
                          className={`font-bold mr-1.5 ${
                            a.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {a.type === 'IN' ? '[รับ+]' : '[จ่าย-]'}
                        </span>
                        {a.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-num font-bold">{formatBaht(a.amount)}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setAdjustments((prev) => prev.filter((x) => x.id !== a.id))
                          }
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <input
              type="text"
              placeholder="หมายเหตุการตรวจนับเงินประจำวัน..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
            />

            <button
              type="button"
              disabled={saving}
              onClick={handleSaveSession}
              className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" />
              {saving ? 'กำลังบันทึก...' : 'บันทึกยอดเงินรวมประจำวัน'}
            </button>

            {savedToast && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold text-center">
                บันทึกยอดเงินรวมของร้าน Smart Center เรียบร้อยแล้ว
              </div>
            )}
          </div>

          {/* Touch Desk Calculator */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Calculator className="w-4 h-4 text-blue-600" />
              เครื่องคิดเลขช่วยคำนวณหน้าร้าน
            </div>
            <div className="bg-slate-900 text-white rounded-xl p-3.5 text-right">
              <div className="text-xs text-slate-400 min-h-[16px] font-mono-num">
                {calcResult ? `ผลลัพธ์: ${calcResult}` : 'คำนวณยอดรวม / ส่วนลด'}
              </div>
              <div className="text-2xl font-bold font-mono-num truncate mt-0.5">{calcExpr}</div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                'C', '(', ')', '/',
                '7', '8', '9', '*',
                '4', '5', '6', '-',
                '1', '2', '3', '+',
                '0', '.', 'DEL', '=',
              ].map((btn) => {
                const isOp = ['/', '*', '-', '+', '='].includes(btn);
                const isClear = btn === 'C';
                return (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => handleCalcButton(btn)}
                    className={`min-h-[46px] rounded-xl font-mono-num text-base font-bold flex items-center justify-center active:scale-95 transition-transform cursor-pointer ${
                      btn === '='
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : isOp
                        ? 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                        : isClear
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                    }`}
                  >
                    {btn === 'DEL' ? <Delete className="w-5 h-5" /> : btn}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Saved Cash Close History */}
      {cashSessions.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 text-sm font-bold text-slate-900">
            ประวัติการบันทึกยอดเงินรวมของร้าน ({cashSessions.length} ครั้ง)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 text-left">วัน-เวลา</th>
                  <th className="py-3 px-4 text-left">ผู้ตรวจนับ</th>
                  <th className="py-3 px-4 text-right">เงินสดนับได้</th>
                  <th className="py-3 px-4 text-right">โอน + บัตร</th>
                  <th className="py-3 px-4 text-right">เงินรวมร้านค้า</th>
                  <th className="py-3 px-4 text-right">ผลต่าง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cashSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 text-xs font-mono-num text-slate-600">
                      {formatThaiDateTime(s.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {s.cashierName}
                      {s.note && <div className="text-[11px] font-normal text-slate-500">{s.note}</div>}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num">{formatBaht(s.countedCash)}</td>
                    <td className="py-3 px-4 text-right font-mono-num">
                      {formatBaht(s.transferTotal + s.cardTotal)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num font-bold text-blue-600">
                      {formatBaht(s.grandStoreTotal)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono-num font-bold ${
                        s.variance === 0
                          ? 'text-emerald-600'
                          : s.variance > 0
                          ? 'text-blue-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {s.variance >= 0 ? `+${formatBaht(s.variance)}` : formatBaht(s.variance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
