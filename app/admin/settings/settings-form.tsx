'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fmtDateTime } from '@/lib/format';
import { api, ApiClientError } from '@/lib/http';
import type { AdminSetting } from '@/lib/services/admin';

type Field = {
  /** "fee_rate" hoặc khóa con "penalty_points.no_show" */
  path: string;
  label: string;
  kind: 'percent' | 'int' | 'bool';
  unit?: string;
  hint?: string;
};

const GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: 'Phí và tiền',
    fields: [
      {
        path: 'fee_rate',
        label: 'Phí nền tảng',
        kind: 'percent',
        unit: '%',
        hint: 'Trên tiền công, quán trả thêm (0–50%)',
      },
      { path: 'min_hourly_rate', label: 'Lương tối thiểu theo giờ', kind: 'int', unit: 'đ' },
      { path: 'urgent_boost_fee', label: 'Phí đẩy ca gấp', kind: 'int', unit: 'đ/ca' },
      {
        path: 'shop_cancel_compensation_rate',
        label: 'Bồi thường khi quán hủy < 24 giờ',
        kind: 'percent',
        unit: '%',
      },
      { path: 'topup_min', label: 'Nạp tối thiểu', kind: 'int', unit: 'đ' },
      { path: 'topup_expire_minutes', label: 'Lệnh nạp hết hạn sau', kind: 'int', unit: 'phút' },
      { path: 'withdraw_min', label: 'Rút tối thiểu', kind: 'int', unit: 'đ' },
    ],
  },
  {
    title: 'Thời gian ca',
    fields: [
      {
        path: 'min_lead_minutes',
        label: 'Đăng ca trước giờ bắt đầu ít nhất',
        kind: 'int',
        unit: 'phút',
        hint: 'Demo trên lớp: đặt 2',
      },
      {
        path: 'checkin_open_before_minutes',
        label: 'Mở check-in trước giờ bắt đầu',
        kind: 'int',
        unit: 'phút',
      },
      {
        path: 'late_after_minutes',
        label: 'Đi muộn khi check-in sau giờ bắt đầu',
        kind: 'int',
        unit: 'phút',
      },
      {
        path: 'no_show_after_minutes',
        label: 'Vắng mặt khi chưa check-in sau giờ bắt đầu',
        kind: 'int',
        unit: 'phút',
      },
      {
        path: 'auto_checkout_after_minutes',
        label: 'Tự check-out sau giờ kết thúc',
        kind: 'int',
        unit: 'phút',
      },
      {
        path: 'auto_approve_after_hours',
        label: 'Tự duyệt giờ công sau check-out',
        kind: 'int',
        unit: 'giờ',
      },
      {
        path: 'gps_accuracy_cap_m',
        label: 'Sai số GPS tối đa cộng vào bán kính quán',
        kind: 'int',
        unit: 'm',
      },
    ],
  },
  {
    title: 'Điểm phạt và tạm khóa',
    fields: [
      {
        path: 'penalty_points.cancel_lt_24h',
        label: 'Hủy trước giờ bắt đầu 6–24 giờ',
        kind: 'int',
        unit: 'điểm',
      },
      {
        path: 'penalty_points.cancel_lt_6h',
        label: 'Hủy trước giờ bắt đầu dưới 6 giờ',
        kind: 'int',
        unit: 'điểm',
      },
      { path: 'penalty_points.no_show', label: 'Vắng mặt', kind: 'int', unit: 'điểm' },
      { path: 'suspension_threshold', label: 'Ngưỡng tạm khóa', kind: 'int', unit: 'điểm' },
      { path: 'penalty_window_days', label: 'Cộng dồn điểm phạt trong', kind: 'int', unit: 'ngày' },
      { path: 'suspension_days', label: 'Tạm khóa nhận ca', kind: 'int', unit: 'ngày' },
    ],
  },
  {
    title: 'Chế độ demo',
    fields: [
      {
        path: 'demo_mode.enabled',
        label: 'Bật công cụ demo (tua giờ, reset, giả lập thanh toán)',
        kind: 'bool',
        hint: 'Cần thêm DEMO_MODE=true ở môi trường',
      },
      { path: 'demo_mode.auto_verify', label: 'Tự xác minh người làm và quán mới', kind: 'bool' },
      {
        path: 'demo_mode.skip_geofence',
        label: 'Bỏ kiểm tra vị trí khi chấm công (demo trong phòng)',
        kind: 'bool',
      },
    ],
  },
];

type Values = Record<string, string | boolean>;

function read(values: Record<string, unknown>, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((v, k) => (v as Record<string, unknown> | undefined)?.[k], values);
}

