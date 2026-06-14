// @ts-nocheck
import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportShell } from './ReportShell';
import { ar, pdfDisplayValue } from './arabicPDF';
import { PDF, PDF_PAGINATION, pdfBase } from './pdfBase';
import { PdfMoneyText, PdfLitersText, pdfFmtNum, pdfFmtLiters } from './pdfBrandKit';
import { PdfSectionTitle, PdfTh, PdfTd, PdfTdMoney } from './PdfTable';
import type {
  SessionClosingReportProps,
  SessionClosingFarmerRow,
  SessionClosingCustomerRow,
  SessionClosingSettlement,
} from '@/lib/domain/session-closing-report';
import type { SessionSummary } from '@/lib/domain/calculations';

export type SessionClosingProps = SessionClosingReportProps;

const STATUS_LABEL: Record<'pending' | 'partial' | 'paid' | 'none', string> = {
  pending: 'مستحق',
  partial: 'جزئي',
  paid: 'مسدّد',
  none: '—',
};

const STATUS_COLOR: Record<'pending' | 'partial' | 'paid' | 'none', string> = {
  pending: PDF.danger,
  partial: PDF.sun,
  paid: PDF.logoGreen,
  none: PDF.muted,
};

const s = StyleSheet.create({
  /* ── Milk stock panel ── */
  milkPanel: {
    marginBottom: 16,
    borderWidth: 0.75,
    borderColor: PDF.border,
    borderTopWidth: 2.5,
    borderTopColor: PDF.accent,
    backgroundColor: PDF.white,
    overflow: 'hidden',
  },
  milkPanelHeader: {
    direction: 'rtl',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: PDF.paleGold,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF.border,
  },
  milkPanelTitle: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: PDF.primary,
    textAlign: 'right',
    lineHeight: 1.35,
  },
  netChangeBadge: {
    direction: 'ltr',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 0.75,
  },
  netChangeLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    lineHeight: 1.3,
  },
  flowStrip: {
    direction: 'ltr',
    flexDirection: 'row-reverse',
    borderBottomWidth: 0.5,
    borderBottomColor: PDF.border,
  },
  flowCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderLeftWidth: 0.5,
    borderLeftColor: PDF.border,
  },
  flowCellHighlight: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderLeftWidth: 0.5,
    borderLeftColor: PDF.border,
    backgroundColor: PDF.paleGold,
    borderTopWidth: 2,
    borderTopColor: PDF.sun,
  },
  flowOp: {
    fontSize: 7,
    color: PDF.muted,
    fontWeight: 'bold',
    marginBottom: 3,
    textAlign: 'center',
    lineHeight: 1.3,
  },
  flowLabel: {
    fontSize: 7.5,
    color: PDF.muted,
    marginBottom: 5,
    textAlign: 'center',
    lineHeight: 1.3,
  },
  equationBlock: {
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  eqRow: {
    direction: 'ltr',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF.border,
  },
  eqRowStrong: {
    direction: 'ltr',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginTop: 4,
    backgroundColor: PDF.paleGold,
    borderTopWidth: 1.5,
    borderTopColor: PDF.accent,
    borderRightWidth: 3,
    borderRightColor: PDF.sun,
  },
  eqLabel: {
    fontSize: 9,
    color: PDF.text,
    textAlign: 'right',
    lineHeight: 1.4,
  },
  eqLabelStrong: {
    fontSize: 10,
    fontWeight: 'bold',
    color: PDF.primary,
    textAlign: 'right',
    lineHeight: 1.4,
  },
  eqSign: {
    fontSize: 9,
    fontWeight: 'bold',
    color: PDF.muted,
    width: 16,
    textAlign: 'center',
    direction: 'ltr',
    lineHeight: 1.4,
  },
  /* ── Stats grid ── */
  grid: {
    direction: 'rtl',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  stat: {
    width: '31.8%',
    borderWidth: 0.75,
    borderColor: PDF.border,
    borderTopWidth: 2,
    borderTopColor: PDF.accent,
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: PDF.white,
  },
  statTitle: {
    fontSize: 7.5,
    color: PDF.muted,
    marginBottom: 6,
    textAlign: 'right',
    lineHeight: 1.3,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: PDF.primary,
    textAlign: 'right',
    lineHeight: 1.3,
  },
  statSub: {
    fontSize: 7.5,
    color: PDF.muted,
    marginTop: 4,
    textAlign: 'right',
    lineHeight: 1.3,
  },
  /* ── PnL rows ── */
  pnlRow: {
    direction: 'ltr',
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF.border,
  },
  pnlLabel: {
    fontSize: 9.5,
    color: PDF.text,
    lineHeight: 1.45,
    textAlign: 'right',
  },
  pnlStrong: {
    direction: 'ltr',
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: PDF.paleGold,
    borderRightWidth: 3,
    borderRightColor: PDF.accent,
    marginTop: 2,
  },
  pnlNet: {
    direction: 'ltr',
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: PDF.logoGreenSoft,
    borderTopWidth: 1.5,
    borderTopColor: PDF.accent,
    marginTop: 4,
  },
  /* ── Settlement reconcile ── */
  reconcileFoot: {
    direction: 'ltr',
    flexDirection: 'row-reverse',
    backgroundColor: PDF.logoGreenSoft,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1.5,
    borderTopColor: PDF.accent,
    alignItems: 'center',
  },
  reconcileFootLabel: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: PDF.logoGreen,
    textAlign: 'right',
    lineHeight: 1.4,
  },
  statusBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 7.5,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statusWrap: {
    flex: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pctText: {
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
    direction: 'ltr',
    lineHeight: 1.45,
  },
  paidCountText: {
    fontSize: 7.5,
    color: PDF.muted,
    textAlign: 'center',
    direction: 'ltr',
    lineHeight: 1.35,
    marginTop: 2,
  },
  /* ── Carry forward ── */
  carrySection: {
    marginTop: 20,
  },
  carrySectionTitle: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: PDF.primary,
    marginBottom: 10,
    textAlign: 'right',
    borderBottomWidth: 0.75,
    borderBottomColor: PDF.border,
    borderRightWidth: 3,
    borderRightColor: PDF.accent,
    paddingBottom: 5,
    paddingRight: 8,
    lineHeight: 1.35,
  },
  carryMilkBanner: {
    direction: 'ltr',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 8,
    borderWidth: 0.75,
    borderColor: PDF.border,
    borderTopWidth: 2.5,
    borderTopColor: PDF.sun,
    backgroundColor: PDF.paleGold,
  },
  carryMilkLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: PDF.primary,
    textAlign: 'right',
    lineHeight: 1.4,
  },
  carryMilkHint: {
    fontSize: 7.5,
    color: PDF.muted,
    marginTop: 3,
    textAlign: 'right',
    lineHeight: 1.35,
  },
  carryRow: {
    direction: 'ltr',
    flexDirection: 'row-reverse',
    gap: 0,
    borderWidth: 0.75,
    borderColor: PDF.border,
    borderTopWidth: 2,
    borderTopColor: PDF.accent,
    backgroundColor: PDF.white,
  },
  carryCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderLeftWidth: 0.5,
    borderLeftColor: PDF.border,
  },
  carryLabel: {
    fontSize: 7.5,
    color: PDF.muted,
    marginBottom: 5,
    lineHeight: 1.3,
    textAlign: 'center',
  },
  tableSectionNote: {
    fontSize: 7.5,
    color: PDF.muted,
    textAlign: 'right',
    marginBottom: 6,
    lineHeight: 1.35,
  },
});

