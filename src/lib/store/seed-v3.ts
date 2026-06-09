/**
 * بيانات تجريبية لوحدات v3.0 — الخزن، البنوك، الحركات، المصاريف، الموظفون، الرواتب، التدقيق.
 */

import type {
  AuditLog,
  BankAccount,
  CashMovement,
  CashTransfer,
  CashVault,
  Employee,
  Expense,
  ExpenseCategory,
  PayrollBatch,
  PayrollLine,
} from '@/lib/domain/types';

export interface SeedV3 {
  vaults: CashVault[];
  banks: BankAccount[];
  cashMovements: CashMovement[];
  transfers: CashTransfer[];
  expenseCategories: ExpenseCategory[];
  expenses: Expense[];
  employees: Employee[];
  payrollBatches: PayrollBatch[];
  auditLogs: AuditLog[];
}

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'cat-waste', name: 'هدر وتلف الحليب', group: 'operations', isRecurring: false },
  { id: 'cat-fuel', name: 'وقود ونقل', group: 'logistics', budgetMonthly: 9000, isRecurring: true },
  { id: 'cat-power', name: 'كهرباء وماء', group: 'operations', budgetMonthly: 4500, isRecurring: true },
  { id: 'cat-maint', name: 'صيانة معدات', group: 'operations', budgetMonthly: 3000, isRecurring: false },
  { id: 'cat-supplies', name: 'مستلزمات تشغيل', group: 'operations', budgetMonthly: 2500, isRecurring: false },
  { id: 'cat-transport-in', name: 'نقل الحليب من الفلاحين', group: 'logistics', budgetMonthly: 6000, isRecurring: true },
  { id: 'cat-rent', name: 'إيجار المقر', group: 'admin', budgetMonthly: 5000, isRecurring: true },
  { id: 'cat-comm', name: 'اتصالات وإنترنت', group: 'admin', budgetMonthly: 800, isRecurring: true },
  { id: 'cat-gov', name: 'رسوم وتراخيص', group: 'admin', isRecurring: false },
  { id: 'cat-salary', name: 'رواتب وأجور', group: 'labor', isRecurring: true },
  { id: 'cat-daily', name: 'مصاريف يومية', group: 'daily_life', isRecurring: true },
  { id: 'cat-barn', name: 'مصاريف الحوش', group: 'barn', isRecurring: true },
  { id: 'cat-osama', name: 'مصاريف أسامة', group: 'personal', isRecurring: true },
  { id: 'cat-oweis', name: 'مصاريف أويس', group: 'personal', isRecurring: true },
  { id: 'cat-factory-daily', name: 'مصاريف مصنعية يومية', group: 'factory', isRecurring: true },
  { id: 'cat-factory-maint', name: 'صيانة المصنع', group: 'factory', isRecurring: false },
  { id: 'cat-household', name: 'مصاريف منزلية', group: 'daily_life', isRecurring: true },
];

export function emptyV3(): SeedV3 {
  return {
    vaults: [],
    banks: [],
    cashMovements: [],
    transfers: [],
    expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
    expenses: [],
    employees: [],
    payrollBatches: [],
    auditLogs: [],
  };
}

