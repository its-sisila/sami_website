"use client";

import React, { useState } from "react";
import { Brain } from "lucide-react";
import IntelligenceDashboard from "@/components/dashboard/IntelligenceDashboard";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/lib/hooks";

const PRODUCT_OPTIONS = [
    { value: "LP92", label: "Petrol 92" },
    { value: "LP95", label: "Petrol 95" },
    { value: "LAD", label: "Auto Diesel" },
    { value: "LSD", label: "Super Diesel" },
];

export default function IntelligencePage() {
    const { data: user } = useCurrentUser();
    const stationId = user?.station_id ?? "";
    const [product, setProduct] = useState("LP92");

    return (
        <div className="flex flex-col gap-6 md:gap-8 p-4 md:p-8 bg-background min-h-screen">
            {/* Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6 md:p-10 border border-slate-100 shadow-sm">
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-indigo-100">
                            <Brain className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                                Internal Intelligence
                            </h1>
                            <p className="text-sm text-slate-500 font-medium">
                                AI-powered demand forecasting & anomaly detection
                            </p>
                        </div>
                    </div>

                    {/* Product selector */}
                    <Select value={product} onValueChange={setProduct}>
                        <SelectTrigger className="w-[180px] h-10">
                            <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                            {PRODUCT_OPTIONS.map((p) => (
                                <SelectItem key={p.value} value={p.value}>
                                    {p.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Dashboard */}
            {stationId ? (
                <IntelligenceDashboard
                    stationId={stationId}
                    productType={product}
                />
            ) : (
                <div className="flex items-center justify-center py-24 text-slate-500 text-sm">
                    No station assigned. Please contact your administrator.
                </div>
            )}
        </div>
    );
}
