'use client';

import { usePathname } from 'next/navigation';
import Footer from '@/components/Footer';

const HIDDEN_FOOTER_PATHS = new Set(['/login', '/register']);

export default function AppFooter() {
  const pathname = usePathname();

  if (HIDDEN_FOOTER_PATHS.has(pathname)) {
    return null;
  }

  return <Footer />;
}
