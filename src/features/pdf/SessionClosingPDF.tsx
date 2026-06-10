// @ts-nocheck
import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportShell } from './ReportShell';
import { ar, pdfDisplayValue } from './arabicPDF';
import { PDF, PDF_PAGINATION, pdfBase } from './pdfBase';
import { PdfMoneyText, pdfFmtNum, pdfFmtLiters } from './pdfBrandKit';
import { PdfTh, PdfTd, PdfTdMoney } from './PdfTable';
import type { SessionSummary } from '@/lib/domain/calculations';

const s = StyleSheet.create({
  grid: { direction: 'rtl', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  stat: {
    width: '31.8%',
    borderWidth: 0.75,
    borderColor: PDF.border,
    borderTopWidth: 2,
    borderTopColor: PDF.accent,
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: PDF.white,
  },
  statTitle: { fontSize: 7.5, color: PDF.muted, marginBottom: 6, textAlign: 'right', lineHeight: 1.3 },
  statValue: { fontSize: 14, fontWeight: 'bold', color: PDF.primary, textAlign: 'right', lineHeight: 1.3 },
  statSub: { fontSize: 7.5, color: PDF.muted, marginTop: 4, textAlign: 'right', lineHeight: 1.3 },

  section: { fontSize: 11.5, fontWeight: 'bold', color: PDF.primary, marginTop: 20, marginBottom: 10, textAlign: 'right', borderBottomWidth: 0.75, borderBottomColor: PDF.border, borderRightWidth: 3, borderRightColor: PDF.accent, paddingBottom: 5, paddingRight: 8, lineHeight: 1.35 },

  carry: {
    direction: 'ltr',
    flexDirection: 'row-reverse',
    gap: 0,
    marginTop: 20,
    borderWidth: 0.75,
    borderColor: PDF.border,
    borderTopWidth: 2.5,
    borderTopColor: PDF.accent,
    backgroundColor: PDF.paleGold,
  },
  carryCell: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10, borderLeftWidth: 0.5, borderLeftColor: PDF.border },
  carryLabel: { fontSize: 7.5, color: PDF.muted, marginBottom: 5, lineHeight: 1.3 },
  carryValue: { fontSize: 13, fontWeight: 'bold', color: PDF.primary, lineHeight: 1.3, direction: 'ltr', textAlign: 'center' },
});

export type SessionClosingProps = {
  summary: SessionSummary;
  carryForward: { openingStock: number; payables: number; receivables: number };
  farmerBalances?: { name: string; balance: number }[];
  customerBalances?: { name: string; balance: number }[];
  employeeBalances?: { name: string; balance: number }[];
};

function Stat({ title, value, sub, color = PDF.primary, moneyAmount }: { title: string; value?: string; sub?: string; color?: string; moneyAmount?: number }) {
  return (
    <View style={s.stat} wrap={false}>
      <Text style={s.statTitle}>{ar(title)}</Text>
      {moneyAmount != null && Number.isFinite(moneyAmount) ? (
        <View style={{ alignItems: 'flex-end' }}>
          <PdfMoneyText amount={moneyAmount} size="sm" color={color} />
        </View>
      ) : (
        <Text style={[s.statValue, { color, direction: 'ltr', textAlign: 'right' }]}>{pdfDisplayValue(value ?? '')}</Text>
      )}
      {sub ? <Text style={s.statSub}>{ar(sub)}</Text> : null}
    </View>
  );
}

