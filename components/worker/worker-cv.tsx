import { Award, BadgeCheck, GraduationCap, Phone, Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { fmtDate } from '@/lib/format';
import { REVIEW_TAG_LABEL } from '@/lib/labels';
import type { WorkerProfile } from '@/lib/services/workers';

/**
 * Hồ sơ năng lực (CV tự động, P3-07, US-24, PRF-05): điểm, số ca, huy hiệu sinh từ lịch sử, kỹ năng,
 * đánh giá gần đây của các quán. Dùng cho chủ quán, admin và chính người làm.
 */
export function WorkerCv({ w, actions }: { w: WorkerProfile; actions?: ReactNode }) {
  return (
    <div className="grid gap-4">
      <section className="grid gap-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start gap-4">
          {w.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- avatar SVG nhỏ
            <img src={w.avatar_url} alt="" className="size-16 rounded-full bg-lam-100" />
          ) : (
            <span className="flex size-16 items-center justify-center rounded-full bg-lam-100 text-xl font-bold text-on-primary-soft">
              {w.full_name.at(0)}
            </span>
          )}
          <div className="grid min-w-0 flex-1 gap-1">
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold">
              {w.full_name}
              {w.kyc_status === 'verified' ? (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-money">
                  <BadgeCheck className="size-4" aria-hidden /> Đã xác minh
                </span>
              ) : null}
            </h1>
            {w.school ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-text-muted">
                <GraduationCap className="size-4" aria-hidden /> {w.school}
              </span>
            ) : null}
            {w.phone ? (
              <a
                href={`tel:${w.phone}`}
                className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Phone className="size-4" aria-hidden /> {w.phone}
              </a>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>

        <dl className="grid grid-cols-3 gap-3 text-center">
          <div className="grid gap-0.5 rounded-[var(--radius-control)] bg-surface-sunken p-3">
            <dt className="text-xs text-text-muted">Điểm đánh giá</dt>
            <dd className="inline-flex items-center justify-center gap-1 text-xl font-semibold">
              {w.rating_count > 0 ? (
                <>
                  <Star className="size-4 fill-spark text-spark" aria-hidden />
                  {w.rating_avg.toFixed(1)}
                </>
              ) : (
                '—'
              )}
            </dd>
            <dd className="text-xs text-text-muted">{w.rating_count} đánh giá</dd>
          </div>
          <div className="grid gap-0.5 rounded-[var(--radius-control)] bg-surface-sunken p-3">
            <dt className="text-xs text-text-muted">Ca hoàn tất</dt>
            <dd className="text-xl font-semibold">{w.completed_count}</dd>
            {w.completed_at_my_shops > 0 ? (
              <dd className="text-xs text-text-muted">{w.completed_at_my_shops} ca ở quán bạn</dd>
            ) : null}
          </div>
          <div className="grid gap-0.5 rounded-[var(--radius-control)] bg-surface-sunken p-3">
            <dt className="text-xs text-text-muted">Vắng mặt</dt>
            <dd className="text-xl font-semibold">{w.no_show_count}</dd>
          </div>
        </dl>

        {w.badges.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Huy hiệu">
            {w.badges.map((b) => (
              <li key={b} className="cn-badge cn-badge--deposit">
                <Award aria-hidden /> {b}
              </li>
            ))}
          </ul>
        ) : null}

        {w.skills.length > 0 ? (
          <div className="grid gap-1.5">
            <h2 className="text-xs font-semibold text-text-muted">Kỹ năng</h2>
            <ul className="flex flex-wrap gap-1.5">
              {w.skills.map((s) => (
                <li
                  key={s.code}
                  className="rounded-full bg-primary-soft px-3 py-1 text-sm text-on-primary-soft"
                >
                  {s.name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {w.bio ? <p className="text-sm whitespace-pre-line text-text-muted">{w.bio}</p> : null}
      </section>

      <section className="grid gap-3 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
        <h2 className="font-semibold">Quán nhận xét</h2>
        {w.recent_reviews.length === 0 ? (
          <p className="text-sm text-text-muted">Chưa có đánh giá nào.</p>
        ) : (
          <ul className="divide-y divide-border">
            {w.recent_reviews.map((r, i) => (
              <li key={i} className="grid gap-1 py-3">
                <span className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{r.shop_name}</span>
                  <span
                    className="inline-flex items-center gap-0.5"
                    role="img"
                    aria-label={`${r.stars} sao`}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`size-3.5 ${n <= r.stars ? 'fill-spark text-spark' : 'text-border-strong'}`}
                        aria-hidden
                      />
                    ))}
                  </span>
                </span>
                {r.tags.length > 0 ? (
                  <span className="flex flex-wrap gap-1">
                    {r.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs text-text-muted"
                      >
                        {REVIEW_TAG_LABEL[t] ?? t}
                      </span>
                    ))}
                  </span>
                ) : null}
                {r.comment ? <p className="text-sm">{r.comment}</p> : null}
                <span className="text-xs text-text-muted">{fmtDate(r.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
