"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, FileText, Receipt, TrendingUp, Settings, Menu, X, Store, Package } from "lucide-react"
import { getCurrentUser, logout } from "@/lib/auth"
import { useRouter } from "next/navigation"

import { BarChart } from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Billing", href: "/bills", icon: FileText },
  { name: "Products", href: "/products", icon: Package },
  { name: "Expenses", href: "/expenses", icon: Receipt },
  { name: "Sales", href: "/sales", icon: BarChart },
  { name: "Reports", href: "/reports", icon: TrendingUp },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const user = getCurrentUser()

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center px-6 py-4 border-b">
            <Store className="h-8 w-8 text-primary mr-3" />
            <div>
              <h1 className="text-lg font-semibold">Gumi Super Mart</h1>
              <p className="text-sm text-muted-foreground">Accounting System</p>
            </div>
          </div>

          {/* User info */}
          <div className="px-6 py-4 border-b">
            <div className="flex items-center space-x-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7 text-gray-700 dark:text-gray-300"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="7" r="5" />
                <path d="M12 14c-7 0-8 4-8 7h16c0-3-1-7-8-7z" />
              </svg>
              <div className="flex flex-col">
                <p className="text-base font-semibold leading-5">{user?.name}</p>
                <p className="text-sm text-muted-foreground capitalize">{user?.role ? `Role: ${user.role}` : ""}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive ? "bg-primary text-primary-foreground" : "text-gray-700 hover:bg-gray-100",
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="px-6 py-4 border-t">
            <Button variant="destructive" onClick={handleLogout} className="w-full">
              Logout
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}