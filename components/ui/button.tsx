import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import { Slot } from 'radix-ui';

// Theo Button của hệ thiết kế (design/COMPONENTS.md): cao tối thiểu 44px, nhãn là động từ.
// primary: hành động chính, mỗi màn hình một nút. spark: việc gấp hoặc tốn phí, tối đa một nút mỗi màn hình.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-transparent text-[15px] font-semibold whitespace-nowrap transition-[background-color,transform,box-shadow] duration-[var(--cn-dur-quick)] ease-[var(--cn-ease-out)] outline-none select-none active:not-disabled:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-danger [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: 'bg-primary text-on-primary hover:bg-primary-hover',
        spark: 'bg-spark text-on-spark hover:bg-spark-hover',
        danger: 'bg-danger text-on-danger hover:bg-son-700',
        destructive: 'bg-danger-soft text-on-danger-soft hover:bg-son-100 dark:hover:bg-son-900',
        outline: 'border-border-strong bg-surface text-text hover:bg-surface-sunken',
        secondary: 'bg-primary-soft text-on-primary-soft hover:bg-lam-100 dark:hover:bg-lam-900',
        ghost: 'text-text hover:bg-surface-sunken',
        link: 'h-auto px-0 text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-9 gap-1.5 px-3 text-sm [&_svg:not([class*="size-"])]:size-4',
        lg: 'h-12 px-6 text-base',
        icon: 'size-11',
        'icon-sm': 'size-9 [&_svg:not([class*="size-"])]:size-4',
      },
      block: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  block,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, block, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
