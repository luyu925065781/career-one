import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

// Product-wide action hierarchy: branded primary, neutral-glass secondary,
// surfaced-and-bordered tertiary, then containerless ghost actions. Shape is
// separate so pages can change sizing without rebuilding colors locally.
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-button text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background max-sm:min-h-[44px]",
  {
    variants: {
      variant: {
        primary: "bg-brand text-brand-foreground hover:bg-brand-200",
        secondary: "glass-secondary text-action-secondary-foreground",
        tertiary: "border border-outline-border bg-surface text-outline-text hover:border-outline-border-hover hover:bg-outline-bg active:border-outline-border-hover active:bg-outline-bg-hover",
        ghost: "hover:bg-surface-hover hover:text-foreground active:bg-outline-bg",
        danger: "bg-danger-solid text-white hover:bg-danger active:bg-danger",
        "danger-ghost": "text-danger hover:bg-danger-surface hover:text-danger active:bg-danger-surface",
      },
      size: {
        sm: "h-8 px-2 text-xs",
        lg: "h-11 px-5",
        "icon-sm": "size-8 p-0 max-sm:size-11",
        icon: "size-10 p-0 max-sm:size-11",
        default: "h-10 px-3",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>
>(function Button({ variant, size, className, ...props }, ref) {
  return <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});

export type ButtonVariants = VariantProps<typeof buttonVariants>;
