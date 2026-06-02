import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Ekana Cosmetics - Mobile Beauty Store",
  description:
    "Shop glosses, lip liners, and lashes from Ekana Cosmetics. Making beauty feel as good as it looks.",
};

export const viewport: Viewport = {
  themeColor: "#faf5f7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
