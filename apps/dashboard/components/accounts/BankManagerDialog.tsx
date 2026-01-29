"use client"

import * as React from "react"
import { useBanks } from "@/lib/hooks"
import { api } from "@/lib/api/client"
import { BankAccount } from "@/lib/api/types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Pencil, Trash2, Building2 } from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"

export function BankManagerDialog() {
    const [open, setOpen] = React.useState(false)
    const { data: banks, mutate } = useBanks(false) // Fetch ALL banks including inactive
    const [editingBank, setEditingBank] = React.useState<BankAccount | null>(null)
    const [isLoading, setIsLoading] = React.useState(false)

    // Form state
    const [formData, setFormData] = React.useState({
        bank_name: "",
        account_number: "",
        account_name: "",
        branch: ""
    })

    // Delete confirmation
    const [deleteId, setDeleteId] = React.useState<string | null>(null)

    // Reset form
    const resetForm = () => {
        setFormData({
            bank_name: "",
            account_number: "",
            account_name: "",
            branch: ""
        })
        setEditingBank(null)
    }

    // Populate form when editing
    React.useEffect(() => {
        if (editingBank) {
            setFormData({
                bank_name: editingBank.bank_name,
                account_number: editingBank.account_number,
                account_name: editingBank.account_name,
                branch: editingBank.branch || ""
            })
        }
    }, [editingBank])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            if (editingBank) {
                await api.accounts.updateBank(editingBank.id, formData)
                toast.success("Bank account updated successfully")
            } else {
                await api.accounts.createBank(formData)
                toast.success("Bank account created successfully")
            }
            mutate()
            resetForm()
        } catch (error: any) {
            toast.error(error.message || "Failed to save bank account")
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteId) return

        try {
            await api.accounts.deleteBank(deleteId)
            toast.success("Bank account deactivated")
            mutate()
            setDeleteId(null)
        } catch (error: any) {
            toast.error("Failed to deactivate bank account")
        }
    }

    const handleReactivate = async (bank: BankAccount) => {
        try {
            await api.accounts.updateBank(bank.id, { is_active: true })
            toast.success("Bank account reactivated")
            mutate()
        } catch (error: any) {
            toast.error("Failed to reactivate bank account")
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={(val) => {
                setOpen(val)
                if (!val) resetForm()
            }}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Building2 className="h-4 w-4" />
                        Manage Banks
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Manage Bank Accounts</DialogTitle>
                        <DialogDescription>
                            Add, edit, or deactivate bank accounts used for deposits.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-hidden min-h-[400px]">
                        {/* List Section */}
                        <div className="md:col-span-2 border rounded-md overflow-hidden flex flex-col">
                            <div className="bg-muted/50 p-2 border-b flex justify-between items-center">
                                <span className="text-sm font-medium">Existing Accounts</span>
                                <Badge variant="secondary" className="text-xs">{banks?.length || 0}</Badge>
                            </div>
                            <div className="overflow-auto flex-1">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Bank Info</TableHead>
                                            <TableHead>Account No</TableHead>
                                            <TableHead className="w-[100px]">Status</TableHead>
                                            <TableHead className="w-[80px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {banks?.map((bank) => (
                                            <TableRow key={bank.id} className={!bank.is_active ? "opacity-60 bg-muted/50" : ""}>
                                                <TableCell>
                                                    <div className="font-medium">{bank.bank_name}</div>
                                                    <div className="text-xs text-muted-foreground">{bank.branch}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-mono text-xs">{bank.account_number}</div>
                                                    <div className="text-[10px] text-muted-foreground truncate max-w-[120px]" title={bank.account_name}>{bank.account_name}</div>
                                                </TableCell>
                                                <TableCell>
                                                    {bank.is_active ? (
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => setEditingBank(bank)}
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                        {bank.is_active ? (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                                onClick={() => setDeleteId(bank.id)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-green-600 hover:text-green-700"
                                                                onClick={() => handleReactivate(bank)}
                                                                title="Reactivate"
                                                            >
                                                                <Plus className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(!banks || banks.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                    No bank accounts found
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Form Section */}
                        <div className="border rounded-md p-4 bg-card h-fit">
                            <div className="font-medium mb-4 flex items-center justify-between">
                                {editingBank ? "Edit Account" : "Add New Account"}
                                {editingBank && (
                                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={resetForm}>
                                        Cancel
                                    </Button>
                                )}
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bank_name">Bank Name</Label>
                                    <Input
                                        id="bank_name"
                                        placeholder="e.g. BOC, Peoples Bank"
                                        value={formData.bank_name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="account_no">Account Number</Label>
                                    <Input
                                        id="account_no"
                                        placeholder="Account Number"
                                        value={formData.account_number}
                                        onChange={(e) => setFormData(prev => ({ ...prev, account_number: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="account_name">Account Name</Label>
                                    <Input
                                        id="account_name"
                                        placeholder="Account Holder Name"
                                        value={formData.account_name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, account_name: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="branch">Branch (Optional)</Label>
                                    <Input
                                        id="branch"
                                        placeholder="Branch Name"
                                        value={formData.branch}
                                        onChange={(e) => setFormData(prev => ({ ...prev, branch: e.target.value }))}
                                    />
                                </div>

                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editingBank ? "Update Account" : "Add Account"}
                                </Button>
                            </form>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                isOpen={!!deleteId}
                title="Deactivate Bank Account"
                message="Are you sure you want to deactivate this bank account? It will be hidden from the selection list but can be reactivated later."
                confirmText="Deactivate"
                cancelText="Cancel"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setDeleteId(null)}
            />
        </>
    )
}
