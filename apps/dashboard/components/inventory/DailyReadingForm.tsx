"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { calculateHorizontalTankVolume, TANK_DIMENSIONS } from "@/lib/volume-calculator";
import { StaffMultiSelect, StaffMember } from "@/components/ui/StaffMultiSelect";

interface DailyReadingFormProps {
    tanks: Array<{ id: string; name: string; type: "3000G" | "5000G" }>;
}

// Mock staff data - in production this would come from props or API
const MOCK_STAFF: StaffMember[] = [
    { id: "1", name: "John Silva" },
    { id: "2", name: "Kamal Perera" },
    { id: "3", name: "Nimal Fernando" },
    { id: "4", name: "Sunil Jayawardena" },
    { id: "5", name: "Chaminda Bandara" },
];

const MOCK_YESTERDAY_VOLUMES: Record<string, number> = {
    "LSD-1": 9000,
    "LP95-1": 9200,
    "LAD-1": 59000,
    "LAD-2": 20000,
    "LP92-1": 14500,
    "LP92-2": 10000,
};

// Mock nozzle sales data (Day + Night shifts)
// LSD-1 and LP95-1 have 1 nozzle each, all other tanks have 2 nozzles
const MOCK_NOZZLE_DATA: Record<string, Array<{ nozzleId: string; day: number; night: number }>> = {
    "LSD-1": [
        { nozzleId: "LSD-N1", day: 1057.536, night: 0 },
    ],
    "LP95-1": [
        { nozzleId: "LP95-N1", day: 1200.45, night: 150.2 },
    ],
    "LAD-1": [
        { nozzleId: "LAD-N1", day: 850.0, night: 300.0 },
        { nozzleId: "LAD-N2", day: 720.5, night: 280.0 },
    ],
    "LAD-2": [
        { nozzleId: "LAD2-N1", day: 900.0, night: 320.0 },
        { nozzleId: "LAD2-N2", day: 650.0, night: 200.0 },
    ],
    "LP92-1": [
        { nozzleId: "LP92-N1", day: 1500.22, night: 500.88 },
        { nozzleId: "LP92-N2", day: 1100.0, night: 400.0 },
    ],
    "LP92-2": [
        { nozzleId: "LP92B-N1", day: 1400.0, night: 450.0 },
        { nozzleId: "LP92B-N2", day: 980.0, night: 350.0 },
    ],
};

