// @ts-nocheck
import { View, Text, StyleSheet, Image } from '@react-pdf/renderer';
import { PDF_FONT_FAMILY } from './pdfFonts';
import { ar, ltrAmountCurrency } from './arabicPDF';
import { BRAND } from '@/lib/brand';
import { usePdfLogoDataUri, usePdfMarkDataUri } from './pdf-logo-context';

export const LIBYAN_CURRENCY_LABEL = 'د.ل';
const P = BRAND.pdfPalette;

export const PDFPalette = P;

export const pdfBrandStyles = StyleSheet.create({
  logoShell: {
    backgroundColor: P.white,
    borderWidth: 0.75,
    borderColor: P.border,
    borderRadius: 6,
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    objectFit: 'contain',
  },
  logoFallback: {
    backgroundColor: P.primary,
    color: P.white,
    fontFamily: PDF_FONT_FAMILY,
    fontWeight: 'bold',
    textAlign: 'center',
    borderRadius: 8,
  },

  brandBlock: {
    direction: 'rtl',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 9,
  },
  brandTextCol: {
    alignItems: 'flex-end',
    maxWidth: 240,
  },
  brandName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: P.primary,
    textAlign: 'right',
    lineHeight: 1.3,
  },
  brandTagline: {
    fontSize: 7.5,
    color: P.muted,
    textAlign: 'right',
    marginTop: 2,
    lineHeight: 1.35,
  },
  brandMarkShell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkImage: {
    objectFit: 'contain',
  },

  /* سطر تواصل نظيف بدون صندوق — عنوان يميناً، هاتف وبريد يساراً */
  contactBar: {
    direction: 'rtl',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactBarItem: {
    fontSize: 6.8,
    color: P.muted,
    textAlign: 'right',
    lineHeight: 1.35,
  },
  contactBarMuted: {
    fontSize: 6.8,
    color: P.muted,
    textAlign: 'left',
    lineHeight: 1.35,
    letterSpacing: 0.3,
  },

  /* ── تذييل نحيف: خط ثلاثي + سطر واحد ── */
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
  },
  footerTopLine: {
    direction: 'ltr',
    flexDirection: 'row-reverse',
    height: 2.5,
    marginBottom: 8,
  },
  footerNavy: { flex: 6, backgroundColor: P.primary },
  footerGreen: { flex: 1.6, backgroundColor: P.accent },
  footerSun: { flex: 0.6, backgroundColor: P.sun },

  footerMain: {
    direction: 'rtl',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerBrandName: {
    fontSize: 8,
    fontWeight: 'bold',
    color: P.primary,
    textAlign: 'right',
    lineHeight: 1.35,
  },
  footerRef: {
    fontSize: 6.3,
    color: P.muted,
    textAlign: 'left',
    direction: 'ltr',
    lineHeight: 1.35,
  },

  footerContactRow: {
    direction: 'rtl',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3.5,
  },
  footerContact: {
    fontSize: 6.5,
    color: P.muted,
    textAlign: 'right',
    lineHeight: 1.35,
  },
  footerEmail: {
    fontSize: 6.5,
    color: P.muted,
    textAlign: 'left',
    direction: 'ltr',
    lineHeight: 1.35,
  },

  moneyRow: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    gap: 4,
  },

  infoGrid: {
    direction: 'rtl',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
    marginBottom: 12,
    borderWidth: 0.75,
    borderColor: P.border,
    overflow: 'hidden',
    backgroundColor: P.white,
  },
  infoCell: {
    width: '33.33%',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderLeftWidth: 0.5,
    borderColor: P.border,
    backgroundColor: P.white,
  },
  infoLabel: {
    fontSize: 6.8,
    color: P.muted,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'right',
    lineHeight: 1.3,
  },
  infoValue: {
    fontSize: 9.5,
    color: P.text,
    fontWeight: 'bold',
    textAlign: 'right',
    lineHeight: 1.4,
  },

  headerShell: {
    direction: 'rtl',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: P.primary,
    marginBottom: 4,
  },
  titleRight: { alignItems: 'flex-start', maxWidth: '46%' },
  docKicker: {
    fontSize: 7,
    color: P.logoGreen,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'left',
  },
  docTitle: { fontSize: 15, fontWeight: 'bold', color: P.primary, textAlign: 'left' },
  docRef: { fontSize: 8, color: P.muted, marginTop: 4, textAlign: 'left' },
});

/** الشعار الرسومي — أيقونة المصنع */
export const PdfLogoMark = ({ width = 56, height = 56 }: { width?: number; height?: number }) => {
  const lockup = usePdfLogoDataUri();
  const mark = usePdfMarkDataUri();
  const src = mark ?? lockup;
  if (src) {
    return (
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
        <Image src={src} style={{ width, height, objectFit: 'contain' }} />
      </View>
    );
  }
  return (
    <Text style={[pdfBrandStyles.logoFallback, { width: 48, height: 48, fontSize: 22, lineHeight: 48 }]}>
      {ar(BRAND.monogram)}
    </Text>
  );
};

/** هوية PDF — اسم المصنع + الشعار الرسومي (مقروء على A4، مثل الواجهة) */
export const PdfBrandIdentity = ({ markSize = 50 }: { markSize?: number }) => {
  const mark = usePdfMarkDataUri();
  return (
    <View style={pdfBrandStyles.brandBlock} wrap={false}>
      <View style={pdfBrandStyles.brandTextCol}>
        <Text style={pdfBrandStyles.brandName}>{ar(BRAND.fullName)}</Text>
        <Text style={pdfBrandStyles.brandTagline}>{ar(BRAND.taglineShort)}</Text>
      </View>
      {mark ? (
        <View style={pdfBrandStyles.brandMarkShell}>
          <Image
            src={mark}
            style={[pdfBrandStyles.brandMarkImage, { width: markSize, height: markSize }]}
          />
        </View>
      ) : (
        <PdfLogoMark width={markSize} height={markSize} />
      )}
    </View>
  );
};

