"use client";

import { TankLevelCard } from "@/components/inventory/TankLevelCard";
import { DailyReadingForm } from "@/components/inventory/DailyReadingForm";
import { RegulatoryReturnForm } from "@/components/inventory/RegulatoryReturnForm";
import { RegulatoryReturnHistory } from "@/components/inventory/RegulatoryReturnHistory";
import { FuelOrdersManager } from "@/components/inventory/FuelOrdersManager";
import { InventoryHistoryTable } from "@/components/inventory/InventoryHistoryTable";
import { TankCreationForm } from "@/components/inventory/TankCreationForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTanks } from "@/lib/hooks";
import { Loader2 } from "lucide-react";
import { mutate } from "swr";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

// Mock Data for Tanks
// 5000G Tanks: LAD-1, LAD-2, LAD-3, LAD-4
// 3000G Tanks: LSD-1, LP95-1, LP92-1, LP92-2

export const TANKS_CONFIG = [
    { id: "LSD-1", name: "LSD-1", product: "Super Diesel", current: 8800, max: 13638.27, color: "white" as const, type: "3000G" as const },
    { id: "LP95-1", name: "LP95-1", product: "Petrol 95", current: 9100, max: 13638.27, color: "red" as const, type: "3000G" as const },
    { id: "LAD-1", name: "LAD-1", product: "Auto Diesel", current: 19500, max: 22730.45, color: "blue" as const, type: "5000G" as const },
    { id: "LAD-2", name: "LAD-2", product: "Auto Diesel", current: 18000, max: 22730.45, color: "blue" as const, type: "5000G" as const },
    { id: "LAD-3", name: "LAD-3", product: "Auto Diesel", current: 12000, max: 22730.45, color: "blue" as const, type: "5000G" as const },
    { id: "LAD-4", name: "LAD-4", product: "Auto Diesel", current: 9000, max: 22730.45, color: "blue" as const, type: "5000G" as const },
    { id: "LP92-1", name: "LP92-1", product: "Petrol 92", current: 8200, max: 13638.27, color: "yellow" as const, type: "3000G" as const },
    { id: "LP92-2", name: "LP92-2", product: "Petrol 92", current: 6000, max: 13638.27, color: "yellow" as const, type: "3000G" as const },
];

