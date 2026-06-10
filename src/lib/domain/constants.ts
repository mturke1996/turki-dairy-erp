import type {
  AccountKey,
  AccountSourceType,
  AdjustmentReasonKind,
  AuditAction,
  CashMovementType,
  ContractType,
  CustomerType,
  Department,
  EmployeeStatus,
  ExpenseStatus,
  FarmerStatus,
  LivestockType,
  MilkShift,
  PaymentMethod,
  PayrollDebtMode,
  PayrollStatus,
  PayrollType,
  PriceTier,
  QualityTier,
  Role,
  SalaryType,
} from './types';

/** مصطلحات الواجهة — استلام الحليب بدل «توريد» */
export const MILK_SHIFT_LABELS: Record<MilkShift, string> = {
  morning: 'وجبة صباحية',
  evening: 'وجبة مسائية',
};

export const COPY = {
  collection: {
    title: 'استلام الحليب',
    short: 'استلام',
    record: 'تسجيل استلام',
    recordNew: 'تسجيل استلام جديد',
    plural: 'عمليات الاستلام',
    sessionPlural: 'استلامات الدورة',
    cost: 'تكلفة الاستلام',
    total: 'إجمالي الاستلام',
    value: 'قيمة الاستلام',
    count: 'عمليات الاستلام',
    farmer: 'الفلاح المورّد',
    empty: 'لا عمليات استلام في هذه الدورة',
    emptyHint: 'ابدأ بتسجيل أول عملية استلام.',
    success: 'تم تسجيل الاستلام',
    ledger: 'سجلّ الاستلام',
    topFarmers: 'أكثر مورّدين',
    movement: 'استلام حليب خام',
  },
  sale: {
    title: 'البيع',
    record: 'تسجيل بيع',
    plural: 'عمليات البيع',
  },
  session: {
    singular: 'الدورة',
    archived: 'الدورة المعروضة مؤرشفة. انتقل إلى الدورة النشطة لتسجيل عمليات جديدة.',
  },
} as const;

export const LIVESTOCK_LABELS: Record<LivestockType, string> = {
  cow: 'أبقار',
  sheep: 'أغنام',
  goat: 'ماعز',
  mixed: 'مختلط',
};

export const QUALITY_LABELS: Record<QualityTier, string> = {
  A: 'ممتازة (A)',
  B: 'جيدة (B)',
  C: 'مقبولة (C)',
};

export const FARMER_STATUS_LABELS: Record<FarmerStatus, string> = {
  active: 'نشط',
  suspended: 'موقوف',
  inactive: 'غير نشط',
};

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  factory: 'مصنع',
  retailer: 'تاجر تجزئة',
  distributor: 'موزّع',
  individual: 'فرد',
};

export const PRICE_TIER_LABELS: Record<PriceTier, string> = {
  wholesale: 'جملة',
  premium: 'مميّز',
  standard: 'قياسي',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'نقداً',
  bank: 'تحويل مصرفي',
  cheque: 'شيك',
};

export const DEBT_PARTY_LABELS: Record<'farmer' | 'customer' | 'employee' | 'external', string> = {
  farmer: 'فلاح',
  customer: 'عميل',
  employee: 'موظف',
  external: 'خارجي',
};

export const DEBT_PARTY_HINTS: Record<'farmer' | 'customer' | 'employee' | 'external', string> = {
  farmer: 'له = مستحق للفلاح، عليه = على الفلاح لنا',
  customer: 'عليه = على العميل لنا، له = مستحق للعميل',
  employee: 'عليه = سلفة/مستحق على الموظف، له = مستحق للموظف',
  external: 'دين خارج الفلاحين والعملاء والموظفين — مورد، جار، جهة أخرى',
};

