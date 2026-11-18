import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  CashSession,
  CustomerInfo,
  DocumentType,
  LineItem,
  PaymentMethod,
  Product,
  StockMovement,
  StoreDatabase,
  StoreDocument,
  StoreSettings,
  VatMode,
} from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'smart_center_db.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function createInitialDatabase(): StoreDatabase {
  const now = new Date();
  const hoursAgo = (h: number, m = 0) => {
    const d = new Date(now);
    d.setHours(Math.max(8, d.getHours() - h), m, 0, 0);
    return d.toISOString();
  };

  const products: Product[] = [
    {
      id: 'prd-01',
      sku: 'SCH-001',
      barcode: '885100100101',
      name: 'สมุดปกอ่อนลายเส้น A4 (60 แกรม 40 แผ่น)',
      category: 'school',
      unit: 'เล่ม',
      costPrice: 12,
      sellPrice: 20,
      stock: 145,
      minStock: 25,
      description: 'สมุดนักเรียนมาตรฐาน กระดาษถนอมสายตา',
      updatedAt: now.toISOString(),
    },
    {
      id: 'prd-02',
      sku: 'SCH-002',
      barcode: '885100100102',
      name: 'ชุดเรขาคณิต 4 ชิ้น พร้อมกล่องเหล็ก',
      category: 'school',
      unit: 'ชุด',
      costPrice: 28,
      sellPrice: 49,
      stock: 42,
      minStock: 10,
      description: 'ไม้บรรทัด ครึ่งวงกลม ฉากสามเหลี่ยม 2 ชิ้น',
      updatedAt: now.toISOString(),
    },
    {
      id: 'prd-03',
      sku: 'SCH-003',
      barcode: '885100100103',
      name: 'สีไม้ระบายน้ำ 24 สี แท่งยาว',
      category: 'school',
      unit: 'กล่อง',
      costPrice: 68,
      sellPrice: 115,
      stock: 34,
      minStock: 10,
      description: 'สีสดใส ไส้แข็งแรง ไม่หักง่าย พร้อมพู่กัน',
      updatedAt: now.toISOString(),
    },
    {
      id: 'prd-04',
      sku: 'SCH-004',
      barcode: '885100100104',
      name: 'กระเป๋าดินสอผ้าแคนวาสซิปคู่',
      category: 'school',
      unit: 'ใบ',
      costPrice: 45,
      sellPrice: 79,
      stock: 8,
      minStock: 10,
      description: 'ผ้าหนาทนทาน จุอุปกรณ์การเรียนได้ครบ',
      updatedAt: now.toISOString(),
    },
    {
      id: 'prd-05',
      sku: 'OFF-001',
      barcode: '885200200201',
      name: 'เครื่องเย็บกระดาษเหล็ก No.10 พร้อมลวด',
      category: 'office',
      unit: 'อัน',
      costPrice: 55,
      sellPrice: 95,
      stock: 38,
      minStock: 10,
      description: 'เย็บได้สูงสุด 20 แผ่น แข็งแรงจับถนัดมือ',
      updatedAt: now.toISOString(),
    },
    {
      id: 'prd-06',
      sku: 'OFF-002',
      barcode: '885200200202',
      name: 'เครื่องคิดเลขตั้งโต๊ะ 12 หลัก จอใหญ่',
      category: 'office',
      unit: 'เครื่อง',
      costPrice: 165,
      sellPrice: 280,
      stock: 16,
      minStock: 5,
      description: 'พลังงานแสงอาทิตย์และถ่าน ปุ่มกดนุ่ม',
      updatedAt: now.toISOString(),
    },
    {
      id: 'prd-07',
      sku: 'OFF-003',
      barcode: '885200200203',
      name: 'คลิปดำหนีบกระดาษ 32 มม. (กล่อง 12 ตัว)',
      category: 'office',
      unit: 'กล่อง',
      costPrice: 22,
      sellPrice: 38,
      stock: 64,
      minStock: 15,
      description: 'เหล็กสปริงชุบสีดำ หนีบแน่นไม่เป็นสนิม',
      updatedAt: now.toISOString(),
    },
    {
      id: 'prd-08',
      sku: 'OFF-004',
      barcode: '885200200204',
      name: 'ปากกาไวท์บอร์ด 4 สี (ดำ/น้ำเงิน/แดง/เขียว)',
      category: 'office',
      unit: 'แพ็ค',
      costPrice: 58,
      sellPrice: 95,
      stock: 29,
      minStock: 8,
      description: 'ลบสะอาด กลิ่นไม่ฉุน หัวกลม 2.0 มม.',
      updatedAt: now.toISOString(),
    },
    {
      id: 'prd-09',
      sku: 'PAP-001',
      barcode: '885300300301',
      name: 'กระดาษถ่ายเอกสาร A4 80 แกรม (500 แผ่น)',
      category: 'paper',
      unit: 'รีม',
      costPrice: 98,
      sellPrice: 129,
      stock: 92,
      minStock: 20,
      description: 'เนื้อกระดาษเรียบเนียน ไม่ติดเครื่องพิมพ์',
      updatedAt: now.toISOString(),
    },
    {
      id: 'prd-10',
      sku: 'PAP-002',
      barcode: '885300300302',
      name: 'แฟ้มสันกว้าง 3 นิ้ว A4 สีกรมท่า',
      category: 'paper',
      unit: 'แฟ้ม',
      costPrice: 44,
      sellPrice: 75,
      stock: 50,
      minStock: 12,
      description: 'ปกหุ้ม Duraplast กันน้ำ คลิปก้านโยกแข็งแรง',
      updatedAt: now.toISOString(),
    },
    {
      id: 'prd-11',
      sku: 'PAP-003',
      barcode: '885300300303',
      name: 'กระดาษโน้ตกาวในตัว Post-it 3x3 นิ้ว (แพ็ค 4 สี)',
      category: 'paper',
      unit: 'แพ็ค',
      costPrice: 34,
      sellPrice: 59,
      stock: 7,
      minStock: 10,
      description: 'กาวเหนียวติดแน่น ลอกออกไม่ทิ้งคราบ',
      updatedAt: now.toISOString(),
    },
    {
      id: 'prd-12',
      sku: 'WRT-001',
      barcode: '885400400401',
      name: 'ปากกาลูกลื่นเจล 0.5 มม. หมึกน้ำเงิน (ยกกล่อง 12 ด้าม)',
      category: 'writing',
      unit: 'กล่อง',
      costPrice: 72,
      sellPrice: 120,
      stock: 46,
      minStock: 10,
      description: 'เขียนลื่น หมึกแห้งไวไม่เปื้อนมือ',
      updatedAt: now.toISOString(),
    },
    {
      id: 'prd-13',
      sku: 'WRT-002',
      barcode: '885400400402',
      name: 'ปากกาเน้นข้อความพาสเทล 6 สี',
      category: 'writing',
      unit: 'ชุด',
      costPrice: 54,
      sellPrice: 89,
      stock: 31,
      minStock: 8,
      description: 'สีอ่อนสบายตา ไม่ทะลุกระดาษสมุด',
      updatedAt: now.toISOString(),
    },
    {
      id: 'prd-14',
      sku: 'WRT-003',
      barcode: '885400400403',
      name: 'ดินสอไม้ 2B เหลาพร้อมใช้ (กล่อง 12 แท่ง)',
      category: 'writing',
      unit: 'กล่อง',
      costPrice: 36,
      sellPrice: 60,
      stock: 54,
      minStock: 12,
      description: 'เหมาะสำหรับทำข้อสอบและเขียนทั่วไป',
      updatedAt: now.toISOString(),
    },
    {
      id: 'prd-15',
      sku: 'GEN-001',
      barcode: '885500500501',
      name: 'เทปใสปิดกล่อง 2 นิ้ว x 45 หลา (แพ็ค 6 ม้วน)',
      category: 'general',
      unit: 'แพ็ค',
      costPrice: 84,
      sellPrice: 135,
      stock: 26,
      minStock: 8,
      description: 'กาวอะคริลิคเหนียวพิเศษ สำหรับงานแพ็คพัสดุ',
      updatedAt: now.toISOString(),
    },
    {
      id: 'prd-16',
      sku: 'GEN-002',
      barcode: '885500500502',
      name: 'ถ่านอัลคาไลน์ AA (แพ็ค 4 ก้อน)',
      category: 'general',
      unit: 'แพ็ค',
      costPrice: 48,
      sellPrice: 79,
      stock: 35,
      minStock: 10,
      description: 'พลังงานสูง ใช้งานได้ยาวนาน',
      updatedAt: now.toISOString(),
    },
    {
      id: 'prd-17',
      sku: 'GEN-003',
      barcode: '885500500503',
      name: 'มีดคัตเตอร์ใหญ่ 18 มม. พร้อมใบมีดสำรอง',
      category: 'general',
      unit: 'อัน',
      costPrice: 25,
      sellPrice: 45,
      stock: 41,
      minStock: 10,
      description: 'ด้ามจับกันลื่น ระบบล็อกใบมีดอัตโนมัติ',
      updatedAt: now.toISOString(),
    },
    {
      id: 'prd-18',
      sku: 'GEN-004',
      barcode: '885500500504',
      name: 'ตะกร้าจัดระเบียบอเนกประสงค์ ขนาดกลาง',
      category: 'general',
      unit: 'ใบ',
      costPrice: 32,
      sellPrice: 55,
      stock: 19,
      minStock: 6,
      description: 'พลาสติกหนาเกรด A สำหรับใส่เครื่องเขียนและของใช้',
      updatedAt: now.toISOString(),
    },
  ];

  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const documents: StoreDocument[] = [
    {
      id: 'doc-1',
      docNumber: `RC-${ym}-0001`,
      type: 'RECEIPT',
      status: 'COMPLETED',
      createdAt: hoursAgo(3, 15),
      customer: { name: 'ลูกค้าทั่วไป (หน้าร้าน)' },
      items: [
        {
          productId: 'prd-01',
          sku: 'SCH-001',
          name: 'สมุดปกอ่อนลายเส้น A4 (60 แกรม 40 แผ่น)',
          unit: 'เล่ม',
          qty: 5,
          unitPrice: 20,
          costPrice: 12,
          discount: 0,
          lineTotal: 100,
        },
        {
          productId: 'prd-03',
          sku: 'SCH-003',
          name: 'สีไม้ระบายน้ำ 24 สี แท่งยาว',
          unit: 'กล่อง',
          qty: 1,
          unitPrice: 115,
          costPrice: 68,
          discount: 0,
          lineTotal: 115,
        },
      ],
      subtotal: 215,
      discountAmount: 0,
      vatMode: 'included',
      vatAmount: 14.07,
      grandTotal: 215,
      totalCost: 128,
      paymentMethod: 'cash',
      cashReceived: 300,
      changeAmount: 85,
      stockDeducted: true,
    },
    {
      id: 'doc-2',
      docNumber: `IV-${ym}-0001`,
      type: 'TAX_INVOICE',
      status: 'COMPLETED',
      createdAt: hoursAgo(1, 40),
      customer: {
        name: 'โรงเรียนสาธิตพัฒนาการเรียนรู้',
        taxId: '0994000123456',
        branch: 'สำนักงานใหญ่',
        address: '88/12 ถนนสุขุมวิท เขตวัฒนา กรุงเทพมหานคร 10110',
        phone: '02-555-0199',
      },
      items: [
        {
          productId: 'prd-09',
          sku: 'PAP-001',
          name: 'กระดาษถ่ายเอกสาร A4 80 แกรม (500 แผ่น)',
          unit: 'รีม',
          qty: 10,
          unitPrice: 129,
          costPrice: 98,
          discount: 0,
          lineTotal: 1290,
        },
        {
          productId: 'prd-10',
          sku: 'PAP-002',
          name: 'แฟ้มสันกว้าง 3 นิ้ว A4 สีกรมท่า',
          unit: 'แฟ้ม',
          qty: 6,
          unitPrice: 75,
          costPrice: 44,
          discount: 0,
          lineTotal: 450,
        },
        {
          productId: 'prd-12',
          sku: 'WRT-001',
          name: 'ปากกาลูกลื่นเจล 0.5 มม. หมึกน้ำเงิน (ยกกล่อง 12 ด้าม)',
          unit: 'กล่อง',
          qty: 3,
          unitPrice: 120,
          costPrice: 72,
          discount: 0,
          lineTotal: 360,
        },
      ],
      subtotal: 2100,
      discountAmount: 100,
      vatMode: 'included',
      vatAmount: 130.84,
      grandTotal: 2000,
      totalCost: 1460,
      paymentMethod: 'transfer',
      notes: 'จัดส่งหน้าอาคารอำนวยการ เรียบร้อยแล้ว',
      stockDeducted: true,
    },
    {
      id: 'doc-3',
      docNumber: `QT-${ym}-0001`,
      type: 'QUOTATION',
      status: 'PENDING',
      createdAt: hoursAgo(2, 10),
      validUntil: new Date(now.getTime() + 14 * 86400000).toISOString(),
      customer: {
        name: 'บริษัท สยามออฟฟิศ โซลูชั่น จำกัด',
        taxId: '0105561088991',
        branch: 'สำนักงานใหญ่',
        address: '299 อาคารธนภูมิ ชั้น 5 ถนนเพชรบุรีตัดใหม่ กรุงเทพมหานคร 10400',
        phone: '02-777-8844',
      },
      items: [
        {
          productId: 'prd-09',
          sku: 'PAP-001',
          name: 'กระดาษถ่ายเอกสาร A4 80 แกรม (500 แผ่น)',
          unit: 'รีม',
          qty: 20,
          unitPrice: 129,
          costPrice: 98,
          discount: 0,
          lineTotal: 2580,
        },
        {
          productId: 'prd-06',
          sku: 'OFF-002',
          name: 'เครื่องคิดเลขตั้งโต๊ะ 12 หลัก จอใหญ่',
          unit: 'เครื่อง',
          qty: 4,
          unitPrice: 280,
          costPrice: 165,
          discount: 0,
          lineTotal: 1120,
        },
      ],
      subtotal: 3700,
      discountAmount: 0,
      vatMode: 'excluded',
      vatAmount: 259,
      grandTotal: 3959,
      totalCost: 2620,
      notes: 'ยืนราคา 14 วัน จัดส่งฟรีภายในเขตตัวเมือง',
      stockDeducted: false,
    },
  ];

  const stockMovements: StockMovement[] = [
    {
      id: 'mov-1',
      productId: 'prd-01',
      productName: 'สมุดปกอ่อนลายเส้น A4 (60 แกรม 40 แผ่น)',
      type: 'SALE',
      qtyChange: -5,
      stockAfter: 145,
      referenceDoc: `RC-${ym}-0001`,
      createdAt: hoursAgo(3, 15),
    },
    {
      id: 'mov-2',
      productId: 'prd-09',
      productName: 'กระดาษถ่ายเอกสาร A4 80 แกรม (500 แผ่น)',
      type: 'SALE',
      qtyChange: -10,
      stockAfter: 92,
      referenceDoc: `IV-${ym}-0001`,
      createdAt: hoursAgo(1, 40),
    },
  ];

  const settings: StoreSettings = {
    id: 'store-default',
    storeName: 'Smart Center',
    branchName: 'สาขาหลัก (ศูนย์รวมเครื่องเขียนและอุปกรณ์สำนักงาน)',
    logoUrl: '',
    tagline: 'จำหน่ายสินค้าเบ็ดเตล็ด อุปกรณ์การเรียนการสอน และอุปกรณ์สำนักงานครบวงจร',
    taxId: '0105564099123',
    address: '168/9 ถนนมิตรภาพ ตำบลในเมือง อำเภอเมือง จังหวัดนครราชสีมา 30000',
    phone: '044-258-999 / 089-888-7766',
    promptPayId: '0898887766',
    defaultVatMode: 'included',
    receiptFooter: 'ขอบคุณที่อุดหนุน Smart Center สินค้าครบ ราคาเป็นกันเอง',
  };

  return {
    activeStoreId: settings.id,
    stores: [settings],
    settings,
    products,
    documents,
    stockMovements,
    cashSessions: [],
  };
}

