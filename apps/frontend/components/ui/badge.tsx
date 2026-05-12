import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
        success:
          "border-transparent bg-[var(--color-success)] text-[var(--color-success-foreground)]",
        destructive:
          "border-transparent bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)]",
        warning:
          "border-transparent bg-[var(--color-warning)] text-[var(--color-warning-foreground)]",
        outline: "border-[var(--color-border)] bg-transparent text-[var(--color-muted-foreground)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
