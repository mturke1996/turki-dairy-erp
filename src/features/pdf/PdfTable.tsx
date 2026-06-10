// @ts-nocheck
import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { ar } from './arabicPDF';
import { PDF, pdfBase } from './pdfBase';
import { pdfFmtNum, LIBYAN_CURRENCY_LABEL } from './pdfBrandKit';

export type PdfTableColumn = {
  key: string;
  label: string;
  flex: number;
  align?: 'right' | 'left' | 'center';
  kind?: 'text' | 'num' | 'money' | 'ref' | 'date';
};

export type PdfTableRow = Record<string, React.ReactNode>;

/** مبلغ عربي: د.ل يسار الرقم داخل جزيرة LTR (العملة «بعد» الرقم في القراءة العربية) */
export function PdfMoneyInline({
  amount,
  decimals = 2,
  size = 9,
  color = PDF.text,
  currencyColor = PDF.muted,
  bold = true,
}: {
  amount: number;
  decimals?: number;
  size?: number;
  color?: string;
  currencyColor?: string;
  bold?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', direction: 'ltr', gap: 3 }}>
      <Text style={{ fontSize: Math.max(size * 0.88, 7.5), color: currencyColor, fontWeight: bold ? 'bold' : 'normal' }}>
        {LIBYAN_CURRENCY_LABEL}
      </Text>
      <Text style={{ fontSize: size, fontWeight: bold ? 'bold' : 'normal', color, direction: 'ltr' }}>
        {pdfFmtNum(amount, decimals)}
      </Text>
    </View>
  );
}

export function PdfTh({
  flex,
  kind = 'text',
  children,
}: {
  flex: number;
  kind?: 'text' | 'num' | 'money' | 'ref' | 'date';
  children: string;
}) {
  const style =
    kind === 'money' ? pdfBase.thMoney : kind === 'num' || kind === 'date' || kind === 'ref' ? pdfBase.thNum : pdfBase.th;
  return (
    <Text style={[style, { flex }]}>{ar(children)}</Text>
  );
}

export function PdfTd({
  flex,
  kind = 'text',
  bold = false,
  color,
  children,
}: {
  flex: number;
  kind?: 'text' | 'num' | 'ref' | 'date';
  bold?: boolean;
  color?: string;
  children: string | number;
}) {
  const base =
    kind === 'num' ? pdfBase.tdNum : kind === 'ref' ? pdfBase.tdRef : kind === 'date' ? pdfBase.tdDate : pdfBase.td;
  const text = kind === 'num' || kind === 'date' ? String(children) : ar(String(children ?? ''));
  return (
    <Text
      style={[
        base,
        { flex },
        bold && { fontWeight: 'bold' },
        color ? { color } : null,
      ]}
    >
      {text}
    </Text>
  );
}

export function PdfTdMoney({
  flex,
  amount,
  decimals = 2,
  bold = true,
  color = PDF.text,
}: {
  flex: number;
  amount: number;
  decimals?: number;
  bold?: boolean;
  color?: string;
}) {
  return (
    <View style={[{ flex }, pdfBase.tdMoneyWrap]}>
      <PdfMoneyInline amount={amount} decimals={decimals} size={9} color={color} bold={bold} />
    </View>
  );
}

export function PdfTable({
  columns,
  rows,
  emptyMessage = 'لا توجد بيانات',
  footer,
}: {
  columns: PdfTableColumn[];
  rows: PdfTableRow[];
  emptyMessage?: string;
  footer?: React.ReactNode;
}) {
  return (
    <View>
      <View style={pdfBase.tableHead} minPresenceAhead={40}>
        {columns.map((c) => (
          <PdfTh key={c.key} flex={c.flex} kind={c.kind ?? (c.align === 'left' ? 'money' : c.align === 'center' ? 'num' : 'text')}>
            {c.label}
          </PdfTh>
        ))}
      </View>

      {rows.length === 0 ? (
        <Text style={pdfBase.tdMuted}>{ar(emptyMessage)}</Text>
      ) : (
        rows.map((row, i) => (
          <View key={i} style={[pdfBase.tableRow, i % 2 === 1 && pdfBase.rowEven]} wrap={false}>
            {columns.map((c) => (
              <View key={c.key} style={{ flex: c.flex }}>
                {typeof row[c.key] === 'string' || typeof row[c.key] === 'number' ? (
                  <PdfTd flex={1} kind={c.kind === 'money' ? 'num' : c.kind} bold={false}>
                    {String(row[c.key] ?? '')}
                  </PdfTd>
                ) : (
                  row[c.key]
                )}
              </View>
            ))}
          </View>
        ))
      )}

      {footer ? (
        <View style={pdfBase.tableFoot} wrap={false} minPresenceAhead={52}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

export function PdfSectionTitle({ children }: { children: string }) {
  return <Text style={pdfBase.sectionTitle}>{ar(children)}</Text>;
}

export function PdfKeepTogether({
  children,
  minAhead = 120,
}: {
  children: React.ReactNode;
  minAhead?: number;
}) {
  return (
    <View wrap={false} minPresenceAhead={minAhead}>
      {children}
    </View>
  );
}

/** @deprecated استخدم PdfTdMoney */
export function PdfMoneyCell({
  amount,
  color = PDF.text,
  bold = false,
}: {
  amount: number | string;
  color?: string;
  bold?: boolean;
}) {
  const n = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/,/g, ''));
  return <PdfMoneyInline amount={Number.isFinite(n) ? n : 0} color={color} bold={bold} />;
}
