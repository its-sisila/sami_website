
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

const MOCK_CURRENT_DATE = new Date("2025-12-20") // Fixed "Today" for demo

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
    provider: "VISA/MASTER" | "AMEX"
    terminalId: string
    bankAccount: string
    status: "active" | "offline"
}

const terminals: Terminal[] = [
    { id: "1", provider: "VISA/MASTER", terminalId: "40203510", bankAccount: "DFCC - 4035", status: "active" },
    { id: "2", provider: "VISA/MASTER", terminalId: "40203511", bankAccount: "DFCC - 4035", status: "active" },
    { id: "3", provider: "VISA/MASTER", terminalId: "40203512", bankAccount: "DFCC - 4035", status: "active" },
    { id: "4", provider: "AMEX", terminalId: "93501476", bankAccount: "DFCC - 1102", status: "active" },
    { id: "5", provider: "AMEX", terminalId: "93501484", bankAccount: "DFCC - 1102", status: "active" },
    { id: "6", provider: "AMEX", terminalId: "93501492", bankAccount: "DFCC - 1102", status: "active" },
]

interface Settlement {
    id: string
    batchId: string
    date: string
    time: string
    terminalId: string
    amount: number
    status: "Settled" | "Pending" | "Verified"
    shift: "Day" | "Night"
}
// Generate 12 months of mock settlement data
function generateMockSettlements(): Settlement[] {
    const settlements: Settlement[] = []
    const terminalIds = ["40203510", "40203511", "40203512", "93501476", "93501484", "93501492"]
    let id = 1

    for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
        const monthDate = new Date(MOCK_CURRENT_DATE.getFullYear(), MOCK_CURRENT_DATE.getMonth() - monthOffset, 1)
        const year = monthDate.getFullYear()
        const month = monthDate.getMonth() + 1
        const daysInMonth = new Date(year, month, 0).getDate()

        // Generate ~20 settlements per month (multiple per day for different terminals)
        for (let day = 1; day <= daysInMonth; day += 2) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

            // Random terminal for each settlement
            const terminalIdx = Math.floor(Math.random() * terminalIds.length)
            const amount = 80000 + Math.floor(Math.random() * 150000)

            // Most are verified, some settled, few pending (only recent ones)
            let status: Settlement["status"] = "Verified"
            if (monthOffset === 0 && day > 15) {
                status = Math.random() > 0.5 ? "Pending" : "Settled"
            } else if (monthOffset === 0) {
                status = "Settled"
            }

            const shift = day % 2 === 0 ? "Night" : "Day"
            // Generate random time based on shift
            const hour = shift === "Day" ? 8 + Math.floor(Math.random() * 10) : 18 + Math.floor(Math.random() * 6)
            const minute = Math.floor(Math.random() * 60)
            const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

            settlements.push({
                id: String(id++),
                batchId: `#B-${String(id).padStart(3, '0')}`,
                date: dateStr,
                time: timeStr,
                terminalId: terminalIds[terminalIdx],
                amount,
                status,
                shift
            })
        }
    }

    return settlements.sort((a, b) => b.date.localeCompare(a.date)) // Sort newest first
}

const MOCK_SETTLEMENTS = generateMockSettlements()

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
    { id: "102005373457", date: "2024-10-14", bank: "DFCC", method: "CDM", amount: 150000, ref: "REF882199", status: "Verified", shift: "Day" },
    { id: "102005373457", date: "2024-10-13", bank: "DFCC", method: "Slip", amount: 245000, ref: "SLP7721", status: "Verified", shift: "Night" },
    { id: "101001020208", date: "2024-10-13", bank: "DFCC", method: "CDM", amount: 80000, ref: "REF881002", status: "Pending", shift: "Day" },
    { id: "10100120039", date: "2024-10-12", bank: "DFCC", method: "Online", amount: 50000, ref: "TXN99281", status: "Verified", shift: "Night" },
    { id: "85763347", date: "2024-10-11", bank: "BOC", method: "Slip", amount: 120000, ref: "SLP3321", status: "Verified", shift: "Day" },
    { id: "75941669", date: "2024-10-11", bank: "BOC", method: "Slip", amount: 120000, ref: "SLP3321", status: "Verified", shift: "Day" },
]

interface Expense {
    id: string
    category: string
    payee: string
    description: string
    invoiceNumber?: string
    amount: number
    date: string
    shift: "Day" | "Night"
}

// Category to Payee mapping (from Sales page)
const EXPENSE_CATEGORIES = ["Salary", "Transport", "Bowser", "Bills", "Utilities", "Refreshments", "Maintenance", "Office Supplies", "Other"];

const CATEGORY_PAYEES: Record<string, string[]> = {
    "Salary": ["K. Perera", "S. Silva", "N. Fernando", "C. De Silva", "Other"],
    "Transport": ["Threewheeler", "Bike", "Other"],
    "Bowser": ["Bowser Highway", "Bowser Repair", "Other"],
    "Bills": ["Dialog", "SLT", "Credit Card Payment", "Chairman Vehicle Fuel", "Other"],
    "Utilities": ["CEB", "LECO", "Water Board", "Tax", "Lease", "Generator Fuel", "Other"],
    "Refreshments": ["Soft Drinks", "Lunch", "Snacks", "Bottled Water", "Other"],
    "Maintenance": ["Electrician", "Plumber", "AC Technician", "Pump Technician", "General Repair", "Other"],
    "Office Supplies": ["Stationery", "Printing", "Computer Accessories", "Cleaning Supplies", "Other"],
    "Other": ["Other"],
};

