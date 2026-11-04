import type { Metadata } from 'next';
import { Logo } from '@/components/brand/logo';
import { Badge, type BadgeTone } from '@/components/cn/badge';
import { EmptyState, Illustration } from '@/components/cn/empty-state';
import { ILLUSTRATIONS, type IllustrationName } from '@/components/cn/illustrations.generated';
import { SampleTicket, SeatsSample } from '@/components/cn/sample-ticket';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Hệ thiết kế',
  robots: { index: false, follow: false },
};

const SEMANTIC = [
  ['bg', 'Nền trang'],
  ['surface', 'Bề mặt'],
  ['surface-sunken', 'Bề mặt chìm'],
  ['border', 'Viền'],
  ['text', 'Chữ'],
  ['text-muted', 'Chữ phụ'],
  ['primary', 'Lam Ca · hành động chính'],
  ['primary-soft', 'Lam nhạt'],
  ['spark', 'Nghệ · gấp, điểm nhấn'],
  ['spark-soft', 'Nghệ nhạt'],
  ['money', 'Ngọc · tiền'],
  ['money-soft', 'Ngọc nhạt'],
  ['live', 'Đang trực tiếp'],
  ['danger', 'Son · nguy hiểm'],
  ['danger-soft', 'Son nhạt'],
] as const;

const SCALES = ['lam', 'nghe', 'ngoc', 'son', 'muc'] as const;
const STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

const TONES: [BadgeTone, string][] = [
  ['deposit', 'Đã ký quỹ'],
  ['urgent', 'Ca gấp'],
  ['new', 'Mới'],
  ['info', 'Đã xác minh'],
  ['warn', 'Sắp bắt đầu'],
  ['danger', 'Vắng mặt'],
  ['neutral', 'Đã duyệt'],
];

