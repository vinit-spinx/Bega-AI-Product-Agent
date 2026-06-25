'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isAuthenticated } from '@/services/admin/authService';

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (pathname === '/admin/login') {
      setReady(true);
      return;
    }
    if (!isAuthenticated()) {
      router.replace('/admin/login');
    } else {
      setReady(true);
    }
  }, [pathname, router]);

  if (!ready) {
    return <div className="h-full bg-bega-bg-1" />;
  }

  return <>{children}</>;
}
