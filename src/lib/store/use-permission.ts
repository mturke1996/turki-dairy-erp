'use client';

import { useErpStore } from './use-erp-store';
import { can, type Permission } from '@/lib/domain/constants';
import type { Role } from '@/lib/domain/types';

export function useRole(): Role {
  return useErpStore((s) => s.auth?.role ?? 'viewer');
}

export function usePermission(permission: Permission): boolean {
  const role = useRole();
  return can(role, permission);
}

/** «المشاهد» للعرض فقط — كل الأدوار الأخرى يمكنها الإضافة والتعديل والحذف. */
export function useCanEdit(): boolean {
  return useRole() !== 'viewer';
}
