"use client"

import { useState, useEffect, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, Save, Settings, Users, Store, Palette } from "lucide-react"
import { dataStore } from "@/lib/data-store"
import type { User, StoreSettings, Bill, Expense } from "@/lib/types"
import { generateId } from "@/lib/utils"
import { getCurrentUser } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { AuthGuard } from "@/components/auth-guard"

// Utility function to replace Nepali currency with Rs
function formatCurrency(value: string | number) {
  if (typeof value !== 'string') return value;
  return value.replace(/रु/g, 'Rs');
}

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [usersError, setUsersError] = useState<string | null>(null)
  const [storeSettings, setStoreSettings] = useState<any>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [passwords, setPasswords] = useState({ old: '', new: '' })
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [bills, setBills] = useState<Bill[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const { toast } = useToast()

  const [newUser, setNewUser] = useState<Partial<User>>({
    name: "",
    email: "",
    role: "cashier",
    phone: "",
    address: "",
    isActive: true,
  })

  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    fetch('/backend/settings.php?action=get_store_settings')
      .then(async res => {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          setStoreSettings(data)
          setLogoPreview(data.store_logo || null)
        } catch (e) {
          toast({ title: 'Error', description: 'Invalid server response', variant: 'destructive' });
          console.error('Invalid JSON:', text);
        }
      })
      .catch(err => toast({ title: 'Error', description: 'Failed to fetch settings', variant: 'destructive' }))
    // Fetch users from backend
    fetch('/backend/users.php')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Map is_active to isActive for each user
          setUsers(data.map((user: any) => ({ ...user, isActive: user.is_active !== undefined ? !!user.is_active : true })));
          setUsersError(null)
        } else {
          setUsers([])
          setUsersError(data.error || 'Failed to fetch users')
        }
      })
      .catch(err => {
        setUsers([])
        setUsersError('Failed to fetch users')
        console.error('Failed to fetch users:', err)
      })

    async function fetchData() {
      try {
        const billsData = await dataStore.getBills()
        setBills(billsData)
      } catch (error) {
        console.error("Failed to fetch bills:", error)
      }

      try {
        const expensesData = await dataStore.getExpenses()
        setExpenses(expensesData)
      } catch (error) {
        console.error("Failed to fetch expenses:", error)
      }
    }

    fetchData()
  }, [])

  // Helper for non-admins
  const adminOnlyAction = () => {
    if (!isAdmin) {
      toast({
        title: "Admins Only",
        description: "Only admins can make changes to settings.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSaveUser = () => {
    if (!adminOnlyAction()) return;
    const user: User = {
      id: editingUser?.id || generateId(),
      name: newUser.name || "",
      email: newUser.email || "",
      role: newUser.role || "cashier",
      storeId: "gumi-super-mart",
      phone: newUser.phone,
      address: newUser.address,
      createdAt: editingUser?.createdAt || new Date().toISOString(),
      isActive: newUser.isActive || true,
    }

    dataStore.saveUser(user)
    const updatedUsers = dataStore.getUsers()
    setUsers(updatedUsers)

    setIsUserDialogOpen(false)
    setEditingUser(null)
    setNewUser({
      name: "",
      email: "",
      role: "cashier",
      phone: "",
      address: "",
      isActive: true,
    })

    toast({
      title: editingUser ? "User Updated" : "User Added",
      description: `User has been ${editingUser ? "updated" : "added"} successfully.`,
    })
  }

  const handleEditUser = (user: User) => {
    if (!adminOnlyAction()) return;
    setEditingUser(user)
    setNewUser(user)
    setIsUserDialogOpen(true)
  }

  const handleDeleteUser = (id: string) => {
    if (!adminOnlyAction()) return;
    const currentUser = getCurrentUser()
    if (currentUser?.id === id) {
      toast({
        title: "Cannot Delete",
        description: "You cannot delete your own account.",
        variant: "destructive",
      })
      return
    }

    if (confirm("Are you sure you want to delete this user?")) {
      dataStore.deleteUser(id)
      const updatedUsers = dataStore.getUsers()
      setUsers(updatedUsers)
      toast({
        title: "User Deleted",
        description: "User has been deleted successfully.",
      })
    }
  }

  const handleSaveStoreSettings = async () => {
    if (!adminOnlyAction()) return
    const payload = { ...storeSettings }
    // If logo file selected, handle upload (not implemented here)
    await fetch('/backend/settings.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_store_settings', settings: payload })
    })
      .then(res => res.json())
      .then(data => toast({ title: 'Settings Saved', description: data.message }))
      .catch(() => toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' }))
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => setLogoPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
      setStoreSettings((prev: any) => ({ ...prev, store_logo: file.name }))
    }
  }

  const handleChangePassword = async () => {
    await fetch('/backend/settings.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'change_password', old_password: passwords.old, new_password: passwords.new })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) toast({ title: 'Error', description: data.error, variant: 'destructive' })
        else toast({ title: 'Password Changed', description: data.message })
        setShowPasswordDialog(false)
        setPasswords({ old: '', new: '' })
      })
      .catch(() => toast({ title: 'Error', description: 'Failed to change password', variant: 'destructive' }))
  }

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Manage your store settings and preferences</p>
          </div>
          <Button variant="outline" onClick={() => setShowPasswordDialog(true)}>Change Password</Button>
        </div>
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Label>Old Password</Label>
              <Input type="password" value={passwords.old} onChange={e => setPasswords(p => ({ ...p, old: e.target.value }))} />
              <Label>New Password</Label>
              <Input type="password" value={passwords.new} onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button onClick={handleChangePassword}>Change</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general"><Store className="mr-2 h-4 w-4" />General</TabsTrigger>
            <TabsTrigger value="users"><Users className="mr-2 h-4 w-4" />Users</TabsTrigger>
            <TabsTrigger value="system"><Settings className="mr-2 h-4 w-4" />System</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Store Information</CardTitle><CardDescription>Basic information about your store</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="storeName">Store Name</Label>
                    <Input id="storeName" value={storeSettings?.store_name || ''} onChange={e => setStoreSettings((prev: any) => ({ ...prev, store_name: e.target.value }))} disabled={!isAdmin} />
                  </div>
                  <div>
                    <Label htmlFor="storePhone">Phone Number</Label>
                    <Input id="storePhone" value={storeSettings?.store_phone || ''} onChange={e => setStoreSettings((prev: any) => ({ ...prev, store_phone: e.target.value }))} disabled={!isAdmin} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="storeAddress">Address</Label>
                  <Textarea id="storeAddress" value={storeSettings?.store_address || ''} onChange={e => setStoreSettings((prev: any) => ({ ...prev, store_address: e.target.value }))} disabled={!isAdmin} />
                </div>
                <div>
                  <Label htmlFor="storeEmail">Email</Label>
                  <Input id="storeEmail" type="email" value={storeSettings?.store_email || ''} onChange={e => setStoreSettings((prev: any) => ({ ...prev, store_email: e.target.value }))} disabled={!isAdmin} />
                </div>
                <div>
                  <Label htmlFor="panVat">PAN/VAT Number</Label>
                  <Input id="panVat" value={storeSettings?.pan_vat_number || ''} onChange={e => setStoreSettings((prev: any) => ({ ...prev, pan_vat_number: e.target.value }))} disabled={!isAdmin} />
                </div>
                <div>
                  <Label htmlFor="storeLogo">Store Logo</Label>
                  <Input id="storeLogo" type="file" ref={logoInputRef} onChange={handleLogoChange} disabled={!isAdmin} />
                  {logoPreview && <img src={logoPreview} alt="Logo Preview" className="h-16 mt-2" />}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Bill Settings</CardTitle><CardDescription>Configure bill generation settings</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="billPrefix">Bill Prefix</Label>
                    <Input id="billPrefix" value={storeSettings?.bill_prefix || ''} onChange={e => setStoreSettings((prev: any) => ({ ...prev, bill_prefix: e.target.value }))} disabled={!isAdmin} />
                  </div>
                  <div>
                    <Label htmlFor="billStartNumber">Starting Number</Label>
                    <Input id="billStartNumber" type="number" value={storeSettings?.bill_start_number || 1} onChange={e => setStoreSettings((prev: any) => ({ ...prev, bill_start_number: Number.parseInt(e.target.value) || 1 }))} disabled={!isAdmin} />
                  </div>
                  <div>
                    <Label htmlFor="taxRate">Default Tax Rate (%)</Label>
                    <Input id="taxRate" type="number" step="0.01" value={storeSettings?.tax_rate || 13} onChange={e => setStoreSettings((prev: any) => ({ ...prev, tax_rate: Number.parseFloat(e.target.value) || 13 }))} disabled={!isAdmin} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="billFooter">Bill Footer Message</Label>
                  <Textarea id="billFooter" value={storeSettings?.bill_footer_message || ''} onChange={e => setStoreSettings((prev: any) => ({ ...prev, bill_footer_message: e.target.value }))} disabled={!isAdmin} />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="enableVat" checked={!!storeSettings?.enable_vat} onCheckedChange={checked => setStoreSettings((prev: any) => ({ ...prev, enable_vat: checked }))} disabled={!isAdmin} />
                  <Label htmlFor="enableVat">Enable VAT on invoices</Label>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Inventory Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="lowStock">Low Stock Threshold</Label>
                  <Input id="lowStock" type="number" value={storeSettings?.low_stock_threshold || 5} onChange={e => setStoreSettings((prev: any) => ({ ...prev, low_stock_threshold: Number.parseInt(e.target.value) || 5 }))} disabled={!isAdmin} />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="allowNegativeStock" checked={!!storeSettings?.allow_negative_stock} onCheckedChange={checked => setStoreSettings((prev: any) => ({ ...prev, allow_negative_stock: checked }))} disabled={!isAdmin} />
                  <Label htmlFor="allowNegativeStock">Allow Negative Stock?</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>User & Role Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="defaultUserRole">Default Role on User Creation</Label>
                  <Select value={storeSettings?.default_user_role || 'cashier'} onValueChange={val => setStoreSettings((prev: any) => ({ ...prev, default_user_role: val }))} disabled={!isAdmin}>
                    <SelectTrigger id="defaultUserRole">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="cashier">Cashier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="loginRestrictions" checked={!!storeSettings?.login_restrictions} onCheckedChange={checked => setStoreSettings((prev: any) => ({ ...prev, login_restrictions: checked }))} disabled={!isAdmin} />
                  <Label htmlFor="loginRestrictions">Enable User Login Restrictions</Label>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Store ID</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(users) && users.filter(u => u.isActive).length > 0 ? users.filter(u => u.isActive).map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.id}</TableCell>
                        <TableCell>{user.name || '-'}</TableCell>
                        <TableCell>{user.email || '-'}</TableCell>
                        <TableCell>{user.role || '-'}</TableCell>
                        <TableCell>{(user as any).employeeId || '-'}</TableCell>
                        <TableCell>{(user as any).storeId || '-'}</TableCell>
                        <TableCell>{user.phone ? formatCurrency(user.phone) : '-'}</TableCell>
                        <TableCell>{user.address || '-'}</TableCell>
                        <TableCell>{user.createdAt || '-'}</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>{user.isActive ? "Active" : "Inactive"}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center text-gray-500">
                          No users found or failed to load users.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>General System Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Input id="dateFormat" value={storeSettings?.date_format || 'YYYY-MM-DD'} onChange={e => setStoreSettings((prev: any) => ({ ...prev, date_format: e.target.value }))} disabled={!isAdmin} />
                </div>
                <div>
                  <Label htmlFor="currencySymbol">Currency Symbol</Label>
                  <Input id="currencySymbol" value={storeSettings?.currency_symbol || 'Rs.'} onChange={e => setStoreSettings((prev: any) => ({ ...prev, currency_symbol: e.target.value }))} disabled={!isAdmin} />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input id="timezone" value={storeSettings?.timezone || 'Asia/Kathmandu'} onChange={e => setStoreSettings((prev: any) => ({ ...prev, timezone: e.target.value }))} disabled={!isAdmin} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        {isAdmin && (
          <Button onClick={handleSaveStoreSettings}>Save</Button>
        )}
      </div>
    </AuthGuard>
  )
}
