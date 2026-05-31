import type { ReactNode } from "react"

interface InfoPageProps {
  eyebrow: string
  title: string
  intro?: string
  children: ReactNode
}

export function InfoPage({ eyebrow, title, intro, children }: InfoPageProps) {
  return (
    <section className="py-10 lg:py-16">
      <div className="mx-auto max-w-3xl px-4 lg:px-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {eyebrow}
        </p>
        <h1 className="font-serif text-3xl leading-tight text-foreground md:text-5xl">
          {title}
        </h1>
        {intro && (
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {intro}
          </p>
        )}
        <div className="mt-10 space-y-8 text-sm leading-7 text-muted-foreground">
          {children}
        </div>
      </div>
    </section>
  )
}

export function InfoBlock({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section>
      <h2 className="mb-3 font-serif text-2xl text-foreground">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
