
"use client"

import * as React from "react"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlusCircle, FileText, CreditCard, Wallet, TrendingUp, Upload, CheckCircle2, Clock, Pencil, Sun, Moon, CalendarRange, Filter } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"

// --- Types & Helpers ---

type TimeRange = "Today" | "7 Days" | "Month" | "Year" | "All Time" | "Specific Date"

const MOCK_CURRENT_DATE = new Date("2024-10-25") // Fixed "Today" for demo

const isWithinRange = (dateStr: string, range: TimeRange, specificDate?: Date): boolean => {
    const date = new Date(dateStr)
    const diffTime = MOCK_CURRENT_DATE.getTime() - date.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (range === "Today") return diffDays === 0
    if (range === "7 Days") return diffDays >= 0 && diffDays <= 7
    if (range === "Month") return diffDays >= 0 && diffDays <= 30
    if (range === "Year") return diffDays >= 0 && diffDays <= 365
    if (range === "Specific Date" && specificDate) {
        return date.toISOString().split('T')[0] === specificDate.toISOString().split('T')[0]
    }
    return true // All Time
}

const getMultiplier = (range: TimeRange): number => {
    if (range === "Today") return 1
    if (range === "7 Days") return 7
    if (range === "Month") return 30
    if (range === "Year") return 365
    if (range === "Specific Date") return 1
    return 1 // All Time fallback
}

const getTrendData = (range: string) => {
    // Generate mock trend data based on range
    const data = []
    const points = range === "7 Days" ? 7 : range === "Month" ? 30 : 12;
    const isMonthly = range === "Year";

    for (let i = 0; i < points; i++) {
        const d = new Date(MOCK_CURRENT_DATE)
        if (isMonthly) {
            d.setMonth(d.getMonth() - (points - 1 - i))
        } else {
            d.setDate(d.getDate() - (points - 1 - i))
        }

        const name = isMonthly
            ? d.toLocaleDateString('en-US', { month: 'short' })
            : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

        // Mock randomized reasonable values
        const baseSales = 500000 + (Math.random() * 100000)
        const baseVerified = 450000 + (Math.random() * 120000)

        data.push({
            name,
            totalSalesAmount: Math.round(baseSales),
            verifiedFunds: Math.round(baseVerified)
        })
    }
    return data
}

// --- Mock Data ---

interface CompanyAccount {
    id: string
    name: string
    contactPerson: string
    contactNumber: string
    creditLimit: number
    currentBalance: number
    address?: string
    email?: string
}

const companies: CompanyAccount[] = [
    { id: "1", name: "ABC Logistics", contactPerson: "John Doe", contactNumber: "077-1234567", creditLimit: 500000, currentBalance: 125000, address: "123, Logistics Way, Colombo 01", email: "john@abc.com" },
    { id: "2", name: "City Taxis", contactPerson: "Jane Smith", contactNumber: "071-9876543", creditLimit: 100000, currentBalance: -5000, address: "45, Taxi Stand, Kandy", email: "jane@citytaxis.com" }, // Credit/Overpaid
    { id: "3", name: "Green Farms", contactPerson: "Mike Brown", contactNumber: "076-5551234", creditLimit: 750000, currentBalance: 450000, address: "No 5, Farm Road, Nuwara Eliya", email: "mike@greenfarms.lk" },
    { id: "4", name: "Metro Bus Svc", contactPerson: "Sarah Lee", contactNumber: "011-2345678", creditLimit: 2000000, currentBalance: 0, address: "Central Bus Stand, Pettah", email: "accts@metrobus.lk" },
    { id: "5", name: "Tech Solutions", contactPerson: "David Kim", contactNumber: "077-8889999", creditLimit: 300000, currentBalance: 320000, address: "Tech Park, Malabe", email: "david@techsol.com" }, // Over limit
]

interface Terminal {
    id: string
    provider: "Visa" | "Master" | "Amex"
    terminalId: string
    bankAccount: string
    status: "active" | "offline"
}

