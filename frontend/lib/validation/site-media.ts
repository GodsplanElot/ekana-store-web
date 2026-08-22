import { z } from "zod"

export const siteMediaPlacementSchema = z.literal("home_hero")

export const siteMediaMutationSchema = z.object({
  placement: siteMediaPlacementSchema.default("home_hero"),
  title: z.string().trim().max(120).optional().nullable(),
  altText: z.string().trim().min(3).max(180),
  caption: z.string().trim().max(220).optional().nullable(),
  imageUrl: z.string().url().max(2_048),
  storagePath: z.string().trim().max(500).optional().nullable(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  isActive: z.boolean().default(true),
})

export const siteMediaUpdateSchema = siteMediaMutationSchema.partial().extend({
  placement: siteMediaPlacementSchema.optional(),
  isActive: z.boolean().optional(),
})

export type SiteMediaMutation = z.infer<typeof siteMediaMutationSchema>
