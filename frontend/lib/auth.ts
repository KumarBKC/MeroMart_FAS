export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "cashier"
  storeId: string
}

import { toast } from "@/hooks/use-toast"

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  try {
    const response = await fetch("/api/login.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      toast({
        title: "Login failed",
        description: "Invalid email or password.",
        variant: "destructive",
      })
      return null
    }

    const data = await response.json()
    if (data.user) {
      setCurrentUser(data.user)
      return data.user
    }
    return null
  } catch (error) {
    toast({
      title: "Authentication error",
      description: "An error occurred during login. Please try again.",
      variant: "destructive",
    })
    return null
  }
}

export function getCurrentUser(): User | null {
  if (typeof window !== "undefined") {
    const userData = localStorage.getItem("currentUser")
    return userData ? JSON.parse(userData) : null
  }
  return null
}

export function setCurrentUser(user: User): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("currentUser", JSON.stringify(user))
  }
}

export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("currentUser")
  }
}
