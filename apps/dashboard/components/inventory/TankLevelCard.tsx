"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface TankLevelCardProps {
    productName: string;
    tankName: string;
    currentVolume: number;
    maxVolume: number;
    color: "yellow" | "red" | "white" | "blue";
    index?: number;
}

export function TankLevelCard({
    productName,
    tankName,
    currentVolume,
    maxVolume,
    color,
    index = 0,
}: TankLevelCardProps) {
    const [mounted, setMounted] = useState(false);
    const [animatedPercentage, setAnimatedPercentage] = useState(0);

    const percentage = Math.min(100, Math.max(0, (currentVolume / maxVolume) * 100));

    // Staggered mount animation
    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), index * 100);
        return () => clearTimeout(timer);
    }, [index]);

    // Animated fill effect
    useEffect(() => {
        if (mounted) {
            const timer = setTimeout(() => setAnimatedPercentage(percentage), 200);
            return () => clearTimeout(timer);
        }
    }, [mounted, percentage]);

    const colorConfig = {
        yellow: {
            gradient: "from-amber-400 via-yellow-500 to-orange-500",
            glow: "shadow-amber-500/30",
            badge: "bg-gradient-to-r from-amber-500 to-orange-500",
            badgeText: "text-white",
            wave: "bg-amber-300/50",
        },
        red: {
            gradient: "from-rose-400 via-red-500 to-pink-600",
            glow: "shadow-red-500/30",
            badge: "bg-gradient-to-r from-rose-500 to-pink-600",
            badgeText: "text-white",
            wave: "bg-rose-300/50",
        },
        white: {
            gradient: "from-slate-200 via-slate-100 to-white",
            glow: "shadow-slate-400/30",
            badge: "bg-gradient-to-r from-slate-200 to-white border border-slate-300",
            badgeText: "text-slate-800",
            wave: "bg-white/50",
        },
        blue: {
            gradient: "from-sky-400 via-blue-500 to-indigo-600",
            glow: "shadow-blue-500/30",
            badge: "bg-gradient-to-r from-sky-500 to-indigo-600",
            badgeText: "text-white",
            wave: "bg-sky-300/50",
        },
    };

    const cfg = colorConfig[color];
    const isLow = percentage < 20;
    const isCritical = percentage < 10;

    return (
        <Card
            className={cn(
                "overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-xl",
                "border-0 bg-gradient-to-br from-white/80 to-white/40",
                "backdrop-blur-sm",
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
                isCritical && "ring-2 ring-red-500/50 animate-pulse"
            )}
            style={{ transitionDelay: `${index * 50}ms` }}
        >
            <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-semibold tracking-wide text-foreground">
                        {tankName}
                    </CardTitle>
                    <span
                        className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold shadow-lg",
                            cfg.badge,
                            cfg.badgeText,
                            cfg.glow
                        )}
                    >
                        {productName}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Volume Display */}
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold tabular-nums">
                        {currentVolume.toLocaleString()}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">
                        L
                    </span>
                    {isLow && (
                        <span className="ml-auto px-2 py-0.5 text-xs font-semibold rounded bg-red-100 text-red-700">
                            LOW
                        </span>
                    )}
                </div>

                {/* Tank Visual Container */}
                <div
                    className={cn(
                        "relative h-36 w-full rounded-xl overflow-hidden",
                        "bg-gradient-to-b from-slate-500 to-slate-800",
                        "border border-slate-200/50",
                        "shadow-inner"
                    )}
                >
                    {/* Animated Liquid Fill */}
                    <div
                        className={cn(
                            "absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out",
                            "bg-gradient-to-t",
                            cfg.gradient
                        )}
                        style={{ height: `${animatedPercentage}%` }}
                    >
                        {/* Wave Animation Top */}
                        <div className="absolute -top-2 left-0 right-0 h-4 overflow-hidden">
                            <div
                                className={cn(
                                    "absolute w-[200%] h-4 animate-wave",
                                    cfg.wave
                                )}
                                style={{
                                    borderRadius: "40%",
                                    top: "50%",
                                }}
                            />
                        </div>

                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />

                        {/* Bubble Effects */}
                        <div className="absolute bottom-2 left-1/4 w-2 h-2 bg-white/30 rounded-full animate-bubble" />
                        <div className="absolute bottom-4 left-1/2 w-1.5 h-1.5 bg-white/20 rounded-full animate-bubble delay-300" />
                        <div className="absolute bottom-1 left-3/4 w-1 h-1 bg-white/25 rounded-full animate-bubble delay-700" />
                    </div>

                    {/* Measurement Lines */}
                    <div className="absolute inset-x-2 inset-y-0 flex flex-col justify-between py-2 pointer-events-none">
                        {[75, 50, 25].map((level) => (
                            <div key={level} className="flex items-center gap-2">
                                <div className="w-3 h-px bg-slate-400/50" />
                                <span className="text-[10px] text-slate-400 font-medium">
                                    {level}%
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Center Percentage Display */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div
                            className={cn(
                                "px-4 py-2 rounded-lg backdrop-blur-sm",
                                "bg-white/70",
                                "shadow-lg border border-white/20"
                            )}
                        >
                            <span className="text-2xl font-bold tabular-nums text-slate-900">
                                {animatedPercentage.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="flex justify-between items-center text-xs text-slate-700">
                    <span>Capacity</span>
                    <span className="font-medium tabular-nums">
                        {maxVolume.toLocaleString()} L
                    </span>
                </div>
            </CardContent>

            {/* CSS Animations */}
            <style jsx>{`
                @keyframes wave {
                    0%, 100% { transform: translateX(0) rotate(0deg); }
                    50% { transform: translateX(-25%) rotate(2deg); }
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                @keyframes bubble {
                    0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
                    50% { transform: translateY(-20px) scale(1.2); opacity: 0.6; }
                }
                .animate-wave {
                    animation: wave 3s ease-in-out infinite;
                }
                .animate-shimmer {
                    animation: shimmer 2s ease-in-out infinite;
                }
                .animate-bubble {
                    animation: bubble 2s ease-in-out infinite;
                }
                .delay-300 {
                    animation-delay: 0.3s;
                }
                .delay-700 {
                    animation-delay: 0.7s;
                }
            `}</style>
        </Card>
    );
}
