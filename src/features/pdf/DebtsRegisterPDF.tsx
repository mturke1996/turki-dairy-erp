// @ts-nocheck
import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { ReportShell } from './ReportShell';
import { ar } from './arabicPDF';
import { PDF, pdfBase } from './pdfBase';
import { PdfMoneyText, pdfFmtDate } from './pdfBrandKit';
import { PdfSectionTitle, PdfTh, PdfTd, PdfTdMoney } from './PdfTable';

export type DebtRegisterRow = {
  ref: string;
  date: string;
  partyLabel: string;
  partyKindLabel: string;
  directionLabel: string;
  originalAmount: number;
  remaining: number;
  settled: number;
  description?: string;
};

export type DebtsRegisterPdfProps = {
  sessionLabel?: string;
  totalPayables: number;
  totalReceivables: number;
  netPosition: number;
  rows: DebtRegisterRow[];
};

export function DebtsRegisterPDF({
  sessionLabel,
  totalPayables,
  totalReceivables,
  netPosition,
  rows,
}: DebtsRegisterPdfProps) {
  const sorted = [...rows].sort((a, b) => b.remaining - a.remaining);

  return (
    <ReportShell
      title="سجل الديون"
      subtitle={sessionLabel ? `الفترة: ${sessionLabel}` : 'كشف الديون المسجّلة'}
      summaryPrimaryDateLabel="تاريخ الإصدار"
      metaCells={[
        { label: 'ديون علينا', moneyAmount: totalPayables },
        { label: 'ديون لنا', moneyAmount: totalReceivables },
        {
          label: netPosition >= 0 ? 'صافي المركز (لصالحنا)' : 'صافي المركز (علينا)',
          moneyAmount: Math.abs(netPosition),
        },
        { label: 'عدد السجلات', value: String(rows.length) },
      ]}
    >
      <PdfSectionTitle>الديون المسجّلة يدوياً</PdfSectionTitle>
      <View style={pdfBase.tableHead} minPresenceAhead={40}>
        <PdfTh flex={1.1} kind="date">التاريخ</PdfTh>
        <PdfTh flex={1.2} kind="ref">المرجع</PdfTh>
        <PdfTh flex={1.6}>الطرف</PdfTh>
        <PdfTh flex={0.9}>الاتجاه</PdfTh>
        <PdfTh flex={1} kind="money">الأصل</PdfTh>
        <PdfTh flex={1} kind="money">المُسَدَّد</PdfTh>
        <PdfTh flex={1} kind="money">المتبقي</PdfTh>
      </View>
      {sorted.map((r, i) => (
        <View key={r.ref} style={[pdfBase.tableRow, i % 2 === 1 && pdfBase.rowEven]} wrap={false}>
          <PdfTd flex={1.1} kind="date">{pdfFmtDate(r.date)}</PdfTd>
          <PdfTd flex={1.2} kind="ref">{r.ref}</PdfTd>
          <View style={{ flex: 1.6 }}>
            <Text style={[pdfBase.tdBold, { textAlign: 'right' }]}>{ar(r.partyLabel)}</Text>
            <Text style={[pdfBase.td, { textAlign: 'right', fontSize: 7, color: PDF.muted }]}>{ar(r.partyKindLabel)}</Text>
          </View>
          <PdfTd flex={0.9}>{r.directionLabel}</PdfTd>
          <PdfTdMoney flex={1} amount={r.originalAmount} decimals={0} />
          <PdfTdMoney flex={1} amount={r.settled} decimals={0} />
          <PdfTdMoney flex={1} amount={r.remaining} decimals={0} bold />
        </View>
      ))}
      {rows.length === 0 ? (
        <Text style={{ fontSize: 9, color: PDF.muted, textAlign: 'center', paddingVertical: 20 }}>{ar('لا توجد ديون مسجّلة')}</Text>
      ) : (
        <View style={[pdfBase.totalRowBar, { marginTop: 8 }]} minPresenceAhead={52}>
          <Text style={{ fontSize: 9.5, fontWeight: 'bold', color: PDF.logoGreen, lineHeight: 1.4 }}>{ar('إجمالي المتبقي (مسجّل)')}</Text>
          <PdfMoneyText amount={sorted.reduce((sum, r) => sum + r.remaining, 0)} size="md" />
        </View>
      )}
    </ReportShell>
  );
}
