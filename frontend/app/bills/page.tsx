"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown, ChevronUp, Plus, FileText, Printer } from "lucide-react"
import { safeNumberFormat } from "@/lib/utils"
import { useRouter } from 'next/navigation'

type BillItem = {
  id: number
  product_name: string
  quantity: number
  price: number
  total_price: number
}

type Bill = {
  bill_id: number
  bill_number: string
  customer_name: string
  status: string
  date_time: string
  net_amount: number
  items: BillItem[]
  cashier_id?: number
  createdBy?: string
}

const timePeriods = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
]

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>("")
  const [timePeriod, setTimePeriod] = useState<string>("all")
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const cats = new Set<string>()
    bills.forEach((bill) => {
      bill.items.forEach((item) => {
        if (item.product_name.trim() !== "") {
          cats.add(item.product_name)
        }
      })
    })
    setCategories(Array.from(cats))
  }, [bills])

  // Debounce searchTerm input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500) // 500ms debounce

    return () => {
      clearTimeout(handler)
    }
  }, [searchTerm])

  // Fetch bills effect
  useEffect(() => {
    const fetchBills = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (statusFilter !== "all") params.append("status", statusFilter)
        if (debouncedSearchTerm) params.append("search", debouncedSearchTerm)
        const res = await fetch(`/backend/bills.php?${params.toString()}`)
        if (!res.ok) throw new Error("Failed to fetch bills")
        const data: Bill[] = await res.json()
        setBills(data)
      } catch (error) {
        console.error(error)
        setError("Failed to load bills. Please try again.")
        setBills([])
      } finally {
        setLoading(false)
      }
    }

    fetchBills()
  }, [statusFilter, debouncedSearchTerm])

  const filteredBills = bills.filter((bill) => {
    let timeMatch = true
    if (selectedDate) {
      const billDate = new Date(bill.date_time).toISOString().split("T")[0]
      timeMatch = billDate === selectedDate
    } else if (timePeriod && timePeriod !== "all") {
      const billDate = new Date(bill.date_time)
      const now = new Date()
      switch (timePeriod) {
        case "day":
          timeMatch = billDate.toDateString() === now.toDateString()
          break
        case "week": {
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - now.getDay())
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 6)
          timeMatch = billDate >= weekStart && billDate <= weekEnd
          break
        }
        case "month":
          timeMatch = billDate.getMonth() === now.getMonth() && billDate.getFullYear() === now.getFullYear()
          break
        case "quarter": {
          const quarter = Math.floor(billDate.getMonth() / 3)
          const currentQuarter = Math.floor(now.getMonth() / 3)
          timeMatch = quarter === currentQuarter && billDate.getFullYear() === now.getFullYear()
          break
        }
        case "year":
          timeMatch = billDate.getFullYear() === now.getFullYear()
          break
        default:
          timeMatch = true
      }
    }
    let categoryMatch = true
    if (categoryFilter !== "all") {
      categoryMatch = bill.items.some((item) => item.product_name === categoryFilter)
    }
    return timeMatch && categoryMatch
  })

  // After fetching and filtering bills, sort them by bill_number descending (latest first)
  const sortedBills = [...filteredBills].sort((a, b) => {
    const getNum = (bill: any) => {
      const match = bill.bill_number.match(/B-?(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    };
    return getNum(b) - getNum(a);
  });

  const toggleRow = (bill_id: number) => {
    const newExpandedRows = new Set(expandedRows)
    if (newExpandedRows.has(bill_id)) {
      newExpandedRows.delete(bill_id)
    } else {
      newExpandedRows.add(bill_id)
    }
    setExpandedRows(newExpandedRows)
  }

  const handlePrint = (billId: number) => {
    // Use window.open for direct printing without navigation loops
    window.open(`/bills/new/receipt?id=${billId}&print=true`, '_blank')
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header and Add Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">See all billing records here</p>
        </div>
        <Link href="/bills/new">
          <Button className="flex items-center gap-2" size="sm">
            <Plus className="h-4 w-4" />
            New Bill
          </Button>
        </Link>
      </div>

      {/* Total Bills Card */}
      <div className="mb-6">
        <Card className="w-64">
          <CardContent className="py-6">
            <div className="text-xs text-muted-foreground mb-1">Total Bills</div>
            <div className="text-2xl font-bold">
              {filteredBills.length}
            </div>
            <div className="text-xs text-muted-foreground">
              {filteredBills.length === 1 ? "1 bill" : `${filteredBills.length} bills`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bill Lists</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="ml-4 rounded border border-gray-300 px-2 py-1"
            aria-label="Filter by specific date"
          />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {categories
                  .filter((cat) => cat && cat.trim() !== "")
                  .map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Input
              type="search"
              placeholder="Search by customer or bill number"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-2 md:mt-0"
            />
          </div>
          {loading ? (
            <p>Loading bills...</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : filteredBills.length === 0 ? (
            <p>No bills found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow key="main-header">
                  <TableHead></TableHead>
                  <TableHead>Bill Number</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBills.map((bill) => (
                  <React.Fragment key={`bill-fragment-${bill.bill_id}`}>
                    <TableRow key={`bill-${bill.bill_id}`}>
                      <TableCell>
                        <button
                          onClick={() => toggleRow(bill.bill_id)}
                          aria-label={expandedRows.has(bill.bill_id) ? "Collapse" : "Expand"}
                          className="p-1"
                        >
                          {expandedRows.has(bill.bill_id) ? <ChevronUp /> : <ChevronDown />}
                        </button>
                      </TableCell>
                      <TableCell>{bill.bill_number}</TableCell>
                      <TableCell>{bill.customer_name}</TableCell>
                      <TableCell>{bill.status}</TableCell>
                      <TableCell>{new Date(bill.date_time).toLocaleDateString()}</TableCell>
                      <TableCell>{safeNumberFormat(bill.net_amount)}</TableCell>
                      <TableCell>{bill.cashier_id || bill.createdBy || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link href={`/bills/new/receipt/print?id=${bill.bill_id}`}>
                            <Button variant="outline" size="sm" className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Receipt
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedRows.has(bill.bill_id) && (
                      <TableRow key={`expanded-${bill.bill_id}`}>
                        <TableCell colSpan={7} className="bg-gray-50 dark:bg-gray-800 p-0">
                          <div className="p-4">
                            <Table>
                              <TableHeader>
                                <TableRow key="nested-header">
                                  <TableHead>Product</TableHead>
                                  <TableHead>Quantity</TableHead>
                                  <TableHead>Price</TableHead>
                                  <TableHead>Total Price</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {bill.items.map((item, index) => (
                                  <TableRow key={`item-${bill.bill_id}-${item.id || index}`}>
                                    <TableCell>{item.product_name}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>{safeNumberFormat(item.price)}</TableCell>
                                    <TableCell>{safeNumberFormat(item.total_price)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}