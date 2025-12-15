"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TankLevelCardProps {
    productName: string;
    tankName: string;
    currentVolume: number;
    maxVolume: number;
    color: "yellow" | "red" | "green" | "blue"; // Yellow=Diesel, Red=Petrol, etc.
}

export function TankLevelCard({
    productName,
    tankName,
    currentVolume,
    maxVolume,
    color,
}: TankLevelCardProps) {
    const percentage = Math.min(100, Math.max(0, (currentVolume / maxVolume) * 100));

    const colorClasses = {
        yellow: "bg-yellow-500",
        red: "bg-red-500",
        green: "bg-green-500",
        blue: "bg-blue-500",
    };

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        {tankName}
                    </CardTitle>
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold text-white", colorClasses[color])}>
                        {productName}
                    </span>
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold mb-4">
                    {currentVolume.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">L</span>
                </div>

                {/* Visual Tank Bar */}
                <div className="relative h-32 w-full bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 flex flex-col justify-end overflow-hidden group">
                    {/* Liquid */}
                    <div
                        className={cn("w-full transition-all duration-1000 ease-in-out relative", colorClasses[color])}
                        style={{ height: `${percentage}%` }}
                    >
                        <div className="absolute top-0 left-0 right-0 h-1 bg-white/20"></div>
                    </div>

                    {/* Percentage Label Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-lg font-bold text-slate-900/50 dark:text-white/50 mix-blend-overlay">
                            {percentage.toFixed(1)}%
                        </span>
                    </div>

                    {/* Grid lines for measurement context */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none p-1">
                        <div className="border-t border-dashed border-slate-300 dark:border-slate-600 w-full h-px opacity-50"></div>
                        <div className="border-t border-dashed border-slate-300 dark:border-slate-600 w-full h-px opacity-50"></div>
                        <div className="border-t border-dashed border-slate-300 dark:border-slate-600 w-full h-px opacity-50"></div>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-right">
                    Capacity: {maxVolume.toLocaleString()} L
                </p>
            </CardContent>
        </Card>
    );
}
