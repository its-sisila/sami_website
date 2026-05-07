"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import {
    AlertTriangle,
    CheckCircle2,
    TrendingUp,
    Loader2,
    ShieldAlert,
    Droplets,
    Package,
    CalendarDays,
    Activity,
} from "lucide-react";
import { motion } from "framer-motion";
import { getAccessToken } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Types (aligned with Stage 2 SARIMA backend)
// ---------------------------------------------------------------------------

interface DailySales {
    date: string;
    liters: number;
}

interface ForecastDay {
    date: string;
    predicted_liters: number;
}

interface AnomalyResult {
    is_anomaly: boolean;
    severity: "ok" | "warning" | "critical";
    actual: number;
    moving_avg_14d: number;
    z_score: number;
}

interface ReorderResult {
    status: "OK" | "WARNING" | "CRITICAL";
    current_stock: number;
    forecast_7day_demand: number;
    safety_stock: number;
    recommended_order_liters: number;
    days_of_stock_remaining: number;
}

interface ForecastResponse {
    station_id: string;
    product_type: string;
    product_name: string;
    generated_at: string;
    method: "sarima_v1" | "weighted_moving_average";
    historical: DailySales[];
    forecast: ForecastDay[];
    anomaly: AnomalyResult;
    reorder_status: ReorderResult;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface IntelligenceDashboardProps {
    stationId: string;
    productType: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function IntelligenceDashboard({
    stationId,
    productType,
}: IntelligenceDashboardProps) {
    const [data, setData] = useState<ForecastResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch forecast data
    useEffect(() => {
        async function fetchForecast() {
            setLoading(true);
            setError(null);
            try {
                const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                const token = await getAccessToken();

                const res = await fetch(
                    `${API_BASE}/forecasting/${stationId}/${productType}`,
                    {
                        headers: {
                            "Content-Type": "application/json",
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                    }
                );

                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.detail || `HTTP ${res.status}`);
                }

                const json: ForecastResponse = await res.json();
                setData(json);
            } catch (err: any) {
                setError(err.message ?? "Failed to fetch forecast data");
            } finally {
                setLoading(false);
            }
        }

        if (stationId && productType) {
            fetchForecast();
        }
    }, [stationId, productType]);

    // Merge historical + forecast into a single chart dataset
    const chartData = useMemo(() => {
        if (!data) return [];

        const merged: {
            date: string;
            label: string;
            historical?: number;
            forecast?: number;
        }[] = [];

        // Add historical points
        data.historical.forEach((h) => {
            merged.push({
                date: h.date,
                label: formatDateLabel(h.date),
                historical: h.liters,
            });
        });

        // Bridge: repeat last historical as first forecast point
        if (data.historical.length > 0 && data.forecast.length > 0) {
            const lastHist = data.historical[data.historical.length - 1];
            const existingIdx = merged.findIndex((m) => m.date === lastHist.date);
            if (existingIdx !== -1) {
                merged[existingIdx].forecast = lastHist.liters;
            }
        }

        // Add forecast points
        data.forecast.forEach((f) => {
            const existing = merged.find((m) => m.date === f.date);
            if (existing) {
                existing.forecast = f.predicted_liters;
            } else {
                merged.push({
                    date: f.date,
                    label: formatDateLabel(f.date),
                    forecast: f.predicted_liters,
                });
            }
        });

        return merged.sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
    }, [data]);

    // -----------------------------------------------------------------------
    // Loading / Error states
    // -----------------------------------------------------------------------

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                <p className="text-sm text-slate-500 font-medium">
                    Crunching forecast data…
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <ShieldAlert className="h-10 w-10 text-rose-400" />
                <p className="text-sm text-rose-600 font-medium">{error}</p>
            </div>
        );
    }

    if (!data) return null;

    const { anomaly, reorder_status: reorder } = data;

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
        <div className="flex flex-col gap-6">
            {/* ============================================================ */}
            {/* Reorder Status Banner                                        */}
            {/* ============================================================ */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
            >
                <ReorderBanner reorder={reorder} productName={data.product_name} />
            </motion.div>

            {/* ============================================================ */}
            {/* KPI Cards Row                                                */}
            {/* ============================================================ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard
                    icon={Droplets}
                    label="Current Stock"
                    value={`${reorder.current_stock.toLocaleString()} L`}
                    accent="sky"
                    index={0}
                />
                <KpiCard
                    icon={TrendingUp}
                    label="7-Day Forecast"
                    value={`${reorder.forecast_7day_demand.toLocaleString()} L`}
                    accent="violet"
                    index={1}
                />
                <KpiCard
                    icon={CalendarDays}
                    label="Days Remaining"
                    value={`${reorder.days_of_stock_remaining}`}
                    accent={reorder.days_of_stock_remaining < 5 ? "rose" : "emerald"}
                    index={2}
                />
                <KpiCard
                    icon={Package}
                    label="Recommended Order"
                    value={
                        reorder.recommended_order_liters > 0
                            ? `${reorder.recommended_order_liters.toLocaleString()} L`
                            : "None"
                    }
                    accent={reorder.recommended_order_liters > 0 ? "amber" : "emerald"}
                    index={3}
                />
            </div>

            {/* ============================================================ */}
            {/* Historical vs Forecast Chart                                 */}
            {/* ============================================================ */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="bg-white rounded-2xl p-6 md:p-8 border border-slate-100 shadow-sm"
            >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-900">
                                Demand Forecast
                            </h3>
                            <MethodBadge method={data.method} />
                        </div>
                        <p className="text-sm text-slate-500">
                            Historical sales vs 7-day prediction for{" "}
                            <span className="font-semibold text-slate-700">
                                {data.product_name}
                            </span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="flex items-center text-xs font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md gap-1.5">
                            <span className="w-3 h-0.5 bg-blue-500 rounded-full inline-block" />
                            Historical
                        </span>
                        <span className="flex items-center text-xs font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md gap-1.5">
                            <span className="w-3 h-0.5 bg-emerald-500 rounded-full inline-block border-dashed" style={{ borderTop: '2px dashed #10b981', height: 0 }} />
                            Forecast
                        </span>
                    </div>
                </div>

                <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="#f1f5f9"
                            />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 11, fill: "#64748b" }}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: "#64748b" }}
                                tickLine={false}
                                axisLine={false}
                                dx={-10}
                                tickFormatter={(v) =>
                                    v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v)
                                }
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: 12,
                                    border: "1px solid #e2e8f0",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                                    fontSize: 13,
                                }}
                                formatter={(value: number, name: string) => [
                                    `${value.toLocaleString()} L`,
                                    name === "historical" ? "Actual" : "Predicted",
                                ]}
                            />
                            {/* Historical line – solid */}
                            <Line
                                type="monotone"
                                dataKey="historical"
                                stroke="#3b82f6"
                                strokeWidth={2.5}
                                dot={{ r: 3, fill: "#3b82f6" }}
                                activeDot={{ r: 5 }}
                                connectNulls={false}
                                name="historical"
                            />
                            {/* Forecast line – dashed */}
                            <Line
                                type="monotone"
                                dataKey="forecast"
                                stroke="#10b981"
                                strokeWidth={2.5}
                                strokeDasharray="6 4"
                                dot={{ r: 3, fill: "#10b981", strokeDasharray: "0" }}
                                activeDot={{ r: 5 }}
                                connectNulls={false}
                                name="forecast"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* ============================================================ */}
            {/* Anomaly Card (Z-Score based)                                  */}
            {/* ============================================================ */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
            >
                <AnomalyCard anomaly={anomaly} />
            </motion.div>
        </div>
    );
}

