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
    fontSize: 11.5,
    fontWeight: 'bold',
    color: PDF.primary,
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'right',
    borderBottomWidth: 0.75,
    borderBottomColor: PDF.border,
    borderRightWidth: 3,
    borderRightColor: PDF.accent,
    paddingBottom: 5,
    paddingRight: 8,
    lineHeight: 1.35,
  },
  head: { direction: 'rtl', flexDirection: 'row', backgroundColor: PDF.primary, paddingVertical: 9, paddingHorizontal: 9, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: PDF.accent },
  th: { color: PDF.white, fontSize: 8.5, fontWeight: 'bold', lineHeight: 1.4 },
  row: { direction: 'rtl', flexDirection: 'row', paddingVertical: 7.5, paddingHorizontal: 9, borderBottomWidth: 0.5, borderBottomColor: PDF.border, alignItems: 'center' },
  rowAlt: { backgroundColor: PDF.rowAlt },
  td: { fontSize: 8.5, color: PDF.text, lineHeight: 1.45 },
  totalRow: {
    direction: 'rtl',
    flexDirection: 'row',
    backgroundColor: PDF.logoGreenSoft,
    paddingVertical: 9,
    paddingHorizontal: 9,
    borderTopWidth: 1.5,
    borderTopColor: PDF.accent,
    alignItems: 'center',
  },
  tf: { fontSize: 9, fontWeight: 'bold', color: PDF.primary, lineHeight: 1.4 },

  pnlRow: {
    direction: 'rtl',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF.border,
  },
  pnlLabel: { fontSize: 9.5, color: PDF.text, lineHeight: 1.45 },
  pnlStrong: {
    direction: 'rtl',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: PDF.paleGold,
    borderRightWidth: 3,
    borderRightColor: PDF.accent,
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
        { label: 'مجمل الربح', moneyAmount: pnl.grossProfit },
        { label: 'صافي الربح', moneyAmount: pnl.netProfit },
        { label: 'هامش صافي', value: `${pdfFmtNum(pnl.netMarginPct, 1)}%` },
      ]}
    >
      {/* ميزان المراجعة */}
      <Text style={s.section}>{ar('ميزان المراجعة')}</Text>
      <View style={s.head} minPresenceAhead={40}>
        <Text style={[s.th, { flex: 2.4, textAlign: 'right' }]}>{ar('الحساب')}</Text>
        <Text style={[s.th, { flex: 1.3, textAlign: 'left' }]}>{ar('مدين')}</Text>
        <Text style={[s.th, { flex: 1.3, textAlign: 'left' }]}>{ar('دائن')}</Text>
        <Text style={[s.th, { flex: 1.5, textAlign: 'left' }]}>{ar('الرصيد')}</Text>
      </View>
      {trialBalance.rows.map((r, i) => (
        <View key={r.account} style={[s.row, i % 2 === 1 && s.rowAlt]} wrap={false}>
          <Text style={[s.td, { flex: 2.4, textAlign: 'right' }]}>{ar(ACCOUNT_LABELS[r.account])}</Text>
          <Text style={[s.td, { flex: 1.3, textAlign: 'left' }]}>{r.debit ? ar(pdfFmtNum(r.debit)) : '—'}</Text>
          <Text style={[s.td, { flex: 1.3, textAlign: 'left' }]}>{r.credit ? ar(pdfFmtNum(r.credit)) : '—'}</Text>
          <Text style={[s.td, { flex: 1.5, textAlign: 'left', fontWeight: 'bold' }]}>
            {ar(`${pdfFmtNum(Math.abs(r.balance))} ${r.balance >= 0 ? 'مدين' : 'دائن'}`)}
          </Text>
        </View>
      ))}
      <View style={s.totalRow} wrap={false}>
        <Text style={[s.tf, { flex: 2.4, textAlign: 'right' }]}>{ar(trialBalance.balanced ? 'الإجماليات (متوازن)' : 'الإجماليات (غير متوازن!)')}</Text>
        <Text style={[s.tf, { flex: 1.3, textAlign: 'left' }]}>{ar(pdfFmtNum(trialBalance.totalDebit))}</Text>
        <Text style={[s.tf, { flex: 1.3, textAlign: 'left' }]}>{ar(pdfFmtNum(trialBalance.totalCredit))}</Text>
        <Text style={[s.tf, { flex: 1.5, textAlign: 'left' }]}> </Text>
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
      <View style={s.pnlStrong} wrap={false}>
        <Text style={{ fontSize: 10.5, fontWeight: 'bold', color: PDF.primary, lineHeight: 1.4 }}>{ar('مجمل الربح')}</Text>
        <PdfMoneyText amount={pnl.grossProfit} size="md" color={PDF.logoGreen} />
      </View>
      <View style={s.pnlRow}>
        <Text style={s.pnlLabel}>{ar('خسائر الهدر والتلف (غير نقدية)')}</Text>
        <PdfMoneyText amount={-pnl.wasteLosses} size="sm" color={PDF.danger} />
      </View>
      <View style={s.pnlRow}>
        <Text style={s.pnlLabel}>{ar('المصاريف التشغيلية')}</Text>
        <PdfMoneyText amount={-pnl.operatingExpenses} size="sm" color={PDF.danger} />
      </View>
      <View style={s.pnlRow}>
        <Text style={s.pnlLabel}>{ar('الرواتب والأجور')}</Text>
        <PdfMoneyText amount={-pnl.salaries} size="sm" color={PDF.danger} />
      </View>
      <View style={[s.pnlStrong, { marginTop: 6, borderWidth: 1, borderColor: pnl.netProfit >= 0 ? PDF.logoGreen : PDF.danger }]} wrap={false}>
        <Text style={{ fontSize: 10.5, fontWeight: 'bold', color: PDF.primary, lineHeight: 1.4 }}>
          {ar(pnl.netProfit >= 0 ? 'صافي الربح' : 'صافي الخسارة')}
        </Text>
        <PdfMoneyText amount={pnl.netProfit} size="md" color={pnl.netProfit >= 0 ? PDF.logoGreen : PDF.danger} />
      </View>

      {/* أعمار الديون */}
      <Text style={s.section} minPresenceAhead={60}>{ar('أعمار ديون العملاء')}</Text>
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
