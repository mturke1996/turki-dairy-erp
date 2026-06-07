# turki-dairy-erp

نظام ERP لمصنع التركي للحليب ومشتقاته — تجميع الحليب، التخزين، التوزيع بالجملة، المحاسبة المزدوجة، الخزن والبنوك، المصاريف، الموارد البشرية، والدورات نصف الشهرية.

## التقنيات

- Next.js 14 · React · TailwindCSS · Zustand
- Supabase Auth + PostgreSQL للمزامنة السحابية
- `@react-pdf/renderer` لتقارير PDF عربية
- PWA مع Service Worker وشريط تنقّل سفلي للجوال
- Vitest للاختبارات · ESLint · GitHub Actions CI

## التشغيل محلياً

```bash
npm install
cp .env.example .env.local
npm run dev                    # http://localhost:3100
```

**الوضع المحلي** (`NEXT_PUBLIC_DATA_SOURCE=local`): بيانات في localStorage، دخول بدون Supabase Auth.

**وضع الإنتاج** (`NEXT_PUBLIC_DATA_SOURCE=supabase`): مصادقة Supabase + RLS + مزامنة سحابية.

## قاعدة البيانات (Supabase)

1. افتح [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor
2. نفّذ migrations بالترتيب:
   - `0001_init_erp_schema.sql`
   - `0002_payment_treasury_link.sql` (قواعد قديمة فقط)
   - `0003_farmers_iban.sql` (قواعد قديمة فقط)
   - `0004_secure_rls_and_sync.sql` (**مطلوب** — RLS + sync_version + profiles)
3. أنشئ مستخدم admin في Authentication → Users
4. حدّث دوره: `update profiles set role = 'admin' where email = '...';`
5. في التطبيق: **الإعدادات → المزامنة السحابية**

## متغيرات البيئة

| المتغير | الوصف |
|---------|--------|
| `NEXT_PUBLIC_DATA_SOURCE` | `local` أو `supabase` |
| `NEXT_PUBLIC_SUPABASE_URL` | رابط المشروع |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | المفتاح المنشور |
| `SUPABASE_SERVICE_ROLE_KEY` | إدارة المستخدمين (خادم فقط) |

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
3. `NEXT_PUBLIC_DATA_SOURCE=supabase`
4. Deploy

## البنية

| المسار | الوصف |
|--------|--------|
| `src/lib/store/` | حالة التطبيق (محلي + مزامنة) |
| `src/lib/supabase/` | Auth، مزامنة، mappers |
| `middleware.ts` | حماية المسارات + تجديد الجلسة |
| `src/features/pdf/` | مولّدات PDF |
| `supabase/migrations/` | مخطط قاعدة البيانات |

## الترخيص

خاص — مصنع التركي للحليب ومشتقاته
