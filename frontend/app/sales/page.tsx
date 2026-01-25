"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { safeNumberFormat } from "@/lib/utils"

// Updated to match backend period values
const timePeriods = [
  { value: "all", label: "All Time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
]

// Corrected interface with camelCase
interface Sale {
  id: number
  productName: string
  invoiceNumber: string
  dateSold: string
  amount: number
  category: string
  user: string
}

// Utility function to replace Nepali/Indian currency symbols with Rs
function formatCurrency(value: string | number) {
  if (typeof value === 'number') return `Rs ${safeNumberFormat(value)}`;
  return value.replace(/[₹रु]|रुपैयाँ|रुपया|रुपैँया|रुपैँ/g, 'Rs');
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>("")

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)
    return () => clearTimeout(handler)
  }, [searchTerm])

  const fetchSales = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.append("period", period)
      if (debouncedSearchTerm) {
        params.append("search", debouncedSearchTerm)
      }
      
      // Add authentication token (example using localStorage)
      const token = localStorage.getItem("auth_token")
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
      
      const res = await fetch(`/backend/sales.php?${params.toString()}`, { headers, credentials: 'include' })
      
      if (!res.ok) {
        const errorText = await res.text()
        let errorMessage = `Failed to fetch sales data (${res.status})`
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorText
        } catch {
          if (errorText) errorMessage += `: ${errorText}`
        }
        throw new Error(errorMessage)
      }
      
      const data = await res.json()
      
      // Map snake_case to camelCase
      const mappedSales = data.map((sale: any) => ({
        id: sale.id,
        productName: sale.product_name,
        invoiceNumber: sale.invoice_number,
        dateSold: sale.date_sold,
        amount: parseFloat(sale.amount),
        category: sale.category,
        user: sale.user
      }))
      
      setSales(mappedSales)
    } catch (err: any) {
      setError(err.message || "Unknown error occurred")
      setSales([])
    } finally {
      setLoading(false)
    }
  }, [period, debouncedSearchTerm])

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return isNaN(date.getTime()) 
      ? "Invalid Date" 
      : date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sales Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mb-6">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {timePeriods.map((tp) => (
                  <SelectItem key={tp.value} value={tp.value}>
                    {tp.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              type="search"
              placeholder="Search products, Bills, categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-2 md:mt-0 flex-grow max-w-md"
            />
            
            <Button 
              onClick={fetchSales}
              variant="outline"
              className="mt-2 md:mt-0"
            >
              Refresh
            </Button>
          </div>
          
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-md border border-red-200">
              <p className="text-red-700 font-medium">Error Loading Data</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              <Button 
                onClick={fetchSales}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No sales records found</p>
              <p className="text-sm text-gray-400 mt-2">
                Try changing your filters or add new sales
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow key="sales-header">
                    <TableHead>Product</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date Sold</TableHead>
                    <TableHead className="text-right">Amount (Rs)</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.productName}</TableCell>
                      <TableCell>{sale.invoiceNumber}</TableCell>
                      <TableCell>{formatDate(sale.dateSold)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(sale.amount)}</TableCell>
                      <TableCell>{sale.category}</TableCell>
                      <TableCell>{sale.user}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
