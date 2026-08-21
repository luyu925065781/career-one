// The exported name stays stable for internal imports. The rendered asset is
// mirrored from the canonical artwork at ../../../Logo/logo.svg.
export function CoMark({ size = 28 }: { size?: number }) {
  return (
    <img
      src="/icon.svg"
      alt=""
      aria-hidden="true"
      draggable={false}
      width={Math.round(size * 1.1)}
      height={size}
      className="block shrink-0 object-contain"
    />
  );
}