export function DailyReadingForm({ tanks }: DailyReadingFormProps) {
    const [selectedTankId, setSelectedTankId] = useState("");
    const [dipHeight, setDipHeight] = useState("");
    const [volume, setVolume] = useState("");
    const [staffResponsible, setStaffResponsible] = useState<string[]>([]);
    const [monitoredBy, setMonitoredBy] = useState<string[]>([]);

    const [yesterdayVolume, setYesterdayVolume] = useState<number | null>(null);
    const [dipSale, setDipSale] = useState<number | null>(null);

    // Meter Sale State (supports multiple nozzles per tank)
    const [nozzles, setNozzles] = useState<Array<{ nozzleId: string; day: number; night: number }>>([]);
    const [meterSale, setMeterSale] = useState<number | null>(null);
    const [discrepancy, setDiscrepancy] = useState<number | null>(null);

    // Update yesterday's volume and mock nozzle data when a tank is selected
    useEffect(() => {
        if (selectedTankId) {
            const vol = MOCK_YESTERDAY_VOLUMES[selectedTankId] || 0;
            setYesterdayVolume(vol);

            const tankNozzles = MOCK_NOZZLE_DATA[selectedTankId];
            if (tankNozzles && tankNozzles.length > 0) {
                setNozzles(tankNozzles);
                // Sum all nozzle sales (day + night for each nozzle)
                const totalSale = tankNozzles.reduce((sum, n) => sum + n.day + n.night, 0);
                setMeterSale(totalSale);
            } else {
                setNozzles([]);
                setMeterSale(null);
            }
        } else {
            setYesterdayVolume(null);
            setNozzles([]);
            setMeterSale(null);
        }
    }, [selectedTankId]);

    // Calculate dip sale and discrepancy automatically when volume changes
    useEffect(() => {
        let currentDipSale: number | null = null;

        if (yesterdayVolume !== null && volume) {
            const current = parseFloat(volume);
            if (!isNaN(current)) {
                // Dip Sale = Yesterday - Today
                currentDipSale = yesterdayVolume - current;
                setDipSale(currentDipSale);
            } else {
                setDipSale(null);
            }
        } else {
            setDipSale(null);
        }

        // Calculate Discrepancy = Dip Sale - Meter Sale
        if (currentDipSale !== null && meterSale !== null) {
            setDiscrepancy(currentDipSale - meterSale);
        } else {
            setDiscrepancy(null);
        }
    }, [volume, yesterdayVolume, meterSale]);

    // User-entered reading date/time (claimed time of dip)
    const [readingDate, setReadingDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [readingTime, setReadingTime] = useState(
        new Date().toTimeString().slice(0, 5)
    );

    // System-logged timestamp (when form was opened - for fraud prevention)
    const [systemTimestamp] = useState(new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }));

    // Auto-calculate volume when dip height or tank changes
    useEffect(() => {
        if (!selectedTankId || !dipHeight) return;

        const tank = tanks.find(t => t.id === selectedTankId);
        if (!tank) return;

        const dim = TANK_DIMENSIONS[tank.type];
        if (dim) {
            // Convert cm to mm for the calculator
            // Input is cm, formula expects mm
            const heightMm = parseFloat(dipHeight) * 10;
            if (!isNaN(heightMm)) {
                const calculatedVol = calculateHorizontalTankVolume(dim.radius, dim.length, heightMm);
                setVolume(calculatedVol.toString());
            }
        }
    }, [dipHeight, selectedTankId, tanks]);

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card className="lg:col-span-1">
                <CardHeader>
                    <CardTitle>Daily Dip Reading</CardTitle>
                    <CardDescription>Record the dip height to calculate current volume.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="tank">Select Tank</Label>
                        <Select value={selectedTankId} onValueChange={setSelectedTankId}>
                            <SelectTrigger id="tank">
                                <SelectValue placeholder="Choose a tank" />
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
                                placeholder="Enter volume"
                                value={volume}
                                onChange={(e) => setVolume(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Staff Responsible</Label>
                            <StaffMultiSelect
                                staff={MOCK_STAFF}
                                selected={staffResponsible}
                                onChange={setStaffResponsible}
                                placeholder="Select staff..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Monitored By</Label>
                            <StaffMultiSelect
                                staff={MOCK_STAFF}
                                selected={monitoredBy}
                                onChange={setMonitoredBy}
                                placeholder="Select monitor..."
                            />
                        </div>
                    </div>

                    {/* Date & Time of Dip Reading */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="readingDate">Reading Date</Label>
                            <Input
                                id="readingDate"
                                type="date"
                                value={readingDate}
                                onChange={(e) => setReadingDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="readingTime">Reading Time</Label>
                            <Input
                                id="readingTime"
                                type="time"
                                value={readingTime}
                                onChange={(e) => setReadingTime(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* System-logged timestamp */}
                    <div className="text-xs text-muted-foreground">
                        Form Logged: <span className="font-mono">{systemTimestamp}</span>
                    </div>

                    <div className="pt-2">
                        <Button className="w-full">Save Reading</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Right Column: Dip Sale Calculation */}
            <Card className="lg:col-span-1 h-fit">
                <CardHeader>
                    <CardTitle>Dip Sale Calculation</CardTitle>
                    <CardDescription>Sales calculated from volume difference.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Tank Selection for Calculation */}
                    <div className="space-y-2">
                        <Label>Select Tank</Label>
                        <Select value={selectedTankId} onValueChange={setSelectedTankId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a tank" />
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

                    {/* Top Row: Dip Calculation */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Dip Sale Calculation</Label>
                        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
                            <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-muted-foreground">Yesterday's Dip ({yesterdayVolume?.toLocaleString() ?? 0}) - Today's Dip ({volume ? parseFloat(volume).toLocaleString() : 0})</span>
                            </div>
                            <div className="text-lg font-bold flex items-center justify-between">
                                <span>Dip Sale:</span>
                                <span className={dipSale !== null && dipSale < 0 ? "text-red-500" : ""}>
                                    {dipSale !== null ? dipSale.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"} L
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Middle Row: Meter Sale Calculation */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Meter Sale Calculation</Label>
                        <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                            {nozzles.length > 0 ? (
                                <>
                                    {nozzles.map((nozzle, index) => (
                                        <div key={nozzle.nozzleId} className={`${index > 0 ? "pt-2 border-t border-border/30" : ""}`}>
                                            <div className="flex justify-between items-center text-sm mb-1">
                                                <span className="text-muted-foreground">Nozzle {index + 1}:</span>
                                                <span className="font-mono font-medium">{nozzle.nozzleId}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                                <div>Day: {nozzle.day.toLocaleString()} L</div>
                                                <div>Night: {nozzle.night.toLocaleString()} L</div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="pt-2 border-t border-border/50">
                                        <div className="text-lg font-bold flex items-center justify-between">
                                            <span>Total Meter Sale:</span>
                                            <span>{meterSale !== null ? meterSale.toLocaleString(undefined, { maximumFractionDigits: 3 }) : "0"} L</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-sm text-muted-foreground text-center py-2">
                                    Select a tank to view nozzle data
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Row: Discrepancy */}
                    <div className="space-y-2">
                        <div className={`rounded-lg p-4 border-2 ${discrepancy !== null
                            ? Math.abs(discrepancy) > 50 ? "bg-red-50 border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200"
                                : "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-200"
                            : "bg-gray-50 border-gray-100 dark:bg-gray-900 dark:border-gray-800"
                            }`}>
                            <div className="flex flex-col items-center justify-center text-center">
                                <span className="text-xs font-semibold uppercase tracking-widest opacity-70">Discrepancy (Dip - Meter)</span>
                                <div className="text-lg font-extrabold mt-1 tabular-nums">
                                    {discrepancy !== null ? (discrepancy > 0 ? "+" : "") + discrepancy.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
                                    <span className="text-sm ml-1 opacity-70">L</span>
                                </div>
                                {discrepancy !== null && Math.abs(discrepancy) > 50 && (
                                    <span className="text-[10px] font-bold mt-1 bg-red-200/50 dark:bg-red-500/30 px-2 py-0.5 rounded-full">
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
