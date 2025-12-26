
"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download, FileText, Phone, Mail, Building2, CreditCard, Wallet } from "lucide-react"

// --- Mock Data ---

interface Transaction {
    id: string
    date: string
    type: "Purchase" | "Payment"
    poNumber?: string
    vehicleNumber?: string
    description: string
    liters?: number
    amount: number
}

// Mocking transaction history for a few companies
const TRANSACTIONS: { [key: string]: Transaction[] } = {
    "1": [ // ABC Logistics
        { id: "t1", date: "2024-10-24 08:30", type: "Purchase", poNumber: "PO-8821", vehicleNumber: "WP-CA-1234", description: "Diesel - 50L", liters: 50, amount: 17000 },
        { id: "t2", date: "2024-10-24 14:15", type: "Purchase", poNumber: "PO-8822", vehicleNumber: "WP-CB-5678", description: "Diesel - 100L", liters: 100, amount: 34000 },
        { id: "t3", date: "2024-10-23 09:00", type: "Payment", description: "Bank Transfer - Oct Payment", amount: -50000 },
        { id: "t4", date: "2024-10-22 11:20", type: "Purchase", poNumber: "PO-8819", vehicleNumber: "WP-CA-1234", description: "Diesel - 60L", liters: 60, amount: 20400 },
    ],
    "2": [ // City Taxis
        { id: "t5", date: "2024-10-24 10:00", type: "Purchase", vehicleNumber: "WP-QA-1111", description: "Petrol 92 - 25L", liters: 25, amount: 9250 },
        { id: "t6", date: "2024-10-20 15:00", type: "Payment", description: "Cash Payment", amount: -15000 },
    ]
}

const COMPANIES = [
    { id: "1", name: "ABC Logistics", contactPerson: "John Doe", email: "john@abc.com", phone: "077-1234567", creditLimit: 500000, currentBalance: 125000, address: "123, Logistics Way, Colombo 01" },
    { id: "2", name: "City Taxis", contactPerson: "Jane Smith", email: "jane@citytaxis.com", phone: "071-9876543", creditLimit: 100000, currentBalance: -5000, address: "45, Taxi Stand, Kandy" },
    { id: "3", name: "Green Farms", contactPerson: "Mike Brown", email: "mike@greenfarms.lk", phone: "076-5551212", creditLimit: 750000, currentBalance: 450000, address: "No 5, Farm Road, Nuwara Eliya" },
    { id: "4", name: "Metro Bus Svc", contactPerson: "Sarah Lee", email: "accts@metrobus.lk", phone: "011-2345678", creditLimit: 2000000, currentBalance: 0, address: "Central Bus Stand, Pettah" },
    { id: "5", name: "Tech Solutions", contactPerson: "David Kim", email: "david@techsol.com", phone: "077-7778888", creditLimit: 300000, currentBalance: 320000, address: "Tech Park, Malabe" },
]

