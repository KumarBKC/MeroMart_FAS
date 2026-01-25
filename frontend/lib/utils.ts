import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Bill, Expense, DashboardStats } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = "NPR"): string {
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: currency === "NPR" ? "NPR" : currency,
    minimumFractionDigits: 2,
  })
    .format(amount)
    .replace("NPR", "Rs.")
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

export function calculateDashboardStats(bills: Bill[], expenses: Expense[]): DashboardStats {
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  const currentMonthBills = bills.filter((bill) => {
    const billDate = new Date(bill.date)
    return billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear
  })

  const currentMonthExpenses = expenses.filter((exp) => {
    const expDate = new Date(exp.date)
    return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear
  })

  const totalSales = currentMonthBills.reduce((sum, bill) => sum + (bill.total ?? 0), 0)
  const totalExpenses = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0)

  return {
    totalSales,
    totalExpenses,
    netProfit: totalSales - totalExpenses,
    totalBills: currentMonthBills.length,
    pendingBills: currentMonthBills.filter((bill) => bill.status === "pending").length,
    lowStockItems: 0, // Will be calculated based on products
    salesGrowth: 12.5, // Mock data - in real app, calculate from previous month
    expenseGrowth: 2.1, // Mock data
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return ""

  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          return typeof value === "string" ? '"' + value + '"' : value
        })
        .join(","),
    ),
  ]

  return csvRows.join("\n")
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportToCSV(data: any[], filename: string): void {
  const csvContent = convertToCSV(data)
  downloadFile(csvContent, filename, "text/csv")
}

export function safeNumberFormat(value: any, decimals: number = 2): string {
  if (value === null || value === undefined) return "0.00"
  const num = typeof value === "number" ? value : Number(value) || 0
  return num.toFixed(decimals)
}

export function safeNumber(value: any): number {
  if (value === null || value === undefined) return 0
  return typeof value === "number" ? value : Number(value) || 0
}
