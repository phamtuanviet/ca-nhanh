import { BadgeCheck, QrCode, Wallet } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { SampleTicket } from '@/components/cn/sample-ticket';
import { buttonVariants } from '@/components/ui/button';

const POINTS = [
  {
    Icon: BadgeCheck,
    title: 'Tiền công ký quỹ trước',
    text: 'Quán đăng ca là tiền được tạm giữ ngay. Người làm không lo bị quỵt.',
  },
  {
    Icon: QrCode,
    title: 'Chấm công bằng QR',
    text: 'Mã đổi mỗi 30 giây và kiểm tra vị trí, không chấm công hộ được.',
  },
  {
    Icon: Wallet,
    title: 'Nhận lương trong ngày',
    text: 'Quán duyệt giờ công là tiền vào ví, rút về ngân hàng ngay tối đó.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 lg:px-8">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            Đăng nhập
          </Link>
          <Link href="/signup" className={buttonVariants({ size: 'sm' })}>
            Đăng ký
          </Link>
        </nav>
      </header>

      <main className="mx-auto grid max-w-6xl gap-16 px-4 pt-8 pb-20 lg:px-8 lg:pt-16">
        <section className="grid items-center gap-10 lg:grid-cols-2">
          <div className="grid gap-6">
            <span className="cn-live">
              <span className="cn-live__dot" aria-hidden />
              Chợ ca làm theo giờ ở Hà Nội
            </span>
            <h1 className="font-display text-5xl leading-[0.95] font-extrabold tracking-tight sm:text-6xl">
              Đăng ca lúc 2 giờ.
              <br />
              <span className="text-primary">5 giờ có người.</span>
            </h1>
            <p className="max-w-xl text-lg text-text-muted">
              Quán cà phê, quán ăn cần người gấp thì đăng ca. Người làm nhận ca một chạm, không
              phỏng vấn, tối nhận lương.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className={buttonVariants({ size: 'lg' })}>
                Bắt đầu miễn phí
              </Link>
              <Link href="/login" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
                Vào bản demo
              </Link>
            </div>
          </div>
          <div className="grid gap-5">
            <SampleTicket
              shop="Cà phê Góc Phố"
              rating="4.8"
              title="Pha chế ca tối"
              time="17:00–22:00"
              day="Hôm nay"
              distance="1,2 km"
              pay="150.000đ"
              rate="30.000đ/giờ"
              headcount={2}
              filled={[{ name: 'Minh', avatar: '/avatars/minh.svg' }]}
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
              filled={[]}
              urgent
            />
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {POINTS.map(({ Icon, title, text }) => (
            <div
              key={title}
              className="grid gap-2 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]"
            >
              <Icon className="size-7 text-primary" aria-hidden />
              <h2 className="font-bold">{title}</h2>
              <p className="text-sm text-text-muted">{text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
