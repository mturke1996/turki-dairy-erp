// @ts-nocheck
/**
 * أنماط PDF الأساسية — مصنع التركي (التقارير والوثائق).
 *
 * فلسفة التصميم: «ورقة رسمية سويسرية» — أبيض نظيف، خط فاصل واحد قوي،
 * مساحات تنفّس واسعة، ولا صناديق متراكبة. الهوية تظهر في خط الترويسة
 * الثلاثي (كحلي/أخضر/شمسي) وفي شريط الملخص أعلى الوثيقة فقط.
 *
 * الاتجاه: الصفحة rtl للنص؛ صفوف الجداول تستخدم direction:ltr +
 * flexDirection:row-reverse لأن Yoga لا يعكس المحور مع rtl — أول عمود في JSX = يمين الورقة.
 */

import { PDF_FONT_FAMILY } from './pdfFonts';
import { BRAND } from '@/lib/brand';

const p = BRAND.pdfPalette;

/** عتبات ترقيم الصفحات — قيم منخفضة لتفادي صفحة ثانية فارغة مع التوقيع */
export const PDF_PAGINATION = {
  tableHead: 28,
  totalBar: 32,
  section: 36,
} as const;

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
    lineHeight: 1.5,
    color: PDF.text,
    backgroundColor: PDF.white,
    // الترويسة المثبتة تنتهي عند ~112pt — نبدأ المحتوى بعدها بهواء كافٍ
    paddingTop: 128,
    // التذييل الجديد منخفض الارتفاع (~46pt من أسفل الورقة)
    paddingBottom: 82,
    paddingHorizontal: 40,
  },

  /* ── خط الهوية أعلى الورقة: كحلي ممتد + مقطع أخضر + مقطع شمسي ── */
  pageAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: PDF.primary,
  },

  pageAccentStripe: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 120,
    height: 4,
    backgroundColor: PDF.accent,
  },

  pageAccentSun: {
    position: 'absolute',
    top: 0,
    right: 120,
    width: 28,
    height: 4,
    backgroundColor: PDF.sun,
  },

  /* ── الترويسة المثبتة ── */
  headerFixed: {
    position: 'absolute',
    top: 26,
    left: 40,
    right: 40,
  },

  header: {
    direction: 'rtl',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
  },

  /* خط فاصل تحت الترويسة — كحلي بكامل العرض */
  headerRule: {
    height: 1.5,
    backgroundColor: PDF.primary,
  },

  headerRuleAccent: {
    height: 1.5,
    width: 96,
    backgroundColor: PDF.accent,
    marginTop: -1.5,
  },

  headerContactInline: {
    marginTop: 7,
  },

  contentLayer: {
    position: 'relative',
    zIndex: 1,
  },

  titleBoxAtLeft: {
    alignItems: 'flex-start',
    maxWidth: '46%',
  },

  brandBoxFixed: {
    alignItems: 'flex-end',
    maxWidth: '54%',
  },

  /* ملاحظة: لا letterSpacing على نصوص عربية — يفصل الحروف المتصلة */
  reportType: {
    fontSize: 7.5,
    color: PDF.logoGreen,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'left',
    lineHeight: 1.3,
  },

  reportTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: PDF.primary,
    textAlign: 'left',
    lineHeight: 1.3,
  },

  reportSub: {
    fontSize: 8.5,
    color: PDF.muted,
    marginTop: 3,
    textAlign: 'left',
    lineHeight: 1.45,
  },

  /* ── شريط ملخص الوثيقة — شريط واحد هادئ بفواصل شعرية ── */
  summaryStrip: {
    direction: 'ltr',
    flexDirection: 'row-reverse',
    alignItems: 'stretch',
    backgroundColor: PDF.paleGold,
    borderTopWidth: 2,
    borderTopColor: PDF.accent,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF.border,
    marginBottom: 14,
  },

  summaryCell: {
    direction: 'rtl',
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },

  summaryCellDate: {
    direction: 'rtl',
    flex: 1.25,
    paddingVertical: 13,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },

  summaryDivider: {
    width: 0.5,
    backgroundColor: PDF.border,
    marginVertical: 10,
  },

  summaryEyebrow: {
    fontSize: 6.8,
    color: PDF.muted,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'right',
    lineHeight: 1.3,
  },

  /* صف تاريخ مركّب: حاوية LTR بترتيب بصري صريح (سنة، شهر، يوم) — حتمي بلا بيدي */
  summaryDateRow: {
    direction: 'ltr',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'baseline',
    gap: 4,
  },

  summaryValue: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: PDF.primary,
    textAlign: 'right',
    lineHeight: 1.35,
  },

  summarySub: {
    fontSize: 7.5,
    color: PDF.muted,
    marginTop: 3,
    textAlign: 'right',
    lineHeight: 1.35,
  },

  /* ── أنماط legacy (يُحتفظ بها للتوافق — لم تعد مستخدمة في الغلاف) ── */
  luxe: { marginBottom: 16 },
  luxeRibbon: { display: 'none' },
  luxeRibbonText: { fontSize: 7.5 },
  luxeRibbonHint: { fontSize: 7 },
  luxeRow: { direction: 'ltr', flexDirection: 'row-reverse' },
  luxeDateCell: { flex: 1.25, padding: 14 },
  luxeCell: { flex: 1, padding: 14 },
  luxeDivider: { width: 0.5, backgroundColor: PDF.border },
  luxeEyebrow: { fontSize: 7, color: PDF.muted },
  luxeDateBlock: { flexDirection: 'row' },
  luxeDay: { fontSize: 20, fontWeight: 'bold', color: PDF.primary },
  luxeDateTexts: { alignItems: 'flex-end' },
  luxeMonthYear: { fontSize: 10, fontWeight: 'bold' },
  luxeWeekday: { fontSize: 8, color: PDF.logoGreen },
  luxeGregorian: { fontSize: 8, color: PDF.muted },
  luxeValue: { fontSize: 12, fontWeight: 'bold', color: PDF.primary },
  luxeMoneyRow: { flexDirection: 'row', direction: 'ltr' },
  luxeMoneyCurrency: { fontSize: 11, fontWeight: 'bold', color: PDF.primary },

  /* ── الجداول العربية: row-reverse → التاريخ يميناً، المبالغ يساراً ── */
  tableHead: {
    direction: 'ltr',
    flexDirection: 'row-reverse',
    backgroundColor: PDF.primary,
    paddingVertical: 9,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: PDF.accent,
  },

  th: {
    color: PDF.white,
    fontSize: 8.5,
    fontWeight: 'bold',
    textAlign: 'right',
    lineHeight: 1.4,
  },

  thNum: {
    color: PDF.white,
    fontSize: 8.5,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 1.4,
  },

  thMoney: {
    color: PDF.white,
    fontSize: 8.5,
    fontWeight: 'bold',
    textAlign: 'left',
    lineHeight: 1.4,
  },

  tableRow: {
    direction: 'ltr',
    flexDirection: 'row-reverse',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF.border,
    alignItems: 'center',
  },

  rowEven: {
    backgroundColor: PDF.rowAlt,
  },

  tableFoot: {
    direction: 'ltr',
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 14,
    backgroundColor: PDF.logoGreenSoft,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderTopWidth: 1.5,
    borderTopColor: PDF.accent,
    marginTop: 2,
  },

  /** شريط إجمالي — التسمية يميناً ثم المبلغ (رقم + د.ل) */
  totalRowBar: {
    direction: 'ltr',
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 14,
    backgroundColor: PDF.logoGreenSoft,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderTopWidth: 1.5,
    borderTopColor: PDF.accent,
  },

  footLabel: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: PDF.logoGreen,
    textAlign: 'right',
    lineHeight: 1.4,
  },

  footValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: PDF.text,
    textAlign: 'left',
    lineHeight: 1.4,
  },

  td: { fontSize: 9, color: PDF.text, textAlign: 'right', lineHeight: 1.45 },
  tdMuted: { fontSize: 9, color: PDF.muted, textAlign: 'center', paddingVertical: 14, lineHeight: 1.45 },
  tdBold: { fontSize: 9, fontWeight: 'bold', color: PDF.text, textAlign: 'right', lineHeight: 1.45 },
  tdNum: { fontSize: 9, color: PDF.text, textAlign: 'center', direction: 'ltr', lineHeight: 1.45 },
  tdRef: { fontSize: 9, color: PDF.text, textAlign: 'center', direction: 'ltr', lineHeight: 1.45 },
  tdDate: { fontSize: 9, color: PDF.text, textAlign: 'center', direction: 'ltr', lineHeight: 1.45 },
  tdMoneyWrap: { justifyContent: 'center', alignItems: 'flex-start' },

  /* رقم الصفحة — منتصف أسفل الورقة، تحت التذييل */
  pageNumber: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 6.5,
    color: PDF.muted,
    lineHeight: 1.3,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: PDF.primary,
    marginBottom: 6,
    marginTop: 10,
    paddingBottom: 5,
    paddingRight: 8,
    borderBottomWidth: 0.75,
    borderBottomColor: PDF.border,
    borderRightWidth: 3,
    borderRightColor: PDF.accent,
    textAlign: 'right',
    lineHeight: 1.35,
  },

  caption: { fontSize: 8, color: PDF.muted, marginTop: 12, textAlign: 'center', lineHeight: 1.4 },

  /* ── شريط التوقيع (مضغوط ليبقى في الصفحة الأولى عند توفر المكان) ── */
  signatureStrip: {
    direction: 'rtl',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: PDF.border,
  },

  signatureCell: {
    width: '40%',
    alignItems: 'flex-end',
  },

  signatureLabel: {
    fontSize: 6.8,
    color: PDF.muted,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'right',
    lineHeight: 1.25,
  },

  signatureLine: {
    width: '100%',
    borderBottomWidth: 0.75,
    borderBottomColor: PDF.text,
    marginBottom: 4,
  },

  signatureHint: {
    fontSize: 6.8,
    color: PDF.muted,
    textAlign: 'right',
    lineHeight: 1.3,
  },

  docRef: {
    position: 'absolute',
    top: 14,
    left: 40,
    fontSize: 7,
    color: PDF.muted,
    fontWeight: 'bold',
    letterSpacing: 0.4,
    direction: 'ltr',
    textAlign: 'left',
    lineHeight: 1.3,
  },

  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, fontSize: 7.5, fontWeight: 'bold' },
  badgeSuccess: { backgroundColor: '#dcfce7', color: PDF.success },
  badgeWarning: { backgroundColor: '#fef9c3', color: '#854d0e' },
  badgeDanger: { backgroundColor: '#fee2e2', color: PDF.danger },
  badgeInfo: { backgroundColor: '#dbeafe', color: PDF.primary },
};
