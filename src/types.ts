export type CategoryKey =
  | 'school'
  | 'office'
  | 'paper'
  | 'writing'
  | 'general';

export interface CategoryMeta {
  key: CategoryKey;
  label: string;
  color: string;
  bgSoft: string;
  textColor: string;
  borderColor: string;
  image?: string;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: CategoryKey;
  unit: string;
  costPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
  description?: string;
  updatedAt: string;
}

export type PaymentMethod = 'cash' | 'transfer' | 'card';

export type VatMode = 'included' | 'excluded' | 'none';

export type DocumentType = 'RECEIPT' | 'TAX_INVOICE' | 'QUOTATION';

export type DocumentCopyMode = 'ORIGINAL' | 'COPY' | 'BOTH';

export interface LineItem {
  productId?: string;
  sku?: string;
  name: string;
  unit: string;
  qty: number;
  unitPrice: number;
  costPrice: number;
  discount: number;
  lineTotal: number;
}

export interface CustomerInfo {
  name: string;
  taxId?: string;
  branch?: string;
  address?: string;
  phone?: string;
}

export interface StoreDocument {
  id: string;
  docNumber: string;
  type: DocumentType;
  status: 'COMPLETED' | 'PENDING' | 'CONVERTED' | 'CANCELLED';
  createdAt: string;
  validUntil?: string;
  customer: CustomerInfo;
  items: LineItem[];
  subtotal: number;
  discountAmount: number;
  vatMode: VatMode;
  vatAmount: number;
  grandTotal: number;
  totalCost: number;
  paymentMethod?: PaymentMethod;
  cashReceived?: number;
  changeAmount?: number;
  notes?: string;
  convertedToDocNumber?: string;
  stockDeducted: boolean;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'SALE' | 'RESTOCK' | 'ADJUST';
  qtyChange: number;
  stockAfter: number;
  referenceDoc?: string;
  note?: string;
  createdAt: string;
}

export interface CashAdjustment {
  id: string;
  type: 'IN' | 'OUT';
  label: string;
  amount: number;
}

export interface CashSession {
  id: string;
  createdAt: string;
  cashierName: string;
  openingFloat: number;
  denominations: Record<string, number>;
  countedCash: number;
  transferTotal: number;
  cardTotal: number;
  adjustments: CashAdjustment[];
  expectedCashInDrawer: number;
  variance: number;
  grandStoreTotal: number;
  note?: string;
}

export interface StoreSettings {
  id: string;
  storeName: string;
  branchName: string;
  logoUrl?: string;
  tagline: string;
  taxId: string;
  address: string;
  phone: string;
  promptPayId: string;
  defaultVatMode: VatMode;
  receiptFooter: string;
}

export interface StoreDatabase {
  activeStoreId: string;
  stores: StoreSettings[];
  settings: StoreSettings;
  products: Product[];
  documents: StoreDocument[];
  stockMovements: StockMovement[];
  cashSessions: CashSession[];
}
