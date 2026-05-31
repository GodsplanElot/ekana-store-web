import { NextResponse } from "next/server"
import { z } from "zod"
import { createSupabaseAdmin } from "@/lib/server/supabase-admin"

const newsletterSchema = z.object({
  email: z.string().email(),
  source: z.string().optional().default("website"),
})

export async function POST(request: Request) {
  const parsed = newsletterSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  }

  const supabase = createSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ ok: true, configured: false })
  }

  const { error } = await supabase.from("newsletter_subscribers").upsert(
    {
      email: parsed.data.email.toLowerCase(),
      source: parsed.data.source,
    },
    { onConflict: "email" }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, configured: true })
}