/** سطر بيانات المصنع تحت خط الترويسة — نص هادئ بلا صناديق. */
export const PdfFactoryContactBar = () => (
  <View style={pdfBrandStyles.contactBar} wrap={false}>
    <Text style={pdfBrandStyles.contactBarItem}>{ar(BRAND.contact.address)}</Text>
    <Text style={[pdfBrandStyles.contactBarMuted, { direction: 'ltr' }]}>
      {BRAND.contact.phone}
      {BRAND.contact.email ? `   ·   ${BRAND.contact.email}` : ''}
    </Text>
  </View>
);

export type PdfInfoItem = { label: string; value?: string; ltr?: boolean; moneyAmount?: number; decimals?: number };

/** شبكة بيانات موحّدة للتقارير. */
export const PdfInfoGrid = ({ items }: { items: PdfInfoItem[] }) => (
  <View style={pdfBrandStyles.infoGrid} wrap={false}>
    {items.map((item, i) => (
      <View key={i} style={pdfBrandStyles.infoCell}>
        <Text style={pdfBrandStyles.infoLabel}>{ar(item.label)}</Text>
        {item.moneyAmount != null && Number.isFinite(item.moneyAmount) ? (
          <View style={{ alignItems: 'flex-end' }}>
            <PdfMoneyText amount={item.moneyAmount} size="sm" decimals={item.decimals ?? 2} />
          </View>
        ) : (
          <Text
            style={[
              pdfBrandStyles.infoValue,
              item.ltr ? { direction: 'ltr', textAlign: 'right' } : null,
            ]}
          >
            {item.ltr ? item.value : ar(item.value ?? '')}
          </Text>
        )}
      </View>
    ))}
  </View>
);

export function pdfFmtNum(n: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(n) ? n : 0);
}

export function pdfFmtDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function pdfFmtUnit(n: number, unit: string, decimals = 0): string {
  return `${pdfFmtNum(n, decimals)} ${unit}`;
}

export function pdfFmtMoneyLibyan(n: number, decimals = 2): string {
  return ltrAmountCurrency(n, LIBYAN_CURRENCY_LABEL, decimals);
}

export function pdfFmtLiters(n: number, decimals = 0): string {
  return pdfFmtUnit(n, 'لتر', decimals);
}

const MONEY_SIZE = { sm: 10, md: 13, lg: 18 };

export const PdfMoneyText = ({
  amount,
  size = 'md',
  decimals = 2,
  color = P.primary,
}: {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  decimals?: number;
  color?: string;
}) => (
  <View style={pdfBrandStyles.moneyRow}>
    <Text style={{ fontSize: MONEY_SIZE[size] * 0.82, fontWeight: 'bold', color: P.muted, lineHeight: 1.35 }}>
      {LIBYAN_CURRENCY_LABEL}
    </Text>
    <Text style={{ fontSize: MONEY_SIZE[size], fontWeight: 'bold', color, direction: 'ltr', lineHeight: 1.35 }}>
      {pdfFmtNum(amount, decimals)}
    </Text>
  </View>
);

/** تذييل رسمي نحيف — خط هوية ثلاثي وسطران هادئان، لا يزاحم المحتوى أبداً. */
export const TurkiPdfFooter = ({ fixed = true, docRef }: { fixed?: boolean; docRef?: string }) => (
  <View style={pdfBrandStyles.footer} fixed={fixed} wrap={false}>
    <View style={pdfBrandStyles.footerTopLine}>
      <View style={pdfBrandStyles.footerNavy} />
      <View style={pdfBrandStyles.footerGreen} />
      <View style={pdfBrandStyles.footerSun} />
    </View>
    <View style={pdfBrandStyles.footerMain}>
      <Text style={pdfBrandStyles.footerBrandName}>{ar(BRAND.fullName)}</Text>
      <Text style={pdfBrandStyles.footerEmail}>
        {BRAND.contact.phone}
        {BRAND.contact.email ? `   ·   ${BRAND.contact.email}` : ''}
      </Text>
    </View>
    <View style={pdfBrandStyles.footerContactRow}>
      <Text style={pdfBrandStyles.footerContact}>{ar(`${BRAND.contact.address} · ${BRAND.region}`)}</Text>
      {docRef ? <Text style={pdfBrandStyles.footerRef}>{docRef}</Text> : null}
    </View>
  </View>
);

/** ترويسة بديلة للوثائق المستقلة. */
export const TurkiPdfHeader = ({
  titleEn,
  subtitleAr,
  refLine,
}: {
  titleEn: string;
  subtitleAr?: string;
  refLine?: string;
}) => (
  <View wrap={false}>
    <View style={pdfBrandStyles.headerShell}>
      <View style={pdfBrandStyles.titleRight}>
        <Text style={pdfBrandStyles.docKicker}>{ar('وثيقة رسمية — مصنع التركي')}</Text>
        <Text style={pdfBrandStyles.docTitle}>{ar(titleEn)}</Text>
        {subtitleAr ? <Text style={pdfBrandStyles.docRef}>{ar(subtitleAr)}</Text> : null}
        {refLine ? <Text style={pdfBrandStyles.docRef}>{refLine}</Text> : null}
      </View>
      <PdfBrandIdentity />
    </View>
    <PdfFactoryContactBar />
  </View>
);
