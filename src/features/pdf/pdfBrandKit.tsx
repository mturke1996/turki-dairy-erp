// @ts-nocheck
import { View, Text, StyleSheet, Image } from '@react-pdf/renderer';
import { PDF_FONT_FAMILY } from './pdfFonts';
import { ar } from './arabicPDF';
import { BRAND, buildPdfFooterLine } from '@/lib/brand';
import { usePdfLogoDataUri } from './pdf-logo-context';

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
    alignItems: 'flex-end',
    maxWidth: 250,
  },
  brandNameAr: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: P.primary,
    textAlign: 'right',
    lineHeight: 1.25,
    marginTop: 6,
  },
  brandNameEn: {
    fontSize: 7.5,
    color: P.muted,
    textAlign: 'right',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  brandTagline: {
    fontSize: 6.8,
    color: P.logoGreen,
    textAlign: 'right',
    marginTop: 4,
    lineHeight: 1.35,
    maxWidth: 230,
  },
  brandContact: {
    fontSize: 6.5,
    color: P.muted,
    textAlign: 'right',
    marginTop: 5,
    lineHeight: 1.4,
    maxWidth: 230,
  },

  contactBar: {
    direction: 'rtl',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 2,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: P.mutedBg,
    borderWidth: 0.5,
    borderColor: P.border,
    borderRadius: 4,
  },
  contactBarItem: {
    fontSize: 7,
    color: P.text,
    textAlign: 'right',
  },
  contactBarMuted: {
    fontSize: 6.5,
    color: P.muted,
    textAlign: 'left',
  },

  footer: {
    position: 'absolute',
    bottom: 16,
    left: 34,
    right: 34,
  },
  footerTopLine: {
    flexDirection: 'row',
    height: 4,
    marginBottom: 8,
    borderRadius: 2,
    overflow: 'hidden',
  },
  footerNavy: { flex: 5, backgroundColor: P.primary },
  footerGreen: { flex: 2, backgroundColor: P.accent },
  footerSun: { flex: 1, backgroundColor: P.sun },

  footerMain: {
    direction: 'rtl',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  footerBrandCol: { maxWidth: '58%' },
  footerBrandName: {
    fontSize: 9,
    fontWeight: 'bold',
    color: P.primary,
    textAlign: 'right',
    lineHeight: 1.3,
  },
  footerTagline: {
    fontSize: 6.5,
    color: P.logoGreen,
    textAlign: 'right',
    marginTop: 2,
  },
  footerMetaCol: { alignItems: 'flex-start', maxWidth: '38%' },
  footerRegion: {
    fontSize: 7,
    fontWeight: 'bold',
    color: P.primary,
    textAlign: 'left',
  },
  footerRef: {
    fontSize: 6.5,
    color: P.muted,
    textAlign: 'left',
    marginTop: 2,
  },

  footerContactRow: {
    direction: 'rtl',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: P.border,
    paddingTop: 5,
  },
  footerContact: {
    fontSize: 6.8,
    color: P.muted,
    textAlign: 'right',
    flex: 1,
  },
  footerEmail: {
    fontSize: 6.8,
    color: P.muted,
    textAlign: 'left',
    direction: 'ltr',
  },

  moneyRow: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'baseline',
    gap: 5,
    justifyContent: 'flex-end',
  },

  infoGrid: {
    direction: 'rtl',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: P.white,
  },
  infoCell: {
    width: '33.33%',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderLeftWidth: 0.5,
    borderColor: P.border,
    backgroundColor: P.rowAlt,
  },
  infoLabel: {
    fontSize: 6.8,
    color: P.muted,
    fontWeight: 'bold',
    letterSpacing: 0.6,
    marginBottom: 4,
    textAlign: 'right',
  },
  infoValue: {
    fontSize: 9.5,
    color: P.text,
    fontWeight: 'bold',
    textAlign: 'right',
    lineHeight: 1.25,
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
    letterSpacing: 1.2,
    marginBottom: 4,
    textAlign: 'left',
  },
  docTitle: { fontSize: 15, fontWeight: 'bold', color: P.primary, textAlign: 'left' },
  docRef: { fontSize: 8, color: P.muted, marginTop: 4, textAlign: 'left' },
});

/** شعار المصنع — عرض احترافي بدون قصّ مفرط. */
export const PdfLogoMark = ({ width = 168, height = 52 }: { width?: number; height?: number }) => {
  const injected = usePdfLogoDataUri();
  if (injected) {
    return (
      <View style={[pdfBrandStyles.logoShell, { width, height }]}>
        <Image src={injected} style={[pdfBrandStyles.logoImage, { width: width - 10, height: height - 10 }]} />
      </View>
    );
  }
  return (
    <Text style={[pdfBrandStyles.logoFallback, { width: 48, height: 48, fontSize: 22, lineHeight: 48 }]}>
      {ar(BRAND.monogram)}
    </Text>
  );
};

