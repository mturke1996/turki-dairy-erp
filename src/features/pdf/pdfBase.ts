// @ts-nocheck
/**
 * أنماط PDF الأساسية — مصنع التركي (التقارير والوثائق).
 * الاتجاه: الصفحة rtl للنص؛ صف «ملخص الوثيقة» يستخدم row-reverse + ltr
 * لأن Yoga في react-pdf لا يعكس محور flex مع rtl كالمتصفح.
 */

import { PDF_FONT_FAMILY } from './pdfFonts';
import { BRAND } from '@/lib/brand';

const p = BRAND.pdfPalette;

export const PDF = {
  primary: p.primary,
  primaryDark: p.primaryDark,
  primaryLight: p.primaryLight,
  accent: p.accent,
  accentLight: p.accentLight,
  logoGreen: p.logoGreen,
  logoGreenSoft: p.logoGreenSoft,
  sun: p.sun,
  sunSoft: p.sunSoft,
  text: p.text,
  muted: p.muted,
  mutedBg: p.mutedBg,
  border: p.border,
  white: p.white,
  success: p.success,
  warning: p.warning,
  danger: p.danger,
  info: p.info,
  headerBg: p.headerBg,
  rowAlt: p.rowAlt,
  paleGold: p.paleGold,
};

export const pdfBase = {
  page: {
    direction: 'rtl',
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 9,
    color: PDF.text,
    backgroundColor: PDF.white,
    paddingTop: 118,
    paddingBottom: 54,
    paddingHorizontal: 36,
  },

  pageAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: PDF.primary,
  },

  pageAccentStripe: {
    position: 'absolute',
    top: 5,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: PDF.accent,
  },

  pageAccentSun: {
    position: 'absolute',
    top: 5,
    left: 0,
    width: 64,
    height: 2,
    backgroundColor: PDF.sun,
  },

  /** كتلة الترويسة المثبتة — عنوان + شعار + تواصل */
  headerFixed: {
    position: 'absolute',
    top: 8,
    left: 36,
    right: 36,
  },

  headerContactInline: {
    marginTop: 4,
    marginBottom: 0,
  },

  contentLayer: {
    position: 'relative',
    zIndex: 1,
  },

  header: {
    position: 'relative',
    width: '100%',
    minHeight: 96,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: PDF.primary,
  },

  headerContactWrap: {
    marginBottom: 12,
  },

  titleBoxAtLeft: {
    position: 'absolute',
    left: 0,
    top: 8,
    direction: 'rtl',
    alignItems: 'flex-start',
    maxWidth: '44%',
  },

  brandBoxFixed: {
    position: 'absolute',
    right: 0,
    top: 0,
    direction: 'rtl',
    alignItems: 'flex-end',
    maxWidth: '56%',
  },

  reportType: {
    fontSize: 7.5,
    color: PDF.logoGreen,
    alignSelf: 'flex-start',
    paddingBottom: 3,
    marginBottom: 6,
    letterSpacing: 1.2,
    fontWeight: 'bold',
    textAlign: 'left',
    borderBottomWidth: 1.5,
    borderBottomColor: PDF.logoGreen,
  },

  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PDF.primary,
    textAlign: 'left',
    letterSpacing: 0.2,
    lineHeight: 1.3,
  },

  reportSub: {
    fontSize: 9,
    color: PDF.muted,
    marginTop: 4,
    textAlign: 'left',
    lineHeight: 1.45,
  },

  /** بطاقة ملخص فاخرة */
  luxe: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: PDF.primary,
    backgroundColor: PDF.white,
  },

  luxeRibbon: {
    backgroundColor: PDF.primary,
    paddingVertical: 6,
    paddingHorizontal: 14,
    flexDirection: 'row-reverse',
    direction: 'ltr',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  luxeRibbonText: {
    fontSize: 7.5,
    color: '#ffffff',
    fontWeight: 'bold',
    letterSpacing: 1.4,
    textAlign: 'right',
  },

  luxeRibbonHint: {
    fontSize: 7,
    color: '#ffffff',
    opacity: 0.75,
    fontWeight: 'normal',
    letterSpacing: 0.6,
    textAlign: 'left',
  },

  luxeRow: {
    direction: 'ltr',
    flexDirection: 'row-reverse',
    alignItems: 'stretch',
  },

  luxeDateCell: {
    direction: 'rtl',
    flex: 1.55,
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: PDF.rowAlt,
    justifyContent: 'center',
  },

  luxeCell: {
    direction: 'rtl',
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },

  luxeDivider: {
    width: 1,
    backgroundColor: PDF.border,
  },

  luxeEyebrow: {
    fontSize: 7.5,
    color: PDF.muted,
    fontWeight: 'bold',
    letterSpacing: 1.1,
    marginBottom: 10,
    textAlign: 'right',
  },

  luxeDateBlock: {
    direction: 'rtl',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },

  luxeDay: {
    fontSize: 34,
    fontWeight: 'bold',
    color: PDF.primary,
    lineHeight: 1,
    textAlign: 'right',
  },

  luxeDateTexts: {
    alignItems: 'flex-end',
    paddingBottom: 4,
  },

  luxeMonthYear: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: PDF.text,
    textAlign: 'right',
    lineHeight: 1.25,
  },

  luxeWeekday: {
    fontSize: 8.5,
    color: PDF.logoGreen,
    fontWeight: 'bold',
    marginTop: 3,
    letterSpacing: 0.4,
    textAlign: 'right',
  },

  luxeGregorian: {
    fontSize: 8.5,
    color: PDF.muted,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: PDF.border,
    letterSpacing: 0.8,
    textAlign: 'right',
  },

  luxeValue: {
    fontSize: 17,
    fontWeight: 'bold',
    color: PDF.primary,
    textAlign: 'right',
    letterSpacing: 0.2,
    lineHeight: 1.15,
  },

  luxeMoneyRow: {
    width: '100%',
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    gap: 6,
  },

  luxeMoneyCurrency: {
    fontSize: 12,
    fontWeight: 'bold',
    color: PDF.primary,
    letterSpacing: 0.2,
  },

  tableHead: {
    direction: 'rtl',
    flexDirection: 'row',
    backgroundColor: PDF.headerBg,
    paddingVertical: 8,
    paddingHorizontal: 9,
    marginBottom: 2,
  },

  th: {
    color: PDF.white,
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'right',
  },

  tableRow: {
    direction: 'rtl',
    flexDirection: 'row',
    paddingVertical: 6.5,
    paddingHorizontal: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF.border,
    alignItems: 'center',
  },

  rowEven: {
    backgroundColor: PDF.rowAlt,
  },

  tableFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: PDF.logoGreenSoft,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1.5,
    borderTopColor: PDF.primary,
    marginTop: 2,
  },

  footLabel: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: PDF.logoGreen,
    textAlign: 'right',
  },

  footValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: PDF.text,
    textAlign: 'left',
  },

  td: { fontSize: 9, color: PDF.text, textAlign: 'right' },
  tdMuted: { fontSize: 9, color: PDF.muted, textAlign: 'center', paddingVertical: 12 },
  tdBold: { fontSize: 9, fontWeight: 'bold', color: PDF.text, textAlign: 'right' },
  tdNum: { fontSize: 9, color: PDF.text, textAlign: 'center' },

  pageNumber: {
    position: 'absolute',
    top: 12,
    right: 26,
    width: 130,
    textAlign: 'right',
    fontSize: 7,
    color: PDF.muted,
    fontWeight: 'bold',
    lineHeight: 1.25,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: PDF.primary,
    marginBottom: 8,
    marginTop: 14,
    paddingBottom: 5,
    paddingRight: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: PDF.logoGreen,
    letterSpacing: 0.2,
    textAlign: 'right',
  },

  caption: { fontSize: 8, color: PDF.muted, marginTop: 12, textAlign: 'center' },

  signatureStrip: {
    direction: 'rtl',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: PDF.border,
  },

  signatureCell: {
    width: '42%',
    alignItems: 'flex-end',
  },

  signatureLabel: {
    fontSize: 7.5,
    color: PDF.muted,
    fontWeight: 'bold',
    letterSpacing: 0.8,
    marginBottom: 22,
    textAlign: 'right',
  },

  signatureLine: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: PDF.text,
    marginBottom: 6,
  },

  signatureHint: {
    fontSize: 7,
    color: PDF.muted,
    textAlign: 'right',
  },

  docRef: {
    position: 'absolute',
    top: 14,
    left: 34,
    fontSize: 7,
    color: PDF.muted,
    fontWeight: 'bold',
    letterSpacing: 0.4,
    direction: 'ltr',
    textAlign: 'left',
  },

  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, fontSize: 7.5, fontWeight: 'bold' },
  badgeSuccess: { backgroundColor: '#dcfce7', color: PDF.success },
  badgeWarning: { backgroundColor: '#fef9c3', color: '#854d0e' },
  badgeDanger: { backgroundColor: '#fee2e2', color: PDF.danger },
  badgeInfo: { backgroundColor: '#dbeafe', color: PDF.primary },
};
