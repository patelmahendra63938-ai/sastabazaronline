export type UserRole = 'customer' | 'staff' | 'admin' | 'super_admin';

export const ADMIN_ROLES: readonly UserRole[] = [
  'staff',
  'admin',
  'super_admin',
] as const;

export function canAccessAdmin(role: UserRole | null | undefined): boolean {
  return Boolean(role && ADMIN_ROLES.includes(role));
}
