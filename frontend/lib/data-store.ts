import type { User, Product, Bill, BillItem, Expense, StoreSettings } from "./types"

const API_BASE_PRODUCTS = "/backend/products.php"
const API_BASE_BILLS = "/backend/bills.php"
const API_BASE_EXPENSES = "/backend/expenses.php"

const defaultStoreSettings: StoreSettings = {
  id: "1",
  storeName: "Gumi Super Mart",
  storeAddress: "Gurbhakot-13, Surkhet, Nepal",
  storePhone: "9841234567",
  storeEmail: "gumisupermart@gmail.com",
  taxRate: 13,
  currency: "NPR",
  billStartNumber: 1000,
  billPrefix: "B",
  bankDetails: {
    bankName: "Nepal Investment Bank",
    accountNumber: "01234567890",
    accountName: "Gumi Super Mart",
  },
}

class DataStore {
  // --- Local Storage Helpers ---
  private getFromStorage<T>(key: string, defaultValue: T): T {
    if (typeof window === "undefined") return defaultValue
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  }

  private setToStorage<T>(key: string, value: T): void {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error("Failed to save to localStorage:", error)
    }
  }

  // --- Users ---
  getUsers(): User[] {
    return this.getFromStorage("users", [])
  }

  saveUser(user: User): void {
    const users = this.getUsers()
    const index = users.findIndex((u) => u.id === user.id)
    if (index >= 0) {
      users[index] = user
    } else {
      users.push(user)
    }
    this.setToStorage("users", users)
  }

  deleteUser(id: string): void {
    const users = this.getUsers().filter((u) => u.id !== id)
    this.setToStorage("users", users)
  }

  // --- Products ---
  async getProducts(): Promise<Product[]> {
    try {
      const res = await fetch(API_BASE_PRODUCTS)
      if (!res.ok) throw new Error("Failed to fetch products")
      const data = await res.json()
      return data.map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        sellingPrice: item.selling_price,
        costPrice: item.cost_price,
        stock: item.stock,
        minStock: item.min_stock,
        barcode: item.barcode,
        description: item.description,
        createdAt: item.created_at,
        createdBy: item.created_by,
        updatedAt: item.updated_at,
        updatedBy: item.updated_by,
      }))
    } catch (error) {
      console.error("Error fetching products:", error)
      return []
    }
  }

  async saveProduct(product: Product): Promise<void> {
    const payload = {
      id: product.id,
      name: product.name,
      category: product.category,
      unit: product.unit,
      selling_price: product.sellingPrice,
      cost_price: product.costPrice,
      stock: product.stock,
      min_stock: product.minStock,
      barcode: product.barcode,
      description: product.description,
      createdBy: (product as any).createdBy,
      updatedBy: (product as any).updatedBy,
    }
    const res = await fetch(API_BASE_PRODUCTS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || "Failed to save product")
    }
  }

  async deleteProduct(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_PRODUCTS}?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || "Failed to delete product")
    }
  }

  // --- Bills ---
  async getBills(): Promise<Bill[]> {
    try {
      const res = await fetch(API_BASE_BILLS)
      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        throw new Error(
          `HTTP ${res.status} - ${res.statusText} | ${errorData?.message || 'No additional info'}`
        )
      }
      return await res.json()
    } catch (error: unknown) {
      console.error("Network error:", error)
      if (error instanceof Error) {
        throw new Error(`Network failure: ${error.message}`)
      } else {
        throw new Error("Network failure: Unknown error")
      }
    }
  }

  async saveBill(bill: Bill): Promise<void> {
    function formatDateTime(dateStr: string): string {
      const date = new Date(dateStr)
      const pad = (n: number) => n.toString().padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    }
    const payload = {
      bill_number: bill.billNumber,
      customer_name: bill.customerName,
      customer_phone: bill.customerPhone,
      customer_address: bill.customerAddress,
      subtotal: bill.subtotal,
      discount: bill.discount,
      discount_type: bill.discountType,
      vat_rate: bill.taxRate,
      vat_amount: bill.tax,
      net_amount: bill.total,
      date_time: formatDateTime(bill.date || new Date().toISOString()),
      status: bill.status,
      payment_method: bill.paymentMethod,
      notes: bill.notes,
      cashier_id: bill.createdBy,
      items: (bill.items || []).map((item: BillItem) => ({
        product_id: item.productId,
        product_name: item.name,
        quantity: item.quantity,
        price: item.rate,
        total_price: item.amount,
      })),
    }
    const res = await fetch(API_BASE_BILLS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || "Failed to save bill")
    }
  }

  async deleteBill(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_BILLS}?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || "Failed to delete bill")
    }
  }

  async getNextBillNumber(): Promise<string> {
    try {
      const bills = await this.getBills();
      const prefix = defaultStoreSettings.billPrefix + "-";
      let maxNumber = defaultStoreSettings.billStartNumber - 1;
      const usedNumbers = new Set<number>();

      bills.forEach(bill => {
        if (typeof bill.billNumber === 'string' && bill.billNumber.startsWith(prefix)) {
          const parts = bill.billNumber.split('-');
          const num = parseInt(parts[1]);
          if (!isNaN(num)) {
            usedNumbers.add(num);
            if (num > maxNumber) maxNumber = num;
          }
        }
      });

      // Find the next unused number (in case of gaps)
      let nextNumber = maxNumber + 1;
      while (usedNumbers.has(nextNumber)) {
        nextNumber++;
      }

      return `${defaultStoreSettings.billPrefix}-${nextNumber}`;
    } catch (error) {
      console.error("Error getting next bill number:", error);
      return `${defaultStoreSettings.billPrefix}-${defaultStoreSettings.billStartNumber}`;
    }
  }

  // --- Expenses ---
  async getExpenses(): Promise<Expense[]> {
    try {
      const res = await fetch(API_BASE_EXPENSES)
      if (!res.ok) throw new Error("Failed to fetch expenses")
      return await res.json()
    } catch (error) {
      console.error("Error fetching expenses:", error)
      return []
    }
  }

  async saveExpense(expense: Expense): Promise<any> {
    const payload = {
      id: expense.id,
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      date: expense.date,
      payment_method: expense.paymentMethod,
      vendor: expense.vendor,
      notes: expense.notes,
      is_recurring: expense.isRecurring,
      recurring_frequency: expense.recurringFrequency,
    }
    const res = await fetch(API_BASE_EXPENSES, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    })
    let data
    try {
      data = await res.json()
    } catch (e) {
      data = { error: 'Invalid server response' }
    }
    if (!res.ok || data.error) {
      console.error('Expense save error:', data.error || res.statusText)
      throw new Error(data.error || 'Failed to save expense')
    }
    return data
  }

  async deleteExpense(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_EXPENSES}?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || "Failed to delete expense")
    }
  }

  getStoreSettings(): StoreSettings {
    return this.getFromStorage("storeSettings", defaultStoreSettings)
  }

  saveStoreSettings(settings: StoreSettings): void {
    this.setToStorage("storeSettings", settings)
  }
}

export const dataStore = new DataStore()