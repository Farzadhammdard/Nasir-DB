'use client';

import { usePathname } from 'next/navigation';
import Workspace from '@/components/Workspace';

const sections = new Set([
  'dashboard', 'bills', 'customers', 'dues', 'expenses', 'reports', 'notifications', 'settings',
]);

export default function PersistentWorkspace({ children }) {
  const pathname = usePathname();
  const section = pathname.split('/').filter(Boolean)[0];

  if (sections.has(section) && pathname === `/${section}`) {
    return <Workspace section={section} />;
  }

  return children;
}
