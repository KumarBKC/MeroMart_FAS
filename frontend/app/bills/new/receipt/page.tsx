"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, safeNumberFormat } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Printer } from "lucide-react"

// Define the correct bill structure based on backend data
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
  customer_phone?: string
  customer_address?: string
  subtotal: number
  discount: number
  discount_type: string
  vat_rate: number
  vat_amount: number
  net_amount: number
  date_time: string
  status: string
  payment_method?: string
  notes?: string
  cashier_id?: string
  items: BillItem[]
}

export default function ReceiptPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const [bill, setBill] = useState<Bill | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoPrinting, setAutoPrinting] = useState(false)
  const hasPrintedRef = useRef(false)
  const printTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Get bill ID and print parameter from URL parameters
  const billId = searchParams.get('id')
  const shouldPrint = searchParams.get('print') === 'true'

  useEffect(() => {
    async function fetchBill() {
      if (!billId) {
        toast.toast({
          title: "Bill ID missing",
          description: "No bill ID provided in URL",
          variant: "destructive",
        })
        router.push("/bills")
        return
      }

      // Validate bill ID is a number
      if (isNaN(Number(billId))) {
        toast.toast({
          title: "Invalid Bill ID",
          description: "Bill ID must be a valid number",
          variant: "destructive",
        })
        router.push("/bills")
        return
      }

      try {
        setLoading(true)
        const res = await fetch(`/backend/bills.php`)
        if (!res.ok) throw new Error("Failed to fetch bills")
        
        const bills: Bill[] = await res.json()
        const foundBill = bills.find((b) => b.bill_id.toString() === billId)
        
        if (!foundBill) {
          toast.toast({
            title: "Bill not found",
            description: `No bill found with ID ${billId}`,
            variant: "destructive",
          })
          router.push("/bills")
          return
        }
        
        setBill(foundBill)
      } catch (error) {
        console.error("Error fetching bill:", error)
        toast.toast({
          title: "Error loading bill",
          description: "Failed to load bill data.",
          variant: "destructive",
        })
        router.push("/bills")
      } finally {
        setLoading(false)
      }
    }

    fetchBill()
  }, [billId, router, toast])

  // Auto-print effect when print parameter is true
  useEffect(() => {
    // Clear any existing timeout
    if (printTimeoutRef.current) {
      clearTimeout(printTimeoutRef.current)
    }

    if (shouldPrint && bill && !loading && !hasPrintedRef.current) {
      hasPrintedRef.current = true
      setAutoPrinting(true)
      
      // Small delay to ensure page is fully rendered
      printTimeoutRef.current = setTimeout(() => {
        window.print()
        setAutoPrinting(false)
        
        // Remove print parameter from URL after printing
        const url = new URL(window.location.href)
        url.searchParams.delete('print')
        router.replace(url.pathname + url.search, { scroll: false })
      }, 1000)
    }

    // Cleanup function
    return () => {
      if (printTimeoutRef.current) {
        clearTimeout(printTimeoutRef.current)
      }
    }
  }, [shouldPrint, bill, loading])

  const handlePrint = () => {
    window.print()
  }

  const handleBack = () => {
    router.push("/bills")
  }

  // Helper to format date and time as "YYYY-MM-DD HH:mm"
  function formatDateTime(dateString: string) {
    const date = new Date(dateString)
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, "0")
    const dd = String(date.getDate()).padStart(2, "0")
    const hh = String(date.getHours()).padStart(2, "0")
    const min = String(date.getMinutes()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">Loading receipt...</p>
        </div>
      </div>
    )
  }

  if (autoPrinting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">Preparing print...</p>
        </div>
      </div>
    )
  }

  if (!bill) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-red-600">Bill not found</p>
          <Button onClick={handleBack} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Bills
          </Button>
        </div>
      </div>
    )
  }

  // Calculate discount amount
  const discountAmount = bill.discount_type === "percentage" 
    ? (bill.subtotal * bill.discount) / 100 
    : bill.discount

  return (
    <>
      {/* Screen view */}
      <div className="p-6 space-y-6 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Bills
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Receipt</h1>
          </div>
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print Receipt
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p><strong>Name:</strong> {bill.customer_name}</p>
                <p><strong>Phone:</strong> {bill.customer_phone || "N/A"}</p>
              </div>
              <div>
                <p><strong>Address:</strong> {bill.customer_address || "N/A"}</p>
                <p><strong>Bill Number:</strong> {bill.bill_number}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bill Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow key="receipt-view-header">
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bill.items.map((item, index) => (
                  <TableRow key={`receipt-item-${bill.bill_id}-${item.id || index}`}>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{safeNumberFormat(item.price)}</TableCell>
                    <TableCell>{safeNumberFormat(item.total_price)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span><strong>Subtotal:</strong></span>
                  <span>{safeNumberFormat(bill.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span><strong>Discount:</strong></span>
                  <span>-{safeNumberFormat(discountAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span><strong>VAT ({bill.vat_rate}%):</strong></span>
                  <span>{safeNumberFormat(bill.vat_amount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span><strong>Total:</strong></span>
                  <span>{safeNumberFormat(bill.net_amount)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <p><strong>Payment Method:</strong> {bill.payment_method || "N/A"}</p>
                <p><strong>Status:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    bill.status === "paid" ? "bg-green-100 text-green-800" :
                    bill.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                    "bg-red-100 text-red-800"
                  }`}>
                    {bill.status}
                  </span>
                </p>
                <p><strong>Date:</strong> {formatDateTime(bill.date_time)}</p>
                {bill.notes && <p><strong>Notes:</strong> {bill.notes}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print view */}
      <div className="hidden print:block p-4 font-mono text-sm">
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold">GUMI SUPER MART</h1>
          <p>Gurbhakot-13, Surkhet, Nepal</p>
          <p>Contact: 9800000000 | VAT No: 123456789</p>
        </div>

        <div className="border-t border-b border-black py-2 mb-4">
          <div className="flex justify-between">
            <span><strong>Receipt No:</strong> {bill.bill_number}</span>
            <span><strong>Date:</strong> {formatDateTime(bill.date_time)}</span>
          </div>
          <div className="flex justify-between">
            <span><strong>Customer:</strong> {bill.customer_name}</span>
            <span><strong>Status:</strong> {bill.status.toUpperCase()}</span>
          </div>
          {bill.customer_phone && <div><strong>Phone:</strong> {bill.customer_phone}</div>}
        </div>

        <table className="w-full mb-4">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left">Item</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Rate</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((item, index) => (
              <tr key={`print-item-${bill.bill_id}-${item.id || index}`} className="border-b border-gray-300">
                <td>{item.product_name}</td>
                <td className="text-right">{item.quantity}</td>
                <td className="text-right">{safeNumberFormat(item.price)}</td>
                <td className="text-right">{safeNumberFormat(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-black pt-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{safeNumberFormat(bill.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount:</span>
            <span>-{safeNumberFormat(discountAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>VAT ({bill.vat_rate}%):</span>
            <span>{safeNumberFormat(bill.vat_amount)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t border-black pt-2">
            <span>TOTAL:</span>
            <span>NPR {safeNumberFormat(bill.net_amount)}</span>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p><strong>Payment Method:</strong> {bill.payment_method || "N/A"}</p>
          {bill.notes && <p><strong>Notes:</strong> {bill.notes}</p>}
          <p className="mt-4">Thank you for shopping with us!</p>
        </div>
      </div>
    </>
  )
}
