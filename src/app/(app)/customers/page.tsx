'use client';

import { useMemo, useState } from 'react';
import { Plus, Search, Building2, Users, Wallet, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatTile } from '@/components/shared/stat-tile';
import { FilterBar } from '@/components/shared/filter-bar';
import { Money } from '@/components/shared/money';
import { EmptyState } from '@/components/shared/empty-state';
import { CustomerFormDialog } from '@/components/customers/customer-form-dialog';
import { CustomerDetailDialog } from '@/components/customers/customer-detail-dialog';
import {
  CustomerListCard,
  CustomerQuickChips,
  CustomerTypeChips,
  type CustomerQuickFilter,
} from '@/components/customers/customer-list-card';
import { useDerived } from '@/lib/store/use-derived';
import { useCanEdit } from '@/lib/store/use-permission';
import { CUSTOMER_TYPE_LABELS } from '@/lib/domain/constants';
import type { CustomerType } from '@/lib/domain/types';
import { formatNumber } from '@/lib/utils';

export default function CustomersPage() {
  const d = useDerived();
  const canEdit = useCanEdit();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | CustomerType>('all');
  const [quick, setQuick] = useState<CustomerQuickFilter>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const quickCounts = useMemo(
    () => ({
      all: d.customers.length,
      active: d.customers.filter((c) => !c.onHold && !(c.creditLimit > 0 && c.outstanding > c.creditLimit) && c.overdueAmount <= 0).length,
      overdue: d.customers.filter((c) => c.overdueAmount > 0).length,
      on_hold: d.customers.filter((c) => c.onHold).length,
    }),
    [d.customers],
  );

  const typeCounts = useMemo(() => {
    const counts = { all: d.customers.length } as Record<'all' | CustomerType, number>;
    (Object.keys(CUSTOMER_TYPE_LABELS) as CustomerType[]).forEach((k) => {
      counts[k] = d.customers.filter((c) => c.entityType === k).length;
    });
    return counts;
  }, [d.customers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return d.customers
      .filter((c) => (type === 'all' ? true : c.entityType === type))
      .filter((c) => {
        if (quick === 'all') return true;
        if (quick === 'on_hold') return c.onHold;
        if (quick === 'overdue') return c.overdueAmount > 0;
        return !c.onHold && c.overdueAmount <= 0 && !(c.creditLimit > 0 && c.outstanding > c.creditLimit);
      })
      .filter((c) =>
        q ? c.entityName.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.phone.includes(q) : true,
      )
      .sort((a, b) => b.outstanding - a.outstanding);
  }, [d.customers, query, type, quick]);

  const overdueCount = d.customers.filter((c) => c.overdueAmount > 0).length;
  const onHoldCount = d.customers.filter((c) => c.onHold).length;

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="الأطراف"
        title="العملاء"
        description="المصانع والموزّعون وتجار التجزئة — الديون، أعمار الديون، وكشوف الحساب."
        actions={
          canEdit ? (
            <Button type="button" className="w-full sm:w-auto" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              إضافة عميل
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile label="إجمالي العملاء" value={d.customers.length} icon={Users} tone="navy" />
        <StatTile label="ديون قائمة" value={<Money value={d.totals.receivables} decimals={0} />} icon={Wallet} tone="meadow" />
        <StatTile label="مبالغ متأخرة" value={<Money value={d.totals.overdue} decimals={0} />} icon={AlertTriangle} tone="rose" hint={`${overdueCount} عميل`} />
        <StatTile label="حسابات مجمّدة" value={onHoldCount} icon={Building2} tone="sun" />
      </div>

      <Card className="overflow-hidden">
        <CardContent className="space-y-4 pt-4 sm:pt-5">
          <FilterBar>
            <div className="relative min-w-0 flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="بحث بالاسم، الكود، الهاتف…"
                className="h-11 pr-9 text-[14px] sm:h-10"
              />
            </div>
            <div className="hidden shrink-0 sm:flex sm:gap-2">
              <Select value={quick} onValueChange={(v) => setQuick(v as CustomerQuickFilter)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="overdue">متأخر</SelectItem>
                  <SelectItem value="on_hold">مجمّد</SelectItem>
                </SelectContent>
              </Select>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأنواع</SelectItem>
                  {(Object.keys(CUSTOMER_TYPE_LABELS) as CustomerType[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {CUSTOMER_TYPE_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FilterBar>
          <CustomerQuickChips value={quick} onChange={setQuick} counts={quickCounts} />
          <CustomerTypeChips value={type} onChange={setType} counts={typeCounts} />

          {filtered.length > 0 ? (
            <p className="text-[11.5px] text-muted-foreground">
              {filtered.length} نتيجة
              {query.trim() ? ` — «${query.trim()}»` : ''}
            </p>
          ) : null}

          {filtered.length ? (
            <>
              <div className="space-y-3 md:hidden">
                {filtered.map((c) => (
                  <CustomerListCard
                    key={c.id}
                    customer={{
                      id: c.id,
                      entityName: c.entityName,
                      code: c.code,
                      phone: c.phone,
                      entityType: c.entityType,
                      totalRevenue: c.totalRevenue,
                      outstanding: c.outstanding,
                      overdueAmount: c.overdueAmount,
                      creditLimit: c.creditLimit,
                      creditUtilization: c.creditUtilization,
                      onHold: c.onHold,
                    }}
                    onClick={() => setDetailId(c.id)}
                  />
                ))}
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>العميل</TableHead>
                      <TableHead className="text-center">النوع</TableHead>
                      <TableHead className="text-left">إجمالي المبيعات</TableHead>
                      <TableHead className="text-left">الدين</TableHead>
                      <TableHead className="text-center">استخدام الائتمان</TableHead>
                      <TableHead className="text-center">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => {
                      const overLimit = c.creditLimit > 0 && c.outstanding > c.creditLimit;
                      return (
                        <TableRow key={c.id} className="cursor-pointer" onClick={() => setDetailId(c.id)}>
                          <TableCell>
                            <p className="text-[13px] font-semibold text-foreground">{c.entityName}</p>
                            <p className="font-mono text-[11px] text-muted-foreground" dir="ltr">{c.code}</p>
                          </TableCell>
                          <TableCell className="text-center text-[12px] text-muted-foreground">{CUSTOMER_TYPE_LABELS[c.entityType]}</TableCell>
                          <TableCell className="text-left"><Money value={c.totalRevenue} decimals={0} className="text-[12.5px]" /></TableCell>
                          <TableCell className="text-left">
                            <Money value={c.outstanding} className={`text-[13px] font-semibold ${c.overdueAmount > 0 ? 'text-rose-600' : 'text-foreground'}`} />
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`text-[12px] font-semibold tabular ${overLimit ? 'text-rose-600' : 'text-muted-foreground'}`} dir="ltr">
                              {formatNumber(c.creditUtilization, 0)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {c.onHold ? (
                              <Badge variant="danger">مجمّد</Badge>
                            ) : overLimit ? (
                              <Badge variant="warning">تجاوز الحد</Badge>
                            ) : (
                              <Badge variant="success">نشط</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <EmptyState icon={Building2} title="لا عملاء مطابقين" description="جرّب تعديل البحث أو أضف عميلاً جديداً." />
          )}
        </CardContent>
      </Card>

      <CustomerFormDialog open={addOpen} onOpenChange={setAddOpen} />
      <CustomerDetailDialog customerId={detailId} open={detailId !== null} onOpenChange={(o) => !o && setDetailId(null)} />
    </div>
  );
}
