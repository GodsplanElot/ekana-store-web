export type SiteMediaPlacement = "home_hero"

export type SiteMediaItem = {
  id: string
  placement: SiteMediaPlacement
  title: string | null
  altText: string
  caption: string | null
  imageUrl: string
  storagePath: string | null
  sortOrder: number
  isActive: boolean
}
