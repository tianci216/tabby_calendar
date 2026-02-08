'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useT } from '@/lib/useLocale';
import { LocaleToggle } from './LocaleToggle';
import { useState } from 'react';

interface NavbarProps {
  user: {
    id: number;
    displayName: string;
    role: string;
  };
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const navLinks = [
    { href: '/calendar', label: t('calendar') },
    { href: '/classes', label: t('classes') },
    ...(user.role === 'owner' ? [
      { href: '/admin/users', label: t('users') },
      { href: '/admin/audit', label: t('auditLog') },
    ] : []),
  ];

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo + nav links */}
          <div className="flex items-center gap-6">
            <Link href="/calendar" className="font-bold text-lg text-blue-600">
              {t('appName')}
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    pathname.startsWith(link.href)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <LocaleToggle />
            <span className="text-sm text-gray-600 hidden sm:inline">{user.displayName}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              {t('logout')}
            </button>
            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-1 text-gray-500"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="md:hidden pb-3 border-t border-gray-100">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2 text-sm font-medium rounded ${
                  pathname.startsWith(link.href)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
