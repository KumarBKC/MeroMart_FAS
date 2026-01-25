"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, FileText, TrendingUp, TrendingDown, DollarSign, RefreshCw } from "lucide-react"
import { dataStore } from "@/lib/data-store"
import type { Bill, Expense } from "@/lib/types"
import { formatCurrency, formatDate, exportToCSV, safeNumberFormat } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Helper to get start/end dates for a given report type
function getDateRangeForType(type: string) {
  const now = new Date();
  let from: Date, to: Date;
  switch (type) {
    case "daily":
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      to = new Date(from);
      break;
    case "weekly":
      from = new Date(now);
      from.setDate(now.getDate() - now.getDay()); // start of week (Sunday)
      to = new Date(from);
      to.setDate(from.getDate() + 6); // end of week (Saturday)
      break;
    case "monthly":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case "quarterly":
      const quarter = Math.floor(now.getMonth() / 3);
      from = new Date(now.getFullYear(), quarter * 3, 1);
      to = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      break;
    case "yearly":
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date(now.getFullYear(), 11, 31);
      break;
    default:
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
  }
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

export default function ReportsPage() {
  const [bills, setBills] = useState<Bill[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [reportType, setReportType] = useState("monthly")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [pendingCustom, setPendingCustom] = useState(false)

  useEffect(() => {
    // When reportType changes, update date range (unless custom)
    if (reportType !== "custom") {
      const { from, to } = getDateRangeForType(reportType);
      setDateFrom(from);
      setDateTo(to);
      setPendingCustom(false);
      fetchReportData();
    } else {
      setPendingCustom(true);
    }
    // eslint-disable-next-line
  }, [reportType]);

  // Fetch data function
  async function fetchReportData() {
    setLoading(true);
    setError("");
    try {
      const loadedBills = await dataStore.getBills();
      const loadedExpenses = await dataStore.getExpenses();
      setBills(loadedBills);
      setExpenses(loadedExpenses);
    } catch (err) {
      setError("Failed to load report data. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Initial load
  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line
  }, []);

  const filterDataByDate = (data: any[], dateField: string) => {
    if (!dateFrom || !dateTo) return data

    return data.filter((item) => {
      const itemDate = new Date(item[dateField])
      const fromDate = new Date(dateFrom)
      const toDate = new Date(dateTo)
      return itemDate >= fromDate && itemDate <= toDate
    })
  }

  // Robust expense date filtering: try 'date', fallback to 'date_time'
  function filterExpensesByDate(expenses: any[], from: string, to: string) {
    if (!from || !to) return expenses;
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return expenses.filter((exp) => {
      const dateStr = exp.date || exp.date_time;
      if (!dateStr) return false;
      const itemDate = new Date(dateStr);
      return itemDate >= fromDate && itemDate <= toDate;
    });
  }

  const filteredBills = filterDataByDate(bills, "date_time")
  const filteredExpenses = filterExpensesByDate(expenses, dateFrom, dateTo)

  // Calculate metrics
  const totalSales = filteredBills.reduce((sum, inv) => sum + (parseFloat(inv.total) || parseFloat(inv.net_amount) || 0), 0)
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0)
  const netProfit = totalSales - totalExpenses
  const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0
  const avgTransaction = filteredBills.length > 0 ? totalSales / filteredBills.length : 0

  // Sales by status
  const salesByStatus = filteredBills.reduce(
    (acc, bill) => {
      acc[bill.status] = (acc[bill.status] || 0) + bill.total
      return acc
    },
    {} as Record<string, number>,
  )

  // Expenses by category
  const expensesByCategory = filteredExpenses.reduce(
    (acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount
      return acc
    },
    {} as Record<string, number>,
  )

  // Top selling items
  const itemSales = filteredBills
    .flatMap((bill) => bill.items || [])
    .reduce(
      (acc, item) => {
        const key = item.name
        if (!acc[key]) {
          acc[key] = { name: item.name, quantity: 0, revenue: 0 }
        }
        acc[key].quantity += item.quantity
        acc[key].revenue += item.amount
        return acc
      },
      {} as Record<string, { name: string; quantity: number; revenue: number }>,
    )

  // FIX: sort by revenue, not as tuple
  type TopItem = { name: string; quantity: number; revenue: number }

  const topItems = (Object.values(itemSales) as TopItem[])
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  const exportProfitLoss = () => {
    try {
      const data = [
        { Category: "Revenue", Amount: totalSales },
        { Category: "Expenses", Amount: totalExpenses },
        { Category: "Net Profit", Amount: netProfit },
        { Category: "Profit Margin", Amount: `${safeNumberFormat(profitMargin)}%` },
      ]
      exportToCSV(data, `profit-loss-${dateFrom}-to-${dateTo}.csv`)
    } catch (error) {
      console.error("Failed to export profit & loss report:", error)
    }
  }

  const exportSalesReport = () => {
    try {
      const data = filteredBills.map((bill: Bill) => ({
        "Bill Number": bill.billNumber,
        Customer: bill.customerName,
        Date: bill.date,
        Amount: bill.total,
        Status: bill.status,
        "Payment Method": bill.paymentMethod,
      }))
      exportToCSV(data, `sales-report-${dateFrom}-to-${dateTo}.csv`)
    } catch (error) {
      console.error("Failed to export sales report:", error)
    }
  }

  const exportExpenseReport = () => {
    try {
      const data = filteredExpenses.map((exp) => ({
        Description: exp.description,
        Category: exp.category,
        Amount: exp.amount,
        Date: exp.date,
        "Payment Method": exp.paymentMethod,
        Vendor: exp.vendor || "",
      }))
      exportToCSV(data, `expense-report-${dateFrom}-to-${dateTo}.csv`)
    } catch (error) {
      console.error("Failed to export expense report:", error)
    }
  }

  if (loading) {
    return <div className="p-6">Loading report data...</div>
  }
  if (error) {
    return <div className="p-6 text-red-600">{error}</div>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Generate comprehensive financial reports and analytics</p>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
          <CardDescription>Select date range and report type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label htmlFor="dateFrom">From Date</Label>
              <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} disabled={reportType !== "custom"} />
            </div>
            <div>
              <Label htmlFor="dateTo">To Date</Label>
              <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} disabled={reportType !== "custom"} />
            </div>
            <div>
              <Label htmlFor="reportType">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={() => {
                  if (reportType === "custom") fetchReportData();
                }}
                disabled={reportType !== "custom"}
              >
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
            <p className="text-xs text-muted-foreground">{filteredBills.length} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">{filteredExpenses.length} expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">{safeNumberFormat(profitMargin, 1)}% margin</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Transaction</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(avgTransaction)}
            </div>
            <p className="text-xs text-muted-foreground">Per bill</p>
          </CardContent>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="profit" className="w-full">
        <div className="flex items-center mb-4">
          <TabsList className="flex-1 gap-x-10">
            <TabsTrigger value="profit">Profit & Loss</TabsTrigger>
            <TabsTrigger value="sales">Sales Report</TabsTrigger>
            <TabsTrigger value="expenses">Expense Report</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          <button
            className="ml-2 p-2 rounded hover:bg-muted transition-colors"
            title="Refresh Data"
            onClick={fetchReportData}
            type="button"
            aria-label="Refresh Data"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        <TabsContent value="profit" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Profit & Loss Statement</CardTitle>
                <CardDescription>
                  Financial performance from {formatDate(dateFrom)} to {formatDate(dateTo)}
                </CardDescription>
              </div>
              <Button onClick={exportProfitLoss} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-green-600">Revenue</h3>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Sales Revenue:</span>
                        <span className="font-medium">{formatCurrency(totalSales)}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-1">
                        <span>Total Revenue:</span>
                        <span>{formatCurrency(totalSales)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-red-600">Expenses</h3>
                    <div className="space-y-1">
                      {Object.entries(expensesByCategory).map(([category, amount]) => (
                        <div key={category} className="flex justify-between">
                          <span>{category}:</span>
                          <span className="font-medium">{formatCurrency(amount as number)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-semibold border-t pt-1">
                        <span>Total Expenses:</span>
                        <span>{formatCurrency(totalExpenses)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Net Profit:</span>
                    <span className={netProfit >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatCurrency(netProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Profit Margin:</span>
                    <span>{safeNumberFormat(profitMargin)}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sales vs Revenue Line Chart */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Sales vs Revenue</CardTitle>
              <CardDescription>Line chart comparing number of sales and total revenue over time</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Prepare chart data */}
              {(() => {
                // Generate 6 months of data (last 6 months)
                const months = [];
                const now = new Date();
                for (let i = 5; i >= 0; i--) {
                  const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
                  months.push({
                    label: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                    startDate: month.toISOString().split('T')[0],
                    endDate: new Date(month.getFullYear(), month.getMonth() + 1, 0).toISOString().split('T')[0]
                  });
                }

                // Group bills by month
                const salesByMonth: Record<string, { count: number; revenue: number }> = {};
                months.forEach(month => {
                  salesByMonth[month.label] = { count: 0, revenue: 0 };
                });
                // Process all bills (not just filtered ones) for the chart
                bills.forEach(bill => {
                  // Prefer bill.date, fallback to bill.date_time, otherwise skip
                  const dateString = bill.date || (bill as any).date_time || '';
                  const billDate = new Date(dateString);
                  if (isNaN(billDate.getTime())) return;
                  
                  const billMonth = billDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                  if (salesByMonth[billMonth]) {
                    salesByMonth[billMonth].count += 1;
                    // Handle both frontend and backend field names
                    const revenue = (bill as any).net_amount || bill.total || 0;
                    salesByMonth[billMonth].revenue += parseFloat(revenue.toString());
                  }
                });

                const labels = months.map(m => m.label);
                const salesCounts = labels.map(label => salesByMonth[label].count);
                const revenues = labels.map(label => salesByMonth[label].revenue);
                const data = {
                  labels,
                  datasets: [
                    {
                      label: 'Sales Count',
                      data: salesCounts,
                      borderColor: 'rgba(59,130,246,1)',
                      backgroundColor: 'rgba(59,130,246,0.8)',
                      yAxisID: 'y',
                    },
                    {
                      label: 'Revenue (Rs.)',
                      data: revenues,
                      borderColor: 'rgba(16,185,129,1)',
                      backgroundColor: 'rgba(16,185,129,0.8)',
                      yAxisID: 'y1',
                    },
                  ],
                };
                const options = {
                  responsive: true,
                  interaction: { mode: 'index' as const, intersect: false },
                  plugins: {
                    legend: { position: 'top' as const },
                    title: { display: false },
                  },
                  scales: {
                    y: {
                      type: 'linear' as const,
                      display: true,
                      position: 'left' as const,
                      title: { display: true, text: 'Sales Count' },
                    },
                    y1: {
                      type: 'linear' as const,
                      display: true,
                      position: 'right' as const,
                      grid: { drawOnChartArea: false },
                      title: { display: true, text: 'Revenue (Rs.)' },
                    },
                  },
                };
                return labels.length > 0 ? (
                  <Bar data={data} options={options} height={200} />
                ) : (
                  <div className="text-muted-foreground">No sales data available for the selected period.</div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sales Report</CardTitle>
                <CardDescription>
                  Detailed sales transactions from {formatDate(dateFrom)} to {formatDate(dateTo)}
                </CardDescription>
              </div>
              <Button onClick={exportSalesReport} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow key="sales-report-header">
                    <TableHead>Bill #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.map((bill, index) => (
                    <TableRow key={bill.bill_number || bill.billNumber || bill.id || index}>
                      <TableCell>{bill.bill_number || bill.billNumber || '-'}</TableCell>
                      <TableCell>{bill.customer_name || bill.customerName || '-'}</TableCell>
                      <TableCell>{bill.date_time ? formatDate(bill.date_time) : (bill.date ? formatDate(bill.date) : '-')}</TableCell>
                      <TableCell>{formatCurrency(parseFloat(bill.net_amount) || parseFloat(bill.total) || 0)}</TableCell>
                      <TableCell className="capitalize">{bill.status || '-'}</TableCell>
                      <TableCell className="capitalize">{(bill.payment_method || bill.paymentMethod) ? (bill.payment_method || bill.paymentMethod).replace("_", " ") : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Expense Report</CardTitle>
              <CardDescription>
                Detailed expense records from {formatDate(dateFrom)} to {formatDate(dateTo)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow key="expenses-report-header">
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Vendor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell>{expense.category}</TableCell>
                      <TableCell>{formatCurrency(expense.amount)}</TableCell>
                      <TableCell>{formatDate(expense.date)}</TableCell>
                      <TableCell className="capitalize">{expense.paymentMethod ? expense.paymentMethod.replace("_", " ") : "-"}</TableCell>
                      <TableCell>{expense.vendor || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Items</CardTitle>
                <CardDescription>Best performing products by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topItems.map((item, index) => (
                    <div key={item.name + '-' + index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(item.revenue)}</div>
                        <div className="text-sm text-muted-foreground">{item.quantity} sold</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sales by Status</CardTitle>
                <CardDescription>Revenue breakdown by payment status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(salesByStatus).map(([status, amount]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="capitalize font-medium">{status}</span>
                      <span className="font-medium">{formatCurrency(amount as number)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expense Categories</CardTitle>
                <CardDescription>Spending breakdown by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(expensesByCategory)
                    .sort((a, b) => (b[1] as number) - (a[1] as number))
                    .map(([category, amount]) => {
                      const percentage = totalExpenses > 0 ? ((amount as number) / totalExpenses) * 100 : 0
                      return (
                        <div key={category} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{category}</span>
                            <span>{formatCurrency(amount as number)}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full" style={{ width: `${percentage}%` }} />
                          </div>
                          <div className="text-sm text-muted-foreground text-right">{safeNumberFormat(percentage, 1)}%</div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Trends</CardTitle>
                <CardDescription>Revenue and expense trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(totalSales)}</div>
                    <div className="text-sm text-muted-foreground">Total Sales</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
                    <div className="text-sm text-muted-foreground">Total Expenses</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(netProfit)}
                    </div>
                    <div className="text-sm text-muted-foreground">Net Profit</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