const terminals: Terminal[] = [
    { id: "1", provider: "Visa", terminalId: "T-883920", bankAccount: "BOC - 8829", status: "active" },
    { id: "2", provider: "Master", terminalId: "T-883921", bankAccount: "BOC - 8829", status: "active" },
    { id: "3", provider: "Amex", terminalId: "T-772100", bankAccount: "ComBank - 1102", status: "offline" },
]

interface Settlement {
    id: string
    batchId: string
    date: string
    terminalId: string
    amount: number
    status: "Settled" | "Pending" | "Verified"
    shift: "Day" | "Night"
}


const MOCK_SETTLEMENTS: Settlement[] = [
    { id: "1", batchId: "#B-001", date: "2024-10-24", terminalId: "T-883920", amount: 154000, status: "Settled", shift: "Day" },
    { id: "2", batchId: "#B-002", date: "2024-10-24", terminalId: "T-883921", amount: 89500, status: "Settled", shift: "Night" },
    { id: "3", batchId: "#B-003", date: "2024-10-25", terminalId: "T-772100", amount: 23000, status: "Pending", shift: "Day" },
]

interface Deposit {
    id: string
    date: string
    bank: string
    method: string
    amount: number
    ref: string
    status: string
    shift: "Day" | "Night"
}

const MOCK_DEPOSITS: Deposit[] = [
    { id: "DEP-883", date: "2024-10-14", bank: "Sampath Bank", method: "CDM", amount: 150000, ref: "REF882199", status: "Verified", shift: "Day" },
    { id: "DEP-882", date: "2024-10-13", bank: "Commercial Bank", method: "Slip", amount: 245000, ref: "SLP7721", status: "Verified", shift: "Night" },
    { id: "DEP-881", date: "2024-10-13", bank: "BOC", method: "CDM", amount: 80000, ref: "REF881002", status: "Pending", shift: "Day" },
    { id: "DEP-880", date: "2024-10-12", bank: "Sampath Bank", method: "Online", amount: 50000, ref: "TXN99281", status: "Verified", shift: "Night" },
    { id: "DEP-879", date: "2024-10-11", bank: "Peoples Bank", method: "Slip", amount: 120000, ref: "SLP3321", status: "Verified", shift: "Day" },
]

interface Expense {
    id: string
    date: string
    category: "Bill" | "Utility" | "General" | "Salary"
    description: string
    amount: number
    paidBy: string
    status: "Pending" | "Approved"
}

const MOCK_EXPENSES: Expense[] = [
    { id: "EXP-001", date: "2024-10-24", category: "Utility", description: "Electricity Bill - Oct", amount: 45000, paidBy: "Manager", status: "Approved" },
    { id: "EXP-002", date: "2024-10-23", category: "General", description: "Stationery & Office Supplies", amount: 5500, paidBy: "Staff A", status: "Approved" },
    { id: "EXP-003", date: "2024-10-22", category: "Bill", description: "Internet Subscription", amount: 8900, paidBy: "Manager", status: "Pending" },
]

// --- Components ---

// --- Mock Sales Data for Working Capital ---
const MOCK_SALES_DATA = {
    dayShift: { total: 1250000, date: "2024-10-15" },
    nightShift: { total: 950000, date: "2024-10-15" }
}

// --- Components ---

