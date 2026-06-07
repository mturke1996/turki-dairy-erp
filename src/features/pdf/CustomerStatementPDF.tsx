// @ts-nocheck
import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportShell } from './ReportShell';
import { ar } from './arabicPDF';
import { PDF } from './pdfBase';
import { PdfMoneyText, pdfFmtNum, pdfFmtDate } from './pdfBrandKit';
import { CUSTOMER_TYPE_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/domain/constants';
import type { AgingBuckets, CustomerStats } from '@/lib/domain/calculations';
import type { Payment, SaleTransaction } from '@/lib/domain/types';

const s = StyleSheet.create({
  infoBox: {
    direction: 'rtl',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
    padding: 10,
    backgroundColor: PDF.rowAlt,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: PDF.border,
  },
  cell: { width: '31%' },
  label: { fontSize: 7.5, color: PDF.muted, marginBottom: 2, textAlign: 'right' },
  value: { fontSize: 10, color: PDF.text, fontWeight: 'bold', textAlign: 'right' },

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

  agingWrap: { direction: 'rtl', flexDirection: 'row', gap: 6, marginTop: 16 },
  agingCell: { flex: 1, borderWidth: 1, borderColor: PDF.border, borderRadius: 6, padding: 8, alignItems: 'center' },
  agingLabel: { fontSize: 7, color: PDF.muted, marginBottom: 4, textAlign: 'center' },
  agingValue: { fontSize: 10, fontWeight: 'bold', color: PDF.text },

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

  return (
    <ReportShell
      title="كشف حساب عميل"
      subtitle={sessionLabel ? `الفترة: ${sessionLabel}` : 'كشف ذمم'}
      summaryPrimaryDateLabel="تاريخ الإصدار"
      metaCells={[
        { label: 'العميل', value: customer.entityName },
        { label: 'الكود', value: customer.code, valueDirection: 'ltr' },
        { label: 'إجمالي المشتريات', value: `${pdfFmtNum(customer.totalPurchased, 0)} لتر` },
        { label: 'الرصيد المستحق', moneyAmount: customer.outstanding },
      ]}
    >
      <View style={s.infoBox}>
        <View style={s.cell}>
          <Text style={s.label}>{ar('النوع')}</Text>
          <Text style={s.value}>{ar(CUSTOMER_TYPE_LABELS[customer.entityType])}</Text>
        </View>
        <View style={s.cell}>
          <Text style={s.label}>{ar('الهاتف')}</Text>
          <Text style={[s.value, { direction: 'ltr', textAlign: 'right' }]}>{ar(customer.phone)}</Text>
        </View>
        <View style={s.cell}>
          <Text style={s.label}>{ar('حد الائتمان')}</Text>
          <Text style={s.value}>{ar(`${pdfFmtNum(customer.creditLimit, 0)} د.ل`)}</Text>
        </View>
        <View style={s.cell}>
          <Text style={s.label}>{ar('مدة السداد')}</Text>
          <Text style={s.value}>{ar(`${customer.paymentTerms} يوم`)}</Text>
        </View>
        <View style={s.cell}>
          <Text style={s.label}>{ar('إجمالي المحصّل')}</Text>
          <Text style={s.value}>{ar(`${pdfFmtNum(customer.receivedTotal)} د.ل`)}</Text>
        </View>
        <View style={s.cell}>
          <Text style={s.label}>{ar('نسبة استخدام الائتمان')}</Text>
          <Text style={s.value}>{ar(`${pdfFmtNum(customer.creditUtilization, 1)}%`)}</Text>
        </View>
      </View>

      <Text style={{ fontSize: 10.5, fontWeight: 'bold', color: PDF.primary, marginBottom: 6, textAlign: 'right' }}>
        {ar('سجلّ المبيعات')}
      </Text>
      <View style={s.head}>
        <Text style={[s.th, { flex: 1.2 }]}>{ar('التاريخ')}</Text>
        <Text style={[s.th, { flex: 1.4 }]}>{ar('المرجع')}</Text>
        <Text style={[s.th, { flex: 1 }]}>{ar('الكمية (لتر)')}</Text>
        <Text style={[s.th, { flex: 1 }]}>{ar('السعر')}</Text>
        <Text style={[s.th, { flex: 1.2 }]}>{ar('الاستحقاق')}</Text>
        <Text style={[s.th, { flex: 1.2 }]}>{ar('الإجمالي')}</Text>
      </View>
      {sortedSales.map((sale, i) => (
        <View key={sale.id} style={[s.row, i % 2 === 1 && s.rowAlt]}>
          <Text style={[s.td, { flex: 1.2 }]}>{ar(pdfFmtDate(sale.date))}</Text>
          <Text style={[s.td, { flex: 1.4, direction: 'ltr' }]}>{ar(sale.ref)}</Text>
          <Text style={[s.td, { flex: 1 }]}>{ar(pdfFmtNum(sale.quantity, 1))}</Text>
          <Text style={[s.td, { flex: 1 }]}>{ar(pdfFmtNum(sale.unitPrice, 3))}</Text>
          <Text style={[s.td, { flex: 1.2 }]}>{ar(pdfFmtDate(sale.dueDate))}</Text>
          <Text style={[s.td, { flex: 1.2, fontWeight: 'bold' }]}>{ar(pdfFmtNum(sale.total))}</Text>
        </View>
      ))}
      <View style={s.totalRow}>
        <Text style={s.totalLabel}>{ar('إجمالي المبيعات')}</Text>
        <PdfMoneyText amount={customer.totalRevenue} size="md" />
      </View>

      {sortedPayments.length > 0 && (
        <>
          <Text style={{ fontSize: 10.5, fontWeight: 'bold', color: PDF.primary, marginTop: 16, marginBottom: 6, textAlign: 'right' }}>
            {ar('التحصيلات')}
          </Text>
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
            <Text style={s.totalLabel}>{ar('إجمالي المحصّل')}</Text>
            <PdfMoneyText amount={customer.receivedTotal} size="md" color={PDF.logoGreen} />
          </View>
        </>
      )}

      {/* أعمار الديون */}
      <Text style={{ fontSize: 10.5, fontWeight: 'bold', color: PDF.primary, marginTop: 16, marginBottom: 2, textAlign: 'right' }}>
        {ar('أعمار الديون')}
      </Text>
      <View style={s.agingWrap}>
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

      <View style={s.balanceBox}>
        <Text style={{ fontSize: 9, color: PDF.muted, marginBottom: 4 }}>{ar('الرصيد المستحق على العميل')}</Text>
        <PdfMoneyText amount={customer.outstanding} size="lg" />
        <Text style={{ fontSize: 8, color: PDF.muted, marginTop: 6 }}>{ar('إجمالي المبيعات − إجمالي المحصّل')}</Text>
      </View>
    </ReportShell>
  );
}
