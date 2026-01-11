import * as React from "react"
import { Loader2 } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import api from "@/lib/api/client"
import { withRetry } from "@/lib/utils"
import { mutate } from "swr"
import { Expense, ExpenseUpdate } from "@/lib/api/types"
import useSWR from "swr"

interface ExpenseDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    expense?: Expense
    onSuccess?: () => void
}

export function ExpenseDialog({ open, onOpenChange, expense, onSuccess }: ExpenseDialogProps) {
    const isEditing = !!expense
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    // Form State
    const [formData, setFormData] = React.useState<ExpenseUpdate>({
        category: '',
        payee: '',
        description: '',
        amount: 0,
        invoice_number: '',
        expense_date: '',
        notes: ''
    })

    // Fetch categories
    const { data: categories } = useSWR('/expenses/categories', api.expenses.getCategories)

    // Initialize form
    React.useEffect(() => {
        if (open) {
            if (expense) {
                setFormData({
                    category: expense.category,
                    payee: expense.payee,
                    description: expense.description || '',
                    amount: Number(expense.amount),
                    invoice_number: expense.invoice_number || '',
                    expense_date: expense.expense_date,
                    notes: expense.notes || ''
                })
            } else {
                setFormData({
                    category: '',
                    payee: '',
                    description: '',
                    amount: 0,
                    invoice_number: '',
                    expense_date: new Date().toISOString().split('T')[0],
                    notes: ''
                })
            }
        }
    }, [open, expense])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            if (isEditing && expense) {
                await withRetry(() => api.expenses.update(expense.id, formData))
                toast.success("Expense updated successfully")
            } else {
                // Should not happen in this specific task scope as creating is separate, 
                // but good for completeness:
                // await withRetry(() => api.expenses.create(formData as ExpenseCreate))
            }

            mutate('/expenses')
            // Revalidate chart data too
            mutate((key: string) => typeof key === 'string' && key.startsWith('/expenses'), undefined, { revalidate: true })

            if (onSuccess) onSuccess()
            onOpenChange(false)
        } catch (err: any) {
            toast.error(err.message || "Failed to save expense")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Expense" : "New Expense"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">Category</Label>
                        <Select
                            value={formData.category || ''}
                            onValueChange={(val: string) => setFormData({ ...formData, category: val })}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories?.map(c => (
                                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="payee" className="text-right">Payee</Label>
                        <Input
                            id="payee"
                            value={formData.payee || ''}
                            onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
                            className="col-span-3"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">Amount</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={formData.amount || ''}
                            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                            className="col-span-3 font-mono"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">Date</Label>
                        <Input
                            id="date"
                            type="date"
                            value={formData.expense_date || ''}
                            onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                            className="col-span-3"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="col-span-3 h-20"
                        />
                    </div>
                </form>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