function WorkingCapitalView({ deposits, settlements }: { deposits: Deposit[], settlements: Settlement[] }) {
    const [timeRange, setTimeRange] = React.useState<TimeRange>("Today")
    const [specificDate, setSpecificDate] = React.useState<Date | undefined>(new Date("2024-10-24"))

    const filteredDeposits = deposits.filter(d => isWithinRange(d.date, timeRange, specificDate))
    const filteredSettlements = settlements.filter(s => isWithinRange(s.date, timeRange, specificDate))

    const verifiedDay = filteredDeposits
        .filter(d => d.shift === "Day" && d.status === "Verified")
        .reduce((acc, curr) => acc + curr.amount, 0) +
        filteredSettlements
            .filter(s => s.shift === "Day" && s.status === "Verified")
            .reduce((acc, curr) => acc + curr.amount, 0)

    const verifiedNight = filteredDeposits
        .filter(d => d.shift === "Night" && d.status === "Verified")
        .reduce((acc, curr) => acc + curr.amount, 0) +
        filteredSettlements
            .filter(s => s.shift === "Night" && s.status === "Verified")
            .reduce((acc, curr) => acc + curr.amount, 0)

    const multiplier = getMultiplier(timeRange)
    // For All Time, let's just make it look reasonable based on verified amount ratio for demo
    // or just assume 365 for now if it's "All Time" but we only have a few days of data.
    // Actually, "All Time" with sparse data vs "Year" 365x multiplier will look weird (Huge deficiency).
    // Let's adjust logic: If "All Time", assume multiplier = 10 (just for demo context)
    const effectiveMultiplier = timeRange === "All Time" ? 10 : multiplier

    const expectedDay = MOCK_SALES_DATA.dayShift.total * effectiveMultiplier
    const expectedNight = MOCK_SALES_DATA.nightShift.total * effectiveMultiplier

    const varianceDay = verifiedDay - expectedDay
    const varianceNight = verifiedNight - expectedNight

    // Total
    const totalVerified = verifiedDay + verifiedNight
    const totalExpected = expectedDay + expectedNight
    const totalVariance = totalVerified - totalExpected

    // Graph State
    const [graphRange, setGraphRange] = React.useState<string>("7 Days")
    const trendData = React.useMemo(() => getTrendData(graphRange), [graphRange])

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Working Capital Overview</h3>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={timeRange} onValueChange={(val) => setTimeRange(val as TimeRange)}>
                        <SelectTrigger className="w-[180px] h-8">
                            <SelectValue placeholder="Select Range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Today">Today</SelectItem>
                            <SelectItem value="7 Days">Last 7 Days</SelectItem>
                            <SelectItem value="Month">This Month</SelectItem>
                            <SelectItem value="Year">This Year</SelectItem>
                            <SelectItem value="All Time">All Time</SelectItem>
                            <SelectItem value="Specific Date">Specific Date</SelectItem>
                        </SelectContent>
                    </Select>
                    {timeRange === "Specific Date" && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                            <Label htmlFor="specific-date" className="sr-only">Date</Label>
                            <Input
                                id="specific-date"
                                type="date"
                                className="h-8 w-[150px]"
                                value={specificDate ? specificDate.toISOString().split('T')[0] : ''}
                                onChange={(e) => setSpecificDate(e.target.value ? new Date(e.target.value) : undefined)}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Day Shift */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium flex items-center gap-2">
                            <Sun className="h-5 w-5 text-orange-500" />
                            Day Shift (7 AM - 7 PM)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Expected Sales</span>
                            <span className="font-semibold">LKR {expectedDay.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Verified Funds</span>
                            <span className="font-semibold text-blue-600">LKR {verifiedDay.toLocaleString()}</span>
                        </div>
                        <div className="pt-4 border-t flex justify-between items-center">
                            <span className="font-medium">Variance</span>
                            <Badge variant="outline" className={varianceDay >= 0 ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}>
                                LKR {Math.abs(varianceDay).toLocaleString()} {varianceDay >= 0 ? "(Over)" : "(Short)"}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Night Shift */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium flex items-center gap-2">
                            <Moon className="h-5 w-5 text-indigo-500" />
                            Night Shift (7 PM - 7 AM)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Expected Sales</span>
                            <span className="font-semibold">LKR {expectedNight.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Verified Funds</span>
                            <span className="font-semibold text-blue-600">LKR {verifiedNight.toLocaleString()}</span>
                        </div>
                        <div className="pt-4 border-t flex justify-between items-center">
                            <span className="font-medium">Variance</span>
                            <Badge variant="outline" className={varianceNight >= 0 ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}>
                                LKR {Math.abs(varianceNight).toLocaleString()} {varianceNight >= 0 ? "(Over)" : "(Short)"}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Total */}
                <Card className="bg-muted/20 border-dashed">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium flex items-center gap-2">
                            <Wallet className="h-5 w-5" />
                            Total Reconciliation
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Total Expected</span>
                            <span className="font-semibold">LKR {totalExpected.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Total Verified</span>
                            <span className="font-semibold text-blue-600">LKR {totalVerified.toLocaleString()}</span>
                        </div>
                        <div className="pt-4 border-t flex justify-between items-center">
                            <span className="font-medium">Total Variance</span>
                            <Badge className={`text-sm ${totalVariance >= 0 ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}`}>
                                LKR {Math.abs(totalVariance).toLocaleString()}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Trends Graph */}
            <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-medium">Financial Trends</CardTitle>
                    <Select value={graphRange} onValueChange={setGraphRange}>
                        <SelectTrigger className="w-[150px] h-8">
                            <SelectValue placeholder="Graph Range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7 Days">Last 7 Days</SelectItem>
                            <SelectItem value="Month">Last 30 Days</SelectItem>
                            <SelectItem value="Year">Last 12 Months</SelectItem>
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `LKR ${value / 1000}k`} />
                                <Tooltip
                                    formatter={(value: number) => [`LKR ${value.toLocaleString()}`, ""]}
                                    cursor={{ stroke: '#e2e8f0' }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="totalSalesAmount" name="Total Sales Amount" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                <Line type="monotone" dataKey="verifiedFunds" name="Verified Funds" stroke="#16a34a" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

interface CompanyAccountsTableProps {
    companies: CompanyAccount[]
}

function CompanyAccountsTable({ companies }: CompanyAccountsTableProps) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Company Name</TableHead>
                        <TableHead>Company ID</TableHead>
                        <TableHead>Contact Number</TableHead>
                        <TableHead className="text-right">Credit Limit (LKR)</TableHead>
                        <TableHead className="text-right">Balance (LKR)</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {companies.map((company) => (
                        <TableRow key={company.id}>
                            <TableCell className="font-medium">{company.name}</TableCell>
                            <TableCell className="font-mono text-xs">{company.id}</TableCell>
                            <TableCell>{company.contactNumber}</TableCell>
                            <TableCell className="text-right">{company.creditLimit.toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                                <Badge
                                    variant="outline"
                                    className={
                                        company.currentBalance > 0
                                            ? company.currentBalance > company.creditLimit
                                                ? "bg-red-100 text-red-700 border-red-200" // Over limit
                                                : "bg-orange-50 text-orange-700 border-orange-200" // Owes money
                                            : "bg-green-100 text-green-700 border-green-200" // Credit/Paid
                                    }
                                >
                                    {company.currentBalance.toLocaleString()}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href={`/accounts/${company.id}`}>View History</Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

interface CardTerminalsViewProps {
    settlements: Settlement[]
    onVerifySettlement: (id: string) => void
}

function CardTerminalsView({ settlements, onVerifySettlement }: CardTerminalsViewProps) {
    const [localTerminals, setLocalTerminals] = React.useState(terminals)
    const [isAdding, setIsAdding] = React.useState(false)
    const [newTerminal, setNewTerminal] = React.useState<Partial<Terminal>>({
        provider: "Visa",
        status: "active"
    })

    // Edit State
    const [editingId, setEditingId] = React.useState<string | null>(null)
    const [editForm, setEditForm] = React.useState<Partial<Terminal>>({})

    const handleAddTerminal = () => {
        if (!newTerminal.terminalId || !newTerminal.bankAccount) return

        const terminal: Terminal = {
            id: `t-${Date.now()}`,
            provider: newTerminal.provider as "Visa" | "Master" | "Amex",
            terminalId: newTerminal.terminalId,
            bankAccount: newTerminal.bankAccount,
            status: "active"
        }

        setLocalTerminals([...localTerminals, terminal])
        setIsAdding(false)
        setNewTerminal({ provider: "Visa", status: "active" })
    }

    const startEditing = (terminal: Terminal) => {
        setEditingId(terminal.id)
        setEditForm(terminal)
    }

    const cancelEditing = () => {
        setEditingId(null)
        setEditForm({})
    }

    const saveEditing = () => {
        if (!editingId) return

        setLocalTerminals(localTerminals.map(t =>
            t.id === editingId ? { ...t, ...editForm } as Terminal : t
        ))
        setEditingId(null)
        setEditForm({})
    }

    return (
        <div className="space-y-6">
            {/* Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {localTerminals.map((t) => (
                    <Card key={t.id}>
                        {editingId === t.id ? (
                            // Editing Mode
                            <CardContent className="pt-6 space-y-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Provider</Label>
                                    <Select
                                        value={editForm.provider}
                                        onValueChange={(val: string) => setEditForm(prev => ({ ...prev, provider: val as "Visa" | "Master" | "Amex" }))}
                                    >
                                        <SelectTrigger className="h-8" onKeyDown={(e) => { if (e.key === 'Enter') saveEditing() }}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Visa">Visa</SelectItem>
                                            <SelectItem value="Master">Master</SelectItem>
                                            <SelectItem value="Amex">Amex</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Terminal ID</Label>
                                    <Input
                                        className="h-8"
                                        value={editForm.terminalId || ""}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, terminalId: e.target.value }))}
                                        onKeyDown={(e) => { if (e.key === 'Enter') saveEditing() }}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Bank Account</Label>
                                    <Input
                                        className="h-8"
                                        value={editForm.bankAccount || ""}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, bankAccount: e.target.value }))}
                                        onKeyDown={(e) => { if (e.key === 'Enter') saveEditing() }}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Status</Label>
                                    <Select
                                        value={editForm.status}
                                        onValueChange={(val: string) => setEditForm(prev => ({ ...prev, status: val as "active" | "offline" }))}
                                    >
                                        <SelectTrigger className="h-8" onKeyDown={(e) => { if (e.key === 'Enter') saveEditing() }}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="offline">Offline</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <Button size="sm" className="w-full" onClick={saveEditing}>Save</Button>
                                    <Button size="sm" variant="ghost" className="w-full" onClick={cancelEditing}>Cancel</Button>
                                </div>
                            </CardContent>
                        ) : (
                            // Display Mode
                            <>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        {t.provider} Terminal
                                    </CardTitle>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEditing(t)}>
                                            <Pencil className="h-3 w-3 text-muted-foreground" />
                                        </Button>
                                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{t.terminalId}</div>
                                    <p className="text-xs text-muted-foreground">
                                        Linked: {t.bankAccount}
                                    </p>
                                    <div className="mt-2">
                                        <Badge variant={t.status === 'active' ? 'default' : 'destructive'} className="text-[10px] h-5 px-1.5">
                                            {t.status.toUpperCase()}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </>
                        )}
                    </Card>
                ))}

                {isAdding ? (
                    <Card className="border-dashed border-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">New Terminal</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-1">
                                <Label htmlFor="provider" className="text-xs">Provider</Label>
                                <Select
                                    value={newTerminal.provider}
                                    onValueChange={(val: string) => setNewTerminal({ ...newTerminal, provider: val as "Visa" | "Master" | "Amex" })}
                                >
                                    <SelectTrigger id="provider" className="h-8">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Visa">Visa</SelectItem>
                                        <SelectItem value="Master">Master</SelectItem>
                                        <SelectItem value="Amex">Amex</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="tid" className="text-xs">Terminal ID</Label>
                                <Input
                                    id="tid"
                                    className="h-8"
                                    placeholder="T-XXXXXX"
                                    value={newTerminal.terminalId || ""}
                                    onChange={(e) => setNewTerminal({ ...newTerminal, terminalId: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="bank" className="text-xs">Bank Account</Label>
                                <Input
                                    id="bank"
                                    className="h-8"
                                    placeholder="Account No"
                                    value={newTerminal.bankAccount || ""}
                                    onChange={(e) => setNewTerminal({ ...newTerminal, bankAccount: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-2 pt-1">
                                <Button size="sm" className="w-full" onClick={handleAddTerminal}>Save</Button>
                                <Button size="sm" variant="ghost" className="w-full" onClick={() => setIsAdding(false)}>Cancel</Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card
                        className="flex flex-col items-center justify-center border-dashed cursor-pointer hover:bg-muted/50 transition-colors bg-muted/20 min-h-[160px]"
                        onClick={() => setIsAdding(true)}
                    >
                        <div className="flex flex-col items-center justify-center p-6 text-muted-foreground">
                            <PlusCircle className="h-8 w-8 mb-2" />
                            <span className="text-sm font-medium">Add New Terminal</span>
                        </div>
                    </Card>
                )}
            </div>

            {/* Settlements Table */}
            <div className="space-y-2">
                <h3 className="text-lg font-semibold tracking-tight">Recent Settlements</h3>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Batch ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Terminal</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount (LKR)</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {settlements.map((s) => (
                                <TableRow key={s.id}>
                                    <TableCell className="font-medium">{s.batchId}</TableCell>
                                    <TableCell>{s.date}</TableCell>
                                    <TableCell>{s.terminalId}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={
                                                s.status === 'Verified'
                                                    ? 'border-green-500 text-green-600 bg-green-50'
                                                    : s.status === 'Settled'
                                                        ? 'secondary'
                                                        : 'outline'
                                            }
                                        >
                                            {s.status === 'Verified' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                                            {s.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{s.amount.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">
                                        {s.status === 'Pending' && (
                                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onVerifySettlement(s.id)}>
                                                Verify
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}


interface DepositsViewProps {
    deposits: Deposit[]
    onVerifyDeposit: (id: string) => void
}

function DepositsView({ deposits, onVerifyDeposit }: DepositsViewProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Settlement Form - Takes up 1 column on large screens */}
            <div className="lg:col-span-1">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle>New Deposit Entry</CardTitle>
                        <CardDescription>Record a bank deposit from shift cash.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="bank">Bank Account</Label>
                                <Select>
                                    <SelectTrigger id="bank">
                                        <SelectValue placeholder="Select Bank" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sampath">Sampath Bank - 1002</SelectItem>
                                        <SelectItem value="combank">Commercial Bank - 8821</SelectItem>
                                        <SelectItem value="boc">BOC - 9921</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="method">Deposit Method</Label>
                                <Select>
                                    <SelectTrigger id="method">
                                        <SelectValue placeholder="Select Method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cdm">Cash Deposit Machine (CDM)</SelectItem>
                                        <SelectItem value="slip">Bank Slip / Counter</SelectItem>
                                        <SelectItem value="online">Online Transfer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount (LKR)</Label>
                                <Input id="amount" type="number" placeholder="0.00" className="font-mono" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="ref">Reference Number</Label>
                                <Input id="ref" placeholder="Enter Slip/CDM Ref" />
                            </div>

                            <div className="space-y-2">
                                <Label>Proof of Deposit</Label>
                                <div className="border border-dashed rounded-md p-6 flex flex-col items-center justify-center text-center space-y-2 hover:bg-muted/50 transition-colors cursor-pointer">
                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                    <div className="text-xs text-muted-foreground">
                                        <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                                        <br />photo of slip or receipt
                                    </div>
                                </div>
                            </div>

                            <Button className="w-full mt-4" size="lg">Submit Entry</Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            {/* History Table - Takes up 2 columns on large screens */}
            <div className="lg:col-span-2">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle>Recent Deposits</CardTitle>
                        <CardDescription>History of recorded settlements and their verification status.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Bank Info</TableHead>
                                    <TableHead>Reference</TableHead>
                                    <TableHead className="text-right">Amount (LKR)</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {deposits.map((deposit) => (
                                    <TableRow key={deposit.id}>
                                        <TableCell className="whitespace-nowrap font-medium text-sm text-muted-foreground">
                                            {deposit.date}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{deposit.bank}</span>
                                                <span className="text-xs text-muted-foreground">{deposit.method}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{deposit.ref}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            {deposit.amount.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end">
                                                <Badge
                                                    variant="outline"
                                                    className={`flex items-center gap-1 ${deposit.status === "Verified" ? "border-green-500 text-green-600 bg-green-50" : "border-amber-500 text-amber-600 bg-amber-50"}`}
                                                >
                                                    {deposit.status === 'Verified' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                                    {deposit.status}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {deposit.status === 'Pending' && (
                                                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onVerifyDeposit(deposit.id)}>
                                                    Verify
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function ExpensesView() {
    const [expenses, setExpenses] = React.useState<Expense[]>(MOCK_EXPENSES)
    const [newExpense, setNewExpense] = React.useState<Partial<Expense>>({
        category: "General",
        date: new Date().toISOString().split('T')[0]
    })

    const handleAddExpense = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newExpense.amount || !newExpense.description) return

        const expense: Expense = {
            id: `EXP-${Date.now()}`,
            date: newExpense.date || new Date().toISOString().split('T')[0],
            category: newExpense.category as any,
            description: newExpense.description || "",
            amount: Number(newExpense.amount),
            paidBy: "Current User",
            status: "Pending"
        }

        setExpenses([expense, ...expenses])
        setNewExpense({
            category: "General",
            date: new Date().toISOString().split('T')[0],
            amount: 0,
            description: ""
        })
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Add Expense Form */}
            <div className="lg:col-span-1">
                <Card className="h-full border-l-4 border-l-orange-500">
                    <CardHeader>
                        <CardTitle>Record Expense</CardTitle>
                        <CardDescription>Log operational expenses and payments.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddExpense} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="exp-date">Date</Label>
                                <Input
                                    id="exp-date"
                                    type="date"
                                    value={newExpense.date}
                                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="exp-category">Category</Label>
                                <Select
                                    value={newExpense.category}
                                    onValueChange={(val) => setNewExpense({ ...newExpense, category: val as any })}
                                >
                                    <SelectTrigger id="exp-category">
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Bill">Bill Payment</SelectItem>
                                        <SelectItem value="Utility">Utilities (Water/Elec)</SelectItem>
                                        <SelectItem value="General">General / Petty Cash</SelectItem>
                                        <SelectItem value="Salary">Staff Salary / Advance</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="exp-desc">Description</Label>
                                <Input
                                    id="exp-desc"
                                    placeholder="e.g. Broken nozzle repair"
                                    value={newExpense.description}
                                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="exp-amount">Amount (LKR)</Label>
                                <Input
                                    id="exp-amount"
                                    type="number"
                                    placeholder="0.00"
                                    className="font-mono text-lg"
                                    value={newExpense.amount || ''}
                                    onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                                />
                            </div>

                            <Button type="submit" className="w-full mt-4 bg-orange-600 hover:bg-orange-700">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Record Expense
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            {/* Expense History Table */}
            <div className="lg:col-span-2">
                <Card className="h-full">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Expense History</CardTitle>
                            <CardDescription>Recent payments and operational costs.</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Badge variant="outline" className="bg-muted">
                                Total: LKR {expenses.reduce((a, c) => a + c.amount, 0).toLocaleString()}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenses.map((exp) => (
                                    <TableRow key={exp.id}>
                                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                                            {exp.date}
                                        </TableCell>
                                        <TableCell className="font-medium">{exp.description}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="text-xs font-normal">
                                                {exp.category}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {exp.amount.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={exp.status === 'Approved' ? 'secondary' : 'outline'} className="text-[10px]">
                                                {exp.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default function AccountsPage() {
    const [deposits, setDeposits] = React.useState<Deposit[]>(MOCK_DEPOSITS)
    const [settlements, setSettlements] = React.useState<Settlement[]>(MOCK_SETTLEMENTS)
    const [companiesList, setCompaniesList] = React.useState<CompanyAccount[]>(companies)

    // Add Company State
    const [isAddCompanyOpen, setIsAddCompanyOpen] = React.useState(false)
    const [newCompany, setNewCompany] = React.useState<Partial<CompanyAccount>>({
        creditLimit: 0,
        currentBalance: 0
    })

    const handleVerifyDeposit = (id: string) => {
        setDeposits(deposits.map(d => d.id === id ? { ...d, status: "Verified" } : d))
    }

    const handleVerifySettlement = (id: string) => {
        setSettlements(settlements.map(s => s.id === id ? { ...s, status: "Verified" } : s))
    }

    const handleAddCompany = () => {
        if (!newCompany.name || !newCompany.contactNumber) return

        const company: CompanyAccount = {
            id: (companiesList.length + 1).toString(),
            name: newCompany.name,
            contactPerson: newCompany.contactPerson || "",
            contactNumber: newCompany.contactNumber,
            creditLimit: newCompany.creditLimit || 0,
            currentBalance: 0,
            address: newCompany.address || "",
            email: newCompany.email || ""
        }

        setCompaniesList([...companiesList, company])
        setIsAddCompanyOpen(false)
        setNewCompany({ creditLimit: 0, currentBalance: 0 })
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6 min-h-screen">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Accounts & Finance</h2>
                <div className="flex items-center space-x-2">
                    <Button>
                        <FileText className="mr-2 h-4 w-4" />
                        Download Reports
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="company-accounts" className="space-y-4">
                <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-muted/50">
                    <TabsTrigger value="company-accounts" className="data-[state=active]:bg-background data-[state=active]:text-primary py-2 text-xs md:text-sm">
                        <FileText className="h-4 w-4 mr-2 hidden md:inline-block" />
                        Credit Companies
                    </TabsTrigger>
                    <TabsTrigger value="terminals" className="data-[state=active]:bg-background data-[state=active]:text-primary py-2 text-xs md:text-sm">
                        <CreditCard className="h-4 w-4 mr-2 hidden md:inline-block" />
                        Card Terminals
                    </TabsTrigger>
                    <TabsTrigger value="deposits" className="data-[state=active]:bg-background data-[state=active]:text-primary py-2 text-xs md:text-sm">
                        <Upload className="h-4 w-4 mr-2 hidden md:inline-block" />
                        Cash Deposits
                    </TabsTrigger>
                    <TabsTrigger value="working-capital" className="data-[state=active]:bg-background data-[state=active]:text-primary py-2 text-xs md:text-sm">
                        <Wallet className="h-4 w-4 mr-2 hidden md:inline-block" />
                        Working Capital
                    </TabsTrigger>
                    <TabsTrigger value="expenses" className="data-[state=active]:bg-background data-[state=active]:text-primary py-2 text-xs md:text-sm">
                        <TrendingUp className="h-4 w-4 mr-2 hidden md:inline-block text-red-500 transform rotate-180" />
                        Company Expenses
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="company-accounts" className="space-y-4 mt-6">
                    <div className="flex justify-end mb-4">
                        <Dialog open={isAddCompanyOpen} onOpenChange={setIsAddCompanyOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    New Company Account
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Add Company Account</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="name" className="text-right">
                                            Name
                                        </Label>
                                        <Input
                                            id="name"
                                            value={newCompany.name || ''}
                                            onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="contact" className="text-right">
                                            Contact
                                        </Label>
                                        <Input
                                            id="contact"
                                            value={newCompany.contactNumber || ''}
                                            onChange={(e) => setNewCompany({ ...newCompany, contactNumber: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="person" className="text-right">
                                            Person
                                        </Label>
                                        <Input
                                            id="person"
                                            value={newCompany.contactPerson || ''}
                                            onChange={(e) => setNewCompany({ ...newCompany, contactPerson: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="address" className="text-right">
                                            Address
                                        </Label>
                                        <Input
                                            id="address"
                                            value={newCompany.address || ''}
                                            onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="email" className="text-right">
                                            Email
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={newCompany.email || ''}
                                            onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="limit" className="text-right">
                                            Limit
                                        </Label>
                                        <Input
                                            id="limit"
                                            type="number"
                                            value={newCompany.creditLimit || ''}
                                            onChange={(e) => setNewCompany({ ...newCompany, creditLimit: Number(e.target.value) })}
                                            className="col-span-3"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleAddCompany}>Save changes</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <CompanyAccountsTable companies={companiesList} />
                </TabsContent>

                <TabsContent value="terminals" className="mt-6">
                    <CardTerminalsView settlements={settlements} onVerifySettlement={handleVerifySettlement} />
                </TabsContent>

                <TabsContent value="deposits" className="mt-6">
                    <DepositsView deposits={deposits} onVerifyDeposit={handleVerifyDeposit} />
                </TabsContent>

                <TabsContent value="working-capital" className="mt-6">
                    <WorkingCapitalView deposits={deposits} settlements={settlements} />
                </TabsContent>

                <TabsContent value="expenses" className="mt-6">
                    <ExpensesView />
                </TabsContent>
            </Tabs>
        </div>
    )
}
