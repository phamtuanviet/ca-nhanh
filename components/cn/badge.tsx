import { AlertTriangle, Clock, ShieldCheck, Sparkles, Zap, type LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  'shield-check': ShieldCheck,
  zap: Zap,
  sparkles: Sparkles,
  clock: Clock,
  'alert-triangle': AlertTriangle,
};

export type BadgeTone = 'deposit' | 'urgent' | 'new' | 'info' | 'warn' | 'danger' | 'neutral';

/** Nhãn trạng thái ngắn, luôn có chữ (design/COMPONENTS.md › Badge) */
export function Badge({
  tone,
  icon,
  children,
}: {
  tone: BadgeTone;
  icon?: keyof typeof ICONS;
  children: string;
}) {
  const Icon = icon ? ICONS[icon] : null;
  return (
    <span className={tone === 'neutral' ? 'cn-badge' : `cn-badge cn-badge--${tone}`}>
      {Icon ? <Icon aria-hidden /> : null}
      {children}
    </span>
  );
}
