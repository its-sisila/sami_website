"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo } from "react";
import { calculateHorizontalTankVolume, TANK_DIMENSIONS } from "@/lib/volume-calculator";
import { StaffMultiSelect, StaffMember } from "@/components/ui/StaffMultiSelect";
import { api } from "@/lib/api/client";
import { Loader2 } from "lucide-react";
import { useEmployees, useTankReadings, useTanks } from "@/lib/hooks/use-api";
import { format } from "date-fns";
import { toast } from "sonner";
import type { TankSalesResponse } from "@/lib/api/types";

interface DailyReadingFormProps {
    tanks?: Array<{ id: string; name: string; type: "3000G" | "5000G" }>;
    onSaveSuccess?: () => void;
}

export function DailyReadingForm({ tanks: propTanks, onSaveSuccess }: DailyReadingFormProps) {
    // Fetch data
    const { data: employees } = useEmployees();
    const { data: fetchedTanks } = useTanks();
    const tanks = useMemo(() => {
        if (fetchedTanks) return fetchedTanks.map(t => ({ ...t, type: t.tank_type as "3000G" | "5000G" }));
        return propTanks || [];
    }, [fetchedTanks, propTanks]);

    // Map employees to StaffMember format
    const staffList: StaffMember[] = useMemo(() => {
        if (!employees || employees.length === 0) return [];
        return employees.map(emp => ({
            id: emp.id,
            name: emp.full_name,
        }));
    }, [employees]);

    const [selectedTankId, setSelectedTankId] = useState("");
    const [dipHeight, setDipHeight] = useState("");
    const [volume, setVolume] = useState("");
    const [staffResponsible, setStaffResponsible] = useState<string[]>([]);
    const [monitoredBy, setMonitoredBy] = useState<string[]>([]);

    // Derived States for comparison
    const [yesterdayVolume, setYesterdayVolume] = useState<number | null>(null);
    const [dipSale, setDipSale] = useState<number | null>(null);
    const [meterSale, setMeterSale] = useState<number | null>(null);
    const [discrepancy, setDiscrepancy] = useState<number | null>(null);
    const [loadingMeterSales, setLoadingMeterSales] = useState(false);

    // Fetch readings for selected tank to get Yesterday's data
    const { data: tankReadings } = useTankReadings(selectedTankId || null, 5);

    // Reading Date (default to today)
    const [readingDate, setReadingDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
    const [readingTime, setReadingTime] = useState(() => format(new Date(), 'HH:mm'));

    // Initialize "Yesterday" data when tank changes
    useEffect(() => {
        if (tankReadings && tankReadings.length > 0) {
            // Find the most recent reading BEFORE the current readingDate
            const stats = tankReadings.find(r => r.reading_date < readingDate) || tankReadings[0];
            if (stats) {
                setYesterdayVolume(stats.volume_liters);
            }
        } else {
            setYesterdayVolume(null);
        }
    }, [tankReadings, readingDate]);

    // Fetch meter sales from Sales API when tank or date changes
    useEffect(() => {
        if (!selectedTankId || !readingDate) {
            setMeterSale(null);
            return;
        }

        const fetchMeterSales = async () => {
            setLoadingMeterSales(true);
            try {
                const salesData: TankSalesResponse = await api.sales.getTankSales(selectedTankId, readingDate);
                setMeterSale(salesData.total_liters);
            } catch (_err) {
                // No sales data for this tank/date - that's okay
                setMeterSale(null);
            } finally {
                setLoadingMeterSales(false);
            }
        };

        fetchMeterSales();
    }, [selectedTankId, readingDate]);

    // Calculate Dip Sale and Discrepancy
    useEffect(() => {
        // Dip Sale = Yesterday - Today
        let dSale: number | null = null;
        if (yesterdayVolume !== null && volume) {
            const v = parseFloat(volume);
            if (!isNaN(v)) {
                dSale = yesterdayVolume - v;
            }
        }
        setDipSale(dSale);

        // Discrepancy = Dip Sale - Meter Sale
        if (dSale !== null && meterSale !== null) {
            setDiscrepancy(dSale - meterSale);
        } else {
            setDiscrepancy(null);
        }
    }, [volume, yesterdayVolume, meterSale]);

    // Auto-calculate volume from dip
    useEffect(() => {
        if (!selectedTankId || !dipHeight) return;
        const tank = tanks.find(t => t.id === selectedTankId);
        if (!tank || !tank.type) return;

        const dim = TANK_DIMENSIONS[tank.type];
        if (dim) {
            const heightMm = parseFloat(dipHeight) * 10;
            if (!isNaN(heightMm)) {
                const calculatedVol = calculateHorizontalTankVolume(dim.radius, dim.length, heightMm);
                setVolume(calculatedVol.toString());
            }
        }
    }, [dipHeight, selectedTankId, tanks]);

    const [isSaving, setIsSaving] = useState(false);

    const handleSaveReading = async () => {
        if (!selectedTankId || !volume) {
            toast.warning("Please select a tank and enter a reading.");
            return;
        }

        setIsSaving(true);
        try {
            await api.inventory.submitReadings({
                reading_date: readingDate,
                readings: [{
                    tank_id: selectedTankId,
                    height_cm: dipHeight ? parseFloat(dipHeight) : null,
                    volume_liters: parseFloat(volume),
                }],
                staff_responsible_ids: staffResponsible.length > 0 ? staffResponsible : null,
                monitored_by_ids: monitoredBy.length > 0 ? monitoredBy : null,
            });
            toast.success("Reading saved successfully!");
            onSaveSuccess?.();
            // Reset crucial fields
            setDipHeight("");
            setVolume("");
        } catch (err: any) {
            toast.error(`Failed to save reading: ${err.message || "Unknown error"}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card className="lg:col-span-1">
                <CardHeader>
                    <CardTitle>Daily Dip Reading</CardTitle>
                    <CardDescription>Record tank dip height measurement.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="tank">Select Tank</Label>
                        <Select value={selectedTankId} onValueChange={setSelectedTankId}>
                            <SelectTrigger id="tank">
                                <SelectValue placeholder="Choose a tank">
                                    {selectedTankId && tanks.find(t => t.id === selectedTankId)?.name}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {tanks.map((tank) => (
                                    <SelectItem key={tank.id} value={tank.id}>
                                        {tank.name} ({tank.type})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="height">Dip Height (cm)</Label>
                            <Input
                                id="height"
                                type="number"
                                placeholder="e.g. 150.5"
                                value={dipHeight}
                                onChange={(e) => setDipHeight(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="volume">Volume (L)</Label>
                            <Input
                                id="volume"
                                type="number"
                                value={volume}
                                readOnly
                                className="bg-muted/50"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-2">
                            <Label>Staff Responsible</Label>
                            <StaffMultiSelect
                                staff={staffList}
                                selected={staffResponsible}
                                onChange={setStaffResponsible}
                                placeholder="Select staff..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Monitored By</Label>
                            <StaffMultiSelect
                                staff={staffList}
                                selected={monitoredBy}
                                onChange={setMonitoredBy}
                                placeholder="Select monitor..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="readingDate">Reading Date</Label>
                            <Input
                                id="readingDate"
                                type="date"
                                value={readingDate}
                                onChange={e => setReadingDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="readingTime">Reading Time</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="readingTime"
                                    type="time"
                                    value={readingTime}
                                    onChange={e => setReadingTime(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <Button
                        className="w-full mt-4"
                        onClick={handleSaveReading}
                        disabled={isSaving || !selectedTankId || !volume}
                    >
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSaving ? "Saving..." : "Save Reading"}
                    </Button>
                </CardContent>
            </Card>

            {/* Right Column: Dip Sale Calculation */}
            <Card className="lg:col-span-1 h-fit">
                <CardHeader>
                    <CardTitle>Dip vs Meter Sale</CardTitle>
                    <CardDescription>Comparison of Dip Sale (Last - Current) vs Meter Sale (from shifts).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Dip Sale</Label>
                        <div className="rounded-lg border bg-card p-4">
                            <div className="flex justify-between text-sm text-muted-foreground mb-1">
                                <span>Yesterday ({yesterdayVolume?.toLocaleString() ?? 0}) - Today ({volume ? parseFloat(volume).toLocaleString() : 0})</span>
                            </div>
                            <div className="text-2xl font-bold">
                                {dipSale !== null ? dipSale.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"} L
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Meter Sale (from Shifts)</Label>
                        <div className="rounded-lg border bg-muted/50 p-4">
                            <div className="flex justify-between text-sm text-muted-foreground mb-1">
                                <span>Total sales for {readingDate}</span>
                            </div>
                            <div className="text-2xl font-bold text-blue-600">
                                {loadingMeterSales ? (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                ) : (
                                    <>{meterSale !== null ? meterSale.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"} L</>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Discrepancy */}
                    <div className="space-y-2">
                        <div className={`rounded-lg p-4 border-2 ${discrepancy !== null
                            ? Math.abs(discrepancy) > 50 ? "bg-red-50 border-red-200 text-red-900"
                                : "bg-emerald-50 border-emerald-200 text-emerald-900"
                            : "bg-gray-50 border-gray-100"
                            }`}>
                            <div className="flex flex-col items-center justify-center text-center">
                                <span className="text-xs font-semibold uppercase tracking-widest opacity-70">Discrepancy</span>
                                <div className="text-3xl font-extrabold mt-1 tabular-nums">
                                    {discrepancy !== null ? (discrepancy > 0 ? "+" : "") + discrepancy.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
                                    <span className="text-sm ml-1 opacity-70">L</span>
                                </div>
                                {discrepancy !== null && Math.abs(discrepancy) > 50 && (
                                    <span className="text-[10px] font-bold mt-1 bg-red-200/50 px-2 py-0.5 rounded-full">
                                        HIGH VARIANCE
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
