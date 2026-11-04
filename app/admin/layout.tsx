import type { ReactNode } from 'react';
import { SidebarLayout } from '@/components/layout/sidebar-layout';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarLayout area="admin" role="admin">
      {children}
    </SidebarLayout>
  );
}
