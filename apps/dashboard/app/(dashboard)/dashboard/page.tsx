"use client";

import React from "react";
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
} from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

// --- Mock Data ---

const METRICS = [
    {
        title: "Today's Stock",
        value: "45,200 L",
        subtext: "Across all tanks",
        icon: Droplets,
        trend: "+2.5%",
        trendUp: true,
    },
    {
        title: "Last Shift Sales",
        value: "LKR 845,000",
        subtext: "3,200 Liters sold",
        icon: Banknote,
        trend: "+12%",
        trendUp: true,
    },
    {
        title: "Pending Orders",
        value: "2 Orders",
        subtext: "1 LAD and 1 LP92",
        icon: AlertTriangle,
        alert: true,
    },
    {
        title: "Staff On Duty",
        value: "8 Active",
        subtext: "Day Shift",
        icon: Users,
        trend: "Full Strength",
        trendUp: true,
    },
];

const SALES_DATA = [
    { day: "Mon", sales: 4000 },
    { day: "Tue", sales: 3000 },
    { day: "Wed", sales: 2000 },
    { day: "Thu", sales: 2780 },
    { day: "Fri", sales: 1890 },
    { day: "Sat", sales: 2390 },
    { day: "Sun", sales: 3490 },
];

const STOCK_DATA = [
    { product: "Petrol 92", liter: 12500, capacity: 20000, percent: 62.5, color: "bg-emerald-500" },
    { product: "Petrol 95", liter: 4200, capacity: 10000, percent: 42.0, color: "bg-blue-500" },
    { product: "Diesel", liter: 18000, capacity: 30000, percent: 60.0, color: "bg-amber-500" },
    { product: "Super Diesel", liter: 2500, capacity: 8000, percent: 31.2, color: "bg-red-500" },
];

const EMPLOYEES = [
    { name: "Kamal Perera", role: "Pumper", timeIn: "06:00 AM" },
    { name: "Saman Kumara", role: "Pumper", timeIn: "06:15 AM" },
    { name: "Nimal Silva", role: "Supervisor", timeIn: "05:45 AM" },
    { name: "Chathura De Silva", role: "Cashier", timeIn: "06:00 AM" },
];

const RECENT_ORDERS = [
    { id: "ORD-001", product: "Petrol 92", liters: 6600, status: "Pending", time: "10:30 AM" },
    { id: "ORD-002", product: "Diesel", liters: 13200, status: "Delivered", time: "Yesterday" },
    { id: "ORD-003", product: "Super Diesel", liters: 3300, status: "Cancelled", time: "Yesterday" },
];

// --- Components ---

