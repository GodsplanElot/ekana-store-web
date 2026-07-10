import { BrandLogo } from "@/components/brand-logo";

export function BrandPromise() {
  return (
    <section className="relative overflow-hidden border-y border-foreground/10 bg-background py-16 lg:py-24">
      <BrandLogo
        variant="watermark"
        sizes="520px"
        className="absolute left-1/2 top-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 opacity-[0.055]"
      />
      <div className="relative mx-auto max-w-4xl px-4 text-center lg:px-8">
        <BrandLogo variant="mark" sizes="58px" className="mx-auto mb-6 size-16" />
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
          The Ekana Promise
        </p>
        <h2 className="font-serif text-4xl leading-tight text-foreground md:text-6xl">
          Beauty is more than appearance.
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
          Our products are designed to feel luxurious, effortless, and authentic, with refined textures, thoughtful shades, and timeless finishes made for confident everyday wear.
        </p>
      </div>
    </section>
  );
}
