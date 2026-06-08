// @ts-nocheck
import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportShell } from './ReportShell';
import { ar } from './arabicPDF';
import { PDF } from './pdfBase';
import { PdfMoneyText, pdfFmtNum } from './pdfBrandKit';
import { ACCOUNT_LABELS } from '@/lib/domain/constants';
import type { TrialBalanceRow, ProfitAndLoss } from '@/lib/domain/accounting';
import type { AgingBuckets } from '@/lib/domain/calculations';

const s = StyleSheet.create({
  section: {
    fontSize: 11,
    fontWeight: 'bold',
    color: PDF.primary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'right',
    borderBottomWidth: 1.5,
    borderBottomColor: PDF.logoGreen,
    paddingBottom: 4,
  },
  head: { direction: 'rtl', flexDirection: 'row', backgroundColor: PDF.headerBg, paddingVertical: 7, paddingHorizontal: 8 },
  th: { color: PDF.white, fontSize: 8.5, fontWeight: 'bold' },
  row: { direction: 'rtl', flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: PDF.border },
  rowAlt: { backgroundColor: PDF.rowAlt },
  td: { fontSize: 8.5, color: PDF.text },
  totalRow: {
    direction: 'rtl',
    flexDirection: 'row',
    backgroundColor: PDF.logoGreenSoft,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1.5,
    borderTopColor: PDF.primary,
  },
  tf: { fontSize: 9, fontWeight: 'bold', color: PDF.primary },

  pnlRow: {
    direction: 'rtl',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF.border,
  },
  pnlLabel: { fontSize: 9.5, color: PDF.text },
  pnlStrong: {
    direction: 'rtl',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: PDF.sunSoft,
    borderRadius: 6,
    marginTop: 4,
  },
});

export type FinancialReportProps = {
  trialBalance: { rows: TrialBalanceRow[]; totalDebit: number; totalCredit: number; balanced: boolean };
  pnl: ProfitAndLoss;
  aging: AgingBuckets;
  asOfLabel?: string;
};

export function FinancialReportPDF({ trialBalance, pnl, aging, asOfLabel }: FinancialReportProps) {
  return (
    <ReportShell
      title="القوائم المالية"
      subtitle={asOfLabel ? `حتى ${asOfLabel}` : 'ملخّص مالي'}
      summaryPrimaryDateLabel="تاريخ التقرير"
      metaCells={[
        { label: 'الإيرادات', moneyAmount: pnl.revenue },
        { label: 'تكلفة المبيعات', moneyAmount: pnl.cogs },
        { label: 'الربح الإجمالي', moneyAmount: pnl.grossProfit },
        { label: 'هامش الربح', value: `${pdfFmtNum(pnl.marginPct, 1)}%` },
      ]}
    >
      {/* ميزان المراجعة */}
      <Text style={s.section}>{ar('ميزان المراجعة')}</Text>
      <View style={s.head}>
        <Text style={[s.th, { flex: 2.4, textAlign: 'right' }]}>{ar('الحساب')}</Text>
        <Text style={[s.th, { flex: 1.3, textAlign: 'left' }]}>{ar('مدين')}</Text>
        <Text style={[s.th, { flex: 1.3, textAlign: 'left' }]}>{ar('دائن')}</Text>
        <Text style={[s.th, { flex: 1.3, textAlign: 'left' }]}>{ar('الرصيد')}</Text>
      </View>
      {trialBalance.rows.map((r, i) => (
        <View key={r.account} style={[s.row, i % 2 === 1 && s.rowAlt]}>
          <Text style={[s.td, { flex: 2.4, textAlign: 'right' }]}>{ar(ACCOUNT_LABELS[r.account])}</Text>
          <Text style={[s.td, { flex: 1.3, textAlign: 'left' }]}>{r.debit ? ar(pdfFmtNum(r.debit)) : '—'}</Text>
          <Text style={[s.td, { flex: 1.3, textAlign: 'left' }]}>{r.credit ? ar(pdfFmtNum(r.credit)) : '—'}</Text>
          <Text style={[s.td, { flex: 1.3, textAlign: 'left', fontWeight: 'bold' }]}>{ar(pdfFmtNum(Math.abs(r.balance)))}</Text>
        </View>
      ))}
      <View style={s.totalRow}>
        <Text style={[s.tf, { flex: 2.4, textAlign: 'right' }]}>{ar(trialBalance.balanced ? 'الإجماليات (متوازن)' : 'الإجماليات')}</Text>
        <Text style={[s.tf, { flex: 1.3, textAlign: 'left' }]}>{ar(pdfFmtNum(trialBalance.totalDebit))}</Text>
        <Text style={[s.tf, { flex: 1.3, textAlign: 'left' }]}>{ar(pdfFmtNum(trialBalance.totalCredit))}</Text>
        <Text style={[s.tf, { flex: 1.3, textAlign: 'left' }]}> </Text>
      </View>

      {/* قائمة الدخل */}
      <Text style={s.section}>{ar('قائمة الدخل')}</Text>
      <View style={s.pnlRow}>
        <Text style={s.pnlLabel}>{ar('إيرادات المبيعات')}</Text>
        <PdfMoneyText amount={pnl.revenue} size="sm" />
      </View>
      <View style={s.pnlRow}>
        <Text style={s.pnlLabel}>{ar('تكلفة البضاعة المباعة')}</Text>
        <PdfMoneyText amount={-pnl.cogs} size="sm" color={PDF.danger} />
      </View>
      <View style={s.pnlStrong}>
        <Text style={{ fontSize: 10.5, fontWeight: 'bold', color: PDF.primary }}>{ar('مجمل الربح')}</Text>
        <PdfMoneyText amount={pnl.grossProfit} size="md" color={PDF.logoGreen} />
      </View>

      {/* أعمار الديون */}
      <Text style={s.section}>{ar('أعمار ديون العملاء')}</Text>
      <View style={s.head}>
        <Text style={[s.th, { flex: 1, textAlign: 'center' }]}>{ar('غير مستحق')}</Text>
        <Text style={[s.th, { flex: 1, textAlign: 'center' }]}>{ar('1-30')}</Text>
        <Text style={[s.th, { flex: 1, textAlign: 'center' }]}>{ar('31-60')}</Text>
        <Text style={[s.th, { flex: 1, textAlign: 'center' }]}>{ar('61-90')}</Text>
        <Text style={[s.th, { flex: 1, textAlign: 'center' }]}>{ar('+90')}</Text>
      </View>
      <View style={[s.row, { borderBottomWidth: 0 }]}>
        <Text style={[s.td, { flex: 1, textAlign: 'center' }]}>{ar(pdfFmtNum(aging.current, 0))}</Text>
        <Text style={[s.td, { flex: 1, textAlign: 'center' }]}>{ar(pdfFmtNum(aging.d1_30, 0))}</Text>
        <Text style={[s.td, { flex: 1, textAlign: 'center' }]}>{ar(pdfFmtNum(aging.d31_60, 0))}</Text>
        <Text style={[s.td, { flex: 1, textAlign: 'center', color: PDF.sun }]}>{ar(pdfFmtNum(aging.d61_90, 0))}</Text>
        <Text style={[s.td, { flex: 1, textAlign: 'center', color: PDF.danger, fontWeight: 'bold' }]}>{ar(pdfFmtNum(aging.d90_plus, 0))}</Text>
      </View>
    </ReportShell>
  );
}
