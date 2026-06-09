import {
  LayoutDashboard,
  Droplets,
  ShoppingCart,
  Warehouse,
  Tractor,
  Building2,
  CalendarRange,
  BarChart3,
  Settings,
  Wallet,
  Receipt,
  Users,
  History,
  Scale,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import type { Permission } from '@/lib/domain/constants';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
  group: 'main' | 'finance' | 'parties' | 'system';
  permission?: Permission;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'لوحة التحكم',
    icon: LayoutDashboard,
    description: 'نظرة تنفيذية لحظية',
    group: 'main',
  },
  {
    href: '/supply',
    label: 'استلام الحليب',
    icon: Droplets,
    description: 'استلام الحليب الخام من الفلاحين',
    group: 'main',
    permission: 'supply.record',
  },
  {
    href: '/sales',
    label: 'المبيعات',
    icon: ShoppingCart,
    description: 'بيع بالجملة للعملاء',
    group: 'main',
    permission: 'sales.record',
  },
  {
    href: '/inventory',
    label: 'المخزون',
    icon: Warehouse,
    description: 'دفتر الحركة والرصيد',
    group: 'main',
  },
  {
    href: '/debts',
    label: 'الديون',
    icon: Scale,
    description: 'فلاحون · عملاء · موظفون',
    group: 'finance',
  },
  {
    href: '/treasury',
    label: 'الخزائن والبنوك',
    icon: Wallet,
    description: 'الأرصدة والحركات والتحويلات',
    group: 'finance',
    permission: 'vaults.manage',
  },
  {
    href: '/income',
    label: 'مدخول خارج الخدمة',
    icon: TrendingUp,
    description: 'إيرادات خارج الاستلام والبيع → الخزينة',
    group: 'finance',
  },
  {
    href: '/expenses',
    label: 'المصاريف',
    icon: Receipt,
    description: 'التصنيفات والصرف',
    group: 'finance',
    permission: 'expenses.record',
  },
  {
    href: '/hr',
    label: 'الموظفون والرواتب',
    icon: Users,
    description: 'الكوادر وكشوف الرواتب',
    group: 'finance',
    permission: 'hr.manage',
  },
  {
    href: '/farmers',
    label: 'الفلاحون',
    icon: Tractor,
    description: 'شبكة الموردين',
    group: 'parties',
  },
  {
    href: '/customers',
    label: 'العملاء',
    icon: Building2,
    description: 'المصانع والموزّعون',
    group: 'parties',
  },
  {
    href: '/sessions',
    label: 'الدورات',
    icon: CalendarRange,
    description: 'الدورة نصف الشهرية والأرشفة',
    group: 'system',
    permission: 'sessions.close',
  },
  {
    href: '/reports',
    label: 'التقارير',
    icon: BarChart3,
    description: 'تحليلات ومستندات PDF',
    group: 'system',
  },
  {
    href: '/audit',
    label: 'سجل النشاط',
    icon: History,
    description: 'كل حركة موثّقة',
    group: 'system',
  },
  {
    href: '/settings',
    label: 'الإعدادات',
    icon: Settings,
    description: 'الأسعار والتنبيهات',
    group: 'system',
  },
];

export const NAV_GROUPS: { id: NavItem['group']; label: string }[] = [
  { id: 'main', label: 'العمليات' },
  { id: 'finance', label: 'المالية' },
  { id: 'parties', label: 'الأطراف' },
  { id: 'system', label: 'النظام' },
];
