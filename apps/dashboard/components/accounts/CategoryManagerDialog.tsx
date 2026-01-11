import * as React from "react"
import { Loader2, Plus, Pencil, Trash2, X } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import api from "@/lib/api/client"
import { withRetry } from "@/lib/utils"
import useSWR, { mutate } from "swr"
import { ExpenseCategoryRead } from "@/lib/api/types"

export function CategoryManagerDialog() {
    const [open, setOpen] = React.useState(false)
    const [editingCategory, setEditingCategory] = React.useState<ExpenseCategoryRead | null>(null)
    const [newCategoryName, setNewCategoryName] = React.useState("")
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    // Fetch categories
    const { data: categories, isLoading, error } = useSWR('/expenses/categories', api.expenses.getCategories)

    // Reset form when dialog opens/closes
    React.useEffect(() => {
        if (!open) {
            setEditingCategory(null)
            setNewCategoryName("")
        }
    }, [open])

    // Fill form when editing
    React.useEffect(() => {
        if (editingCategory) {
            setNewCategoryName(editingCategory.name)
        } else {
            setNewCategoryName("")
        }
    }, [editingCategory])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newCategoryName.trim()) return

        setIsSubmitting(true)
        try {
            if (editingCategory) {
                await withRetry(() => api.expenses.updateCategory(editingCategory.id, { name: newCategoryName }))
                toast.success("Category updated")
            } else {
                await withRetry(() => api.expenses.createCategory({ name: newCategoryName }))
                toast.success("Category created")
            }
            mutate('/expenses/categories')
            setEditingCategory(null)
            setNewCategoryName("")
        } catch (err: any) {
            toast.error(err.message || "Failed to save category")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this category?")) return
        try {
            await withRetry(() => api.expenses.deleteCategory(id))
            toast.success("Category deleted")
            mutate('/expenses/categories')
        } catch (err: any) {
            toast.error(err.message || "Failed to delete category")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">Manage Categories</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Expense Categories</DialogTitle>
                    <DialogDescription>
                        Manage custom expense categories for your station. Default categories cannot be modified.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Form Section */}
                    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
                        <div className="grid w-full gap-1.5">
                            <Label htmlFor="category-name">
                                {editingCategory ? "Edit Category Name" : "New Category Name"}
                            </Label>
                            <Input
                                id="category-name"
                                placeholder="Enter category name..."
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-1">
                            {editingCategory && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setEditingCategory(null)
                                        setNewCategoryName("")
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                            <Button type="submit" disabled={isSubmitting || !newCategoryName.trim()}>
                                {isSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    editingCategory ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </form>

                    {/* List Section */}
                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                        {isLoading ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : error ? (
                            <div className="text-destructive text-center text-sm">Failed to load categories</div>
                        ) : categories?.length === 0 ? (
                            <div className="text-muted-foreground text-center text-sm">No categories found</div>
                        ) : (
                            categories?.map((cat) => (
                                <Card key={cat.id} className="bg-muted/30">
                                    <CardContent className="p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">{cat.name}</span>
                                            {cat.is_default && (
                                                <Badge variant="secondary" className="text-[10px] h-5">Default</Badge>
                                            )}
                                        </div>

                                        {!cat.is_default && (
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => setEditingCategory(cat)}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                                    onClick={() => handleDelete(cat.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
