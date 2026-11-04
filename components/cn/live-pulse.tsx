import type { RealtimeStatus } from '@/lib/realtime/use-realtime';

/**
 * Chấm báo dữ liệu đang cập nhật trực tiếp; mỗi màn hình một chấm (design/COMPONENTS.md › LivePulse).
 * Mất kết nối Realtime thì bỏ chấm và báo đang thử lại.
 */
export function LivePulse({ label, status = 'live' }: { label: string; status?: RealtimeStatus }) {
  if (status === 'offline') {
    return (
      <span className="cn-live text-text-muted" role="status">
        Mất kết nối, đang thử lại
      </span>
    );
  }
  return (
    <span className="cn-live" role="status">
      {status === 'live' ? (
        <span className="cn-live__dot" aria-hidden />
      ) : (
        <span className="size-2.5 rounded-full bg-border-strong" aria-hidden />
      )}
      {label}
    </span>
  );
}