function StatusBadge({ status }: { status: 'pending' | 'partial' | 'paid' | 'none' }) {
  const label = STATUS_LABEL[status];
  const color = STATUS_COLOR[status];
  const bg =
    status === 'paid'
      ? '#dcfce7'
      : status === 'partial'
        ? PDF.sunSoft
        : status === 'pending'
          ? '#fee2e2'
          : PDF.mutedBg;
  return (
    <View style={s.statusWrap}>
      <Text style={[s.statusBadge, { backgroundColor: bg, color }]}>{ar(label)}</Text>
    </View>
  );
}

function Stat({
  title,
  value,
  sub,
  color = PDF.primary,
  moneyAmount,
}: {
  title: string;
  value?: string;
  sub?: string;
  color?: string;
  moneyAmount?: number;
}) {
  return (
    <View style={s.stat} wrap={false}>
      <Text style={s.statTitle}>{ar(title)}</Text>
      {moneyAmount != null && Number.isFinite(moneyAmount) ? (
        <View style={{ alignItems: 'flex-end' }}>
          <PdfMoneyText amount={moneyAmount} size="sm" color={color} />
        </View>
      ) : (
        <Text style={[s.statValue, { color, direction: 'ltr', textAlign: 'right' }]}>
          {pdfDisplayValue(value ?? '')}
        </Text>
      )}
      {sub ? <Text style={s.statSub}>{ar(sub)}</Text> : null}
    </View>
  );
}

