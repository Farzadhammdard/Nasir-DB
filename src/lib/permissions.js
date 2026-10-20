// The 17 permissions enumerated in §31, grouped for the Settings UI.
// Pure module: safe to import from both server and client components.
export const PERMISSION_GROUPS = [
  { key: 'dashboard', permissions: ['dashboard.view'] },
  { key: 'bills', permissions: ['bills.view', 'bills.create', 'bills.edit', 'bills.delete'] },
  { key: 'customers', permissions: ['customers.view', 'customers.manage'] },
  { key: 'payments', permissions: ['payments.view', 'payments.create'] },
  { key: 'expenses', permissions: ['expenses.view', 'expenses.manage'] },
  { key: 'reports', permissions: ['reports.view', 'reports.manage'] },
  { key: 'users', permissions: ['users.manage'] },
  { key: 'settings', permissions: ['settings.manage'] },
  { key: 'backup', permissions: ['backup.create', 'backup.restore'] },
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((group) => group.permissions);

export const ALL_GRANTED = '*';

export function hasPermission(granted, key) {
  if (!granted) return false;
  if (granted.includes(ALL_GRANTED)) return true;
  return granted.includes(key);
}

export function hasAnyPermission(granted, keys) {
  return keys.some((key) => hasPermission(granted, key));
}

// Navigation entries from §38, each gated by the permission that protects it.
export const NAVIGATION = [
  { href: '/dashboard', icon: 'LayoutDashboard', permission: 'dashboard.view' },
  { href: '/bills', icon: 'FileText', permission: 'bills.view' },
  { href: '/customers', icon: 'Users', permission: 'customers.view' },
  { href: '/dues', icon: 'HandCoins', permission: 'customers.view' },
  { href: '/payments', icon: 'Banknote', permission: 'payments.view' },
  { href: '/expenses', icon: 'Receipt', permission: 'expenses.view' },
  { href: '/reports', icon: 'BarChart3', permission: 'reports.view' },
  { href: '/notifications', icon: 'Bell', permission: null },
  { href: '/settings', icon: 'Settings', permission: 'settings.manage' },
];
