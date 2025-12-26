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

// Nozzle IDs - each pump has multiple nozzles (matching the form)
const NOZZLES = [
    { id: "N1-AD", name: "Nozzle 1 - Auto Diesel (Pump 1)" },
    { id: "N2-AD", name: "Nozzle 2 - Auto Diesel (Pump 1)" },
    { id: "N3-AD", name: "Nozzle 3 - Auto Diesel (Pump 2)" },
    { id: "N4-AD", name: "Nozzle 4 - Auto Diesel (Pump 2)" },
    { id: "N5-P92", name: "Nozzle 5 - Petrol 92 (Pump 3)" },
    { id: "N6-P92", name: "Nozzle 6 - Petrol 92 (Pump 3)" },
    { id: "N7-P95", name: "Nozzle 7 - Petrol 95 (Pump 4)" },
    { id: "N8-SD", name: "Nozzle 8 - Super Diesel (Pump 4)" },
];

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

// Staff list
const STAFF = ["Kumara", "Saman", "Nimal", "Sunil", "Kamal"];

// Sample notes for mock data
const SAMPLE_NOTES = [
    "Routine inspection sample",
    "Quality test completed successfully",
    "PHI officer present during test",
    "Monthly compliance check",
    "Dispenser accuracy verified",
    "Sample sent to lab for analysis",
    "No issues found",
    "",
];

// Generate mock regulatory return history
function generateMockHistory() {
    const history: Array<{
        id: number;
        date: string;
        time: string;
        nozzle: string;
        nozzleId: string;
        quantityReturned: number;
        reason: string;
        reasonLabel: string;
        notes: string;
        staffResponsible: string;
    }> = [];

    const today = new Date();
    let id = 1;

    // Generate history for last 60 days (regulatory returns are less frequent)
    for (let daysAgo = 0; daysAgo < 60; daysAgo++) {
        const date = new Date(today);
        date.setDate(date.getDate() - daysAgo);
        const dateStr = date.toISOString().split("T")[0];

        // Pseudo-random based on date
        const seed = date.getTime();
        const random = (offset: number) => {
            const x = Math.sin(seed + offset) * 10000;
            return x - Math.floor(x);
        };

        // Not every day has a return - roughly 30% chance per day
        if (random(0) < 0.3) {
            const numReturns = random(1) < 0.8 ? 1 : 2; // Usually 1, sometimes 2

            for (let i = 0; i < numReturns; i++) {
                const nozzle = NOZZLES[Math.floor(random(2 + i) * NOZZLES.length)];
                const reasonObj = REASONS[Math.floor(random(3 + i) * REASONS.length)];
                const quantityReturned = Math.round(5 + random(4 + i) * 45); // 5-50 liters
                const hour = 8 + Math.floor(random(5 + i) * 10); // Between 8:00-18:00
                const minute = Math.floor(random(6 + i) * 60);
                const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
                const staff = STAFF[Math.floor(random(7 + i) * STAFF.length)];
                const notes = SAMPLE_NOTES[Math.floor(random(8 + i) * SAMPLE_NOTES.length)];

                history.push({
                    id: id++,
                    date: dateStr,
                    time,
                    nozzle: nozzle.name,
                    nozzleId: nozzle.id,
                    quantityReturned,
                    reason: reasonObj.id,
                    reasonLabel: reasonObj.label,
                    notes,
                    staffResponsible: staff,
                });
            }
        }
    }

    return history;
}

const MOCK_HISTORY = generateMockHistory();

export function RegulatoryReturnHistory() {
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30); // Default to last 30 days
        return date.toISOString().split("T")[0];
    });
    const [endDate, setEndDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [selectedNozzle, setSelectedNozzle] = useState("all");
    const [selectedReason, setSelectedReason] = useState("all");

    // Filter history based on date range, nozzle, and reason
    const filteredHistory = useMemo(() => {
        return MOCK_HISTORY.filter((row) => {
            const dateMatch = row.date >= startDate && row.date <= endDate;
            const nozzleMatch = selectedNozzle === "all" || row.nozzleId === selectedNozzle;
            const reasonMatch = selectedReason === "all" || row.reason === selectedReason;
            return dateMatch && nozzleMatch && reasonMatch;
        });
    }, [startDate, endDate, selectedNozzle, selectedReason]);

    // Calculate total returned
    const totalReturned = useMemo(() => {
        return filteredHistory.reduce((sum, row) => sum + row.quantityReturned, 0);
    }, [filteredHistory]);

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
                    <span className="text-sm text-muted-foreground">Nozzle</span>
                    <Select value={selectedNozzle} onValueChange={setSelectedNozzle}>
                        <SelectTrigger>
                            <SelectValue placeholder="All Nozzles" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Nozzles</SelectItem>
                            {NOZZLES.map((n) => (
                                <SelectItem key={n.id} value={n.id}>
                                    {n.name}
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
                            <TableHead>Nozzle ID</TableHead>
                            <TableHead className="text-right">Qty (L)</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead>Staff</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredHistory.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                    No regulatory returns found for the selected filters
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredHistory.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell className="font-medium">{row.date}</TableCell>
                                    <TableCell className="text-muted-foreground">{row.time}</TableCell>
                                    <TableCell className="font-mono text-sm">{row.nozzleId}</TableCell>
                                    <TableCell className="text-right font-medium text-orange-600">
                                        +{row.quantityReturned}
                                    </TableCell>
                                    <TableCell>{row.reasonLabel}</TableCell>
                                    <TableCell className="max-w-[150px] truncate text-muted-foreground" title={row.notes}>
                                        {row.notes || "-"}
                                    </TableCell>
                                    <TableCell>{row.staffResponsible}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
