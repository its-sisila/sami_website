"use client";

import { useState, useMemo } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useRegulatoryReturns, useTanks, useEmployees } from "@/lib/hooks/use-api";
import { Loader2 } from "lucide-react";

// Reason options (matching the form)
const REASONS = [
    { id: "phi_quality", label: "PHI Quality Check" },
    { id: "meter_calibration", label: "Meter Calibration Test" },
    { id: "regulatory_inspection", label: "Regulatory Inspection" },
    { id: "dispenser_test", label: "Dispenser Test" },
    { id: "tank_inspection", label: "Tank Inspection Sample" },
    { id: "customer_complaint", label: "Customer Complaint Investigation" },
    { id: "monthly_sample", label: "Monthly Quality Sample" },
    { id: "other", label: "Other" },
];

export function RegulatoryReturnHistory() {
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30); // Default to last 30 days
        return date.toISOString().split("T")[0];
    });
    const [endDate, setEndDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [selectedTank, setSelectedTank] = useState("all");
    const [selectedReason, setSelectedReason] = useState("all");

    // Fetch data
    const { data: returns, isLoading: returnsLoading } = useRegulatoryReturns();
    const { data: tanks } = useTanks();
    const { data: employees } = useEmployees();

    // Helper to get tank name
    const getTankName = (tankId: string) => {
        const tank = tanks?.find(t => t.id === tankId);
        return tank ? tank.name : "Unknown Tank";
    };

    // Helper to get staff name
    const getStaffName = (staffId: string | null) => {
        if (!staffId) return "-";
        const emp = employees?.find(e => e.id === staffId);
        return emp ? (emp.name_with_initials || emp.full_name) : "Unknown Staff";
    };

    // Helper to get reason label
    const getReasonLabel = (reasonId: string | null) => {
        if (!reasonId) return "-";
        // Check if reason matches a known ID, otherwise display as is
        const known = REASONS.find(r => r.id === reasonId);
        if (known) return known.label;

        // Handle "Reason - Note" format if we stored it that way
        const prefix = REASONS.find(r => reasonId.startsWith(r.label));
        return prefix ? reasonId : (reasonId || "-");
    };

    // Filter history
    const filteredHistory = useMemo(() => {
        if (!returns) return [];
        return returns.filter((row) => {
            const dateMatch = row.return_date >= startDate && row.return_date <= endDate;
            const tankMatch = selectedTank === "all" || row.tank_id === selectedTank;
            // Fuzzy search for reason or exact match
            const reasonMatch = selectedReason === "all" ||
                (row.reason && (row.reason === selectedReason || row.reason.includes(REASONS.find(r => r.id === selectedReason)?.label || "____")));
            return dateMatch && tankMatch && reasonMatch;
        });
    }, [returns, startDate, endDate, selectedTank, selectedReason]);

    // Calculate total returned
    const totalReturned = useMemo(() => {
        return filteredHistory.reduce((sum, row) => sum + row.liters_returned, 0);
    }, [filteredHistory]);

    if (returnsLoading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filters - responsive grid layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                <div className="grid gap-2">
                    <span className="text-sm text-muted-foreground">From</span>
                    <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="text-sm"
                    />
                </div>
                <div className="grid gap-2">
                    <span className="text-sm text-muted-foreground">To</span>
                    <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="text-sm"
                    />
                </div>
                <div className="grid gap-2">
                    <span className="text-sm text-muted-foreground">Tank</span>
                    <Select value={selectedTank} onValueChange={setSelectedTank}>
                        <SelectTrigger>
                            <SelectValue placeholder="All Tanks" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Tanks</SelectItem>
                            {tanks?.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                    {t.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <span className="text-sm text-muted-foreground">Reason</span>
                    <Select value={selectedReason} onValueChange={setSelectedReason}>
                        <SelectTrigger>
                            <SelectValue placeholder="All Reasons" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Reasons</SelectItem>
                            {REASONS.map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                    {r.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-4 justify-end">
                    <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
                        Total: {totalReturned.toLocaleString()} L
                    </Badge>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {filteredHistory.length} records
                    </span>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md border max-h-[400px] overflow-auto">
                <Table>
                    <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Tank</TableHead>
                            <TableHead className="text-right">Qty (L)</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Staff</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredHistory.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                    No regulatory returns found for the selected filters
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredHistory.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell className="font-medium">{new Date(row.return_date).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </TableCell>
                                    <TableCell className="font-mono text-sm">{getTankName(row.tank_id)}</TableCell>
                                    <TableCell className="text-right font-medium text-orange-600">
                                        +{row.liters_returned}
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={row.reason || ""}>
                                        {getReasonLabel(row.reason)}
                                    </TableCell>
                                    <TableCell>
                                        {getStaffName(row.staff_id)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
