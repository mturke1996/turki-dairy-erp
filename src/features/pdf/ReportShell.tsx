// @ts-nocheck
import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { ar, arDateParts } from './arabicPDF';
import { pdfBase } from './pdfBase';
import {
  TurkiPdfFooter,
  PdfBrandIdentity,
  PdfFactoryContactBar,
  pdfFmtMoneyLibyan,
} from './pdfBrandKit';
import { BRAND } from '@/lib/brand';

function docRefId(): string {
  const d = new Date();
  return `TRK-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
}

export type ReportShellMetaCell = {
  label: string;
  value?: string;
  moneyAmount?: number;
  currency?: string;
  valueDirection?: 'ltr' | 'rtl';
};

/**
 * غلاف PDF موحّد — ترويسة مثبتة واحدة (بدون تكرار يُسبّب صفحات فارغة).
 * مُحسَّن وفق منظومة Fluxen: هوامش معقولة + تذييل فقط مثبت.
 */
export function ReportShell({
  title,
  subtitle,
  metaCells = [],
  summaryPrimaryDateIso,
  summaryPrimaryDateLabel,
  children,
  showFooter = true,
  footerFixed = true,
  showSignature = true,
}: {
  title: string;
  subtitle?: string;
  metaCells?: ReportShellMetaCell[];
  summaryPrimaryDateIso?: string;
  summaryPrimaryDateLabel?: string;
  children: React.ReactNode;
  showFooter?: boolean;
  footerFixed?: boolean;
  showSignature?: boolean;
}) {
  const refId = docRefId();
  const summaryDate =
    summaryPrimaryDateIso != null && summaryPrimaryDateIso.trim() !== ''
      ? new Date(
          summaryPrimaryDateIso.includes('T')
            ? summaryPrimaryDateIso
            : `${summaryPrimaryDateIso.slice(0, 10)}T12:00:00`,
        )
      : null;
  const dateParts = arDateParts(
    summaryDate && !Number.isNaN(summaryDate.getTime()) ? summaryDate : new Date(),
  );
  const bigDateLabel = summaryPrimaryDateLabel ?? 'تاريخ إصدار الوثيقة';

  return (
    <Document
      title={`${BRAND.fullName} — ${title}`}
      author={BRAND.fullName}
      subject={BRAND.tagline}
      producer={BRAND.fullName}
    >
      <Page size="A4" style={pdfBase.page} wrap>
        <View style={pdfBase.pageAccentBar} fixed />
        <View style={pdfBase.pageAccentStripe} fixed />

        {/* ترويسة واحدة مثبتة — عنوان + شعار + تواصل */}
        <View style={pdfBase.headerFixed} fixed wrap={false}>
          <View style={pdfBase.header}>
            <View style={pdfBase.titleBoxAtLeft}>
              <Text style={pdfBase.reportType}>{ar('وثيقة رسمية')}</Text>
              <Text style={pdfBase.reportTitle}>{ar(title)}</Text>
              {subtitle ? <Text style={pdfBase.reportSub}>{ar(subtitle)}</Text> : null}
            </View>
            <View style={pdfBase.brandBoxFixed}>
              <PdfBrandIdentity />
            </View>
          </View>
          <View style={pdfBase.headerContactInline}>
            <PdfFactoryContactBar />
          </View>
        </View>

        {metaCells.length > 0 && (
          <View style={pdfBase.luxe} wrap={false}>
            <View style={pdfBase.luxeRibbon}>
              <Text style={pdfBase.luxeRibbonText}>{ar('ملخّص الوثيقة')}</Text>
              <Text style={pdfBase.luxeRibbonHint}>{ar(BRAND.name)}</Text>
            </View>

            <View style={pdfBase.luxeRow}>
              <View style={pdfBase.luxeDateCell}>
                <Text style={pdfBase.luxeEyebrow}>{ar(bigDateLabel)}</Text>
                <View style={pdfBase.luxeDateBlock}>
                  <Text style={pdfBase.luxeDay}>{dateParts.day}</Text>
                  <View style={pdfBase.luxeDateTexts}>
                    <Text style={pdfBase.luxeMonthYear}>{ar(dateParts.monthYear)}</Text>
                    <Text style={pdfBase.luxeWeekday}>{ar(dateParts.weekday)}</Text>
                  </View>
                </View>
                <Text style={pdfBase.luxeGregorian}>{ar(`ميلادي · ${dateParts.gregorian}`)}</Text>
              </View>

              {metaCells.flatMap((c, i) => [
                <View key={`luxe-div-${i}`} style={pdfBase.luxeDivider} />,
                <View key={`luxe-cell-${i}`} style={pdfBase.luxeCell}>
                  <Text style={pdfBase.luxeEyebrow}>{ar(c.label)}</Text>
                  {c.moneyAmount != null && Number.isFinite(c.moneyAmount) ? (
                    <Text style={pdfBase.luxeValue} dir="ltr">
                      {pdfFmtMoneyLibyan(c.moneyAmount)}
                    </Text>
                  ) : (
                    <Text
                      style={[
                        pdfBase.luxeValue,
                        c.valueDirection === 'ltr' && { direction: 'ltr', textAlign: 'left' },
                      ]}
                    >
                      {ar(c.value ?? '')}
                    </Text>
                  )}
                </View>,
              ])}
            </View>
          </View>
        )}

        <View style={pdfBase.contentLayer}>{children}</View>

        {showSignature ? (
          <View style={pdfBase.signatureStrip}>
            <View style={pdfBase.signatureCell}>
              <Text style={pdfBase.signatureLabel}>{ar('التوقيع المعتمد')}</Text>
              <View style={pdfBase.signatureLine} />
              <Text style={pdfBase.signatureHint}>{ar(BRAND.fullName)}</Text>
            </View>
            <View style={pdfBase.signatureCell}>
              <Text style={pdfBase.signatureLabel}>{ar('ختم المصنع')}</Text>
              <View style={pdfBase.signatureLine} />
              <Text style={pdfBase.signatureHint}>{ar(BRAND.contact.address)}</Text>
            </View>
          </View>
        ) : null}

        {showFooter ? <TurkiPdfFooter fixed={footerFixed} docRef={refId} /> : null}

        <Text
          style={pdfBase.pageNumber}
          render={({ pageNumber, totalPages }) => ar(`صفحة ${pageNumber ?? 1} من ${totalPages ?? 1}`)}
          fixed
        />
      </Page>
    </Document>
  );
}
