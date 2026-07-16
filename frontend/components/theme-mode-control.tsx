"use client"

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useMemo, useSyncExternalStore } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type ThemeMode = "light" | "dark" | "system"

type ThemeOption = {
  value: ThemeMode
  label: string
  icon: LucideIcon
  dotClassName: string
}

const themeOptions: ThemeOption[] = [
  {
    value: "system",
    label: "System",
    icon: Monitor,
    dotClassName: "bg-[conic-gradient(from_135deg,#fff7ec,#6b3948,#211814,#fff7ec)]",
  },
  {
    value: "light",
    label: "Light",
    icon: Sun,
    dotClassName: "bg-[#efb7b2]",
  },
  {
    value: "dark",
    label: "Dark",
    icon: Moon,
    dotClassName: "bg-[#211814] ring-1 ring-primary-foreground/25",
  },
]

const subscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export function ThemeModeControl() {
  const { setTheme, theme, resolvedTheme } = useTheme()
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)

  const activeTheme: ThemeMode =
    mounted && (theme === "light" || theme === "dark" || theme === "system")
      ? theme
      : "system"
  const activeOption = useMemo(
    () => themeOptions.find((option) => option.value === activeTheme) ?? themeOptions[0],
    [activeTheme],
  )
  const ActiveIcon = activeOption.icon
  const label = mounted
    ? `${activeOption.label} theme${activeTheme === "system" && resolvedTheme ? `, currently ${resolvedTheme}` : ""}`
    : "Theme"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group relative grid size-8 place-items-center rounded-full text-foreground/45 outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label={label}
          title={label}
        >
          <span className="absolute inset-1.5 rounded-full border border-foreground/10 bg-background/40 opacity-0 shadow-[0_8px_20px_rgba(33,24,20,0.08)] transition group-hover:opacity-100 group-focus-visible:opacity-100" />
          <span
            className={cn(
              "relative size-2 rounded-full shadow-[0_0_0_3px_hsl(var(--background)),0_0_18px_hsl(var(--primary)/0.32)] transition-transform group-hover:scale-125",
              activeOption.dotClassName,
            )}
          />
          <ActiveIcon className="sr-only" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-32 rounded-md border-foreground/10 bg-popover/95 p-1 shadow-[0_18px_48px_rgba(33,24,20,0.16)] backdrop-blur"
      >
        {themeOptions.map((option) => {
          const Icon = option.icon
          const selected = activeTheme === option.value

          return (
            <DropdownMenuItem
              key={option.value}
              className="gap-2 text-xs"
              onClick={() => setTheme(option.value)}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              <span>{option.label}</span>
              <span
                className={cn(
                  "ml-auto size-1.5 rounded-full opacity-40",
                  option.dotClassName,
                  selected && "opacity-100",
                )}
              />
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
