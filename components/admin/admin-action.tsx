'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { api, ApiClientError } from '@/lib/http';

type Variant = 'default' | 'outline' | 'secondary' | 'danger' | 'destructive' | 'ghost';

/**
 * Nút thao tác quản trị: hỏi xác nhận (kèm lý do nếu cần), gọi API, báo kết quả, tải lại dữ liệu trang.
 * Lý do (nếu có) được gửi trong trường `reason`.
 */
export function AdminAction({
  label,
  path,
  method = 'POST',
  body = {},
  success,
  confirm,
  variant = 'outline',
  icon,
}: {
  label: string;
  path: string;
  method?: 'POST' | 'PATCH';
  body?: Record<string, unknown>;
  success: string;
  confirm?: { title: string; text: string; reason?: string; action?: string; danger?: boolean };
  variant?: Variant;
  icon?: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run() {
    setPending(true);
    setError(null);
    try {
      await api(`${path}`, {
        method,
        body: confirm?.reason ? { ...body, reason: reason.trim() } : body,
      });
      toast.success(success);
      setOpen(false);
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Không thực hiện được';
      if (confirm) setError(message);
      else toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant={variant}
        disabled={pending}
        onClick={() => {
          if (!confirm) return void run();
          setReason('');
          setError(null);
          setOpen(true);
        }}
      >
        {icon}
        {label}
      </Button>
      {confirm ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{confirm.title}</DialogTitle>
              <DialogDescription>{confirm.text}</DialogDescription>
            </DialogHeader>
            {confirm.reason ? (
              <div className="grid gap-2">
                <Label htmlFor="admin-reason">{confirm.reason}</Label>
                <textarea
                  id="admin-reason"
                  rows={2}
                  maxLength={300}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="rounded-[var(--radius-control)] border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm font-medium text-danger">
                {error}
              </p>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Thôi
              </Button>
              <Button
                variant={confirm.danger ? 'danger' : 'default'}
                onClick={run}
                disabled={pending}
              >
                {pending ? 'Đang xử lý…' : (confirm.action ?? label)}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
