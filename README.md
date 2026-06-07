# turki-dairy-erp

نظام ERP لمصنع التركي للحليب ومشتقاته — تجميع الحليب، التخزين، التوزيع بالجملة، المحاسبة المزدوجة، الخزن والبنوك، المصاريف، الموارد البشرية، والدورات نصف الشهرية.

## التقنيات

- Next.js 14 · React · TailwindCSS · Zustand (ذاكرة مؤقتة)
- **Supabase Auth + PostgreSQL** — مصدر البيانات الوحيد
- `@react-pdf/renderer` لتقارير PDF عربية
- PWA مع Service Worker وشريط تنقّل سفلي للجوال
- Vitest للاختبارات · ESLint · GitHub Actions CI

## التشغيل محلياً

```bash
npm install
cp .env.example .env.local
# املأ NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run dev                    # http://localhost:3100
```

**لا يوجد وضع محلي** — التطبيق يتطلب Supabase مهيّأ. بدون متغيرات البيئة تظهر شاشة إعداد قاعدة البيانات.

## قاعدة البيانات (Supabase)

1. افتح [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor
2. نفّذ migrations بالترتيب من `supabase/migrations/` (0001 → آخر ملف)
3. أنشئ مستخدم admin في Authentication → Users
4. حدّث دوره: `update profiles set role = 'admin' where email = '...';`
5. سجّل الدخول — البيانات تُحمَّل تلقائياً من PostgreSQL

## متغيرات البيئة

| المتغير | الوصف |
|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | رابط المشروع (**مطلوب**) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | المفتاح المنشور (**مطلوب**) |
| `SUPABASE_SERVICE_ROLE_KEY` | إدارة المستخدمين (خادم فقط) |
| `NEXT_PUBLIC_APP_URL` | عنوان التطبيق (للـ OAuth callback) |

## الاختبارات والجودة

```bash
npm run typecheck
npm run test
npm run lint
npm run build
```

## النشر على Vercel

1. اربط المستودع بـ Vercel
2. أضف متغيرات البيئة (انظر أعلاه)
3. Deploy

## البنية

| المسار | الوصف |
|--------|--------|
| `src/lib/store/` | حالة التطبيق في الذاكرة + مزامنة مع PostgreSQL |
| `src/lib/supabase/` | Auth، مزامنة، mappers |
| `middleware.ts` | حماية المسارات + تجديد الجلسة |
| `src/features/pdf/` | مولّدات PDF |
| `supabase/migrations/` | مخطط قاعدة البيانات |

## الترخيص

خاص — مصنع التركي للحليب ومشتقاته
