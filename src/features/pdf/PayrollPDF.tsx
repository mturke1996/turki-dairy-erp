// @ts-nocheck
import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { ReportShell } from './ReportShell';
import { ar } from './arabicPDF';
import { PDF, pdfBase } from './pdfBase';
import { PdfMoneyText } from './pdfBrandKit';
import { PdfTh, PdfTdMoney } from './PdfTable';

export type PayrollLineRow = {
  name: string;
  jobTitle: string;
  base: number;
  allowances: number;
  deductions: number;
  net: number;
};

export type PayrollPdfProps = {
  label: string;
  periodFrom: string;
  periodTo: string;
  total: number;
  statusLabel: string;
  paidFrom?: string;
  rows: PayrollLineRow[];
};

export function PayrollPDF({ label, periodFrom, periodTo, total, statusLabel, paidFrom, rows }: PayrollPdfProps) {
  return (
    <ReportShell
      title="كشف رواتب"
      subtitle={label}
      summaryPrimaryDateIso={periodTo}
      summaryPrimaryDateLabel="نهاية الفترة"
      metaCells={[
        { label: 'عدد الموظفين', value: String(rows.length) },
        { label: 'إجمالي الصافي', moneyAmount: total },
        { label: 'وسيلة الصرف', value: paidFrom ?? '—' },
        { label: 'الحالة', value: statusLabel },
      ]}
    >
      <View style={[pdfBase.tableHead, { marginTop: 4 }]} minPresenceAhead={40}>
        <PdfTh flex={2.2}>الموظف</PdfTh>
        <PdfTh flex={1.3} kind="money">الأساسي</PdfTh>
        <PdfTh flex={1.3} kind="money">البدلات</PdfTh>
        <PdfTh flex={1.3} kind="money">الخصومات</PdfTh>
        <PdfTh flex={1.4} kind="money">الصافي</PdfTh>
      </View>
      {rows.map((r, i) => (
        <View key={`${r.name}-${i}`} style={[pdfBase.tableRow, i % 2 === 1 && pdfBase.rowEven]} wrap={false}>
          <View style={{ flex: 2.2 }}>
            <Text style={[pdfBase.tdBold, { textAlign: 'right' }]}>{ar(r.name)}</Text>
            <Text style={[pdfBase.td, { textAlign: 'right', fontSize: 7.5, color: PDF.muted }]}>{ar(r.jobTitle)}</Text>
          </View>
          <PdfTdMoney flex={1.3} amount={r.base} decimals={0} />
          <PdfTdMoney flex={1.3} amount={r.allowances} decimals={0} />
          <PdfTdMoney flex={1.3} amount={r.deductions} decimals={0} color={r.deductions ? PDF.danger : PDF.text} />
          <PdfTdMoney flex={1.4} amount={r.net} decimals={0} bold />
        </View>
      ))}
      <View style={pdfBase.totalRowBar} minPresenceAhead={52}>
        <Text style={{ fontSize: 9.5, fontWeight: 'bold', color: PDF.logoGreen, lineHeight: 1.4 }}>{ar('إجمالي كشف الرواتب')}</Text>
        <PdfMoneyText amount={total} size="md" />
      </View>

      <Text style={{ fontSize: 8, color: PDF.muted, textAlign: 'right', marginTop: 10 }}>
        {ar(`الفترة: ${periodFrom} — ${periodTo}`)}
      </Text>
    </ReportShell>
  );
}
