import { z } from "zod"

export const productMutationSchema = z.object({
  id: z.string().min(1).optional(),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().min(10).max(3000),
  category: z.string().trim().min(2).max(120),
  price: z.number().int().min(0).max(100000000),
  imageUrl: z.string().trim().min(1).max(2000),
  shade: z.string().trim().max(120).optional(),
  features: z.array(z.string().trim().min(1).max(160)).max(20).default([]),
  inventoryCount: z.number().int().min(0).max(1000000).default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isRestocked: z.boolean().default(false),
})

export type ProductMutation = z.infer<typeof productMutationSchema>
