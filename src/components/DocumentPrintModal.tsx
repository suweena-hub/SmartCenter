import React, { useState } from 'react';
import { Printer, X, FileText, Copy, Files, Receipt } from 'lucide-react';
import type { DocumentCopyMode, StoreDocument, StoreSettings } from '../types';
import {
  calculateTotals,
  formatBaht,
  formatThaiDate,
  formatThaiTime,
  getDocumentTitleEnglish,
  getDocumentTitleThai,
  numberToThaiBahtText,
} from '../utils/format';

interface DocumentPrintModalProps {
  doc: StoreDocument | null;
  settings: StoreSettings;
  onClose: () => void;
}

const SingleA4Document: React.FC<{
  doc: StoreDocument;
  settings: StoreSettings;
  copyLabel?: 'ORIGINAL' | 'COPY';
}> = ({ doc, settings, copyLabel }) => {
  const { preVatAmount, vatAmount, grandTotal } = calculateTotals(
    doc.subtotal,
    doc.discountAmount,
    doc.vatMode
  );

  const isOriginal = copyLabel !== 'COPY';
  const accentBorder =
    doc.type === 'QUOTATION'
      ? 'border-indigo-700'
      : isOriginal
      ? 'border-blue-700'
      : 'border-amber-700';
  const accentText =
    doc.type === 'QUOTATION'
      ? 'text-indigo-800'
      : isOriginal
      ? 'text-blue-800'
      : 'text-amber-800';
  const accentBg =
    doc.type === 'QUOTATION'
      ? 'bg-indigo-50'
      : isOriginal
      ? 'bg-blue-50'
      : 'bg-amber-50';

  const paymentLabel =
    doc.paymentMethod === 'cash'
      ? 'เงินสด (Cash)'
      : doc.paymentMethod === 'transfer'
      ? 'โอนเงิน / PromptPay QR'
      : doc.paymentMethod === 'card'
      ? 'บัตรเครดิต / เดบิต'
      : '-';

  return (
    <div className="bg-white text-slate-900 p-6 sm:p-8 border border-slate-200 rounded-xl shadow-sm max-w-[820px] mx-auto print:border-none print:shadow-none print:rounded-none print:p-2 print-page-break">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-5 border-b-2 border-slate-800">
        <div className="flex items-start gap-3.5 max-w-lg">
          {settings.logoUrl && (
            <img
              src={settings.logoUrl}
              alt={settings.storeName}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-xl object-contain border border-slate-200 bg-white p-1 shrink-0"
            />
          )}
          <div className="space-y-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-display">
                {settings.storeName}
              </h2>
              <span className="text-xs font-medium text-slate-500">{settings.branchName}</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{settings.address}</p>
            <p className="text-xs text-slate-700">
              เลขประจำตัวผู้เสียภาษี:{' '}
              <span className="font-mono-num font-semibold">{settings.taxId || '-'}</span>
              <span className="mx-2 text-slate-300">|</span>
              โทร: <span className="font-mono-num">{settings.phone || '-'}</span>
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right shrink-0 space-y-1.5">
          {copyLabel && (
            <div
              className={`inline-block px-3 py-1 border-2 ${accentBorder} ${accentBg} ${accentText} text-xs font-bold tracking-wide rounded`}
            >
              {copyLabel === 'ORIGINAL' ? 'ต้นฉบับ / ORIGINAL' : 'สำเนา / COPY'}
            </div>
          )}
          <div>
            <div className={`text-xl font-bold ${accentText}`}>
              {getDocumentTitleThai(doc.type)}
            </div>
            <div className="text-[11px] font-semibold tracking-wider text-slate-500">
              {getDocumentTitleEnglish(doc.type)}
            </div>
          </div>
        </div>
      </div>

      {/* Customer & Document Metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 py-4 border-b border-slate-200 text-xs">
        <div className="sm:col-span-7 space-y-1">
          <div className="font-semibold text-slate-500">ข้อมูลลูกค้า / ผู้ซื้อ (Customer)</div>
          <div className="text-sm font-bold text-slate-900">{doc.customer.name}</div>
          {doc.customer.taxId && (
            <div className="text-slate-700">
              เลขประจำตัวผู้เสียภาษี:{' '}
              <span className="font-mono-num font-medium">{doc.customer.taxId}</span>
              {doc.customer.branch ? ` (${doc.customer.branch})` : ''}
            </div>
          )}
          {doc.customer.address && (
            <div className="text-slate-600 leading-relaxed">{doc.customer.address}</div>
          )}
          {doc.customer.phone && (
            <div className="text-slate-600">โทร: {doc.customer.phone}</div>
          )}
        </div>

        <div className="sm:col-span-5 bg-slate-50 rounded-lg p-3 space-y-1.5 border border-slate-200">
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">เลขที่เอกสาร:</span>
            <span className="font-mono-num font-bold text-slate-900">{doc.docNumber}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">วันที่ออกเอกสาร:</span>
            <span className="font-medium text-slate-900">{formatThaiDate(doc.createdAt)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">เวลา:</span>
            <span className="font-mono-num text-slate-700">{formatThaiTime(doc.createdAt)}</span>
          </div>
          {doc.type === 'QUOTATION' && doc.validUntil && (
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">ยืนราคาถึงวันที่:</span>
              <span className="font-medium text-indigo-700">{formatThaiDate(doc.validUntil)}</span>
            </div>
          )}
          {doc.type !== 'QUOTATION' && (
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">การชำระเงิน:</span>
              <span className="font-medium text-slate-900">{paymentLabel}</span>
            </div>
          )}
        </div>
      </div>

      {/* Line Items Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="py-2.5 px-2.5 text-center w-10 font-semibold">ลำดับ</th>
              <th className="py-2.5 px-2.5 text-left w-24 font-semibold">รหัสสินค้า</th>
              <th className="py-2.5 px-2.5 text-left font-semibold">รายการสินค้า</th>
              <th className="py-2.5 px-2.5 text-right w-16 font-semibold">จำนวน</th>
              <th className="py-2.5 px-2.5 text-center w-16 font-semibold">หน่วย</th>
              <th className="py-2.5 px-2.5 text-right w-24 font-semibold">ราคา/หน่วย</th>
              <th className="py-2.5 px-2.5 text-right w-20 font-semibold">ส่วนลด</th>
              <th className="py-2.5 px-2.5 text-right w-28 font-semibold">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 border-b border-slate-300">
            {doc.items.map((item, idx) => (
              <tr key={`${item.sku}-${idx}`} className="hover:bg-slate-50/70">
                <td className="py-2.5 px-2.5 text-center font-mono-num text-slate-600">{idx + 1}</td>
                <td className="py-2.5 px-2.5 font-mono-num text-slate-600">{item.sku || '-'}</td>
                <td className="py-2.5 px-2.5 font-medium text-slate-900">{item.name}</td>
                <td className="py-2.5 px-2.5 text-right font-mono-num">{item.qty}</td>
                <td className="py-2.5 px-2.5 text-center text-slate-600">{item.unit}</td>
                <td className="py-2.5 px-2.5 text-right font-mono-num">
                  {formatBaht(item.unitPrice, false)}
                </td>
                <td className="py-2.5 px-2.5 text-right font-mono-num text-slate-600">
                  {item.discount > 0 ? formatBaht(item.discount, false) : '-'}
                </td>
                <td className="py-2.5 px-2.5 text-right font-mono-num font-semibold text-slate-900">
                  {formatBaht(item.lineTotal, false)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals & Baht Text */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
        <div className="sm:col-span-7 space-y-2.5">
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs">
            <span className="text-slate-500">จำนวนเงินตัวอักษร: </span>
            <span className="font-bold text-slate-900">({numberToThaiBahtText(grandTotal)})</span>
          </div>
          {doc.notes && (
            <div className="text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-700">หมายเหตุ: </span>
              {doc.notes}
            </div>
          )}
          <div className="text-[11px] text-slate-500 pt-1">{settings.receiptFooter}</div>
        </div>

        <div className="sm:col-span-5 border border-slate-200 rounded-lg overflow-hidden text-xs">
          <div className="flex justify-between px-3.5 py-2 border-b border-slate-100">
            <span className="text-slate-600">รวมเป็นเงิน (Subtotal)</span>
            <span className="font-mono-num font-medium">{formatBaht(doc.subtotal)}</span>
          </div>
          {doc.discountAmount > 0 && (
            <div className="flex justify-between px-3.5 py-2 border-b border-slate-100 text-rose-600">
              <span>ส่วนลดท้ายบิล (Discount)</span>
              <span className="font-mono-num">-{formatBaht(doc.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between px-3.5 py-2 border-b border-slate-100">
            <span className="text-slate-600">มูลค่าก่อนภาษีมูลค่าเพิ่ม</span>
            <span className="font-mono-num">{formatBaht(preVatAmount)}</span>
          </div>
          <div className="flex justify-between px-3.5 py-2 border-b border-slate-200">
            <span className="text-slate-600">
              ภาษีมูลค่าเพิ่ม 7% ({doc.vatMode === 'none' ? 'ยกเว้น/ไม่คิด VAT' : doc.vatMode === 'included' ? 'รวมในราคา' : 'แยกเพิ่ม'})
            </span>
            <span className="font-mono-num">{formatBaht(vatAmount)}</span>
          </div>
          <div className="flex justify-between px-3.5 py-2.5 bg-slate-900 text-white font-bold text-sm">
            <span>จำนวนเงินรวมทั้งสิ้น</span>
            <span className="font-mono-num">{formatBaht(grandTotal)}</span>
          </div>
          {doc.paymentMethod === 'cash' && doc.cashReceived !== undefined && (
            <div className="flex justify-between px-3.5 py-1.5 bg-slate-50 text-[11px] text-slate-600 border-t border-slate-200">
              <span>รับเงินสด: {formatBaht(doc.cashReceived)}</span>
              <span>เงินทอน: {formatBaht(doc.changeAmount || 0)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Signatures */}
      <div className="mt-10 pt-4 grid grid-cols-3 gap-6 text-center text-xs text-slate-700">
        {doc.type === 'TAX_INVOICE' ? (
          <>
            <div className="space-y-8">
              <div className="border-b border-dotted border-slate-400 mx-2 pt-4" />
              <div>
                <div className="font-semibold">ผู้รับสินค้า / ผู้ตรวจรับ</div>
                <div className="text-[11px] text-slate-400 mt-1">วันที่ ____ / ____ / ____</div>
              </div>
            </div>
            <div className="space-y-8">
              <div className="border-b border-dotted border-slate-400 mx-2 pt-4" />
              <div>
                <div className="font-semibold">ผู้ส่งสินค้า / พนักงานขาย</div>
                <div className="text-[11px] text-slate-400 mt-1">วันที่ ____ / ____ / ____</div>
              </div>
            </div>
            <div className="space-y-8">
              <div className="border-b border-dotted border-slate-400 mx-2 pt-4" />
              <div>
                <div className="font-semibold">ผู้มีอำนาจลงนาม ({settings.storeName})</div>
                <div className="text-[11px] text-slate-400 mt-1">วันที่ ____ / ____ / ____</div>
              </div>
            </div>
          </>
        ) : doc.type === 'QUOTATION' ? (
          <>
            <div className="space-y-8">
              <div className="border-b border-dotted border-slate-400 mx-2 pt-4" />
              <div>
                <div className="font-semibold">ผู้อนุมัติสั่งซื้อ (ลูกค้า)</div>
                <div className="text-[11px] text-slate-400 mt-1">วันที่ ____ / ____ / ____</div>
              </div>
            </div>
            <div className="space-y-8">
              <div className="border-b border-dotted border-slate-400 mx-2 pt-4" />
              <div>
                <div className="font-semibold">ผู้เสนอราคา</div>
                <div className="text-[11px] text-slate-400 mt-1">{formatThaiDate(doc.createdAt)}</div>
              </div>
            </div>
            <div className="space-y-8">
              <div className="border-b border-dotted border-slate-400 mx-2 pt-4" />
              <div>
                <div className="font-semibold">ผู้จัดการร้าน ({settings.storeName})</div>
                <div className="text-[11px] text-slate-400 mt-1">วันที่ ____ / ____ / ____</div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-8">
              <div className="border-b border-dotted border-slate-400 mx-2 pt-4" />
              <div>
                <div className="font-semibold">ผู้จ่ายเงิน / ลูกค้า</div>
                <div className="text-[11px] text-slate-400 mt-1">{formatThaiDate(doc.createdAt)}</div>
              </div>
            </div>
            <div />
            <div className="space-y-8">
              <div className="border-b border-dotted border-slate-400 mx-2 pt-4" />
              <div>
                <div className="font-semibold">ผู้รับเงิน ({settings.storeName})</div>
                <div className="text-[11px] text-slate-400 mt-1">{formatThaiDate(doc.createdAt)}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ThermalReceipt80mm: React.FC<{ doc: StoreDocument; settings: StoreSettings }> = ({
  doc,
  settings,
}) => {
  const { vatAmount, grandTotal } = calculateTotals(
    doc.subtotal,
    doc.discountAmount,
    doc.vatMode
  );

  return (
    <div className="bg-white text-slate-900 p-5 border border-slate-200 rounded-xl shadow-sm w-[340px] mx-auto font-mono-num text-xs thermal-print-width print:border-none print:shadow-none">
      <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-400">
        {settings.logoUrl && (
          <img
            src={settings.logoUrl}
            alt={settings.storeName}
            referrerPolicy="no-referrer"
            className="h-12 w-auto object-contain mx-auto mb-1"
          />
        )}
        <div className="text-base font-bold font-display">{settings.storeName}</div>
        <div className="text-[11px] text-slate-600">{settings.branchName}</div>
        <div className="text-[11px] text-slate-600 leading-snug">{settings.address}</div>
        <div className="text-[11px] text-slate-600">โทร. {settings.phone}</div>
        <div className="text-[11px] text-slate-600">TAX ID: {settings.taxId}</div>
      </div>

      <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
        <div className="text-center font-bold text-xs">ใบเสร็จรับเงินอย่างย่อ</div>
        <div className="flex justify-between">
          <span>เลขที่: {doc.docNumber}</span>
          <span>{formatThaiTime(doc.createdAt)}</span>
        </div>
        <div>ลูกค้า: {doc.customer.name}</div>
      </div>

      <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1.5">
        {doc.items.map((it, idx) => (
          <div key={idx} className="space-y-0.5">
            <div className="font-medium text-slate-900">{it.name}</div>
            <div className="flex justify-between text-[11px] text-slate-600 pl-2">
              <span>
                {it.qty} {it.unit} x {formatBaht(it.unitPrice, false)}
              </span>
              <span className="font-semibold text-slate-900">{formatBaht(it.lineTotal, false)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="py-2.5 space-y-1 text-[11px] border-b border-dashed border-slate-400">
        <div className="flex justify-between">
          <span>รวมสินค้า</span>
          <span>{formatBaht(doc.subtotal)}</span>
        </div>
        {doc.discountAmount > 0 && (
          <div className="flex justify-between text-rose-600">
            <span>ส่วนลด</span>
            <span>-{formatBaht(doc.discountAmount)}</span>
          </div>
        )}
        {doc.vatMode !== 'none' && (
          <div className="flex justify-between text-slate-600">
            <span>VAT 7%</span>
            <span>{formatBaht(vatAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-200">
          <span>ยอดสุทธิ</span>
          <span>{formatBaht(grandTotal)}</span>
        </div>
        {doc.paymentMethod === 'cash' && doc.cashReceived !== undefined && (
          <>
            <div className="flex justify-between text-slate-600">
              <span>รับเงินสด</span>
              <span>{formatBaht(doc.cashReceived)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>เงินทอน</span>
              <span>{formatBaht(doc.changeAmount || 0)}</span>
            </div>
          </>
        )}
      </div>

      <div className="pt-3 text-center text-[11px] text-slate-600 space-y-1">
        <div>{settings.receiptFooter}</div>
        <div className="text-[10px] text-slate-400">ขอบคุณที่ใช้บริการ Smart Center</div>
      </div>
    </div>
  );
};

export const DocumentPrintModal: React.FC<DocumentPrintModalProps> = ({
  doc,
  settings,
  onClose,
}) => {
  const [copyMode, setCopyMode] = useState<DocumentCopyMode>('BOTH');
  const [receiptLayout, setReceiptLayout] = useState<'A4' | 'THERMAL'>('A4');

  if (!doc) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`พิมพ์เอกสาร ${doc.docNumber}`}
    >
      {/* Top Action Toolbar */}
      <div className="no-print bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm sm:text-base font-bold text-slate-900">
              {getDocumentTitleThai(doc.type)} · <span className="font-mono-num">{doc.docNumber}</span>
            </div>
            <div className="text-xs text-slate-500">
              {doc.customer.name} · ยอดสุทธิ {formatBaht(doc.grandTotal)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {doc.type === 'TAX_INVOICE' && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setCopyMode('ORIGINAL')}
                className={`min-h-[40px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  copyMode === 'ORIGINAL'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                ต้นฉบับเท่านั้น
              </button>
              <button
                type="button"
                onClick={() => setCopyMode('COPY')}
                className={`min-h-[40px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  copyMode === 'COPY'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Copy className="w-3.5 h-3.5" />
                สำเนาเท่านั้น
              </button>
              <button
                type="button"
                onClick={() => setCopyMode('BOTH')}
                className={`min-h-[40px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  copyMode === 'BOTH'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Files className="w-3.5 h-3.5" />
                พิมพ์ทั้งต้นฉบับ + สำเนา
              </button>
            </div>
          )}

          {doc.type === 'RECEIPT' && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setReceiptLayout('A4')}
                className={`min-h-[40px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  receiptLayout === 'A4'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                ฟอร์ม A4
              </button>
              <button
                type="button"
                onClick={() => setReceiptLayout('THERMAL')}
                className={`min-h-[40px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  receiptLayout === 'THERMAL'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                สลิป 80 มม.
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="min-h-[44px] px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            พิมพ์เอกสาร
          </button>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl flex items-center justify-center transition-colors cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable Preview Canvas */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/90 custom-scrollbar">
        <div id="printable-document-area" className="space-y-8">
          {doc.type === 'TAX_INVOICE' ? (
            <>
              {(copyMode === 'ORIGINAL' || copyMode === 'BOTH') && (
                <SingleA4Document doc={doc} settings={settings} copyLabel="ORIGINAL" />
              )}
              {(copyMode === 'COPY' || copyMode === 'BOTH') && (
                <SingleA4Document doc={doc} settings={settings} copyLabel="COPY" />
              )}
            </>
          ) : doc.type === 'RECEIPT' && receiptLayout === 'THERMAL' ? (
            <ThermalReceipt80mm doc={doc} settings={settings} />
          ) : (
            <SingleA4Document
              doc={doc}
              settings={settings}
              copyLabel={doc.type === 'QUOTATION' ? undefined : 'ORIGINAL'}
            />
          )}
        </div>
      </div>
    </div>
  );
};