export function generateSeedV3(sessionId: string): SeedV3 {
  const D = (d: number, h = 9) => `2026-06-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:00:00.000Z`;

  const vaults: CashVault[] = [
    { id: 'vault-main', code: 'V-01', name: 'الخزنة الرئيسية', openingBalance: 45000, isActive: true, responsible: 'أمين الصندوق', location: 'المكتب الرئيسي', minThreshold: 10000, createdAt: D(1) },
    { id: 'vault-field', code: 'V-02', name: 'خزنة الميدان', openingBalance: 12000, isActive: true, responsible: 'مشرف التجميع', location: 'مركز التجميع', minThreshold: 4000, createdAt: D(1) },
  ];

  const banks: BankAccount[] = [
    { id: 'bank-jumhouria', code: 'B-01', bankName: 'مصرف الجمهورية — فرع الميناء', accountNumber: '0021-554390', iban: 'LY83 0021 0000 0000 5543 90', accountHolder: 'مصنع التركي للحليب', openingBalance: 185000, isActive: true, branchName: 'الميناء', contactOfficer: 'إدارة الحسابات', createdAt: D(1) },
    { id: 'bank-tijari', code: 'B-02', bankName: 'المصرف التجاري الوطني', accountNumber: '0098-112045', accountHolder: 'مصنع التركي للحليب', openingBalance: 60000, isActive: true, branchName: 'المدينة', createdAt: D(1) },
  ];

  const employees: Employee[] = [
    { id: 'emp-1', code: 'E-001', fullName: 'صالح أبو بكر القذافي', jobTitle: 'مشرف التجميع', department: 'operations', baseSalary: 2200, allowances: { housing: 300, transport: 250, food: 150 }, hireDate: '2023-02-01', contractType: 'permanent', phone: '0913001001', status: 'active', createdAt: D(1) },
    { id: 'emp-2', code: 'E-002', fullName: 'عبدالله مفتاح الشريف', jobTitle: 'سائق نقل', department: 'logistics', baseSalary: 1600, allowances: { housing: 200, transport: 300, food: 120 }, hireDate: '2023-05-10', contractType: 'permanent', phone: '0913001002', status: 'active', createdAt: D(1) },
    { id: 'emp-3', code: 'E-003', fullName: 'مريم خالد الفيتوري', jobTitle: 'محاسبة', department: 'finance', baseSalary: 2400, allowances: { housing: 350, transport: 200, food: 150 }, hireDate: '2022-09-15', contractType: 'permanent', bankId: 'bank-jumhouria', phone: '0913001003', status: 'active', createdAt: D(1) },
    { id: 'emp-4', code: 'E-004', fullName: 'يوسف عمر بالحاج', jobTitle: 'عامل تجميع', department: 'operations', baseSalary: 1300, allowances: { housing: 150, transport: 150, food: 120 }, hireDate: '2024-01-20', contractType: 'permanent', phone: '0913001004', status: 'active', createdAt: D(1) },
    { id: 'emp-5', code: 'E-005', fullName: 'حسين علي الورفلي', jobTitle: 'سائق نقل', department: 'logistics', baseSalary: 1600, allowances: { housing: 200, transport: 300, food: 120 }, hireDate: '2024-03-01', contractType: 'temporary', phone: '0913001005', status: 'active', createdAt: D(1) },
    { id: 'emp-6', code: 'E-006', fullName: 'فاطمة الصديق الزروق', jobTitle: 'موظفة إدارية', department: 'management', baseSalary: 1800, allowances: { housing: 250, transport: 150, food: 120 }, hireDate: '2023-11-05', contractType: 'permanent', phone: '0913001006', status: 'on_leave', createdAt: D(1) },
  ];

  // كشف رواتب النصف الأول (مصروف)
  const payLines: PayrollLine[] = employees
    .filter((e) => e.status !== 'terminated')
    .map((e) => {
      const allowancesTotal = e.allowances.housing + e.allowances.transport + e.allowances.food;
      const absenceDays = e.status === 'on_leave' ? 6 : 0;
      const dailyRate = (e.baseSalary + allowancesTotal) / 30;
      const deductionsTotal = Math.round(absenceDays * dailyRate);
      const netSalary = e.baseSalary + allowancesTotal - deductionsTotal;
      return {
        employeeId: e.id,
        baseSalary: e.baseSalary,
        allowancesTotal,
        deductionsTotal,
        netSalary,
        attendanceDays: 30 - absenceDays,
        absenceDays,
        advanceDeducted: 0,
      };
    });

  const payrollTotal = payLines.reduce((s, l) => s + l.netSalary, 0);

  const payrollBatches: PayrollBatch[] = [
    {
      id: 'pr-1',
      ref: 'PR-2026-0001',
      label: 'رواتب يونيو 2026 — النصف الأول',
      payrollType: 'bi_monthly',
      periodFrom: '2026-06-01',
      periodTo: '2026-06-15',
      lines: payLines,
      totalAmount: payrollTotal,
      paidFromType: 'vault',
      paidFromId: 'vault-main',
      status: 'paid',
      sessionId,
      paidAt: D(15, 13),
      createdAt: D(14),
    },
  ];

  const expenses: Expense[] = [
    { id: 'exp-1', ref: 'EXP-2026-0001', categoryId: 'cat-fuel', amount: 3200, description: 'تعبئة وقود شاحنات التجميع', date: D(3), paidFromType: 'vault', paidFromId: 'vault-field', sessionId, status: 'approved', createdAt: D(3) },
    { id: 'exp-2', ref: 'EXP-2026-0002', categoryId: 'cat-power', amount: 2750, description: 'فاتورة كهرباء المستودع', date: D(6), paidFromType: 'bank', paidFromId: 'bank-jumhouria', invoiceRef: 'GECOL-44821', sessionId, status: 'approved', createdAt: D(6) },
    { id: 'exp-3', ref: 'EXP-2026-0003', categoryId: 'cat-transport-in', amount: 4100, description: 'نقل الحليب من مناطق الفلاحين', date: D(8), paidFromType: 'vault', paidFromId: 'vault-main', sessionId, status: 'approved', createdAt: D(8) },
    { id: 'exp-4', ref: 'EXP-2026-0004', categoryId: 'cat-maint', amount: 1850, description: 'صيانة خزانات التبريد', date: D(10), paidFromType: 'vault', paidFromId: 'vault-main', invoiceRef: 'MNT-091', sessionId, status: 'approved', createdAt: D(10) },
    { id: 'exp-5', ref: 'EXP-2026-0005', categoryId: 'cat-rent', amount: 5000, description: 'إيجار المقر — يونيو', date: D(2), paidFromType: 'bank', paidFromId: 'bank-jumhouria', sessionId, status: 'approved', createdAt: D(2) },
    { id: 'exp-6', ref: 'EXP-2026-0006', categoryId: 'cat-supplies', amount: 1450, description: 'مواد تعبئة وأدوات نظافة', date: D(12), paidFromType: 'vault', paidFromId: 'vault-main', sessionId, status: 'pending', createdAt: D(12) },
  ];

  // الحركات النقدية
  const cashMovements: CashMovement[] = [];
  let cmSeq = 1;
  const cm = (m: Omit<CashMovement, 'id' | 'ref' | 'sessionId' | 'createdAt'>) => {
    cashMovements.push({
      ...m,
      id: `cm-${cmSeq}`,
      ref: `CM-2026-${String(cmSeq).padStart(4, '0')}`,
      sessionId,
      createdAt: m.date,
    });
    cmSeq += 1;
  };

  // تحصيلات مبيعات
  cm({ movementType: 'sale_payment', sourceType: 'bank', sourceId: 'bank-jumhouria', amount: 48500, direction: 'in', referenceType: 'sale', description: 'تحصيل دفعة من مصنع الواحة للألبان', date: D(5, 11) });
  cm({ movementType: 'sale_payment', sourceType: 'vault', sourceId: 'vault-main', amount: 16200, direction: 'in', referenceType: 'sale', description: 'تحصيل نقدي من موزّع المدينة', date: D(7, 10) });
  cm({ movementType: 'sale_payment', sourceType: 'bank', sourceId: 'bank-tijari', amount: 27300, direction: 'in', referenceType: 'sale', description: 'تحصيل تحويل من مصنع النخيل', date: D(9, 12) });

  // دفعات فلاحين
  cm({ movementType: 'farmer_payout', sourceType: 'vault', sourceId: 'vault-main', amount: 18900, direction: 'out', referenceType: 'supply', description: 'دفعات مستحقات فلاحين', date: D(11, 14) });
  cm({ movementType: 'farmer_payout', sourceType: 'bank', sourceId: 'bank-jumhouria', amount: 22400, direction: 'out', referenceType: 'supply', description: 'تحويل مستحقات فلاحين', date: D(13, 11) });

  // مصاريف
  for (const e of expenses) {
    if (e.status === 'rejected' || e.status === 'pending') continue;
    if (e.nonCash || !e.paidFromType || !e.paidFromId) continue;
    cm({
      movementType: 'expense',
      sourceType: e.paidFromType,
      sourceId: e.paidFromId,
      amount: e.amount,
      direction: 'out',
      referenceType: 'expense',
      referenceId: e.id,
      description: e.description,
      date: e.date,
    });
  }

  // رواتب
  cm({
    movementType: 'salary',
    sourceType: 'vault',
    sourceId: 'vault-main',
    amount: payrollTotal,
    direction: 'out',
    referenceType: 'payroll',
    referenceId: 'pr-1',
    description: 'صرف رواتب النصف الأول من يونيو',
    date: D(15, 13),
  });

  // تحويل بين الخزنة الرئيسية والبنك
  const transfers: CashTransfer[] = [
    { id: 'tr-1', ref: 'TR-2026-0001', fromType: 'vault', fromId: 'vault-main', toType: 'bank', toId: 'bank-jumhouria', amount: 20000, date: D(14, 10), referenceDoc: 'DEP-7781', notes: 'إيداع فائض الخزنة في البنك', sessionId, createdAt: D(14, 10) },
  ];
  cm({ movementType: 'transfer_out', sourceType: 'vault', sourceId: 'vault-main', amount: 20000, direction: 'out', referenceType: 'transfer', referenceId: 'tr-1', description: 'تحويل إلى مصرف الجمهورية', date: D(14, 10) });
  cm({ movementType: 'transfer_in', sourceType: 'bank', sourceId: 'bank-jumhouria', amount: 20000, direction: 'in', referenceType: 'transfer', referenceId: 'tr-1', description: 'تحويل من الخزنة الرئيسية', date: D(14, 10) });

  const auditLogs: AuditLog[] = [
    { id: 'au-1', entityType: 'session', entityId: sessionId, action: 'login', summary: 'تسجيل دخول مدير النظام', performedBy: 'مدير النظام', performedByRole: 'admin', performedAt: D(15, 8) },
    { id: 'au-2', entityType: 'expense', entityId: 'exp-2', action: 'create', summary: 'تسجيل مصروف كهرباء بقيمة 2,750 د.ل', performedBy: 'محاسب', performedByRole: 'accountant', performedAt: D(6) },
    { id: 'au-3', entityType: 'payroll', entityId: 'pr-1', action: 'pay', summary: 'صرف كشف رواتب النصف الأول', performedBy: 'مدير النظام', performedByRole: 'admin', performedAt: D(15, 13) },
    { id: 'au-4', entityType: 'transfer', entityId: 'tr-1', action: 'transfer', summary: 'تحويل 20,000 د.ل من الخزنة الرئيسية إلى البنك', performedBy: 'محاسب', performedByRole: 'accountant', performedAt: D(14, 10) },
  ];

  return {
    vaults,
    banks,
    cashMovements,
    transfers,
    expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
    expenses,
    employees,
    payrollBatches,
    auditLogs,
  };
}
