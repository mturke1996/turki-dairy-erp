import type {
  AccountKey,
  AccountSourceType,
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
  PayrollStatus,
  PriceTier,
  QualityTier,
  Role,
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

export const ACCOUNT_LABELS: Record<AccountKey, string> = {
  inventory: 'حساب المخزون',
  farmer_payable: 'مستحقات الفلاحين',
  customer_receivable: 'ذمم العملاء',
  revenue: 'إيرادات المبيعات',
  cogs: 'تكلفة البضاعة المباعة',
  cash: 'النقدية والمصارف',
  operating_expense: 'مصاريف تشغيلية',
  payroll_expense: 'رواتب وأجور',
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

export const EXPENSE_GROUP_LABELS: Record<'operations' | 'logistics' | 'admin' | 'labor', string> = {
  operations: 'تشغيل',
  logistics: 'لوجستيات',
  admin: 'إدارية',
  labor: 'عمالة',
};

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  pending: 'قيد المراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
};

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

export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  draft: 'مسودة',
  approved: 'معتمد',
  paid: 'مصروف',
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
