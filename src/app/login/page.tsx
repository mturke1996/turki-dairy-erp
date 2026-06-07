'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Droplets, ShieldCheck, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BrandLogo } from '@/components/layout/brand-logo';
import { useErpStore } from '@/lib/store/use-erp-store';
import { ROLE_LABELS } from '@/lib/domain/constants';
import { BRAND } from '@/lib/brand';
import type { Role } from '@/lib/domain/types';

const HIGHLIGHTS = [
  { icon: Droplets, title: 'تجميع وتوزيع', text: 'من الفلاح إلى المصنع بمسار موثّق' },
  { icon: TrendingUp, title: 'محاسبة لحظية', text: 'قيد مزدوج وأرباح فورية لكل فترة' },
  { icon: ShieldCheck, title: 'تقارير رسمية', text: 'مستندات PDF بترويسة المصنع' },
];

export default function LoginPage() {
  const router = useRouter();
  const login = useErpStore((s) => s.login);
  const [name, setName] = useState('مدير النظام');
  const [email, setEmail] = useState('admin@alturki.ly');
  const [role, setRole] = useState<Role>('admin');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    login({ name: name.trim() || 'مستخدم', email: email.trim() || 'user@alturki.ly', role });
    router.push('/dashboard');
  }

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      {/* لوحة الهوية */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy-800 p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(700px 300px at 90% -10%, rgba(243,189,31,0.25), transparent 60%), radial-gradient(700px 300px at -10% 110%, rgba(78,157,58,0.3), transparent 60%)',
          }}
        />
        <div className="relative z-10 inline-flex w-fit items-center rounded-2xl bg-white px-5 py-4 shadow-lift">
          <BrandLogo variant="full" className="w-52" />
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-3xl font-bold leading-snug">
            منظومة إدارة موارد <br /> لتجميع الحليب وتوزيعه
          </h2>
          <div className="space-y-4">
            {HIGHLIGHTS.map((h) => (
              <div key={h.title} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <h.icon className="h-5 w-5 text-sun-300" />
                </span>
                <div>
                  <p className="font-semibold">{h.title}</p>
                  <p className="text-[13px] text-white/70">{h.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-[12px] text-white/60">
          <p>{BRAND.contact.address}</p>
          <p className="mt-1 tabular-nums" dir="ltr">
            {BRAND.contact.phone} · {BRAND.contact.email}
          </p>
        </div>
      </div>

      {/* نموذج الدخول */}
      <div className="flex items-center justify-center bg-background paper px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <BrandLogo variant="lockup" className="mx-auto h-16 w-56 rounded-lg" />
          </div>

          <div className="mb-6 space-y-1.5 text-center lg:text-right">
            <h1 className="text-2xl font-bold tracking-tight">تسجيل الدخول</h1>
            <p className="text-[13.5px] text-muted-foreground">
              مرحباً بعودتك إلى منظومة {BRAND.name}.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">الاسم</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                dir="ltr"
                className="text-left"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input id="password" type="password" dir="ltr" defaultValue="••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label>الصلاحية (للتجربة)</Label>
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

            <Button type="submit" size="lg" className="w-full gap-2">
              دخول المنظومة
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-[11.5px] text-muted-foreground">
            نسخة تجريبية — البيانات محفوظة محلياً في متصفحك.
          </p>
        </div>
      </div>
    </div>
  );
}
