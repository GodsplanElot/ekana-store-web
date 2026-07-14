import Link from "next/link"
import { Pencil, Plus, Search } from "lucide-react"
import { DeactivateProductButton } from "@/components/admin/deactivate-product-button"
import { formatNaira } from "@/lib/money"
import { requireStaff, staffHasRole } from "@/lib/server/require-staff"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type ProductRow = {
  id: string
  name: string
  slug: string
  category: string
  price: number
  image_url: string
  inventory_count: number
  is_active: boolean
  is_featured: boolean
}

type ProductsPageProps = {
  searchParams: Promise<{ q?: string; category?: string; status?: string }>
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const staff = await requireStaff()
  const canEdit = staffHasRole(staff, ["owner", "admin", "inventory"])
  const filters = await searchParams
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from("products").select("id,name,slug,category,price,image_url,inventory_count,is_active,is_featured").order("created_at", { ascending: false })
  const query = filters.q?.trim().toLowerCase() ?? ""
  const products = ((data ?? []) as ProductRow[]).filter((product) => {
    const matchesQuery = !query || product.name.toLowerCase().includes(query) || product.slug.toLowerCase().includes(query)
    const matchesCategory = !filters.category || filters.category === "all" || product.category === filters.category
    const matchesStatus = !filters.status || filters.status === "all" || (filters.status === "active" ? product.is_active : !product.is_active)
    return matchesQuery && matchesCategory && matchesStatus
  })

  return (
    <section className="px-4 py-8 sm:px-7 lg:px-10 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b5552]">Catalogue</p><h1 className="mt-3 font-serif text-4xl">Products</h1><p className="mt-2 text-sm text-stone-600">{products.length} products in this view</p></div>
          {canEdit ? <Link className="inline-flex h-11 items-center justify-center gap-2 bg-stone-950 px-5 text-sm font-semibold text-white" href="/admin/products/new"><Plus className="size-4" />Add product</Link> : null}
        </div>

        <form className="mt-8 grid gap-3 border border-stone-900/15 bg-[#fffdf9] p-4 md:grid-cols-[1fr_180px_150px_auto]" method="get">
          <label className="relative"><span className="sr-only">Search products</span><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-stone-400" /><input className="h-11 w-full border border-stone-900/15 bg-white pl-10 pr-3 text-sm outline-none focus:border-stone-950" defaultValue={filters.q} name="q" placeholder="Search name or slug" /></label>
          <select aria-label="Category" className="h-11 border border-stone-900/15 bg-white px-3 text-sm" defaultValue={filters.category ?? "all"} name="category"><option value="all">All categories</option><option>Glosses</option><option>Lip Liners</option><option>Lashes</option><option>Lash Trays</option></select>
          <select aria-label="Status" className="h-11 border border-stone-900/15 bg-white px-3 text-sm" defaultValue={filters.status ?? "all"} name="status"><option value="all">Any status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
          <button className="h-11 border border-stone-950 bg-stone-950 px-5 text-sm font-semibold text-white" type="submit">Filter</button>
        </form>

        {error ? <div className="mt-6 border-l-2 border-red-700 bg-red-50 p-4 text-sm text-red-800">Products could not be loaded. Check the Supabase configuration.</div> : null}

        <div className="mt-5 overflow-hidden border border-stone-900/15 bg-[#fffdf9]">
          <div className="hidden grid-cols-[minmax(260px,1fr)_140px_120px_100px_110px] border-b border-stone-900/10 bg-stone-100/70 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500 md:grid"><span>Product</span><span>Category</span><span>Price</span><span>Stock</span><span className="text-right">Actions</span></div>
          {products.length ? products.map((product) => (
            <article className="grid gap-4 border-b border-stone-900/10 p-4 last:border-0 md:grid-cols-[minmax(260px,1fr)_140px_120px_100px_110px] md:items-center md:px-5" key={product.id}>
              <div className="flex min-w-0 items-center gap-4"><div className="size-14 shrink-0 bg-stone-100 bg-cover bg-center" style={{ backgroundImage: `url("${product.image_url.replaceAll('"', '%22')}")` }} /><div className="min-w-0"><h2 className="truncate text-sm font-semibold">{product.name}</h2><div className="mt-1 flex items-center gap-2"><span className={`size-1.5 rounded-full ${product.is_active ? "bg-emerald-600" : "bg-stone-400"}`} /><span className="text-xs text-stone-500">{product.is_active ? "Active" : "Inactive"}{product.is_featured ? " - Featured" : ""}</span></div></div></div>
              <p className="text-sm text-stone-600"><span className="mr-2 text-xs text-stone-400 md:hidden">Category</span>{product.category}</p>
              <p className="text-sm font-medium">{formatNaira(product.price)}</p>
              <p className={`text-sm ${product.inventory_count <= 5 ? "font-semibold text-amber-800" : "text-stone-600"}`}>{product.inventory_count} units</p>
              <div className="flex justify-end gap-2">{canEdit ? <><Link aria-label={`Edit ${product.name}`} className="grid size-9 place-items-center border border-stone-900/15 text-stone-600 transition hover:border-stone-950 hover:text-stone-950" href={`/admin/products/${product.id}/edit`}><Pencil className="size-4" /></Link>{product.is_active ? <DeactivateProductButton id={product.id} name={product.name} /> : null}</> : <span className="text-xs text-stone-400">Read only</span>}</div>
            </article>
          )) : <div className="px-5 py-16 text-center"><p className="font-serif text-2xl">No products found</p><p className="mt-2 text-sm text-stone-500">Adjust the filters or create a new product.</p></div>}
        </div>
      </div>
    </section>
  )
}
