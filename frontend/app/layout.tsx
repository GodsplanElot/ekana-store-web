import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'

import './globals.css'

const _inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const _playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  title: 'ROSETTE - Premium Beauty & Makeup',
  description: 'Discover luxury makeup and beauty essentials. Cruelty-free, clean beauty crafted for every skin tone.',
}

export const viewport: Viewport = {
  themeColor: '#faf5f7',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${_inter.variable} ${_playfair.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
