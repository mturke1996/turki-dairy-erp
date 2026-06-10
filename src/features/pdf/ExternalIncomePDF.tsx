// @ts-nocheck
import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { ReportShell } from './ReportShell';
import { ar } from './arabicPDF';
import { PDF, PDF_PAGINATION, pdfBase } from './pdfBase';
import { PdfMoneyText, pdfFmtDate } from './pdfBrandKit';
import { PdfSectionTitle, PdfTh, PdfTd, PdfTdMoney } from './PdfTable';

export type ExternalIncomeRow = {
  ref: string;
  date: string;
  description: string;
  destination: string;
  amount: number;
};

export type ExternalIncomePdfProps = {
  sessionLabel?: string;
  total: number;
  rows: ExternalIncomeRow[];
};

export function ExternalIncomePDF({ sessionLabel, total, rows }: ExternalIncomePdfProps) {
  const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <ReportShell
      title="مدخول خارج الخدمة"
      subtitle={sessionLabel ? `الفترة: ${sessionLabel}` : 'كشف المدخولات الخارجية'}
      summaryPrimaryDateLabel="تاريخ الإصدار"
      metaCells={[
        { label: 'إجمالي المدخول', moneyAmount: total },
        { label: 'عدد العمليات', value: String(rows.length) },
      ]}
    >
      <PdfSectionTitle>سجل المدخولات</PdfSectionTitle>
      <View style={pdfBase.tableHead} minPresenceAhead={PDF_PAGINATION.tableHead}>
        <PdfTh flex={1.1} kind="date">التاريخ</PdfTh>
        <PdfTh flex={1.2} kind="ref">المرجع</PdfTh>
        <PdfTh flex={2.2}>البيان</PdfTh>
        <PdfTh flex={1.4}>الوجهة</PdfTh>
        <PdfTh flex={1.1} kind="money">المبلغ</PdfTh>
      </View>
      {sorted.map((r, i) => (
        <View key={r.ref} style={[pdfBase.tableRow, i % 2 === 1 && pdfBase.rowEven]} wrap={false}>
          <PdfTd flex={1.1} kind="date">{pdfFmtDate(r.date)}</PdfTd>
          <PdfTd flex={1.2} kind="ref">{r.ref}</PdfTd>
          <PdfTd flex={2.2}>{r.description}</PdfTd>
          <PdfTd flex={1.4}>{r.destination}</PdfTd>
          <PdfTdMoney flex={1.1} amount={r.amount} decimals={0} bold />
        </View>
      ))}
      {rows.length === 0 ? (
        <Text style={{ fontSize: 9, color: PDF.muted, textAlign: 'center', paddingVertical: 20 }}>{ar('لا توجد مدخولات')}</Text>
      ) : (
        <View style={[pdfBase.totalRowBar, { marginTop: 8 }]} minPresenceAhead={PDF_PAGINATION.totalBar}>
          <Text style={{ fontSize: 9.5, fontWeight: 'bold', color: PDF.logoGreen, lineHeight: 1.4 }}>{ar('الإجمالي')}</Text>
          <PdfMoneyText amount={total} size="md" />
        </View>
      )}
    </ReportShell>
  );
}
