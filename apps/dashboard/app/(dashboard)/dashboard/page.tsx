"use client";

import React from "react";
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
} from "lucide-react";
import {
    LineChart,
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

// --- Mock Data ---

const METRICS = [
    {
        title: "Today's Stock",
        value: "91,200 L",
        subtext: "Across all tanks",
        icon: Droplets,
        trend: "+2.5%",
        trendUp: true,
        href: "/inventory",
    },
    {
        title: "Today's Sales",
        value: "LKR 1,845,000",
        subtext: "Day: 1.2M • Night: 645K",
        icon: Banknote,
        trend: "+12%",
        trendUp: true,
        href: "/sales",
    },
    {
        title: "Pending Orders",
        value: "2 Orders",
        subtext: "19,800 L total",
        icon: ShoppingCart,
        trend: null,
        trendUp: false,
        href: "/orders",
    },
    {
        title: "Staff On Duty",
        value: "8 Active",
        subtext: "Day Shift",
        icon: Users,
        trend: "Full Strength",
        trendUp: true,
        href: "/staff",
    },
];

const WEEKLY_SALES_DATA = [
    { day: "Mon", dayShift: 650000, nightShift: 420000 },
    { day: "Tue", dayShift: 580000, nightShift: 380000 },
    { day: "Wed", dayShift: 720000, nightShift: 510000 },
    { day: "Thu", dayShift: 690000, nightShift: 480000 },
    { day: "Fri", dayShift: 850000, nightShift: 620000 },
    { day: "Sat", dayShift: 920000, nightShift: 750000 },
    { day: "Sun", dayShift: 780000, nightShift: 550000 },
];

const STOCK_DATA = [
    { product: "LP92", fullName: "Petrol 92", liter: 14200, capacity: 27276, percent: 52.1, gradient: "from-amber-400 to-orange-500" },
    { product: "LP95", fullName: "Petrol 95", liter: 9100, capacity: 13638, percent: 66.7, gradient: "from-rose-500 to-pink-600" },
    { product: "LAD", fullName: "Auto Diesel", liter: 58500, capacity: 90922, percent: 64.3, gradient: "from-sky-500 to-blue-600" },
    { product: "LSD", fullName: "Super Diesel", liter: 8800, capacity: 13638, percent: 64.5, gradient: "from-slate-400 to-slate-600" },
];

const EMPLOYEES = [
    { id: "E001", name: "Kamal Perera", role: "Pumper", timeIn: "06:00 AM", status: "active" },
    { id: "E002", name: "Saman Kumara", role: "Pumper", timeIn: "06:15 AM", status: "active" },
    { id: "E003", name: "Nimal Silva", role: "Supervisor", timeIn: "05:45 AM", status: "active" },
    { id: "E004", name: "Chathura De Silva", role: "Cashier", timeIn: "06:00 AM", status: "active" },
];

const RECENT_ORDERS = [
    { id: "ORD-001", product: "LAD", liters: 13200, status: "Pending", time: "Today, 10:30 AM", supplier: "CPC" },
    { id: "ORD-002", product: "LP92", liters: 6600, status: "Pending", time: "Today, 08:15 AM", supplier: "CPC" },
    { id: "ORD-003", product: "LSD", liters: 3300, status: "Delivered", time: "Yesterday", supplier: "CPC" },
];

const ALERTS = [
    { id: 1, type: "warning", title: "Discrepancy Detected", message: "Tank LP92-1: Dip sale 50L less than Meter sale", action: "Review", href: "/inventory" },
    { id: 2, type: "info", title: "Low Stock Alert", message: "LP92 below 55% capacity", action: "Order Now", href: "/orders" },
];

// Last shift summary (most recent completed shift)
const LAST_SHIFT = {
    type: "Night" as "Day" | "Night",
    date: "2025-12-20",
    totalSales: 645000,
    totalLiters: 1720,
    cashCollected: 480000,
    cardSales: 120000,
    creditSales: 45000,
    discrepancy: -1200,
};

// --- Components ---

function MetricCard({ item }: { item: typeof METRICS[0] }) {
    const Icon = item.icon;
    return (
        <Link href={item.href}>
            <Card className="hover:shadow-md transition-all hover:border-primary/50 cursor-pointer h-full">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-lg bg-muted">
                            <Icon className="w-6 h-6 text-muted-foreground" />
                        </div>
                        {item.trend && (
                            <Badge variant="outline" className={item.trendUp ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800" : "bg-muted text-muted-foreground"}>
                                {item.trendUp && <ArrowUpRight className="w-3 h-3 mr-1" />}
                                {item.trend}
                            </Badge>
                        )}
                    </div>
                    <div>
                        <p className="text-muted-foreground text-sm font-medium mb-1">{item.title}</p>
                        <p className="text-2xl font-bold text-foreground">{item.value}</p>
                        <p className="text-sm mt-1 text-muted-foreground">{item.subtext}</p>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

function StockProgressBar({ item }: { item: typeof STOCK_DATA[0] }) {
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
        Pending: { icon: Clock, className: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800" },
        Delivered: { icon: CheckCircle2, className: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800" },
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
    return (
        <div className="flex flex-col gap-6 p-6 bg-background min-h-screen">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
                    <p className="text-muted-foreground">Overview of your station's performance today.</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card px-4 py-2 rounded-lg border shadow-sm">
                    <Clock className="w-4 h-4" />
                    <span>Last updated: just now</span>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {METRICS.map((item, i) => (
                    <MetricCard key={i} item={item} />
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column (2/3) */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Last Shift Summary */}
                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    {LAST_SHIFT.type === "Day" ? <Sun className="w-5 h-5 text-orange-500" /> : <Moon className="w-5 h-5 text-indigo-500" />}
                                    Last Shift Summary
                                </CardTitle>
                                <Badge variant="outline">{LAST_SHIFT.type} Shift - {LAST_SHIFT.date}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="text-center p-3 rounded-lg bg-muted/50">
                                    <p className="text-xs text-muted-foreground mb-1">Total Sales</p>
                                    <p className="text-lg font-bold">LKR {LAST_SHIFT.totalSales.toLocaleString()}</p>
                                </div>
                                <div className="text-center p-3 rounded-lg bg-muted/50">
                                    <p className="text-xs text-muted-foreground mb-1">Liters Sold</p>
                                    <p className="text-lg font-bold">{LAST_SHIFT.totalLiters.toLocaleString()} L</p>
                                </div>
                                <div className="text-center p-3 rounded-lg bg-muted/50">
                                    <p className="text-xs text-muted-foreground mb-1">Cash</p>
                                    <p className="text-lg font-bold text-emerald-600">LKR {LAST_SHIFT.cashCollected.toLocaleString()}</p>
                                </div>
                                <div className="text-center p-3 rounded-lg bg-muted/50">
                                    <p className="text-xs text-muted-foreground mb-1">Card + Credit</p>
                                    <p className="text-lg font-bold text-blue-600">LKR {(LAST_SHIFT.cardSales + LAST_SHIFT.creditSales).toLocaleString()}</p>
                                </div>
                                <div className={`text-center p-3 rounded-lg ${LAST_SHIFT.discrepancy < 0 ? "bg-red-50 dark:bg-red-950/20" : "bg-emerald-50 dark:bg-emerald-950/20"}`}>
                                    <p className="text-xs text-muted-foreground mb-1">Discrepancy</p>
                                    <p className={`text-lg font-bold ${LAST_SHIFT.discrepancy < 0 ? "text-red-600" : "text-emerald-600"}`}>
                                        {LAST_SHIFT.discrepancy < 0 ? <ArrowDownRight className="w-4 h-4 inline mr-1" /> : <ArrowUpRight className="w-4 h-4 inline mr-1" />}
                                        LKR {Math.abs(LAST_SHIFT.discrepancy).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sales Chart */}
                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-muted-foreground" />
                                    Weekly Sales Trend
                                </CardTitle>
                            </div>
                            <CardDescription>Day vs Night shift comparison</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={WEEKLY_SALES_DATA}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                                        <XAxis dataKey="day" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`} />
                                        <Tooltip
                                            formatter={(value: number) => [`LKR ${value.toLocaleString()}`, '']}
                                            contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)' }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: 12 }} />
                                        <Bar dataKey="dayShift" name="Day Shift" fill="#f97316" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="nightShift" name="Night Shift" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stock Levels */}
                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Truck className="w-5 h-5 text-muted-foreground" />
                                    Current Stock Levels
                                </CardTitle>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href="/inventory">View Details →</Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {STOCK_DATA.map((item, i) => (
                                <StockProgressBar key={i} item={item} />
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column (1/3) */}
                <div className="space-y-6">

                    {/* Alerts */}
                    {ALERTS.length > 0 && (
                        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2 text-amber-900 dark:text-amber-200">
                                    <AlertTriangle className="w-5 h-5" />
                                    Alerts ({ALERTS.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {ALERTS.map((alert) => (
                                    <div key={alert.id} className="p-3 rounded-lg bg-white dark:bg-background border border-amber-100 dark:border-amber-900/50">
                                        <p className="text-sm font-medium text-foreground">{alert.title}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                                        <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" asChild>
                                            <Link href={alert.href}>{alert.action}</Link>
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Staff Present */}
                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Staff Present</CardTitle>
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                                    <Sun className="w-3 h-3 mr-1" />
                                    Day Shift
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {EMPLOYEES.map((emp) => (
                                    <div key={emp.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                            {emp.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{emp.name}</p>
                                            <p className="text-xs text-muted-foreground">{emp.role}</p>
                                        </div>
                                        <span className="text-xs text-muted-foreground font-mono">{emp.timeIn}</span>
                                    </div>
                                ))}
                            </div>
                            <Button variant="ghost" size="sm" className="w-full mt-3" asChild>
                                <Link href="/staff">Manage Staff →</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Recent Orders */}
                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Recent Orders</CardTitle>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href="/inventory?tab=orders">View All</Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {RECENT_ORDERS.map((order) => (
                                    <div key={order.id} className="flex flex-col gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm font-medium">{order.product}</p>
                                                <p className="text-xs text-muted-foreground">{order.liters.toLocaleString()} L • {order.supplier}</p>
                                            </div>
                                            <OrderStatusBadge status={order.status} />
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                                            <span>{order.id}</span>
                                            <span>{order.time}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