export default function CompanyDetailsPage() {
    const params = useParams()
    const id = params?.id as string | undefined

    // Local state for data
    const [company, setCompany] = React.useState<typeof COMPANIES[0] | undefined>(undefined)
    const [transactions, setTransactions] = React.useState<Transaction[]>([])

    // Payment Form state
    const [isPaymentFormOpen, setIsPaymentFormOpen] = React.useState(false)
    const [paymentAmount, setPaymentAmount] = React.useState("")
    const [paymentMethod, setPaymentMethod] = React.useState("Cash")
    const [paymentRef, setPaymentRef] = React.useState("")
    const [paymentDate, setPaymentDate] = React.useState(new Date().toISOString().split('T')[0])

    // Edit Mode State
    const [isEditing, setIsEditing] = React.useState(false)
    const [editForm, setEditForm] = React.useState<typeof COMPANIES[0] | undefined>(undefined)

    // Load data from mock on mount
    React.useEffect(() => {
        if (id) {
            const foundCompany = COMPANIES.find((c) => c.id === id)
            setCompany(foundCompany)
            setEditForm(foundCompany)
            setTransactions(TRANSACTIONS[id] || [])
        }
    }, [id])

    const handleSavePayment = () => {
        if (!company) return
        const amount = parseFloat(paymentAmount)
        if (isNaN(amount) || amount <= 0) return

        const newTransaction: Transaction = {
            id: `tp-${Date.now()}`,
            date: `${paymentDate} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            type: "Payment",
            description: `${paymentMethod} Payment`,
            amount: -amount, // Payments are negative in this model
            vehicleNumber: paymentRef
        }

        // Update local state
        setTransactions(prev => [newTransaction, ...prev])
        setCompany(prev => prev ? { ...prev, currentBalance: prev.currentBalance - amount } : undefined)

        // Reset form
        setIsPaymentFormOpen(false)
        setPaymentAmount("")
        setPaymentRef("")
        setPaymentMethod("Cash")
    }

    const handleSaveEdit = () => {
        if (!editForm) return
        setCompany(editForm)
        setIsEditing(false)
    }

    // Simple loading or not found state
    if (!id) {
        return <div className="p-8">Loading...</div>
    }

    if (!company || !editForm) {
        return (
            <div className="p-8 space-y-4">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/accounts">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Accounts
                    </Link>
                </Button>
                <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-muted/20">
                    <h2 className="text-xl font-semibold">Company Not Found</h2>
                    <p className="text-muted-foreground">ID: {id}</p>
                </div>
            </div>
        )
    }

    // Calculate stats
    const totalPurchases = transactions.filter(t => t.type === "Purchase").reduce((acc, t) => acc + t.amount, 0)
    const lastPayment = transactions.find(t => t.type === "Payment")

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            {/* Navigation */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground hover:text-foreground" asChild>
                        <Link href="/accounts">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Accounts
                        </Link>
                    </Button>
                </div>
                {!isEditing && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        <FileText className="h-4 w-4 mr-2" />
                        Edit Details
                    </Button>
                )}
            </div>

            {/* Header / Edit Form */}
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                <div className="space-y-2 flex-1 max-w-2xl">
                    {isEditing ? (
                        <div className="space-y-4 border p-4 rounded-md bg-muted/10">
                            <h3 className="text-sm font-semibold mb-2">Edit Company Details</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <label className="text-xs font-medium text-muted-foreground">Company Name</label>
                                    <input
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-xs font-medium text-muted-foreground">Address</label>
                                    <input
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={editForm.address}
                                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">Contact Person</label>
                                    <input
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={editForm.contactPerson}
                                        onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">Phone</label>
                                    <input
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">Email</label>
                                    <input
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">Credit Limit</label>
                                    <input
                                        type="number"
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={editForm.creditLimit}
                                        onChange={(e) => setEditForm({ ...editForm, creditLimit: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button size="sm" onClick={handleSaveEdit}>Save Changes</Button>
                                <Button size="sm" variant="ghost" onClick={() => {
                                    setIsEditing(false)
                                    setEditForm(company) // Reset
                                }}>Cancel</Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-3xl font-bold tracking-tight">{company.name}</h2>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                    <Building2 className="h-3.5 w-3.5" />
                                    <span>{company.address}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5" />
                                    <span>{company.contactPerson}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Phone className="h-3.5 w-3.5" />
                                    <span>{company.phone}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Mail className="h-3.5 w-3.5" />
                                    <span>{company.email}</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                        <p className="text-sm font-medium text-muted-foreground">Current Balance</p>
                        <div className={`text-3xl font-bold ${company.currentBalance > 0
                            ? company.currentBalance > company.creditLimit ? "text-red-600" : "text-orange-600"
                            : "text-green-600"
                            }`}>
                            LKR {company.currentBalance.toLocaleString()}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                        <span>Credit Limit:</span>
                        <span className="font-semibold text-foreground">LKR {company.creditLimit.toLocaleString()}</span>
                    </div>
                    <div className="mt-2 flex gap-2">
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => setIsPaymentFormOpen(!isPaymentFormOpen)}
                        >
                            <CreditCard className="mr-2 h-4 w-4" />
                            Record Payment
                        </Button>
                        <Button size="sm" variant="outline">
                            <Download className="mr-2 h-4 w-4" />
                            Statement
                        </Button>
                    </div>
                </div>
            </div>

            {/* Payment Form */}
            {isPaymentFormOpen && (
                <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-900">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">New Payment Entry</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Amount (LKR)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">LKR</span>
                                    <input
                                        type="number"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-12 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="0.00"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="Cheque">Cheque</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Reference / Note</label>
                                <input
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="e.g. Chq No, Slip ID"
                                    value={paymentRef}
                                    onChange={(e) => setPaymentRef(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                    onClick={handleSavePayment}
                                >
                                    Save
                                </Button>
                                <Button variant="outline" onClick={() => setIsPaymentFormOpen(false)}>Cancel</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Purchases (M)</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">LKR {totalPurchases.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Last Payment</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{lastPayment ? `LKR ${Math.abs(lastPayment.amount).toLocaleString()}` : "N/A"}</div>
                        <p className="text-xs text-muted-foreground">{lastPayment ? lastPayment.date.split(' ')[0] : "No recent payments"}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Transactions Table */}
            <div className="space-y-4">
                <h3 className="text-xl font-semibold tracking-tight">Transaction History</h3>

                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead className="text-right">Amount (LKR)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No transactions found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transactions.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell className="font-medium whitespace-nowrap">{t.date}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{t.type}</span>
                                                <span className="text-xs text-muted-foreground">{t.description}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {t.type === "Purchase" ? (
                                                <div className="flex flex-col gap-1">
                                                    {t.poNumber && <Badge variant="secondary" className="w-fit font-normal text-[10px]">PO: {t.poNumber}</Badge>}
                                                    {t.vehicleNumber && <Badge variant="outline" className="w-fit font-normal text-[10px]">{t.vehicleNumber}</Badge>}
                                                </div>
                                            ) : (
                                                <>
                                                    {t.vehicleNumber && <Badge variant="secondary" className="w-fit font-normal text-[10px]">{t.vehicleNumber}</Badge>}
                                                    {!t.vehicleNumber && <span className="text-xs text-muted-foreground">-</span>}
                                                </>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {t.liters ? `${t.liters.toFixed(2)} L` : "-"}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            <span className={t.type === "Payment" ? "text-green-600" : ""}>
                                                {t.amount.toLocaleString()}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}
