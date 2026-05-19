import {
  BarChart3,
  Link as LinkIcon,
  Palette,
  Settings,
  User,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

// Single source of truth consumed by Sidebar and MobileDrawer (AC2).
// Labels are verbatim from AC2; hrefs are the canonical dashboard routes.
export const navItems: NavItem[] = [
  { label: 'Links', href: '/dashboard', icon: LinkIcon },
  { label: 'Profile', href: '/dashboard/profile', icon: User },
  { label: 'Theme', href: '/dashboard/theme', icon: Palette },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Account', href: '/dashboard/account', icon: Settings },
];

// Exact match for the index route so "Links" (/dashboard) is not flagged on
// every sub-route; prefix match for the nested tabs.
export function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}
