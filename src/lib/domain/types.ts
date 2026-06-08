/**
 * نموذج المجال — مصنع التركي للحليب ومشتقاته
 *
 * النشاط: تجميع الحليب الخام من الفلاحين → تخزين مركزي → بيع بالجملة للعملاء.
 * لا يوجد إنتاج أو تحويل. الكيانات الأساسية: الفلاح، العميل، المخزون، الحركات،
 * الفترة، الحساب، وسجل التدقيق.
 */

export type LivestockType = 'cow' | 'sheep' | 'goat' | 'mixed';
export type QualityTier = 'A' | 'B' | 'C';
/** وجبة استلام الحليب من الفلاح */
export type MilkShift = 'morning' | 'evening';
export type FarmerStatus = 'active' | 'suspended' | 'inactive';

export type CustomerType = 'factory' | 'retailer' | 'distributor' | 'individual';
export type PriceTier = 'wholesale' | 'premium' | 'standard';

export type SessionStatus = 'open' | 'locked' | 'archived';

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'OPENING' | 'CARRY_FORWARD';
export type PaymentMethod = 'cash' | 'bank' | 'cheque';

export type TransactionKind =
  | 'supply'
  | 'sale'
  | 'farmer_payment'
  | 'customer_payment'
  | 'employee_advance'
  | 'adjustment'
  | 'expense'
  | 'payroll';

/** مفاتيح دليل الحسابات للمحرّك المزدوج القيد */
export type AccountKey =
  | 'inventory' // المخزون (أصل)
  | 'farmer_payable' // مستحقات الفلاحين (التزام)
  | 'customer_receivable' // ذمم العملاء (أصل)
  | 'revenue' // إيرادات المبيعات
  | 'cogs' // تكلفة البضاعة المباعة
  | 'cash' // النقدية والمصارف
  | 'operating_expense' // مصاريف تشغيلية
  | 'payroll_expense'; // رواتب وأجور

export type Role = 'admin' | 'accountant' | 'operator' | 'hr_manager' | 'viewer';

// ============================================================
// الكيانات
// ============================================================

export interface Farmer {
  id: string;
  code: string; // معرّف بشري F-001
  fullName: string;
  region: string;
  phone: string;
  /** اسم المصرف */
  bankName?: string;
  /** رقم الحساب البنكي */
  bankAccount?: string;
  /** رقم الآيبان للتحويلات البنكية */
  iban?: string;
  /** لتر/يوم — اختياري */
  avgDailyYield?: number;
  /** @deprecated لم يعد يُطلب عند الإضافة */
  livestockCount?: number;
  /** @deprecated لم يعد يُطلب عند الإضافة */
  livestockType?: LivestockType;
  qualityTier: QualityTier;
  defaultBuyPrice: number; // سعر شراء اللتر الافتراضي
  status: FarmerStatus;
  onboardingDate: string; // ISO
  notes?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  code: string; // C-001
  entityName: string;
  entityType: CustomerType;
  taxNumber?: string;
  phone: string;
  creditLimit: number;
  paymentTerms: number; // أيام
  priceTier: PriceTier;
  defaultSellPrice: number; // سعر بيع اللتر الافتراضي
  onHold: boolean;
  onboardingDate: string;
  notes?: string;
  createdAt: string;
}

export interface SupplyTransaction {
  id: string;
  ref: string; // SUP-2026-0001
  farmerId: string;
  sessionId: string;
  date: string; // ISO
  quantity: number; // لتر — الكمية الكلية الواردة للمخزون
  unitPrice: number;
  total: number; // (quantity - sampleQty) * unitPrice
  qualityTier: QualityTier;
  /** وجبة الاستلام: صباحية أو مسائية */
  milkShift?: MilkShift;
  /** لترات العينة — تدخل المخزون لكن لا تُحسب في مستحقات الفلاح */
  sampleQty?: number;
  fatPct?: number;
  notes?: string;
  createdAt: string;
  createdBy?: string;
}