function PnlLine({
  label,
  amount,
  negative = false,
  strong = false,
  net = false,
}: {
  label: string;
  amount: number;
  negative?: boolean;
  strong?: boolean;
  net?: boolean;
}) {
  const display = negative ? -Math.abs(amount) : amount;
  const color = negative ? PDF.danger : strong || net ? PDF.logoGreen : PDF.text;
  const rowStyle = net ? s.pnlNet : strong ? s.pnlStrong : s.pnlRow;
  return (
    <View style={rowStyle} wrap={false} minPresenceAhead={strong || net ? PDF_PAGINATION.totalBar : 0}>
      <Text
        style={{
          fontSize: strong || net ? 10.5 : 9.5,
          fontWeight: strong || net ? 'bold' : 'normal',
          color: PDF.primary,
          lineHeight: 1.4,
        }}
      >
        {ar(label)}
      </Text>
      <PdfMoneyText amount={display} size={strong || net ? 'md' : 'sm'} color={color} />
    </View>
  );
}

function EquationRow({
  sign,
  label,
  liters,
  strong = false,
}: {
  sign?: '+' | '−' | '';
  label: string;
  liters: number;
  strong?: boolean;
}) {
  return (
    <View style={strong ? s.eqRowStrong : s.eqRow} wrap={false}>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, flex: 1 }}>
        <Text style={strong ? s.eqLabelStrong : s.eqLabel}>{ar(label)}</Text>
      </View>
      {sign ? <Text style={s.eqSign}>{sign}</Text> : <Text style={s.eqSign}> </Text>}
      <PdfLitersText liters={liters} size={strong ? 'lg' : 'md'} color={strong ? PDF.primary : PDF.text} />
    </View>
  );
}

