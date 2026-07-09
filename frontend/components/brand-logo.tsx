import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  alt?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
};

export function BrandLogo({
  alt = "Ekana Cosmetics",
  className,
  imageClassName,
  priority = false,
  sizes = "48px",
}: BrandLogoProps) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden",
        className,
      )}
    >
      <Image
        src="/brand/logo.jpeg"
        alt={alt}
        width={500}
        height={500}
        priority={priority}
        sizes={sizes}
        className={cn("h-full w-full object-contain", imageClassName)}
      />
    </span>
  );
}
