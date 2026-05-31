export type ProductCategory = "Glosses" | "Lip Liners" | "Lashes" | "Lash Trays"

export interface Product {
  id: string
  slug: string
  name: string
  description: string
  price: number
  image: string
  category: ProductCategory
  badge?: string
  shade?: string
  rating: number
  reviews: number
  details: string[]
  inStock: boolean
  inventoryCount: number
  isFeatured: boolean
  isRestocked: boolean
  active: boolean
}

export const products: Product[] = [
  {
    id: "red-theory",
    slug: "red-theory",
    name: "Red Theory",
    description: "A rich, confident red gloss with a high-shine finish and smooth non-sticky wear.",
    price: 4800,
    image: "/images/product-1.jpg",
    category: "Glosses",
    badge: "Restocked",
    shade: "Rich red",
    rating: 4.9,
    reviews: 42,
    details: ["Non-sticky formula", "Smooth application", "High shine finish", "Patch test recommended"],
    inStock: true,
    inventoryCount: 24,
    isFeatured: true,
    isRestocked: true,
    active: true,
  },
  {
    id: "luminous",
    slug: "luminous",
    name: "Luminous",
    description: "A radiant clear gloss with a soft shimmer for effortless everyday shine.",
    price: 4800,
    image: "/images/product-7.jpg",
    category: "Glosses",
    badge: "New",
    shade: "Clear shimmer",
    rating: 4.8,
    reviews: 37,
    details: ["Non-sticky formula", "Smooth application", "High shine finish", "Patch test recommended"],
    inStock: true,
    inventoryCount: 31,
    isFeatured: true,
    isRestocked: false,
    active: true,
  },
  {
    id: "chestnut",
    slug: "chestnut",
    name: "Chestnut",
    description: "A bold brown gloss with depth, warmth, and a polished reflective finish.",
    price: 4800,
    image: "/images/product-3.jpg",
    category: "Glosses",
    shade: "Bold brown",
    rating: 4.8,
    reviews: 29,
    details: ["Non-sticky formula", "Smooth application", "High shine finish", "Patch test recommended"],
    inStock: true,
    inventoryCount: 18,
    isFeatured: false,
    isRestocked: false,
    active: true,
  },
  {
    id: "rosette",
    slug: "rosette",
    name: "Rosette",
    description: "A soft romantic pink gloss made for a refined, feminine finish.",
    price: 4800,
    image: "/images/product-4.jpg",
    category: "Glosses",
    badge: "Bestseller",
    shade: "Soft pink",
    rating: 4.9,
    reviews: 58,
    details: ["Non-sticky formula", "Smooth application", "High shine finish", "Patch test recommended"],
    inStock: true,
    inventoryCount: 26,
    isFeatured: true,
    isRestocked: false,
    active: true,
  },
  {
    id: "tea",
    slug: "tea",
    name: "Tea",
    description: "A refined true nude gloss for clean, understated polish.",
    price: 4800,
    image: "/images/hero.jpg",
    category: "Glosses",
    shade: "True nude",
    rating: 4.7,
    reviews: 24,
    details: ["Non-sticky formula", "Smooth application", "High shine finish", "Patch test recommended"],
    inStock: true,
    inventoryCount: 21,
    isFeatured: false,
    isRestocked: true,
    active: true,
  },
  {
    id: "obsidian",
    slug: "obsidian",
    name: "Obsidian",
    description: "A deep black liner for dramatic definition and sculpted lip looks.",
    price: 3500,
    image: "/images/product-5.jpg",
    category: "Lip Liners",
    shade: "Deep black",
    rating: 4.7,
    reviews: 18,
    details: ["Creamy definition", "Pairs with glosses", "Precise shaping", "Patch test recommended"],
    inStock: true,
    inventoryCount: 17,
    isFeatured: false,
    isRestocked: false,
    active: true,
  },
  {
    id: "cocoa-contour",
    slug: "cocoa-contour",
    name: "Cocoa Contour",
    description: "A rich brown sculpting liner for depth, balance, and polished definition.",
    price: 3500,
    image: "/images/product-2.jpg",
    category: "Lip Liners",
    badge: "Restocked",
    shade: "Rich brown",
    rating: 4.8,
    reviews: 33,
    details: ["Creamy definition", "Pairs with glosses", "Precise shaping", "Patch test recommended"],
    inStock: true,
    inventoryCount: 20,
    isFeatured: true,
    isRestocked: true,
    active: true,
  },
  {
    id: "heartline",
    slug: "heartline",
    name: "Heartline",
    description: "A soft rosy liner for natural shaping and comfortable everyday definition.",
    price: 3500,
    image: "/images/product-1.jpg",
    category: "Lip Liners",
    shade: "Soft rose",
    rating: 4.8,
    reviews: 21,
    details: ["Creamy definition", "Pairs with glosses", "Precise shaping", "Patch test recommended"],
    inStock: true,
    inventoryCount: 22,
    isFeatured: false,
    isRestocked: false,
    active: true,
  },
  {
    id: "mink-lash-pair",
    slug: "mink-lash-pair",
    name: "Mink Lash Pair",
    description: "Lightweight reusable mink lashes designed for fullness, softness, and easy wear.",
    price: 3000,
    image: "/images/product-8.jpg",
    category: "Lashes",
    badge: "New",
    rating: 4.9,
    reviews: 46,
    details: ["Lightweight feel", "Reusable with proper care", "Soft full finish", "Store in tray after use"],
    inStock: true,
    inventoryCount: 30,
    isFeatured: true,
    isRestocked: false,
    active: true,
  },
  {
    id: "mink-lash-tray",
    slug: "mink-lash-tray",
    name: "Mink Lash Tray",
    description: "A reusable lash tray option for fuller lash styling and stock purchase.",
    price: 14500,
    image: "/images/product-6.jpg",
    category: "Lash Trays",
    rating: 4.8,
    reviews: 12,
    details: ["Tray format", "Reusable lash styling", "Ideal for stock purchase", "Store in a clean dry place"],
    inStock: true,
    inventoryCount: 9,
    isFeatured: false,
    isRestocked: true,
    active: true,
  },
]

export const categories = ["All", "Glosses", "Lip Liners", "Lashes", "Lash Trays"] as const

export function getProduct(idOrSlug: string): Product | undefined {
  return products.find((p) => p.id === idOrSlug || p.slug === idOrSlug)
}

export function getProductsByCategory(category: string): Product[] {
  if (category === "All") return products
  return products.filter((p) => p.category === category)
}

export function getFeaturedProducts(): Product[] {
  return products.filter((p) => p.isFeatured && p.active)
}

export function getRestockedProducts(): Product[] {
  return products.filter((p) => p.isRestocked && p.active)
}
