// @ts-nocheck
import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { ar } from './arabicPDF';
import { PDF, pdfBase } from './pdfBase';

export type PdfTableColumn = {
  key: string;
  label: string;
  flex: number;
  align?: 'right' | 'left' | 'center';
};

export type PdfTableRow = Record<string, React.ReactNode>;

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
      <View style={pdfBase.tableHead}>
        {columns.map((c) => (
          <Text key={c.key} style={[pdfBase.th, { flex: c.flex, textAlign: c.align ?? 'right' }]}>
            {ar(c.label)}
          </Text>
        ))}
      </View>

      {rows.length === 0 ? (
        <Text style={pdfBase.tdMuted}>{ar(emptyMessage)}</Text>
      ) : (
        rows.map((row, i) => (
          <View key={i} style={[pdfBase.tableRow, i % 2 === 1 && pdfBase.rowEven]}>
            {columns.map((c) => (
              <View key={c.key} style={{ flex: c.flex }}>
                {typeof row[c.key] === 'string' || typeof row[c.key] === 'number' ? (
                  <Text style={[pdfBase.td, { textAlign: c.align ?? 'right' }]}>{ar(String(row[c.key] ?? ''))}</Text>
                ) : (
                  row[c.key]
                )}
              </View>
            ))}
          </View>
        ))
      )}

      {footer ? <View style={pdfBase.tableFoot}>{footer}</View> : null}
    </View>
  );
}

export function PdfSectionTitle({ children }: { children: string }) {
  return <Text style={pdfBase.sectionTitle}>{ar(children)}</Text>;
}

export function PdfMoneyCell({
  amount,
  color = PDF.text,
  bold = false,
}: {
  amount: number | string;
  color?: string;
  bold?: boolean;
}) {
  return (
    <Text style={[pdfBase.td, { textAlign: 'left', color, fontWeight: bold ? 'bold' : 'normal' }]}>
      {ar(String(amount))}
    </Text>
  );
}