// Generate 12 months of mock expense data
function generateMockExpenses(): Expense[] {
    const expenses: Expense[] = []
    let id = 1

    // Generate for last 12 months
    for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
        const monthDate = new Date(MOCK_CURRENT_DATE.getFullYear(), MOCK_CURRENT_DATE.getMonth() - monthOffset, 1)
        const year = monthDate.getFullYear()
        const month = monthDate.getMonth() + 1
        const monthStr = `${year}-${String(month).padStart(2, '0')}`
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'long' })

        // Salary payments on 25th of each month
        const salaryDate = `${monthStr}-25`
        expenses.push(
            { id: `EXP-SAL-${id++}`, category: "Salary", payee: "K. Perera", description: `${monthName} Salary - 25 shifts`, amount: 35500 + Math.floor(Math.random() * 5000), date: salaryDate, shift: "Day", invoiceNumber: "" },
            { id: `EXP-SAL-${id++}`, category: "Salary", payee: "S. Silva", description: `${monthName} Salary - 27 shifts`, amount: 40500 + Math.floor(Math.random() * 4000), date: salaryDate, shift: "Day", invoiceNumber: "" },
            { id: `EXP-SAL-${id++}`, category: "Salary", payee: "N. Fernando", description: `${monthName} Salary + OT`, amount: 62000 + Math.floor(Math.random() * 8000), date: salaryDate, shift: "Day", invoiceNumber: "" },
            { id: `EXP-SAL-${id++}`, category: "Salary", payee: "C. De Silva", description: `${monthName} Salary - 26 shifts`, amount: 56200 + Math.floor(Math.random() * 6000), date: salaryDate, shift: "Day", invoiceNumber: "" }
        )

        // Utilities - around 20th
        const utilityDate = `${monthStr}-20`
        expenses.push(
            { id: `EXP-${id++}`, category: "Utilities", payee: "CEB", description: `Electricity ${monthName}`, amount: 120000 + Math.floor(Math.random() * 30000), date: utilityDate, shift: "Day", invoiceNumber: `CEB-${monthStr}` },
            { id: `EXP-${id++}`, category: "Utilities", payee: "Water Board", description: `Water ${monthName}`, amount: 8000 + Math.floor(Math.random() * 3000), date: utilityDate, shift: "Day", invoiceNumber: `WB-${id}` }
        )

        // Bills - around 22nd
        const billsDate = `${monthStr}-22`
        expenses.push(
            { id: `EXP-${id++}`, category: "Bills", payee: "Dialog", description: `Office Landline - ${monthName}`, amount: 5000 + Math.floor(Math.random() * 2000), date: billsDate, shift: "Day", invoiceNumber: `DLG-${id}` },
            { id: `EXP-${id++}`, category: "Bills", payee: "SLT", description: `Internet - ${monthName}`, amount: 8500 + Math.floor(Math.random() * 1500), date: billsDate, shift: "Day", invoiceNumber: `SLT-${id}` }
        )

        // Transport - scattered across month
        for (let day = 5; day <= 25; day += 7) {
            const transportDate = `${monthStr}-${String(day).padStart(2, '0')}`
            expenses.push(
                { id: `EXP-${id++}`, category: "Transport", payee: "Threewheeler", description: "To Bank", amount: 400 + Math.floor(Math.random() * 200), date: transportDate, shift: "Day", invoiceNumber: "" }
            )
        }

        // Maintenance - 1-2 per month
        const maintDate = `${monthStr}-15`
        if (Math.random() > 0.3) {
            expenses.push(
                { id: `EXP-${id++}`, category: "Maintenance", payee: "Pump Technician", description: "Pump service", amount: 10000 + Math.floor(Math.random() * 15000), date: maintDate, shift: "Day", invoiceNumber: `MNT-${id}` }
            )
        }

        // Refreshments - weekly
        for (let day = 3; day <= 24; day += 7) {
            const refreshDate = `${monthStr}-${String(day).padStart(2, '0')}`
            expenses.push(
                { id: `EXP-${id++}`, category: "Refreshments", payee: "Lunch", description: "Staff lunch", amount: 3500 + Math.floor(Math.random() * 2000), date: refreshDate, shift: "Day", invoiceNumber: "" }
            )
        }

        // Generator fuel - once per month
        expenses.push(
            { id: `EXP-${id++}`, category: "Utilities", payee: "Generator Fuel", description: "Diesel for generator", amount: 12000 + Math.floor(Math.random() * 8000), date: `${monthStr}-10`, shift: "Night", invoiceNumber: "" }
        )

        // Bowser - once per month
        expenses.push(
            { id: `EXP-${id++}`, category: "Bowser", payee: "Bowser Highway", description: "Fuel delivery transport", amount: 30000 + Math.floor(Math.random() * 15000), date: `${monthStr}-12`, shift: "Day", invoiceNumber: `BWS-${id}` }
        )
    }

    return expenses.sort((a, b) => b.date.localeCompare(a.date)) // Sort newest first
}