export function SessionClosingPDF({ summary, carryForward, farmerBalances = [], customerBalances = [], employeeBalances = [] }: SessionClosingProps) {
  return (
    <ReportShell
      title="تقرير إغلاق فترة"
      subtitle={`الفترة: ${summary.session.label} (${summary.session.periodFrom} — ${summary.session.periodTo})`}
      summaryPrimaryDateLabel="تاريخ الإغلاق"
      metaCells={[
        { label: 'إجمالي المبيعات', moneyAmount: summary.salesRevenue },
        { label: 'الربح الإجمالي', moneyAmount: summary.grossProfit },
        { label: 'هامش الربح', value: `${pdfFmtNum(summary.marginPct, 1)}%` },
        { label: 'الرصيد الختامي', value: pdfFmtLiters(summary.closingStock, 0) },
      ]}
    >
      <Text style={s.section}>{ar('الملخص التشغيلي')}</Text>
      <View style={s.grid}>
        <Stat title="عدد عمليات الاستلام" value={pdfFmtNum(summary.supplyCount, 0)} sub={pdfFmtLiters(summary.supplyQty, 0)} color={PDF.logoGreen} />
        <Stat title="تكلفة الاستلام" moneyAmount={summary.supplyCost} sub="إجمالي المشتريات" />
        <Stat title="عدد عمليات البيع" value={pdfFmtNum(summary.salesCount, 0)} sub={pdfFmtLiters(summary.salesQty, 0)} />
        <Stat title="تكلفة البضاعة المباعة" moneyAmount={summary.cogs} sub="COGS" />
        <Stat title="الربح الإجمالي" moneyAmount={summary.grossProfit} sub={`هامش ${pdfFmtNum(summary.marginPct, 1)}%`} color={PDF.logoGreen} />
        <Stat title="حركة المخزون" value={`${pdfFmtNum(summary.openingStock, 0)} ← ${pdfFmtNum(summary.closingStock, 0)}`} sub="افتتاحي ← ختامي" />
      </View>

      <Text style={s.section}>{ar('الحركة النقدية')}</Text>
      <View style={s.grid}>
        <Stat title="مدفوعات للفلاحين" moneyAmount={summary.farmerPayments} />
        <Stat title="تحصيلات من العملاء" moneyAmount={summary.customerReceipts} color={PDF.logoGreen} />
        <Stat title="صافي التدفق" moneyAmount={summary.customerReceipts - summary.farmerPayments} color={summary.customerReceipts - summary.farmerPayments >= 0 ? PDF.logoGreen : PDF.danger} />
      </View>

      {/* أرصدة مُرحّلة */}
      {farmerBalances.length > 0 && (
        <>
          <Text style={s.section}>{ar('ديون الفلاحين')}</Text>
          <View style={pdfBase.tableHead} minPresenceAhead={PDF_PAGINATION.tableHead}>
            <PdfTh flex={3}>الفلاح</PdfTh>
            <PdfTh flex={1.4} kind="money">الرصيد</PdfTh>
          </View>
          {farmerBalances.slice(0, 12).map((b, i) => (
            <View key={i} style={[pdfBase.tableRow, i % 2 === 1 && pdfBase.rowEven]} wrap={false}>
              <PdfTd flex={3}>{b.name}</PdfTd>
              <PdfTdMoney flex={1.4} amount={b.balance} />
            </View>
          ))}
        </>
      )}

      {customerBalances.length > 0 && (
        <>
          <Text style={s.section}>{ar('أرصدة العملاء المدينة')}</Text>
          <View style={pdfBase.tableHead} minPresenceAhead={PDF_PAGINATION.tableHead}>
            <PdfTh flex={3}>العميل</PdfTh>
            <PdfTh flex={1.4} kind="money">الرصيد</PdfTh>
          </View>
          {customerBalances.slice(0, 12).map((b, i) => (
            <View key={i} style={[pdfBase.tableRow, i % 2 === 1 && pdfBase.rowEven]} wrap={false}>
              <PdfTd flex={3}>{b.name}</PdfTd>
              <PdfTdMoney flex={1.4} amount={b.balance} />
            </View>
          ))}
        </>
      )}

      {employeeBalances.length > 0 && (
        <>
          <Text style={s.section}>{ar('سلف الموظفين المُرحّلة')}</Text>
          <View style={pdfBase.tableHead} minPresenceAhead={PDF_PAGINATION.tableHead}>
            <PdfTh flex={3}>الموظف</PdfTh>
            <PdfTh flex={1.4} kind="money">الرصيد</PdfTh>
          </View>
          {employeeBalances.slice(0, 12).map((b, i) => (
            <View key={i} style={[pdfBase.tableRow, i % 2 === 1 && pdfBase.rowEven]} wrap={false}>
              <PdfTd flex={3}>{b.name}</PdfTd>
              <PdfTdMoney flex={1.4} amount={b.balance} />
            </View>
          ))}
        </>
      )}

      {/* المرحّل للفترة القادمة */}
      <View style={s.carry} wrap={false}>
        <View style={s.carryCell}>
          <Text style={s.carryLabel}>{ar('مخزون مُرحّل')}</Text>
          <Text style={s.carryValue}>{pdfFmtLiters(carryForward.openingStock, 0)}</Text>
        </View>
        <View style={s.carryCell}>
          <Text style={s.carryLabel}>{ar('ديون الفلاحين')}</Text>
          <PdfMoneyText amount={carryForward.payables} size="sm" />
        </View>
        <View style={s.carryCell}>
          <Text style={s.carryLabel}>{ar('ديون لنا')}</Text>
          <PdfMoneyText amount={carryForward.receivables} size="sm" />
        </View>
      </View>
    </ReportShell>
  );
}
