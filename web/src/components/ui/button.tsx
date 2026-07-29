import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

// Product-wide action hierarchy: branded primary, neutral-filled secondary,
// surfaced-and-bordered tertiary, then containerless ghost actions. Shape is
// separate so pages can change sizing without rebuilding colors locally.
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-control px-3 py-2 text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background max-sm:min-h-[44px]",
  {
    variants: {
      variant: {
        primary: "bg-brand text-brand-foreground hover:bg-brand-200",
        secondary: "bg-action-secondary text-action-secondary-foreground hover:bg-action-secondary-hover active:bg-action-secondary-active",
        tertiary: "border border-outline-border bg-surface text-outline-text hover:border-outline-border-hover hover:bg-outline-bg active:border-outline-border-hover active:bg-outline-bg-hover",
        ghost: "hover:bg-surface-hover hover:text-foreground active:bg-outline-bg",
      },
      size: { sm: "px-2 py-1.5 text-xs", icon: "p-1.5 max-sm:min-w-[44px]", default: "" },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export function Button({
  variant,
  size,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export type ButtonVariants = VariantProps<typeof buttonVariants>;
