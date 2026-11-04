import type { ReactNode } from 'react';
import { SidebarLayout } from '@/components/layout/sidebar-layout';

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarLayout area="shop" role="shop_owner">
      {children}
    </SidebarLayout>
  );
}
