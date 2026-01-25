"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react"
import { dataStore } from "@/lib/data-store"
import type { Expense } from "@/lib/types"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { generateId } from "@/lib/utils"
import { getCurrentUser } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])

  // Use a static list of categories
  const staticCategories = [
    "Utilities",
    "Office Supplies & Consumables",
    "Rent or Lease Payments",
    "Salaries and Wages (Payroll)",
    "Maintenance and Repairs",
    "Other"
  ]

  const [customCategory, setCustomCategory] = useState("")

  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const { toast } = useToast()
  const [timePeriod, setTimePeriod] = useState<string>("all")
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    description: "",
    category: "",
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "cash",
    vendor: "",
    notes: "",
    isRecurring: false,
  })
  const [showDetails, setShowDetails] = useState<Expense | null>(null)

  useEffect(() => {
    async function loadData() {
      const loadedExpenses = await dataStore.getExpenses()
      setExpenses(loadedExpenses)
      setFilteredExpenses(loadedExpenses)
      loadedExpenses.forEach((expense: Expense) => {
        if (typeof expense.amount !== "number") {
          expense.amount = Number(expense.amount) || 0
        }
      })
    }
    loadData()
  }, [])

  useEffect(() => {
    let filtered = expenses
    if (searchTerm) {
      filtered = filtered.filter(
        (expense) =>
          expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }
    if (categoryFilter !== "all") {
      filtered = filtered.filter((expense) => expense.category === categoryFilter)
    }
    if (timePeriod !== "all") {
      const now = new Date()
      filtered = filtered.filter((expense) => {
        const expenseDate = new Date(expense.date)
        switch (timePeriod) {
          case "daily":
            return (
              expenseDate.getDate() === now.getDate() &&
              expenseDate.getMonth() === now.getMonth() &&
              expenseDate.getFullYear() === now.getFullYear()
            )
          case "weekly": {
            const oneJan = new Date(now.getFullYear(), 0, 1)
            const currentWeek = Math.ceil(
              ((now.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7,
            )
            const expenseWeek = Math.ceil(
              ((expenseDate.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7,
            )
            return expenseWeek === currentWeek && expenseDate.getFullYear() === now.getFullYear()
          }
          case "monthly":
            return (
              expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear()
            )
          case "quarterly": {
            const currentQuarter = Math.floor(now.getMonth() / 3)
            const expenseQuarter = Math.floor(expenseDate.getMonth() / 3)
            return expenseQuarter === currentQuarter && expenseDate.getFullYear() === now.getFullYear()
          }
          case "yearly":
            return expenseDate.getFullYear() === now.getFullYear()
          default:
            return true
        }
      })
    }
    setFilteredExpenses(filtered)
  }, [expenses, searchTerm, categoryFilter, timePeriod])

  const handleSave = async () => {
    const user = getCurrentUser()
    if (!user) return
    let categoryToSave = newExpense.category
    if (categoryToSave === "Other") {
      if (!customCategory.trim()) {
        toast({
          title: "Category Required",
          description: "Please enter a custom category name.",
          variant: "destructive",
        })
        return
      }
      categoryToSave = customCategory.trim()
    }
    const expense: Expense = {
      id: editingExpense?.id || generateId(),
      description: newExpense.description || "",
      category: categoryToSave || "",
      amount: newExpense.amount || 0,
      date: newExpense.date || "",
      paymentMethod: newExpense.paymentMethod || "cash",
      vendor: newExpense.vendor,
      notes: newExpense.notes,
      createdBy: user.name,
      createdAt: editingExpense?.createdAt || new Date().toISOString(),
      isRecurring: newExpense.isRecurring || false,
      recurringFrequency: newExpense.recurringFrequency ?? undefined,
    }
    try {
      const result = await dataStore.saveExpense(expense)
      console.log('Expense save result:', result)
      if (result && result.message) {
        const updatedExpenses = await dataStore.getExpenses()
        setExpenses(updatedExpenses)
        setIsDialogOpen(false)
        setEditingExpense(null)
        setNewExpense({
          description: "",
          category: "",
          amount: 0,
          date: new Date().toISOString().split("T")[0],
          paymentMethod: "cash",
          vendor: "",
          notes: "",
          isRecurring: false,
        })
        setCustomCategory("")
        toast({
          title: editingExpense ? "Expense Updated" : "Expense Added",
          description: `Expense has been ${editingExpense ? "updated" : "added"} successfully.`,
        })
      } else {
        toast({
          title: "Error",
          description: result?.error || "Failed to save expense.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save expense.",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setNewExpense({
      ...expense,
      category: expense.category || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      await dataStore.deleteExpense(id)
      const updatedExpenses = await dataStore.getExpenses()
      setExpenses(updatedExpenses)
      toast({
        title: "Expense Deleted",
        description: "Expense has been deleted successfully.",
      })
    }
  }

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + (typeof expense.amount === "number" && !isNaN(expense.amount) ? expense.amount : 0), 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">Track and manage your business expenses</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingExpense ? "Edit Expense" : "Add New Expense"}</DialogTitle>
              <DialogDescription>
                {editingExpense ? "Update the expense details." : "Enter the details for the new expense."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter expense description"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newExpense.category}
                  onValueChange={(value) => {
                    setNewExpense((prev) => ({ ...prev, category: value }))
                    if (value !== "Other") setCustomCategory("")
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {staticCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {newExpense.category === "Other" && (
                  <Input
                    className="mt-2"
                    placeholder="Enter new category name"
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={newExpense.amount}
                    onChange={(e) =>
                      setNewExpense((prev) => ({ ...prev, amount: Number.parseFloat(e.target.value) || 0 }))
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select
                  value={newExpense.paymentMethod}
                  onValueChange={(value) => setNewExpense((prev) => ({ ...prev, paymentMethod: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vendor">Vendor (Optional)</Label>
                <Input
                  id="vendor"
                  value={newExpense.vendor}
                  onChange={(e) => setNewExpense((prev) => ({ ...prev, vendor: e.target.value }))}
                  placeholder="Enter vendor name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={newExpense.notes}
                  onChange={(e) => setNewExpense((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave}>{editingExpense ? "Update Expense" : "Add Expense"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by description or vendor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {staticCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Expenses ({filteredExpenses.length})</CardTitle>
          <CardDescription>Complete list of business expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow key="expenses-header">
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      {expense.vendor && <p className="text-sm text-muted-foreground">{expense.vendor}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge style={{ backgroundColor: "#6B7280" }} className="text-white">
                      {expense.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(expense.amount)}</TableCell>
                  <TableCell>{formatDate(expense.date)}</TableCell>
                  <TableCell className="capitalize">{expense.paymentMethod.replace("_", " ")}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(expense)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowDetails(expense)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(expense.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Expense Details Dialog */}
      {showDetails && (
        <Dialog open={true} onOpenChange={() => setShowDetails(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Expense Details</DialogTitle>
              <DialogDescription>Full details of the selected expense</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><strong>Id:</strong> {showDetails.id}</div>
              <div><strong>Description:</strong> {showDetails.description}</div>
              <div><strong>Category:</strong> {showDetails.category}</div>
              <div><strong>Amount:</strong> {showDetails.amount}</div>
              <div><strong>Date:</strong> {showDetails.date}</div>
              <div><strong>Payment Method:</strong> {showDetails.paymentMethod}</div>
              <div><strong>Vendor:</strong> {showDetails.vendor}</div>
              <div><strong>Notes:</strong> {showDetails.notes}</div>
              <div><strong>Is Recurring:</strong> {showDetails.isRecurring ? "Yes" : "No"}</div>
              <div><strong>Recurring Frequency:</strong> {showDetails.recurringFrequency}</div>
              <div><strong>Created By:</strong> {showDetails.createdBy}</div>
              <div><strong>Created At:</strong> {showDetails.createdAt}</div>
              <div><strong>Updated By:</strong> {showDetails.updatedBy}</div>
              <div><strong>Updated At:</strong> {showDetails.updatedAt}</div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
