// @ts-nocheck
import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportShell } from './ReportShell';
import { ar } from './arabicPDF';
import { PDF } from './pdfBase';
import { PdfMoneyText, PdfInfoGrid, pdfFmtNum, pdfFmtDate, pdfFmtLiters, pdfFmtMoneyLibyan } from './pdfBrandKit';
import { PdfSectionTitle } from './PdfTable';
import { CUSTOMER_TYPE_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/domain/constants';
import type { AgingBuckets, CustomerStats } from '@/lib/domain/calculations';
import type { Payment, SaleTransaction } from '@/lib/domain/types';

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

  agingWrap: { direction: 'rtl', flexDirection: 'row', gap: 8, marginTop: 4 },
  agingCell: { flex: 1, borderWidth: 0.75, borderColor: PDF.border, borderTopWidth: 2, borderTopColor: PDF.accent, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', backgroundColor: PDF.white },
  agingLabel: { fontSize: 7, color: PDF.muted, marginBottom: 5, textAlign: 'center', lineHeight: 1.3 },
  agingValue: { fontSize: 10.5, fontWeight: 'bold', color: PDF.text, lineHeight: 1.3 },

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

export type CustomerStatementProps = {
  customer: CustomerStats;
  sales: SaleTransaction[];
  payments: Payment[];
  aging: AgingBuckets;
  sessionLabel?: string;
};

export function CustomerStatementPDF({ customer, sales, payments, aging, sessionLabel }: CustomerStatementProps) {
  const sortedSales = [...sales].sort((a, b) => a.date.localeCompare(b.date));
  const sortedPayments = [...payments].sort((a, b) => a.date.localeCompare(b.date));

  // الإجماليات من الصفوف المعروضة نفسها — تطابق دائم مع الجدول
  const salesTotal = sortedSales.reduce((sum, x) => sum + x.total, 0);
  const receiptsTotal = sortedPayments.reduce((sum, x) => sum + x.amount, 0);

  return (
    <ReportShell
      title="كشف حساب عميل"
      subtitle={`كشف شامل بجميع الحركات${sessionLabel ? ` — أُصدر خلال ${sessionLabel}` : ''}`}
      summaryPrimaryDateLabel="تاريخ الإصدار"
      metaCells={[
        { label: 'العميل', value: customer.entityName },
        { label: 'الكود', value: customer.code, valueDirection: 'ltr' },
        { label: 'إجمالي المشتريات', value: pdfFmtLiters(customer.totalPurchased, 0) },
        { label: 'الدين', moneyAmount: customer.outstanding },
      ]}
    >
      <PdfInfoGrid
        items={[
          { label: 'النوع', value: CUSTOMER_TYPE_LABELS[customer.entityType] },
          { label: 'الهاتف', value: customer.phone, ltr: true },
          { label: 'حد الائتمان', value: pdfFmtMoneyLibyan(customer.creditLimit, 0) },
          { label: 'مدة السداد', value: `${customer.paymentTerms} يوم` },
          { label: 'إجمالي المحصّل', value: pdfFmtMoneyLibyan(customer.receivedTotal) },
          { label: 'نسبة استخدام الائتمان', value: `${pdfFmtNum(customer.creditUtilization, 1)}%` },
        ]}
      />

      <PdfSectionTitle>سجلّ المبيعات</PdfSectionTitle>
      <View style={s.head} minPresenceAhead={40}>
        <Text style={[s.th, { flex: 1.2 }]}>{ar('التاريخ')}</Text>
        <Text style={[s.th, { flex: 1.4 }]}>{ar('المرجع')}</Text>
        <Text style={[s.th, { flex: 1 }]}>{ar('الكمية (لتر)')}</Text>
        <Text style={[s.th, { flex: 1 }]}>{ar('السعر')}</Text>
        <Text style={[s.th, { flex: 1.2 }]}>{ar('الاستحقاق')}</Text>
        <Text style={[s.th, { flex: 1.2 }]}>{ar('الإجمالي')}</Text>
      </View>
      {sortedSales.map((sale, i) => (
        <View key={sale.id} style={[s.row, i % 2 === 1 && s.rowAlt]} wrap={false}>
          <Text style={[s.td, { flex: 1.2 }]}>{ar(pdfFmtDate(sale.date))}</Text>
          <Text style={[s.td, { flex: 1.4, direction: 'ltr' }]}>{ar(sale.ref)}</Text>
          <Text style={[s.td, { flex: 1 }]}>{ar(pdfFmtNum(sale.quantity, 1))}</Text>
          <Text style={[s.td, { flex: 1 }]}>{ar(pdfFmtNum(sale.unitPrice, 3))}</Text>
          <Text style={[s.td, { flex: 1.2 }]}>{ar(pdfFmtDate(sale.dueDate))}</Text>
          <Text style={[s.td, { flex: 1.2, fontWeight: 'bold' }]}>{ar(pdfFmtNum(sale.total))}</Text>
        </View>
      ))}
      <View style={s.totalRow} wrap={false}>
        <Text style={s.totalLabel}>{ar('إجمالي المبيعات المعروض')}</Text>
        <PdfMoneyText amount={salesTotal} size="md" />
      </View>

      {sortedPayments.length > 0 && (
        <>
          <PdfSectionTitle>التحصيلات</PdfSectionTitle>
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
            <Text style={s.totalLabel}>{ar('إجمالي المحصّل المعروض')}</Text>
            <PdfMoneyText amount={receiptsTotal} size="md" color={PDF.logoGreen} />
          </View>
        </>
      )}

      {/* أعمار الديون */}
      <PdfSectionTitle>أعمار الديون</PdfSectionTitle>
      <View style={s.agingWrap} wrap={false}>
        {[
          { l: 'غير مستحق', v: aging.current },
          { l: '1-30 يوم', v: aging.d1_30 },
          { l: '31-60 يوم', v: aging.d31_60 },
          { l: '61-90 يوم', v: aging.d61_90 },
          { l: '+90 يوم', v: aging.d90_plus },
        ].map((b, i) => (
          <View key={i} style={s.agingCell}>
            <Text style={s.agingLabel}>{ar(b.l)}</Text>
            <Text style={s.agingValue}>{ar(pdfFmtNum(b.v, 0))}</Text>
          </View>
        ))}
      </View>

      <View style={s.balanceBox} wrap={false}>
        <Text style={{ fontSize: 9, color: PDF.muted, marginBottom: 4, lineHeight: 1.4 }}>{ar('الرصيد المستحق على العميل')}</Text>
        <PdfMoneyText amount={customer.outstanding} size="lg" />
        <Text style={{ fontSize: 8, color: PDF.muted, marginTop: 6, lineHeight: 1.4 }}>{ar('وفق سجلات النظام شاملاً الديون المسجّلة والتسويات')}</Text>
      </View>
    </ReportShell>
  );
}
