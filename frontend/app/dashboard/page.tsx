"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, TrendingDown, FileText, Calendar, FileX2Icon } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { join } from "path"
import { isEqual } from "date-fns"

interface Bill {
  bill_id: number;
  bill_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  subtotal: string;
  discount: string;
  discount_type: string;
  vat_rate: string;
  vat_amount: string;
  net_amount: string;
  date_time: string;
  status: string;
  payment_method?: string;
  notes?: string;
  cashier_id?: string;
  items?: any[];
}

interface Expense {
  id: number;
  description: string;
  category: string;
  amount: string;
  date: string;
  paymentMethod?: string;
  vendor?: string;
  notes?: string;
  isRecurring?: boolean;
  recurringFrequency?: string;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export default function DashboardPage() {
  const [bills, setBills] = useState<Bill[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError("")
      try {
        const billsRes = await fetch("/backend/bills.php")
        const billsData = await billsRes.json()
        if (!Array.isArray(billsData)) throw new Error("Failed to fetch bills")
        const expensesRes = await fetch("/backend/expenses.php")
        const expensesData = await expensesRes.json()
        if (!Array.isArray(expensesData)) throw new Error("Failed to fetch expenses")
        setBills(billsData)
        setExpenses(expensesData)
      } catch (err) {
        setError("Failed to load dashboard data. Please try again.")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Calculate metrics
  const totalSales = bills.reduce((sum, bill) => sum + (parseFloat(bill.net_amount) || 0), 0)
  const totalExpenses = expenses.reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0)
  const profit = totalSales - totalExpenses
  const totalBills = bills.length

  // Get today's date for display
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  // Sort and slice for recent
  const recentBills = bills
    .slice()
    .sort((a, b) => {
      // Sort by date_time descending
      const dateA = new Date(a.date_time).getTime();
      const dateB = new Date(b.date_time).getTime();
      if (dateB !== dateA) return dateB - dateA;
      // If dates are equal, sort by bill_number descending (assuming format like BIL-2024-001)
      // Extract the numeric part for comparison
      const numA = parseInt(a.bill_number.replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(b.bill_number.replace(/\D/g, ""), 10) || 0;
      return numB - numA;
    })
    .slice(0, 3)
  const recentExpenses = expenses
    .slice()
    .sort((a, b) => {
      // Sort by date descending
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateB !== dateA) return dateB - dateA;
      // If dates are equal, sort by id descending
      return (b.id || 0) - (a.id || 0);
    })
    .slice(0, 3)

  // Example percentage changes (replace with real calculation if needed)
  const salesChange = 12.5;
  const expensesChange = 2.1;
  const profitChange = 18.2;

  // Helper for percentage color
  function getPercentColor(val: number) {
    if (val > 0) return "text-green-600";
    if (val < 0) return "text-red-600";
    return "";
  }
  // Helper for net profit color
  function getProfitColor(val: number) {
    if (val > 0) return "text-green-600";
    if (val < 0) return "text-red-600";
    return "";
  }

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your business overview.</p>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="mr-2 h-4 w-4" />
          {today}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {totalSales.toLocaleString()}</div>
            <p className="text-xs">
              <span className={getPercentColor(salesChange)}>
                {salesChange > 0 ? "+" : salesChange < 0 ? "-" : ""}{Math.abs(salesChange)}%
              </span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {totalExpenses.toLocaleString()}</div>
            <p className="text-xs">
              <span className={getPercentColor(expensesChange)}>
                {expensesChange > 0 ? "+" : expensesChange < 0 ? "-" : ""}{Math.abs(expensesChange)}%
              </span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getProfitColor(profit)}`}>Rs. {profit.toLocaleString()}</div>
            <p className="text-xs">
              <span className={getPercentColor(profitChange)}>
                {profitChange > 0 ? "+" : profitChange < 0 ? "-" : ""}{Math.abs(profitChange)}%
              </span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBills}</div>
            <p className="text-xs text-muted-foreground">+3 new this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Bills</CardTitle>
            <CardDescription>Latest sales transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentBills.length === 0 ? (
                <div className="text-muted-foreground">No bills found.</div>
              ) : (
                recentBills.map((bill) => (
                  <div key={bill.bill_id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{bill.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{bill.bill_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Rs. {parseFloat(bill.net_amount).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{bill.date_time?.slice(0, 10)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
            <CardDescription>Latest business expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentExpenses.length === 0 ? (
                <div className="text-muted-foreground">No expenses found.</div>
              ) : (
                recentExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-sm text-muted-foreground">{expense.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-red-600">Rs. {parseFloat(expense.amount).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{expense.date?.slice(0, 10)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to get you started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div
              className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => router.push("/bills/new")}
              tabIndex={0}
              role="button"
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") router.push("/bills/new") }}
            >
              <FileText className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-medium">Create Bill</h3>
              <p className="text-sm text-muted-foreground">Generate a new sales bill</p>
            </div>
            <div
              className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => router.push("/expenses")}
              tabIndex={0}
              role="button"
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") router.push("/expenses") }}
            >
              <TrendingDown className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-medium">Record Expense</h3>
              <p className="text-sm text-muted-foreground">Add a new business expense</p>
            </div>
            <div
              className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => router.push("/reports")}
              tabIndex={0}
              role="button"
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") router.push("/reports") }}
            >
              <TrendingUp className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-medium">View Reports</h3>
              <p className="text-sm text-muted-foreground">Generate financial reports</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}