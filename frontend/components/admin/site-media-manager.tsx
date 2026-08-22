"use client"

import Image from "next/image"
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, ImagePlus, LoaderCircle, Save, Trash2 } from "lucide-react"

import type { SiteMediaItem } from "@/lib/site-media"

type SiteMediaManagerProps = {
  initialItems: SiteMediaItem[]
}

type Draft = {
  title: string
  altText: string
  caption: string
  imageUrl: string
  storagePath: string
  isActive: boolean
}

const emptyDraft: Draft = {
  title: "",
  altText: "",
  caption: "",
  imageUrl: "",
  storagePath: "",
  isActive: true,
}

const inputClass = "h-11 w-full border border-stone-900/20 bg-white px-3 text-sm outline-none transition focus:border-stone-950 focus:ring-2 focus:ring-stone-950/10"
const labelClass = "mb-2 block text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-600"

export function SiteMediaManager({ initialItems }: SiteMediaManagerProps) {
  const router = useRouter()
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [error, setError] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const sortedItems = useMemo(
    () => [...initialItems].sort((a, b) => a.sortOrder - b.sortOrder),
    [initialItems],
  )

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setError("")
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.set("file", file)
      const response = await fetch("/api/admin/uploads/site-media", {
        method: "POST",
        body: formData,
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? "Image upload failed")
      updateDraft("imageUrl", result.url)
      updateDraft("storagePath", result.path)
      if (!draft.altText) updateDraft("altText", file.name.replace(/\.[^.]+$/u, "").replace(/[-_]+/g, " "))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed")
    } finally {
      setIsUploading(false)
      event.target.value = ""
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSaving(true)

    try {
      const response = await fetch("/api/admin/site-media", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          placement: "home_hero",
          title: draft.title || null,
          altText: draft.altText,
          caption: draft.caption || null,
          imageUrl: draft.imageUrl,
          storagePath: draft.storagePath || null,
          isActive: draft.isActive,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? "Slide could not be saved")
      setDraft(emptyDraft)
      router.refresh()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Slide could not be saved")
    } finally {
      setIsSaving(false)
    }
  }

  async function patchItem(id: string, payload: Record<string, unknown>) {
    setError("")
    setBusyId(id)
    try {
      const response = await fetch(`/api/admin/site-media/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? "Slide could not be updated")
      router.refresh()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Slide could not be updated")
    } finally {
      setBusyId(null)
    }
  }

  async function deleteItem(id: string) {
    if (!window.confirm("Remove this intro slide?")) return

    setError("")
    setBusyId(id)
    try {
      const response = await fetch(`/api/admin/site-media/${id}`, { method: "DELETE" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? "Slide could not be removed")
      router.refresh()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Slide could not be removed")
    } finally {
      setBusyId(null)
    }
  }

  async function moveItem(index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    const current = sortedItems[index]
    const target = sortedItems[targetIndex]
    if (!current || !target) return

    setError("")
    setBusyId(current.id)
    try {
      const [currentResponse, targetResponse] = await Promise.all([
        fetch(`/api/admin/site-media/${current.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sortOrder: target.sortOrder }),
        }),
        fetch(`/api/admin/site-media/${target.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sortOrder: current.sortOrder }),
        }),
      ])
      if (!currentResponse.ok || !targetResponse.ok) throw new Error("Slide order could not be updated")
      router.refresh()
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : "Slide order could not be updated")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="border border-stone-900/15 bg-[#fffdf9]">
        <div className="border-b border-stone-900/10 px-5 py-4 sm:px-6">
          <h2 className="font-serif text-2xl">Intro carousel</h2>
          <p className="mt-1 text-sm text-stone-600">
            Active images display on the homepage intro, rotate automatically, and can be swiped.
          </p>
        </div>

        <div className="divide-y divide-stone-900/10">
          {sortedItems.length ? sortedItems.map((item, index) => (
            <article className="grid gap-5 p-5 md:grid-cols-[180px_1fr_auto] md:items-center sm:p-6" key={item.id}>
              <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                <Image alt={item.altText} className="object-cover" fill sizes="180px" src={item.imageUrl} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-serif text-xl">{item.title || "Untitled slide"}</h3>
                  <span className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${item.isActive ? "bg-emerald-50 text-emerald-800" : "bg-stone-100 text-stone-500"}`}>
                    {item.isActive ? "Active" : "Hidden"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-600">{item.caption || "No caption set."}</p>
                <p className="mt-2 truncate text-xs text-stone-400">{item.altText}</p>
              </div>
              <div className="flex flex-wrap justify-end gap-2 md:w-28">
                <button aria-label="Move slide up" className="grid size-9 place-items-center border border-stone-900/15 text-stone-600 disabled:opacity-30" disabled={index === 0 || busyId === item.id} onClick={() => moveItem(index, -1)} type="button">
                  <ArrowUp className="size-4" />
                </button>
                <button aria-label="Move slide down" className="grid size-9 place-items-center border border-stone-900/15 text-stone-600 disabled:opacity-30" disabled={index === sortedItems.length - 1 || busyId === item.id} onClick={() => moveItem(index, 1)} type="button">
                  <ArrowDown className="size-4" />
                </button>
                <button className="h-9 border border-stone-900/15 px-3 text-xs font-medium text-stone-700 disabled:opacity-30" disabled={busyId === item.id} onClick={() => patchItem(item.id, { isActive: !item.isActive })} type="button">
                  {item.isActive ? "Hide" : "Show"}
                </button>
                <button aria-label="Delete slide" className="grid size-9 place-items-center border border-red-900/20 text-red-700 disabled:opacity-30" disabled={busyId === item.id} onClick={() => deleteItem(item.id)} type="button">
                  {busyId === item.id ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </button>
              </div>
            </article>
          )) : (
            <div className="p-8 text-center">
              <ImagePlus className="mx-auto size-8 text-stone-400" />
              <p className="mt-3 font-serif text-2xl">No carousel images yet</p>
              <p className="mt-2 text-sm text-stone-500">The storefront uses the built-in intro image until the first active slide is uploaded.</p>
            </div>
          )}
        </div>
      </section>

      <form className="h-fit border border-stone-900/15 bg-[#fffdf9] p-5" onSubmit={handleCreate}>
        <h2 className="font-serif text-xl">Add intro image</h2>
        <div className="mt-4 aspect-[4/3] overflow-hidden border border-dashed border-stone-900/25 bg-stone-100">
          {draft.imageUrl ? (
            <div className="relative h-full">
              <Image alt={draft.altText || "Intro image preview"} className="object-cover" fill sizes="360px" src={draft.imageUrl} />
            </div>
          ) : (
            <div className="grid h-full place-items-center text-center text-stone-500">
              <div>
                <ImagePlus className="mx-auto size-7" />
                <p className="mt-2 text-xs">No image uploaded</p>
              </div>
            </div>
          )}
        </div>

        <label className="mt-4 flex h-11 cursor-pointer items-center justify-center gap-2 border border-stone-900/20 bg-white text-sm font-medium transition hover:border-stone-950" htmlFor="site-media-image">
          {isUploading ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          {isUploading ? "Uploading..." : "Choose image"}
        </label>
        <input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={isUploading} id="site-media-image" onChange={handleImage} type="file" />

        <div className="mt-5 space-y-4">
          <div><label className={labelClass} htmlFor="media-title">Title</label><input className={inputClass} id="media-title" maxLength={120} onChange={(event) => updateDraft("title", event.target.value)} value={draft.title} /></div>
          <div><label className={labelClass} htmlFor="media-alt">Alt text</label><input className={inputClass} id="media-alt" maxLength={180} minLength={3} onChange={(event) => updateDraft("altText", event.target.value)} required value={draft.altText} /></div>
          <div><label className={labelClass} htmlFor="media-caption">Caption</label><textarea className="min-h-24 w-full border border-stone-900/20 bg-white p-3 text-sm leading-6 outline-none transition focus:border-stone-950 focus:ring-2 focus:ring-stone-950/10" id="media-caption" maxLength={220} onChange={(event) => updateDraft("caption", event.target.value)} value={draft.caption} /></div>
          <label className="flex items-center justify-between gap-4 text-sm"><span>Active on storefront</span><input checked={draft.isActive} className="size-4 accent-stone-950" onChange={(event) => updateDraft("isActive", event.target.checked)} type="checkbox" /></label>
        </div>

        {error ? <p className="mt-4 border-l-2 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p> : null}
        <button className="mt-5 flex h-12 w-full items-center justify-center gap-2 bg-stone-950 px-5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60" disabled={isSaving || isUploading || !draft.imageUrl || draft.altText.length < 3} type="submit">
          {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
          {isSaving ? "Saving..." : "Add to carousel"}
        </button>
      </form>
    </div>
  )
}