const SEATS = [
  { name: 'Minh', avatar: '/avatars/minh.svg' },
  { name: 'An', avatar: '/avatars/an.svg' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

/** Trang kiểm tra hệ thiết kế đã gắn đúng vào ứng dụng (07 P0-03), xem ở cả hai theme */
export default function DesignSystemPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 py-8 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="grid gap-2">
          <Logo />
          <h1 className="text-2xl font-bold">Hệ thiết kế trong ứng dụng</h1>
          <p className="max-w-2xl text-text-muted">
            Token từ <code>design/theme.css</code>, lớp <code>cn-*</code> từ{' '}
            <code>design/components.css</code>, nút của shadcn/ui đã đổi theo thương hiệu. Đổi theme
            để kiểm tra tương phản.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Section title="Màu ngữ nghĩa">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SEMANTIC.map(([token, label]) => (
            <div
              key={token}
              className="overflow-hidden rounded-[var(--radius-control)] border border-border bg-surface"
            >
              <div className="h-14" style={{ background: `var(--${token})` }} />
              <div className="grid gap-0.5 p-2">
                <code className="text-xs font-semibold">--{token}</code>
                <span className="text-xs text-text-muted">{label}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Thang màu">
        <div className="grid gap-2 overflow-x-auto">
          {SCALES.map((scale) => (
            <div
              key={scale}
              className="grid min-w-[640px] grid-cols-[64px_repeat(11,minmax(0,1fr))] items-center gap-1"
            >
              <code className="text-xs font-semibold">{scale}</code>
              {STEPS.map((step) => (
                <div
                  key={step}
                  title={`--${scale}-${step}`}
                  className="h-9 rounded-md"
                  style={{ background: `var(--${scale}-${step})` }}
                />
              ))}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Chữ">
        <div className="grid gap-3 rounded-[var(--radius-card)] bg-surface p-6 shadow-[var(--shadow-card)]">
          <p className="cn-num text-6xl text-money">150.000đ</p>
          <p className="cn-num text-3xl">17:00–22:00 · 2/3</p>
          <p className="text-[28px] leading-9 font-bold">Pha chế ca tối · Be Vietnam Pro 700</p>
          <p className="text-base">
            Tiếng Việt đầy đủ dấu: Quán đăng ca lúc 2 giờ chiều, 5 giờ có người đến làm, tối nhận
            lương.
          </p>
          <p className="text-sm text-text-muted">Chữ phụ 14px cho thông tin kèm theo.</p>
        </div>
      </Section>

      <Section title="Nút (shadcn/ui theo thương hiệu)">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Nhận ca</Button>
          <Button variant="spark">Đẩy ca gấp · 20.000đ</Button>
          <Button variant="danger">Hủy ca</Button>
          <Button variant="outline">Xem chi tiết</Button>
          <Button variant="secondary">Mời lại</Button>
          <Button variant="ghost">Để sau</Button>
          <Button variant="link">Điều khoản</Button>
          <Button disabled>Đang xử lý</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Nhỏ</Button>
          <Button>Mặc định 44px</Button>
          <Button size="lg">Lớn</Button>
        </div>
      </Section>

      <Section title="Badge">
        <div className="flex flex-wrap gap-2">
          {TONES.map(([tone, label]) => (
            <Badge key={tone} tone={tone}>
              {label}
            </Badge>
          ))}
        </div>
      </Section>

      <Section title="Vé ca, chỗ, con dấu">
        <div className="grid gap-6 lg:grid-cols-2">
          <SampleTicket
            shop="Cà phê Góc Phố"
            rating="4.8"
            title="Pha chế ca tối"
            time="17:00–22:00"
            day="Hôm nay"
            distance="1,2 km"
            pay="150.000đ"
            rate="30.000đ/giờ"
            headcount={3}
            filled={SEATS.slice(0, 1)}
          />
          <SampleTicket
            shop="Bánh mì Phố Huế"
            rating="4.6"
            title="Phục vụ giờ trưa"
            time="11:00–14:00"
            day="Ngày mai"
            distance="2,8 km"
            pay="96.000đ"
            rate="32.000đ/giờ"
            headcount={2}
            filled={SEATS.slice(0, 1)}
            urgent
          />
          <SampleTicket
            shop="Trà sữa Mây"
            rating="4.9"
            title="Thu ngân cuối tuần"
            time="18:00–22:00"
            day="Thứ Bảy"
            distance="3,1 km"
            pay="120.000đ"
            rate="30.000đ/giờ"
            headcount={2}
            filled={SEATS}
            full
          />
          <div className="grid content-start gap-5 rounded-[var(--radius-card)] bg-surface p-6 shadow-[var(--shadow-card)]">
            <SeatsSample headcount={4} filled={SEATS} />
            <div className="flex flex-wrap gap-4">
              <span className="cn-stamp">Đã nhận</span>
              <span className="cn-stamp cn-stamp--money">Đã ký quỹ</span>
              <span className="cn-stamp cn-stamp--danger">Vắng mặt</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="cn-countdown">
                Vào ca sau <span className="cn-countdown__time">02:14:05</span>
              </span>
              <span className="cn-countdown cn-countdown--soon">
                Còn <span className="cn-countdown__time">12:30</span>
              </span>
            </div>
            <span className="cn-live">
              <span className="cn-live__dot" aria-hidden />
              Đang tuyển · 12 ca gần bạn
            </span>
          </div>
        </div>
      </Section>

      <Section title="Màn hình rỗng và minh họa">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(ILLUSTRATIONS) as IllustrationName[]).map((name) => (
            <div
              key={name}
              className="grid justify-items-center gap-2 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)]"
            >
              <Illustration name={name} className="w-40" />
              <code className="text-xs text-text-muted">{name}</code>
            </div>
          ))}
        </div>
        <div className="rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            illustration="empty-bookings"
            title="Bạn chưa nhận ca nào"
            text="Ca bạn nhận sẽ nằm ở đây, kèm đồng hồ đếm ngược tới giờ vào ca."
            action={{ label: 'Xem ca gần bạn', href: '/worker' }}
          />
        </div>
      </Section>

      <Section title="Khung chờ">
        <div className="grid max-w-md gap-3">
          <div className="cn-skel h-28 rounded-[var(--radius-ticket)]" />
          <div className="cn-skel h-4 w-3/4" />
          <div className="cn-skel h-4 w-1/2" />
        </div>
      </Section>
    </div>
  );
}