function MetricCard({ item }: { item: typeof METRICS[0] }) {
    const Icon = item.icon;
    return (
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg ${item.alert ? "bg-red-50 text-red-600 dark:bg-red-900/20" : "bg-muted text-foreground"}`}>
                    <Icon className="w-6 h-6" />
                </div>
                {item.trend && (
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${item.trendUp ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                        {item.trend}
                    </span>
                )}
            </div>
            <div>
                <h3 className="text-muted-foreground text-sm font-medium mb-1">{item.title}</h3>
                <p className="text-2xl font-bold text-foreground">{item.value}</p>
                <p className={`text-sm mt-1 ${item.alert ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                    {item.subtext}
                </p>
            </div>
        </div>
    );
}

function StockBar({ item }: { item: typeof STOCK_DATA[0] }) {
    return (
        <div className="mb-4 last:mb-0">
            <div className="flex justify-between items-end mb-1">
                <span className="text-sm font-medium text-foreground">{item.product}</span>
                <span className="text-xs text-muted-foreground">{item.liter.toLocaleString()} L / {item.percent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                    className={`h-2.5 rounded-full ${item.color}`}
                    style={{ width: `${item.percent}%` }}
                ></div>
            </div>
        </div>
    );
}

function OrderStatus({ status }: { status: string }) {
    const styles = {
        Pending: "bg-amber-50 text-amber-600 border-amber-100",
        Delivered: "bg-emerald-50 text-emerald-600 border-emerald-100",
        Cancelled: "bg-slate-50 text-slate-500 border-slate-100",
    };
    const Icons = {
        Pending: Clock,
        Delivered: CheckCircle2,
        Cancelled: XCircle,
    };

    const Style = styles[status as keyof typeof styles] || styles.Cancelled;
    const Icon = Icons[status as keyof typeof Icons] || AlertCircle;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${Style}`}>
            <Icon className="w-3.5 h-3.5" />
            {status}
        </span>
    );
}

export default function DashboardPage() {
    return (
        <div className="bg-background p-6 max-w-7xl mx-auto space-y-6 min-h-screen">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Overview of your station's performance today.</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card px-4 py-2 rounded-lg border border-border shadow-sm">
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

            {/* Main Content Info Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Col: Sales Chart & Stock (2/3 width) */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Sales Chart */}
                    <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-muted-foreground" />
                                Weekly Sales
                            </h2>
                            <select className="text-sm border-input rounded-md text-muted-foreground bg-background focus:ring-ring">
                                <option>Last 7 Days</option>
                                <option>Last 30 Days</option>
                            </select>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={SALES_DATA}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis
                                        dataKey="day"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                                        tickFormatter={(value) => `${value}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="sales"
                                        stroke="var(--primary)"
                                        strokeWidth={3}
                                        dot={{ fill: 'var(--primary)', strokeWidth: 2, r: 4, stroke: 'var(--background)' }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Current Stock Table */}
                    <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                            <Truck className="w-5 h-5 text-muted-foreground" />
                            Current Stock Levels
                        </h2>
                        <div className="space-y-5">
                            {STOCK_DATA.map((item, i) => (
                                <StockBar key={i} item={item} />
                            ))}
                        </div>
                        <div className="mt-6 pt-4 border-t border-border text-center">
                            <button className="text-sm text-primary font-medium hover:text-primary/80">View Detailed Inventory &rarr;</button>
                        </div>
                    </div>

                </div>

                {/* Right Col: Active Alerts, Employees, Orders (1/3 width) */}
                <div className="lg:col-span-1 space-y-6">

                    {/* Alerts - Only show if urgent */}
                    <div className="bg-amber-50 dark:bg-amber-950/20 p-6 rounded-xl border border-amber-100 dark:border-amber-900/50">
                        <h3 className="text-amber-900 dark:text-amber-200 font-bold flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-5 h-5" />
                            Attention Needed
                        </h3>
                        <p className="text-amber-700 dark:text-amber-300 text-sm mb-3">
                            Discrepancy detected in Tank 2 (Petrol 92). Dip sale is 50L less than Meter sale.
                        </p>
                        <button className="text-xs font-semibold bg-white dark:bg-amber-900/50 text-amber-700 dark:text-amber-200 px-3 py-2 rounded-md border border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/30 shadow-sm">
                            Review Discrepancy
                        </button>
                    </div>

                    {/* Employees */}
                    <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-foreground">Staff Present</h2>
                            <span className="text-xs font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 px-2.5 py-1 rounded-full">Day Shift</span>
                        </div>
                        <div className="space-y-4">
                            {EMPLOYEES.map((emp, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                                        {emp.name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-foreground">{emp.name}</p>
                                        <p className="text-xs text-muted-foreground">{emp.role}</p>
                                    </div>
                                    <span className="text-xs text-muted-foreground font-mono">{emp.timeIn}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Orders */}
                    <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-foreground">Recent Orders</h2>
                        </div>
                        <div className="space-y-4">
                            {RECENT_ORDERS.map((order, i) => (
                                <div key={i} className="flex flex-col gap-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{order.product}</p>
                                            <p className="text-xs text-muted-foreground">{order.liters.toLocaleString()} L</p>
                                        </div>
                                        <OrderStatus status={order.status} />
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                                        <span>{order.id}</span>
                                        <span>{order.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-4 text-sm text-center text-muted-foreground hover:text-foreground font-medium border-t border-border pt-3">
                            View All Orders
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
