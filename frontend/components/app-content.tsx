"use client"

import React from "react"
import { usePathname } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { Sidebar } from "@/components/sidebar"
import { Toaster } from "@/components/ui/toaster"

export function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = pathname === "/login" || pathname === "/register"

  if (isAuthPage) {
    return (
      <>
        {children}
        <Toaster />
      </>
    )
  }

  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 md:ml-64 overflow-auto">{children}</main>
      </div>
      <Toaster />
    </AuthGuard>
  )
}
