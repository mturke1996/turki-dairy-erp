// @ts-nocheck
import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportShell } from './ReportShell';
import { ar } from './arabicPDF';
import { PDF } from './pdfBase';
import { pdfFmtNum } from './pdfBrandKit';

const s = StyleSheet.create({
  head: { direction: 'rtl', flexDirection: 'row', backgroundColor: PDF.headerBg, paddingVertical: 7, paddingHorizontal: 8, marginTop: 14 },
  th: { color: PDF.white, fontSize: 8, fontWeight: 'bold' },
  row: { direction: 'rtl', flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: PDF.border },
  rowAlt: { backgroundColor: PDF.rowAlt },
  td: { fontSize: 8, color: PDF.text },
});

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
      <View style={s.head}>
        <Text style={[s.th, { flex: 1.1, textAlign: 'left' }]}>{ar('التاريخ')}</Text>
        <Text style={[s.th, { flex: 2.6, textAlign: 'right' }]}>{ar('البيان')}</Text>
        <Text style={[s.th, { flex: 1.2, textAlign: 'left' }]}>{ar('وارد')}</Text>
        <Text style={[s.th, { flex: 1.2, textAlign: 'left' }]}>{ar('صادر')}</Text>
        <Text style={[s.th, { flex: 1.3, textAlign: 'left' }]}>{ar('الرصيد')}</Text>
      </View>
      {rows.map((r, i) => (
        <View key={`${r.ref}-${i}`} style={[s.row, i % 2 === 1 && s.rowAlt]}>
          <Text style={[s.td, { flex: 1.1, textAlign: 'left', direction: 'ltr' }]}>{r.date}</Text>
          <View style={{ flex: 2.6 }}>
            <Text style={[s.td, { textAlign: 'right', fontWeight: 'bold' }]}>{ar(r.typeLabel)}</Text>
            <Text style={[s.td, { textAlign: 'right', fontSize: 7, color: PDF.muted }]}>{ar(r.description)}</Text>
          </View>
          <Text style={[s.td, { flex: 1.2, textAlign: 'left', color: PDF.logoGreen, fontWeight: 'bold' }]}>{r.direction === 'in' ? ar(pdfFmtNum(r.amount, 0)) : '—'}</Text>
          <Text style={[s.td, { flex: 1.2, textAlign: 'left', color: PDF.danger, fontWeight: 'bold' }]}>{r.direction === 'out' ? ar(pdfFmtNum(r.amount, 0)) : '—'}</Text>
          <Text style={[s.td, { flex: 1.3, textAlign: 'left', fontWeight: 'bold' }]}>{ar(pdfFmtNum(r.balance, 0))}</Text>
        </View>
      ))}
      {rows.length === 0 ? (
        <Text style={{ fontSize: 9, color: PDF.muted, textAlign: 'center', paddingVertical: 20 }}>{ar('لا توجد حركات في هذا الحساب')}</Text>
      ) : null}
    </ReportShell>
  );
}