function normalizeDb(db: StoreDatabase): StoreDatabase {
  if (!db.settings.id) {
    db.settings.id = 'store-default';
  }
  if (!Array.isArray(db.stores) || db.stores.length === 0) {
    db.stores = [{ ...db.settings }];
  }
  if (!db.activeStoreId) {
    db.activeStoreId = db.settings.id;
  }
  return db;
}

function readDb(): StoreDatabase {
  ensureDataDir();
  if (!fs.existsSync(DB_PATH)) {
    const initial = createInitialDatabase();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return normalizeDb(JSON.parse(raw) as StoreDatabase);
  } catch {
    const fallback = createInitialDatabase();
    fs.writeFileSync(DB_PATH, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
}

function writeDb(db: StoreDatabase) {
  ensureDataDir();
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DB_PATH);
}

function generateNextDocNumber(db: StoreDatabase, type: DocumentType): string {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = type === 'QUOTATION' ? 'QT' : type === 'TAX_INVOICE' ? 'IV' : 'RC';
  const pattern = `${prefix}-${ym}-`;
  const existing = db.documents
    .filter((d) => d.docNumber.startsWith(pattern))
    .map((d) => Number(d.docNumber.slice(pattern.length)) || 0);
  const nextSeq = (existing.length > 0 ? Math.max(...existing) : 0) + 1;
  return `${pattern}${String(nextSeq).padStart(4, '0')}`;
}

function computeVat(subtotal: number, discountAmount: number, vatMode: VatMode) {
  const safeSub = Math.max(0, Number(subtotal.toFixed(2)));
  const safeDiscount = Math.min(safeSub, Math.max(0, Number(discountAmount.toFixed(2))));
  const afterDiscount = Number((safeSub - safeDiscount).toFixed(2));
  if (vatMode === 'included') {
    const preVat = Number((afterDiscount / 1.07).toFixed(2));
    return {
      vatAmount: Number((afterDiscount - preVat).toFixed(2)),
      grandTotal: afterDiscount,
    };
  }
  if (vatMode === 'excluded') {
    const vatAmount = Number((afterDiscount * 0.07).toFixed(2));
    return {
      vatAmount,
      grandTotal: Number((afterDiscount + vatAmount).toFixed(2)),
    };
  }
  return {
    vatAmount: 0,
    grandTotal: afterDiscount,
  };
}

// SSE clients for real-time updates across tabs / tablets
const sseClients = new Set<express.Response>();

function broadcastStoreUpdate(reason: string) {
  const payload = JSON.stringify({ reason, timestamp: new Date().toISOString() });
  for (const res of sseClients) {
    try {
      res.write(`event: store-updated\ndata: ${payload}\n\n`);
    } catch {
      sseClients.delete(res);
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // SSE Real-time feed
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
    sseClients.add(res);
    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // Full store bootstrap
  app.get('/api/store', (_req, res) => {
    const db = readDb();
    res.json(db);
  });

  // Store Settings & Multi-Store Management
  app.put('/api/settings', (req, res) => {
    const db = readDb();
    const updated: StoreSettings = {
      ...db.settings,
      ...req.body,
      id: req.body.id || db.settings.id || 'store-default',
    };
    db.settings = updated;
    db.activeStoreId = updated.id;
    const idx = db.stores.findIndex((s) => s.id === updated.id);
    if (idx >= 0) {
      db.stores[idx] = updated;
    } else {
      db.stores.push(updated);
    }
    writeDb(db);
    broadcastStoreUpdate('settings-updated');
    res.json(updated);
  });

  app.post('/api/stores', (req, res) => {
    const db = readDb();
    const body = req.body as Partial<StoreSettings>;
    if (!body.storeName?.trim()) {
      res.status(400).json({ error: 'กรุณาระบุชื่อร้านค้า' });
      return;
    }
    const newStore: StoreSettings = {
      id: `store-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      storeName: body.storeName.trim(),
      branchName: body.branchName?.trim() || 'สาขาหลัก',
      logoUrl: body.logoUrl || '',
      tagline:
        body.tagline?.trim() ||
        'จำหน่ายสินค้าเบ็ดเตล็ด อุปกรณ์การเรียนการสอน และอุปกรณ์สำนักงานครบวงจร',
      taxId: body.taxId?.trim() || '',
      address: body.address?.trim() || '',
      phone: body.phone?.trim() || '',
      promptPayId: body.promptPayId?.trim() || '',
      defaultVatMode: body.defaultVatMode || 'included',
      receiptFooter:
        body.receiptFooter?.trim() || `ขอบคุณที่อุดหนุน ${body.storeName.trim()}`,
    };
    db.stores.push(newStore);
    db.activeStoreId = newStore.id;
    db.settings = newStore;
    writeDb(db);
    broadcastStoreUpdate('store-created');
    res.status(201).json(newStore);
  });

  app.post('/api/stores/:id/activate', (req, res) => {
    const db = readDb();
    const target = db.stores.find((s) => s.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'ไม่พบข้อมูลร้านค้าที่เลือก' });
      return;
    }
    db.activeStoreId = target.id;
    db.settings = target;
    writeDb(db);
    broadcastStoreUpdate('store-activated');
    res.json(target);
  });

  app.delete('/api/stores/:id', (req, res) => {
    const db = readDb();
    if (db.stores.length <= 1) {
      res.status(400).json({ error: 'ต้องมีข้อมูลร้านค้าอย่างน้อย 1 ร้านในระบบ' });
      return;
    }
    const idx = db.stores.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'ไม่พบร้านค้าที่ต้องการลบ' });
      return;
    }
    const [removed] = db.stores.splice(idx, 1);
    if (db.activeStoreId === removed.id) {
      db.activeStoreId = db.stores[0].id;
      db.settings = db.stores[0];
    }
    writeDb(db);
    broadcastStoreUpdate('store-deleted');
    res.json({ ok: true, activeStore: db.settings });
  });

  // Products CRUD + Restock
  app.post('/api/products', (req, res) => {
    const db = readDb();
    const body = req.body as Partial<Product>;
    if (!body.name || body.sellPrice === undefined) {
      res.status(400).json({ error: 'กรุณาระบุชื่อสินค้าและราคาขาย' });
      return;
    }

    const newProduct: Product = {
      id: `prd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sku: (body.sku || `SKU-${String(db.products.length + 1).padStart(3, '0')}`).trim(),
      barcode: (body.barcode || String(885000000000 + db.products.length + 1)).trim(),
      name: body.name.trim(),
      category: body.category || 'general',
      unit: (body.unit || 'ชิ้น').trim(),
      costPrice: Math.max(0, Number(body.costPrice) || 0),
      sellPrice: Math.max(0, Number(body.sellPrice) || 0),
      stock: Math.max(0, Math.floor(Number(body.stock) || 0)),
      minStock: Math.max(0, Math.floor(Number(body.minStock) || 5)),
      description: body.description?.trim() || '',
      updatedAt: new Date().toISOString(),
    };

    db.products.unshift(newProduct);
    if (newProduct.stock > 0) {
      db.stockMovements.unshift({
        id: `mov-${Date.now()}`,
        productId: newProduct.id,
        productName: newProduct.name,
        type: 'RESTOCK',
        qtyChange: newProduct.stock,
        stockAfter: newProduct.stock,
        note: 'เพิ่มสินค้าใหม่เข้าคลัง',
        createdAt: new Date().toISOString(),
      });
    }
    writeDb(db);
    broadcastStoreUpdate('product-added');
    res.status(201).json(newProduct);
  });

  app.put('/api/products/:id', (req, res) => {
    const db = readDb();
    const idx = db.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'ไม่พบรายการสินค้านี้' });
      return;
    }
    const existing = db.products[idx];
    const body = req.body as Partial<Product>;
    const nextStock =
      body.stock !== undefined ? Math.max(0, Math.floor(Number(body.stock))) : existing.stock;

    const updated: Product = {
      ...existing,
      ...body,
      id: existing.id,
      stock: nextStock,
      costPrice: body.costPrice !== undefined ? Math.max(0, Number(body.costPrice)) : existing.costPrice,
      sellPrice: body.sellPrice !== undefined ? Math.max(0, Number(body.sellPrice)) : existing.sellPrice,
      minStock: body.minStock !== undefined ? Math.max(0, Math.floor(Number(body.minStock))) : existing.minStock,
      updatedAt: new Date().toISOString(),
    };

    db.products[idx] = updated;
    if (nextStock !== existing.stock) {
      db.stockMovements.unshift({
        id: `mov-${Date.now()}`,
        productId: updated.id,
        productName: updated.name,
        type: 'ADJUST',
        qtyChange: nextStock - existing.stock,
        stockAfter: nextStock,
        note: 'ปรับปรุงข้อมูลสินค้าและยอดสต็อก',
        createdAt: new Date().toISOString(),
      });
    }
    writeDb(db);
    broadcastStoreUpdate('product-updated');
    res.json(updated);
  });

  app.post('/api/products/:id/restock', (req, res) => {
    const db = readDb();
    const product = db.products.find((p) => p.id === req.params.id);
    if (!product) {
      res.status(404).json({ error: 'ไม่พบรายการสินค้านี้' });
      return;
    }
    const qty = Math.floor(Number(req.body.qty) || 0);
    if (qty === 0) {
      res.status(400).json({ error: 'กรุณาระบุจำนวนสินค้าที่ต้องการปรับสต็อก' });
      return;
    }
    const nextStock = Math.max(0, product.stock + qty);
    const actualDiff = nextStock - product.stock;
    product.stock = nextStock;
    product.updatedAt = new Date().toISOString();

    db.stockMovements.unshift({
      id: `mov-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      type: actualDiff >= 0 ? 'RESTOCK' : 'ADJUST',
      qtyChange: actualDiff,
      stockAfter: nextStock,
      note: req.body.note || (actualDiff >= 0 ? 'รับสินค้าเข้าคลัง' : 'ปรับลดสต็อก'),
      createdAt: new Date().toISOString(),
    });
    writeDb(db);
    broadcastStoreUpdate('product-restocked');
    res.json(product);
  });

  app.delete('/api/products/:id', (req, res) => {
    const db = readDb();
    const idx = db.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'ไม่พบรายการสินค้านี้' });
      return;
    }
    db.products.splice(idx, 1);
    writeDb(db);
    broadcastStoreUpdate('product-deleted');
    res.json({ ok: true });
  });

  // Create Sale or Document (auto deducts stock when type is RECEIPT or TAX_INVOICE)
  app.post('/api/documents', (req, res) => {
    const db = readDb();
    const body = req.body as {
      type: DocumentType;
      customer?: CustomerInfo;
      items: LineItem[];
      discountAmount?: number;
      vatMode?: VatMode;
      paymentMethod?: PaymentMethod;
      cashReceived?: number;
      notes?: string;
      validUntil?: string;
    };

    const docType: DocumentType = body.type || 'RECEIPT';
    if (!Array.isArray(body.items) || body.items.length === 0) {
      res.status(400).json({ error: 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ' });
      return;
    }

    const shouldDeductStock = docType === 'RECEIPT' || docType === 'TAX_INVOICE';

    // Validate stock before deducting
    if (shouldDeductStock) {
      for (const item of body.items) {
        if (item.productId) {
          const prod = db.products.find((p) => p.id === item.productId);
          if (!prod) {
            res.status(400).json({ error: `ไม่พบสินค้า "${item.name}" ในคลัง` });
            return;
          }
          if (prod.stock < item.qty) {
            res.status(400).json({
              error: `สินค้า "${prod.name}" คงเหลือ ${prod.stock} ${prod.unit} ไม่เพียงพอต่อการขาย (${item.qty} ${prod.unit})`,
            });
            return;
          }
        }
      }
    }

    const normalizedItems: LineItem[] = body.items.map((item) => {
      const qty = Math.max(1, Number(item.qty) || 1);
      const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
      const discount = Math.max(0, Number(item.discount) || 0);
      const prod = item.productId ? db.products.find((p) => p.id === item.productId) : undefined;
      const costPrice = prod ? prod.costPrice : Math.max(0, Number(item.costPrice) || 0);
      const lineTotal = Math.max(0, Number((qty * unitPrice - discount).toFixed(2)));
      return {
        productId: item.productId,
        sku: item.sku || prod?.sku || '-',
        name: item.name,
        unit: item.unit || prod?.unit || 'ชิ้น',
        qty,
        unitPrice,
        costPrice,
        discount,
        lineTotal,
      };
    });

    const subtotal = Number(
      normalizedItems.reduce((acc, it) => acc + it.lineTotal, 0).toFixed(2)
    );
    const totalCost = Number(
      normalizedItems.reduce((acc, it) => acc + it.costPrice * it.qty, 0).toFixed(2)
    );
    const discountAmount = Math.max(0, Number(body.discountAmount) || 0);
    const vatMode: VatMode = body.vatMode || db.settings.defaultVatMode || 'included';
    const { vatAmount, grandTotal } = computeVat(subtotal, discountAmount, vatMode);

    const docNumber = generateNextDocNumber(db, docType);
    const nowIso = new Date().toISOString();

    // Deduct stock automatically for completed sales
    if (shouldDeductStock) {
      for (const item of normalizedItems) {
        if (item.productId) {
          const prod = db.products.find((p) => p.id === item.productId);
          if (prod) {
            prod.stock = Math.max(0, prod.stock - item.qty);
            prod.updatedAt = nowIso;
            db.stockMovements.unshift({
              id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              productId: prod.id,
              productName: prod.name,
              type: 'SALE',
              qtyChange: -item.qty,
              stockAfter: prod.stock,
              referenceDoc: docNumber,
              note: docType === 'TAX_INVOICE' ? 'ขายพร้อมออกใบกำกับภาษี' : 'ขายหน้าร้านอัตโนมัติ',
              createdAt: nowIso,
            });
          }
        }
      }
    }

    const cashReceived =
      body.paymentMethod === 'cash' && body.cashReceived !== undefined
        ? Number(body.cashReceived)
        : undefined;
    const changeAmount =
      cashReceived !== undefined ? Math.max(0, Number((cashReceived - grandTotal).toFixed(2))) : undefined;

    const newDoc: StoreDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      docNumber,
      type: docType,
      status: docType === 'QUOTATION' ? 'PENDING' : 'COMPLETED',
      createdAt: nowIso,
      validUntil:
        body.validUntil ||
        (docType === 'QUOTATION' ? new Date(Date.now() + 14 * 86400000).toISOString() : undefined),
      customer: body.customer?.name?.trim()
        ? body.customer
        : { name: 'ลูกค้าทั่วไป (หน้าร้าน)' },
      items: normalizedItems,
      subtotal,
      discountAmount,
      vatMode,
      vatAmount,
      grandTotal,
      totalCost,
      paymentMethod: docType === 'QUOTATION' ? undefined : body.paymentMethod || 'cash',
      cashReceived,
      changeAmount,
      notes: body.notes?.trim() || '',
      stockDeducted: shouldDeductStock,
    };

    db.documents.unshift(newDoc);
    writeDb(db);
    broadcastStoreUpdate(shouldDeductStock ? 'sale-completed' : 'quotation-created');
    res.status(201).json(newDoc);
  });

  // Convert Quotation -> Tax Invoice or Receipt & auto-deduct stock
  app.post('/api/documents/:id/convert', (req, res) => {
    const db = readDb();
    const quotation = db.documents.find((d) => d.id === req.params.id);
    if (!quotation || quotation.type !== 'QUOTATION') {
      res.status(404).json({ error: 'ไม่พบใบเสนอราคาที่ต้องการแปลง' });
      return;
    }
    if (quotation.status === 'CONVERTED') {
      res.status(400).json({ error: 'ใบเสนอราคานี้ถูกแปลงเป็นบิลขายไปแล้ว' });
      return;
    }

    const targetType: DocumentType =
      req.body.targetType === 'RECEIPT' ? 'RECEIPT' : 'TAX_INVOICE';
    const paymentMethod: PaymentMethod = req.body.paymentMethod || 'transfer';

    // Check stock
    for (const item of quotation.items) {
      if (item.productId) {
        const prod = db.products.find((p) => p.id === item.productId);
        if (!prod) {
          res.status(400).json({ error: `ไม่พบสินค้า "${item.name}" ในคลัง` });
          return;
        }
        if (prod.stock < item.qty) {
          res.status(400).json({
            error: `สินค้า "${prod.name}" คงเหลือ ${prod.stock} ${prod.unit} ไม่พอตัดสต็อก (${item.qty} ${prod.unit})`,
          });
          return;
        }
      }
    }

    const nowIso = new Date().toISOString();
    const newDocNumber = generateNextDocNumber(db, targetType);

    for (const item of quotation.items) {
      if (item.productId) {
        const prod = db.products.find((p) => p.id === item.productId);
        if (prod) {
          prod.stock = Math.max(0, prod.stock - item.qty);
          prod.updatedAt = nowIso;
          db.stockMovements.unshift({
            id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            productId: prod.id,
            productName: prod.name,
            type: 'SALE',
            qtyChange: -item.qty,
            stockAfter: prod.stock,
            referenceDoc: newDocNumber,
            note: `แปลงจากใบเสนอราคา ${quotation.docNumber}`,
            createdAt: nowIso,
          });
        }
      }
    }

    quotation.status = 'CONVERTED';
    quotation.convertedToDocNumber = newDocNumber;

    const convertedDoc: StoreDocument = {
      ...quotation,
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      docNumber: newDocNumber,
      type: targetType,
      status: 'COMPLETED',
      createdAt: nowIso,
      validUntil: undefined,
      paymentMethod,
      notes: quotation.notes
        ? `${quotation.notes} (อ้างอิง ${quotation.docNumber})`
        : `อ้างอิงใบเสนอราคา ${quotation.docNumber}`,
      stockDeducted: true,
    };

    db.documents.unshift(convertedDoc);
    writeDb(db);
    broadcastStoreUpdate('quotation-converted');
    res.status(201).json(convertedDoc);
  });

  // Cash Register / Total Store Money Calculator sessions
  app.post('/api/cash-sessions', (req, res) => {
    const db = readDb();
    const body = req.body as Omit<CashSession, 'id' | 'createdAt'>;
    const session: CashSession = {
      id: `cash-${Date.now()}`,
      createdAt: new Date().toISOString(),
      cashierName: body.cashierName || 'แคชเชียร์หน้าร้าน',
      openingFloat: Number(body.openingFloat) || 0,
      denominations: body.denominations || {},
      countedCash: Number(body.countedCash) || 0,
      transferTotal: Number(body.transferTotal) || 0,
      cardTotal: Number(body.cardTotal) || 0,
      adjustments: Array.isArray(body.adjustments) ? body.adjustments : [],
      expectedCashInDrawer: Number(body.expectedCashInDrawer) || 0,
      variance: Number(body.variance) || 0,
      grandStoreTotal: Number(body.grandStoreTotal) || 0,
      note: body.note || '',
    };
    db.cashSessions.unshift(session);
    writeDb(db);
    broadcastStoreUpdate('cash-session-saved');
    res.status(201).json(session);
  });

  // Vite middleware or production static files
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Center server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Smart Center server:', err);
  process.exit(1);
});
