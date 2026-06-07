'use client';

import { createClient } from '@/lib/client';
import { useErpStore } from '@/lib/store/use-erp-store';
import type { Role } from '@/lib/domain/types';
import { isAuthRequired } from './config';

interface ProfileRow {
  id: string;
  email: string | null;
  name: string | null;
  role: Role;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const sb = createClient();
  const { data, error } = await sb.from('profiles').select('id,email,name,role').eq('id', userId).maybeSingle();
  if (error) {
    // RLS recursion أو جدول غير مهيأ — نكمل ببيانات Auth بدل إيقاف التطبيق
    console.warn('[auth] profile fetch failed:', error.message);
    return null;
  }
  return data as ProfileRow | null;
}

function applyProfile(profile: ProfileRow, fallbackEmail: string) {
  useErpStore.getState().login({
    name: profile.name ?? fallbackEmail.split('@')[0],
    email: profile.email ?? fallbackEmail,
    role: profile.role,
  });
}

/** يزامن جلسة Supabase الحالية مع متجر التطبيق. */
export async function bootstrapAuthSession(): Promise<boolean> {
  if (!isAuthRequired()) return false;

  const sb = createClient();
  const { data: sessionData, error: sessionError } = await sb.auth.getSession();
  if (sessionError) throw new AuthError(sessionError.message);

  const session = sessionData.session;
  if (!session?.user) {
    useErpStore.getState().logout();
    return false;
  }

  const profile = await fetchProfile(session.user.id);
  if (profile) {
    applyProfile(profile, session.user.email ?? '');
    return true;
  }

  // ملف جديد — استخدم بيانات Auth حتى يُنشأ الـ trigger
  useErpStore.getState().login({
    name: (session.user.user_metadata?.name as string) ?? session.user.email?.split('@')[0] ?? 'مستخدم',
    email: session.user.email ?? '',
    role: 'admin',
  });
  return true;
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const sb = createClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new AuthError(error.message === 'Invalid login credentials' ? 'البريد أو كلمة المرور غير صحيحة.' : error.message);

  const user = data.user;
  if (!user) throw new AuthError('تعذّر إنشاء الجلسة.');

  const profile = await fetchProfile(user.id);
  if (profile) {
    applyProfile(profile, user.email ?? email);
    return;
  }

  useErpStore.getState().login({
    name: email.split('@')[0],
    email,
    role: 'admin',
  });
}

export async function signOut(): Promise<void> {
  if (isAuthRequired()) {
    const sb = createClient();
    await sb.auth.signOut();
  }
  useErpStore.getState().logout();
}
