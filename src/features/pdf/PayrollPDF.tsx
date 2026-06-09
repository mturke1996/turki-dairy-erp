// @ts-nocheck
import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportShell } from './ReportShell';
import { ar } from './arabicPDF';
import { PDF } from './pdfBase';
import { pdfFmtNum } from './pdfBrandKit';

const s = StyleSheet.create({
  head: { direction: 'rtl', flexDirection: 'row', backgroundColor: PDF.primary, paddingVertical: 9, paddingHorizontal: 9, marginTop: 4, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: PDF.accent },
  th: { color: PDF.white, fontSize: 8.5, fontWeight: 'bold', lineHeight: 1.4 },
  row: { direction: 'rtl', flexDirection: 'row', paddingVertical: 7.5, paddingHorizontal: 9, borderBottomWidth: 0.5, borderBottomColor: PDF.border, alignItems: 'center' },
  rowAlt: { backgroundColor: PDF.rowAlt },
  td: { fontSize: 8.5, color: PDF.text, lineHeight: 1.45 },
  totalRow: { direction: 'rtl', flexDirection: 'row', backgroundColor: PDF.logoGreenSoft, paddingVertical: 9, paddingHorizontal: 9, borderTopWidth: 1.5, borderTopColor: PDF.accent, alignItems: 'center' },
  tf: { fontSize: 9, fontWeight: 'bold', color: PDF.primary, lineHeight: 1.4 },
});

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
        { label: 'عدد الموظفين', value: pdfFmtNum(rows.length, 0) },
        { label: 'إجمالي الصافي', moneyAmount: total },
        { label: 'وسيلة الصرف', value: paidFrom ?? '—' },
        { label: 'الحالة', value: statusLabel },
      ]}
    >
      <View style={s.head} minPresenceAhead={40}>
        <Text style={[s.th, { flex: 2.2, textAlign: 'right' }]}>{ar('الموظف')}</Text>
        <Text style={[s.th, { flex: 1.3, textAlign: 'left' }]}>{ar('الأساسي')}</Text>
        <Text style={[s.th, { flex: 1.3, textAlign: 'left' }]}>{ar('البدلات')}</Text>
        <Text style={[s.th, { flex: 1.3, textAlign: 'left' }]}>{ar('الخصومات')}</Text>
        <Text style={[s.th, { flex: 1.4, textAlign: 'left' }]}>{ar('الصافي')}</Text>
      </View>
      {rows.map((r, i) => (
        <View key={`${r.name}-${i}`} style={[s.row, i % 2 === 1 && s.rowAlt]} wrap={false}>
          <View style={{ flex: 2.2 }}>
            <Text style={[s.td, { textAlign: 'right', fontWeight: 'bold' }]}>{ar(r.name)}</Text>
            <Text style={[s.td, { textAlign: 'right', fontSize: 7.5, color: PDF.muted }]}>{ar(r.jobTitle)}</Text>
          </View>
          <Text style={[s.td, { flex: 1.3, textAlign: 'left' }]}>{ar(pdfFmtNum(r.base, 0))}</Text>
          <Text style={[s.td, { flex: 1.3, textAlign: 'left' }]}>{ar(pdfFmtNum(r.allowances, 0))}</Text>
          <Text style={[s.td, { flex: 1.3, textAlign: 'left', color: r.deductions ? PDF.danger : PDF.text }]}>{r.deductions ? ar(pdfFmtNum(r.deductions, 0)) : '—'}</Text>
          <Text style={[s.td, { flex: 1.4, textAlign: 'left', fontWeight: 'bold' }]}>{ar(pdfFmtNum(r.net, 0))}</Text>
        </View>
      ))}
      <View style={s.totalRow} wrap={false}>
        {/* 6.1 = مجموع أعمدة الموظف+الأساسي+البدلات+الخصومات كي يصطف الإجمالي تحت عمود الصافي */}
        <Text style={[s.tf, { flex: 6.1, textAlign: 'right' }]}>{ar('إجمالي كشف الرواتب')}</Text>
        <Text style={[s.tf, { flex: 1.4, textAlign: 'left' }]}>{ar(pdfFmtNum(total, 0))}</Text>
      </View>

      <Text style={{ fontSize: 8, color: PDF.muted, textAlign: 'right', marginTop: 10 }}>
        {ar(`الفترة: ${periodFrom} — ${periodTo}`)}
      </Text>
    </ReportShell>
  );
}
