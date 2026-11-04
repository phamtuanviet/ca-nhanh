'use client';

import { ArrowLeft, Briefcase, Check, Store } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { signOut } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiClientError } from '@/lib/http';

type Role = 'worker' | 'shop_owner';
type Position = { code: string; name: string };

const ROLES = [
  {
    value: 'worker',
    title: 'Tôi tìm ca làm',
    text: 'Nhận ca theo giờ, lương về ví trong ngày',
    Icon: Briefcase,
  },
  {
    value: 'shop_owner',
    title: 'Tôi cần người làm',
    text: 'Đăng ca, có người trong vài giờ',
    Icon: Store,
  },
] as const;

/** Ngày sinh lớn nhất để đủ 18 tuổi (BR-27) */
function maxBirthDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
}

export function OnboardingForm({
  fullName,
  initialRole,
  positions,
}: {
  fullName: string;
  initialRole: Role;
  positions: Position[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role>(initialRole);
  const [skills, setSkills] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const phone = String(form.get('phone') ?? '').trim();
    const dob = String(form.get('date_of_birth') ?? '');
    const school = String(form.get('school') ?? '').trim();
    setError(null);
    if (role === 'worker' && !dob) {
      setError('Nhập ngày sinh để tiếp tục');
      return;
    }
    setPending(true);
    try {
      await api('/me/onboarding', {
        body: {
          role,
          full_name: String(form.get('full_name') ?? '').trim(),
          ...(phone ? { phone } : {}),
          ...(role === 'worker' ? { date_of_birth: dob } : {}),
        },
      });
      if (role === 'worker' && (skills.length > 0 || school)) {
        await api('/me/worker-profile', {
          method: 'PATCH',
          body: { skills, ...(school ? { school } : {}) },
        });
      }
      toast.success(
        role === 'worker' ? 'Xong! Xem ca gần bạn' : 'Xong! Tạo quán để đăng ca đầu tiên',
      );
      router.replace(role === 'worker' ? '/worker' : '/shop/settings');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Có lỗi xảy ra, vui lòng thử lại');
      setPending(false);
    }
  }

  if (step === 1) {
    return (
      <div className="grid gap-6">
        <div className="grid gap-2">
          <p className="text-sm font-semibold text-primary">Bước 1/2</p>
          <h1 className="text-[28px] leading-9 font-bold tracking-tight">
            Bạn dùng Ca Nhanh để làm gì?
          </h1>
          <p className="text-text-muted">Không đổi được sau khi hoàn tất, hãy chọn đúng nhé.</p>
        </div>
        <div className="grid gap-3" role="radiogroup" aria-label="Vai trò">
          {ROLES.map(({ value, title, text, Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={role === value}
              onClick={() => setRole(value)}
              className="flex items-center gap-4 rounded-[var(--radius-card)] border-2 border-border bg-surface p-4 text-left transition-colors hover:border-primary aria-checked:border-primary aria-checked:bg-primary-soft"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Icon className="size-6" aria-hidden />
              </span>
              <span className="grid flex-1 gap-0.5">
                <span className="font-semibold">{title}</span>
                <span className="text-sm text-text-muted">{text}</span>
              </span>
              {role === value ? <Check className="size-5 text-primary" aria-hidden /> : null}
            </button>
          ))}
        </div>
        <Button size="lg" block onClick={() => setStep(2)}>
          Tiếp tục
        </Button>
        <form action={signOut} className="text-center">
          <button type="submit" className="text-sm text-text-muted hover:text-text hover:underline">
            Đăng xuất
          </button>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <div className="grid gap-2">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="inline-flex w-fit items-center gap-1 text-sm font-medium text-text-muted hover:text-text"
        >
          <ArrowLeft className="size-4" aria-hidden /> Đổi vai trò
        </button>
        <p className="text-sm font-semibold text-primary">Bước 2/2</p>
        <h1 className="text-[28px] leading-9 font-bold tracking-tight">
          {role === 'worker' ? 'Hồ sơ người làm' : 'Thông tin chủ quán'}
        </h1>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="full_name">Họ tên</Label>
        <Input
          id="full_name"
          name="full_name"
          defaultValue={fullName}
          required
          maxLength={80}
          className="h-11"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="phone">Số điện thoại</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          placeholder="0912345678"
          className="h-11"
        />
        <p className="text-xs text-text-muted">
          {role === 'worker'
            ? 'Chỉ quán bạn đã nhận ca mới thấy số này.'
            : 'Người làm đã nhận ca sẽ thấy số này để liên hệ.'}
        </p>
      </div>

      {role === 'worker' ? (
        <>
          <div className="grid gap-2">
            <Label htmlFor="date_of_birth">Ngày sinh</Label>
            <Input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              required
              max={maxBirthDate()}
              className="h-11"
            />
            <p className="text-xs text-text-muted">Ca Nhanh chỉ nhận người làm từ 18 tuổi.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="school">Trường (không bắt buộc)</Label>
            <Input
              id="school"
              name="school"
              placeholder="ĐH Quốc gia Hà Nội"
              className="h-11"
              maxLength={120}
            />
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">Bạn làm được việc gì?</legend>
            <div className="flex flex-wrap gap-2">
              {positions.map((p) => {
                const on = skills.includes(p.code);
                return (
                  <button
                    key={p.code}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setSkills((list) =>
                        on ? list.filter((s) => s !== p.code) : [...list, p.code],
                      )
                    }
                    className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-sm font-medium transition-colors aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-on-primary-soft"
                  >
                    {on ? <Check className="size-4" aria-hidden /> : null}
                    {p.name}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-text-muted">
              Ca đúng kỹ năng được xếp lên trước khi bạn tìm ca.
            </p>
          </fieldset>
        </>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-[var(--radius-control)] bg-danger-soft px-4 py-3 text-sm text-on-danger-soft"
        >
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? 'Đang lưu…' : 'Hoàn tất'}
      </Button>
    </form>
  );
}
