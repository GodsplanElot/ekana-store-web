import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Ekana's Cosmetic - Premium Beauty & Makeup",
  description:
    "Discover luxury makeup and beauty essentials. Cruelty-free, clean beauty crafted for every skin tone.",
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
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
