"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, FileText, Download } from "lucide-react"
import { api } from "@/lib/api/client"
import { format } from "date-fns"

export function ReportsDialog({ children }: { children?: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [reportType, setReportType] = useState<string>("sales")
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

    const handleDownload = async () => {
        try {
            setLoading(true)

            // Validate dates
            if (startDate > endDate) {
                alert("Start date must be before end date")
                return
            }

            switch (reportType) {
                case "sales":
                    await api.exports.downloadSales(startDate, endDate)
                    break
                case "settlements":
                    await api.exports.downloadCardSettlements(startDate, endDate)
                    break
                case "deposits":
                    await api.exports.downloadDeposits(startDate, endDate)
                    break
                case "expenses":
                    await api.exports.downloadExpenses(startDate, endDate)
                    break
                case "reconciliation":
                    await api.exports.downloadReconciliation(startDate, endDate)
                    break
                default:
                    alert("Invalid report type")
            }

            setOpen(false)
        } catch (error) {
            console.error("Export failed:", error)
            alert("Failed to download report. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline">
                        <FileText className="mr-2 h-4 w-4" />
                        Reports
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Export Reports</DialogTitle>
                    <DialogDescription>
                        Select a report type and date range to download CSV.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Report Type</Label>
                        <Select value={reportType} onValueChange={setReportType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="sales">Sales History</SelectItem>
                                <SelectItem value="settlements">Card Settlements</SelectItem>
                                <SelectItem value="deposits">Cash Deposits</SelectItem>
                                <SelectItem value="expenses">Expenses</SelectItem>
                                <SelectItem value="reconciliation">Reconciliation (Working Capital)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Start Date</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>End Date</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleDownload} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {!loading && <Download className="mr-2 h-4 w-4" />}
                        Download CSV
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
