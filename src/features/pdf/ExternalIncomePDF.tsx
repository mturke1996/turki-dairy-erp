// @ts-nocheck
import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportShell } from './ReportShell';
import { ar } from './arabicPDF';
import { PDF } from './pdfBase';
import { PdfMoneyText, pdfFmtDate, pdfFmtNum } from './pdfBrandKit';
import { PdfSectionTitle } from './PdfTable';

const s = StyleSheet.create({
  head: { direction: 'rtl', flexDirection: 'row', backgroundColor: PDF.primary, paddingVertical: 9, paddingHorizontal: 9, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: PDF.accent },
  th: { color: PDF.white, fontSize: 8, fontWeight: 'bold', textAlign: 'center', lineHeight: 1.4 },
  row: { direction: 'rtl', flexDirection: 'row', paddingVertical: 7.5, paddingHorizontal: 9, borderBottomWidth: 0.5, borderBottomColor: PDF.border, alignItems: 'center' },
  rowAlt: { backgroundColor: PDF.rowAlt },
  td: { fontSize: 8, color: PDF.text, textAlign: 'center', lineHeight: 1.45 },
  totalRow: {
    direction: 'rtl',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: PDF.logoGreenSoft,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: PDF.accent,
  },
});

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
      <View style={s.head} minPresenceAhead={40}>
        <Text style={[s.th, { flex: 1.1 }]}>{ar('التاريخ')}</Text>
        <Text style={[s.th, { flex: 1.2 }]}>{ar('المرجع')}</Text>
        <Text style={[s.th, { flex: 2.2 }]}>{ar('البيان')}</Text>
        <Text style={[s.th, { flex: 1.4 }]}>{ar('الوجهة')}</Text>
        <Text style={[s.th, { flex: 1.1 }]}>{ar('المبلغ')}</Text>
      </View>
      {sorted.map((r, i) => (
        <View key={r.ref} style={[s.row, i % 2 === 1 && s.rowAlt]} wrap={false}>
          <Text style={[s.td, { flex: 1.1 }]}>{ar(pdfFmtDate(r.date))}</Text>
          <Text style={[s.td, { flex: 1.2, direction: 'ltr' }]}>{ar(r.ref)}</Text>
          <Text style={[s.td, { flex: 2.2, textAlign: 'right' }]}>{ar(r.description)}</Text>
          <Text style={[s.td, { flex: 1.4, textAlign: 'right' }]}>{ar(r.destination)}</Text>
          <Text style={[s.td, { flex: 1.1, fontWeight: 'bold' }]}>{ar(pdfFmtNum(r.amount, 0))}</Text>
        </View>
      ))}
      {rows.length === 0 ? (
        <Text style={{ fontSize: 9, color: PDF.muted, textAlign: 'center', paddingVertical: 20 }}>{ar('لا توجد مدخولات')}</Text>
      ) : (
        <View style={s.totalRow} wrap={false}>
          <Text style={{ fontSize: 9.5, fontWeight: 'bold', color: PDF.logoGreen, lineHeight: 1.4 }}>{ar('الإجمالي')}</Text>
          <PdfMoneyText amount={total} size="md" />
        </View>
      )}
    </ReportShell>
  );
}
