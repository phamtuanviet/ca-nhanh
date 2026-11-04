'use client';

import { Ban, Heart, HeartOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { givenName } from '@/lib/format';
import { api, ApiClientError } from '@/lib/http';

/** Đánh dấu người quen / chặn / bỏ đánh dấu cho một quán (S6, SHP-05) */
export function WorkerListActions({
  shopId,
  shopName,
  workerId,
  name,
  listType,
}: {
  shopId: string;
  shopName?: string;
  workerId: string;
  name: string;
  listType: 'favorite' | 'blocked' | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const path = `/shops/${shopId}/workers/${workerId}/list`;
  const who = givenName(name);
  const at = shopName ? ` ở ${shopName}` : '';

  async function run(method: 'PUT' | 'DELETE', body: object | undefined, message: string) {
    setPending(true);
    try {
      await api(path, { method, body });
      toast.success(message);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Không lưu được');
    } finally {
      setPending(false);
    }
  }

  if (listType === 'blocked') {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => run('DELETE', undefined, `Đã bỏ chặn ${who}${at}`)}
      >
        Bỏ chặn
      </Button>
    );
  }
  return (
    <span className="flex flex-wrap gap-2">
      {listType === 'favorite' ? (
        <Button
          size="sm"
          variant="secondary"
          aria-pressed
          disabled={pending}
          onClick={() => run('DELETE', undefined, `Đã bỏ ${who} khỏi người quen${at}`)}
        >
          <HeartOff aria-hidden /> Bỏ người quen
        </Button>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            run(
              'PUT',
              { list_type: 'favorite' },
              `${who} là người quen${at}: được ưu tiên nhận ca và mời`,
            )
          }
        >
          <Heart aria-hidden /> Người quen
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          if (window.confirm(`Chặn ${name}${at}? Người này sẽ không nhận được ca của quán.`))
            void run('PUT', { list_type: 'blocked' }, `Đã chặn ${who}${at}`);
        }}
      >
        <Ban aria-hidden /> Chặn
      </Button>
    </span>
  );
}
