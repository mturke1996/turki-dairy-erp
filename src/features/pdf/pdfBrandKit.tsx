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
  // ── الشعار ──
  logoWrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFallback: {
    backgroundColor: P.primary,
    color: '#ffffff',
    fontFamily: PDF_FONT_FAMILY,
    fontWeight: 'bold',
    textAlign: 'center',
    borderRadius: 10,
  },

  // ── ترويسة كاملة بديلة ──
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
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  identityText: { alignItems: 'flex-end' },
  companyFull: { fontSize: 12.5, fontWeight: 'bold', color: P.primary, textAlign: 'right' },
  tagEn: { fontSize: 7.5, color: P.muted, marginTop: 3, textAlign: 'right', maxWidth: 200 },
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

  // ── التذييل ──
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 34,
    right: 34,
  },
  footerWave: {
    flexDirection: 'row',
    height: 3,
    marginBottom: 6,
    borderRadius: 2,
    overflow: 'hidden',
  },
  footerWavePrimary: { flex: 3, height: 3, backgroundColor: P.primary },
  footerWaveAccent: { flex: 1, height: 3, backgroundColor: P.accent },
  footerRow: {
    direction: 'rtl',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerBrand: { fontSize: 8, fontWeight: 'bold', color: P.primary },
  footerContact: { fontSize: 7, color: P.muted, textAlign: 'left' },

  // ── مبالغ ──
  moneyRow: { flexDirection: 'row', direction: 'ltr', alignItems: 'baseline', gap: 5, justifyContent: 'flex-end' },
});

/** شعار المصنع — يُقصّ رأسياً (objectFit cover) لإزالة الهامش الأبيض. */
export const PdfLogoMark = ({ width = 150, height = 46 }: { width?: number; height?: number }) => {
  const injected = usePdfLogoDataUri();
  if (injected) {
    return (
      <View style={[pdfBrandStyles.logoWrap, { width, height }]}>
        <Image src={injected} style={{ width, height: height * 3.2, objectFit: 'cover' }} />
      </View>
    );
  }
  return (
    <Text style={[pdfBrandStyles.logoFallback, { width: 46, height: 46, fontSize: 22, lineHeight: 46 }]}>
      {ar(BRAND.monogram)}
    </Text>
  );
};

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

/** تذييل موحّد ببيانات المصنع من الورقة الرسمية. */
export const TurkiPdfFooter = ({ fixed = true }: { fixed?: boolean }) => (
  <View style={pdfBrandStyles.footer} fixed={fixed}>
    <View style={pdfBrandStyles.footerWave}>
      <View style={pdfBrandStyles.footerWavePrimary} />
      <View style={pdfBrandStyles.footerWaveAccent} />
    </View>
    <View style={pdfBrandStyles.footerRow}>
      <Text style={pdfBrandStyles.footerBrand}>{ar(BRAND.fullName)}</Text>
      <Text style={pdfBrandStyles.footerContact}>{ar(buildPdfFooterLine())}</Text>
    </View>
  </View>
);

/** ترويسة كاملة بديلة (للوثائق التي لا تستخدم ReportShell الافتراضية). */
export const TurkiPdfHeader = ({
  titleEn,
  subtitleAr,
  refLine,
}: {
  titleEn: string;
  subtitleAr?: string;
  refLine?: string;
}) => (
  <View wrap={false} style={pdfBrandStyles.headerShell}>
    <View style={pdfBrandStyles.titleRight}>
      <Text style={pdfBrandStyles.docKicker}>{ar('وثيقة رسمية')}</Text>
      <Text style={pdfBrandStyles.docTitle}>{ar(titleEn)}</Text>
      {subtitleAr ? <Text style={pdfBrandStyles.docRef}>{ar(subtitleAr)}</Text> : null}
      {refLine ? <Text style={pdfBrandStyles.docRef}>{ar(refLine)}</Text> : null}
    </View>
    <View style={pdfBrandStyles.identityRow}>
      <View style={pdfBrandStyles.identityText}>
        <Text style={pdfBrandStyles.companyFull}>{ar(BRAND.fullName)}</Text>
        <Text style={pdfBrandStyles.tagEn}>{ar(BRAND.tagline)}</Text>
      </View>
      <PdfLogoMark width={120} height={42} />
    </View>
  </View>
);
