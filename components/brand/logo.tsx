import Link from 'next/link';

/** Logo chữ: bản nền sáng và bản nền tối, đổi theo theme */
export function Logo({ href = '/', className = 'h-7' }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center"
      aria-label="Ca Nhanh, về trang chủ"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG nhỏ, không cần tối ưu ảnh */}
      <img src="/brand/logo-lockup.svg" alt="" className={`${className} w-auto dark:hidden`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-lockup-on-dark.svg"
        alt=""
        className={`${className} hidden w-auto dark:block`}
      />
    </Link>
  );
}