export const ACCOUNT_LABELS: Record<AccountKey, string> = {
  inventory: 'حساب المخزون',
  farmer_payable: 'ديون الفلاحين',
  customer_receivable: 'ديون العملاء',
  revenue: 'إيرادات المبيعات',
  cogs: 'تكلفة البضاعة المباعة',
  cash: 'النقدية والمصارف',
  operating_expense: 'مصاريف تشغيلية',
  payroll_expense: 'رواتب وأجور',
  opening_equity: 'أرصدة افتتاحية',
  other_receivable: 'ذمم مدينة متنوعة',
  other_payable: 'ذمم دائنة متنوعة',
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'مدير النظام',
  accountant: 'محاسب',
  operator: 'مشغّل',
  hr_manager: 'مدير موارد بشرية',
  viewer: 'مطّلع',
};

export type Permission =
  | 'users.manage'
  | 'sessions.close'
  | 'supply.record'
  | 'sales.record'
  | 'vaults.manage'
  | 'expenses.record'
  | 'hr.manage'
  | 'payroll.pay'
  | 'reports.financial'
  | 'prices.edit'
  | 'data.export'
  | 'transactions.delete';

export const PERMISSION_MATRIX: Record<Permission, Role[]> = {
  'users.manage': ['admin'],
  'sessions.close': ['admin', 'accountant'],
  'supply.record': ['admin', 'accountant', 'operator'],
  'sales.record': ['admin', 'accountant', 'operator'],
  'vaults.manage': ['admin', 'accountant'],
  'expenses.record': ['admin', 'accountant', 'operator'],
  'hr.manage': ['admin', 'accountant', 'hr_manager'],
  'payroll.pay': ['admin', 'accountant', 'hr_manager'],
  'reports.financial': ['admin', 'accountant', 'viewer'],
  'prices.edit': ['admin', 'accountant'],
  'data.export': ['admin', 'accountant', 'hr_manager'],
  'transactions.delete': ['admin'],
};

export function can(role: Role, permission: Permission): boolean {
  return PERMISSION_MATRIX[permission]?.includes(role) ?? false;
}

export const QUALITY_VARIANT: Record<QualityTier, 'success' | 'info' | 'warning'> = {
  A: 'success',
  B: 'info',
  C: 'warning',
};

// ============================================================
// v3.0 — تسميات عربية
// ============================================================

export const ACCOUNT_SOURCE_LABELS: Record<AccountSourceType, string> = {
  vault: 'خزنة',
  bank: 'بنك',
};

export const CASH_MOVEMENT_LABELS: Record<CashMovementType, string> = {
  income: 'إيراد',
  expense: 'مصروف',
  transfer_in: 'تحويل وارد',
  transfer_out: 'تحويل صادر',
  sale_payment: 'تحصيل مبيعات',
  farmer_payout: 'دفعة فلاح',
  salary: 'راتب',
  adjustment: 'تسوية',
};

export const EXPENSE_GROUP_LABELS: Record<
  'operations' | 'logistics' | 'admin' | 'labor' | 'daily_life' | 'factory' | 'barn' | 'personal',
  string
> = {
  operations: 'تشغيل',
  logistics: 'لوجستيات',
  admin: 'إدارية',
  labor: 'عمالة',
  daily_life: 'حياة يومية',
  factory: 'مصنعية',
  barn: 'الحوش',
  personal: 'شخصية',
};

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  pending: 'قيد المراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
};

// ============================================================
// تسوية المخزون — أسباب منظّمة (هدر = خسارة تُرحَّل للمصاريف)
// ============================================================

/** تصنيف فئة مصروف الهدر الثابت — يُنشأ تلقائياً إن لم يوجد. */
export const WASTE_EXPENSE_CATEGORY_ID = 'cat-waste';
export const WASTE_EXPENSE_CATEGORY_NAME = 'هدر وتلف الحليب';

export interface AdjustmentReasonOption {
  value: string;
  label: string;
  kind: AdjustmentReasonKind;
  hint?: string;
}

