import Image from 'next/image';
import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/logo';
import { photo } from '@/lib/photos';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const hero = photo('hero-barista', 1600);
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-4 py-6 sm:px-8">
        <Logo />
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          {children}
        </main>
        <p className="text-center text-xs text-text-muted">
          Bản demo đồ án Thương mại điện tử · dữ liệu là giả lập
        </p>
      </div>
      <div className="relative hidden overflow-hidden bg-lam-900 lg:block">
        <Image
          src={hero.src}
          alt={hero.alt}
          fill
          priority
          sizes="55vw"
          placeholder="blur"
          blurDataURL={hero.blurDataURL}
          className="object-cover opacity-80"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-muc-990/90 to-transparent p-10 text-white">
          <p className="font-display text-5xl leading-none font-extrabold tracking-tight">
            Đăng ca lúc 2 giờ.
            <br />
            <span className="text-nghe-300">5 giờ có người.</span>
          </p>
          <p className="mt-4 max-w-md text-base text-white/85">
            Tiền công được ký quỹ ngay khi đăng ca, chấm công bằng QR, người làm nhận tiền khi quán
            duyệt.
          </p>
        </div>
      </div>
    </div>
  );
}