/** هوية المصنع: شعار + اسم + شعار نصي + تواصل. */
export const PdfBrandIdentity = ({ logoWidth = 168, logoHeight = 52 }: { logoWidth?: number; logoHeight?: number }) => (
  <View style={pdfBrandStyles.brandBlock}>
    <PdfLogoMark width={logoWidth} height={logoHeight} />
    <Text style={pdfBrandStyles.brandNameAr}>{ar(BRAND.fullName)}</Text>
    <Text style={pdfBrandStyles.brandNameEn}>{ar(BRAND.nameLatin)}</Text>
    <Text style={pdfBrandStyles.brandTagline}>{ar(BRAND.tagline)}</Text>
    <Text style={pdfBrandStyles.brandContact}>
      {ar(`${BRAND.contact.address}  ·  ${BRAND.contact.phone}`)}
    </Text>
  </View>
);

/** شريط بيانات المصنع تحت الترويسة. */
export const PdfFactoryContactBar = () => (
  <View style={pdfBrandStyles.contactBar} wrap={false}>
    <Text style={pdfBrandStyles.contactBarItem}>{ar(BRAND.contact.address)}</Text>
    <Text style={pdfBrandStyles.contactBarMuted} dir="ltr">
      {BRAND.contact.phone}
      {BRAND.contact.email ? `  ·  ${BRAND.contact.email}` : ''}
    </Text>
  </View>
);

export type PdfInfoItem = { label: string; value: string; ltr?: boolean };

/** شبكة بيانات موحّدة للتقارير. */
export const PdfInfoGrid = ({ items }: { items: PdfInfoItem[] }) => (
  <View style={pdfBrandStyles.infoGrid} wrap={false}>
    {items.map((item, i) => (
      <View key={i} style={pdfBrandStyles.infoCell}>
        <Text style={pdfBrandStyles.infoLabel}>{ar(item.label)}</Text>
        <Text
          style={[
            pdfBrandStyles.infoValue,
            item.ltr ? { direction: 'ltr', textAlign: 'left' } : null,
          ]}
        >
          {ar(item.value)}
        </Text>
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

export function pdfFmtMoneyLibyan(n: number, decimals = 2): string {
  return `${pdfFmtNum(n, decimals)} ${LIBYAN_CURRENCY_LABEL}`;
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
    <Text style={{ fontSize: MONEY_SIZE[size] * 0.72, fontWeight: 'bold', color }}>
      {LIBYAN_CURRENCY_LABEL}
    </Text>
    <Text style={{ fontSize: MONEY_SIZE[size], fontWeight: 'bold', color }}>{pdfFmtNum(amount, decimals)}</Text>
  </View>
);

/** تذييل رسمي ببيانات المصنع الكاملة. */
export const TurkiPdfFooter = ({ fixed = true, docRef }: { fixed?: boolean; docRef?: string }) => (
  <View style={pdfBrandStyles.footer} fixed={fixed}>
    <View style={pdfBrandStyles.footerTopLine}>
      <View style={pdfBrandStyles.footerNavy} />
      <View style={pdfBrandStyles.footerGreen} />
      <View style={pdfBrandStyles.footerSun} />
    </View>
    <View style={pdfBrandStyles.footerMain}>
      <View style={pdfBrandStyles.footerBrandCol}>
        <Text style={pdfBrandStyles.footerBrandName}>{ar(BRAND.fullName)}</Text>
        <Text style={pdfBrandStyles.footerTagline}>{ar(BRAND.tagline)}</Text>
      </View>
      <View style={pdfBrandStyles.footerMetaCol}>
        <Text style={pdfBrandStyles.footerRegion}>{ar(BRAND.region)}</Text>
        {docRef ? <Text style={pdfBrandStyles.footerRef} dir="ltr">{docRef}</Text> : null}
      </View>
    </View>
    <View style={pdfBrandStyles.footerContactRow}>
      <Text style={pdfBrandStyles.footerContact}>{ar(buildPdfFooterLine())}</Text>
      {BRAND.contact.email ? (
        <Text style={pdfBrandStyles.footerEmail}>{BRAND.contact.email}</Text>
      ) : null}
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
        {refLine ? <Text style={pdfBrandStyles.docRef} dir="ltr">{refLine}</Text> : null}
      </View>
      <PdfBrandIdentity logoWidth={150} logoHeight={46} />
    </View>
    <PdfFactoryContactBar />
  </View>
);
