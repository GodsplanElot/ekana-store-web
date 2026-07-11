import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";

import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Ekana Cosmetics - Mobile Beauty Store",
  description:
    "Shop glosses, lip liners, and lashes from Ekana Cosmetics. Making beauty feel as good as it looks.",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#fff7ec",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
          storageKey="ekana-theme"
        >
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