function toDraft(rows: AdminSetting[]): Values {
  const raw = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const out: Values = {};
  for (const f of GROUPS.flatMap((g) => g.fields)) {
    const v = read(raw, f.path);
    if (f.kind === 'bool') out[f.path] = v === true;
    else if (f.kind === 'percent') out[f.path] = String(Math.round(Number(v) * 1000) / 10);
    else out[f.path] = String(v ?? '');
  }
  return out;
}

/** Form cấu hình (P3-05): chỉ gửi các khóa đã đổi; API kiểm miền giá trị từng khóa */
export function SettingsForm({ rows }: { rows: AdminSetting[] }) {
  const router = useRouter();
  const initial = toDraft(rows);
  const [draft, setDraft] = useState<Values>(initial);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const changed = Object.keys(draft).filter((k) => draft[k] !== initial[k]);
  const lastUpdate = rows
    .map((r) => r.updated_at)
    .sort()
    .at(-1);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const patch: Record<string, unknown> = {};
    const raw = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    for (const path of changed) {
      const field = GROUPS.flatMap((g) => g.fields).find((f) => f.path === path)!;
      const value =
        field.kind === 'bool'
          ? draft[path]
          : field.kind === 'percent'
            ? Math.round(Number(String(draft[path]).replace(',', '.')) * 10) / 1000
            : Number(draft[path]);
      const [key, sub] = path.split('.');
      if (sub) {
        const base = (patch[key] as Record<string, unknown>) ?? { ...(raw[key] as object) };
        patch[key] = { ...base, [sub]: value };
      } else patch[key] = value;
    }
    setSaving(true);
    setErrors({});
    try {
      await api('/admin/settings', { method: 'PATCH', body: patch });
      toast.success(`Đã lưu ${changed.length} tham số`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError && Array.isArray(err.details)) {
        const map: Record<string, string> = {};
        for (const d of err.details as { field: string; message: string }[])
          map[d.field] = d.message;
        setErrors(map);
      }
      toast.error(err instanceof ApiClientError ? err.message : 'Không lưu được');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} noValidate>
      <PageHeader
        title="Cấu hình"
        description={`Tham số nền tảng, áp dụng ngay cho thao tác tiếp theo${lastUpdate ? ` · sửa lần cuối ${fmtDateTime(lastUpdate)}` : ''}`}
        actions={
          <Button type="submit" disabled={saving || changed.length === 0}>
            {saving
              ? 'Đang lưu…'
              : changed.length
                ? `Lưu ${changed.length} thay đổi`
                : 'Chưa có thay đổi'}
          </Button>
        }
      />
      <div className="grid gap-5 xl:grid-cols-2">
        {GROUPS.map((g) => (
          <fieldset
            key={g.title}
            className="grid content-start gap-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]"
          >
            <legend className="sr-only">{g.title}</legend>
            <h2 className="font-semibold" aria-hidden>
              {g.title}
            </h2>
            {g.fields.map((f) => {
              const id = `setting-${f.path.replace('.', '-')}`;
              const err = errors[f.path.split('.')[0]];
              const dirty = draft[f.path] !== initial[f.path];
              return f.kind === 'bool' ? (
                <label key={f.path} htmlFor={id} className="flex items-start gap-3 text-sm">
                  <input
                    id={id}
                    type="checkbox"
                    checked={draft[f.path] as boolean}
                    onChange={(e) => setDraft((d) => ({ ...d, [f.path]: e.target.checked }))}
                    className="mt-0.5 size-4 accent-[var(--primary)]"
                  />
                  <span className="grid gap-0.5">
                    <span className={dirty ? 'font-semibold' : ''}>{f.label}</span>
                    {f.hint ? <span className="text-xs text-text-muted">{f.hint}</span> : null}
                  </span>
                </label>
              ) : (
                <div key={f.path} className="grid gap-1">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor={id} className={`text-sm ${dirty ? 'font-semibold' : ''}`}>
                      {f.label}
                    </label>
                    <span className="flex items-center gap-2">
                      <Input
                        id={id}
                        inputMode="decimal"
                        value={draft[f.path] as string}
                        onChange={(e) => setDraft((d) => ({ ...d, [f.path]: e.target.value }))}
                        aria-invalid={err ? true : undefined}
                        className="h-9 w-28 text-right tabular-nums"
                      />
                      <span className="w-10 text-xs text-text-muted">{f.unit}</span>
                    </span>
                  </div>
                  {f.hint ? <span className="text-xs text-text-muted">{f.hint}</span> : null}
                  {err ? (
                    <span role="alert" className="text-xs font-medium text-danger">
                      {err}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </fieldset>
        ))}
      </div>
      <p className="mt-4 text-xs text-text-muted">
        Chu kỳ đổi mã QR cố định 30 giây trong mã ký (BR-14), không chỉnh ở đây.
      </p>
    </form>
  );
}
