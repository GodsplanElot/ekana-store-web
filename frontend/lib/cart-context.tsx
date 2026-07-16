"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import type { Product } from "@/lib/catalog"

export interface CartItem {
  product: Product
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
  isCartOpen: boolean
  setIsCartOpen: (open: boolean) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)
const CART_STORAGE_KEY = "ekana-cart-v2"
const CART_UPDATED_EVENT = "ekana-cart-updated"

interface StoredCartItem {
  productId: string
  quantity: number
  product: Product
}

function getCartSnapshot() {
  return window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]"
}

function parseStoredItems(snapshot: string): CartItem[] {
  try {
    const storedItems = JSON.parse(snapshot) as StoredCartItem[]
    if (!Array.isArray(storedItems)) return []

    return storedItems.flatMap((item) => {
      const product = item.product
      if (!product || !Number.isFinite(item.quantity) || item.quantity <= 0) {
        return []
      }

      return [{ product, quantity: Math.floor(item.quantity) }]
    })
  } catch {
    return []
  }
}

function writeStoredItems(items: CartItem[]) {
  const storedItems = items.map((item) => ({
    productId: item.product.id,
    quantity: item.quantity,
    product: item.product,
  }))

  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(storedItems))
  window.dispatchEvent(new Event(CART_UPDATED_EVENT))
}

function subscribeToCartStore(callback: () => void) {
  window.addEventListener(CART_UPDATED_EVENT, callback)
  window.addEventListener("storage", callback)

  return () => {
    window.removeEventListener(CART_UPDATED_EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const cartSnapshot = useSyncExternalStore(
    subscribeToCartStore,
    getCartSnapshot,
    () => "[]"
  )
  const items = useMemo(() => parseStoredItems(cartSnapshot), [cartSnapshot])
  const [isCartOpen, setIsCartOpen] = useState(false)

  const addItem = useCallback((product: Product, quantity = 1) => {
    if (!product.inStock || !Number.isFinite(quantity) || quantity <= 0) return

    const existing = items.find((item) => item.product.id === product.id)
    const nextQuantity = Math.min(
      product.inventoryCount,
      (existing?.quantity ?? 0) + Math.floor(quantity)
    )
    const nextItems = existing
      ? items.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: nextQuantity }
            : item
        )
      : [...items, { product, quantity: nextQuantity }]

    writeStoredItems(nextItems)
    setIsCartOpen(true)
  }, [items])

  const removeItem = useCallback((productId: string) => {
    writeStoredItems(items.filter((item) => item.product.id !== productId))
  }, [items])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      writeStoredItems(items.filter((item) => item.product.id !== productId))
      return
    }

    writeStoredItems(
      items.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              quantity: Math.min(
                Math.floor(quantity),
                item.product.inventoryCount
              ),
            }
          : item
      )
    )
  }, [items])

  const clearCart = useCallback(() => {
    writeStoredItems([])
  }, [])

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  )

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
