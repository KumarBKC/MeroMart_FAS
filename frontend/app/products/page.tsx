"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit, Trash2, Package, AlertTriangle } from "lucide-react"
import { dataStore } from "@/lib/data-store"
import type { Product } from "@/lib/types"
import { formatCurrency, generateId, safeNumberFormat } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { useToast } from "@/hooks/use-toast"
import { getCurrentUser } from "@/lib/auth"

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { toast } = useToast()

  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: "",
    category: "",
    unit: "piece",
    sellingPrice: 0,
    costPrice: 0,
    stock: 0,
    minStock: 5,
    barcode: "",
    description: "",
  })

  useEffect(() => {
    async function loadProducts() {
      try {
        const loadedProducts = await dataStore.getProducts()
        setProducts(loadedProducts)
        setFilteredProducts(loadedProducts)
        setLoadError(null)
      } catch (error) {
        console.error("Failed to load products:", error)
        setLoadError("Failed to load products. Please check backend API.")
        toast({
          title: "Error",
          description: "Failed to load products",
          variant: "destructive",
        })
      }
    }
    loadProducts()
  }, [toast])

  useEffect(() => {
    if (!searchTerm) {
      setFilteredProducts(products)
      return
    }
    const lowerSearch = searchTerm.toLowerCase()
    const filtered = products.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerSearch) ||
        p.category.toLowerCase().includes(lowerSearch) ||
        (p.barcode?.toLowerCase().includes(lowerSearch) ?? false)
    )
    setFilteredProducts(filtered)
  }, [products, searchTerm])

  const resetNewProduct = () => {
    setNewProduct({
      name: "",
      category: "",
      unit: "piece",
      sellingPrice: 0,
      costPrice: 0,
      stock: 0,
      minStock: 5,
      barcode: "",
      description: "",
    })
  }

  const handleSave = async () => {
    if (
      (newProduct.costPrice ?? 0) < 0 ||
      (newProduct.sellingPrice ?? 0) < 0 ||
      (newProduct.stock ?? 0) < 0 ||
      (newProduct.minStock ?? 0) < 0
    ) {
      toast({
        title: "Invalid Input",
        description: "Cost Price, Selling Price, Stock, and Minimum Stock must be non-negative values.",
        variant: "destructive",
      })
      return
    }

    const product: Product = {
      id: editingProduct?.id || generateId(),
      name: newProduct.name || "",
      category: newProduct.category || "",
      unit: newProduct.unit || "piece",
      sellingPrice: newProduct.sellingPrice || 0,
      costPrice: newProduct.costPrice || 0,
      stock: newProduct.stock || 0,
      minStock: newProduct.minStock || 5,
      barcode: newProduct.barcode,
      description: newProduct.description,
      createdAt: editingProduct?.createdAt || new Date().toISOString(),
    }

    try {
      const currentUser = getCurrentUser()
      await dataStore.saveProduct({
        ...product,
        createdBy: editingProduct ? undefined : currentUser?.id || null,
        updatedBy: editingProduct ? currentUser?.id || null : undefined,
      })
      const updatedProducts = await dataStore.getProducts()
      setProducts(updatedProducts)
      setFilteredProducts(updatedProducts)
      setIsDialogOpen(false)
      setEditingProduct(null)
      resetNewProduct()
      toast({
        title: editingProduct ? "Product Updated" : "Product Added",
        description: `Product has been ${editingProduct ? "updated" : "added"} successfully.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to save product",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setNewProduct(product)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await dataStore.deleteProduct(id)
        const updatedProducts = await dataStore.getProducts()
        setProducts(updatedProducts)
        setFilteredProducts(updatedProducts)
        toast({
          title: "Product Deleted",
          description: "Product has been deleted successfully.",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: (error as Error).message || "Failed to delete product",
          variant: "destructive",
        })
      }
    }
  }

  const lowStockProducts = products.filter((p) => p.stock <= p.minStock)
  const totalProducts = products.length
  const totalValue = products.reduce((sum, p) => sum + p.stock * p.costPrice, 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">Manage your inventory and product catalog</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
              <DialogDescription>
                {editingProduct ? "Update the product details." : "Enter the details for the new product."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="productName">Product Name</Label>
                  <Input
                    id="productName"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter product name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, category: e.target.value }))}
                    placeholder="Enter category"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, unit: e.target.value }))}
                    placeholder="kg, piece, liter"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="costPrice">Cost Price</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    min={0}
                    value={newProduct.costPrice}
                    onChange={(e) =>
                      setNewProduct((prev) => ({ ...prev, costPrice: Number.parseFloat(e.target.value) || 0 }))
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sellingPrice">Selling Price</Label>
                  <Input
                    id="sellingPrice"
                    type="number"
                    min={0}
                    value={newProduct.sellingPrice}
                    onChange={(e) =>
                      setNewProduct((prev) => ({ ...prev, sellingPrice: Number.parseFloat(e.target.value) || 0 }))
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="stock">Current Stock</Label>
                  <Input
                    id="stock"
                    type="number"
                    min={0}
                    value={newProduct.stock}
                    onChange={(e) =>
                      setNewProduct((prev) => ({ ...prev, stock: Number.parseInt(e.target.value) || 0 }))
                    }
                    placeholder="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="minStock">Minimum Stock</Label>
                  <Input
                    id="minStock"
                    type="number"
                    min={0}
                    value={newProduct.minStock}
                    onChange={(e) =>
                      setNewProduct((prev) => ({ ...prev, minStock: Number.parseInt(e.target.value) || 0 }))
                    }
                    placeholder="5"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="barcode">Barcode (Optional)</Label>
                <Input
                  id="barcode"
                  value={newProduct.barcode}
                  onChange={(e) => setNewProduct((prev) => ({ ...prev, barcode: e.target.value }))}
                  placeholder="Enter barcode"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Product description..."
                />
              </div>
            </div>
          <DialogFooter>
              <Button type="button" onClick={handleSave}>{editingProduct ? "Update Product" : "Add Product"}</Button>
          </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">Active products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">Total stock value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">Need restocking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(products.map((p) => p.category)).size}</div>
            <p className="text-xs text-muted-foreground">Product categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, category, or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert
            </CardTitle>
            <CardDescription className="text-red-700">The following products are running low on stock:</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-2 bg-white rounded">
                  <span className="font-medium">{product.name}</span>
                  <Badge variant="destructive">
                    {product.stock} {product.unit} left
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Products ({filteredProducts.length})</CardTitle>
          <CardDescription>Complete product inventory</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow key="products-header">
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Cost Price</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const profit = Number(product.sellingPrice) - Number(product.costPrice)
                const profitMargin = Number(product.costPrice) > 0 ? (profit / Number(product.costPrice)) * 100 : 0
                const isLowStock = product.stock <= product.minStock

                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.unit}</p>
                      </div>
                    </TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={isLowStock ? "text-red-600 font-medium" : ""}>{product.stock}</span>
                        {isLowStock && <AlertTriangle className="h-4 w-4 text-red-600" />}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(Number(product.costPrice) || 0)}</TableCell>
                    <TableCell>{formatCurrency(Number(product.sellingPrice) || 0)}</TableCell>
                    <TableCell>
                      <div>
                        <span className={profit >= 0 ? "text-green-600" : "text-red-600"}>
                          {formatCurrency(profit)}
                        </span>
                        <p className="text-xs text-muted-foreground">{safeNumberFormat(profitMargin, 1)}%</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
