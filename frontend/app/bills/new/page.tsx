"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Minus, Save, ArrowLeft } from "lucide-react"
import { dataStore } from "@/lib/data-store"
import type { Bill, BillItem, Product } from "@/lib/types"
import { generateId, formatCurrency } from "@/lib/utils"
import { getCurrentUser } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function NewBillPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [bill, setBill] = useState<Partial<Bill>>({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    billNumber: "",
    items: [],
    discount: 0,
    discountType: "amount",
    taxRate: 13,
    paymentMethod: "cash",
    status: "paid",
    notes: "",
    applyVat: false,
  })
  const [billNumberLoading, setBillNumberLoading] = useState(true)

  // Fix controlled input warning: ensure all inputs have defined values
  useEffect(() => {
    setBill((prev) => ({
      customerName: prev.customerName ?? "",
      customerPhone: prev.customerPhone ?? "",
      customerAddress: prev.customerAddress ?? "",
      billNumber: prev.billNumber ?? "",
      items: prev.items ?? [],
      discount: prev.discount ?? 0,
      discountType: prev.discountType ?? "amount",
      taxRate: prev.taxRate ?? 13,
      paymentMethod: prev.paymentMethod ?? "cash",
      status: prev.status ?? "paid",
      notes: prev.notes ?? "",
      applyVat: prev.applyVat ?? false,
    }))
  }, [])

  // Remove back button by removing the Link and Button with ArrowLeft in header
  // Replace all occurrences of "Receipt" with "Bill" in titles and text

  useEffect(() => {
    async function loadProducts() {
      const loadedProducts = await dataStore.getProducts()
      setProducts(loadedProducts)
    }
    async function loadBillNumber() {
      setBillNumberLoading(true)
      const billNumber = await dataStore.getNextBillNumber()
      setBill((prev) => ({
        ...prev,
        billNumber: billNumber,
      }))
      setBillNumberLoading(false)
    }
    loadProducts()
    loadBillNumber()
    if (dataStore && typeof dataStore.getStoreSettings === "function") {
      const settings = dataStore.getStoreSettings()
      setBill((prev) => ({
        ...prev,
        taxRate: settings.taxRate,
      }))
    }
  }, [])

  const addItem = () => {
    const newItem: BillItem = {
      id: generateId(),
      productId: "",
      name: "",
      quantity: 0,
      rate: 0,
      amount: 0,
      unit: "piece",
    }
    setBill((prev) => ({
      ...prev,
      items: [...(prev.items || []), newItem],
    }))
  }

  const updateItem = (index: number, field: keyof BillItem, value: any) => {
    const items = [...(bill.items || [])]
    items[index] = { ...items[index], [field]: value }

    if (field === "productId" && value && value !== "other") {
      const product = products.find((p) => p.id === value)
      if (product) {
        items[index] = {
          ...items[index],
          name: product.name,
          rate: product.sellingPrice,
          unit: product.unit,
        }
      }
    }

    if (field === "quantity" || field === "rate") {
      items[index].amount = items[index].quantity * items[index].rate
    }

    setBill((prev) => ({ ...prev, items }))
  }

  const removeItem = (index: number) => {
    const items = [...(bill.items || [])]
    items.splice(index, 1)
    setBill((prev) => ({ ...prev, items }))
  }

  const calculateTotals = () => {
    const subtotal = (bill.items || []).reduce((sum, item) => sum + item.amount, 0)
    const discountAmount =
      bill.discountType === "percentage" ? (subtotal * (bill.discount || 0)) / 100 : bill.discount || 0
    const taxableAmount = subtotal - discountAmount
    const tax = bill.applyVat ? (taxableAmount * (bill.taxRate || 0)) / 100 : 0
    const total = taxableAmount + tax

    return { subtotal, discountAmount, tax, total }
  }

  const handleSave = async () => {
    const user = getCurrentUser()
    if (!user) return

    if (!bill.customerName || bill.customerName.trim() === "") {
      toast({
        title: "Validation Error",
        description: "Customer name is required.",
        variant: "destructive",
      })
      return
    }

    const { subtotal, discountAmount, tax, total } = calculateTotals()

    const newBill: Bill = {
      id: generateId(),
      billNumber: bill.billNumber || '',
      customerName: bill.customerName || '',
      customerPhone: bill.customerPhone,
      customerAddress: bill.customerAddress,
      items: bill.items || [],
      subtotal,
      discount: discountAmount,
      discountType: bill.discountType || 'amount',
      tax,
      taxRate: bill.taxRate || 13,
      total,
      date: new Date().toISOString().split("T")[0],
      status: bill.status || 'paid',
      paymentMethod: bill.paymentMethod || 'cash',
      notes: bill.notes,
      createdBy: user.name,
      createdAt: new Date().toISOString(),
    }

    try {
      await dataStore.saveBill(newBill)
      toast({
        title: "Bill Created",
        description: `Bill ${newBill.billNumber} has been created successfully.`,
      })
      router.push(`/bills`)
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to save bill",
        variant: "destructive",
      })
    }
  }

  const { subtotal, discountAmount, tax, total } = calculateTotals()

  async function resetBillNumber() {
    setBillNumberLoading(true)
    const billNumber = await dataStore.getNextBillNumber()
    setBill((prev) => ({
      ...prev,
      billNumber: billNumber,
    }))
    setBillNumberLoading(false)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">New Bill</h1>
            <p className="text-muted-foreground">Create a new sales bill</p>
          </div>
        </div>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Bill
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Receipt Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={bill.customerName}
                  onChange={(e) => setBill((prev) => ({ ...prev, customerName: e.target.value }))}
                  placeholder="Enter customer name"
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Phone Number</Label>
                <Input
                  id="customerPhone"
                  value={bill.customerPhone}
                  onChange={(e) => setBill((prev) => ({ ...prev, customerPhone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="customerAddress">Address</Label>
              <Textarea
                id="customerAddress"
                value={bill.customerAddress}
                onChange={(e) => setBill((prev) => ({ ...prev, customerAddress: e.target.value }))}
                placeholder="Enter customer address"
              />
            </div>
          </CardContent>
        </Card>

          {/* Receipt Items */}
          <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Bill Items</CardTitle>
              <Button onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow key="new-bill-header">
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(bill.items || []).map((item, index) => (
                  <TableRow key={`new-bill-item-${item.id || index}`}>
                    <TableCell>
                      <Select value={item.productId} onValueChange={(value) => updateItem(index, "productId", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} ({product.unit})
                            </SelectItem>
                          ))}
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {item.productId === "other" && (
                        <Input
                          type="text"
                          placeholder="Enter product name"
                          value={item.name ?? ""}
                          onChange={(e) => updateItem(index, "name", e.target.value)}
                          className="mt-2"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity && !isNaN(item.quantity) ? item.quantity : ''}
                        onChange={(e) => {
                          const val = Number.parseFloat(e.target.value)
                          updateItem(index, "quantity", val < 1 ? 1 : val)
                        }}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.rate && !isNaN(item.rate) ? item.rate : ''}
                        min={0}
                        onChange={(e) => {
                          const val = Number.parseFloat(e.target.value)
                          updateItem(index, "rate", val < 0 ? 0 : val)
                        }}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>{formatCurrency(item.amount)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => removeItem(index)} className="text-red-600">
                        <Minus className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </div>

        {/* Receipt Summary */}
        <div className="space-y-6">
          <Card>
          <CardHeader>
            <CardTitle>Bill Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 items-center">
              <Input
                id="billNumber"
                value={billNumberLoading ? "Loading..." : bill.billNumber}
                onChange={e => setBill(prev => ({ ...prev, billNumber: e.target.value }))}
              />
              <Button type="button" variant="outline" size="sm" onClick={resetBillNumber} disabled={billNumberLoading}>
                Reset
              </Button>
            </div>
            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select
                value={bill.paymentMethod}
                onValueChange={(value) => setBill((prev) => ({ ...prev, paymentMethod: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={bill.status}
                onValueChange={(value) => setBill((prev) => ({ ...prev, status: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

          <Card>
          <CardHeader>
            <CardTitle>Bill Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="discount">Discount:</Label>
              <Input
                id="discount"
                type="number"
                min={0}
                value={bill.discount && !isNaN(bill.discount) ? bill.discount : ''}
                onChange={(e) => {
                  const val = Number.parseFloat(e.target.value)
                  setBill((prev) => ({ ...prev, discount: val < 0 ? 0 : val }))
                }}
                className="w-20"
              />
              <Select
                value={bill.discountType}
                onValueChange={(value) => setBill((prev) => ({ ...prev, discountType: value as any }))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">Rs.</SelectItem>
                  <SelectItem value="percentage">%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                id="applyVat"
                type="checkbox"
                checked={bill.applyVat}
                onChange={(e) => setBill((prev) => ({ ...prev, applyVat: e.target.checked }))}
                className="h-4 w-4 rounded border border-gray-300 bg-white text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
              />
              <label htmlFor="applyVat" className="select-none text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Apply VAT
              </label>
            </div>
            <div className="flex justify-between">
              <span>Discount Amount:</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT (13%):</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </CardContent>
        </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={bill.notes}
                onChange={(e) => setBill((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any additional notes..."
              />
            </CardContent>
          </Card>
          <div className="pt-4">
            <button
              type="button"
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={async () => {
                if (!bill.id) {
                  // Save the bill first
                  const user = getCurrentUser()
                  if (!user) {
                    alert("Please login first.")
                    return
                  }
                  const { subtotal, discountAmount, tax, total } = calculateTotals()
                  const newBill = {
                    id: generateId(),
                    billNumber: bill.billNumber || '',
                    customerName: bill.customerName || '',
                    customerPhone: bill.customerPhone,
                    customerAddress: bill.customerAddress,
                    items: bill.items || [],
                    subtotal,
                    discount: discountAmount,
                    discountType: bill.discountType || 'amount',
                    tax,
                    taxRate: bill.taxRate || 13,
                    total,
                    date: new Date().toISOString().split("T")[0],
                    status: bill.status || 'paid',
                    paymentMethod: bill.paymentMethod || 'cash',
                    notes: bill.notes,
                    createdBy: user.name,
                    createdAt: new Date().toISOString(),
                  }
                  try {
                    await dataStore.saveBill(newBill)
                    router.push(`/bills/new/receipt/print?id=${newBill.id}`)
                  } catch (error) {
                    alert("Failed to save bill. Please try again.")
                  }
                } else {
                  router.push(`/bills/new/receipt/print?id=${bill.id}`)
                }
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mr-2 h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 9V2h12v7M6 18h12v4H6v-4zm3-3h6v3H9v-3z"
                />
              </svg>
              Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
