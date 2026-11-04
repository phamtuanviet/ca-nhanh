import { LogOut } from 'lucide-react';
import type { Metadata } from 'next';
import { signOut } from '@/app/(auth)/actions';
import { Logo } from '@/components/brand/logo';
import { Badge } from '@/components/cn/badge';
import { EmptyState } from '@/components/cn/empty-state';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Hoàn tất hồ sơ' };

/** proxy.ts chỉ cho tài khoản đã đăng nhập nhưng chưa onboarding vào trang này */
export default function OnboardingPage() {
  return (
    <div className="flex min-h-dvh flex-col px-4 py-6">
      <Logo />
      <main className="mx-auto flex w-full max-w-md flex-1 items-center">
        <div className="w-full rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            illustration="shop-onboarding"
            title="Hoàn tất hồ sơ để bắt đầu"
            text="Chọn vai trò, nhập ngày sinh và kỹ năng (người làm) hoặc tạo quán (chủ quán). Tài khoản demo đã có hồ sơ sẵn."
          >
            <Badge tone="info" icon="clock">
              Đang xây dựng · P1-08
            </Badge>
            <form action={signOut} className="mt-2">
              <Button type="submit" variant="outline">
                <LogOut aria-hidden /> Đăng xuất
              </Button>
            </form>
          </EmptyState>
        </div>
      </main>
    </div>
  );
}
