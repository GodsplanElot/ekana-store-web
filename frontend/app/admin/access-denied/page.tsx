import Link from "next/link"
import { LockKeyhole } from "lucide-react"

type AccessDeniedPageProps = {
  searchParams: Promise<{ reason?: string }>
}

export default async function AccessDeniedPage({ searchParams }: AccessDeniedPageProps) {
  const { reason } = await searchParams
  const isRoleDenied = reason === "role"

  return (
    <main className="grid min-h-screen place-items-center bg-[#f4efe7] px-5 py-12 text-stone-950">
      <section className="w-full max-w-md border border-stone-900/15 bg-white p-8 text-center shadow-sm">
        <LockKeyhole className="mx-auto size-8 text-[#8b5552]" />
        <h1 className="mt-5 font-serif text-3xl">Access restricted</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          {isRoleDenied
            ? "Your staff role does not permit this action. Ask the store owner if your responsibilities have changed."
            : "You are signed in, but this account is not approved for active staff access. Ask the store owner to review your account."}
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {isRoleDenied ? (
            <Link className="inline-flex h-11 items-center justify-center bg-stone-950 px-5 text-sm font-semibold text-white" href="/admin">
              Return to overview
            </Link>
          ) : null}
          <form action="/auth/signout" method="post">
            <button className="inline-flex h-11 w-full items-center justify-center border border-stone-900/20 px-5 text-sm font-semibold text-stone-800" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
