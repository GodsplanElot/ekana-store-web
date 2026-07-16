import type { ReactNode } from "react";

import { BrandLogo } from "@/components/brand-logo";

interface InfoPageProps {
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
}

export function InfoPage({ eyebrow, title, intro, children }: InfoPageProps) {
  return (
    <section className="relative overflow-hidden py-12 lg:py-20">
      <BrandLogo
        variant="watermark"
        sizes="420px"
        className="absolute -right-24 top-8 size-[420px] opacity-[0.045]"
      />
      <div className="relative mx-auto max-w-3xl px-4 lg:px-8">
        <BrandLogo variant="seal" sizes="34px" markClassName="size-9 p-1" className="mb-6 w-fit bg-background/70" />
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
          {eyebrow}
        </p>
        <h1 className="font-serif text-4xl leading-tight text-foreground md:text-6xl">
          {title}
        </h1>
        {intro && (
          <p className="mt-5 text-base leading-8 text-muted-foreground">
            {intro}
          </p>
        )}
        <div className="mt-10 space-y-8 border-t border-foreground/10 pt-10 text-sm leading-7 text-muted-foreground">
          {children}
        </div>
      </div>
    </section>
  );
}

export function InfoBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 font-serif text-2xl text-foreground">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
