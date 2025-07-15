import type { Metadata } from "next"
import "./globals.css"
import { Inter, Poppins } from "next/font/google"

// Import des bonnes polices
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-poppins" })

export const metadata: Metadata = {
  title: "Zello",
  description: "Application pour commerçants de proximité",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className={`${inter.variable} ${poppins.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
