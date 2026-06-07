import { Database, AlertTriangle } from 'lucide-react';
import { BrandLogo } from './brand-logo';
import { BRAND } from '@/lib/brand';

/** يظهر عندما لا تكون مفاتيح Supabase مهيّأة — التطبيق يعمل على PostgreSQL فقط. */
export function DatabaseSetupRequired() {
  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center px-6"
      style={{ backgroundColor: BRAND.colors.navy }}
    >
      <div className="w-full max-w-md space-y-6 text-center text-white">
        <div className="mx-auto w-48 rounded-2xl bg-white px-4 py-3">
          <BrandLogo variant="full" priority />
        </div>
        <div className="space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
            <Database className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">ربط قاعدة البيانات مطلوب</h1>
          <p className="text-[13px] leading-relaxed text-white/70">
            {BRAND.fullName} يعمل حصرياً على Supabase (PostgreSQL). لا يوجد تخزين محلي — كل البيانات في السحابة.
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-right text-[12px] leading-relaxed text-white/80">
          <p className="mb-2 flex items-center gap-2 font-semibold text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            أضف في <code className="rounded bg-white/10 px-1 font-mono text-[11px]" dir="ltr">.env.local</code>:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-black/30 p-3 text-left font-mono text-[11px] leading-relaxed" dir="ltr">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key`}
          </pre>
          <p className="mt-3 text-[11px] text-white/55">
            ثم طبّق migrations من <code className="font-mono">supabase/migrations/</code> في SQL Editor.
          </p>
        </div>
      </div>
    </div>
  );
}
