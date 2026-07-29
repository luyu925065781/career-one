import { cn } from "@/lib/cn";

// Panel with the docs home signature: a resting rotating brand-gradient corner
// that lights the 1px edge (bg-origin-border). Both opt-in — dense work
// surfaces (tables, lists) pass neither corner nor elevated.
const CORNERS = {
  br: "bg-gradient-to-br",
  bl: "bg-gradient-to-bl",
  tr: "bg-gradient-to-tr",
  tl: "bg-gradient-to-tl",
} as const;

export function Card({
  className,
  corner,
  elevated,
  interactive,
  compact,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  corner?: keyof typeof CORNERS;
  elevated?: boolean;
  interactive?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card border border-border bg-surface/50",
        corner && `${CORNERS[corner]} from-brand/10 via-transparent to-transparent bg-origin-border`,
        elevated && "shadow-raised",
        interactive && "transition-colors duration-150 hover:bg-surface-hover",
        compact ? "p-4" : "p-5",
        className,
      )}
      {...props}
    />
  );
}
