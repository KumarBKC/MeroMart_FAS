export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "cashier"
  storeId: string
  phone?: string
  address?: string
  createdAt: string
  isActive: boolean
}

export interface Product {
  id: string
  name: string
  category: string
  unit: string
  sellingPrice: number
  costPrice: number
  stock: number
  minStock: number
  barcode?: string
  description?: string
  createdAt: string
  createdBy?: string | null
  updatedAt?: string | null
  updatedBy?: string | null
}

export interface Bill {
  id: string
  billNumber: string
  customerName: string
  customerPhone?: string
  customerAddress?: string
  items: BillItem[]
  subtotal: number
  discount: number
  discountType: "percentage" | "amount"
  tax: number
  taxRate: number
  total: number
  date: string
  dueDate?: string
  status: "paid" | "pending" | "cancelled" | "overdue"
  paymentMethod: "cash" | "card" | "credit"
  notes?: string
  createdBy: string
  createdAt: string
  applyVat?: boolean
  cashier?: string
}

export interface BillItem {
  id: string
  productId: string
  name: string
  quantity: number
  rate: number
  amount: number
  unit: string
}

export interface Expense {
  id: string
  description: string
  category: string
  amount: number
  date: string
  paymentMethod: "cash" | "card" | "bank_transfer"
  vendor?: string
  receipt?: string
  notes?: string
  createdBy: string
  createdAt: string
  updatedBy?: string | null
  updatedAt?: string | null
  isRecurring: boolean
  recurringFrequency?: "monthly" | "quarterly" | "yearly"
}

export interface StoreSettings {
  id: string
  storeName: string
  storeAddress: string
  storePhone: string
  storeEmail: string
  taxRate: number
  currency: string
  billPrefix: string
  billStartNumber: number
  logoUrl?: string
  bankDetails?: {
    bankName: string
    accountNumber: string
    accountName: string
  }
}

export interface DashboardStats {
  totalSales: number
  totalExpenses: number
  netProfit: number
  totalBills: number
  pendingBills: number
  lowStockItems: number
  salesGrowth: number
  expenseGrowth: number
}