function MilkStockPanel({ summary }: { summary: SessionSummary }) {
  const { openingStock, supplyQty, salesQty, closingStock } = summary;
  const adjustment = closingStock - openingStock - supplyQty + salesQty;
  const netChange = closingStock - openingStock;
  const netPositive = netChange >= 0;

  return (
    <View style={s.milkPanel} wrap={false}>
      <View style={s.milkPanelHeader}>
        <Text style={s.milkPanelTitle}>{ar('رصيد الحليب — من الافتتاحي إلى المتبقي')}</Text>
        <View
          style={[
            s.netChangeBadge,
            {
              backgroundColor: netPositive ? PDF.logoGreenSoft : '#fee2e2',
              borderColor: netPositive ? PDF.logoGreen : PDF.danger,
            },
          ]}
        >
          <Text style={[s.netChangeLabel, { color: netPositive ? PDF.logoGreen : PDF.danger }]}>
            {ar('صافي التغيّر')}
          </Text>
          <PdfLitersText
            liters={Math.abs(netChange)}
            size="sm"
            color={netPositive ? PDF.logoGreen : PDF.danger}
            prefix={netPositive ? '+' : '−'}
          />
        </View>
      </View>
      <View style={s.flowStrip}>
        <View style={s.flowCell}>
          <Text style={s.flowOp}> </Text>
          <Text style={s.flowLabel}>{ar('حليب افتتاحي')}</Text>
          <PdfLitersText liters={openingStock} size="md" />
        </View>
        <View style={s.flowCell}>
          <Text style={[s.flowOp, { color: PDF.logoGreen }]}>+</Text>
          <Text style={s.flowLabel}>{ar('وارد استلام')}</Text>
          <PdfLitersText liters={supplyQty} size="md" color={PDF.logoGreen} />
        </View>
        <View style={s.flowCell}>
          <Text style={[s.flowOp, { color: PDF.danger }]}>−</Text>
          <Text style={s.flowLabel}>{ar('صادر مبيعات')}</Text>
          <PdfLitersText liters={salesQty} size="md" color={PDF.primary} />
        </View>
        <View style={s.flowCellHighlight}>
          <Text style={s.flowOp}> </Text>
          <Text style={[s.flowLabel, { color: PDF.primary, fontWeight: 'bold' }]}>{ar('حليب متبقٍ')}</Text>
          <PdfLitersText liters={closingStock} size="lg" color={PDF.sun} />
        </View>
      </View>
      <View style={s.equationBlock}>
        <EquationRow label="رصيد افتتاحي الدورة" liters={openingStock} />
        <EquationRow sign="+" label="استلام" liters={supplyQty} />
        <EquationRow sign="−" label="مبيعات" liters={salesQty} />
        {Math.abs(adjustment) > 0.01 ? (
          <EquationRow sign={adjustment >= 0 ? '+' : '−'} label="تعديلات" liters={Math.abs(adjustment)} />
        ) : null}
        <EquationRow label="المتبقي — رصيد ختامي" liters={closingStock} strong />
      </View>
    </View>
  );
}

function SettlementReconcile({ settlement }: { settlement: SessionClosingSettlement }) {
  const rows = [
    {
      key: 'farmers',
      party: 'الفلاحون',
      obligation: settlement.farmerObligation,
      settled: settlement.farmerSettled,
      remaining: settlement.farmerRemaining,
      pct: settlement.farmerSettlementPct,
      paidCount: settlement.farmerPaidCount,
      totalCount: settlement.farmerTotalCount,
      settledLabel: 'المُسدَّد',
    },
    {
      key: 'customers',
      party: 'العملاء',
      obligation: settlement.customerObligation,
      settled: settlement.customerCollected,
      remaining: settlement.customerRemaining,
      pct: settlement.customerCollectionPct,
      paidCount: settlement.customerPaidCount,
      totalCount: settlement.customerTotalCount,
      settledLabel: 'المُحصَّل',
    },
  ];

  return (
    <View>
      <View style={pdfBase.tableHead} minPresenceAhead={PDF_PAGINATION.tableHead}>
        <PdfTh flex={1.6}>الطرف</PdfTh>
        <PdfTh flex={1.2} kind="money">المستحق</PdfTh>
        <PdfTh flex={1.2} kind="money">المُسدَّد / المُحصَّل</PdfTh>
        <PdfTh flex={1.1} kind="money">المتبقي</PdfTh>
        <PdfTh flex={0.7} kind="num">٪</PdfTh>
        <PdfTh flex={0.9} kind="num">مسدّد</PdfTh>
      </View>
      {rows.map((r, i) => (
        <View key={r.key} style={[pdfBase.tableRow, i % 2 === 1 && pdfBase.rowEven]} wrap={false}>
          <PdfTd flex={1.6} bold>
            {r.party}
          </PdfTd>
          <PdfTdMoney flex={1.2} amount={r.obligation} decimals={0} />
          <PdfTdMoney flex={1.2} amount={r.settled} decimals={0} color={PDF.logoGreen} />
          <PdfTdMoney
            flex={1.1}
            amount={r.remaining}
            decimals={0}
            color={r.remaining > 0.01 ? PDF.danger : PDF.text}
            bold={r.remaining > 0.01}
          />
          <Text
            style={[
              s.pctText,
              {
                flex: 0.7,
                color: r.pct >= 100 ? PDF.logoGreen : r.pct >= 50 ? PDF.text : PDF.danger,
              },
            ]}
          >
            {pdfFmtNum(r.pct, 0)}%
          </Text>
          <View style={{ flex: 0.9, alignItems: 'center' }}>
            <Text style={s.paidCountText}>
              {pdfFmtNum(r.paidCount, 0)}/{pdfFmtNum(r.totalCount, 0)}
            </Text>
          </View>
        </View>
      ))}
      <View style={s.reconcileFoot} minPresenceAhead={PDF_PAGINATION.totalBar}>
        <Text style={[s.reconcileFootLabel, { flex: 1.6 }]}>{ar('إجمالي المتبقي')}</Text>
        <Text style={{ flex: 1.2 }}> </Text>
        <Text style={{ flex: 1.2 }}> </Text>
        <PdfTdMoney
          flex={1.1}
          amount={settlement.farmerRemaining + settlement.customerRemaining}
          decimals={0}
          bold
          color={settlement.farmerRemaining + settlement.customerRemaining > 0.01 ? PDF.danger : PDF.logoGreen}
        />
        <Text style={{ flex: 0.7 }}> </Text>
        <Text style={{ flex: 0.9 }}> </Text>
      </View>
    </View>
  );
}

