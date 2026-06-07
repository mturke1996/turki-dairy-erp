// @ts-nocheck
import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportShell } from './ReportShell';
import { ar } from './arabicPDF';
import { PDF } from './pdfBase';
import { PdfMoneyText, PdfInfoGrid, pdfFmtNum, pdfFmtDate } from './pdfBrandKit';
import { PdfSectionTitle } from './PdfTable';
import { MILK_SHIFT_LABELS, QUALITY_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/domain/constants';
import type { FarmerStats } from '@/lib/domain/calculations';
import type { Payment, SupplyTransaction } from '@/lib/domain/types';

const s = StyleSheet.create({
  head: { direction: 'rtl', flexDirection: 'row', backgroundColor: PDF.headerBg, paddingVertical: 7, paddingHorizontal: 8 },
  th: { color: PDF.white, fontSize: 8.5, fontWeight: 'bold', textAlign: 'center' },
  row: { direction: 'rtl', flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: PDF.border },
  rowAlt: { backgroundColor: PDF.rowAlt },
  td: { fontSize: 8.5, color: PDF.text, textAlign: 'center' },

  totalRow: {
    direction: 'rtl',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: PDF.logoGreenSoft,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1.5,
    borderTopColor: PDF.primary,
  },
  totalLabel: { fontSize: 9.5, fontWeight: 'bold', color: PDF.logoGreen },

  balanceBox: {
    marginTop: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: PDF.primary,
    borderRadius: 8,
    backgroundColor: PDF.sunSoft,
    alignItems: 'center',
  },
});

export type FarmerStatementProps = {
  farmer: FarmerStats;
  supplies: SupplyTransaction[];
  payments: Payment[];
  sessionLabel?: string;
};

export function FarmerStatementPDF({ farmer, supplies, payments, sessionLabel }: FarmerStatementProps) {
  const sortedSupplies = [...supplies].sort((a, b) => a.date.localeCompare(b.date));
  const sortedPayments = [...payments].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <ReportShell
      title="كشف حساب فلاح"
      subtitle={sessionLabel ? `الفترة: ${sessionLabel}` : 'كشف مورّد'}
      summaryPrimaryDateLabel="تاريخ الإصدار"
      metaCells={[
        { label: 'الفلاح', value: farmer.fullName },
        { label: 'الكود', value: farmer.code, valueDirection: 'ltr' },
        { label: 'إجمالي اللترات', value: `${pdfFmtNum(farmer.totalSupplied, 0)} لتر` },
        { label: 'الرصيد المستحق', moneyAmount: farmer.creditBalance },
      ]}
    >
      <PdfInfoGrid
        items={[
          { label: 'المنطقة', value: farmer.region },
          { label: 'الهاتف', value: farmer.phone, ltr: true },
          { label: 'المصرف', value: farmer.bankName ?? '—' },
          { label: 'رقم الحساب', value: farmer.bankAccount ?? '—', ltr: true },
          { label: 'رقم الآيبان', value: farmer.iban ?? '—', ltr: true },
          { label: 'متوسط سعر اللتر', value: `${pdfFmtNum(farmer.avgPrice, 3)} د.ل` },
          { label: 'إجمالي المدفوع', value: `${pdfFmtNum(farmer.paidTotal)} د.ل` },
          { label: 'عدد عمليات الاستلام', value: String(farmer.supplyCount) },
        ]}
      />

      <PdfSectionTitle>سجلّ الاستلام</PdfSectionTitle>
      <View style={s.head}>
        <Text style={[s.th, { flex: 1.2 }]}>{ar('التاريخ')}</Text>
        <Text style={[s.th, { flex: 1.4 }]}>{ar('المرجع')}</Text>
        <Text style={[s.th, { flex: 0.9 }]}>{ar('الوجبة')}</Text>
        <Text style={[s.th, { flex: 1 }]}>{ar('الكمية (لتر)')}</Text>
        <Text style={[s.th, { flex: 1 }]}>{ar('السعر')}</Text>
        <Text style={[s.th, { flex: 0.9 }]}>{ar('الجودة')}</Text>
        <Text style={[s.th, { flex: 1.2 }]}>{ar('الإجمالي')}</Text>
      </View>
      {sortedSupplies.map((sup, i) => (
        <View key={sup.id} style={[s.row, i % 2 === 1 && s.rowAlt]}>
          <Text style={[s.td, { flex: 1.2 }]}>{ar(pdfFmtDate(sup.date))}</Text>
          <Text style={[s.td, { flex: 1.4, direction: 'ltr' }]}>{ar(sup.ref)}</Text>
          <Text style={[s.td, { flex: 0.9 }]}>{ar(MILK_SHIFT_LABELS[sup.milkShift ?? 'morning'])}</Text>
          <Text style={[s.td, { flex: 1 }]}>{ar(pdfFmtNum(sup.quantity, 1))}</Text>
          <Text style={[s.td, { flex: 1 }]}>{ar(pdfFmtNum(sup.unitPrice, 3))}</Text>
          <Text style={[s.td, { flex: 0.9 }]}>{ar(sup.qualityTier)}</Text>
          <Text style={[s.td, { flex: 1.2, fontWeight: 'bold' }]}>{ar(pdfFmtNum(sup.total))}</Text>
        </View>
      ))}
      <View style={s.totalRow}>
        <Text style={s.totalLabel}>{ar('إجمالي قيمة الاستلام')}</Text>
        <PdfMoneyText amount={farmer.totalSupplyValue} size="md" />
      </View>

      {/* المدفوعات */}
      {sortedPayments.length > 0 && (
        <>
          <PdfSectionTitle>الدفعات</PdfSectionTitle>
          <View style={s.head}>
            <Text style={[s.th, { flex: 1.4 }]}>{ar('التاريخ')}</Text>
            <Text style={[s.th, { flex: 1.6 }]}>{ar('المرجع')}</Text>
            <Text style={[s.th, { flex: 1.2 }]}>{ar('الطريقة')}</Text>
            <Text style={[s.th, { flex: 1.4 }]}>{ar('المبلغ')}</Text>
          </View>
          {sortedPayments.map((p, i) => (
            <View key={p.id} style={[s.row, i % 2 === 1 && s.rowAlt]}>
              <Text style={[s.td, { flex: 1.4 }]}>{ar(pdfFmtDate(p.date))}</Text>
              <Text style={[s.td, { flex: 1.6, direction: 'ltr' }]}>{ar(p.ref)}</Text>
              <Text style={[s.td, { flex: 1.2 }]}>{ar(PAYMENT_METHOD_LABELS[p.method])}</Text>
              <Text style={[s.td, { flex: 1.4, fontWeight: 'bold' }]}>{ar(pdfFmtNum(p.amount))}</Text>
            </View>
          ))}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>{ar('إجمالي المدفوع')}</Text>
            <PdfMoneyText amount={farmer.paidTotal} size="md" color={PDF.logoGreen} />
          </View>
        </>
      )}

      {/* الرصيد النهائي */}
      <View style={s.balanceBox}>
        <Text style={{ fontSize: 9, color: PDF.muted, marginBottom: 4 }}>{ar('الرصيد المستحق للفلاح')}</Text>
        <PdfMoneyText amount={farmer.creditBalance} size="lg" />
        <Text style={{ fontSize: 8, color: PDF.muted, marginTop: 6 }}>
          {ar('إجمالي الاستلام − إجمالي المدفوع')}
        </Text>
      </View>
    </ReportShell>
  );
}
