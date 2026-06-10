// @ts-nocheck
import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportShell } from './ReportShell';
import { ar } from './arabicPDF';
import { PDF, pdfBase } from './pdfBase';
import { PdfMoneyText, pdfFmtNum } from './pdfBrandKit';
import { PdfTh, PdfTd, PdfMoneyInline } from './PdfTable';
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
  td: { fontSize: 8.5, color: PDF.text, lineHeight: 1.45 },
  totalRow: {
    direction: 'ltr',
    flexDirection: 'row-reverse',
    backgroundColor: PDF.logoGreenSoft,
    paddingVertical: 9,
    paddingHorizontal: 9,
    borderTopWidth: 1.5,
    borderTopColor: PDF.accent,
    alignItems: 'center',
  },
  tf: { fontSize: 9, fontWeight: 'bold', color: PDF.primary, lineHeight: 1.4, direction: 'ltr' },

  pnlRow: {
    direction: 'ltr',
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF.border,
  },
  pnlLabel: { fontSize: 9.5, color: PDF.text, lineHeight: 1.45, textAlign: 'right' },
  pnlStrong: {
    direction: 'ltr',
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 14,
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
      <View style={pdfBase.tableHead} minPresenceAhead={40}>
        <PdfTh flex={2.4}>الحساب</PdfTh>
        <PdfTh flex={1.3} kind="money">مدين</PdfTh>
        <PdfTh flex={1.3} kind="money">دائن</PdfTh>
        <PdfTh flex={1.5} kind="money">الرصيد</PdfTh>
      </View>
      {trialBalance.rows.map((r, i) => (
        <View key={r.account} style={[pdfBase.tableRow, i % 2 === 1 && pdfBase.rowEven]} wrap={false}>
          <PdfTd flex={2.4}>{ACCOUNT_LABELS[r.account]}</PdfTd>
          <PdfTd flex={1.3} kind="num">{r.debit ? pdfFmtNum(r.debit) : '—'}</PdfTd>
          <PdfTd flex={1.3} kind="num">{r.credit ? pdfFmtNum(r.credit) : '—'}</PdfTd>
          <View style={[{ flex: 1.5 }, pdfBase.tdMoneyWrap]}>
            <View style={{ flexDirection: 'row', direction: 'ltr', alignItems: 'center', gap: 5 }}>
              <PdfMoneyInline amount={Math.abs(r.balance)} bold />
              <Text style={[s.td, { fontWeight: 'bold' }]}>{ar(r.balance >= 0 ? 'مدين' : 'دائن')}</Text>
            </View>
          </View>
        </View>
      ))}
      <View style={s.totalRow} minPresenceAhead={52}>
        <Text style={[s.tf, { flex: 2.4, textAlign: 'right' }]}>{ar(trialBalance.balanced ? 'الإجماليات (متوازن)' : 'الإجماليات (غير متوازن!)')}</Text>
        <Text style={[s.tf, { flex: 1.3, textAlign: 'left' }]}>{pdfFmtNum(trialBalance.totalDebit)}</Text>
        <Text style={[s.tf, { flex: 1.3, textAlign: 'left' }]}>{pdfFmtNum(trialBalance.totalCredit)}</Text>
        <Text style={[s.tf, { flex: 1.5, textAlign: 'left' }]}> </Text>
      </View>

      {/* قائمة الدخل */}
      <Text style={s.section}>{ar('قائمة الدخل')}</Text>
      <View style={s.pnlRow}>
        <Text style={s.pnlLabel}>{ar('إيرادات المبيعات')}</Text>
        <PdfMoneyText amount={pnl.salesRevenue} size="sm" />
      </View>
      {pnl.externalIncome > 0 ? (
        <View style={s.pnlRow}>
          <Text style={s.pnlLabel}>{ar('مدخولات خارجية')}</Text>
          <PdfMoneyText amount={pnl.externalIncome} size="sm" />
        </View>
      ) : null}
      {pnl.externalIncome > 0 ? (
        <View style={s.pnlRow}>
          <Text style={s.pnlLabel}>{ar('إجمالي الإيرادات')}</Text>
          <PdfMoneyText amount={pnl.revenue} size="sm" />
        </View>
      ) : null}
      <View style={s.pnlRow}>
        <Text style={s.pnlLabel}>{ar('تكلفة البضاعة المباعة')}</Text>
        <PdfMoneyText amount={-pnl.cogs} size="sm" color={PDF.danger} />
      </View>
      <View style={s.pnlStrong} minPresenceAhead={48}>
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
      <View style={[s.pnlStrong, { marginTop: 6, borderWidth: 1, borderColor: pnl.netProfit >= 0 ? PDF.logoGreen : PDF.danger }]} minPresenceAhead={48}>
        <Text style={{ fontSize: 10.5, fontWeight: 'bold', color: PDF.primary, lineHeight: 1.4 }}>
          {ar(pnl.netProfit >= 0 ? 'صافي الربح' : 'صافي الخسارة')}
        </Text>
        <PdfMoneyText amount={pnl.netProfit} size="md" color={pnl.netProfit >= 0 ? PDF.logoGreen : PDF.danger} />
      </View>

      {/* أعمار الديون */}
      <Text style={s.section} minPresenceAhead={60}>{ar('أعمار ديون العملاء')}</Text>
      <View style={pdfBase.tableHead}>
        <PdfTh flex={1} kind="num">غير مستحق</PdfTh>
        <PdfTh flex={1} kind="num">1-30</PdfTh>
        <PdfTh flex={1} kind="num">31-60</PdfTh>
        <PdfTh flex={1} kind="num">61-90</PdfTh>
        <PdfTh flex={1} kind="num">+90</PdfTh>
      </View>
      <View style={[pdfBase.tableRow, { borderBottomWidth: 0 }]}>
        <PdfTd flex={1} kind="num">{pdfFmtNum(aging.current, 0)}</PdfTd>
        <PdfTd flex={1} kind="num">{pdfFmtNum(aging.d1_30, 0)}</PdfTd>
        <PdfTd flex={1} kind="num">{pdfFmtNum(aging.d31_60, 0)}</PdfTd>
        <PdfTd flex={1} kind="num" color={PDF.sun}>{pdfFmtNum(aging.d61_90, 0)}</PdfTd>
        <PdfTd flex={1} kind="num" color={PDF.danger} bold>{pdfFmtNum(aging.d90_plus, 0)}</PdfTd>
      </View>
    </ReportShell>
  );
}