function FarmerSettlementTable({ rows }: { rows: SessionClosingFarmerRow[] }) {
  const active = rows.filter((r) => r.status !== 'none');
  if (active.length === 0) return null;

  return (
    <>
      <PdfSectionTitle>تسوية الفلاحين</PdfSectionTitle>
      <Text style={s.tableSectionNote}>
        {ar('مستحقات الفلاحين خلال الدورة — يشمل الأرصدة المُرحّلة والاستلام')}
      </Text>
      <View style={pdfBase.tableHead} minPresenceAhead={PDF_PAGINATION.tableHead}>
        <PdfTh flex={2}>الفلاح</PdfTh>
        <PdfTh flex={0.9} kind="num">مستلم</PdfTh>
        <PdfTh flex={1.1} kind="money">المستحق</PdfTh>
        <PdfTh flex={1.1} kind="money">المُسدَّد</PdfTh>
        <PdfTh flex={1} kind="money">المتبقي</PdfTh>
        <PdfTh flex={0.8} kind="num">الحالة</PdfTh>
      </View>
      {active.map((r, i) => (
        <View key={`${r.name}-${i}`} style={[pdfBase.tableRow, i % 2 === 1 && pdfBase.rowEven]} wrap={false}>
          <PdfTd flex={2} bold>
            {r.name}
          </PdfTd>
          <PdfTd flex={0.9} kind="num">
            {pdfFmtLiters(r.suppliedQty, 0)}
          </PdfTd>
          <PdfTdMoney flex={1.1} amount={r.obligation} decimals={0} />
          <PdfTdMoney flex={1.1} amount={r.settled} decimals={0} color={PDF.logoGreen} />
          <PdfTdMoney flex={1} amount={r.balance} decimals={0} color={r.balance > 0.01 ? PDF.danger : PDF.text} bold />
          <StatusBadge status={r.status} />
        </View>
      ))}
      <View style={pdfBase.totalRowBar} minPresenceAhead={PDF_PAGINATION.totalBar}>
        <Text style={{ fontSize: 9, fontWeight: 'bold', color: PDF.logoGreen, flex: 2, textAlign: 'right' }}>
          {ar('الإجمالي')}
        </Text>
        <Text style={{ flex: 0.9 }}> </Text>
        <PdfTdMoney flex={1.1} amount={active.reduce((s, r) => s + r.obligation, 0)} decimals={0} />
        <PdfTdMoney flex={1.1} amount={active.reduce((s, r) => s + r.settled, 0)} decimals={0} color={PDF.logoGreen} />
        <PdfTdMoney
          flex={1}
          amount={active.reduce((s, r) => s + r.balance, 0)}
          decimals={0}
          bold
          color={active.reduce((s, r) => s + r.balance, 0) > 0.01 ? PDF.danger : PDF.logoGreen}
        />
        <Text style={{ flex: 0.8 }}> </Text>
      </View>
    </>
  );
}

