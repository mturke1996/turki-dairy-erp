/**
 * مصدر الهوية الموحّد لمصنع التركي للحليب ومشتقاته.
 *
 * كل القيم هنا (الاسم، التواصل، لوحة ألوان الـ PDF) قابلة للتعديل من مكان واحد،
 * وتُستهلك في الواجهة وفي مستندات الـ PDF على حدٍ سواء.
 *
 * بيانات التواصل مأخوذة من الورقة الرسمية للمصنع (Letterhead).
 */

export type Brand = {
  /** اسم قصير (أزرار الواجهة والشريط الجانبي) */
  name: string;
  /** الاسم الكامل الرسمي (ترويسة الوثائق) */
  fullName: string;
  /** اسم لاتيني اختياري */
  nameLatin: string;
  /** الوصف التعريفي تحت الاسم */
  tagline: string;
  /** حرف الشعار في المربع الدائري */
  monogram: string;
  /** رمز العملة */
  currency: string;
  /** المنطقة */
  region: string;
  /** بيانات التواصل المطبوعة على الـ PDF */
  contact: {
    phone: string;
    phone2: string;
    email: string;
    website: string;
    address: string;
  };
  socials: {
    facebook: string;
  };
  /** مسار الشعار من /public */
  logoSrc: string;
  /** مسار الورقة الرسمية من /public */
  letterheadSrc: string;
  /** لوحة ألوان الطباعة — يشاركها قالب react-pdf */
  pdfPalette: {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    accent: string;
    accentLight: string;
    logoGreen: string;
    logoGreenSoft: string;
    sun: string;
    sunSoft: string;
    text: string;
    muted: string;
    border: string;
    rowAlt: string;
    headerBg: string;
    mutedBg: string;
    white: string;
    paleGold: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
  };
};

export const BRAND: Brand = {
  name: 'مصنع التركي',
  fullName: 'مصنع التركي للحليب ومشتقاته',
  nameLatin: 'Al-Turki Dairy',
  tagline: 'لصناعة الألبان ومنتجاتها — تجميع وتخزين وتوزيع الحليب',
  monogram: 'ت',
  currency: 'LYD',
  region: 'تاجوراء · طرابلس · ليبيا',
  logoSrc: '/turki-logo.png',
  letterheadSrc: '/turki-letterhead.png',
  contact: {
    phone: '021 - 714 7839',
    phone2: '',
    email: 'alsanya.tr@gmail.com',
    website: '',
    address: 'تاجوراء — بالقرب من طريق وادي الربيع',
  },
  socials: {
    facebook: '',
  },
  pdfPalette: {
    /** حبر فحمي — متوافق مع ثيم Fluxen */
    primary: '#171717',
    primaryDark: '#0a0a0a',
    primaryLight: '#2e2e2e',
    /** مرجاني — لمسة التركيز */
    accent: '#e63946',
    accentLight: '#fef0f0',
    logoGreen: '#e63946',
    logoGreenSoft: '#fef5f5',
    sun: '#c9a227',
    sunSoft: '#fdf8ec',
    text: '#15171a',
    muted: '#6e7470',
    border: '#eceae3',
    rowAlt: '#f5f4ef',
    headerBg: '#171717',
    mutedBg: '#f2f0e9',
    white: '#ffffff',
    paleGold: '#fbfbf9',
    success: '#2f7d32',
    warning: '#b45309',
    danger: '#b3261e',
    info: '#171717',
  },
};

/** سطر تواصل موحّد لتذييل تقارير الـ PDF. */
export function buildPdfFooterLine(brand: Brand = BRAND): string {
  return [brand.contact.address, brand.contact.phone, brand.contact.email]
    .filter(Boolean)
    .join('  ·  ');
}
