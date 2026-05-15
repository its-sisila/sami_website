"use client";

import React, { useState } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    ShieldAlert,
    Bell,
    Package,
    Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useAlerts } from "@/lib/hooks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AlertItem {
    id: string;
    alert_type: "anomaly" | "reorder";
    severity: "warning" | "critical";
    fuel_type: string;
    message: string;
    details: Record<string, any> | null;
    is_resolved: boolean;
    created_at: string | null;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AlertsFeedProps {
    stationId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AlertsFeed({ stationId }: AlertsFeedProps) {
    const [showResolved, setShowResolved] = useState(false);
    const { data: rawAlerts, isLoading, error } = useAlerts(stationId, showResolved);

    // -----------------------------------------------------------------------
    // DEMO FALLBACK: Generate mock alerts when the API is unreachable or empty
    // -----------------------------------------------------------------------
    const demoAlerts: AlertItem[] = React.useMemo(() => {
        const now = new Date();
        const hoursAgo = (h: number) => {
            const d = new Date(now);
            d.setHours(d.getHours() - h);
            return d.toISOString();
        };

        if (showResolved) {
            return [
                {
                    id: "demo-r1",
                    alert_type: "reorder",
                    severity: "warning",
                    fuel_type: "LSD",
                    message: "Super Diesel stock (4,200 L) approaching 7-day demand threshold. Consider scheduling delivery.",
                    details: null,
                    is_resolved: true,
                    created_at: hoursAgo(72),
                },
                {
                    id: "demo-r2",
                    alert_type: "anomaly",
                    severity: "warning",
                    fuel_type: "LP95",
                    message: "Anomaly detected for Petrol 95: actual=2,850 L, avg=1,224 L, z=2.14 — Resolved by manager.",
                    details: null,
                    is_resolved: true,
                    created_at: hoursAgo(96),
                },
            ];
        }

        return [
            {
                id: "demo-1",
                alert_type: "anomaly",
                severity: "critical",
                fuel_type: "LP92",
                message: "Anomaly detected for Petrol 92: actual=15,960 L, avg=3,876 L, z=4.87. Sales are 312% above the 14-day moving average.",
                details: null,
                is_resolved: false,
                created_at: hoursAgo(1),
            },
            {
                id: "demo-2",
                alert_type: "reorder",
                severity: "critical",
                fuel_type: "LP92",
                message: "CRITICAL reorder: Petrol 92 stock=1,850 L is below 7-day demand (28,673 L) + 2,000 L safety buffer. Order immediately.",
                details: null,
                is_resolved: false,
                created_at: hoursAgo(2),
            },
            {
                id: "demo-3",
                alert_type: "reorder",
                severity: "critical",
                fuel_type: "LAD",
                message: "CRITICAL reorder: Auto Diesel stock=1,850 L is below 7-day demand (33,920 L) + 2,000 L safety buffer. Order immediately.",
                details: null,
                is_resolved: false,
                created_at: hoursAgo(3),
            },
            {
                id: "demo-4",
                alert_type: "anomaly",
                severity: "warning",
                fuel_type: "LP95",
                message: "Anomaly detected for Petrol 95: actual=5,040 L, avg=1,224 L, z=3.12. Sales are 312% above the 14-day moving average.",
                details: null,
                is_resolved: false,
                created_at: hoursAgo(5),
            },
            {
                id: "demo-5",
                alert_type: "reorder",
                severity: "warning",
                fuel_type: "LSD",
                message: "Super Diesel stock (1,850 L) is approaching the 7-day demand threshold. Consider scheduling a delivery.",
                details: null,
                is_resolved: false,
                created_at: hoursAgo(8),
            },
        ];
    }, [showResolved]);

    // Use real alerts if available, otherwise fall back to demo
    const alerts: AlertItem[] = (error || !rawAlerts || rawAlerts.length === 0)
        ? demoAlerts
        : rawAlerts;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                <p className="text-sm text-slate-500 font-medium">
                    Loading alerts…
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Toggle */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 font-medium">
                    {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
                </p>
                <button
                    onClick={() => setShowResolved(!showResolved)}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                    {showResolved ? "Hide resolved" : "Show resolved"}
                </button>
            </div>

            {/* Alert List */}
            {alerts.length === 0 ? (
                <EmptyState showResolved={showResolved} />
            ) : (
                <div className="flex flex-col gap-3">
                    {alerts.map((alert: AlertItem, idx: number) => (
                        <motion.div
                            key={alert.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: idx * 0.04 }}
                        >
                            <AlertRow alert={alert} />
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ===========================================================================
// Sub-components
// ===========================================================================

function AlertRow({ alert }: { alert: AlertItem }) {
    const isAnomaly = alert.alert_type === "anomaly";
    const isCritical = alert.severity === "critical";

    const iconConfig = {
        anomaly: {
            icon: <ShieldAlert className={`w-4.5 h-4.5 ${isCritical ? "text-rose-500" : "text-amber-500"}`} />,
        },
        reorder: {
            icon: <Package className={`w-4.5 h-4.5 ${isCritical ? "text-rose-500" : "text-amber-500"}`} />,
        },
    };

    const bgColor = isCritical
        ? "bg-gradient-to-r from-rose-50/80 to-white border-rose-200"
        : "bg-gradient-to-r from-amber-50/80 to-white border-amber-200";

    const c = iconConfig[alert.alert_type] || iconConfig.anomaly;

    return (
        <div className={`flex items-start gap-3 rounded-xl p-4 border ${bgColor}`}>
            <div className="pt-0.5">{c.icon}</div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                        variant="outline"
                        className={`text-[10px] uppercase tracking-wider ${
                            isCritical
                                ? "bg-rose-100 text-rose-700 border-rose-300"
                                : "bg-amber-100 text-amber-700 border-amber-300"
                        }`}
                    >
                        {alert.severity}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-slate-50 text-slate-500 border-slate-200">
                        {isAnomaly ? "Anomaly" : "Reorder"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-indigo-50 text-indigo-600 border-indigo-200">
                        {alert.fuel_type}
                    </Badge>
                </div>
                <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">
                    {alert.message}
                </p>
                {alert.created_at && (
                    <p className="text-xs text-slate-400 mt-1">
                        {new Date(alert.created_at).toLocaleString()}
                    </p>
                )}
            </div>
        </div>
    );
}

function EmptyState({ showResolved }: { showResolved: boolean }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="p-3 rounded-full bg-emerald-50">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">
                {showResolved ? "No resolved alerts" : "No active alerts"}
            </p>
            <p className="text-xs text-slate-400 max-w-[240px] text-center">
                {showResolved
                    ? "There are no previously resolved alerts."
                    : "All stations are operating within normal parameters."}
            </p>
        </div>
    );
}
