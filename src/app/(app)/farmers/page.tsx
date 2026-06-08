'use client';

import { useMemo, useState } from 'react';
import { Plus, Search, Tractor, Users, Banknote, Milk } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatTile } from '@/components/shared/stat-tile';
import { Money, Liters } from '@/components/shared/money';
import { EmptyState } from '@/components/shared/empty-state';
import { FarmerFormDialog } from '@/components/farmers/farmer-form-dialog';
import { FarmerDetailDialog } from '@/components/farmers/farmer-detail-dialog';
import { FarmerListCard, FarmerStatusChips } from '@/components/farmers/farmer-list-card';
import { useDerived } from '@/lib/store/use-derived';
import { QUALITY_VARIANT, FARMER_STATUS_LABELS } from '@/lib/domain/constants';
import type { FarmerStatus } from '@/lib/domain/types';

const STATUS_VARIANT = { active: 'success', suspended: 'warning', inactive: 'neutral' } as const;

export default function FarmersPage() {
  const d = useDerived();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | FarmerStatus>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return d.farmers
      .filter((f) => (status === 'all' ? true : f.status === status))
      .filter((f) =>
        q
          ? f.fullName.toLowerCase().includes(q) ||
            f.code.toLowerCase().includes(q) ||
            f.region.toLowerCase().includes(q) ||
            f.phone.includes(q)
          : true,
      )
      .sort((a, b) => b.creditBalance - a.creditBalance);
  }, [d.farmers, query, status]);

  const statusCounts = useMemo(
    () => ({
      all: d.farmers.length,
      active: d.farmers.filter((f) => f.status === 'active').length,
      suspended: d.farmers.filter((f) => f.status === 'suspended').length,
      inactive: d.farmers.filter((f) => f.status === 'inactive').length,
    }),
    [d.farmers],
  );

  const activeCount = statusCounts.active;
  const totalSupplied = d.farmers.reduce((s, f) => s + f.totalSupplied, 0);

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="الأطراف"
        title="الفلاحون"
        description="شبكة موردي الحليب الخام — الأرصدة، عمليات الاستلام، وكشوف الحساب."
        actions={
          <Button type="button" className="w-full sm:w-auto" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            إضافة فلاح
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile label="إجمالي الفلاحين" value={d.farmers.length} icon={Users} tone="navy" />
        <StatTile label="نشطون" value={activeCount} icon={Tractor} tone="meadow" />
        <StatTile label="إجمالي الاستلام" value={<Liters value={totalSupplied} decimals={0} />} icon={Milk} tone="sun" />
        <StatTile label="مستحقات الفلاحين" value={<Money value={d.totals.payables} decimals={0} />} icon={Banknote} tone="rose" />
      </div>

      <Card className="overflow-hidden">
        <CardContent className="space-y-4 pt-4 sm:pt-5">
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="بحث بالاسم، الكود، المنطقة، الهاتف…"
                  className="h-11 pr-9 text-[14px] sm:h-10"
                />
              </div>
              <div className="hidden shrink-0 md:block md:w-44">
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الحالات</SelectItem>
                    {(Object.keys(FARMER_STATUS_LABELS) as FarmerStatus[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {FARMER_STATUS_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <FarmerStatusChips value={status} onChange={setStatus} counts={statusCounts} />
          </div>

          {filtered.length > 0 ? (
            <p className="text-[11.5px] text-muted-foreground">
              {filtered.length} نتيجة
              {query.trim() ? ` — «${query.trim()}»` : ''}
            </p>
          ) : null}

          {filtered.length ? (
            <>
              {/* جوال — بطاقات */}
              <div className="space-y-3 md:hidden">
                {filtered.map((f) => (
                  <FarmerListCard key={f.id} farmer={f} onClick={() => setDetailId(f.id)} />
                ))}
              </div>

              {/* سطح المكتب — جدول */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الفلاح</TableHead>
                      <TableHead>المنطقة</TableHead>
                      <TableHead className="text-center">الحساب البنكي</TableHead>
                      <TableHead className="text-center">الجودة</TableHead>
                      <TableHead className="text-left">إجمالي الاستلام</TableHead>
                      <TableHead className="text-left">الرصيد المستحق</TableHead>
                      <TableHead className="text-center">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((f) => (
                      <TableRow key={f.id} className="cursor-pointer" onClick={() => setDetailId(f.id)}>
                        <TableCell>
                          <p className="text-[13px] font-semibold text-foreground">{f.fullName}</p>
                          <p className="font-mono text-[11px] text-muted-foreground" dir="ltr">
                            {f.code}
                          </p>
                        </TableCell>
                        <TableCell className="text-[12.5px] text-muted-foreground">{f.region}</TableCell>
                        <TableCell className="text-center text-[11.5px] text-muted-foreground">
                          {f.bankName || f.bankAccount || f.iban ? (
                            <div className="space-y-0.5">
                              {f.bankName ? <p className="text-[12px] text-foreground">{f.bankName}</p> : null}
                              <p className="font-mono" dir="ltr">
                                {f.bankAccount ?? (f.iban ? f.iban.slice(0, 18) + '…' : '—')}
                              </p>
                            </div>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={QUALITY_VARIANT[f.qualityTier]}>{f.qualityTier}</Badge>
                        </TableCell>
                        <TableCell className="text-left">
                          <Liters value={f.totalSupplied} className="text-[12.5px]" />
                        </TableCell>
                        <TableCell className="text-left">
                          <Money
                            value={f.creditBalance}
                            className={`text-[13px] font-semibold ${f.creditBalance > 0 ? 'text-navy-700' : 'text-muted-foreground'}`}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={STATUS_VARIANT[f.status]}>{FARMER_STATUS_LABELS[f.status]}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <EmptyState icon={Tractor} title="لا فلاحين مطابقين" description="جرّب تعديل البحث أو أضف فلاحاً جديداً." />
          )}
        </CardContent>
      </Card>

      <FarmerFormDialog open={addOpen} onOpenChange={setAddOpen} />
      <FarmerDetailDialog farmerId={detailId} open={detailId !== null} onOpenChange={(o) => !o && setDetailId(null)} />
    </div>
  );
}
