import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ProductForm } from "@/components/admin/product-form"
import { requireStaff } from "@/lib/server/require-staff"

export default async function NewProductPage() {
  await requireStaff(["owner", "admin", "inventory"])
  return <section className="px-4 py-8 sm:px-7 lg:px-10 lg:py-12"><div className="mx-auto max-w-6xl"><Link className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-950" href="/admin/products"><ArrowLeft className="size-4" />Back to products</Link><div className="mb-8 mt-7"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b5552]">Catalogue</p><h1 className="mt-3 font-serif text-4xl">Add product</h1></div><ProductForm /></div></section>
}