// ===========================================================================
// Sub-components
// ===========================================================================

/** Reorder status banner – red / yellow / green */
function ReorderBanner({
    reorder,
    productName,
}: {
    reorder: ReorderResult;
    productName: string;
}) {
    const config: Record<
        string,
        { bg: string; border: string; text: string; icon: React.ReactNode; title: string }
    > = {
        CRITICAL: {
            bg: "bg-gradient-to-r from-rose-50 to-red-50",
            border: "border-rose-200",
            text: "text-rose-700",
            icon: <AlertTriangle className="w-5 h-5 text-rose-500" />,
            title: "Critical – Order Immediately",
        },
        WARNING: {
            bg: "bg-gradient-to-r from-amber-50 to-yellow-50",
            border: "border-amber-200",
            text: "text-amber-700",
            icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
            title: "Warning – Stock Running Low",
        },
        OK: {
            bg: "bg-gradient-to-r from-emerald-50 to-green-50",
            border: "border-emerald-200",
            text: "text-emerald-700",
            icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
            title: "Stock Level Healthy",
        },
    };

    const c = config[reorder.status] ?? config.OK;

    return (
        <div
            className={`flex items-start gap-4 rounded-xl p-4 md:p-5 border ${c.bg} ${c.border}`}
        >
            <div className="pt-0.5">{c.icon}</div>
            <div className="flex-1">
                <h4 className={`font-bold ${c.text}`}>{c.title}</h4>
                <p className="text-sm text-slate-600 mt-1">
                    <span className="font-semibold">{productName}</span> –{" "}
                    {reorder.current_stock.toLocaleString()} L in stock,{" "}
                    {reorder.forecast_7day_demand.toLocaleString()} L forecasted demand over
                    the next 7 days (incl. {reorder.safety_stock.toLocaleString()} L safety
                    buffer).
                    {reorder.recommended_order_liters > 0 && (
                        <span className="font-semibold">
                            {" "}
                            Recommended order:{" "}
                            {reorder.recommended_order_liters.toLocaleString()} L.
                        </span>
                    )}
                </p>
            </div>
        </div>
    );
}

