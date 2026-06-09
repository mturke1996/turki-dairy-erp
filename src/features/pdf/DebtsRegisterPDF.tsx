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
      <View style={s.head} minPresenceAhead={40}>
        <Text style={[s.th, { flex: 1.1 }]}>{ar('التاريخ')}</Text>
        <Text style={[s.th, { flex: 1.2 }]}>{ar('المرجع')}</Text>
        <Text style={[s.th, { flex: 1.6 }]}>{ar('الطرف')}</Text>
        <Text style={[s.th, { flex: 0.9 }]}>{ar('الاتجاه')}</Text>
        <Text style={[s.th, { flex: 1 }]}>{ar('الأصل')}</Text>
        <Text style={[s.th, { flex: 1 }]}>{ar('المُسَدَّد')}</Text>
        <Text style={[s.th, { flex: 1 }]}>{ar('المتبقي')}</Text>
      </View>
      {sorted.map((r, i) => (
        <View key={r.ref} style={[s.row, i % 2 === 1 && s.rowAlt]} wrap={false}>
          <Text style={[s.td, { flex: 1.1 }]}>{ar(pdfFmtDate(r.date))}</Text>
          <Text style={[s.td, { flex: 1.2, direction: 'ltr' }]}>{ar(r.ref)}</Text>
          <View style={{ flex: 1.6 }}>
            <Text style={[s.td, { textAlign: 'right', fontWeight: 'bold' }]}>{ar(r.partyLabel)}</Text>
            <Text style={[s.td, { textAlign: 'right', fontSize: 7, color: PDF.muted }]}>{ar(r.partyKindLabel)}</Text>
          </View>
          <Text style={[s.td, { flex: 0.9 }]}>{ar(r.directionLabel)}</Text>
          <Text style={[s.td, { flex: 1 }]}>{ar(pdfFmtNum(r.originalAmount, 0))}</Text>
          <Text style={[s.td, { flex: 1 }]}>{ar(pdfFmtNum(r.settled, 0))}</Text>
          <Text style={[s.td, { flex: 1, fontWeight: 'bold' }]}>{ar(pdfFmtNum(r.remaining, 0))}</Text>
        </View>
      ))}
      {rows.length === 0 ? (
        <Text style={{ fontSize: 9, color: PDF.muted, textAlign: 'center', paddingVertical: 20 }}>{ar('لا توجد ديون مسجّلة')}</Text>
      ) : (
        <View style={s.totalRow} wrap={false}>
          <Text style={{ fontSize: 9.5, fontWeight: 'bold', color: PDF.logoGreen, lineHeight: 1.4 }}>{ar('إجمالي المتبقي (مسجّل)')}</Text>
          <PdfMoneyText amount={sorted.reduce((sum, r) => sum + r.remaining, 0)} size="md" />
        </View>
      )}
    </ReportShell>
  );
}
