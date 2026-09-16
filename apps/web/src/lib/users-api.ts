import { authClient } from './auth-client';

export type Role = 'USER' | 'ADMIN';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  banned: boolean;
  banReason: string | null;
  createdAt: string | Date;
}

// Doit rester identique a la valeur posee par apps/api/src/auth/auth.ts (databaseHooks).
const PENDING_APPROVAL_REASON = 'pending-signup-approval';

export function isPending(user: AdminUser): boolean {
  return user.banned && user.banReason === PENDING_APPROVAL_REASON;
}

function unwrap<T>({ data, error }: { data: T | null; error: { message?: string } | null }): T {
  if (error) {
    throw new Error(error.message ?? 'Une erreur est survenue');
  }
  return data as T;
}

export async function listUsers(): Promise<AdminUser[]> {
  const result = await authClient.admin.listUsers({ query: { limit: 200 } });
  const { users } = unwrap(result);
  return users as unknown as AdminUser[];
}

export async function createUser(input: { name: string; email: string; password: string; role: Role }): Promise<AdminUser> {
  // Le client Better Auth type "role" sur les roles par defaut ("admin"/"user") : le serveur est
  // configure avec les roles custom ADMIN/USER (voir apps/api/src/auth/auth.ts), d'ou ce cast.
  const result = await authClient.admin.createUser(input as never);
  const { user } = unwrap(result);
  return user as unknown as AdminUser;
}

export async function updateUser(userId: string, changes: { name?: string; email?: string; role?: Role }): Promise<AdminUser> {
  const result = await authClient.admin.updateUser({ userId, data: changes });
  return unwrap(result) as unknown as AdminUser;
}

export async function resetUserPassword(userId: string, newPassword: string): Promise<void> {
  const result = await authClient.admin.setUserPassword({ userId, newPassword });
  unwrap(result);
}

export async function deleteUser(userId: string): Promise<void> {
  const result = await authClient.admin.removeUser({ userId });
  unwrap(result);
}

export async function approveUser(userId: string): Promise<void> {
  const result = await authClient.admin.unbanUser({ userId });
  unwrap(result);
}
