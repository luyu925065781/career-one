// Server-rendered ambient color + glass layers. They are present in the first
// HTML response, so the hero never paints as an opaque white card before
// hydration. The radial gradients leave the center quiet for readable copy.
export function HeroGlow() {
  return (
    <>
      <div aria-hidden className="hero-glow-ambient pointer-events-none absolute inset-0 z-0" />
      <div aria-hidden className="hero-glow-glass pointer-events-none absolute inset-0 z-[1]" />
    </>
  );
}
