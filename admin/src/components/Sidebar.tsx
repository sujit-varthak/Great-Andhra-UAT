'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Role } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  roles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/articles', label: 'Articles' },
  { href: '/categories', label: 'Categories' },
  { href: '/tags', label: 'Tags' },
  { href: '/flash-news', label: 'Flash News' },
  { href: '/trending', label: 'Trending' },
  { href: '/dont-miss', label: "Don't Miss" },
  { href: '/epaper', label: 'E-Paper' },
  { href: '/users', label: 'Users & Roles', roles: ['ADMIN'] },
  { href: '/audit-log', label: 'Audit Log', roles: ['ADMIN'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside className="sidebar">
      <div className="brand">GreatAndhra CMS</div>
      <nav>
        {NAV_ITEMS.filter((item) => !item.roles || (user && item.roles.includes(user.role))).map(
          (item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? 'active' : ''}
            >
              {item.label}
            </Link>
          ),
        )}
      </nav>
      {user && (
        <div className="user-box">
          <div>{user.name}</div>
          <div>{user.role}</div>
        </div>
      )}
    </aside>
  );
}
