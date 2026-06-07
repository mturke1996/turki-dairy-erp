'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, Droplets, FileText, Lock, Mail, User } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BrandLogo } from '@/components/layout/brand-logo';
import { useErpStore } from '@/lib/store/use-erp-store';
import { ROLE_LABELS } from '@/lib/domain/constants';
import { BRAND } from '@/lib/brand';
import type { Role } from '@/lib/domain/types';

const FEATURES = [
  { icon: Droplets, title: 'تجميع وتوزيع', desc: 'مسار موثّق من الفلاح إلى العميل' },
  { icon: BarChart3, title: 'محاسبة مزدوجة', desc: 'قيود تلقائية وميزان مراجعة لحظي' },
  { icon: FileText, title: 'تقارير رسمية', desc: 'مستندات PDF بهوية المصنع' },
];

export default function LoginPage() {
  const router = useRouter();
  const login = useErpStore((s) => s.login);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('admin');
  const [busy, setBusy] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error('أدخل اسم المستخدم.');
    if (!email.trim()) return toast.error('أدخل البريد الإلكتروني.');
    if (password.length < 4) return toast.error('كلمة المرور قصيرة جداً (4 أحرف على الأقل).');

    setBusy(true);
    login({
      name: name.trim(),
      email: email.trim(),
      role,
    });
    toast.success(`مرحباً ${name.trim()}`);
    router.push('/dashboard');
    setBusy(false);
  }

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[1.05fr_1fr]">
      {/* اللوحة التعريفية */}
      <section
        className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex"
        style={{ backgroundColor: BRAND.colors.navy }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(520px 260px at 100% 0%, ${BRAND.colors.green}33, transparent 65%), radial-gradient(480px 240px at 0% 100%, ${BRAND.colors.sun}22, transparent 60%)`,
          }}
        />
        <div className="relative z-10">
          <div className="inline-flex rounded-2xl bg-white px-6 py-5 shadow-lift">
            <BrandLogo variant="hero" className="w-64" priority />
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-8">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">
              نظام إدارة موارد
            </p>
            <h2 className="font-serif text-[2rem] font-normal leading-[1.35] text-white">
              منظومة متكاملة لتجميع الحليب وتوزيعه
            </h2>
            <p className="text-[14px] leading-relaxed text-white/65">{BRAND.tagline}</p>
          </div>

          <ul className="space-y-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <f.icon className="h-[18px] w-[18px]" style={{ color: BRAND.colors.sun }} />
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

      {/* نموذج الدخول */}
      <section className="flex items-center justify-center bg-background px-5 py-10 sm:px-8">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex flex-col items-center gap-4 lg:items-start">
            <div className="w-full max-w-[280px] rounded-2xl bg-white px-4 py-3 shadow-whisper ring-1 ring-border/50 lg:hidden">
              <BrandLogo variant="hero" priority />
            </div>
            <div className="space-y-1.5 text-center lg:text-right">
              <h1 className="text-[1.65rem] font-bold tracking-tight text-foreground">تسجيل الدخول</h1>
              <p className="text-[13.5px] text-muted-foreground">
                ادخل إلى منظومة <span className="font-medium text-foreground">{BRAND.fullName}</span>
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">الاسم الكامل</Label>
              <div className="relative">
                <User className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="name"
                  className="pr-10"
                  placeholder="مثال: أحمد التركي"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  className="pr-10 text-left"
                  placeholder="name@alturki.ly"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">كلمة المرور</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  dir="ltr"
                  className="pr-10 text-left"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>الصلاحية</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" size="lg" variant="meadow" className="mt-2 w-full gap-2" disabled={busy}>
              دخول المنظومة
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-8 text-center text-[11.5px] leading-relaxed text-muted-foreground">
            البيانات التشغيلية محفوظة محلياً ومزامنة اختيارياً مع Supabase.
            <br />
            ابدأ بإضافة الفلاحين والعملاء والخزائن من لوحة التحكم.
          </p>
        </div>
      </section>
    </div>
  );
}
