export interface Product {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  image: string
  category: string
  badge?: string
  rating: number
  reviews: number
  details: string[]
  inStock: boolean
}

export const products: Product[] = [
  {
    id: "velvet-matte-lipstick",
    name: "Velvet Matte Lipstick",
    description: "A richly pigmented matte lipstick in a universally flattering berry-rose shade. Creamy formula glides on effortlessly and lasts up to 12 hours without drying.",
    price: 32,
    originalPrice: 42,
    image: "/images/product-1.jpg",
    category: "Lips",
    badge: "Sale",
    rating: 4.8,
    reviews: 1024,
    details: [
      "Long-wear matte finish, up to 12 hours",
      "Enriched with vitamin E and shea butter",
      "Cruelty-free and vegan",
      "Net weight: 3.5g",
    ],
    inStock: true,
  },
  {
    id: "rose-petal-palette",
    name: "Rose Petal Eye Palette",
    description: "A curated 12-shade eyeshadow palette featuring mauves, rose golds, and champagne tones. Buttery soft formula with intense pigment payoff.",
    price: 58,
    image: "/images/product-2.jpg",
    category: "Eyes",
    badge: "Bestseller",
    rating: 4.9,
    reviews: 2187,
    details: [
      "12 curated shades: mattes, shimmers, and metallics",
      "Micro-fine powder for seamless blending",
      "Large mirror included",
      "Paraben-free formula",
    ],
    inStock: true,
  },
  {
    id: "luminous-silk-foundation",
    name: "Luminous Silk Foundation",
    description: "A buildable, lightweight liquid foundation that delivers a natural, luminous finish. Enriched with hyaluronic acid for all-day hydration.",
    price: 48,
    image: "/images/product-3.jpg",
    category: "Face",
    rating: 4.7,
    reviews: 1456,
    details: [
      "Buildable light-to-medium coverage",
      "30 inclusive shades available",
      "SPF 15 protection",
      "Oil-free, non-comedogenic",
    ],
    inStock: true,
  },
  {
    id: "petal-soft-blush",
    name: "Petal Soft Powder Blush",
    description: "A silky powder blush in a warm coral-pink with a subtle luminous finish. Blends effortlessly for a fresh, natural flush of color.",
    price: 34,
    image: "/images/product-4.jpg",
    category: "Face",
    badge: "New",
    rating: 4.6,
    reviews: 678,
    details: [
      "Silky micro-fine powder formula",
      "Buildable color payoff",
      "Rose gold compact with mirror",
      "Infused with rosehip extract",
    ],
    inStock: true,
  },
  {
    id: "lash-drama-mascara",
    name: "Lash Drama Volumizing Mascara",
    description: "A volumizing and lengthening mascara that delivers dramatic, clump-free lashes. The hourglass-shaped brush coats every lash from root to tip.",
    price: 28,
    originalPrice: 36,
    image: "/images/product-5.jpg",
    category: "Eyes",
    badge: "Sale",
    rating: 4.8,
    reviews: 3245,
    details: [
      "Volumizing and lengthening formula",
      "Smudge-proof and flake-proof",
      "Easy to remove with warm water",
      "Ophthalmologist tested",
    ],
    inStock: true,
  },
  {
    id: "glow-ritual-set",
    name: "Glow Ritual Skincare Set",
    description: "A three-piece skincare ritual featuring a vitamin C serum, hydrating moisturizer, and balancing toner. Everything you need for radiant, glass-like skin.",
    price: 89,
    image: "/images/product-6.jpg",
    category: "Skincare",
    rating: 4.9,
    reviews: 892,
    details: [
      "Includes serum, moisturizer, and toner",
      "Vitamin C and niacinamide enriched",
      "Suitable for all skin types",
      "Frosted glass packaging, recyclable",
    ],
    inStock: true,
  },
  {
    id: "crystal-lip-gloss",
    name: "Crystal Shine Lip Gloss",
    description: "A high-shine, non-sticky lip gloss with light-reflecting micro-pearls. Delivers a glossy, plumped look with a hint of rosy shimmer.",
    price: 24,
    image: "/images/product-7.jpg",
    category: "Lips",
    badge: "New",
    rating: 4.5,
    reviews: 567,
    details: [
      "High-shine, non-sticky formula",
      "Light-reflecting micro-pearls",
      "Infused with hyaluronic acid for hydration",
      "Doe-foot applicator for precise application",
    ],
    inStock: true,
  },
  {
    id: "pro-brush-collection",
    name: "Pro Brush Collection",
    description: "A luxurious 8-piece makeup brush set with ultra-soft synthetic bristles and rose gold handles. Includes brushes for face, eyes, and lips.",
    price: 65,
    image: "/images/product-8.jpg",
    category: "Tools",
    rating: 4.7,
    reviews: 1123,
    details: [
      "8 essential brushes for face, eyes, and lips",
      "Ultra-soft vegan synthetic bristles",
      "Rose gold ferrules and pink handles",
      "Includes faux leather travel pouch",
    ],
    inStock: true,
  },
]

export const categories = ["All", "Face", "Eyes", "Lips", "Skincare", "Tools"]

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id)
}

export function getProductsByCategory(category: string): Product[] {
  if (category === "All") return products
  return products.filter((p) => p.category === category)
}
