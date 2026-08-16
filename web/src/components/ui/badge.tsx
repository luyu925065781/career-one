import { cn } from "@/lib/cn";

// Read-only score / status label. Interactive filters use the structural chip
// contract instead. No brand tone: persistent selection and status remain
// visually distinct.
export function Badge({
  className,
  tone = "muted",
  size = "md",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "good" | "warn" | "bad" | "info" | "muted";
  size?: "sm" | "md";
}) {
  const tones = {
    good: "bg-success-surface text-success",
    warn: "bg-warning-surface text-warning",
    bad: "bg-danger-surface text-danger",
    info: "bg-info-surface text-info",
    muted: "bg-surface-hover text-muted",
  } as const;
  const sizes = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-1.5 py-0.5 text-xs",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-semibold tabular-nums",
        tones[tone],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
