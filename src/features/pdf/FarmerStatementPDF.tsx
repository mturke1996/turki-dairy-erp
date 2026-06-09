// @ts-nocheck
import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportShell } from './ReportShell';
import { ar } from './arabicPDF';
import { PDF } from './pdfBase';
import { PdfMoneyText, PdfInfoGrid, pdfFmtNum, pdfFmtDate, pdfFmtLiters, pdfFmtMoneyLibyan } from './pdfBrandKit';
import { PdfSectionTitle } from './PdfTable';
import { MILK_SHIFT_LABELS, QUALITY_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/domain/constants';
import type { FarmerStats } from '@/lib/domain/calculations';
import type { Payment, SupplyTransaction } from '@/lib/domain/types';

const s = StyleSheet.create({
  head: { direction: 'rtl', flexDirection: 'row', backgroundColor: PDF.primary, paddingVertical: 9, paddingHorizontal: 9, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: PDF.accent },
  th: { color: PDF.white, fontSize: 8.5, fontWeight: 'bold', textAlign: 'center', lineHeight: 1.4 },
  row: { direction: 'rtl', flexDirection: 'row', paddingVertical: 7.5, paddingHorizontal: 9, borderBottomWidth: 0.5, borderBottomColor: PDF.border, alignItems: 'center' },
  rowAlt: { backgroundColor: PDF.rowAlt },
  td: { fontSize: 8.5, color: PDF.text, textAlign: 'center', lineHeight: 1.45 },

  totalRow: {
    direction: 'rtl',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: PDF.logoGreenSoft,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderTopWidth: 1.5,
    borderTopColor: PDF.accent,
  },
  totalLabel: { fontSize: 9.5, fontWeight: 'bold', color: PDF.logoGreen, lineHeight: 1.4 },

  balanceBox: {
    marginTop: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 0.75,
    borderColor: PDF.border,
    borderTopWidth: 2.5,
    borderTopColor: PDF.accent,
    backgroundColor: PDF.paleGold,
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

  // الإجماليات تُحسب من الصفوف المعروضة نفسها كي تتطابق دائماً مع الجدول
  const suppliesTotal = sortedSupplies.reduce((sum, x) => sum + x.total, 0);
  const paymentsTotal = sortedPayments.reduce((sum, x) => sum + x.amount, 0);

  return (
    <ReportShell
      title="كشف حساب فلاح"
      subtitle={`كشف شامل بجميع الحركات${sessionLabel ? ` — أُصدر خلال ${sessionLabel}` : ''}`}
      summaryPrimaryDateLabel="تاريخ الإصدار"
      metaCells={[
        { label: 'الفلاح', value: farmer.fullName },
        { label: 'الكود', value: farmer.code, valueDirection: 'ltr' },
        { label: 'إجمالي اللترات', value: pdfFmtLiters(farmer.totalSupplied, 0) },
        { label: 'الدين', moneyAmount: farmer.creditBalance },
      ]}
    >
      <PdfInfoGrid
        items={[
          { label: 'المنطقة', value: farmer.region },
          { label: 'الهاتف', value: farmer.phone, ltr: true },
          { label: 'المصرف', value: farmer.bankName ?? '—' },
          { label: 'رقم الحساب', value: farmer.bankAccount ?? '—', ltr: true },
          { label: 'رقم الآيبان', value: farmer.iban ?? '—', ltr: true },
          { label: 'متوسط سعر اللتر', value: pdfFmtMoneyLibyan(farmer.avgPrice, 3) },
          { label: 'إجمالي المدفوع', value: pdfFmtMoneyLibyan(farmer.paidTotal) },
          { label: 'عدد عمليات الاستلام', value: String(farmer.supplyCount) },
        ]}
      />

      <PdfSectionTitle>سجلّ الاستلام</PdfSectionTitle>
      <View style={s.head} minPresenceAhead={40}>
        <Text style={[s.th, { flex: 1.2 }]}>{ar('التاريخ')}</Text>
        <Text style={[s.th, { flex: 1.4 }]}>{ar('المرجع')}</Text>
        <Text style={[s.th, { flex: 0.9 }]}>{ar('الوجبة')}</Text>
        <Text style={[s.th, { flex: 1 }]}>{ar('الكمية (لتر)')}</Text>
        <Text style={[s.th, { flex: 1 }]}>{ar('السعر')}</Text>
        <Text style={[s.th, { flex: 0.9 }]}>{ar('الجودة')}</Text>
        <Text style={[s.th, { flex: 1.2 }]}>{ar('الإجمالي')}</Text>
      </View>
      {sortedSupplies.map((sup, i) => (
        <View key={sup.id} style={[s.row, i % 2 === 1 && s.rowAlt]} wrap={false}>
          <Text style={[s.td, { flex: 1.2 }]}>{ar(pdfFmtDate(sup.date))}</Text>
          <Text style={[s.td, { flex: 1.4, direction: 'ltr' }]}>{ar(sup.ref)}</Text>
          <Text style={[s.td, { flex: 0.9 }]}>{ar(MILK_SHIFT_LABELS[sup.milkShift ?? 'morning'])}</Text>
          <Text style={[s.td, { flex: 1 }]}>{ar(pdfFmtNum(sup.quantity, 1))}</Text>
          <Text style={[s.td, { flex: 1 }]}>{ar(pdfFmtNum(sup.unitPrice, 3))}</Text>
          <Text style={[s.td, { flex: 0.9 }]}>{ar(QUALITY_LABELS[sup.qualityTier] ?? sup.qualityTier)}</Text>
          <Text style={[s.td, { flex: 1.2, fontWeight: 'bold' }]}>{ar(pdfFmtNum(sup.total))}</Text>
        </View>
      ))}
      <View style={s.totalRow} wrap={false}>
        <Text style={s.totalLabel}>{ar('إجمالي قيمة الاستلام المعروض')}</Text>
        <PdfMoneyText amount={suppliesTotal} size="md" />
      </View>

      {/* المدفوعات */}
      {sortedPayments.length > 0 && (
        <>
          <PdfSectionTitle>الدفعات</PdfSectionTitle>
          <View style={s.head} minPresenceAhead={40}>
            <Text style={[s.th, { flex: 1.4 }]}>{ar('التاريخ')}</Text>
            <Text style={[s.th, { flex: 1.6 }]}>{ar('المرجع')}</Text>
            <Text style={[s.th, { flex: 1.2 }]}>{ar('الطريقة')}</Text>
            <Text style={[s.th, { flex: 1.4 }]}>{ar('المبلغ')}</Text>
          </View>
          {sortedPayments.map((p, i) => (
            <View key={p.id} style={[s.row, i % 2 === 1 && s.rowAlt]} wrap={false}>
              <Text style={[s.td, { flex: 1.4 }]}>{ar(pdfFmtDate(p.date))}</Text>
              <Text style={[s.td, { flex: 1.6, direction: 'ltr' }]}>{ar(p.ref)}</Text>
              <Text style={[s.td, { flex: 1.2 }]}>{ar(PAYMENT_METHOD_LABELS[p.method])}</Text>
              <Text style={[s.td, { flex: 1.4, fontWeight: 'bold' }]}>{ar(pdfFmtNum(p.amount))}</Text>
            </View>
          ))}
          <View style={s.totalRow} wrap={false}>
            <Text style={s.totalLabel}>{ar('إجمالي المدفوع المعروض')}</Text>
            <PdfMoneyText amount={paymentsTotal} size="md" color={PDF.logoGreen} />
          </View>
        </>
      )}

      {/* الرصيد النهائي */}
      <View style={s.balanceBox} wrap={false}>
        <Text style={{ fontSize: 9, color: PDF.muted, marginBottom: 4, lineHeight: 1.4 }}>{ar('الرصيد المستحق للفلاح')}</Text>
        <PdfMoneyText amount={farmer.creditBalance} size="lg" />
        <Text style={{ fontSize: 8, color: PDF.muted, marginTop: 6, lineHeight: 1.4 }}>
          {ar('وفق سجلات النظام شاملاً الأرصدة الافتتاحية والتسويات')}
        </Text>
      </View>
    </ReportShell>
  );
}
