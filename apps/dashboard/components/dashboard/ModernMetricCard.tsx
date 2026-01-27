"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface ModernMetricCardProps {
    title: string;
    value: string;
    subtext: string;
    icon: LucideIcon;
    trend?: string | null;
    trendUp?: boolean;
    href: string;
    color?: "slate" | "emerald" | "amber" | "violet" | "rose" | "sky" | "blue";
    index?: number; // For staggered animation
}

export function ModernMetricCard({
    title,
    value,
    subtext,
    icon: Icon,
    trend,
    trendUp = true,
    href,
    color = "slate",
    index = 0,
}: ModernMetricCardProps) {

    // Modern color palettes (Light mode optimized)
    const colorStyles = {
        slate: {
            iconBg: "bg-slate-100",
            iconText: "text-slate-600",
            borderTop: "border-t-slate-500"
        },
        emerald: {
            iconBg: "bg-emerald-50",
            iconText: "text-emerald-600",
            borderTop: "border-t-emerald-500"
        },
        amber: {
            iconBg: "bg-amber-50",
            iconText: "text-amber-600",
            borderTop: "border-t-amber-500"
        },
        violet: {
            iconBg: "bg-violet-50",
            iconText: "text-violet-600",
            borderTop: "border-t-violet-500"
        },
        rose: {
            iconBg: "bg-rose-50",
            iconText: "text-rose-600",
            borderTop: "border-t-rose-500"
        },
        sky: {
            iconBg: "bg-sky-50",
            iconText: "text-sky-600",
            borderTop: "border-t-sky-500"
        },
        blue: {
            iconBg: "bg-blue-50",
            iconText: "text-blue-600",
            borderTop: "border-t-blue-500"
        },
    };

    const style = colorStyles[color];

    return (
        <Link href={href} className="block h-full">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ y: -4, scale: 1.01 }}
                className={`relative h-full bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group`}
            >
                {/* Top accent border */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${style.borderTop.replace('border-t-', 'from-').replace('500', '400')} to-transparent opacity-70`} />

                <div className="p-5 flex flex-col h-full justify-between">
                    {/* Header: Icon + Title */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-lg ${style.iconBg} group-hover:scale-110 transition-transform duration-300`}>
                                <Icon className={`w-5 h-5 ${style.iconText}`} />
                            </div>
                            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                                {title}
                            </h3>
                        </div>

                        {trend && (
                            <Badge variant="secondary" className={`px-2 py-0.5 text-xs font-medium ${trendUp ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                {trendUp ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                                {trend}
                            </Badge>
                        )}
                    </div>

                    {/* Content: Value + Subtext */}
                    <div>
                        <div className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mb-1">
                            {value}
                        </div>
                        <p className="text-xs md:text-sm text-slate-400 font-medium">
                            {subtext}
                        </p>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}
