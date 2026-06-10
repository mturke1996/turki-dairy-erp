/**
 * مصدر الهوية الموحّد لمصنع التركي للحليب ومشتقاته.
 *
 * كل القيم هنا (الاسم، التواصل، الشعار، الألوان) قابلة للتعديل من مكان واحد،
 * وتُستهلك في الواجهة وPWA ومستندات الـ PDF على حدٍ سواء.
 */

export type Brand = {
  name: string;
  fullName: string;
  nameLatin: string;
  tagline: string;
  taglineShort: string;
  monogram: string;
  currency: string;
  region: string;
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
  /** الشعار الأفقي الكامل — الاسم + الشعار (للسايدبار والـ PDF) */
  logoLockupSrc: string;
  /** الشعار الشفاف — شاشة التحميل والواجهات على خلفية ملونة */
  splashLogoSrc: string;
  /** شعار رأس صفحات PDF — الهوية الأفقية الكاملة */
  pdfLogoLockupSrc: string;
  /** الشعار الرسومي فقط */
  logoMarkSrc: string;
  /** @deprecated استخدم logoLockupSrc */
  logoSrc: string;
  /** أيقونات PWA والمتصفح */
  icons: {
    favicon: string;
    apple: string;
    pwa192: string;
    pwa512: string;
    maskable: string;
  };
  letterheadSrc: string;
  /** ألوان الشعار الرسمية */
  colors: {
    navy: string;
    green: string;
    sun: string;
    white: string;
  };
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
  taglineShort: 'لصناعة الألبان ومنتجاتها',
  monogram: 'ت',
  currency: 'LYD',
  region: 'تاجوراء · طرابلس · ليبيا',
  logoLockupSrc: '/turki-logo-lockup.jpg',
  splashLogoSrc: '/turki-splash-lockup.png',
  pdfLogoLockupSrc: '/turki-pdf-lockup.jpg',
  logoMarkSrc: '/icons/icon-512.png',
  logoSrc: '/icons/icon-512.png',
  icons: {
    favicon: '/icons/favicon-32.png',
    apple: '/icons/apple-touch-icon.png',
    pwa192: '/icons/icon-192.png',
    pwa512: '/icons/icon-512.png',
    maskable: '/icons/icon-maskable-512.png',
  },
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
  colors: {
    navy: '#0d3a7a',
    green: '#3d9e2f',
    sun: '#f5c518',
    white: '#ffffff',
  },
  pdfPalette: {
    primary: '#0d3a7a',
    primaryDark: '#082952',
    primaryLight: '#1a4f96',
    accent: '#3d9e2f',
    accentLight: '#edf7eb',
    logoGreen: '#3d9e2f',
    logoGreenSoft: '#edf7eb',
    sun: '#f5c518',
    sunSoft: '#fef9e6',
    text: '#15171a',
    muted: '#6e7470',
    border: '#dce6f2',
    rowAlt: '#f4f8fc',
    headerBg: '#0d3a7a',
    mutedBg: '#eef3f9',
    white: '#ffffff',
    paleGold: '#fbfbf9',
    success: '#2f7d32',
    warning: '#b45309',
    danger: '#b3261e',
    info: '#0d3a7a',
  },
};

export function buildPdfFooterLine(brand: Brand = BRAND): string {
  return [brand.contact.address, brand.contact.phone, brand.contact.email]
    .filter(Boolean)
    .join('  ·  ');
}
