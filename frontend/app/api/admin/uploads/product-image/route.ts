import { NextResponse } from "next/server"
import { getCurrentStaff, staffHasRole } from "@/lib/server/require-staff"
import { createSupabaseAdmin } from "@/lib/server/supabase-admin"

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
])
const maxFileSize = 5 * 1024 * 1024

export async function POST(request: Request) {
  const staff = await getCurrentStaff()
  if (!staff || !staffHasRole(staff, ["owner", "admin", "inventory"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Select an image to upload" }, { status: 400 })
  }

  const extension = allowedTypes.get(file.type)
  if (!extension) {
    return NextResponse.json({ error: "Use a JPEG, PNG or WebP image" }, { status: 400 })
  }

  if (file.size > maxFileSize) {
    return NextResponse.json({ error: "Image size must not exceed 5 MB" }, { status: 400 })
  }

  const supabase = createSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 })

  const path = `${staff.userId}/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from("product-images").upload(path, await file.arrayBuffer(), {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = supabase.storage.from("product-images").getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl, path }, { status: 201 })
}