/** أسباب النقص — أغلبها خسارة فعلية (loss) تُسجَّل كمصروف غير نقدي. */
export const ADJUSTMENT_DECREASE_REASONS: AdjustmentReasonOption[] = [
  { value: 'تلف وفساد', label: 'تلف وفساد', kind: 'loss', hint: 'حليب فسد أو تحمّض' },
  { value: 'انسكاب وفقد أثناء النقل', label: 'انسكاب / فقد بالنقل', kind: 'loss' },
  { value: 'رفض جودة', label: 'رفض جودة (شوائب/حموضة)', kind: 'loss' },
  { value: 'فقد أثناء التصنيع', label: 'فقد أثناء التصنيع', kind: 'loss' },
  { value: 'عيّنات وفحص مخبري', label: 'عيّنات وفحص مخبري', kind: 'loss' },
  { value: 'انتهاء صلاحية', label: 'انتهاء صلاحية', kind: 'loss' },
  { value: 'عطل تبريد', label: 'عطل تبريد / انقطاع كهرباء', kind: 'loss' },
  { value: 'سرقة أو فقد', label: 'سرقة / فقد غير مبرّر', kind: 'loss' },
  { value: 'هدر طبيعي', label: 'هدر طبيعي (تبخّر/التصاق)', kind: 'loss' },
  { value: 'جرد فعلي (نقص)', label: 'فرق جرد فعلي (نقص)', kind: 'correction', hint: 'تصحيح كمية فقط — بدون مصروف' },
  { value: 'تصحيح إدخال', label: 'تصحيح خطأ إدخال', kind: 'correction', hint: 'تصحيح كمية فقط — بدون مصروف' },
];

/** أسباب الزيادة — تصحيحات فقط (لا مصروف). */
export const ADJUSTMENT_INCREASE_REASONS: AdjustmentReasonOption[] = [
  { value: 'جرد فعلي (زيادة)', label: 'فرق جرد فعلي (زيادة)', kind: 'correction' },
  { value: 'تصحيح إدخال', label: 'تصحيح خطأ إدخال', kind: 'correction' },
  { value: 'مرتجع للمخزون', label: 'مرتجع للمخزون', kind: 'correction' },
];

/** يبحث عن تصنيف السبب من نصّه (للحفاظ على التوافق مع التسجيلات القديمة). */
export function resolveAdjustmentReasonKind(reason: string, quantity: number): AdjustmentReasonKind {
  if (quantity > 0) return 'correction';
  const all = [...ADJUSTMENT_DECREASE_REASONS, ...ADJUSTMENT_INCREASE_REASONS];
  const match = all.find((r) => r.value === reason || r.label === reason);
  if (match) return match.kind;
  // أسباب قديمة محتملة
  if (/تصحيح|جرد/.test(reason)) return 'correction';
  return 'loss';
}

export const DEPARTMENT_LABELS: Record<Department, string> = {
  operations: 'العمليات',
  finance: 'المالية',
  logistics: 'اللوجستيات',
  management: 'الإدارة',
};

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  permanent: 'دائم',
  temporary: 'مؤقت',
  seasonal: 'موسمي',
};

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: 'نشط',
  on_leave: 'في إجازة',
  terminated: 'منتهي الخدمة',
};

export const SALARY_TYPE_LABELS: Record<SalaryType, string> = {
  monthly: 'شهري',
  daily: 'يومي',
  half_month: 'نصف شهر',
};

/** تسمية حقل baseSalary حسب نوع الراتب */
export const SALARY_BASE_LABELS: Record<SalaryType, string> = {
  monthly: 'الراتب الشهري',
  daily: 'الأجر اليومي',
  half_month: 'أجر نصف الشهر',
};

export const PAYROLL_TYPE_LABELS: Record<PayrollType, string> = {
  monthly: 'كشف شهري',
  bi_monthly: 'كشف نصف شهر',
  daily: 'كشف يومي',
};

export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  draft: 'مسودة',
  approved: 'معتمد',
  paid: 'مصروف',
};

export const PAYROLL_DEBT_MODE_LABELS: Record<PayrollDebtMode, string> = {
  deduct: 'خصم من الراتب',
  carry_forward: 'ترحيل للفترة القادمة',
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create: 'إنشاء',
  update: 'تعديل',
  delete: 'حذف',
  login: 'دخول',
  export: 'تصدير',
  close: 'إغلاق',
  transfer: 'تحويل',
  pay: 'صرف',
};