function CustomerSettlementTable({ rows }: { rows: SessionClosingCustomerRow[] }) {
  const active = rows.filter((r) => r.status !== 'none');
  if (active.length === 0) return null;

  return (
    <>
      <PdfSectionTitle>تسوية العملاء</PdfSectionTitle>
      <Text style={s.tableSectionNote}>
        {ar('ذمم العملاء — يشمل الأرصدة المُرحّلة ومبيعات الدورة')}
      </Text>
      <View style={pdfBase.tableHead} minPresenceAhead={PDF_PAGINATION.tableHead}>
        <PdfTh flex={1.8}>العميل</PdfTh>
        <PdfTh flex={0.8} kind="num">مباع</PdfTh>
        <PdfTh flex={0.9} kind="money">مرحّل</PdfTh>
        <PdfTh flex={1} kind="money">المستحق</PdfTh>
        <PdfTh flex={1} kind="money">المُحصَّل</PdfTh>
        <PdfTh flex={0.9} kind="money">المتبقي</PdfTh>
        <PdfTh flex={0.7} kind="num">الحالة</PdfTh>
      </View>
      {active.map((r, i) => (
        <View key={`${r.name}-${i}`} style={[pdfBase.tableRow, i % 2 === 1 && pdfBase.rowEven]} wrap={false}>
          <PdfTd flex={1.8} bold>
            {r.name}
          </PdfTd>
          <PdfTd flex={0.8} kind="num">
            {pdfFmtLiters(r.soldQty, 0)}
          </PdfTd>
          <PdfTdMoney flex={0.9} amount={r.carriedForward} decimals={0} />
          <PdfTdMoney flex={1} amount={r.obligation} decimals={0} />
          <PdfTdMoney flex={1} amount={r.settled} decimals={0} color={PDF.logoGreen} />
          <PdfTdMoney flex={0.9} amount={r.balance} decimals={0} color={r.balance > 0.01 ? PDF.danger : PDF.text} bold />
          <StatusBadge status={r.status} />
        </View>
      ))}
      <View style={pdfBase.totalRowBar} minPresenceAhead={PDF_PAGINATION.totalBar}>
        <Text style={{ fontSize: 9, fontWeight: 'bold', color: PDF.logoGreen, flex: 1.8, textAlign: 'right' }}>
          {ar('الإجمالي')}
        </Text>
        <Text style={{ flex: 0.8 }}> </Text>
        <PdfTdMoney flex={0.9} amount={active.reduce((s, r) => s + r.carriedForward, 0)} decimals={0} />
        <PdfTdMoney flex={1} amount={active.reduce((s, r) => s + r.obligation, 0)} decimals={0} />
        <PdfTdMoney flex={1} amount={active.reduce((s, r) => s + r.settled, 0)} decimals={0} color={PDF.logoGreen} />
        <PdfTdMoney
          flex={0.9}
          amount={active.reduce((s, r) => s + r.balance, 0)}
          decimals={0}
          bold
          color={active.reduce((s, r) => s + r.balance, 0) > 0.01 ? PDF.danger : PDF.logoGreen}
        />
        <Text style={{ flex: 0.7 }}> </Text>
      </View>
    </>
  );
}

function EmployeeCarryTable({ rows }: { rows: { name: string; balance: number }[] }) {
  if (rows.length === 0) return null;
  const withBalance = rows.filter((r) => Math.abs(r.balance) > 0.01);
  if (withBalance.length === 0) return null;

  return (
    <>
      <PdfSectionTitle>سلف الموظفين المُرحّلة</PdfSectionTitle>
      <View style={pdfBase.tableHead} minPresenceAhead={PDF_PAGINATION.tableHead}>
        <PdfTh flex={3}>الموظف</PdfTh>
        <PdfTh flex={1.4} kind="money">الرصيد</PdfTh>
      </View>
      {withBalance.map((r, i) => (
        <View key={`${r.name}-${i}`} style={[pdfBase.tableRow, i % 2 === 1 && pdfBase.rowEven]} wrap={false}>
          <PdfTd flex={3}>{r.name}</PdfTd>
          <PdfTdMoney flex={1.4} amount={r.balance} decimals={0} />
        </View>
      ))}
      <View style={pdfBase.totalRowBar} minPresenceAhead={PDF_PAGINATION.totalBar}>
        <Text style={{ fontSize: 9, fontWeight: 'bold', color: PDF.logoGreen, flex: 3, textAlign: 'right' }}>
          {ar('إجمالي السلف')}
        </Text>
        <PdfTdMoney flex={1.4} amount={withBalance.reduce((s, r) => s + r.balance, 0)} decimals={0} bold />
      </View>
    </>
  );
}

