import type { CategoryKey, CategoryMeta, DocumentType, VatMode } from '../types';

export const CATEGORY_LIST: CategoryMeta[] = [
  {
    key: 'school',
    label: 'อุปกรณ์การเรียน',
    color: '#0284C7',
    bgSoft: 'bg-sky-50',
    textColor: 'text-sky-700',
    borderColor: 'border-sky-200',
    image: '/src/assets/images/cat_school_supplies_1794990450859.jpg',
  },
  {
    key: 'office',
    label: 'อุปกรณ์สำนักงาน',
    color: '#2563EB',
    bgSoft: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    image: '/src/assets/images/cat_office_equipment_1794990451315.jpg',
  },
  {
    key: 'paper',
    label: 'กระดาษและแฟ้ม',
    color: '#D97706',
    bgSoft: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    image: '/src/assets/images/cat_office_equipment_1794990451315.jpg',
  },
  {
    key: 'writing',
    label: 'เครื่องเขียนและศิลปะ',
    color: '#E11D48',
    bgSoft: 'bg-rose-50',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-200',
    image: '/src/assets/images/cat_school_supplies_1794990450859.jpg',
  },
  {
    key: 'general',
    label: 'สินค้าเบ็ดเตล็ด',
    color: '#059669',
    bgSoft: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    image: '/src/assets/images/cat_general_goods_1794990450380.jpg',
  },
];

export function getCategoryMeta(key: CategoryKey): CategoryMeta {
  return CATEGORY_LIST.find((c) => c.key === key) || CATEGORY_LIST[4];
}

export function formatBaht(amount: number, showSymbol = true): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const formatted = safe.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return showSymbol ? `฿${formatted}` : formatted;
}

export function formatNumber(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return safe.toLocaleString('th-TH');
}

export function formatThaiDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatThaiShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('th-TH', {
    year: '2-digit',
    month: 'short',
    day: 'numeric',
  });
}

export function formatThaiTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  })} น.`;
}

export function formatThaiDateTime(iso: string): string {
  return `${formatThaiShortDate(iso)} ${formatThaiTime(iso)}`;
}

export function isSameLocalDay(isoA: string, dateB: Date = new Date()): boolean {
  const a = new Date(isoA);
  return (
    a.getFullYear() === dateB.getFullYear() &&
    a.getMonth() === dateB.getMonth() &&
    a.getDate() === dateB.getDate()
  );
}

export function calculateTotals(
  rawSubtotal: number,
  discountAmount: number,
  vatMode: VatMode
): {
  subtotal: number;
  afterDiscount: number;
  preVatAmount: number;
  vatAmount: number;
  grandTotal: number;
} {
  const subtotal = Math.max(0, Number(rawSubtotal.toFixed(2)));
  const discount = Math.min(subtotal, Math.max(0, Number(discountAmount.toFixed(2))));
  const afterDiscount = Number((subtotal - discount).toFixed(2));

  if (vatMode === 'included') {
    const preVatAmount = Number((afterDiscount / 1.07).toFixed(2));
    const vatAmount = Number((afterDiscount - preVatAmount).toFixed(2));
    return {
      subtotal,
      afterDiscount,
      preVatAmount,
      vatAmount,
      grandTotal: afterDiscount,
    };
  }

  if (vatMode === 'excluded') {
    const vatAmount = Number((afterDiscount * 0.07).toFixed(2));
    const grandTotal = Number((afterDiscount + vatAmount).toFixed(2));
    return {
      subtotal,
      afterDiscount,
      preVatAmount: afterDiscount,
      vatAmount,
      grandTotal,
    };
  }

  return {
    subtotal,
    afterDiscount,
    preVatAmount: afterDiscount,
    vatAmount: 0,
    grandTotal: afterDiscount,
  };
}

export function getDocumentTitleThai(type: DocumentType): string {
  switch (type) {
    case 'QUOTATION':
      return 'ใบเสนอราคา';
    case 'TAX_INVOICE':
      return 'ใบส่งของ / ใบกำกับภาษี';
    case 'RECEIPT':
      return 'ใบเสร็จรับเงิน';
  }
}

export function getDocumentTitleEnglish(type: DocumentType): string {
  switch (type) {
    case 'QUOTATION':
      return 'QUOTATION';
    case 'TAX_INVOICE':
      return 'DELIVERY NOTE / TAX INVOICE';
    case 'RECEIPT':
      return 'RECEIPT';
  }
}

/**
 * Converts a number into official Thai Baht text (e.g., 1250.50 -> "หนึ่งพันสองร้อยห้าสิบบาทห้าสิบสตางค์")
 */
export function numberToThaiBahtText(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return 'ศูนย์บาทถ้วน';
  const rounded = Number(amount.toFixed(2));
  if (rounded === 0) return 'ศูนย์บาทถ้วน';

  const digits = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const units = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  const convertInt = (numStr: string): string => {
    if (numStr === '0' || numStr === '') return '';
    let result = '';
    const len = numStr.length;
    for (let i = 0; i < len; i++) {
      const n = Number(numStr[i]);
      const pos = len - i - 1;
      const unitIndex = pos % 6;

      if (n !== 0) {
        if (unitIndex === 1 && n === 1) {
          result += 'สิบ';
        } else if (unitIndex === 1 && n === 2) {
          result += 'ยี่สิบ';
        } else if (unitIndex === 0 && n === 1 && len > 1 && pos % 6 === 0 && numStr[i - 1] !== '0') {
          result += 'เอ็ด';
        } else if (unitIndex === 0 && n === 1 && len > 1 && i === len - 1 && numStr[i - 1] === '0') {
          result += 'หนึ่ง';
        } else {
          result += digits[n] + units[unitIndex];
        }
      }

      if (pos > 0 && unitIndex === 0) {
        result += 'ล้าน';
      }
    }
    return result;
  };

  const [intPart, decPart = '00'] = rounded.toFixed(2).split('.');
  const bahtText = intPart === '0' ? '' : `${convertInt(intPart)}บาท`;
  const satangNum = Number(decPart);
  const satangText = satangNum === 0 ? 'ถ้วน' : `${convertInt(String(satangNum))}สตางค์`;

  return `${bahtText || 'ศูนย์บาท'}${satangText}`;
}

export function exportCsvWithBom(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCell = (val: string | number) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
