// @ts-nocheck
import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { ReportShell } from './ReportShell';
import { ar } from './arabicPDF';
import { PDF, PDF_PAGINATION, pdfBase } from './pdfBase';
import { PdfTh, PdfTd, PdfTdMoney } from './PdfTable';

export type CashStatementRow = {
  date: string;
  ref: string;
  typeLabel: string;
  description: string;
  direction: 'in' | 'out';
  amount: number;
  balance: number;
};

export type CashStatementPdfProps = {
  accountName: string;
  accountTypeLabel: string;
  opening: number;
  totalIn: number;
  totalOut: number;
  closing: number;
  rows: CashStatementRow[];
};

export function CashStatementPDF({ accountName, accountTypeLabel, opening, totalIn, totalOut, closing, rows }: CashStatementPdfProps) {
  return (
    <ReportShell
      title="كشف حساب"
      subtitle={`${accountTypeLabel}: ${accountName}`}
      summaryPrimaryDateLabel="تاريخ الكشف"
      metaCells={[
        { label: 'الرصيد الافتتاحي', moneyAmount: opening },
        { label: 'إجمالي الوارد', moneyAmount: totalIn },
        { label: 'إجمالي الصادر', moneyAmount: totalOut },
        { label: 'الرصيد الحالي', moneyAmount: closing },
      ]}
    >
      <View style={[pdfBase.tableHead, { marginTop: 4 }]} minPresenceAhead={PDF_PAGINATION.tableHead}>
        <PdfTh flex={1.1} kind="date">التاريخ</PdfTh>
        <PdfTh flex={2.6}>البيان</PdfTh>
        <PdfTh flex={1.2} kind="money">وارد</PdfTh>
        <PdfTh flex={1.2} kind="money">صادر</PdfTh>
        <PdfTh flex={1.3} kind="money">الرصيد</PdfTh>
      </View>
      {rows.map((r, i) => (
        <View key={`${r.ref}-${i}`} style={[pdfBase.tableRow, i % 2 === 1 && pdfBase.rowEven]} wrap={false}>
          <PdfTd flex={1.1} kind="date">{r.date}</PdfTd>
          <View style={{ flex: 2.6 }}>
            <Text style={[pdfBase.tdBold, { textAlign: 'right' }]}>{ar(r.typeLabel)}</Text>
            <Text style={[pdfBase.td, { textAlign: 'right', fontSize: 7, color: PDF.muted }]}>{ar(r.description)}</Text>
          </View>
          {r.direction === 'in' ? (
            <PdfTdMoney flex={1.2} amount={r.amount} decimals={0} color={PDF.logoGreen} bold />
          ) : (
            <PdfTd flex={1.2} kind="num">—</PdfTd>
          )}
          {r.direction === 'out' ? (
            <PdfTdMoney flex={1.2} amount={r.amount} decimals={0} color={PDF.danger} bold />
          ) : (
            <PdfTd flex={1.2} kind="num">—</PdfTd>
          )}
          <PdfTdMoney flex={1.3} amount={r.balance} decimals={0} bold />
        </View>
      ))}
      {rows.length === 0 ? (
        <Text style={{ fontSize: 9, color: PDF.muted, textAlign: 'center', paddingVertical: 20 }}>{ar('لا توجد حركات في هذا الحساب')}</Text>
      ) : null}
    </ReportShell>
  );
}
