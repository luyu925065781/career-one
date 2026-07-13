// The exported name stays stable for internal imports; the visible mark follows
// the Chinese product brand.
export function CoMark({ size = 28 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-md bg-brand font-sans font-bold text-brand-foreground"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.57),
        letterSpacing: 0,
        lineHeight: 1,
      }}
    >
      择
    </span>
  );
}
