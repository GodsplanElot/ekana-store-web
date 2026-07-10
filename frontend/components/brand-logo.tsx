import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  alt?: string;
  className?: string;
  imageClassName?: string;
  markClassName?: string;
  priority?: boolean;
  sizes?: string;
  surface?: "none" | "glass" | "ivory" | "ink";
  textClassName?: string;
  variant?: "mark" | "lockup" | "seal" | "watermark";
};

const logoSrc = "/brand/ekana-logo.png";

const surfaceClasses = {
  none: "",
  glass:
    "rounded-full border border-primary/15 bg-background/70 shadow-[0_14px_36px_rgba(75,40,48,0.12)] backdrop-blur",
  ivory:
    "rounded-full border border-primary/15 bg-[#fffaf2] shadow-[0_14px_36px_rgba(75,40,48,0.12)]",
  ink:
    "rounded-full border border-white/15 bg-[#211814] shadow-[0_16px_44px_rgba(0,0,0,0.28)]",
};

export function BrandLogo({
  alt = "Ekana Cosmetics",
  className,
  imageClassName,
  markClassName,
  priority = false,
  sizes = "48px",
  surface = "glass",
  textClassName,
  variant = "mark",
}: BrandLogoProps) {
  if (variant === "watermark") {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none relative inline-flex shrink-0 select-none items-center justify-center opacity-[0.075]",
          className,
        )}
      >
        <Image
          src={logoSrc}
          alt=""
          width={2048}
          height={2048}
          priority={priority}
          sizes={sizes}
          className={cn("h-full w-full object-contain", imageClassName)}
        />
      </span>
    );
  }

  const mark = (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden p-1.5",
        surfaceClasses[surface],
        variant === "seal" && "size-12",
        markClassName,
      )}
    >
      <Image
        src={logoSrc}
        alt={variant === "lockup" || variant === "seal" ? "" : alt}
        width={2048}
        height={2048}
        priority={priority}
        sizes={sizes}
        className={cn("h-full w-full object-contain", imageClassName)}
      />
    </span>
  );

  if (variant === "lockup") {
    return (
      <span
        className={cn(
          "inline-flex min-w-0 shrink-0 items-center gap-3",
          className,
        )}
      >
        {mark}
        <span className={cn("min-w-0 leading-none", textClassName)}>
          <span className="block font-serif text-xl tracking-[0.04em] text-foreground">
            Ekana
          </span>
          <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Cosmetics
          </span>
        </span>
      </span>
    );
  }

  if (variant === "seal") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/80 px-2.5 py-1.5 shadow-[0_10px_28px_rgba(75,40,48,0.1)] backdrop-blur",
          className,
        )}
      >
        {mark}
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
          Ekana
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden p-1.5",
        surfaceClasses[surface],
        className,
      )}
    >
      <Image
        src={logoSrc}
        alt={alt}
        width={2048}
        height={2048}
        priority={priority}
        sizes={sizes}
        className={cn("h-full w-full object-contain", imageClassName)}
      />
    </span>
  );
}