const MOCK_EXPENSES = generateMockExpenses()

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
                    <Select value={timeRange} onValueChange={(val: string) => setTimeRange(val as TimeRange)}>
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
    // Chart range filter
    const [chartRange, setChartRange] = React.useState<"6months" | "12months" | "year">("6months")

    // Generate mock trend data for company accounts based on range
    const chartData = React.useMemo(() => {
        const data = []
        const totalCreditLimit = companies.reduce((sum, c) => sum + c.creditLimit, 0)

        if (chartRange === "6months") {
            const monthNames = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            for (let i = 0; i < 6; i++) {
                data.push({
                    period: monthNames[i],
                    outstanding: Math.round(800000 + (i * 50000) + (Math.random() * 150000)),
                    payments: Math.round(600000 + (Math.random() * 300000)),
                    creditLimit: totalCreditLimit
                })
            }
        } else if (chartRange === "12months") {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            for (let i = 0; i < 12; i++) {
                data.push({
                    period: monthNames[i],
                    outstanding: Math.round(700000 + (i * 30000) + (Math.random() * 200000)),
                    payments: Math.round(500000 + (Math.random() * 400000)),
                    creditLimit: totalCreditLimit
                })
            }
        } else {
            // Yearly - show last 3 years
            const years = ['2023', '2024', '2025']
            for (let i = 0; i < 3; i++) {
                data.push({
                    period: years[i],
                    outstanding: Math.round(9000000 + (i * 500000) + (Math.random() * 1000000)),
                    payments: Math.round(8000000 + (Math.random() * 2000000)),
                    creditLimit: totalCreditLimit * 12
                })
            }
        }
        return data
    }, [companies, chartRange])

    // Summary stats
    const totalOutstanding = companies.reduce((sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0), 0)
    const totalCreditLimit = companies.reduce((sum, c) => sum + c.creditLimit, 0)
    const overLimitCount = companies.filter(c => c.currentBalance > c.creditLimit).length

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Total Companies</div>
                        <div className="text-2xl font-bold">{companies.length}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-orange-500">
                    <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Total Outstanding</div>
                        <div className="text-2xl font-bold text-orange-600">LKR {totalOutstanding.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Total Credit Limit</div>
                        <div className="text-2xl font-bold text-green-600">LKR {totalCreditLimit.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                    <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Over Limit</div>
                        <div className="text-2xl font-bold text-red-600">{overLimitCount} {overLimitCount === 1 ? 'Company' : 'Companies'}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Balance Trends Chart */}
            <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base">Account Balance Trends</CardTitle>
                        <CardDescription>
                            {chartRange === "6months" ? "Last 6 months" : chartRange === "12months" ? "Last 12 months" : "Yearly"} - Outstanding vs Payments
                        </CardDescription>
                    </div>
                    <Select value={chartRange} onValueChange={(val: "6months" | "12months" | "year") => setChartRange(val)}>
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="6months">Last 6 Months</SelectItem>
                            <SelectItem value="12months">Last 12 Months</SelectItem>
                            <SelectItem value="year">Yearly</SelectItem>
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="period" tick={{ fontSize: 9 }} interval={0} />
                            <YAxis tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
                            <Tooltip
                                formatter={(value: number) => [`LKR ${value.toLocaleString()}`, '']}
                                labelClassName="font-medium"
                            />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Line type="monotone" dataKey="outstanding" name="Outstanding Balance" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="payments" name="Payments Received" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="creditLimit" name="Total Credit Limit" stroke="#3b82f6" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Companies Table */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Company Accounts</CardTitle>
                    <CardDescription>Manage credit accounts for corporate customers</CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
            </Card>
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
        provider: "VISA/MASTER",
        status: "active"
    })

    // Month filter
    const monthOptions = React.useMemo(() => {
        const options: { value: string; label: string }[] = []
        const today = MOCK_CURRENT_DATE
        for (let i = 0; i < 12; i++) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
            const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            options.push({ value, label })
        }
        return options
    }, [])

    const [selectedMonth, setSelectedMonth] = React.useState(`${MOCK_CURRENT_DATE.getFullYear()}-${String(MOCK_CURRENT_DATE.getMonth() + 1).padStart(2, '0')}`)

    // Filter settlements by month
    const filteredSettlements = React.useMemo(() => {
        return settlements.filter(s => s.date.startsWith(selectedMonth))
    }, [settlements, selectedMonth])

    // Summary stats
    const stats = React.useMemo(() => {
        const verified = filteredSettlements.filter(s => s.status === "Verified")
        const settled = filteredSettlements.filter(s => s.status === "Settled")
        const pending = filteredSettlements.filter(s => s.status === "Pending")

        return {
            totalAmount: filteredSettlements.reduce((sum, s) => sum + s.amount, 0),
            verifiedAmount: verified.reduce((sum, s) => sum + s.amount, 0),
            settledAmount: settled.reduce((sum, s) => sum + s.amount, 0),
            pendingAmount: pending.reduce((sum, s) => sum + s.amount, 0),
            pendingCount: pending.length,
            totalCount: filteredSettlements.length
        }
    }, [filteredSettlements])

    // Add Settlement State
    const [isAddingSettlement, setIsAddingSettlement] = React.useState(false)
    const [newSettlement, setNewSettlement] = React.useState<Partial<Settlement & { time: string }>>({
        date: MOCK_CURRENT_DATE.toISOString().split('T')[0],
        time: "09:00",
        status: "Pending",
        shift: "Day"
    })
    const [localSettlements, setLocalSettlements] = React.useState(settlements)

    // Settlement Filters
    const [filterFromDate, setFilterFromDate] = React.useState("")
    const [filterToDate, setFilterToDate] = React.useState("")
    const [filterTerminal, setFilterTerminal] = React.useState("all")
    const [filterStatus, setFilterStatus] = React.useState("all")

    // Update filtered to use local with all filters
    const displaySettlements = React.useMemo(() => {
        return localSettlements.filter(s => {
            // Month filter (only if no date range is set)
            if (!filterFromDate && !filterToDate && !s.date.startsWith(selectedMonth)) return false
            // Date range filter
            if (filterFromDate && s.date < filterFromDate) return false
            if (filterToDate && s.date > filterToDate) return false
            // Terminal filter
            if (filterTerminal !== "all" && s.terminalId !== filterTerminal) return false
            // Status filter
            if (filterStatus !== "all" && s.status !== filterStatus) return false
            return true
        })
    }, [localSettlements, selectedMonth, filterFromDate, filterToDate, filterTerminal, filterStatus])

    const handleAddSettlement = () => {
        if (!newSettlement.batchId || !newSettlement.terminalId || !newSettlement.amount) return

        const settlement: Settlement = {
            id: `s-${Date.now()}`,
            batchId: newSettlement.batchId,
            date: newSettlement.date || MOCK_CURRENT_DATE.toISOString().split('T')[0],
            time: newSettlement.time || "09:00",
            terminalId: newSettlement.terminalId,
            amount: Number(newSettlement.amount),
            status: "Settled",
            shift: newSettlement.shift as "Day" | "Night"
        }

        setLocalSettlements([settlement, ...localSettlements])
        setIsAddingSettlement(false)
        setNewSettlement({
            date: MOCK_CURRENT_DATE.toISOString().split('T')[0],
            time: "09:00",
            status: "Pending",
            shift: "Day"
        })
    }

    // Verify settlement handler - updates status to Verified
    const handleVerifySettlement = (id: string) => {
        setLocalSettlements(localSettlements.map(s =>
            s.id === id ? { ...s, status: "Verified" as const } : s
        ))
    }

    // Edit State
    const [editingId, setEditingId] = React.useState<string | null>(null)
    const [editForm, setEditForm] = React.useState<Partial<Terminal>>({})

    const handleAddTerminal = () => {
        if (!newTerminal.terminalId || !newTerminal.bankAccount) return

        const terminal: Terminal = {
            id: `t-${Date.now()}`,
            provider: newTerminal.provider as "VISA/MASTER" | "AMEX",
            terminalId: newTerminal.terminalId,
            bankAccount: newTerminal.bankAccount,
            status: "active"
        }

        setLocalTerminals([...localTerminals, terminal])
        setIsAdding(false)
        setNewTerminal({ provider: "VISA/MASTER", status: "active" })
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

    const selectedMonthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth

    // Chart period filter
    const [chartPeriod, setChartPeriod] = React.useState<"monthly" | "yearly">("monthly")
    const [chartMonth, setChartMonth] = React.useState(selectedMonth) // YYYY-MM
    const [chartYear, setChartYear] = React.useState(MOCK_CURRENT_DATE.getFullYear().toString())

    // Get available years from data
    const availableYears = React.useMemo(() => {
        const years = new Set<string>()
        localSettlements.forEach(s => years.add(s.date.substring(0, 4)))
        return Array.from(years).sort()
    }, [localSettlements])

    // Chart data - daily for monthly, monthly for yearly
    const chartData = React.useMemo(() => {
        if (chartPeriod === "monthly") {
            // Monthly view - show all days of the selected month
            const dailyData: { [key: string]: { day: string, verified: number, settled: number, pending: number } } = {}

            // Get days in the selected month
            const [year, month] = chartMonth.split('-').map(Number)
            const daysInMonth = new Date(year, month, 0).getDate()

            // Initialize all days
            for (let d = 1; d <= daysInMonth; d++) {
                const dayKey = String(d).padStart(2, '0')
                dailyData[dayKey] = { day: String(d), verified: 0, settled: 0, pending: 0 }
            }

            // Aggregate settlements by day
            localSettlements.filter(s => s.date.startsWith(chartMonth)).forEach(s => {
                const day = s.date.substring(8, 10) // DD
                if (dailyData[day]) {
                    if (s.status === "Verified") dailyData[day].verified += s.amount
                    else if (s.status === "Settled") dailyData[day].settled += s.amount
                    else if (s.status === "Pending") dailyData[day].pending += s.amount
                }
            })

            return Object.entries(dailyData)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([, value]) => value)
        } else {
            // Yearly view - show all 12 months of the selected year
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            const monthlyData: { day: string, verified: number, settled: number, pending: number }[] = monthNames.map(m => ({
                day: m, verified: 0, settled: 0, pending: 0
            }))

            // Aggregate settlements by month
            localSettlements.filter(s => s.date.startsWith(chartYear)).forEach(s => {
                const monthIdx = parseInt(s.date.substring(5, 7)) - 1 // 0-indexed
                if (monthIdx >= 0 && monthIdx < 12) {
                    if (s.status === "Verified") monthlyData[monthIdx].verified += s.amount
                    else if (s.status === "Settled") monthlyData[monthIdx].settled += s.amount
                    else if (s.status === "Pending") monthlyData[monthIdx].pending += s.amount
                }
            })

            return monthlyData
        }
    }, [localSettlements, chartPeriod, chartMonth, chartYear])

    return (
        <div className="space-y-6">
            {/* Settlement Trends Chart */}
            <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base">Card Sales Trends</CardTitle>
                        <CardDescription>
                            {chartPeriod === "monthly"
                                ? `Daily sales for ${monthOptions.find(m => m.value === chartMonth)?.label || chartMonth}`
                                : `Monthly sales for ${chartYear}`
                            }
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={chartPeriod} onValueChange={(val: "monthly" | "yearly") => setChartPeriod(val)}>
                            <SelectTrigger className="w-[100px] h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                        </Select>
                        {chartPeriod === "monthly" ? (
                            <Select value={chartMonth} onValueChange={setChartMonth}>
                                <SelectTrigger className="w-[140px] h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {monthOptions.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Select value={chartYear} onValueChange={setChartYear}>
                                <SelectTrigger className="w-[90px] h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableYears.map(y => (
                                        <SelectItem key={y} value={y}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={chartPeriod === "monthly" ? 2 : 0} />
                            <YAxis tickFormatter={(val) => `${(val / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                            <Tooltip
                                formatter={(value: number) => [`LKR ${value.toLocaleString()}`, '']}
                                labelClassName="font-medium"
                            />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Line type="monotone" dataKey="verified" name="Verified" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} />
                            <Line type="monotone" dataKey="settled" name="Settled" stroke="#eab308" strokeWidth={2} dot={{ r: 2 }} />
                            <Line type="monotone" dataKey="pending" name="Pending" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Summary Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Verified</div>
                        <div className="text-2xl font-bold text-green-600">LKR {stats.verifiedAmount.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-yellow-500">
                    <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Settled</div>
                        <div className="text-2xl font-bold text-yellow-600">LKR {stats.settledAmount.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                    <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Pending ({stats.pendingCount})</div>
                        <div className="text-2xl font-bold text-red-600">LKR {stats.pendingAmount.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Total ({stats.totalCount} batches)</div>
                        <div className="text-2xl font-bold text-blue-600">LKR {stats.totalAmount.toLocaleString()}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Terminals Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold tracking-tight">Terminals</h3>
                    {!isAdding && (
                        <Button size="sm" variant="outline" onClick={() => setIsAdding(true)}>
                            <PlusCircle className="h-4 w-4 mr-1" />
                            Add Terminal
                        </Button>
                    )}
                </div>

                {/* Add Terminal Form */}
                {isAdding && (
                    <Card className="border-blue-200 bg-blue-50/30">
                        <CardContent className="py-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Provider</Label>
                                    <Select
                                        value={newTerminal.provider}
                                        onValueChange={(val: string) => setNewTerminal({ ...newTerminal, provider: val as "VISA/MASTER" | "AMEX" })}
                                    >
                                        <SelectTrigger className="h-7 text-xs">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="VISA/MASTER">VISA/MASTER</SelectItem>
                                            <SelectItem value="AMEX">AMEX</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Terminal ID</Label>
                                    <Input
                                        className="h-7 text-xs"
                                        placeholder="XXXXXXXX"
                                        value={newTerminal.terminalId || ""}
                                        onChange={(e) => setNewTerminal({ ...newTerminal, terminalId: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Bank Account</Label>
                                    <Input
                                        className="h-7 text-xs"
                                        placeholder="DFCC - XXXX"
                                        value={newTerminal.bankAccount || ""}
                                        onChange={(e) => setNewTerminal({ ...newTerminal, bankAccount: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-end gap-2">
                                    <Button size="sm" className="h-7 text-xs" onClick={handleAddTerminal}>Save</Button>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsAdding(false)}>Cancel</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Cards Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                    {localTerminals.map((t) => (
                        <Card key={t.id}>
                            {editingId === t.id ? (
                                // Editing Mode
                                <CardContent className="pt-6 space-y-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Provider</Label>
                                        <Select
                                            value={editForm.provider}
                                            onValueChange={(val: string) => setEditForm(prev => ({ ...prev, provider: val as "VISA/MASTER" | "AMEX" }))}
                                        >
                                            <SelectTrigger className="h-8" onKeyDown={(e) => { if (e.key === 'Enter') saveEditing() }}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="VISA/MASTER">VISA/MASTER</SelectItem>
                                                <SelectItem value="AMEX">AMEX</SelectItem>
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
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 px-3">
                                        <CardTitle className="text-sm font-medium">
                                            {t.provider}
                                        </CardTitle>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => startEditing(t)}>
                                                <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
                                            </Button>
                                            <Badge variant={t.status === 'active' ? 'default' : 'destructive'} className="text-[9px] h-4 px-1">
                                                {t.status === 'active' ? '●' : '○'}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="py-2 px-3">
                                        <div className="text-base font-bold">{t.terminalId}</div>
                                        <p className="text-[13px] text-muted-foreground">
                                            {t.bankAccount}
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
                </div>
            </div>

            {/* Settlements Table */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold tracking-tight">Settlements - {selectedMonthLabel}</h3>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => setIsAddingSettlement(true)}>
                            <PlusCircle className="h-4 w-4 mr-1" />
                            Add Settlement
                        </Button>
                        <span className="text-sm text-muted-foreground">Month:</span>
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {monthOptions.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Filter Row */}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-muted-foreground font-medium">Filters:</span>
                    <div className="flex items-center gap-1">
                        <span className="text-muted-foreground text-xs">From:</span>
                        <Input
                            type="date"
                            value={filterFromDate}
                            onChange={(e) => setFilterFromDate(e.target.value)}
                            className="h-7 w-[130px] text-xs"
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-muted-foreground text-xs">To:</span>
                        <Input
                            type="date"
                            value={filterToDate}
                            onChange={(e) => setFilterToDate(e.target.value)}
                            className="h-7 w-[130px] text-xs"
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-muted-foreground text-xs">Terminal:</span>
                        <Select value={filterTerminal} onValueChange={setFilterTerminal}>
                            <SelectTrigger className="h-7 w-[140px] text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Terminals</SelectItem>
                                {localTerminals.map(t => (
                                    <SelectItem key={t.id} value={t.terminalId}>{t.terminalId}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-muted-foreground text-xs">Status:</span>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="h-7 w-[100px] text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="Verified">Verified</SelectItem>
                                <SelectItem value="Settled">Settled</SelectItem>
                                <SelectItem value="Pending">Pending</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {(filterFromDate || filterToDate || filterTerminal !== "all" || filterStatus !== "all") && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
                            setFilterFromDate("")
                            setFilterToDate("")
                            setFilterTerminal("all")
                            setFilterStatus("all")
                        }}>
                            Clear All
                        </Button>
                    )}
                    <span className="text-muted-foreground text-xs ml-auto">
                        Showing {displaySettlements.length} records
                    </span>
                </div>

                {/* Add Settlement Form */}
                {isAddingSettlement && (
                    <Card className="border-blue-200 bg-blue-50/30">
                        <CardHeader className="py-3">
                            <CardTitle className="text-base">Add New Settlement</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs">Batch ID</Label>
                                    <Input
                                        placeholder="#B-XXX"
                                        value={newSettlement.batchId || ""}
                                        onChange={(e) => setNewSettlement({ ...newSettlement, batchId: e.target.value })}
                                        className="h-8"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Date</Label>
                                    <Input
                                        type="date"
                                        value={newSettlement.date || ""}
                                        onChange={(e) => setNewSettlement({ ...newSettlement, date: e.target.value })}
                                        className="h-8"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Time</Label>
                                    <Input
                                        type="time"
                                        value={newSettlement.time || "09:00"}
                                        onChange={(e) => setNewSettlement({ ...newSettlement, time: e.target.value })}
                                        className="h-8"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Terminal</Label>
                                    <Select
                                        value={newSettlement.terminalId || ""}
                                        onValueChange={(val: string) => setNewSettlement({ ...newSettlement, terminalId: val })}
                                    >
                                        <SelectTrigger className="h-8">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {localTerminals.map(t => (
                                                <SelectItem key={t.id} value={t.terminalId}>
                                                    {t.terminalId} ({t.provider})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Shift</Label>
                                    <Select
                                        value={newSettlement.shift || "Day"}
                                        onValueChange={(val: string) => setNewSettlement({ ...newSettlement, shift: val as "Day" | "Night" })}
                                    >
                                        <SelectTrigger className="h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Day">Day</SelectItem>
                                            <SelectItem value="Night">Night</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Amount (LKR)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={newSettlement.amount || ""}
                                        onChange={(e) => setNewSettlement({ ...newSettlement, amount: Number(e.target.value) })}
                                        className="h-8"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <Button size="sm" onClick={handleAddSettlement}>Save Settlement</Button>
                                <Button size="sm" variant="ghost" onClick={() => setIsAddingSettlement(false)}>Cancel</Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="rounded-md border max-h-[400px] overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background">
                            <TableRow>
                                <TableHead>Batch ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead>Provider</TableHead>
                                <TableHead>Terminal</TableHead>
                                <TableHead>Shift</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount (LKR)</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displaySettlements.map((s) => (
                                <TableRow key={s.id}>
                                    <TableCell className="font-medium">{s.batchId}</TableCell>
                                    <TableCell>{s.date}</TableCell>
                                    <TableCell className="text-muted-foreground">{s.time}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-xs">
                                            {localTerminals.find(t => t.terminalId === s.terminalId)?.provider || "N/A"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{s.terminalId}</TableCell>
                                    <TableCell>
                                        <Badge variant={s.shift === "Day" ? "secondary" : "outline"} className="text-xs">
                                            {s.shift === "Day" ? <Sun className="h-3 w-3 mr-1 inline" /> : <Moon className="h-3 w-3 mr-1 inline" />}
                                            {s.shift}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={
                                                s.status === 'Verified'
                                                    ? 'border-green-500 text-green-600 bg-green-50'
                                                    : s.status === 'Settled'
                                                        ? 'border-yellow-500 text-yellow-600 bg-yellow-50'
                                                        : 'border-red-500 text-red-600 bg-red-50'
                                            }
                                        >
                                            {s.status === 'Verified' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                                            {s.status === 'Pending' && <Clock className="mr-1 h-3 w-3" />}
                                            {s.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{s.amount.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">
                                        {s.status === 'Pending' && (
                                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleVerifySettlement(s.id)}>
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
        </div >
    )
}


interface DepositsViewProps {
    deposits: Deposit[]
    onVerifyDeposit: (id: string) => void
}

function DepositsView({ deposits }: DepositsViewProps) {
    // Local state for deposits
    const [localDeposits, setLocalDeposits] = React.useState(deposits)

    // Bank options
    const bankOptions = [
        { value: "DFCC Bank", label: "DFCC Bank - 102005373457" },
        { value: "DFCC Bank", label: "DFCC Bank - 101001020208" },
        { value: "DFCC Bank", label: "DFCC Bank - 10100120039" },
        { value: "BOC", label: "BOC - 85763347" },
        { value: "BOC", label: "BOC - 75941669" },
    ]

    // Method options
    const methodOptions = [
        { value: "CDM", label: "Cash Deposit Machine (CDM)" },
        { value: "Slip", label: "Bank Slip / Counter" },
        { value: "Online", label: "Online Transfer" },
    ]

    // Form state
    const [newDeposit, setNewDeposit] = React.useState<Partial<Deposit>>({
        bank: "",
        method: "",
        amount: 0,
        ref: "",
        date: MOCK_CURRENT_DATE.toISOString().split('T')[0],
        shift: "Day"
    })

    // Handle add deposit
    const handleAddDeposit = () => {
        if (!newDeposit.bank || !newDeposit.method || !newDeposit.amount || !newDeposit.ref) return

        const deposit: Deposit = {
            id: `DEP-${Date.now()}`,
            date: newDeposit.date || MOCK_CURRENT_DATE.toISOString().split('T')[0],
            bank: newDeposit.bank,
            method: newDeposit.method,
            amount: newDeposit.amount,
            ref: newDeposit.ref,
            status: "Pending",
            shift: newDeposit.shift || "Day"
        }

        setLocalDeposits([deposit, ...localDeposits])
        setNewDeposit({
            bank: "",
            method: "",
            amount: 0,
            ref: "",
            date: MOCK_CURRENT_DATE.toISOString().split('T')[0],
            shift: "Day"
        })
    }

    // Handle verify deposit
    const handleVerifyDeposit = (id: string) => {
        setLocalDeposits(localDeposits.map(d =>
            d.id === id ? { ...d, status: "Verified" } : d
        ))
    }

    // Date filter state - default to today
    const todayStr = MOCK_CURRENT_DATE.toISOString().split('T')[0]
    const [filterFromDate, setFilterFromDate] = React.useState(todayStr)
    const [filterToDate, setFilterToDate] = React.useState(todayStr)

    // Filtered deposits based on date range
    const filteredDeposits = React.useMemo(() => {
        return localDeposits.filter(d => {
            if (filterFromDate && d.date < filterFromDate) return false
            if (filterToDate && d.date > filterToDate) return false
            return true
        })
    }, [localDeposits, filterFromDate, filterToDate])

    // Summary stats
    const stats = React.useMemo(() => {
        const verified = localDeposits.filter(d => d.status === "Verified")
        const pending = localDeposits.filter(d => d.status === "Pending")
        return {
            totalDeposits: localDeposits.length,
            verifiedAmount: verified.reduce((sum, d) => sum + d.amount, 0),
            pendingAmount: pending.reduce((sum, d) => sum + d.amount, 0),
            pendingCount: pending.length
        }
    }, [localDeposits])

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Total Deposits</div>
                        <div className="text-2xl font-bold">{stats.totalDeposits}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Verified Amount</div>
                        <div className="text-2xl font-bold text-green-600">LKR {stats.verifiedAmount.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500">
                    <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Pending Amount</div>
                        <div className="text-2xl font-bold text-amber-600">LKR {stats.pendingAmount.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-gray-500">
                    <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Pending Count</div>
                        <div className="text-2xl font-bold">{stats.pendingCount}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Deposit Form - Takes up 1 column on large screens */}
                <div className="lg:col-span-1">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>New Deposit Entry</CardTitle>
                            <CardDescription>Record a bank deposit from shift cash.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Bank Account</Label>
                                    <Select value={newDeposit.bank} onValueChange={(val: string) => setNewDeposit({ ...newDeposit, bank: val })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Bank" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {bankOptions.map(b => (
                                                <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Deposit Method</Label>
                                    <Select value={newDeposit.method} onValueChange={(val: string) => setNewDeposit({ ...newDeposit, method: val })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Method" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {methodOptions.map(m => (
                                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label>Date</Label>
                                        <Input
                                            type="date"
                                            value={newDeposit.date || ""}
                                            onChange={(e) => setNewDeposit({ ...newDeposit, date: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Shift</Label>
                                        <Select value={newDeposit.shift} onValueChange={(val: string) => setNewDeposit({ ...newDeposit, shift: val as "Day" | "Night" })}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Day">Day</SelectItem>
                                                <SelectItem value="Night">Night</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Amount (LKR)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        className="font-mono"
                                        value={newDeposit.amount || ""}
                                        onChange={(e) => setNewDeposit({ ...newDeposit, amount: Number(e.target.value) })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Reference Number</Label>
                                    <Input
                                        placeholder="Enter Slip/CDM Ref"
                                        value={newDeposit.ref || ""}
                                        onChange={(e) => setNewDeposit({ ...newDeposit, ref: e.target.value })}
                                    />
                                </div>

                                <Button className="w-full" size="lg" onClick={handleAddDeposit}>
                                    Submit Entry
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* History Table - Takes up 2 columns on large screens */}
                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <CardHeader className="pb-3">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <div>
                                    <CardTitle>Recent Deposits</CardTitle>
                                    <CardDescription>History of recorded deposits and their verification status.</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CalendarRange className="h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="date"
                                        className="h-8 w-[130px] text-xs"
                                        value={filterFromDate}
                                        onChange={(e) => setFilterFromDate(e.target.value)}
                                        placeholder="From"
                                    />
                                    <span className="text-muted-foreground text-xs">to</span>
                                    <Input
                                        type="date"
                                        className="h-8 w-[130px] text-xs"
                                        value={filterToDate}
                                        onChange={(e) => setFilterToDate(e.target.value)}
                                        placeholder="To"
                                    />
                                    {(filterFromDate || filterToDate) && (
                                        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFilterFromDate(""); setFilterToDate(""); }}>
                                            Clear
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border max-h-[500px] overflow-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background">
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Bank Info</TableHead>
                                            <TableHead>Reference</TableHead>
                                            <TableHead>Shift</TableHead>
                                            <TableHead className="text-right">Amount (LKR)</TableHead>
                                            <TableHead className="text-right">Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredDeposits.map((deposit) => (
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
                                                <TableCell>
                                                    <Badge variant={deposit.shift === "Day" ? "secondary" : "outline"} className="text-xs">
                                                        {deposit.shift === "Day" ? <Sun className="h-3 w-3 mr-1 inline" /> : <Moon className="h-3 w-3 mr-1 inline" />}
                                                        {deposit.shift}
                                                    </Badge>
                                                </TableCell>
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
                                                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleVerifyDeposit(deposit.id)}>
                                                            Verify
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

function ExpensesView() {
    // Month selector - generate options for last 12 months
    const monthOptions = React.useMemo(() => {
        const options: { value: string; label: string }[] = []
        const today = MOCK_CURRENT_DATE
        for (let i = 0; i < 12; i++) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
            const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            options.push({ value, label })
        }
        return options
    }, [])

    const [selectedMonth, setSelectedMonth] = React.useState("2025-12")
    const [expandedPayee, setExpandedPayee] = React.useState<string | null>(null) // "category:payee" format
    const allExpenses = MOCK_EXPENSES

    // Filter expenses by selected month
    const expenses = React.useMemo(() => {
        return allExpenses.filter(e => e.date.startsWith(selectedMonth))
    }, [allExpenses, selectedMonth])

    // Group expenses by category
    const expensesByCategory = React.useMemo(() => {
        const grouped: Record<string, { payee: string; total: number; count: number; items: Expense[] }[]> = {}

        EXPENSE_CATEGORIES.forEach(cat => {
            const catExpenses = expenses.filter(e => e.category === cat)
            if (catExpenses.length === 0) return

            // Group by payee within category
            const payeeMap: Record<string, { total: number; count: number; items: Expense[] }> = {}
            catExpenses.forEach(exp => {
                if (!payeeMap[exp.payee]) {
                    payeeMap[exp.payee] = { total: 0, count: 0, items: [] }
                }
                payeeMap[exp.payee].total += exp.amount
                payeeMap[exp.payee].count += 1
                payeeMap[exp.payee].items.push(exp)
            })

            grouped[cat] = Object.entries(payeeMap).map(([payee, data]) => ({
                payee,
                ...data
            }))
        })

        return grouped
    }, [expenses])

    const totalExpenses = expenses.reduce((a, c) => a + c.amount, 0)
    const selectedMonthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth

    const togglePayee = (category: string, payee: string) => {
        const key = `${category}:${payee}`
        setExpandedPayee(prev => prev === key ? null : key)
    }

    // Generate chart data - daily expenses for selected month
    const chartData = React.useMemo(() => {
        const data: { day: string; amount: number }[] = []
        const [year, month] = selectedMonth.split('-').map(Number)
        const daysInMonth = new Date(year, month, 0).getDate()

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`
            const dayExpenses = allExpenses.filter(e => e.date === dateStr)
            const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0)
            data.push({
                day: String(day),
                amount: total
            })
        }
        return data
    }, [allExpenses, selectedMonth])

    // Chart view toggle: "monthly" (daily view) or "yearly" (monthly totals)
    const [chartView, setChartView] = React.useState<"monthly" | "yearly">("monthly")

    // Generate yearly chart data - monthly totals for last 12 months
    const yearlyChartData = React.useMemo(() => {
        const data: { month: string; amount: number }[] = []
        const today = MOCK_CURRENT_DATE

        for (let i = 11; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            const monthLabel = date.toLocaleDateString('en-US', { month: 'short' })
            const monthExpenses = allExpenses.filter(e => e.date.startsWith(monthKey))
            const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0)
            data.push({
                month: monthLabel,
                amount: total
            })
        }
        return data
    }, [allExpenses])

    return (
        <div className="space-y-6">
            {/* Expenses Trend Chart */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                    <div>
                        <CardTitle className="text-lg">
                            {chartView === "monthly"
                                ? `Expenses Trend - ${selectedMonthLabel}`
                                : "Yearly Expenses Overview"}
                        </CardTitle>
                        <CardDescription>
                            {chartView === "monthly"
                                ? "Daily expense totals for the selected month"
                                : "Monthly expense totals for the last 12 months"}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant={chartView === "monthly" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setChartView("monthly")}
                        >
                            Monthly
                        </Button>
                        <Button
                            variant={chartView === "yearly" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setChartView("yearly")}
                        >
                            Yearly
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartView === "monthly" ? chartData : yearlyChartData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis
                                    dataKey={chartView === "monthly" ? "day" : "month"}
                                    tick={{ fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                                />
                                <Tooltip
                                    formatter={(value: number) => [`LKR ${value.toLocaleString()}`, 'Expenses']}
                                    labelFormatter={(label) => chartView === "monthly" ? `Day ${label}` : label}
                                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="amount"
                                    stroke="#f97316"
                                    strokeWidth={2}
                                    dot={{ fill: '#f97316', strokeWidth: 0, r: 3 }}
                                    activeDot={{ r: 5, fill: '#f97316' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Header with Month Filter */}
            <Card className="border-l-4 border-l-orange-500">
                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                    <div>
                        <CardTitle>Company Expenses Overview</CardTitle>
                        <CardDescription>Expenses recorded from completed shifts, grouped by category.</CardDescription>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                        {/* Month Selector */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Month:</span>
                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Select Month" />
                                </SelectTrigger>
                                <SelectContent>
                                    {monthOptions.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-muted-foreground">{selectedMonthLabel} ({expenses.length} entries)</div>
                            <div className="text-2xl font-bold text-orange-600">LKR {totalExpenses.toLocaleString()}</div>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Category Breakdown with Expandable Payees */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {EXPENSE_CATEGORIES.map(category => {
                    const payees = expensesByCategory[category]
                    if (!payees || payees.length === 0) return null

                    const categoryTotal = payees.reduce((a, p) => a + p.total, 0)

                    return (
                        <Card key={category} className="overflow-hidden">
                            <CardHeader className="bg-muted/30 py-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base font-semibold">{category}</CardTitle>
                                    <Badge variant="secondary" className="font-mono">
                                        LKR {categoryTotal.toLocaleString()}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="text-xs">
                                            <TableHead>Payee</TableHead>
                                            <TableHead className="text-center"># Entries</TableHead>
                                            <TableHead className="text-right">Total (LKR)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {payees.map(payeeData => {
                                            const isExpanded = expandedPayee === `${category}:${payeeData.payee}`
                                            return (
                                                <React.Fragment key={payeeData.payee}>
                                                    <TableRow
                                                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                                                        onClick={() => togglePayee(category, payeeData.payee)}
                                                    >
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                                                {payeeData.payee}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center text-muted-foreground">{payeeData.count}</TableCell>
                                                        <TableCell className="text-right font-semibold">{payeeData.total.toLocaleString()}</TableCell>
                                                    </TableRow>
                                                    {isExpanded && (
                                                        <TableRow>
                                                            <TableCell colSpan={3} className="bg-muted/20 p-0">
                                                                <div className="p-3 space-y-2">
                                                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                                                        Transaction Details
                                                                    </div>
                                                                    <Table>
                                                                        <TableHeader>
                                                                            <TableRow className="text-xs">
                                                                                <TableHead className="py-1">Date</TableHead>
                                                                                <TableHead className="py-1">Description</TableHead>
                                                                                <TableHead className="py-1">Invoice #</TableHead>
                                                                                <TableHead className="py-1">Shift</TableHead>
                                                                                <TableHead className="py-1 text-right">Amount</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {payeeData.items.map(item => (
                                                                                <TableRow key={item.id} className="text-xs">
                                                                                    <TableCell className="py-1 font-mono">{item.date}</TableCell>
                                                                                    <TableCell className="py-1">{item.description}</TableCell>
                                                                                    <TableCell className="py-1 font-mono">{item.invoiceNumber || "-"}</TableCell>
                                                                                    <TableCell className="py-1">
                                                                                        <Badge variant="outline" className="text-[10px]">{item.shift}</Badge>
                                                                                    </TableCell>
                                                                                    <TableCell className="py-1 text-right font-medium">{item.amount.toLocaleString()}</TableCell>
                                                                                </TableRow>
                                                                            ))}
                                                                        </TableBody>
                                                                    </Table>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </React.Fragment>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )
                })}
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
