"use client";

import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
    Banknote,
    Droplets,
    AlertTriangle,
    Users,
    TrendingUp,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Truck,
    ArrowUpRight,
    ArrowDownRight,
    Sun,
    Moon,
    ShoppingCart,
    Loader2,
    RefreshCcw,
    Bell,
    UserCircle,
    ClipboardList,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useTanks, useOrders, useActiveEmployees, useCurrentShift, useShiftSummary, useWeeklySales, useDailySales, useLatestShift, useDailyAttendance, useEmployees, useCurrentUser } from "@/lib/hooks";
import { useAlertSettings } from "@/lib/contexts/alert-settings";
import { ModernMetricCard } from "@/components/dashboard/ModernMetricCard";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { motion } from "framer-motion";


// --- Constants ---
interface DashboardAlert {
    id: number;
    type: "warning" | "info";
    title: string;
    message: string;
    action: string;
    href: string;
}

interface MetricItem {
    title: string;
    value: string;
    subtext: string;
    icon: any;
    trend: string | null;
    trendUp: boolean;
    href: string;
    color?: "slate" | "emerald" | "amber" | "violet" | "rose" | "sky";
}

const PLACEHOLDER_METRICS: MetricItem[] = [
    { title: "Today's Stock", value: "0 L", subtext: "No stock data", icon: Droplets, trend: null, trendUp: true, href: "/inventory", color: "sky" },
    { title: "Yesterday's Sales", value: "LKR 0", subtext: "No sales data", icon: Banknote, trend: null, trendUp: true, href: "/sales", color: "emerald" },
    { title: "Pending Orders", value: "No Orders", subtext: "All orders fulfilled", icon: ShoppingCart, trend: null, trendUp: false, href: "/inventory?tab=orders", color: "amber" },
    { title: "Staff On Duty", value: "0 Active", subtext: "No active staff", icon: Users, trend: null, trendUp: true, href: "/staff", color: "violet" },
];

// --- Components ---

// --- Components ---

function StockProgressBar({ item }: { item: { product: string; fullName: string; liter: number; capacity: number; percent: number; gradient: string } }) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <div>
                    <span className={`text-sm font-bold bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent`}>
                        {item.product}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">{item.fullName}</span>
                </div>
                <span className={`text-sm font-semibold bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent`}>
                    {item.percent.toFixed(1)}%
                </span>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                        className={`h-full rounded-full bg-gradient-to-r ${item.gradient} transition-all duration-500`}
                        style={{ width: `${item.percent}%` }}
                    />
                </div>
                <span className="text-xs text-muted-foreground w-20 text-right tabular-nums">
                    {item.liter.toLocaleString()} L
                </span>
            </div>
        </div>
    );
}

function OrderStatusBadge({ status }: { status: string }) {
    const config = {
        Pending: { icon: Clock, className: "bg-amber-50 text-amber-600 border-amber-200" },
        Delivered: { icon: CheckCircle2, className: "bg-emerald-50 text-emerald-600 border-emerald-200" },
        Cancelled: { icon: XCircle, className: "bg-muted text-muted-foreground border-border" },
    };

    const { icon: Icon, className } = config[status as keyof typeof config] || config.Cancelled;

    return (
        <Badge variant="outline" className={className}>
            <Icon className="w-3 h-3 mr-1" />
            {status}
        </Badge>
    );
}

