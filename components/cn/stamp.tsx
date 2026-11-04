/** Con dấu cho trạng thái đã chốt, không quay lại được (design/COMPONENTS.md › Stamp) */
export function Stamp({
  text,
  tone = 'primary',
  animate = false,
  className,
}: {
  text: 'Đã nhận' | 'Đủ người' | 'Đã ký quỹ' | 'Vắng mặt';
  tone?: 'primary' | 'money' | 'danger';
  animate?: boolean;
  className?: string;
}) {
  const classes = [
    'cn-stamp',
    tone === 'money' && 'cn-stamp--money',
    tone === 'danger' && 'cn-stamp--danger',
    animate && 'cn-stamp--in',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <span className={classes} role="status">
      {text}
    </span>
  );
}