export interface SaleTransaction {
  id: string;
  ref: string; // SAL-2026-0001
  customerId: string;
  sessionId: string;
  date: string;
  quantity: number;
  unitPrice: number;
  total: number; // quantity * unitPrice
  dueDate: string;
  notes?: string;
  createdAt: string;
  createdBy?: string;
}

export interface Payment {
  id: string;
  ref: string; // PAY-...
  kind: 'farmer_payment' | 'customer_payment' | 'employee_advance';
  partyId: string; // farmerId أو customerId
  sessionId: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  /** ربط الخزينة/البنك — يطابق paid_from_type/id في Supabase */
  paidFromType?: AccountSourceType;
  paidFromId?: string;
  reference?: string;
  notes?: string;
  /** تسوية دورة — الدفع يغطي كامل مستحقات الفلاح في هذه الدورة */
  settlementComplete?: boolean;
  createdAt: string;
  createdBy?: string;
}

/** دين مسجّل يدوياً — افتتاحي أو مستقل (بدون استلام/بيع/مخزون) */
export type DebtPartyKind = 'farmer' | 'customer' | 'employee';

export interface DebtEntry {
  id: string;
  ref: string; // DEB-2026-0001
  sessionId: string;
  date: string;
  partyKind: DebtPartyKind;
  partyId: string;
  amount: number;
  description?: string;
  createdAt: string;
  createdBy?: string;
}

export interface InventoryAdjustment {
  id: string;
  ref: string;
  sessionId: string;
  date: string;
  quantity: number; // موجب = زيادة، سالب = نقص (هدر/جرد)
  unitCost: number;
  reason: string;
  createdAt: string;
}

export interface SessionArchive {
  summary: {
    supply: { transactions: number; qty: number; cost: number };
    sales: { transactions: number; qty: number; revenue: number; cogs: number };
    profit: { gross: number; marginPct: number };
    inventory: { opening: number; closing: number; variance: number };
    cash: { farmerPayments: number; customerReceipts: number };
  };
  balancesSnapshot: {
    farmers: { id: string; name: string; balance: number; suppliedQty?: number; paidAmount?: number; status?: 'pending' | 'partial' | 'paid' }[];
    customers: { id: string; name: string; balance: number }[];
  };
  carryForward: {
    openingStock: number;
    payables: number;
    receivables: number;
  };
}

export interface Session {
  id: string;
  label: string; // "يونيو 2026 — الدورة الأولى"
  periodFrom: string;
  periodTo: string;
  status: SessionStatus;
  cycleNumber?: 1 | 2; // الدورة نصف الشهرية (1: 1-15، 2: 16-نهاية)
  openingStock: number;
  openingAvgCost: number;
  openingPayables: number;
  openingReceivables: number;
  createdAt: string;
  closedAt?: string;
  archive?: SessionArchive;
}

// ============================================================
// مشتقّات محسوبة
// ============================================================

export interface JournalLine {
  account: AccountKey;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  ref: string;
  date: string;
  sessionId: string;
  kind: TransactionKind;
  sourceId: string;
  description: string;
  lines: JournalLine[];
}

export interface InventoryLedgerEntry {
  id: string;
  ref: string;
  date: string;
  sessionId: string;
  movementType: MovementType;
  sourceKind: 'supply' | 'sale' | 'adjustment' | 'opening';
  sourceId: string;
  label: string;
  quantityIn: number;
  quantityOut: number;
  unitCost: number;
  balanceAfter: number;
  valueAfter: number;
}

export type AlertLevel = 'danger' | 'warning' | 'info';

export interface SystemAlert {
  id: string;
  level: AlertLevel;
  title: string;
  detail: string;
  href?: string;
}

export interface AppSettings {
  minStockThreshold: number; // لتر — تنبيه انخفاض المخزون
  defaultBuyPrice: number;
  defaultSellPrice: number;
  currencyLabel: string;
}

export interface AuthUser {
  name: string;
  role: Role;
  email: string;
}

// ============================================================
// v3.0 — الخزن والبنوك والنقد
// ============================================================

export type AccountSourceType = 'vault' | 'bank';

export type CashMovementType =
  | 'income'
  | 'expense'
  | 'transfer_in'
  | 'transfer_out'
  | 'sale_payment'
  | 'farmer_payout'
  | 'salary'
  | 'adjustment';

