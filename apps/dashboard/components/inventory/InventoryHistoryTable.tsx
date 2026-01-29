"use client";

import { useState, useMemo, useEffect } from "react";
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
import { api } from "@/lib/api/client";
import { useTanks } from "@/lib/hooks/use-api";
import { Loader2 } from "lucide-react";
import type { ReadingHistoryItem } from "@/lib/api/types";

export function InventoryHistoryTable() {
    // Get tanks for the filter dropdown
    const { data: tanks } = useTanks();

    // Date filters - default to last 7 days
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const [startDate, setStartDate] = useState(weekAgo);
    const [endDate, setEndDate] = useState(today);
    const [selectedTank, setSelectedTank] = useState("all");

    // API data state
    const [readings, setReadings] = useState<ReadingHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch readings from API
    useEffect(() => {
        const fetchReadings = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await api.inventory.getReadingsHistory({
                    startDate,
                    endDate,
                    tankId: selectedTank !== "all" ? selectedTank : undefined,
                    limit: 500,
                });
                setReadings(data);
            } catch (err: any) {
                setError(err.message || "Failed to fetch readings");
                setReadings([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReadings();
    }, [startDate, endDate, selectedTank]);

    // Map tanks for the dropdown
    const tankOptions = useMemo(() => {
        if (!tanks || tanks.length === 0) return [];
        return tanks.map(t => ({
            id: t.id,
            name: t.name,
        }));
    }, [tanks]);

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
                            <SelectValue placeholder="All Tanks">
                                {selectedTank === "all"
                                    ? "All Tanks"
                                    : tankOptions.find(t => t.id === selectedTank)?.name || selectedTank}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Tanks</SelectItem>
                            {tankOptions.map((tank) => (
                                <SelectItem key={tank.id} value={tank.id}>
                                    {tank.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="ml-auto text-sm text-muted-foreground">
                    {isLoading ? "Loading..." : `${readings.length} records`}
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
                            <TableHead className="text-right">Height (cm)</TableHead>
                            <TableHead>Staff Responsible</TableHead>
                            <TableHead>Monitored By</TableHead>
                            <TableHead className="text-right">Recorded</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-muted-foreground">Loading readings...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : error ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-red-500 py-8">
                                    {error}
                                </TableCell>
                            </TableRow>
                        ) : readings.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                    No readings found for the selected filters
                                </TableCell>
                            </TableRow>
                        ) : (
                            readings.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell className="font-medium">{row.reading_date}</TableCell>
                                    <TableCell>{row.tank_name}</TableCell>
                                    <TableCell className="text-right font-medium">
                                        {row.volume_liters.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {row.height_cm !== null ? row.height_cm.toFixed(1) : "-"}
                                    </TableCell>
                                    <TableCell className="text-sm max-w-[150px]">
                                        {row.staff_responsible_names?.length > 0
                                            ? <span className="text-blue-700" title={row.staff_responsible_names.join(", ")}>{row.staff_responsible_names.join(", ")}</span>
                                            : <span className="text-muted-foreground">-</span>
                                        }
                                    </TableCell>
                                    <TableCell className="text-sm max-w-[150px]">
                                        {row.monitored_by_names?.length > 0
                                            ? <span className="text-green-700" title={row.monitored_by_names.join(", ")}>{row.monitored_by_names.join(", ")}</span>
                                            : <span className="text-muted-foreground">-</span>
                                        }
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground text-xs">
                                        {row.created_at ? new Date(row.created_at).toLocaleString() : "-"}
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
