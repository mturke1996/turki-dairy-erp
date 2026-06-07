# turki-dairy-erp

نظام ERP لمصنع التركي للحليب ومشتقاته — تجميع الحليب، التخزين، التوزيع بالجملة، المحاسبة المزدوجة، الخزن والبنوك، المصاريف، الموارد البشرية، والدورات نصف الشهرية.

## التقنيات

- Next.js 14 · React · TailwindCSS · Zustand
- Supabase (PostgreSQL) للمزامنة السحابية
- `@react-pdf/renderer` لتقارير PDF عربية
- PWA مع Service Worker وشريط تنقّل سفلي للجوال

## التشغيل محلياً

```bash
npm install
cp .env.example .env.local   # أضف مفاتيح Supabase
npm run dev                    # http://localhost:3100
```

## قاعدة البيانات (Supabase)

1. افتح [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor
2. الصق محتوى `supabase/migrations/0001_init_erp_schema.sql` ثم Run
3. في التطبيق: **الإعدادات → مصدر البيانات → فعّل المزامنة السحابية**

## النشر على Vercel

1. اربط المستودع بـ Vercel
2. أضف متغيرات البيئة:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Deploy

## البنية

| المسار | الوصف |
|--------|--------|
| `src/lib/store/` | حالة التطبيق (محلي + مزامنة) |
| `src/lib/supabase/` | طبقة المزامنة مع Supabase |
| `src/features/pdf/` | مولّدات PDF |
| `supabase/migrations/` | مخطط قاعدة البيانات |

## الترخيص

خاص — مصنع التركي للحليب ومشتقاته