function ExternalCarryTable({
  rows,
}: {
  rows: { name: string; balance: number; direction: 'payable' | 'receivable' }[];
}) {
  if (rows.length === 0) return null;
  const withBalance = rows.filter((r) => Math.abs(r.balance) > 0.01);
  if (withBalance.length === 0) return null;

  return (
    <>
      <PdfSectionTitle>ديون خارجية مُرحّلة</PdfSectionTitle>
      <View style={pdfBase.tableHead} minPresenceAhead={PDF_PAGINATION.tableHead}>
        <PdfTh flex={2.4}>الطرف</PdfTh>
        <PdfTh flex={1}>الاتجاه</PdfTh>
        <PdfTh flex={1.3} kind="money">الرصيد</PdfTh>
      </View>
      {withBalance.map((r, i) => (
        <View key={`${r.name}-${i}`} style={[pdfBase.tableRow, i % 2 === 1 && pdfBase.rowEven]} wrap={false}>
          <PdfTd flex={2.4}>{r.name}</PdfTd>
          <PdfTd flex={1}>{r.direction === 'payable' ? 'علينا' : 'لنا'}</PdfTd>
          <PdfTdMoney flex={1.3} amount={r.balance} decimals={0} />
        </View>
      ))}
    </>
  );
}

function CarryForwardSection({
  carryForward,
  nextSessionLabel,
}: {
  carryForward: SessionClosingReportProps['carryForward'];
  nextSessionLabel?: string;
}) {
  return (
    <View style={s.carrySection} wrap={false} minPresenceAhead={PDF_PAGINATION.section}>
      <Text style={s.carrySectionTitle}>{ar('ما يُرحَّل للدورة التالية')}</Text>
      <View style={s.carryMilkBanner}>
        <View style={{ alignItems: 'flex-end', flex: 1 }}>
          <Text style={s.carryMilkLabel}>{ar('حليب افتتاحي — الدورة القادمة')}</Text>
          {nextSessionLabel ? (
            <Text style={s.carryMilkHint}>{ar(`الدورة: ${nextSessionLabel}`)}</Text>
          ) : null}
        </View>
        <PdfLitersText liters={carryForward.openingStock} size="xl" color={PDF.sun} />
      </View>
      <View style={s.carryRow}>
        <View style={s.carryCell}>
          <Text style={s.carryLabel}>{ar('ديون الفلاحين (علينا)')}</Text>
          <PdfMoneyText amount={carryForward.payables} size="sm" />
        </View>
        <View style={s.carryCell}>
          <Text style={s.carryLabel}>{ar('ذمم العملاء (لنا)')}</Text>
          <PdfMoneyText amount={carryForward.receivables} size="sm" color={PDF.logoGreen} />
        </View>
      </View>
    </View>
  );
}

function buildSubtitle(summary: SessionSummary, nextSessionLabel?: string): string {
  const { label, periodFrom, periodTo } = summary.session;
  const period = `${periodFrom} — ${periodTo}`;
  if (nextSessionLabel) {
    return `${label} · ${period} · التالية: ${nextSessionLabel}`;
  }
  return `${label} · ${period}`;
}

