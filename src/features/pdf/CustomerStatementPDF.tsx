// @ts-nocheck
import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportShell, PdfSignatureStrip } from './ReportShell';
import { ar } from './arabicPDF';
import { PDF, pdfBase } from './pdfBase';
import { PdfMoneyText, PdfInfoGrid, pdfFmtNum, pdfFmtDate, pdfFmtLiters, pdfFmtMoneyLibyan } from './pdfBrandKit';
import { PdfSectionTitle, PdfKeepTogether, PdfTh, PdfTd, PdfTdMoney } from './PdfTable';
import { CUSTOMER_TYPE_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/domain/constants';
import type { AgingBuckets, CustomerStats } from '@/lib/domain/calculations';
import type { Payment, SaleTransaction } from '@/lib/domain/types';

const s = StyleSheet.create({
  totalLabel: { fontSize: 9.5, fontWeight: 'bold', color: PDF.logoGreen, lineHeight: 1.4 },
  agingWrap: { direction: 'ltr', flexDirection: 'row-reverse', gap: 8, marginTop: 4 },
  agingCell: { flex: 1, borderWidth: 0.75, borderColor: PDF.border, borderTopWidth: 2, borderTopColor: PDF.accent, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', backgroundColor: PDF.white },
  agingLabel: { fontSize: 7, color: PDF.muted, marginBottom: 5, textAlign: 'center', lineHeight: 1.3 },
  agingValue: { fontSize: 10.5, fontWeight: 'bold', color: PDF.text, lineHeight: 1.3, direction: 'ltr' },
  balanceBox: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
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

  const salesTotal = sortedSales.reduce((sum, x) => sum + x.total, 0);
  const receiptsTotal = sortedPayments.reduce((sum, x) => sum + x.amount, 0);

  return (
    <ReportShell
      showSignature={false}
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
          { label: 'حد الائتمان', moneyAmount: customer.creditLimit, decimals: 0 },
          { label: 'مدة السداد', value: `${customer.paymentTerms} يوم` },
          { label: 'إجمالي المحصّل', moneyAmount: customer.receivedTotal },
          { label: 'نسبة استخدام الائتمان', value: `${pdfFmtNum(customer.creditUtilization, 1)}%` },
        ]}
      />

      <PdfSectionTitle>سجلّ المبيعات</PdfSectionTitle>
      <View style={pdfBase.tableHead} minPresenceAhead={40}>
        <PdfTh flex={1.2} kind="date">التاريخ</PdfTh>
        <PdfTh flex={1.4} kind="ref">المرجع</PdfTh>
        <PdfTh flex={1} kind="num">الكمية (لتر)</PdfTh>
        <PdfTh flex={1} kind="money">السعر</PdfTh>
        <PdfTh flex={1.2} kind="date">الاستحقاق</PdfTh>
        <PdfTh flex={1.2} kind="money">الإجمالي</PdfTh>
      </View>
      {sortedSales.map((sale, i) => (
        <View key={sale.id} style={[pdfBase.tableRow, i % 2 === 1 && pdfBase.rowEven]} wrap={false}>
          <PdfTd flex={1.2} kind="date">{pdfFmtDate(sale.date)}</PdfTd>
          <PdfTd flex={1.4} kind="ref">{sale.ref}</PdfTd>
          <PdfTd flex={1} kind="num">{pdfFmtNum(sale.quantity, 1)}</PdfTd>
          <PdfTdMoney flex={1} amount={sale.unitPrice} decimals={3} />
          <PdfTd flex={1.2} kind="date">{pdfFmtDate(sale.dueDate)}</PdfTd>
          <PdfTdMoney flex={1.2} amount={sale.total} bold />
        </View>
      ))}
      <View style={pdfBase.totalRowBar} minPresenceAhead={52}>
        <Text style={s.totalLabel}>{ar('إجمالي المبيعات المعروض')}</Text>
        <PdfMoneyText amount={salesTotal} size="md" />
      </View>

      {sortedPayments.length > 0 && (
        <>
          <PdfSectionTitle>التحصيلات</PdfSectionTitle>
          <View style={pdfBase.tableHead} minPresenceAhead={40}>
            <PdfTh flex={1.4} kind="date">التاريخ</PdfTh>
            <PdfTh flex={1.6} kind="ref">المرجع</PdfTh>
            <PdfTh flex={1.2}>الطريقة</PdfTh>
            <PdfTh flex={1.4} kind="money">المبلغ</PdfTh>
          </View>
          {sortedPayments.map((p, i) => (
            <View key={p.id} style={[pdfBase.tableRow, i % 2 === 1 && pdfBase.rowEven]} wrap={false}>
              <PdfTd flex={1.4} kind="date">{pdfFmtDate(p.date)}</PdfTd>
              <PdfTd flex={1.6} kind="ref">{p.ref}</PdfTd>
              <PdfTd flex={1.2}>{PAYMENT_METHOD_LABELS[p.method]}</PdfTd>
              <PdfTdMoney flex={1.4} amount={p.amount} color={PDF.logoGreen} bold />
            </View>
          ))}
          <View style={pdfBase.totalRowBar} minPresenceAhead={52}>
            <Text style={s.totalLabel}>{ar('إجمالي المحصّل المعروض')}</Text>
            <PdfMoneyText amount={receiptsTotal} size="md" color={PDF.logoGreen} />
          </View>
        </>
      )}

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
            <Text style={s.agingValue}>{pdfFmtNum(b.v, 0)}</Text>
          </View>
        ))}
      </View>

      <PdfKeepTogether minAhead={88}>
        <View style={s.balanceBox}>
          <Text style={{ fontSize: 8.5, color: PDF.muted, marginBottom: 3, lineHeight: 1.35 }}>{ar('الرصيد المستحق على العميل')}</Text>
          <PdfMoneyText amount={customer.outstanding} size="md" />
          <Text style={{ fontSize: 7.5, color: PDF.muted, marginTop: 4, lineHeight: 1.35 }}>{ar('وفق سجلات النظام شاملاً الديون المسجّلة والتسويات')}</Text>
        </View>
        <PdfSignatureStrip minAhead={0} />
      </PdfKeepTogether>
    </ReportShell>
  );
}
