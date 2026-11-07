import Image from "next/image";

/**
 * The Academy Desk shield logo. Uses public/brand-mark.png, a transparent cut of the app icon (the icon files have a
 * white background, which shows as a white box on dark surfaces). `size` is the height; the shield is taller than wide.
 * Decorative: the name next to it carries the meaning.
 */
export function BrandMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand-mark.png"
      alt=""
      width={Math.round((size * 304) / 491)}
      height={size}
      className={`shrink-0 ${className}`}
      priority
    />
  );
}