export function SessionClosingPDF({
  summary,
  carryForward,
  closedAtIso,
  nextSessionLabel,
  settlement,
  farmers,
  customers,
  employees,
  external,
}: SessionClosingProps) {
  const netCash = summary.customerReceipts - summary.farmerPayments;

  return (
    <ReportShell
      title="تقرير إغلاق دورة"
      subtitle={buildSubtitle(summary, nextSessionLabel)}
      summaryPrimaryDateIso={closedAtIso}
      summaryPrimaryDateLabel={closedAtIso ? 'تاريخ الإغلاق' : 'تاريخ التقرير'}
      metaCells={[
        { label: 'حليب افتتاحي', value: pdfFmtLiters(summary.openingStock, 0), valueDirection: 'ltr' },
        { label: 'حليب متبقٍ', value: pdfFmtLiters(summary.closingStock, 0), valueDirection: 'ltr' },
        { label: 'صافي الربح', moneyAmount: summary.netProfit },
        { label: 'إجمالي المبيعات', moneyAmount: summary.salesRevenue },
      ]}
    >
      <MilkStockPanel summary={summary} />
      <PdfSectionTitle>الملخص التشغيلي</PdfSectionTitle>
      <View style={s.grid}>
        <Stat
          title="عمليات الاستلام"
          value={pdfFmtNum(summary.supplyCount, 0)}
          sub={pdfFmtLiters(summary.supplyQty, 0)}
          color={PDF.logoGreen}
        />
        <Stat title="تكلفة الاستلام" moneyAmount={summary.supplyCost} sub="إجمالي المشتريات" />
        <Stat
          title="عمليات البيع"
          value={pdfFmtNum(summary.salesCount, 0)}
          sub={pdfFmtLiters(summary.salesQty, 0)}
        />
        <Stat title="تكلفة البضاعة المباعة" moneyAmount={summary.cogs} sub="تكلفة المبيعات" />
        <Stat
          title="الربح الإجمالي"
          moneyAmount={summary.grossProfit}
          sub={`هامش ${pdfFmtNum(summary.marginPct, 1)}%`}
          color={PDF.logoGreen}
        />
        <Stat
          title="صافي التدفق النقدي"
          moneyAmount={netCash}
          sub="تحصيلات − مدفوعات"
          color={netCash >= 0 ? PDF.logoGreen : PDF.danger}
        />
      </View>
      <PdfSectionTitle>قائمة الدخل المختصرة</PdfSectionTitle>
      <PnlLine label="إيرادات المبيعات" amount={summary.salesRevenue} />
      {summary.externalIncome > 0.01 ? (
        <PnlLine label="مدخولات خارجية" amount={summary.externalIncome} />
      ) : null}
      <PnlLine label="تكلفة البضاعة المباعة" amount={summary.cogs} negative />
      <PnlLine label="مجمل الربح" amount={summary.grossProfit} strong />
      {summary.wasteLosses > 0.01 ? (
        <PnlLine label="خسائر الهدر والتلف" amount={summary.wasteLosses} negative />
      ) : null}
      {summary.operatingExpenses > 0.01 ? (
        <PnlLine label="المصاريف التشغيلية" amount={summary.operatingExpenses} negative />
      ) : null}
      {summary.salaries > 0.01 ? (
        <PnlLine label="الرواتب والأجور" amount={summary.salaries} negative />
      ) : null}
      <PnlLine
        label={summary.netProfit >= 0 ? 'صافي الربح' : 'صافي الخسارة'}
        amount={summary.netProfit}
        net
      />
      <PdfSectionTitle>مطابقة التسوية النقدية</PdfSectionTitle>
      <Text style={s.tableSectionNote}>
        {ar('مقارنة الالتزامات المستحقة مقابل ما تم سداده أو تحصيله خلال الدورة')}
      </Text>
      <SettlementReconcile settlement={settlement} />
      {farmers.length > 0 ? <FarmerSettlementTable rows={farmers} /> : null}
      {customers.length > 0 ? <CustomerSettlementTable rows={customers} /> : null}
      {employees.length > 0 ? <EmployeeCarryTable rows={employees} /> : null}
      {external.length > 0 ? <ExternalCarryTable rows={external} /> : null}
      <CarryForwardSection carryForward={carryForward} nextSessionLabel={nextSessionLabel} />
    </ReportShell>
  );
}
