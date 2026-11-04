import { Logo } from '@/components/brand/logo';
import { EmptyState } from '@/components/cn/empty-state';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col px-4 py-6">
      <Logo />
      <main className="mx-auto flex w-full max-w-md flex-1 items-center">
        <div className="w-full rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            illustration="empty-shifts"
            title="Không tìm thấy trang"
            text="Đường dẫn không tồn tại hoặc trang đã được chuyển đi."
            action={{ label: 'Về trang chủ', href: '/' }}
          />
        </div>
      </main>
    </div>
  );
}
