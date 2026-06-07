'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, UserPlus, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ROLE_LABELS } from '@/lib/domain/constants';
import { isAuthRequired } from '@/lib/supabase/config';
import type { Role } from '@/lib/domain/types';

interface UserRow {
  id: string;
  email: string | null;
  name: string | null;
  role: Role;
  created_at: string;
}

const EMPTY = { name: '', email: '', password: '' };

export function UsersPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = (await res.json()) as { users?: UserRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'فشل التحميل');
      setUsers(data.users ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'تعذّر تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthRequired()) void load();
  }, [load]);

  if (!isAuthRequired()) return null;

  async function createUser() {
    if (!form.name.trim()) return toast.error('أدخل الاسم.');
    if (!form.email.trim()) return toast.error('أدخل البريد الإلكتروني.');
    if (form.password.length < 6) return toast.error('كلمة المرور 6 أحرف على الأقل.');

    setBusy(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role: 'admin' }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'فشل الإنشاء');
      toast.success('تم إنشاء الحساب');
      setForm(EMPTY);
      setAddOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'تعذّر إنشاء المستخدم');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4.5 w-4.5 text-muted-foreground" />
            المستخدمون
            {!loading ? (
              <Badge variant="neutral" className="font-normal">
                {users.length}
              </Badge>
            ) : null}
          </CardTitle>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" />
            مستخدم جديد
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>البريد</TableHead>
                  <TableHead className="text-center">الدور</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name ?? '—'}</TableCell>
                    <TableCell dir="ltr" className="font-mono text-[12px]">
                      {u.email ?? '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="success">{ROLE_LABELS[u.role]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-10 text-center">
              <p className="text-[13px] text-muted-foreground">لا مستخدمين بعد</p>
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <UserPlus className="h-4 w-4" />
                إضافة أول مستخدم
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>مستخدم جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="user-name">الاسم</Label>
              <Input
                id="user-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="أحمد التركي"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-email">البريد الإلكتروني</Label>
              <Input
                id="user-email"
                dir="ltr"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="name@alturki.ly"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-password">كلمة المرور</Label>
              <Input
                id="user-password"
                dir="ltr"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="6 أحرف على الأقل"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void createUser()} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              إنشاء الحساب
            </Button>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
