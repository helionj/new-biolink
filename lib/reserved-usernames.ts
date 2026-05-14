export const RESERVED_USERNAMES = [
  'admin',
  'api',
  'dashboard',
  'login',
  'signup',
  'reset-password',
  'auth',
  'www',
  'public',
  'app',
  'help',
  'about',
  'terms',
  'privacy',
  'support',
  'settings',
  'account',
] as const;

export type ReservedUsername = (typeof RESERVED_USERNAMES)[number];

export function isReservedUsername(value: string): boolean {
  const lower = value.toLowerCase();
  return (RESERVED_USERNAMES as readonly string[]).includes(lower);
}
