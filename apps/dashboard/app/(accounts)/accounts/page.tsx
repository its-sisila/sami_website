
"use client"

import * as React from "react"
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
import { PlusCircle, FileText, CreditCard, Wallet, TrendingUp } from "lucide-react"

// --- Mock Data ---

interface CompanyAccount {
    id: string
    name: string
    contactPerson: string
    creditLimit: number
    currentBalance: number
}

const companies: CompanyAccount[] = [
    { id: "1", name: "ABC Logistics", contactPerson: "John Doe", creditLimit: 500000, currentBalance: 125000 },
    { id: "2", name: "City Taxis", contactPerson: "Jane Smith", creditLimit: 100000, currentBalance: -5000 }, // Credit/Overpaid
    { id: "3", name: "Green Farms", contactPerson: "Mike Brown", creditLimit: 750000, currentBalance: 450000 },
    { id: "4", name: "Metro Bus Svc", contactPerson: "Sarah Lee", creditLimit: 2000000, currentBalance: 0 },
    { id: "5", name: "Tech Solutions", contactPerson: "David Kim", creditLimit: 300000, currentBalance: 320000 }, // Over limit
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
    status: "Settled" | "Pending"
}

const settlements: Settlement[] = [
    { id: "1", batchId: "#B-001", date: "2024-10-24", terminalId: "T-883920", amount: 154000, status: "Settled" },
    { id: "2", batchId: "#B-002", date: "2024-10-24", terminalId: "T-883921", amount: 89500, status: "Settled" },
    { id: "3", batchId: "#B-003", date: "2024-10-25", terminalId: "T-772100", amount: 23000, status: "Pending" },
]

// --- Components ---

function WorkingCapitalGraph() {
    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Working Capital & Cash Flow
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-48 w-full bg-muted/50 border border-dashed rounded-xl flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                        <p className="font-medium">Cash Flow Graph Placeholder</p>
                        <p className="text-xs">Visualizing Cash + Receivables - Payables over time</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function CompanyAccountsTable() {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Company Name</TableHead>
                        <TableHead>Contact Person</TableHead>
                        <TableHead className="text-right">Credit Limit (LKR)</TableHead>
                        <TableHead className="text-right">Balance (LKR)</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {companies.map((company) => (
                        <TableRow key={company.id}>
                            <TableCell className="font-medium">{company.name}</TableCell>
                            <TableCell>{company.contactPerson}</TableCell>
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
                                <Button variant="ghost" size="sm">
                                    View History
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

function CardTerminalsView() {
    return (
        <div className="space-y-6">
            {/* Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {terminals.map((t) => (
                    <Card key={t.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {t.provider} Terminal
                            </CardTitle>
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
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
                    </Card>
                ))}
                <Card className="flex flex-col items-center justify-center border-dashed cursor-pointer hover:bg-muted/50 transition-colors bg-muted/20">
                    <div className="flex flex-col items-center justify-center p-6 text-muted-foreground">
                        <PlusCircle className="h-8 w-8 mb-2" />
                        <span className="text-sm font-medium">Add New Terminal</span>
                    </div>
                </Card>
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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {settlements.map((s) => (
                                <TableRow key={s.id}>
                                    <TableCell className="font-medium">{s.batchId}</TableCell>
                                    <TableCell>{s.date}</TableCell>
                                    <TableCell>{s.terminalId}</TableCell>
                                    <TableCell>
                                        <Badge variant={s.status === 'Settled' ? 'secondary' : 'outline'}>{s.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{s.amount.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}

export default function AccountsPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6 bg-background min-h-screen">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Accounts & Finance</h2>
                <div className="flex items-center space-x-2">
                    <Button>
                        <FileText className="mr-2 h-4 w-4" />
                        Download Reports
                    </Button>
                </div>
            </div>

            {/* Working Capital Placeholder */}
            <WorkingCapitalGraph />

            <Tabs defaultValue="companies" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="companies">Company Accounts</TabsTrigger>
                    <TabsTrigger value="terminals">Card Terminals</TabsTrigger>
                </TabsList>

                <TabsContent value="companies" className="space-y-4">
                    <div className="flex justify-end mb-4">
                        <Button variant="outline">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            New Company Account
                        </Button>
                    </div>
                    <CompanyAccountsTable />
                </TabsContent>

                <TabsContent value="terminals" className="space-y-4">
                    <CardTerminalsView />
                </TabsContent>
            </Tabs>
        </div>
    )
}
