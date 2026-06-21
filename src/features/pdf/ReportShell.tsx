// @ts-nocheck
import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { ar, arDateParts } from './arabicPDF';
import { pdfBase } from './pdfBase';
import {
  TurkiPdfFooter,
  PdfBrandIdentity,
  PdfFactoryContactBar,
  PdfMoneyText,
  PdfLitersText,
} from './pdfBrandKit';
import { BRAND } from '@/lib/brand';

function docRefId(): string {
  const d = new Date();
  return `TRK-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
}

/** شريط التوقيع — مكوّن مستقل لدمجه مع ختام الكشوف دون إجبار صفحة جديدة */
export function PdfSignatureStrip({ minAhead = 0 }: { minAhead?: number }) {
  return (
    <View style={pdfBase.signatureStrip} wrap={false} minPresenceAhead={minAhead}>
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
  );
}

export type ReportShellMetaCell = {
  label: string;
  value?: string;
  moneyAmount?: number;
  litersAmount?: number;
  currency?: string;
  valueDirection?: 'ltr' | 'rtl';
};

/**
 * غلاف PDF موحّد — تصميم «ورقة رسمية» نظيف:
 * خط هوية ثلاثي أعلى الورقة، ترويسة مثبتة بخط فاصل واحد،
 * شريط ملخص هادئ بفواصل شعرية، وتذييل منخفض لا يزاحم المحتوى.
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
  // «يونيو 2026» → شهر وسنة منفصلان لعرضهما بترتيب بصري حتمي
  const [dateMonth = '', dateYear = ''] = dateParts.monthYear.split(' ');

  return (
    <Document
      title={`${BRAND.fullName} — ${title}`}
      author={BRAND.fullName}
      subject={BRAND.tagline}
      producer={BRAND.fullName}
    >
      <Page size="A4" style={pdfBase.page} wrap>
        {/* خط الهوية الثلاثي أعلى الورقة */}
        <View style={pdfBase.pageAccentBar} fixed />
        <View style={pdfBase.pageAccentStripe} fixed />
        <View style={pdfBase.pageAccentSun} fixed />

        {/* الترويسة المثبتة: عنوان (يسار) + هوية المصنع (يمين) فوق خط فاصل */}
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
          <View style={pdfBase.headerRule} />
          <View style={pdfBase.headerRuleAccent} />
          <View style={pdfBase.headerContactInline}>
            <PdfFactoryContactBar />
          </View>
        </View>

        {/* شريط ملخص الوثيقة */}
        {metaCells.length > 0 && (
          <View style={pdfBase.summaryStrip} wrap={false}>
            <View style={pdfBase.summaryCellDate}>
              <Text style={pdfBase.summaryEyebrow}>{ar(bigDateLabel)}</Text>
              {/* نصوص منفصلة بترتيب بصري صريح (سنة ← شهر ← يوم) كي لا يعبث البيدي بالترتيب */}
              <View style={pdfBase.summaryDateRow}>
                <Text style={pdfBase.summaryValue}>{ar(dateYear)}</Text>
                <Text style={pdfBase.summaryValue}>{ar(dateMonth)}</Text>
                <Text style={pdfBase.summaryValue}>{ar(dateParts.day)}</Text>
              </View>
              <View style={pdfBase.summaryDateRow}>
                <Text style={pdfBase.summarySub}>{dateParts.gregorian}</Text>
                <Text style={pdfBase.summarySub}>{ar('·')}</Text>
                <Text style={pdfBase.summarySub}>{ar(dateParts.weekday)}</Text>
              </View>
            </View>

            {metaCells.flatMap((c, i) => [
              <View key={`sum-div-${i}`} style={pdfBase.summaryDivider} />,
              <View key={`sum-cell-${i}`} style={pdfBase.summaryCell}>
                <Text style={pdfBase.summaryEyebrow}>{ar(c.label)}</Text>
                {c.moneyAmount != null && Number.isFinite(c.moneyAmount) ? (
                  <View style={{ alignItems: 'flex-end' }}>
                    <PdfMoneyText amount={c.moneyAmount} size="sm" />
                  </View>
                ) : c.litersAmount != null && Number.isFinite(c.litersAmount) ? (
                  <View style={{ alignItems: 'flex-end' }}>
                    <PdfLitersText liters={c.litersAmount} size="sm" />
                  </View>
                ) : (
                  <Text
                    style={[
                      pdfBase.summaryValue,
                      c.valueDirection === 'ltr' && { direction: 'ltr', textAlign: 'left' },
                    ]}
                  >
                    {ar(c.value ?? '')}
                  </Text>
                )}
              </View>,
            ])}
          </View>
        )}

        <View style={pdfBase.contentLayer}>{children}</View>

        {showSignature ? <PdfSignatureStrip /> : null}

        {showFooter ? <TurkiPdfFooter fixed={footerFixed} docRef={refId} /> : null}

        <Text
          style={pdfBase.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `${ar('صفحة')} ${pageNumber ?? 1} ${ar('من')} ${totalPages ?? 1}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
