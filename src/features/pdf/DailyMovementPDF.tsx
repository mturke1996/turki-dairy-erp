// @ts-nocheck
import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportShell } from './ReportShell';
import { ar } from './arabicPDF';
import { PDF, PDF_PAGINATION, pdfBase } from './pdfBase';
import { pdfFmtNum, pdfFmtDate, pdfFmtLiters } from './pdfBrandKit';
import { PdfTh, PdfTd, PdfTdMoney } from './PdfTable';
import type { InventoryLedgerEntry } from '@/lib/domain/types';

const s = StyleSheet.create({
  tdIn: { fontSize: 8.5, color: PDF.logoGreen, textAlign: 'center', direction: 'ltr', fontWeight: 'bold', lineHeight: 1.45 },
  tdOut: { fontSize: 8.5, color: PDF.primary, textAlign: 'center', direction: 'ltr', fontWeight: 'bold', lineHeight: 1.45 },
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
  tf: { fontSize: 9, fontWeight: 'bold', color: PDF.text, textAlign: 'center', direction: 'ltr', lineHeight: 1.4 },
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
      <View style={pdfBase.tableHead} minPresenceAhead={PDF_PAGINATION.tableHead}>
        <PdfTh flex={1.1} kind="date">التاريخ</PdfTh>
        <PdfTh flex={1.4} kind="ref">المرجع</PdfTh>
        <PdfTh flex={1.6}>البيان</PdfTh>
        <PdfTh flex={1} kind="num">وارد</PdfTh>
        <PdfTh flex={1} kind="num">صادر</PdfTh>
        <PdfTh flex={1.1} kind="money">تكلفة الوحدة</PdfTh>
        <PdfTh flex={1.1} kind="num">الرصيد</PdfTh>
      </View>
      {sorted.map((e, i) => (
        <View key={e.id} style={[pdfBase.tableRow, i % 2 === 1 && pdfBase.rowEven]} wrap={false}>
          <PdfTd flex={1.1} kind="date">{pdfFmtDate(e.date)}</PdfTd>
          <PdfTd flex={1.4} kind="ref">{e.ref}</PdfTd>
          <PdfTd flex={1.6}>{e.label}</PdfTd>
          <Text style={[s.tdIn, { flex: 1 }]}>{e.quantityIn ? pdfFmtNum(e.quantityIn, 1) : '—'}</Text>
          <Text style={[s.tdOut, { flex: 1 }]}>{e.quantityOut ? pdfFmtNum(e.quantityOut, 1) : '—'}</Text>
          <PdfTdMoney flex={1.1} amount={e.unitCost} decimals={3} />
          <PdfTd flex={1.1} kind="num" bold>{pdfFmtNum(e.balanceAfter, 1)}</PdfTd>
        </View>
      ))}
      <View style={s.totalRow} minPresenceAhead={PDF_PAGINATION.totalBar}>
        <Text style={[s.tf, { flex: 2.5, textAlign: 'right', color: PDF.logoGreen }]}>{ar('الإجماليات')}</Text>
        <Text style={[s.tf, { flex: 1.6 }]}> </Text>
        <Text style={[s.tf, { flex: 1, color: PDF.logoGreen }]}>{pdfFmtNum(totals.inQty, 0)}</Text>
        <Text style={[s.tf, { flex: 1, color: PDF.primary }]}>{pdfFmtNum(totals.outQty, 0)}</Text>
        <Text style={[s.tf, { flex: 1.1 }]}> </Text>
        <Text style={[s.tf, { flex: 1.1 }]}>{pdfFmtNum(totals.closing, 0)}</Text>
      </View>
    </ReportShell>
  );
}
