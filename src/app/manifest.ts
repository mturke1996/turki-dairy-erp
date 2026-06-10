import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/brand';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.fullName,
    short_name: BRAND.name,
    description: 'نظام ERP متكامل لتجميع وتخزين وتوزيع الحليب — خزن وبنوك، مصاريف، رواتب، ودورة نصف شهرية.',
    start_url: '/dashboard',
    scope: '/',
    id: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait-primary',
    background_color: BRAND.colors.white,
    theme_color: BRAND.colors.navy,
    dir: 'rtl',
    lang: 'ar',
    categories: ['business', 'productivity', 'finance'],
    icons: [
      {
        src: BRAND.icons.pwa192,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: BRAND.icons.pwa512,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: BRAND.icons.maskable,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: BRAND.icons.apple,
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'تسجيل استلام',
        short_name: 'استلام',
        url: '/supply',
        icons: [{ src: BRAND.icons.pwa192, sizes: '192x192' }],
      },
      {
        name: 'تسجيل بيع',
        short_name: 'بيع',
        url: '/sales',
        icons: [{ src: BRAND.icons.pwa192, sizes: '192x192' }],
      },
      {
        name: 'الخزن والبنوك',
        short_name: 'الخزن',
        url: '/treasury',
        icons: [{ src: BRAND.icons.pwa192, sizes: '192x192' }],
      },
      {
        name: 'العملاء',
        short_name: 'عملاء',
        url: '/customers',
        icons: [{ src: BRAND.icons.pwa192, sizes: '192x192' }],
      },
      {
        name: 'التقارير المالية',
        short_name: 'تقارير',
        url: '/reports',
        icons: [{ src: BRAND.icons.pwa192, sizes: '192x192' }],
      },
    ],
  };
}
