"use client";

import { TankLevelCard } from "@/components/inventory/TankLevelCard";
import { DailyReadingForm } from "@/components/inventory/DailyReadingForm";
import { DeliveryForm } from "@/components/inventory/DeliveryForm";
import { RegulatoryReturnForm } from "@/components/inventory/RegulatoryReturnForm";
import { InventoryHistoryTable } from "@/components/inventory/InventoryHistoryTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock Data for Tanks
const TANKS = [
    { id: "t1", name: "Tank 1", product: "Auto Diesel", current: 19500, max: 25000, color: "yellow" as const },
    { id: "t2", name: "Tank 2", product: "Petrol 92", current: 8200, max: 15000, color: "red" as const },
    { id: "t3", name: "Tank 3", product: "Petrol 95", current: 4100, max: 10000, color: "green" as const },
    { id: "t4", name: "Tank 4", product: "Super Diesel", current: 2800, max: 10000, color: "blue" as const },
];

export default function InventoryPage() {
    return (
        <div className="flex flex-col gap-6 p-6 bg-background min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
                    <p className="text-muted-foreground">Monitor tank levels, record readings, and manage deliveries.</p>
                </div>
            </div>

            {/* Top Section: Tank Visuals */}
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {TANKS.map((tank) => (
                    <TankLevelCard
                        key={tank.id}
                        tankName={tank.name}
                        productName={tank.product}
                        currentVolume={tank.current}
                        maxVolume={tank.max}
                        color={tank.color}
                    />
                ))}
            </section>

            {/* Middle Section: Forms */}
            <section>
                <Tabs defaultValue="reading" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <TabsList>
                            <TabsTrigger value="reading">Daily Reading</TabsTrigger>
                            <TabsTrigger value="delivery">New Delivery</TabsTrigger>
                            <TabsTrigger value="return">Regulatory Return</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="reading" className="border-none p-0 outline-none">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <div className="lg:col-span-1">
                                <DailyReadingForm />
                            </div>
                            <div className="lg:col-span-2 flex items-center justify-center p-6 border rounded-xl border-dashed bg-muted/50">
                                <div className="text-center space-y-2 text-muted-foreground">
                                    <p>💡 Tip: Enter dip height to auto-calculate volume based on calibration charts.</p>
                                    <p className="text-sm">Readings should be taken at the start of every shift (6am/6pm).</p>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="delivery" className="border-none p-0 outline-none">
                        <div className="max-w-3xl">
                            <DeliveryForm />
                        </div>
                    </TabsContent>

                    <TabsContent value="return" className="border-none p-0 outline-none">
                        <div className="max-w-2xl">
                            <RegulatoryReturnForm />
                        </div>
                    </TabsContent>
                </Tabs>
            </section>

            {/* Bottom Section: History */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Recent Activity & History</h2>
                </div>
                <InventoryHistoryTable />
            </section>
        </div>
    );
}
