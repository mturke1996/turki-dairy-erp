// @ts-nocheck
import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportShell } from './ReportShell';
import { ar } from './arabicPDF';
import { PDF } from './pdfBase';
import { pdfFmtNum } from './pdfBrandKit';
import type { SessionSummary } from '@/lib/domain/calculations';

const s = StyleSheet.create({
  grid: { direction: 'rtl', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  stat: {
    width: '31.8%',
    borderWidth: 1,
    borderColor: PDF.border,
    borderRadius: 8,
    padding: 10,
    backgroundColor: PDF.white,
  },
  statTitle: { fontSize: 7.5, color: PDF.muted, marginBottom: 6, textAlign: 'right' },
  statValue: { fontSize: 14, fontWeight: 'bold', color: PDF.primary, textAlign: 'right' },
  statSub: { fontSize: 7.5, color: PDF.muted, marginTop: 4, textAlign: 'right' },

  section: { fontSize: 11, fontWeight: 'bold', color: PDF.primary, marginTop: 14, marginBottom: 8, textAlign: 'right', borderBottomWidth: 1.5, borderBottomColor: PDF.logoGreen, paddingBottom: 4 },

  head: { direction: 'rtl', flexDirection: 'row', backgroundColor: PDF.headerBg, paddingVertical: 6, paddingHorizontal: 8 },
  th: { color: PDF.white, fontSize: 8.5, fontWeight: 'bold' },
  row: { direction: 'rtl', flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: PDF.border },
  rowAlt: { backgroundColor: PDF.rowAlt },
  td: { fontSize: 8.5, color: PDF.text },

  carry: {
    direction: 'rtl',
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: PDF.primary,
    borderRadius: 8,
    backgroundColor: PDF.sunSoft,
  },
  carryCell: { flex: 1, alignItems: 'center' },
  carryLabel: { fontSize: 7.5, color: PDF.muted, marginBottom: 4 },
  carryValue: { fontSize: 13, fontWeight: 'bold', color: PDF.primary },
});

export type SessionClosingProps = {
  summary: SessionSummary;
  carryForward: { openingStock: number; payables: number; receivables: number };
  farmerBalances?: { name: string; balance: number }[];
  customerBalances?: { name: string; balance: number }[];
};

function Stat({ title, value, sub, color = PDF.primary }: any) {
  return (
    <View style={s.stat}>
      <Text style={s.statTitle}>{ar(title)}</Text>
      <Text style={[s.statValue, { color }]}>{ar(value)}</Text>
      {sub ? <Text style={s.statSub}>{ar(sub)}</Text> : null}
    </View>
  );
}

export function SessionClosingPDF({ summary, carryForward, farmerBalances = [], customerBalances = [] }: SessionClosingProps) {
  return (
    <ReportShell
      title="تقرير إغلاق فترة"
      subtitle={`الفترة: ${summary.session.label} (${summary.session.periodFrom} — ${summary.session.periodTo})`}
      summaryPrimaryDateLabel="تاريخ الإغلاق"
      metaCells={[
        { label: 'إجمالي المبيعات', moneyAmount: summary.salesRevenue },
        { label: 'صافي الربح', moneyAmount: summary.grossProfit },
        { label: 'هامش الربح', value: `${pdfFmtNum(summary.marginPct, 1)}%` },
        { label: 'الرصيد الختامي', value: `${pdfFmtNum(summary.closingStock, 0)} لتر` },
      ]}
    >
      <Text style={s.section}>{ar('الملخص التشغيلي')}</Text>
      <View style={s.grid}>
        <Stat title="عدد عمليات التوريد" value={pdfFmtNum(summary.supplyCount, 0)} sub={`${pdfFmtNum(summary.supplyQty, 0)} لتر`} color={PDF.logoGreen} />
        <Stat title="تكلفة التوريد" value={`${pdfFmtNum(summary.supplyCost, 0)} د.ل`} sub="إجمالي المشتريات" />
        <Stat title="عدد عمليات البيع" value={pdfFmtNum(summary.salesCount, 0)} sub={`${pdfFmtNum(summary.salesQty, 0)} لتر`} />
        <Stat title="تكلفة البضاعة المباعة" value={`${pdfFmtNum(summary.cogs, 0)} د.ل`} sub="COGS" />
        <Stat title="الربح الإجمالي" value={`${pdfFmtNum(summary.grossProfit, 0)} د.ل`} sub={`هامش ${pdfFmtNum(summary.marginPct, 1)}%`} color={PDF.logoGreen} />
        <Stat title="حركة المخزون" value={`${pdfFmtNum(summary.openingStock, 0)} ← ${pdfFmtNum(summary.closingStock, 0)}`} sub="افتتاحي ← ختامي" />
      </View>

      <Text style={s.section}>{ar('الحركة النقدية')}</Text>
      <View style={s.grid}>
        <Stat title="مدفوعات للفلاحين" value={`${pdfFmtNum(summary.farmerPayments, 0)} د.ل`} />
        <Stat title="تحصيلات من العملاء" value={`${pdfFmtNum(summary.customerReceipts, 0)} د.ل`} color={PDF.logoGreen} />
        <Stat title="صافي التدفق" value={`${pdfFmtNum(summary.customerReceipts - summary.farmerPayments, 0)} د.ل`} color={summary.customerReceipts - summary.farmerPayments >= 0 ? PDF.logoGreen : PDF.danger} />
      </View>

      {/* أرصدة مُرحّلة */}
      {farmerBalances.length > 0 && (
        <>
          <Text style={s.section}>{ar('أرصدة الفلاحين المستحقة')}</Text>
          <View style={s.head}>
            <Text style={[s.th, { flex: 3, textAlign: 'right' }]}>{ar('الفلاح')}</Text>
            <Text style={[s.th, { flex: 1.4, textAlign: 'left' }]}>{ar('الرصيد (د.ل)')}</Text>
          </View>
          {farmerBalances.slice(0, 12).map((b, i) => (
            <View key={i} style={[s.row, i % 2 === 1 && s.rowAlt]}>
              <Text style={[s.td, { flex: 3, textAlign: 'right' }]}>{ar(b.name)}</Text>
              <Text style={[s.td, { flex: 1.4, textAlign: 'left', fontWeight: 'bold' }]}>{ar(pdfFmtNum(b.balance))}</Text>
            </View>
          ))}
        </>
      )}

      {customerBalances.length > 0 && (
        <>
          <Text style={s.section}>{ar('أرصدة العملاء المدينة')}</Text>
          <View style={s.head}>
            <Text style={[s.th, { flex: 3, textAlign: 'right' }]}>{ar('العميل')}</Text>
            <Text style={[s.th, { flex: 1.4, textAlign: 'left' }]}>{ar('الرصيد (د.ل)')}</Text>
          </View>
          {customerBalances.slice(0, 12).map((b, i) => (
            <View key={i} style={[s.row, i % 2 === 1 && s.rowAlt]}>
              <Text style={[s.td, { flex: 3, textAlign: 'right' }]}>{ar(b.name)}</Text>
              <Text style={[s.td, { flex: 1.4, textAlign: 'left', fontWeight: 'bold' }]}>{ar(pdfFmtNum(b.balance))}</Text>
            </View>
          ))}
        </>
      )}

      {/* المرحّل للفترة القادمة */}
      <View style={s.carry} wrap={false}>
        <View style={s.carryCell}>
          <Text style={s.carryLabel}>{ar('مخزون مُرحّل')}</Text>
          <Text style={s.carryValue}>{ar(`${pdfFmtNum(carryForward.openingStock, 0)} لتر`)}</Text>
        </View>
        <View style={s.carryCell}>
          <Text style={s.carryLabel}>{ar('مستحقات الفلاحين')}</Text>
          <Text style={s.carryValue}>{ar(`${pdfFmtNum(carryForward.payables, 0)} د.ل`)}</Text>
        </View>
        <View style={s.carryCell}>
          <Text style={s.carryLabel}>{ar('ذمم العملاء')}</Text>
          <Text style={s.carryValue}>{ar(`${pdfFmtNum(carryForward.receivables, 0)} د.ل`)}</Text>
        </View>
      </View>
    </ReportShell>
  );
}
