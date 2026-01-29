
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
import { ArrowLeft, Download, FileText, Phone, Mail, Building2, CreditCard, Wallet, Loader2, AlertTriangle, Trash2 } from "lucide-react"
import { api } from "@/lib/api/client"
import { useAccount, useTransactions } from "@/lib/hooks"
import { toast } from "sonner"
import { mutate } from "swr"
import { withRetry } from "@/lib/utils"
import type { TransactionCreate } from "@/lib/api/types"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { useRouter } from "next/navigation"

// --- Types ---

interface LocalTransaction {
    id: string
    date: string
    type: "Purchase" | "Payment"
    poNumber?: string
    vehicleNumber?: string
    description: string
    liters?: number
    amount: number
}


export default function CompanyDetailsPage() {
    const params = useParams()
    const id = params?.id as string | undefined

    // Fetch data from API
    const { data: company, isLoading: companyLoading, error: companyError } = useAccount(id || null)
    const { data: apiTransactions, isLoading: transactionsLoading } = useTransactions(id || null)

    // Map API transactions to local format
    const transactions: LocalTransaction[] = React.useMemo(() => {
        if (!apiTransactions) return []
        return apiTransactions.map(t => ({
            id: t.id,
            date: t.transaction_date,
            type: t.transaction_type === 'credit' ? 'Payment' as const : 'Purchase' as const,
            description: t.description || (t.transaction_type === 'credit' ? 'Payment' : 'Credit Sale'),
            poNumber: t.reference_number || undefined,
            vehicleNumber: undefined,
            liters: t.liters ? Number(t.liters) : undefined,
            amount: t.transaction_type === 'credit' ? -Number(t.amount) : Number(t.amount)
        }))
    }, [apiTransactions])

    // Payment Form state
    const [isPaymentFormOpen, setIsPaymentFormOpen] = React.useState(false)
    const [paymentAmount, setPaymentAmount] = React.useState("")
    const [paymentMethod, setPaymentMethod] = React.useState("Cash")
    const [paymentRef, setPaymentRef] = React.useState("")
    const [isSavingPayment, setIsSavingPayment] = React.useState(false)

    // Edit Mode State
    const [isEditing, setIsEditing] = React.useState(false)
    const [editForm, setEditForm] = React.useState({
        name: '',
        address: '',
        contactPerson: '',
        phone: '',
        email: '',
        creditLimit: 0
    })
    const [isSavingEdit, setIsSavingEdit] = React.useState(false)

    // Deactivation State
    const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = React.useState(false)
    const [isDeactivating, setIsDeactivating] = React.useState(false)
    const router = useRouter()

    // Initialize edit form when company data loads
    React.useEffect(() => {
        if (company) {
            setEditForm({
                name: company.name,
                address: company.address || '',
                contactPerson: company.contact_person || '',
                phone: company.contact_number || '',
                email: company.email || '',
                creditLimit: Number(company.credit_limit)
            })
        }
    }, [company])

    const handleSavePayment = async () => {
        if (!company || !id) return
        const amount = parseFloat(paymentAmount)
        if (isNaN(amount) || amount <= 0) {
            toast.error("Please enter a valid amount")
            return
        }

        setIsSavingPayment(true)
        try {
            const data: TransactionCreate = {
                account_id: id,
                transaction_type: 'credit', // Payment reduces balance
                amount: amount,
                description: `${paymentMethod} Payment`,
                reference_number: paymentRef || null,
            }

            await withRetry(
                () => api.accounts.recordTransaction(data),
                { maxRetries: 2, onRetry: (attempt) => toast.info(`Retrying... (attempt ${attempt})`) }
            )

            // Refresh data
            mutate(`/accounts/${id}`)
            mutate(`/accounts/${id}/transactions`)

            // Reset form
            setIsPaymentFormOpen(false)
            setPaymentAmount("")
            setPaymentRef("")
            setPaymentMethod("Cash")
            toast.success("Payment recorded successfully")
        } catch (err: any) {
            toast.error(`Failed to record payment: ${err.message || err.detail || "Unknown error"}`)
        } finally {
            setIsSavingPayment(false)
        }
    }

    const handleSaveEdit = async () => {
        if (!company || !id) return

        setIsSavingEdit(true)
        try {
            await withRetry(
                () => api.accounts.update(id, {
                    name: editForm.name,
                    address: editForm.address || null,
                    contact_person: editForm.contactPerson || null,
                    contact_number: editForm.phone || null,
                    email: editForm.email || null,
                    credit_limit: editForm.creditLimit
                }),
                { maxRetries: 2, onRetry: (attempt) => toast.info(`Retrying... (attempt ${attempt})`) }
            )

            // Refresh data
            mutate(`/accounts/${id}`)
            mutate('/accounts?active_only=true')

            setIsEditing(false)
            toast.success("Company details updated")
        } catch (err: any) {
            toast.error(`Failed to update: ${err.message || err.detail || "Unknown error"}`)
        } finally {
            setIsSavingEdit(false)
        }
    }

    const handleDeactivate = async () => {
        if (!id) return

        setIsDeactivating(true)
        try {
            await withRetry(
                () => api.accounts.update(id, { is_active: false }),
                { maxRetries: 2, onRetry: (attempt) => toast.info(`Retrying... (attempt ${attempt})`) }
            )

            // Refresh accounts list
            mutate('/accounts?active_only=true')

            toast.success("Company account deactivated")
            setIsDeactivateDialogOpen(false)

            // Navigate back to accounts list
            router.push('/accounts')
        } catch (err: any) {
            toast.error(`Failed to deactivate: ${err.message || err.detail || "Unknown error"}`)
        } finally {
            setIsDeactivating(false)
        }
    }

    // Loading state
    if (companyLoading || transactionsLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Loading company details...</p>
            </div>
        )
    }

    // Error or not found state
    if (companyError || !company) {
        return (
            <div className="p-8 space-y-4">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/accounts">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Accounts
                    </Link>
                </Button>
                <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-muted/20">
                    <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
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
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                            <FileText className="h-4 w-4 mr-2" />
                            Edit Details
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setIsDeactivateDialogOpen(true)}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Deactivate
                        </Button>
                    </div>
                )}
            </div>

            {/* Deactivation Confirmation Dialog */}
            <ConfirmDialog
                isOpen={isDeactivateDialogOpen}
                title="Deactivate Company Account?"
                message={`Are you sure you want to deactivate ${company.name}? The company will no longer appear in the active accounts list. This can be reversed by a system administrator.`}
                confirmText={isDeactivating ? "Deactivating..." : "Deactivate"}
                onConfirm={handleDeactivate}
                onCancel={() => setIsDeactivateDialogOpen(false)}
                variant="danger"
            />

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
                                <Button size="sm" onClick={handleSaveEdit} disabled={isSavingEdit}>
                                    {isSavingEdit && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    {isSavingEdit ? "Saving..." : "Save Changes"}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => {
                                    setIsEditing(false)
                                    setEditForm({
                                        name: company.name,
                                        address: company.address || '',
                                        contactPerson: company.contact_person || '',
                                        phone: company.contact_number || '',
                                        email: company.email || '',
                                        creditLimit: Number(company.credit_limit)
                                    })
                                }}>Cancel</Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-3xl font-bold tracking-tight">{company.name}</h2>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                    <Building2 className="h-3.5 w-3.5" />
                                    <span>{company.address || 'No address'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5" />
                                    <span>{company.contact_person || 'No contact'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Phone className="h-3.5 w-3.5" />
                                    <span>{company.contact_number || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Mail className="h-3.5 w-3.5" />
                                    <span>{company.email || 'N/A'}</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                        <p className="text-sm font-medium text-muted-foreground">Current Balance</p>
                        <div className={`text-3xl font-bold ${Number(company.current_balance) > 0
                            ? Number(company.current_balance) > Number(company.credit_limit) ? "text-red-600" : "text-orange-600"
                            : "text-green-600"
                            }`}>
                            LKR {Number(company.current_balance).toLocaleString()}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                        <span>Credit Limit:</span>
                        <span className="font-semibold text-foreground">LKR {Number(company.credit_limit).toLocaleString()}</span>
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
                <Card className="border-green-200 bg-green-50/50">
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
                                    disabled={isSavingPayment}
                                >
                                    {isSavingPayment && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    {isSavingPayment ? "Saving..." : "Save"}
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
