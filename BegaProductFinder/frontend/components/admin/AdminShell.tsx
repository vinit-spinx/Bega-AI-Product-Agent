'use client';

import { usePathname } from 'next/navigation';
import AdminSidebar from './AdminSidebar';
import AdminAuthGuard from './AdminAuthGuard';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  return (
    <AdminAuthGuard>
      {isLoginPage ? (
        <div className="h-full bg-[#F7F5F2]">{children}</div>
      ) : (
        <div className="flex h-full bg-[#F7F5F2] overflow-hidden">
          <AdminSidebar />
          <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
        </div>
      )}
    </AdminAuthGuard>
  );
}