/** Small KPI card */
function KpiCard({
    icon: Icon,
    label,
    value,
    accent,
    index = 0,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    accent: "sky" | "violet" | "emerald" | "amber" | "rose";
    index?: number;
}) {
    const accentMap: Record<string, { bg: string; iconColor: string }> = {
        sky: { bg: "bg-sky-50", iconColor: "text-sky-600" },
        violet: { bg: "bg-violet-50", iconColor: "text-violet-600" },
        emerald: { bg: "bg-emerald-50", iconColor: "text-emerald-600" },
        amber: { bg: "bg-amber-50", iconColor: "text-amber-600" },
        rose: { bg: "bg-rose-50", iconColor: "text-rose-600" },
    };

    const a = accentMap[accent] ?? accentMap.sky;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.07 }}
            className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col gap-2"
        >
            <div className={`p-2 rounded-lg w-fit ${a.bg}`}>
                <Icon className={`w-4 h-4 ${a.iconColor}`} />
            </div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {label}
            </p>
            <p className="text-lg font-bold text-slate-900 tracking-tight">{value}</p>
        </motion.div>
    );
}

/** Model method badge */
function MethodBadge({ method }: { method: string }) {
    const isSarima = method === "sarima_v1";
    return (
        <Badge
            variant="outline"
            className={`text-[10px] font-semibold uppercase tracking-wider ${
                isSarima
                    ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                    : "bg-slate-50 text-slate-500 border-slate-200"
            }`}
        >
            <Activity className="w-3 h-3 mr-1" />
            {isSarima ? "SARIMA" : "Weighted Avg"}
        </Badge>
    );
}

/** Anomaly warning card – Z-Score based */
function AnomalyCard({ anomaly }: { anomaly: AnomalyResult }) {
    const severityConfig: Record<
        string,
        { bg: string; border: string; icon: React.ReactNode; title: string; textColor: string }
    > = {
        ok: {
            bg: "bg-gradient-to-r from-slate-50 to-slate-50/50",
            border: "border-slate-200",
            icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />,
            title: "No Anomalies Detected",
            textColor: "text-slate-700",
        },
        warning: {
            bg: "bg-gradient-to-r from-amber-50 to-yellow-50",
            border: "border-amber-200",
            icon: <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />,
            title: "⚠ Warning – Unusual Activity",
            textColor: "text-amber-700",
        },
        critical: {
            bg: "bg-gradient-to-r from-rose-50 to-orange-50",
            border: "border-rose-200",
            icon: <ShieldAlert className="w-5 h-5 text-rose-500 mt-0.5" />,
            title: "🚨 Critical Anomaly Detected",
            textColor: "text-rose-700",
        },
    };

    const c = severityConfig[anomaly.severity] ?? severityConfig.ok;
    const zDisplay = isFinite(anomaly.z_score)
        ? anomaly.z_score.toFixed(2)
        : "∞";

    return (
        <div className={`flex items-start gap-4 rounded-xl p-4 md:p-5 border ${c.bg} ${c.border}`}>
            {c.icon}
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <h4 className={`font-bold ${c.textColor}`}>{c.title}</h4>
                    {anomaly.severity !== "ok" && (
                        <Badge
                            variant="outline"
                            className={`text-[10px] uppercase tracking-wider ${
                                anomaly.severity === "critical"
                                    ? "bg-rose-100 text-rose-700 border-rose-300"
                                    : "bg-amber-100 text-amber-700 border-amber-300"
                            }`}
                        >
                            Z = {zDisplay}
                        </Badge>
                    )}
                </div>
                <p className="text-sm text-slate-600 mt-1">
                    Today's actual sales ({anomaly.actual.toLocaleString()} L)
                    {anomaly.is_anomaly ? (
                        <>
                            {" "}deviate significantly from the 14-day average of{" "}
                            <span className="font-semibold">{anomaly.moving_avg_14d.toLocaleString()} L</span>
                            {" "}(Z-Score: <span className="font-bold">{zDisplay}</span>).
                            This may indicate unusual activity, a recording error, or an external event.
                        </>
                    ) : (
                        <>
                            {" "}are within the expected range of the 14-day moving
                            average ({anomaly.moving_avg_14d.toLocaleString()} L).
                        </>
                    )}
                </p>
            </div>
        </div>
    );
}

// ===========================================================================
// Helpers
// ===========================================================================

function formatDateLabel(isoDate: string): string {
    const d = new Date(isoDate);
    const day = d.getDate();
    const month = d.toLocaleString("default", { month: "short" });
    return `${day} ${month}`;
}