function InventoryContent() {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab");
    const validTabs = ["reading", "return", "orders"];
    const defaultTab = tabParam && validTabs.includes(tabParam) ? tabParam : "reading";

    const [activeTab, setActiveTab] = useState(defaultTab);
    const [summaryDate, setSummaryDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [tanksDate, setTanksDate] = useState(
        new Date().toISOString().split("T")[0]
    );

    // Fetch real tank data from API for the selected date
    const { data: apiTanks, error: tanksError, isLoading: tanksLoading, mutate: mutateTanks } = useTanks(
        tanksDate === new Date().toISOString().split("T")[0] ? null : tanksDate, // null for today means use latest
        {
            revalidateOnFocus: false,
            refreshInterval: 60000, // Refresh every 60 seconds instead of constant refetching
        }
    );

    // Fetch tank data for summary section (can be different date)
    const { data: summaryTanksApi, mutate: mutateSummaryTanks } = useTanks(
        summaryDate === new Date().toISOString().split("T")[0] ? null : summaryDate,
        {
            revalidateOnFocus: false,
        }
    );

    // Callback to refresh tanks after saving a reading
    const handleReadingSaved = () => {
        mutateTanks(); // Revalidate tanks data from API
        mutateSummaryTanks(); // Also refresh summary
    };

    // Callback to refresh tanks after a delivery is recorded
    const handleDeliveryComplete = () => {
        mutateTanks(); // Revalidate tank levels (delivery added fuel)
        mutateSummaryTanks(); // Also refresh summary section
    };

    // Map API data to the format expected by components, fallback to mock data (if enabled)
    const tanksData = useMemo(() => {
        if (apiTanks && apiTanks.length > 0) {
            // Map API TankWithLevel to component format
            return apiTanks.map(tank => ({
                id: tank.id,  // Use actual UUID for API calls
                name: tank.name,
                product: tank.product_name || "Unknown",
                current: Number(tank.current_volume) || 0,  // Ensure number
                max: Number(tank.capacity_liters) || 0,      // Ensure number
                color: (tank.color || "blue") as "white" | "red" | "blue" | "yellow",
                type: tank.tank_type as "3000G" | "5000G" || "3000G",
            }));
        }
        // Fallback to mock data for development (only if DISABLE_MOCK_DATA is false)
        if (process.env.NEXT_PUBLIC_DISABLE_MOCK_DATA === 'true') {
            return []; // Return empty array when mock data is disabled
        }
        return TANKS_CONFIG;
    }, [apiTanks]);

    // Map summary API data to component format (for summary section)
    const summaryTanksData = useMemo(() => {
        const tanks = summaryTanksApi || apiTanks;
        if (tanks && tanks.length > 0) {
            return tanks.map(tank => ({
                id: tank.id,
                name: tank.name,
                product: tank.product_name || "Unknown",
                current: Number(tank.current_volume) || 0,
                max: Number(tank.capacity_liters) || 0,
                color: (tank.color || "blue") as "white" | "red" | "blue" | "yellow",
                type: tank.tank_type as "3000G" | "5000G" || "3000G",
            }));
        }
        if (process.env.NEXT_PUBLIC_DISABLE_MOCK_DATA === 'true') {
            return [];
        }
        return TANKS_CONFIG;
    }, [summaryTanksApi, apiTanks]);

    // Loading state
    if (tanksLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Loading inventory data...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-6 bg-background min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
                    <p className="text-muted-foreground">Monitor tank levels, record readings, and manage deliveries.</p>
                </div>
            </div>

            {/* Top Section: Tank Visuals */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Tank Levels</h3>
                    <div className="flex items-center gap-3">
                        <TankCreationForm onTankCreated={() => mutate('/inventory/tanks')} />
                        <Input
                            type="date"
                            value={tanksDate}
                            onChange={(e) => setTanksDate(e.target.value)}
                            className="w-auto text-sm"
                        />
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {tanksData.map((tank, index) => (
                        <TankLevelCard
                            key={tank.id}
                            tankName={tank.name}
                            productName={tank.product}
                            currentVolume={tank.current}
                            maxVolume={tank.max}
                            color={tank.color}
                            index={index}
                        />
                    ))}
                </div>
            </section>

            {/* Aggregated Inventory Summary Section */}
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Inventory Summary</h3>
                    <div className="flex items-center gap-2">
                        <Input
                            type="date"
                            value={summaryDate}
                            onChange={(e) => setSummaryDate(e.target.value)}
                            className="w-auto text-sm"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {(() => {
                        // Use summary tanks data (from API for selected date)
                        const summaryTanks = summaryTanksData;

                        const totals = summaryTanks.reduce((acc: { LSD: { current: number; max: number }; LAD: { current: number; max: number }; LP95: { current: number; max: number }; LP92: { current: number; max: number } }, tank) => {
                            // Use tank.name for grouping since tank.id is now UUID
                            if (tank.name.startsWith("LSD")) {
                                acc.LSD.current += tank.current;
                                acc.LSD.max += tank.max;
                            }
                            if (tank.name.startsWith("LAD")) {
                                acc.LAD.current += tank.current;
                                acc.LAD.max += tank.max;
                            }
                            if (tank.name.startsWith("LP95")) {
                                acc.LP95.current += tank.current;
                                acc.LP95.max += tank.max;
                            }
                            if (tank.name.startsWith("LP92")) {
                                acc.LP92.current += tank.current;
                                acc.LP92.max += tank.max;
                            }
                            return acc;
                        }, {
                            LSD: { current: 0, max: 0 },
                            LAD: { current: 0, max: 0 },
                            LP95: { current: 0, max: 0 },
                            LP92: { current: 0, max: 0 },
                        });

                        const summaryItems = [
                            {
                                label: "LSD",
                                fullName: "Super Diesel",
                                data: totals.LSD,
                                gradient: "from-slate-400 to-slate-600",
                                bgGradient: "from-slate-50 to-slate-100",
                                progressBg: "bg-slate-200",
                                progressFill: "bg-gradient-to-r from-slate-400 to-slate-600",
                            },
                            {
                                label: "LP95",
                                fullName: "Petrol 95",
                                data: totals.LP95,
                                gradient: "from-rose-500 to-pink-600",
                                bgGradient: "from-rose-50 to-pink-50",
                                progressBg: "bg-rose-100",
                                progressFill: "bg-gradient-to-r from-rose-500 to-pink-600",
                            },
                            {
                                label: "LAD",
                                fullName: "Auto Diesel",
                                data: totals.LAD,
                                gradient: "from-sky-500 to-blue-600",
                                bgGradient: "from-sky-50 to-blue-50",
                                progressBg: "bg-sky-100",
                                progressFill: "bg-gradient-to-r from-sky-500 to-blue-600",
                            },
                            {
                                label: "LP92",
                                fullName: "Petrol 92",
                                data: totals.LP92,
                                gradient: "from-amber-400 to-orange-500",
                                bgGradient: "from-amber-50 to-orange-50",
                                progressBg: "bg-amber-100",
                                progressFill: "bg-gradient-to-r from-amber-400 to-orange-500",
                            },
                        ];

                        return summaryItems.map((item) => {
                            const percentage = item.data.max > 0
                                ? (item.data.current / item.data.max) * 100
                                : 0;
                            return (
                                <div
                                    key={item.label}
                                    className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${item.bgGradient} p-4 border border-white/20 transition-all duration-300 hover:shadow-lg`}
                                >
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <span className={`text-sm font-bold bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent`}>
                                                {item.label}
                                            </span>
                                            <span className="text-xs text-muted-foreground ml-2">{item.fullName}</span>
                                        </div>
                                        <span className={`text-xl font-bold bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent`}>
                                            {percentage.toFixed(1)}%
                                        </span>
                                    </div>

                                    {/* Volume - Full Values */}
                                    <div className="mb-3 space-y-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-bold text-foreground tabular-nums">
                                                {item.data.current.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                            <span className="text-sm text-muted-foreground">L</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            of {item.data.max.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L capacity
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className={`h-2.5 rounded-full ${item.progressBg} overflow-hidden`}>
                                        <div
                                            className={`h-full ${item.progressFill} rounded-full transition-all duration-500 ease-out`}
                                            style={{ width: `${Math.min(percentage, 100)}%` }}
                                        />
                                    </div>

                                    {/* Subtle glow effect */}
                                    <div className={`absolute -top-8 -right-8 w-20 h-20 bg-gradient-to-br ${item.gradient} opacity-10 rounded-full blur-2xl`} />
                                </div>
                            );
                        });
                    })()}
                </div>
            </section>

            {/* Middle Section: Forms */}
            <section>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <div className="flex items-center justify-between">
                        <TabsList>
                            <TabsTrigger value="reading">Daily Reading</TabsTrigger>
                            <TabsTrigger value="return">Regulatory Return</TabsTrigger>
                            <TabsTrigger value="orders">Fuel Orders</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="reading" className="border-none p-0 outline-none space-y-6">
                        <ErrorBoundary fallbackTitle="Error loading Daily Reading form">
                            <DailyReadingForm tanks={tanksData} onSaveSuccess={handleReadingSaved} />

                            {/* History Section - only visible in Daily Reading tab */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold">Recent Activity & History</h2>
                                </div>
                                <InventoryHistoryTable />
                            </div>
                        </ErrorBoundary>
                    </TabsContent>

                    <TabsContent value="return" className="border-none p-0 outline-none space-y-6">
                        <ErrorBoundary fallbackTitle="Error loading Regulatory Return form">
                            <RegulatoryReturnForm />

                            {/* History Section - Regulatory Returns */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold">Regulatory Return History</h2>
                                </div>
                                <RegulatoryReturnHistory />
                            </div>
                        </ErrorBoundary>
                    </TabsContent>

                    <TabsContent value="orders" className="border-none p-0 outline-none">
                        <ErrorBoundary fallbackTitle="Error loading Fuel Orders">
                            <div className="w-full">
                                <FuelOrdersManager onDeliveryComplete={handleDeliveryComplete} />
                            </div>
                        </ErrorBoundary>
                    </TabsContent>
                </Tabs>
            </section>
        </div>
    );
}

export default function InventoryPage() {
    return (
        <Suspense fallback={
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        }>
            <InventoryContent />
        </Suspense>
    );
}
