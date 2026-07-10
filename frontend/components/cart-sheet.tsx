"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/lib/cart-context";
import { formatNaira } from "@/lib/money";

export function CartSheet() {
  const {
    items,
    removeItem,
    updateQuantity,
    totalPrice,
    isCartOpen,
    setIsCartOpen,
  } = useCart();

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="relative flex flex-col overflow-hidden bg-background">
        <BrandLogo
          variant="watermark"
          sizes="260px"
          className="absolute -right-20 top-20 size-[260px] opacity-[0.04]"
        />
        <SheetHeader className="relative">
          <div className="mb-3 flex items-center gap-3">
            <BrandLogo variant="mark" sizes="38px" className="size-11" />
            <div>
              <SheetTitle className="font-serif text-2xl">Your Cart</SheetTitle>
              <SheetDescription>
                {items.length === 0
                  ? "Your cart is empty"
                  : `${items.length} item${items.length > 1 ? "s" : ""} in your cart`}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="relative flex flex-1 flex-col items-center justify-center gap-5 text-center">
            <BrandLogo variant="seal" sizes="42px" markClassName="size-12" />
            <p className="max-w-xs text-sm leading-6 text-muted-foreground">
              Your beauty bag is empty. Start with a gloss, liner, or lash set.
            </p>
            <Button
              variant="outline"
              onClick={() => setIsCartOpen(false)}
              asChild
            >
              <Link href="/shop">Browse Products</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="relative -mx-6 flex-1 overflow-y-auto px-6">
              <div className="flex flex-col gap-4">
                {items.map((item) => (
                  <div key={item.product.id} className="flex gap-4 rounded-md border border-foreground/10 bg-background/65 p-3">
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                      <Image
                        src={item.product.image}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-semibold leading-tight text-foreground">
                          {item.product.name}
                        </h3>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {formatNaira(item.product.price)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              updateQuantity(
                                item.product.id,
                                item.quantity - 1,
                              )
                            }
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-medium text-foreground">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              updateQuantity(
                                item.product.id,
                                item.quantity + 1,
                              )
                            }
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(item.product.id)}
                          aria-label={`Remove ${item.product.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative pt-4">
              <Separator className="mb-4" />
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Subtotal</span>
                <span className="text-lg font-semibold text-foreground">
                  {formatNaira(totalPrice)}
                </span>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                Shipping and taxes calculated at checkout.
              </p>
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                size="lg"
                asChild
                onClick={() => setIsCartOpen(false)}
              >
                <Link href="/checkout">Checkout</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