export default function DashboardPage() {
    // ===== API DATA FETCHING =====

    // 1. Today's Stock - GET /inventory/tanks (sum volumes)
    const { data: apiTanks, isLoading: tanksLoading } = useTanks();

    // 1b. Yesterday's Stock (for trend calculation)
    const yesterdayForStock = new Date();
    yesterdayForStock.setDate(yesterdayForStock.getDate() - 1);
    const yesterdayStockStr = yesterdayForStock.toISOString().split('T')[0];
    const { data: yesterdayTanks } = useTanks(yesterdayStockStr);

    // 2. Pending Orders - GET /orders?status=pending
    const { data: pendingOrders, isLoading: pendingOrdersLoading } = useOrders('pending');

    // 3. All Orders (for recent orders section)
    const { data: allOrders, isLoading: allOrdersLoading } = useOrders();

    // 4. Active Employees (for staff on duty)
    const { data: activeEmployees, isLoading: employeesLoading } = useActiveEmployees();

    // 4b. All Employees (for mapping IDs to names)
    const { data: allEmployees } = useEmployees();

    // 4c. Today's Attendance (for late/early staff alerts)
    const todayDateStr = new Date().toISOString().split('T')[0];
    const { data: todayAttendance } = useDailyAttendance(todayDateStr);

    // 4d. Alert Settings (configurable thresholds from Settings page)
    const { settings: alertSettings } = useAlertSettings();

    // 4e. User Profile (for welcome message)
    const { data: user } = useCurrentUser();

    // 5. Current Shift (to determine day/night and get summary)
    const { data: currentShift, isLoading: shiftLoading } = useCurrentShift();

    // 5b. Latest Closed Shift (fallback when no current shift)
    const { data: latestShift } = useLatestShift();

    // 6. If there's a current shift, get its summary; otherwise get latest shift summary
    const activeShiftId = currentShift?.id || latestShift?.id || null;
    const { data: shiftSummary, isLoading: summaryLoading } = useShiftSummary(activeShiftId);

    // 7. Weekly/Monthly Sales Data
    // Default to last 7 days
    const defaultTo = new Date();
    const defaultFrom = new Date();
    defaultFrom.setDate(defaultTo.getDate() - 6);

    const [dateRange, setDateRange] = useState<{
        from: Date | undefined;
        to: Date | undefined;
    } | undefined>({
        from: defaultFrom,
        to: defaultTo,
    });

    // Calculate dates for hook
    const startDate = dateRange?.from ? dateRange.from.toISOString().split('T')[0] : "";
    const endDate = dateRange?.to ? dateRange.to.toISOString().split('T')[0] : "";

    const { data: weeklySales, isLoading: weeklySalesLoading } = useWeeklySales(
        startDate && endDate ? startDate : "",
        startDate && endDate ? endDate : ""
    );

    // 8. Yesterday's Sales Data
    const today = new Date();
    const yesterdayDate = new Date(today);
    yesterdayDate.setDate(today.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
    const { data: yesterdaySales, isLoading: yesterdaySalesLoading } = useDailySales(yesterdayStr);

    // 9. Day-Before-Yesterday Sales (for trend calculation)
    const dayBeforeDate = new Date(today);
    dayBeforeDate.setDate(today.getDate() - 2);
    const dayBeforeStr = dayBeforeDate.toISOString().split('T')[0];
    const { data: dayBeforeSales } = useDailySales(dayBeforeStr);

    // Calculate sales trend percentage
    const salesTrend = useMemo(() => {
        if (!yesterdaySales || !dayBeforeSales) return null;
        const yesterday = Number(yesterdaySales.total_sales);
        const dayBefore = Number(dayBeforeSales.total_sales);
        if (dayBefore === 0) {
            if (yesterday > 0) return { value: 100, up: true };
            return null;
        }
        const change = ((yesterday - dayBefore) / dayBefore) * 100;
        return { value: Math.abs(change), up: change >= 0 };
    }, [yesterdaySales, dayBeforeSales]);

    // ===== LAST UPDATED TIMESTAMP =====
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [lastUpdatedText, setLastUpdatedText] = useState<string>('just now');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Format relative time (e.g., "2 min ago", "just now")
    const formatRelativeTime = useCallback((date: Date): string => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);

        if (diffSeconds < 30) return 'just now';
        if (diffSeconds < 60) return `${diffSeconds}s ago`;
        if (diffMinutes < 60) return `${diffMinutes} min ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return date.toLocaleTimeString();
    }, []);

    // Update lastUpdated when any data changes
    useEffect(() => {
        if (apiTanks || pendingOrders || activeEmployees || currentShift || shiftSummary || weeklySales || yesterdaySales) {
            setLastUpdated(new Date());
        }
    }, [apiTanks, pendingOrders, activeEmployees, currentShift, shiftSummary, weeklySales, yesterdaySales]);

    // Update the relative time text every 30 seconds
    useEffect(() => {
        setLastUpdatedText(formatRelativeTime(lastUpdated));
        const interval = setInterval(() => {
            setLastUpdatedText(formatRelativeTime(lastUpdated));
        }, 30000);
        return () => clearInterval(interval);
    }, [lastUpdated, formatRelativeTime]);

    // Handle manual refresh
    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        // Trigger revalidation of all SWR hooks by mutating their cache
        const { mutate } = await import('swr');
        await mutate(() => true, undefined, { revalidate: true });
        setLastUpdated(new Date());
        setIsRefreshing(false);
    }, []);

    // ===== PULL TO REFRESH (Mobile) =====
    const [pullDistance, setPullDistance] = useState(0);
    const [isPulling, setIsPulling] = useState(false);
    const touchStartY = useRef<number>(0);
    const pullThreshold = 80; // Pixels to pull before triggering refresh

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        // Only enable pull-to-refresh when at top of page
        if (window.scrollY === 0) {
            touchStartY.current = e.touches[0].clientY;
            setIsPulling(true);
        }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isPulling) return;
        const currentY = e.touches[0].clientY;
        const diff = currentY - touchStartY.current;
        if (diff > 0 && window.scrollY === 0) {
            // Apply resistance to make it feel more natural
            setPullDistance(Math.min(diff * 0.5, pullThreshold * 1.5));
        }
    }, [isPulling, pullThreshold]);

    const handleTouchEnd = useCallback(() => {
        if (pullDistance >= pullThreshold && !isRefreshing) {
            handleRefresh();
        }
        setPullDistance(0);
        setIsPulling(false);
    }, [pullDistance, pullThreshold, isRefreshing, handleRefresh]);

    // ===== DERIVED DATA =====

    // Derive stock data from API tanks, no mock fallback
    const stockData = useMemo(() => {
        if (apiTanks && apiTanks.length > 0) {
            // Group tanks by product code prefix and aggregate
            const productMap: Record<string, { liter: number; capacity: number; fullName: string; gradient: string }> = {};

            const productConfig: Record<string, { fullName: string; gradient: string }> = {
                'LP92': { fullName: 'Petrol 92', gradient: 'from-amber-400 to-orange-500' },
                'LP95': { fullName: 'Petrol 95', gradient: 'from-rose-500 to-pink-600' },
                'LAD': { fullName: 'Auto Diesel', gradient: 'from-sky-500 to-blue-600' },
                'LSD': { fullName: 'Super Diesel', gradient: 'from-slate-400 to-slate-600' },
            };

            apiTanks.forEach(tank => {
                // Extract product code from tank name (e.g., "LP92-1" -> "LP92")
                const productCode = tank.name.replace(/-\d+$/, '');
                const config = productConfig[productCode];

                if (config) {
                    if (!productMap[productCode]) {
                        productMap[productCode] = {
                            liter: 0,
                            capacity: 0,
                            fullName: config.fullName,
                            gradient: config.gradient,
                        };
                    }
                    productMap[productCode].liter += Number(tank.current_volume) || 0;
                    productMap[productCode].capacity += Number(tank.capacity_liters) || 0;
                }
            });

            return Object.entries(productMap).map(([product, data]) => ({
                product,
                fullName: data.fullName,
                liter: Math.round(data.liter),
                capacity: Math.round(data.capacity),
                percent: data.capacity > 0 ? (data.liter / data.capacity) * 100 : 0,
                gradient: data.gradient,
            }));
        }
        return [];
    }, [apiTanks]);

    // Total stock calculation
    const totalStock = useMemo(() => {
        return stockData.reduce((sum, item) => sum + item.liter, 0);
    }, [stockData]);

    // Yesterday's total stock calculation
    const yesterdayTotalStock = useMemo(() => {
        if (yesterdayTanks && yesterdayTanks.length > 0) {
            return yesterdayTanks.reduce((sum, tank) => sum + (tank.current_volume || 0), 0);
        }
        return 0;
    }, [yesterdayTanks]);

    // Calculate stock trend percentage
    const stockTrend = useMemo(() => {
        if (totalStock === 0 || yesterdayTotalStock === 0) return null;
        const change = ((totalStock - yesterdayTotalStock) / yesterdayTotalStock) * 100;
        return { value: Math.abs(change), up: change >= 0 };
    }, [totalStock, yesterdayTotalStock]);

    // Pending orders data
    const pendingOrdersData = useMemo(() => {
        if (pendingOrders && pendingOrders.length > 0) {
            const totalLiters = pendingOrders.reduce((sum, order) => sum + order.liters_ordered, 0);
            return {
                count: pendingOrders.length,
                totalLiters,
            };
        }
        return { count: 0, totalLiters: 0 };
    }, [pendingOrders]);

    // Recent orders for the sidebar (top 3)
    const recentOrdersList = useMemo(() => {
        if (allOrders && allOrders.length > 0) {
            return allOrders.slice(0, 3).map(order => ({
                id: order.order_number || order.id.slice(0, 8),
                product: order.product_id.slice(0, 4).toUpperCase(),
                liters: order.liters_ordered,
                status: order.status.charAt(0).toUpperCase() + order.status.slice(1),
                time: order.placed_at ? new Date(order.placed_at).toLocaleDateString() : 'N/A',
                supplier: order.supplier,
            }));
        }
        return [];
    }, [allOrders]);

    // Staff on duty (derived from today's attendance)
    const staffOnDuty = useMemo(() => {
        if (!todayAttendance || !allEmployees) return [];

        // Filter: Has checked in, hasn't checked out
        const onDuty = todayAttendance.filter(record => record.time_in && !record.time_out);

        return onDuty.map(record => {
            const emp = allEmployees.find(e => e.id === record.employee_id);
            if (!emp) return null; // Should not happen if data consistent

            return {
                id: emp.id,
                name: emp.name_with_initials || emp.full_name,
                role: emp.role.charAt(0).toUpperCase() + emp.role.slice(1),
                timeIn: record.time_in ? record.time_in.slice(0, 5) : "--:--", // HH:MM
                status: "active",
            };
        }).filter((item): item is { id: string; name: string; role: string; timeIn: string; status: string } => item !== null);
    }, [todayAttendance, allEmployees]);

    // Current shift info (uses current shift if open, otherwise latest closed shift)
    const currentShiftInfo = useMemo(() => {
        if (shiftSummary) {
            return {
                type: shiftSummary.shift.shift_type === 'day' ? 'Day' as const : 'Night' as const,
                date: shiftSummary.shift.shift_date,
                totalSales: Number(shiftSummary.total_amount),
                totalLiters: Number(shiftSummary.total_liters),
                salesCount: shiftSummary.sales_count,
                isOpen: shiftSummary.shift.status === 'open',
            };
        }
        if (currentShift) {
            return {
                type: currentShift.shift_type === 'day' ? 'Day' as const : 'Night' as const,
                date: currentShift.shift_date,
                totalSales: 0,
                totalLiters: 0,
                salesCount: 0,
                isOpen: currentShift.status === 'open',
            };
        }
        if (latestShift) {
            return {
                type: latestShift.shift_type === 'day' ? 'Day' as const : 'Night' as const,
                date: latestShift.shift_date,
                totalSales: 0,
                totalLiters: 0,
                salesCount: 0,
                isOpen: false,
            };
        }
        return null;
    }, [currentShift, shiftSummary, latestShift]);

    // Dynamic alerts based on stock levels and overdue orders
    const dynamicAlerts = useMemo(() => {
        const alerts: DashboardAlert[] = [];
        let alertId = 1;

        // 1. Low Stock Alerts (< 30% capacity)
        stockData.forEach(item => {
            if (item.percent < 30) {
                alerts.push({
                    id: alertId++,
                    type: "warning",
                    title: "Low Stock Alert",
                    message: `${item.product} at ${item.percent.toFixed(0)}% capacity`,
                    action: "Order Now",
                    href: "/inventory?tab=orders",
                });
            }
        });

        // 2. Overdue Order Alerts (pending orders older than 1 day)
        if (pendingOrders && pendingOrders.length > 0) {
            const oneDayAgo = new Date();
            oneDayAgo.setDate(oneDayAgo.getDate() - 1);

            pendingOrders.forEach(order => {
                const orderDate = order.placed_at ? new Date(order.placed_at) : null;
                if (orderDate && orderDate < oneDayAgo) {
                    alerts.push({
                        id: alertId++,
                        type: "warning",
                        title: "Overdue Order",
                        message: `Order ${order.order_number || order.id.slice(0, 8)} pending for over 24 hours`,
                        action: "View Order",
                        href: `/inventory?tab=orders`,
                    });
                }
            });
        }

        // 3. Late Arrival / Early Departure Staff Alerts
        if (todayAttendance && todayAttendance.length > 0 && currentShiftInfo) {
            // Shift times: Day shift 7:00 AM (07:00), Night shift 7:00 PM (19:00)
            const expectedStartTime = currentShiftInfo.type === 'Day' ? '07:00' : '19:00';
            const expectedEndTime = currentShiftInfo.type === 'Day' ? '19:00' : '07:00';

            todayAttendance.forEach(record => {
                // Find employee name
                const employee = allEmployees?.find(e => e.id === record.employee_id);
                const employeeName = employee?.name_with_initials || employee?.full_name || 'Staff';

                // Check for late arrival (more than configured threshold)
                if (record.time_in) {
                    const timeIn = record.time_in.slice(0, 5); // Get HH:MM
                    const [startHour, startMin] = expectedStartTime.split(':').map(Number);
                    const [inHour, inMin] = timeIn.split(':').map(Number);
                    const startMinutes = startHour * 60 + startMin;
                    const inMinutes = inHour * 60 + inMin;
                    const lateByMinutes = inMinutes - startMinutes;

                    if (lateByMinutes > alertSettings.lateArrivalThreshold) {
                        alerts.push({
                            id: alertId++,
                            type: "info",
                            title: "Late Arrival",
                            message: `${employeeName} arrived ${lateByMinutes}min late at ${timeIn}`,
                            action: "View Staff",
                            href: "/staff",
                        });
                    }
                }

                // Check for early departure (more than configured threshold)
                if (record.time_out && currentShiftInfo.isOpen === false) {
                    const timeOut = record.time_out.slice(0, 5); // Get HH:MM
                    const [endHour, endMin] = expectedEndTime.split(':').map(Number);
                    const [outHour, outMin] = timeOut.split(':').map(Number);
                    const endMinutes = endHour * 60 + endMin;
                    const outMinutes = outHour * 60 + outMin;
                    const earlyByMinutes = endMinutes - outMinutes;

                    if (earlyByMinutes > alertSettings.earlyDepartureThreshold) {
                        alerts.push({
                            id: alertId++,
                            type: "info",
                            title: "Early Departure",
                            message: `${employeeName} left ${earlyByMinutes}min early at ${timeOut}`,
                            action: "View Staff",
                            href: "/staff",
                        });
                    }
                }
            });
        }

        return alerts;
    }, [stockData, pendingOrders, todayAttendance, allEmployees, currentShiftInfo, alertSettings]);

    // Dynamic metrics based on all API data
    const dynamicMetrics: MetricItem[] = useMemo(() => {
        return [
            {
                title: "Today's Stock",
                value: `${(totalStock / 1000).toFixed(1)}K L`,
                subtext: `Across ${stockData.length} product types`,
                icon: Droplets,
                trend: stockTrend ? `${stockTrend.up ? '+' : '-'}${stockTrend.value.toFixed(1)}%` : null,
                trendUp: stockTrend?.up ?? true,
                href: "/inventory",
                color: "sky",
            },
            {
                title: "Yesterday's Sales",
                value: `LKR ${yesterdaySales ? Number(yesterdaySales.total_sales).toLocaleString() : '0'}`,
                subtext: salesTrend ? `${salesTrend.value.toFixed(1)}% vs day before` : "No prior data",
                icon: Banknote,
                trend: salesTrend ? `${salesTrend.up ? '+' : '-'}${salesTrend.value.toFixed(1)}%` : null,
                trendUp: salesTrend?.up ?? true,
                href: "/sales",
                color: "emerald",
            },
            {
                title: "Pending Orders",
                value: pendingOrders && pendingOrders.length > 0 ? `${pendingOrders.length} Pending` : "No Orders",
                subtext: pendingOrders && pendingOrders.length > 0 ? "Requires attention" : "All orders fulfilled",
                icon: ShoppingCart,
                trend: null,
                trendUp: false,
                href: "/inventory?tab=orders",
                color: "amber",
            },
            {
                title: "Staff On Duty",
                value: staffOnDuty.length > 0 ? `${staffOnDuty.length} Active` : PLACEHOLDER_METRICS[3].value,
                subtext: currentShiftInfo ? `${currentShiftInfo.type} Shift` : "Day Shift",
                icon: Users,
                trend: staffOnDuty && staffOnDuty.length >= 4 ? "Full Strength" : null,
                trendUp: true,
                href: "/staff",
                color: "violet",
            },
        ];
    }, [totalStock, stockData.length, currentShiftInfo, pendingOrdersData, activeEmployees, yesterdaySales, salesTrend, stockTrend, staffOnDuty, pendingOrders]);

    // Loading state - only block on essential data
    const isLoading = tanksLoading || pendingOrdersLoading;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
            </div>
        );
    }

    // Get time of day for greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

    return (
        <div
            className="flex flex-col gap-6 md:gap-8 p-4 md:p-8 bg-background min-h-screen"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull to Refresh Indicator (Mobile) */}

            {pullDistance > 0 && (
                <div
                    className="fixed top-0 left-0 right-0 flex items-center justify-center z-50 transition-all"
                    style={{ height: pullDistance, opacity: Math.min(pullDistance / pullThreshold, 1) }}
                >
                    <div className="bg-primary/10 rounded-full p-2">
                        <RefreshCcw
                            className={`w-6 h-6 text-primary transition-transform ${pullDistance >= pullThreshold ? 'animate-spin' : ''}`}
                            style={{ transform: `rotate(${pullDistance * 2}deg)` }}
                        />
                    </div>
                </div>
            )}

            {/* Modern Header */}
            <div className="relative overflow-hidden rounded-3xl bg-mesh-light p-6 md:p-10 border border-slate-100 shadow-soft">
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-2">
                            {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-slate-600">{user?.full_name?.split(' ')[0] || 'Manager'}</span>
                        </h1>
                        <p className="text-slate-500 font-medium">Here's what's happening at your station today.</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-slate-400 bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-200/50">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Updated {lastUpdatedText}</span>
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="ml-2 hover:text-blue-600 transition-colors disabled:opacity-50"
                            title="Refresh data"
                        >
                            <RefreshCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Top Row: Modern Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {dynamicMetrics.map((item, i) => (
                    <ModernMetricCard key={i} {...item} index={i} />
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

                {/* Left Column (2/3) */}
                <div className="lg:col-span-2 space-y-6 md:space-y-8">

                    {/* Sales Chart (Area Gradient) */}
                    <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-100 shadow-soft">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Sales Trend</h3>
                                <p className="text-sm text-slate-500 font-medium">Revenue performance over time</p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
                                <DateRangePicker
                                    date={dateRange}
                                    setDate={setDateRange}
                                />
                                <div className="hidden sm:flex items-center gap-2">
                                    <span className="flex items-center text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                                        <div className="w-2 h-2 rounded-full bg-orange-500 mr-1.5"></div> Day
                                    </span>
                                    <span className="flex items-center text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                                        <div className="w-2 h-2 rounded-full bg-blue-900 mr-1.5"></div> Night
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                {weeklySalesLoading ? (
                                    <div className="flex h-full items-center justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                                    </div>
                                ) : (
                                    <AreaChart data={weeklySales && weeklySales.length > 0 ? weeklySales : []}>
                                        <defs>
                                            <linearGradient id="colorDay" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorNight" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 11, fill: '#64748b' }}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(val) => {
                                                const d = new Date(val);
                                                return d.getDate().toString();
                                            }}
                                            dy={10}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: '#64748b' }}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
                                            width={35}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: 'none',
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                                padding: '12px'
                                            }}
                                            formatter={(value: number) => [`LKR ${Number(value).toLocaleString()}`, '']}
                                            labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '12px' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="dayShift"
                                            name="Day"
                                            stroke="#f97316"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorDay)"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="nightShift"
                                            name="Night"
                                            stroke="#1e3a8a"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorNight)"
                                        />
                                    </AreaChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Current/Last Shift Summary */}
                    <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-100 shadow-soft">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                {currentShiftInfo?.type === "Night" ? <Moon className="w-5 h-5 text-indigo-500" /> : <Sun className="w-5 h-5 text-orange-500" />}
                                {currentShiftInfo?.isOpen ? "Current Shift Live" : "Last Shift Summary"}
                            </h3>
                            {currentShiftInfo && (
                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${currentShiftInfo.isOpen ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                                    {currentShiftInfo.type} - {currentShiftInfo.date}
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100/50">
                                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Total Sales</p>
                                <p className="text-xl font-bold text-slate-900">LKR {(currentShiftInfo?.totalSales ?? 0).toLocaleString()}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100/50">
                                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Volume</p>
                                <p className="text-xl font-bold text-slate-900">{(currentShiftInfo?.totalLiters ?? 0).toLocaleString()} L</p>
                            </div>
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100/50">
                                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Transactions</p>
                                <p className="text-xl font-bold text-blue-600">{currentShiftInfo?.salesCount ?? '-'}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100/50">
                                <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-1">Status</p>
                                <p className="text-xl font-bold text-emerald-700">
                                    {currentShiftInfo?.isOpen ? "In Progress" : "Closed"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stock Levels */}
                    <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-100 shadow-soft">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Truck className="w-5 h-5 text-slate-400" />
                                <h3 className="text-lg font-bold text-slate-900">Current Stock</h3>
                            </div>
                            <Link href="/inventory" className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
                                View Details
                            </Link>
                        </div>
                        <div className="space-y-6">
                            {stockData.length > 0 ? (
                                stockData.map((item, i) => (
                                    <StockProgressBar key={i} item={item} />
                                ))
                            ) : (
                                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <Droplets className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    <p>No stock data available</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6 md:space-y-8">

                    {/* Alerts (Shows only if alerts exist) */}
                    {dynamicAlerts.length > 0 && (
                        <div className="bg-amber-50/40 rounded-2xl p-6 border border-amber-100/50 shadow-sm">
                            <h3 className="text-sm font-bold text-amber-900 uppercase tracking-widest flex items-center gap-2 mb-4">
                                <AlertTriangle className="w-4 h-4" />
                                Attention Needed
                            </h3>
                            <div className="space-y-3">
                                {dynamicAlerts.map((alert) => (
                                    <div key={alert.id} className="p-3 rounded-xl bg-white border border-amber-100 shadow-sm">
                                        <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                                        <p className="text-xs text-slate-500 mt-1 mb-2">{alert.message}</p>
                                        <Link href={alert.href} className="text-xs font-bold text-amber-600 hover:text-amber-700 uppercase tracking-wide">
                                            {alert.action} →
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Staff Present */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-soft">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-900">Staff On Duty</h3>
                            <div className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">
                                {staffOnDuty.length} Active
                            </div>
                        </div>

                        <div className="space-y-4">
                            {staffOnDuty.length > 0 ? (
                                staffOnDuty.map((emp) => (
                                    <div key={emp.id} className="flex items-center gap-4 bg-slate-50/50 p-2 rounded-xl border border-transparent hover:border-slate-100 transition-all">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-sm font-bold text-blue-700 shadow-sm">
                                            {emp.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-900 truncate">{emp.name}</p>
                                            <p className="text-xs text-slate-500 font-medium">{emp.role}</p>
                                        </div>
                                        <div className="text-xs font-mono font-medium text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm">
                                            {emp.timeIn}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <p>No active staff</p>
                                </div>
                            )}
                        </div>
                        <Link href="/staff" className="block mt-6 text-center text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors">
                            Manage Staff Schedule
                        </Link>
                    </div>

                    {/* Recent Orders */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-soft">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-900">Recent Orders</h3>
                            <Link href="/inventory?tab=orders" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <ArrowUpRight className="w-4 h-4 text-slate-400" />
                            </Link>
                        </div>

                        <div className="space-y-4">
                            {recentOrdersList.length > 0 ? (
                                recentOrdersList.map((order) => (
                                    <div key={order.id} className="group flex items-start justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-bold text-slate-900">{order.product}</span>
                                                <span className="text-xs text-slate-400">• {order.liters.toLocaleString()}L</span>
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium">{order.supplier}</p>
                                        </div>
                                        <div className="text-right">
                                            <OrderStatusBadge status={order.status} />
                                            <p className="text-[10px] text-slate-400 font-medium mt-1.5">{order.time}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <p>No recent orders</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