export type CashReferenceType = 'sale' | 'supply' | 'expense' | 'payroll' | 'transfer' | 'manual' | 'opening' | 'payment';

export interface CashVault {
  id: string;
  code: string; // V-01
  name: string; // "الخزنة الرئيسية"
  openingBalance: number;
  isActive: boolean;
  responsible?: string;
  location?: string;
  minThreshold?: number;
  notes?: string;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  code: string; // B-01
  bankName: string; // "مصرف الجمهورية - فرع الميناء"
  accountNumber: string;
  iban?: string;
  accountHolder: string;
  openingBalance: number;
  isActive: boolean;
  branchName?: string;
  contactOfficer?: string;
  notes?: string;
  createdAt: string;
}

export interface CashMovement {
  id: string;
  ref: string; // CM-2026-0001
  movementType: CashMovementType;
  sourceType: AccountSourceType;
  sourceId: string; // vault أو bank
  amount: number; // موجب دائماً
  direction: 'in' | 'out';
  referenceType: CashReferenceType;
  referenceId?: string;
  description: string;
  sessionId: string;
  date: string;
  createdAt: string;
  createdBy?: string;
}

export interface CashTransfer {
  id: string;
  ref: string; // TR-2026-0001
  fromType: AccountSourceType;
  fromId: string;
  toType: AccountSourceType;
  toId: string;
  amount: number;
  date: string;
  referenceDoc?: string;
  notes?: string;
  sessionId: string;
  createdAt: string;
}

// ============================================================
// v3.0 — المصاريف
// ============================================================

export interface ExpenseCategory {
  id: string;
  name: string;
  group: 'operations' | 'logistics' | 'admin' | 'labor';
  budgetMonthly?: number;
  isRecurring: boolean;
}

export type ExpenseStatus = 'pending' | 'approved' | 'rejected';

export interface Expense {
  id: string;
  ref: string; // EXP-2026-0001
  categoryId: string;
  amount: number;
  description: string;
  date: string;
  paidFromType: AccountSourceType;
  paidFromId: string;
  invoiceRef?: string;
  sessionId: string;
  status: ExpenseStatus;
  recordedBy?: string;
  approvedBy?: string;
  createdAt: string;
}

// ============================================================
// v3.0 — الموظفون والرواتب
// ============================================================

export type Department = 'operations' | 'finance' | 'logistics' | 'management';
export type ContractType = 'permanent' | 'temporary' | 'seasonal';
export type EmployeeStatus = 'active' | 'on_leave' | 'terminated';

export interface Employee {
  id: string;
  code: string; // E-001
  fullName: string;
  nationalId?: string;
  jobTitle: string;
  department: Department;
  baseSalary: number;
  allowances: { housing: number; transport: number; food: number };
  hireDate: string;
  contractType: ContractType;
  bankId?: string;
  phone: string;
  status: EmployeeStatus;
  createdAt: string;
}

export type PayrollType = 'monthly' | 'bi_monthly';
export type PayrollStatus = 'draft' | 'approved' | 'paid';

export interface PayrollLine {
  employeeId: string;
  baseSalary: number;
  allowancesTotal: number;
  deductionsTotal: number;
  netSalary: number;
  attendanceDays: number;
  absenceDays: number;
  advanceDeducted: number;
  notes?: string;
}

export interface PayrollBatch {
  id: string;
  ref: string; // PR-2026-0001
  label: string;
  payrollType: PayrollType;
  periodFrom: string;
  periodTo: string;
  lines: PayrollLine[];
  totalAmount: number;
  paidFromType?: AccountSourceType;
  paidFromId?: string;
  status: PayrollStatus;
  sessionId: string;
  createdBy?: string;
  approvedBy?: string;
  paidAt?: string;
  createdAt: string;
}

// ============================================================
// v3.0 — سجل التدقيق
// ============================================================

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'export' | 'close' | 'transfer' | 'pay';

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  summary: string;
  performedBy: string;
  performedByRole: Role;
  performedAt: string;
  reason?: string;
}
