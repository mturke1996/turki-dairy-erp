// @ts-nocheck
import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { ar, arDateParts } from './arabicPDF';
import { pdfBase } from './pdfBase';
import {
  TurkiPdfFooter,
  PdfBrandIdentity,
  PdfFactoryContactBar,
  pdfFmtNum,
} from './pdfBrandKit';
import { usePdfLetterheadDataUri } from './pdf-logo-context';
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

/** هيكل صفحة PDF احترافي بهوية مصنع التركي للحليب ومشتقاته. */
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
  const letterhead = usePdfLetterheadDataUri();
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
    <Document title={`${BRAND.fullName} — ${title}`} author={BRAND.fullName} subject={BRAND.tagline}>
      <Page size="A4" style={pdfBase.page} wrap>
        <View style={pdfBase.pageAccentBar} fixed />
        <View style={pdfBase.pageAccentStripe} fixed />
        <View style={pdfBase.pageAccentSun} fixed />

        {letterhead ? (
          <View style={pdfBase.letterheadWatermark} fixed>
            <Image src={letterhead} style={{ width: '100%', height: 680, objectFit: 'contain' }} />
          </View>
        ) : null}

        <Text style={pdfBase.docRef} fixed dir="ltr">
          {refId}
        </Text>

        <View style={pdfBase.header} fixed>
          <View style={pdfBase.titleBoxAtLeft} wrap={false}>
            <Text style={pdfBase.reportType}>{ar('وثيقة رسمية')}</Text>
            <Text style={pdfBase.reportTitle}>{ar(title)}</Text>
            {subtitle ? <Text style={pdfBase.reportSub}>{ar(subtitle)}</Text> : null}
          </View>
          <View style={pdfBase.brandBoxFixed} wrap={false}>
            <PdfBrandIdentity logoWidth={172} logoHeight={54} />
          </View>
        </View>

        <View style={pdfBase.headerContactWrap} fixed>
          <PdfFactoryContactBar />
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
                    <View wrap={false} style={pdfBase.luxeMoneyRow}>
                      <Text style={pdfBase.luxeMoneyCurrency}>{ar(c.currency ?? 'د.ل')}</Text>
                      <Text style={pdfBase.luxeValue}>{pdfFmtNum(c.moneyAmount)}</Text>
                    </View>
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
          <View style={pdfBase.signatureStrip} wrap={false}>
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

        {showFooter && <TurkiPdfFooter fixed={footerFixed} docRef={refId} />}

        <Text
          style={pdfBase.pageNumber}
          render={({ pageNumber, totalPages }) => ar(`صفحة ${pageNumber ?? 1} من ${totalPages ?? 1}`)}
          fixed
        />
      </Page>
    </Document>
  );
}
