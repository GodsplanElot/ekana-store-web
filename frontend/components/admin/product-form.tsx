"use client"

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ImagePlus, LoaderCircle, Save } from "lucide-react"
import type { ProductMutation } from "@/lib/validation/product"

const categories = ["Glosses", "Lip Liners", "Lashes", "Lash Trays"] as const

type ProductFormProps = {
  initialProduct?: ProductMutation & { id: string }
}

const emptyProduct: ProductMutation = {
  name: "",
  slug: "",
  description: "",
  category: "Glosses",
  price: 0,
  imageUrl: "",
  shade: "",
  features: [],
  inventoryCount: 0,
  isActive: true,
  isFeatured: false,
  isRestocked: false,
}

function makeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export function ProductForm({ initialProduct }: ProductFormProps) {
  const router = useRouter()
  const [product, setProduct] = useState<ProductMutation>(initialProduct ?? emptyProduct)
  const [featuresText, setFeaturesText] = useState((initialProduct?.features ?? []).join("\n"))
  const [slugEdited, setSlugEdited] = useState(Boolean(initialProduct))
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const isEditing = Boolean(initialProduct)
  const previewStyle = useMemo(() => product.imageUrl ? { backgroundImage: `url("${product.imageUrl.replaceAll('"', '%22')}")` } : undefined, [product.imageUrl])

  function update<K extends keyof ProductMutation>(key: K, value: ProductMutation[K]) {
    setProduct((current) => ({ ...current, [key]: value }))
  }

  function handleNameChange(value: string) {
    setProduct((current) => ({ ...current, name: value, slug: slugEdited ? current.slug : makeSlug(value) }))
  }

  async function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setError("")
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.set("file", file)
      const response = await fetch("/api/admin/uploads/product-image", { method: "POST", body: formData })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? "Image upload failed")
      update("imageUrl", result.url)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed")
    } finally {
      setIsUploading(false)
      event.target.value = ""
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSaving(true)

    const payload: ProductMutation = {
      ...product,
      features: featuresText.split("\n").map((feature) => feature.trim()).filter(Boolean),
    }

    try {
      const response = await fetch(isEditing ? `/api/admin/products/${initialProduct.id}` : "/api/admin/products", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? "Product could not be saved")
      router.push("/admin/products")
      router.refresh()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Product could not be saved")
    } finally {
      setIsSaving(false)
    }
  }

  const inputClass = "h-11 w-full border border-stone-900/20 bg-white px-3 text-sm outline-none transition focus:border-stone-950 focus:ring-2 focus:ring-stone-950/10"
  const labelClass = "mb-2 block text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-600"

  return (
    <form className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_340px]" onSubmit={handleSubmit}>
      <div className="space-y-7">
        <section className="border border-stone-900/15 bg-[#fffdf9] p-5 sm:p-7">
          <h2 className="font-serif text-2xl">Product details</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div><label className={labelClass} htmlFor="name">Name</label><input className={inputClass} id="name" onChange={(event) => handleNameChange(event.target.value)} required value={product.name} /></div>
            <div><label className={labelClass} htmlFor="slug">URL slug</label><input className={inputClass} id="slug" onChange={(event) => { setSlugEdited(true); update("slug", makeSlug(event.target.value)) }} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required value={product.slug} /></div>
            <div><label className={labelClass} htmlFor="category">Category</label><select className={inputClass} id="category" onChange={(event) => update("category", event.target.value as ProductMutation["category"])} value={product.category}>{categories.map((category) => <option key={category}>{category}</option>)}</select></div>
            <div><label className={labelClass} htmlFor="shade">Shade</label><input className={inputClass} id="shade" onChange={(event) => update("shade", event.target.value)} value={product.shade ?? ""} /></div>
            <div><label className={labelClass} htmlFor="price">Price (NGN)</label><input className={inputClass} id="price" min="0" onChange={(event) => update("price", Number(event.target.value))} required step="1" type="number" value={product.price} /></div>
            <div><label className={labelClass} htmlFor="inventory">Inventory</label><input className={inputClass} id="inventory" min="0" onChange={(event) => update("inventoryCount", Number(event.target.value))} required step="1" type="number" value={product.inventoryCount} /></div>
            <div className="sm:col-span-2"><label className={labelClass} htmlFor="description">Description</label><textarea className="min-h-32 w-full border border-stone-900/20 bg-white p-3 text-sm leading-6 outline-none transition focus:border-stone-950 focus:ring-2 focus:ring-stone-950/10" id="description" minLength={10} onChange={(event) => update("description", event.target.value)} required value={product.description} /></div>
            <div className="sm:col-span-2"><label className={labelClass} htmlFor="features">Features <span className="normal-case tracking-normal text-stone-400">- one per line</span></label><textarea className="min-h-32 w-full border border-stone-900/20 bg-white p-3 text-sm leading-6 outline-none transition focus:border-stone-950 focus:ring-2 focus:ring-stone-950/10" id="features" onChange={(event) => setFeaturesText(event.target.value)} value={featuresText} /></div>
          </div>
        </section>
      </div>

      <aside className="space-y-5">
        <section className="border border-stone-900/15 bg-[#fffdf9] p-5">
          <h2 className="font-serif text-xl">Product image</h2>
          <div className="mt-4 aspect-square border border-dashed border-stone-900/25 bg-stone-100 bg-cover bg-center" style={previewStyle}>
            {!product.imageUrl ? <div className="grid h-full place-items-center text-center text-stone-500"><div><ImagePlus className="mx-auto size-7" /><p className="mt-2 text-xs">No image uploaded</p></div></div> : null}
          </div>
          <label className="mt-4 flex h-11 cursor-pointer items-center justify-center gap-2 border border-stone-900/20 bg-white text-sm font-medium transition hover:border-stone-950" htmlFor="image">
            {isUploading ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            {isUploading ? "Uploading..." : "Choose image"}
          </label>
          <input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={isUploading} id="image" onChange={handleImage} type="file" />
          <p className="mt-3 text-xs leading-5 text-stone-500">JPEG, PNG or WebP. Maximum 5 MB. Square images work best.</p>
        </section>

        <section className="border border-stone-900/15 bg-[#fffdf9] p-5">
          <h2 className="font-serif text-xl">Visibility</h2>
          <div className="mt-4 space-y-4">
            {([ ["isActive", "Active on storefront"], ["isFeatured", "Featured product"], ["isRestocked", "Mark as restocked"] ] as const).map(([key, label]) => <label className="flex items-center justify-between gap-4 text-sm" key={key}><span>{label}</span><input checked={product[key]} className="size-4 accent-stone-950" onChange={(event) => update(key, event.target.checked)} type="checkbox" /></label>)}
          </div>
        </section>

        {error ? <p aria-live="polite" className="border-l-2 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p> : null}
        <button className="flex h-12 w-full items-center justify-center gap-2 bg-stone-950 px-5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60" disabled={isSaving || isUploading || !product.imageUrl} type="submit">
          {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
          {isSaving ? "Saving..." : isEditing ? "Save changes" : "Create product"}
        </button>
      </aside>
    </form>
  )
}
