import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/brand';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.fullName,
    short_name: BRAND.name,
    description: 'نظام ERP متكامل لتجميع وتخزين وتوزيع الحليب — خزن وبنوك، مصاريف، رواتب، ودورة نصف شهرية.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#fbf8f1',
    theme_color: '#171717',
    dir: 'rtl',
    lang: 'ar',
    categories: ['business', 'productivity', 'finance'],
    icons: [
      { src: '/turki-logo.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/turki-logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/turki-logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'تسجيل توريد', short_name: 'توريد', url: '/supply' },
      { name: 'تسجيل بيع', short_name: 'بيع', url: '/sales' },
      { name: 'الخزن والبنوك', short_name: 'الخزن', url: '/treasury' },
    ],
  };
}
