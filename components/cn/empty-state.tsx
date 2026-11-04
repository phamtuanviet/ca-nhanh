import Link from 'next/link';
import type { ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { ILLUSTRATIONS, type IllustrationName } from './illustrations.generated';

/** Minh họa chèn trực tiếp (lớp cn-il) để màu đổi theo theme */
export function Illustration({ name, className }: { name: IllustrationName; className?: string }) {
  const art = ILLUSTRATIONS[name];
  return (
    <svg
      className={['cn-il', className].filter(Boolean).join(' ')}
      viewBox={art.viewBox}
      role="img"
      aria-label={art.label}
      dangerouslySetInnerHTML={{ __html: art.inner }}
    />
  );
}

type EmptyStateProps = {
  illustration: IllustrationName;
  title: string;
  text: string;
  /** Đúng một hành động tiếp theo (design/COMPONENTS.md › EmptyState) */
  action?: { label: string; href: string };
  children?: ReactNode;
};

export function EmptyState({ illustration, title, text, action, children }: EmptyStateProps) {
  return (
    <div className="cn-empty">
      <Illustration name={illustration} />
      <h2 className="cn-empty__title">{title}</h2>
      <p className="cn-empty__text">{text}</p>
      {action ? (
        <Link href={action.href} className={buttonVariants({ className: 'mt-2' })}>
          {action.label}
        </Link>
      ) : null}
      {children}
    </div>
  );
}
