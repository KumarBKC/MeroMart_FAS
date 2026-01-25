import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AppContent } from "@/components/app-content"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Financial Accounting Software System",
  description: "Complete accounting solution for Supermarkets and Retailers",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppContent>{children}</AppContent>
      </body>
    </html>
  )
}
