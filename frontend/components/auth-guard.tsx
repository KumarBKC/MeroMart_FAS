"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { getCurrentUser, type User } from "@/lib/auth"
import { useRouter } from "next/navigation"

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: "admin" | "cashier"
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const currentUser = getCurrentUser()

    if (!currentUser) {
      router.push("/login")
      return
    }

    if (requiredRole && currentUser.role !== requiredRole && currentUser.role !== "admin") {
      router.push("/dashboard")
      return
    }

    setUser(currentUser)
    setLoading(false)
  }, [router, requiredRole])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
