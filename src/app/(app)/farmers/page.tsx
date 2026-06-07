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
import { useDerived } from '@/lib/store/use-derived';
import { LIVESTOCK_LABELS, QUALITY_VARIANT, FARMER_STATUS_LABELS } from '@/lib/domain/constants';
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
        q ? f.fullName.toLowerCase().includes(q) || f.code.toLowerCase().includes(q) || f.region.toLowerCase().includes(q) || f.phone.includes(q) : true,
      )
      .sort((a, b) => b.creditBalance - a.creditBalance);
  }, [d.farmers, query, status]);

  const activeCount = d.farmers.filter((f) => f.status === 'active').length;
  const totalSupplied = d.farmers.reduce((s, f) => s + f.totalSupplied, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="الأطراف"
        title="الفلاحون"
        description="شبكة موردي الحليب الخام — الأرصدة، التوريدات، وكشوف الحساب."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            إضافة فلاح
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="إجمالي الفلاحين" value={d.farmers.length} icon={Users} tone="navy" />
        <StatTile label="نشطون" value={activeCount} icon={Tractor} tone="meadow" />
        <StatTile label="إجمالي التوريد" value={<Liters value={totalSupplied} />} icon={Milk} tone="sun" />
        <StatTile label="مستحقات الفلاحين" value={<Money value={d.totals.payables} decimals={0} />} icon={Banknote} tone="rose" />
      </div>

      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="بحث بالاسم، الكود، المنطقة، الهاتف…"
                className="pr-9"
              />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="sm:w-44">
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

          {filtered.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الفلاح</TableHead>
                  <TableHead>المنطقة</TableHead>
                  <TableHead className="text-center">الماشية</TableHead>
                  <TableHead className="text-center">الجودة</TableHead>
                  <TableHead className="text-left">إجمالي التوريد</TableHead>
                  <TableHead className="text-left">الرصيد المستحق</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((f) => (
                  <TableRow key={f.id} className="cursor-pointer" onClick={() => setDetailId(f.id)}>
                    <TableCell>
                      <p className="text-[13px] font-semibold text-foreground">{f.fullName}</p>
                      <p className="font-mono text-[11px] text-muted-foreground" dir="ltr">{f.code}</p>
                    </TableCell>
                    <TableCell className="text-[12.5px] text-muted-foreground">{f.region}</TableCell>
                    <TableCell className="text-center text-[12px] text-muted-foreground">
                      {LIVESTOCK_LABELS[f.livestockType]} · {f.livestockCount}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={QUALITY_VARIANT[f.qualityTier]}>{f.qualityTier}</Badge>
                    </TableCell>
                    <TableCell className="text-left"><Liters value={f.totalSupplied} className="text-[12.5px]" /></TableCell>
                    <TableCell className="text-left">
                      <Money value={f.creditBalance} className={`text-[13px] font-semibold ${f.creditBalance > 0 ? 'text-navy-700' : 'text-muted-foreground'}`} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={STATUS_VARIANT[f.status]}>{FARMER_STATUS_LABELS[f.status]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
