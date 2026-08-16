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
  surface = "subtle",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  corner?: keyof typeof CORNERS;
  elevated?: boolean;
  interactive?: boolean;
  compact?: boolean;
  surface?: "quiet" | "subtle" | "solid";
}) {
  return (
    <div
      data-ui-card={surface}
      data-card-elevation={elevated ? "raised" : undefined}
      data-card-interactive={interactive || undefined}
      className={cn(
        "relative overflow-hidden",
        corner && `${CORNERS[corner]} from-brand/10 via-transparent to-transparent bg-origin-border`,
        compact ? "p-4" : "p-5",
        className,
      )}
      {...props}
    />
  );
}
