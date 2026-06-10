// @ts-nocheck
import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportShell, PdfSignatureStrip } from './ReportShell';
import { ar } from './arabicPDF';
import { PDF, pdfBase } from './pdfBase';
import { PdfMoneyText, PdfInfoGrid, pdfFmtDate, pdfFmtLiters, pdfFmtMoneyLibyan } from './pdfBrandKit';
import { PdfSectionTitle, PdfKeepTogether, PdfTh, PdfTd, PdfTdMoney } from './PdfTable';
import { MILK_SHIFT_LABELS, QUALITY_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/domain/constants';
import type { FarmerStats } from '@/lib/domain/calculations';
import type { Payment, SupplyTransaction } from '@/lib/domain/types';

const s = StyleSheet.create({
  totalLabel: { fontSize: 9.5, fontWeight: 'bold', color: PDF.logoGreen, lineHeight: 1.4 },
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

export type FarmerStatementProps = {
  farmer: FarmerStats;
  supplies: SupplyTransaction[];
  payments: Payment[];
  sessionLabel?: string;
};

export function FarmerStatementPDF({ farmer, supplies, payments, sessionLabel }: FarmerStatementProps) {
  const sortedSupplies = [...supplies].sort((a, b) => a.date.localeCompare(b.date));
  const sortedPayments = [...payments].sort((a, b) => a.date.localeCompare(b.date));

  const suppliesTotal = sortedSupplies.reduce((sum, x) => sum + x.total, 0);
  const paymentsTotal = sortedPayments.reduce((sum, x) => sum + x.amount, 0);

  return (
    <ReportShell
      showSignature={false}
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
          { label: 'متوسط سعر اللتر', moneyAmount: farmer.avgPrice, decimals: 3 },
          { label: 'إجمالي المدفوع', moneyAmount: farmer.paidTotal },
          { label: 'عدد عمليات الاستلام', value: String(farmer.supplyCount) },
        ]}
      />

      <PdfSectionTitle>سجلّ الاستلام</PdfSectionTitle>
      <View style={pdfBase.tableHead} minPresenceAhead={40}>
        <PdfTh flex={1.2} kind="date">التاريخ</PdfTh>
        <PdfTh flex={1.4} kind="ref">المرجع</PdfTh>
        <PdfTh flex={0.9}>الوجبة</PdfTh>
        <PdfTh flex={1} kind="num">الكمية (لتر)</PdfTh>
        <PdfTh flex={1} kind="money">السعر</PdfTh>
        <PdfTh flex={0.9}>الجودة</PdfTh>
        <PdfTh flex={1.2} kind="money">الإجمالي</PdfTh>
      </View>
      {sortedSupplies.map((sup, i) => (
        <View key={sup.id} style={[pdfBase.tableRow, i % 2 === 1 && pdfBase.rowEven]} wrap={false}>
          <PdfTd flex={1.2} kind="date">{pdfFmtDate(sup.date)}</PdfTd>
          <PdfTd flex={1.4} kind="ref">{sup.ref}</PdfTd>
          <PdfTd flex={0.9}>{MILK_SHIFT_LABELS[sup.milkShift ?? 'morning']}</PdfTd>
          <PdfTd flex={1} kind="num">{sup.quantity.toFixed(1)}</PdfTd>
          <PdfTdMoney flex={1} amount={sup.unitPrice} decimals={3} />
          <PdfTd flex={0.9}>{QUALITY_LABELS[sup.qualityTier] ?? sup.qualityTier}</PdfTd>
          <PdfTdMoney flex={1.2} amount={sup.total} bold />
        </View>
      ))}
      <View style={pdfBase.totalRowBar} minPresenceAhead={52}>
        <Text style={s.totalLabel}>{ar('إجمالي قيمة الاستلام المعروض')}</Text>
        <PdfMoneyText amount={suppliesTotal} size="md" />
      </View>

      {sortedPayments.length > 0 && (
        <>
          <PdfSectionTitle>الدفعات</PdfSectionTitle>
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
            <Text style={s.totalLabel}>{ar('إجمالي المدفوع المعروض')}</Text>
            <PdfMoneyText amount={paymentsTotal} size="md" color={PDF.logoGreen} />
          </View>
        </>
      )}

      <PdfKeepTogether minAhead={88}>
        <View style={s.balanceBox}>
          <Text style={{ fontSize: 8.5, color: PDF.muted, marginBottom: 3, lineHeight: 1.35 }}>{ar('الرصيد المستحق للفلاح')}</Text>
          <PdfMoneyText amount={farmer.creditBalance} size="md" />
          <Text style={{ fontSize: 7.5, color: PDF.muted, marginTop: 4, lineHeight: 1.35 }}>
            {ar('وفق سجلات النظام شاملاً الأرصدة الافتتاحية والتسويات')}
          </Text>
        </View>
        <PdfSignatureStrip minAhead={0} />
      </PdfKeepTogether>
    </ReportShell>
  );
}
