# مصنع التركي ERP — Design System

## الهوية

**الأسلوب:** ورقة تحريرية سويسرية — كانفاس عاجي دافئ، حبر فحمي، لمسة مرجانية واحدة.

| الدور | Token | القيمة |
|-------|-------|--------|
| Canvas | `--background` | `#FBFBFA` |
| Ink | `--foreground` | `#15171A` |
| Primary | `navy-700` | `#171717` |
| Accent | `meadow-500` | `#D94841` |
| Warning | `sun-500` | `#bd9333` |
| Border | `--border` | `#ECEAE3` |

**ملاحظة:** `BRAND.pdfPalette` يبقى كحلي/أخضر للمطبوعات الرسمية. `BRAND.colors` متزامن مع الواجهة.

## Typography

- **عربي:** Cairo — كل الواجهة
- **لاتيني:** Plus Jakarta Sans — fallback
- **عرض:** Instrument Serif — `.metric-hero` للأرقام البطلة وعناوين login
- **أرقام:** `.tabular` / `font-variant-numeric: tabular-nums` دائماً للمبالغ

## المكوّنات

| المكوّن | الاستخدام |
|---------|-----------|
| `StatTile` | صفحات القوائم (فلاحين، عملاء، تقارير) |
| `KpiCard` | لوحة التحكم — `variant="rail"` للجوال |
| `PageHeader` | عنوان كل صفحة + eyebrow + actions |
| `FilterBar` / `FilterChip` | شريط فلاتر موحّد |
| `Money` / `Liters` | كل القيم المالية والكميات |

## Layout

- **Shell:** sidebar يمين (RTL) + topbar + bottom nav (5 تبويبات + «المزيد»)
- **عرض المحتوى:** `max-w-[1400px]`
- **تباعد الصفحات:** `space-y-5 sm:space-y-6`
- **بطاقات:** `rounded-xl border border-border bg-card shadow-whisper` — لا ظل + border معاً

## Motion

- **مسموح:** `transform`, `opacity`, `width` (أشرطة تقدم)
- **ممنوع:** `transition-all`
- **مدة:** 150–300ms، `cubic-bezier(0.16, 1, 0.3, 1)`
- **احترام:** `prefers-reduced-motion`

## الرسوم البيانية

استخدم `CHART` من `src/lib/chart-colors.ts` — لا ألوان hex مبعثرة.

## Do's

- RTL أولاً، `dir="ltr"` للأرقام والمراجع
- لمسة مرجانية واحدة — لا تدرجات بنفسجية
- skeleton للتحميل، ليس spinner عشوائي

## PWA / الجوال

- **Safe area:** `env(safe-area-inset-*)` في topbar، bottom nav، FAB، والمحتوى
- **Bottom nav:** 5 تبويبات — رئيسية، استلام، بيع، فلاحون، المزيد
- **«المزيد»:** `MobileSheet` بشبكة أقسام كاملة
- **FAB:** ورقة سفلية على الجوال (ليست dropdown) — أهداف لمس ≥ 52px
- **المحتوى:** `pb-[calc(8.75rem+safe-area)]` لتفادي تغطية الشريط السفلي
- **التبويبات:** scroll أفقي على الجوال (`no-scrollbar`)
- **Manifest shortcuts:** استلام، بيع، خزينة، عملاء، تقارير

## Don'ts

- لا `border-left` ملون كزخرفة
- لا `blur-3xl` على بطاقات مالية
- لا بطاقات متداخلة (card inside card)
- لا `amber-*` — استخدم `sun-*` للتحذيرات
