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
import { Plus, Minus, Save } from "lucide-react"
import { dataStore } from "@/lib/data-store"
import type { Bill, BillItem, Product } from "@/lib/types"
import { generateId, formatCurrency } from "@/lib/utils"
import { getCurrentUser } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"

export default function NewReceiptPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [receipt, setReceipt] = useState<Partial<Bill>>({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    items: [],
    discount: 0,
    discountType: "amount",
    taxRate: 13,
    paymentMethod: "cash",
    status: "pending",
    notes: "",
    applyVat: true,
  })

  useEffect(() => {
    async function loadProducts() {
      const loadedProducts = await dataStore.getProducts()
      setProducts(loadedProducts)
    }
    async function loadBillNumber() {
      const billNumber = await dataStore.getNextBillNumber()
      setReceipt((prev) => ({
        ...prev,
        billNumber: billNumber,
      }))
    }
    loadProducts()
    loadBillNumber()
    const settings = dataStore.getStoreSettings()
    setReceipt((prev) => ({
      ...prev,
      taxRate: settings.taxRate,
    }))
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
    setReceipt((prev) => ({
      ...prev,
      items: [...(prev.items || []), newItem],
    }))
  }

  const updateItem = (index: number, field: keyof BillItem, value: any) => {
    const items = [...(receipt.items || [])]
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

    setReceipt((prev) => ({ ...prev, items }))
  }

  const removeItem = (index: number) => {
    const items = [...(receipt.items || [])]
    items.splice(index, 1)
    setReceipt((prev) => ({ ...prev, items }))
  }

  const calculateTotals = () => {
    const subtotal = (receipt.items || []).reduce((sum, item) => sum + item.amount, 0)
    const discountAmount =
      receipt.discountType === "percentage" ? (subtotal * (receipt.discount || 0)) / 100 : receipt.discount || 0
    const taxableAmount = subtotal - discountAmount
    const tax = receipt.applyVat ? (taxableAmount * (receipt.taxRate || 0)) / 100 : 0
    const total = taxableAmount + tax

    return { subtotal, discountAmount, tax, total }
  }

  const handleSave = () => {
    const user = getCurrentUser()
    if (!user) return

    const { subtotal, discountAmount, tax, total } = calculateTotals()

    const newReceipt: Bill = {
      id: generateId(),
      billNumber: receipt.billNumber || "",
      customerName: receipt.customerName || "",
      customerPhone: receipt.customerPhone,
      customerAddress: receipt.customerAddress,
      items: receipt.items || [],
      subtotal,
      discount: discountAmount,
      discountType: receipt.discountType || "amount",
      tax,
      taxRate: receipt.taxRate || 13,
      total,
      date: new Date().toISOString().split("T")[0],
      status: receipt.status || "pending",
      paymentMethod: receipt.paymentMethod || "cash",
      notes: receipt.notes,
      createdBy: user.name,
      createdAt: new Date().toISOString(),
    }

    dataStore.saveBill(newReceipt)
    toast({
      title: "Bill Created",
      description: `Bill ${newReceipt.billNumber} has been created successfully.`,
    })
    router.push(`/bills/${newReceipt.id}`)
  }

  const { subtotal, discountAmount, tax, total } = calculateTotals()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">New Receipt</h1>
            <p className="text-muted-foreground">Create a new sales receipt</p>
          </div>
        </div>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Receipt
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
                  value={receipt.customerName}
                  onChange={(e) => setReceipt((prev) => ({ ...prev, customerName: e.target.value }))}
                  placeholder="Enter customer name"
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Phone Number</Label>
                <Input
                  id="customerPhone"
                  value={receipt.customerPhone}
                  onChange={(e) => setReceipt((prev) => ({ ...prev, customerPhone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="customerAddress">Address</Label>
              <Textarea
                id="customerAddress"
                value={receipt.customerAddress}
                onChange={(e) => setReceipt((prev) => ({ ...prev, customerAddress: e.target.value }))}
                placeholder="Enter customer address"
              />
            </div>
          </CardContent>
        </Card>

          {/* Receipt Items */}
          <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Receipt Items</CardTitle>
              <Button onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow key="new-receipt-header">
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(receipt.items || []).map((item, index) => (
                  <TableRow key={`new-receipt-item-${item.id || index}`}>
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
                          value={item.name}
                          onChange={(e) => updateItem(index, "name", e.target.value)}
                          className="mt-2"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
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
                          value={item.rate}
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
            <CardTitle>Receipt Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="billNumber">Bill Number</Label>
                <Input
                  id="billNumber"
                  value={receipt.billNumber}
                  readOnly
                />
            </div>
            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select
                value={receipt.paymentMethod}
                onValueChange={(value) => setReceipt((prev) => ({ ...prev, paymentMethod: value as any }))}
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
                value={receipt.status}
                onValueChange={(value) => setReceipt((prev) => ({ ...prev, status: value as any }))}
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
            <CardTitle>Receipt Summary</CardTitle>
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
                value={receipt.discount}
                onChange={(e) => {
                  const val = Number.parseFloat(e.target.value)
                  setReceipt((prev) => ({ ...prev, discount: val < 0 ? 0 : val }))
                }}
                className="w-20"
              />
              <Select
                value={receipt.discountType}
                onValueChange={(value) => setReceipt((prev) => ({ ...prev, discountType: value as any }))}
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
                checked={receipt.applyVat}
                onChange={(e) => setReceipt((prev) => ({ ...prev, applyVat: e.target.checked }))}
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
                value={receipt.notes}
                onChange={(e) => setReceipt((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any additional notes..."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
