// @ts-nocheck
import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportShell } from './ReportShell';
import { ar } from './arabicPDF';
import { PDF } from './pdfBase';
import { pdfFmtNum, pdfFmtDate, pdfFmtLiters } from './pdfBrandKit';
import type { InventoryLedgerEntry } from '@/lib/domain/types';

const s = StyleSheet.create({
  head: { direction: 'rtl', flexDirection: 'row', backgroundColor: PDF.headerBg, paddingVertical: 7, paddingHorizontal: 8 },
  th: { color: PDF.white, fontSize: 8.5, fontWeight: 'bold', textAlign: 'center' },
  row: { direction: 'rtl', flexDirection: 'row', paddingVertical: 5.5, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: PDF.border },
  rowAlt: { backgroundColor: PDF.rowAlt },
  td: { fontSize: 8.5, color: PDF.text, textAlign: 'center' },
  tdIn: { fontSize: 8.5, color: PDF.logoGreen, textAlign: 'center', fontWeight: 'bold' },
  tdOut: { fontSize: 8.5, color: PDF.primary, textAlign: 'center', fontWeight: 'bold' },

  totalRow: {
    direction: 'rtl',
    flexDirection: 'row',
    backgroundColor: PDF.logoGreenSoft,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1.5,
    borderTopColor: PDF.primary,
  },
  tf: { fontSize: 9, fontWeight: 'bold', color: PDF.text, textAlign: 'center' },
});

export type DailyMovementProps = {
  entries: InventoryLedgerEntry[];
  sessionLabel: string;
  openingStock: number;
  totals: { inQty: number; outQty: number; closing: number };
};

export function DailyMovementPDF({ entries, sessionLabel, openingStock, totals }: DailyMovementProps) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <ReportShell
      title="تقرير حركة المخزون"
      subtitle={`الفترة: ${sessionLabel}`}
      summaryPrimaryDateLabel="تاريخ التقرير"
      metaCells={[
        { label: 'الرصيد الافتتاحي', value: pdfFmtLiters(openingStock, 0) },
        { label: 'إجمالي الوارد', value: pdfFmtLiters(totals.inQty, 0) },
        { label: 'إجمالي الصادر', value: pdfFmtLiters(totals.outQty, 0) },
        { label: 'الرصيد الختامي', value: pdfFmtLiters(totals.closing, 0) },
      ]}
    >
      <View style={s.head}>
        <Text style={[s.th, { flex: 1.1 }]}>{ar('التاريخ')}</Text>
        <Text style={[s.th, { flex: 1.4 }]}>{ar('المرجع')}</Text>
        <Text style={[s.th, { flex: 1.6 }]}>{ar('البيان')}</Text>
        <Text style={[s.th, { flex: 1 }]}>{ar('وارد')}</Text>
        <Text style={[s.th, { flex: 1 }]}>{ar('صادر')}</Text>
        <Text style={[s.th, { flex: 1.1 }]}>{ar('تكلفة الوحدة')}</Text>
        <Text style={[s.th, { flex: 1.1 }]}>{ar('الرصيد')}</Text>
      </View>
      {sorted.map((e, i) => (
        <View key={e.id} style={[s.row, i % 2 === 1 && s.rowAlt]}>
          <Text style={[s.td, { flex: 1.1 }]}>{ar(pdfFmtDate(e.date))}</Text>
          <Text style={[s.td, { flex: 1.4, direction: 'ltr' }]}>{ar(e.ref)}</Text>
          <Text style={[s.td, { flex: 1.6, textAlign: 'right' }]}>{ar(e.label)}</Text>
          <Text style={[s.tdIn, { flex: 1 }]}>{e.quantityIn ? ar(pdfFmtNum(e.quantityIn, 1)) : '—'}</Text>
          <Text style={[s.tdOut, { flex: 1 }]}>{e.quantityOut ? ar(pdfFmtNum(e.quantityOut, 1)) : '—'}</Text>
          <Text style={[s.td, { flex: 1.1 }]}>{ar(pdfFmtNum(e.unitCost, 3))}</Text>
          <Text style={[s.td, { flex: 1.1, fontWeight: 'bold' }]}>{ar(pdfFmtNum(e.balanceAfter, 1))}</Text>
        </View>
      ))}
      <View style={s.totalRow}>
        <Text style={[s.tf, { flex: 2.5, textAlign: 'right', color: PDF.logoGreen }]}>{ar('الإجماليات')}</Text>
        <Text style={[s.tf, { flex: 1.6 }]}> </Text>
        <Text style={[s.tf, { flex: 1, color: PDF.logoGreen }]}>{ar(pdfFmtNum(totals.inQty, 0))}</Text>
        <Text style={[s.tf, { flex: 1, color: PDF.primary }]}>{ar(pdfFmtNum(totals.outQty, 0))}</Text>
        <Text style={[s.tf, { flex: 1.1 }]}> </Text>
        <Text style={[s.tf, { flex: 1.1 }]}>{ar(pdfFmtNum(totals.closing, 0))}</Text>
      </View>
    </ReportShell>
  );
}
