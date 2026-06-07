'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, BarChart3, Droplets, FileText, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandLogo } from '@/components/layout/brand-logo';
import { BRAND } from '@/lib/brand';
import { AuthError, signInWithPassword } from '@/lib/supabase/auth';
import { initCloudSync, useSyncStore } from '@/lib/supabase/sync';

const FEATURES = [
  { icon: Droplets, title: 'تجميع وتوزيع', desc: 'مسار موثّق من الفلاح إلى العميل' },
  { icon: BarChart3, title: 'محاسبة مزدوجة', desc: 'قيود تلقائية وميزان مراجعة لحظي' },
  { icon: FileText, title: 'تقارير رسمية', desc: 'مستندات PDF بهوية المصنع' },
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return toast.error('أدخل البريد الإلكتروني.');
    if (password.length < 6) return toast.error('كلمة المرور قصيرة (6 أحرف على الأقل).');

    setBusy(true);
    try {
      await signInWithPassword(email.trim(), password);
      await initCloudSync();
      const syncStatus = useSyncStore.getState().status;
      if (syncStatus === 'offline' || syncStatus === 'error') {
        const err = useSyncStore.getState().lastError;
        toast.warning('تم الدخول — تعذّر تحميل البيانات', { description: err ?? undefined });
      } else {
        toast.success('تم تسجيل الدخول وتحميل البيانات');
      }
      router.push(searchParams.get('next') ?? '/dashboard');
    } catch (err) {
      toast.error(err instanceof AuthError ? err.message : 'تعذّر تسجيل الدخول');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[#171717] p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(560px 280px at 100% 0%, rgba(230,57,70,0.22), transparent 65%), radial-gradient(480px 240px at 0% 100%, rgba(201,162,39,0.14), transparent 60%)',
          }}
        />
        <div className="relative z-10">
          <div className="inline-flex rounded-2xl bg-white px-6 py-5 shadow-lift">
            <BrandLogo variant="hero" className="w-64" priority />
          </div>
        </div>
        <div className="relative z-10 max-w-md space-y-8">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">نظام إدارة موارد</p>
            <h2 className="font-serif text-[2rem] font-normal leading-[1.35] text-white">منظومة متكاملة لتجميع الحليب وتوزيعه</h2>
            <p className="text-[14px] leading-relaxed text-white/65">{BRAND.tagline}</p>
          </div>
          <ul className="space-y-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <f.icon className="h-[18px] w-[18px] text-meadow-400" />
                </span>
                <div>
                  <p className="text-[14px] font-semibold">{f.title}</p>
                  <p className="text-[12.5px] text-white/55">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative z-10 space-y-1 text-[12px] text-white/50">
          <p>{BRAND.contact.address}</p>
          <p className="tabular-nums" dir="ltr">
            {BRAND.contact.phone}
            {BRAND.contact.email ? ` · ${BRAND.contact.email}` : ''}
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center bg-background px-5 py-10 sm:px-8">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex flex-col items-center gap-4 lg:items-start">
            <div className="lg:hidden">
              <BrandLogo variant="hero" className="h-20 w-56" priority />
            </div>
            <div className="space-y-1.5 text-center lg:text-right">
              <h1 className="text-[1.65rem] font-bold tracking-tight text-foreground">تسجيل الدخول</h1>
              <p className="text-[13.5px] text-muted-foreground">
                ادخل إلى <span className="font-medium text-foreground">{BRAND.fullName}</span>
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" dir="ltr" className="pr-10 text-left" placeholder="name@alturki.ly" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">كلمة المرور</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" dir="ltr" className="pr-10 text-left" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required minLength={6} />
              </div>
            </div>

            <Button type="submit" size="lg" variant="meadow" className="mt-2 w-full gap-2" disabled={busy}>
              {busy ? 'جارٍ الدخول…' : 'دخول المنظومة'}
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-8 text-center text-[11.5px] leading-relaxed text-muted-foreground">
            المصادقة عبر Supabase. جميع البيانات محفوظة في PostgreSQL — لا تخزين محلي.
          </p>
        </div>
      </section>
    </div>
  );
}
