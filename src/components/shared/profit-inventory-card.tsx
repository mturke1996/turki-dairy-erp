import { Coins, Info, TrendingUp, Warehouse } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Money, Liters } from '@/components/shared/money';
import { cn } from '@/lib/utils';

interface ProfitInventoryCardProps {
  /** الربح المحقّق (صافي أو مجمل حسب الصفحة) */
  profit: number;
  /** عنوان الربح، مثل «صافي ربح الفترة» */
  profitLabel: string;
  /** كمية الحليب المتبقية في المخزون (لتر) */
  stockQty: number;
  /** قيمة المخزون بسعر التكلفة (المتوسط المرجّح) */
  stockCostValue: number;
  /** متوسط سعر البيع الفعلي المحقّق لتقدير قيمة المخزون بسعر البيع */
  sellPrice: number;
  /** وصف اختياري أسفل العنوان */
  description?: string;
  className?: string;
}

/**
 * يعرض الربح المحقّق منفصلاً عن قيمة المخزون الحالي (كأصل غير محقّق)،
 * ثم الإجمالي التقديري (ربح + مخزون) بسعرَي التكلفة والبيع — مع توضيح أنهما مفصولان.
 */
export function ProfitInventoryCard({
  profit,
  profitLabel,
  stockQty,
  stockCostValue,
  sellPrice,
  description,
  className,
}: ProfitInventoryCardProps) {
  const stockSellValue = stockQty * sellPrice;
  const totalCost = profit + stockCostValue;
  const totalSell = profit + stockSellValue;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Coins className="h-4.5 w-4.5 text-meadow-600" />
          الربح + قيمة المخزون
        </CardTitle>
        {description ? <p className="text-[12px] text-muted-foreground">{description}</p> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* الربح المحقّق — منفصل */}
        <div className="flex items-center justify-between gap-3 rounded-xl bg-canvas-sunken/60 px-3.5 py-3">
          <span className="flex items-center gap-2 text-[12.5px] font-medium text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-meadow-600" />
            {profitLabel}
          </span>
          <Money
            value={profit}
            decimals={0}
            className={cn('text-[16px] font-bold', profit < 0 && 'text-rose-600')}
          />
        </div>

        {/* قيمة المخزون — منفصلة */}
        <div className="rounded-xl border border-border px-3.5 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-[12.5px] font-medium text-muted-foreground">
              <Warehouse className="h-4 w-4 text-navy-600" />
              قيمة الحليب في المخزون
            </span>
            <Liters value={stockQty} decimals={0} className="text-[12.5px] font-semibold" />
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-canvas-sunken/50 px-2.5 py-2">
              <p className="text-[11px] text-muted-foreground">بسعر التكلفة</p>
              <Money value={stockCostValue} decimals={0} className="text-[13.5px] font-bold" />
            </div>
            <div className="rounded-lg bg-canvas-sunken/50 px-2.5 py-2">
              <p className="text-[11px] text-muted-foreground">بسعر البيع (متوسط فعلي)</p>
              <Money value={stockSellValue} decimals={0} className="text-[13.5px] font-bold text-meadow-700" />
            </div>
          </div>
        </div>

        {/* الإجمالي التقديري — الربح + المخزون */}
        <div className="rounded-xl border border-dashed border-meadow-300 bg-meadow-50/50 px-3.5 py-3">
          <p className="text-[11.5px] font-semibold text-meadow-800">الإجمالي التقديري (ربح + مخزون)</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <p className="text-[11px] text-muted-foreground">+ مخزون بالتكلفة</p>
              <Money value={totalCost} decimals={0} className="text-[15px] font-bold" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">+ مخزون بسعر البيع الفعلي</p>
              <Money value={totalSell} decimals={0} className="text-[15px] font-bold text-meadow-700" />
            </div>
          </div>
        </div>

        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          قيمة المخزون أصل غير محقّق (حليب لم يُبَع بعد) وتُعرض منفصلة عن الربح المحقّق. «سعر البيع» متوسط فعلي من مبيعاتك، و«التكلفة» متوسط الشراء المرجّح. الإجمالي تقديري لإظهار القيمة الكامنة فقط.
        </p>
      </CardContent>
    </Card>
  );
}
