// Sample data for demonstration
export interface Bill {
  id: string
  billNumber: string
  customerName: string
  customerPhone?: string
  items: BillItem[]
  subtotal: number
  discount: number
  vatRate: number
  vatAmount: number
  netAmount: number
  date: string
  status: "paid" | "pending" | "cancelled" | "overdue" | "cancelled"
  paymentMethod?: string
  notes?: string
  cashierId?: string
}

export interface BillItem {
  id: string
  productId: string
  productName: string
  quantity: number
  price: number
  totalPrice: number
}

export interface Expense {
  id: string
  description: string
  category: string
  amount: number
  date: string
  paymentMethod?: string
  vendor?: string
  notes?: string
  createdBy: string
  updatedBy?: string
}

export interface ExpenseCategory {
  id: string
  name: string
  description: string
}

// export const sampleBills: Bill[] = [ ... ]
// export const sampleExpenses: Expense[] = [ ... ]
