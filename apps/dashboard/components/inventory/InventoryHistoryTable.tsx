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

// Tank configuration for generating history
const TANKS = [
    { id: "LSD-1", name: "LSD-1 (Super Diesel)" },
    { id: "LP95-1", name: "LP95-1 (Petrol 95)" },
    { id: "LAD-1", name: "LAD-1 (Auto Diesel)" },
    { id: "LAD-2", name: "LAD-2 (Auto Diesel)" },
    { id: "LAD-3", name: "LAD-3 (Auto Diesel)" },
    { id: "LAD-4", name: "LAD-4 (Auto Diesel)" },
    { id: "LP92-1", name: "LP92-1 (Petrol 92)" },
    { id: "LP92-2", name: "LP92-2 (Petrol 92)" },
];

// Generate mock history data for the last 30 days
// Use a fixed date to prevent SSR/client hydration mismatch
const FIXED_REFERENCE_DATE = new Date("2025-12-21T00:00:00");

function generateMockHistory() {
    const history: Array<{
        id: number;
        date: string;
        tank: string;
        tankId: string;
        reading: number;
        dipSale: number;
        meterSale: number;
        variance: number;
        status: "ok" | "warning" | "critical";
    }> = [];

    const today = FIXED_REFERENCE_DATE;
    let id = 1;

    // Generate 30 days of history
    for (let daysAgo = 0; daysAgo < 30; daysAgo++) {
        const date = new Date(today);
        date.setDate(date.getDate() - daysAgo);
        const dateStr = date.toISOString().split("T")[0];

        // Each tank has a reading per day
        TANKS.forEach((tank) => {
            // Pseudo-random based on date and tank for consistency
            const seed = date.getTime() + tank.id.charCodeAt(0) * 1000;
            const random = (offset: number) => {
                const x = Math.sin(seed + offset) * 10000;
                return x - Math.floor(x);
            };

            const baseReading = 5000 + random(1) * 15000;
            const dipSale = Math.round(500 + random(2) * 1500);
            // Variance: most are small, some are larger
            const varianceChance = random(3);
            let variance = 0;
            if (varianceChance < 0.7) {
                variance = Math.round((random(4) - 0.5) * 10); // -5 to +5
            } else if (varianceChance < 0.9) {
                variance = Math.round((random(5) - 0.5) * 50); // -25 to +25
            } else {
                variance = Math.round((random(6) - 0.5) * 200); // -100 to +100
            }
            const meterSale = dipSale - variance;

            let status: "ok" | "warning" | "critical" = "ok";
            if (Math.abs(variance) > 50) {
                status = "critical";
            } else if (Math.abs(variance) > 10) {
                status = "warning";
            }

            history.push({
                id: id++,
                date: dateStr,
                tank: tank.name,
                tankId: tank.id,
                reading: Math.round(baseReading),
                dipSale,
                meterSale,
                variance,
                status,
            });
        });
    }

    return history;
}

const MOCK_HISTORY = generateMockHistory();

export function InventoryHistoryTable() {
    // Use fixed reference date for initial filter values to prevent SSR hydration mismatch
    const [startDate, setStartDate] = useState(() => {
        const date = new Date(FIXED_REFERENCE_DATE);
        date.setDate(date.getDate() - 7); // Default to last 7 days
        return date.toISOString().split("T")[0];
    });
    const [endDate, setEndDate] = useState(
        FIXED_REFERENCE_DATE.toISOString().split("T")[0]
    );
    const [selectedTank, setSelectedTank] = useState("all");

    // Filter history based on date range and tank
    const filteredHistory = useMemo(() => {
        return MOCK_HISTORY.filter((row) => {
            const dateMatch = row.date >= startDate && row.date <= endDate;
            const tankMatch = selectedTank === "all" || row.tankId === selectedTank;
            return dateMatch && tankMatch;
        });
    }, [startDate, endDate, selectedTank]);

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">From:</span>
                    <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-auto text-sm"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">To:</span>
                    <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-auto text-sm"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Tank:</span>
                    <Select value={selectedTank} onValueChange={setSelectedTank}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="All Tanks" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Tanks</SelectItem>
                            {TANKS.map((tank) => (
                                <SelectItem key={tank.id} value={tank.id}>
                                    {tank.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="ml-auto text-sm text-muted-foreground">
                    {filteredHistory.length} records
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md border max-h-[400px] overflow-auto">
                <Table>
                    <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Tank</TableHead>
                            <TableHead className="text-right">Reading (L)</TableHead>
                            <TableHead className="text-right">Dip Sale (L)</TableHead>
                            <TableHead className="text-right">Meter Sale (L)</TableHead>
                            <TableHead className="text-right">Variance (L)</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredHistory.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                    No records found for the selected filters
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredHistory.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell className="font-medium">{row.date}</TableCell>
                                    <TableCell>{row.tank}</TableCell>
                                    <TableCell className="text-right">
                                        {row.reading.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {row.dipSale.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {row.meterSale.toLocaleString()}
                                    </TableCell>
                                    <TableCell
                                        className={`text-right font-bold ${row.status === "critical"
                                            ? "text-red-600"
                                            : row.status === "warning"
                                                ? "text-amber-500"
                                                : "text-green-600"
                                            }`}
                                    >
                                        {row.variance > 0 ? "+" : ""}{row.variance}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {row.status === "critical" ? (
                                            <Badge variant="destructive">Critical</Badge>
                                        ) : row.status === "warning" ? (
                                            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                                                Check
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                OK
                                            </Badge>
                                        )}
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
