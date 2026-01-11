"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Home,
    Banknote,
    Droplets,
    ShoppingCart,
    Landmark,
    Users,
    UserCog,
    Shield,
    LogOut,
    Fuel,
    ChartGantt,
    ChartBarIncreasing,
    ChartBarIncreasingIcon,
    ChartBarIcon,
    ChartColumnIncreasing,
    Settings,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const NAV_ITEMS = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Sales", href: "/sales", icon: Banknote },
    { name: "Inventory", href: "/inventory", icon: Droplets },
    // { name: "Orders", href: "/orders", icon: ShoppingCart },
    // { name: "Deposits", href: "/deposits", icon: Landmark },
    { name: "Accounts", href: "/accounts", icon: ChartColumnIncreasing },
    { name: "Staff", href: "/staff", icon: UserCog },
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "Admin Panel", href: "/admin", icon: Shield },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, signOut, isLoading } = useAuth();

    const handleLogout = async () => {
        await signOut();
        router.push('/login');
    };

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-black text-white hidden md:flex flex-col border-r border-slate-800">
            {/* Brand / Logo */}
            <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800">
                <div className="bg-black p-1.5 rounded-lg">
                    <Fuel className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight">SAMI</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                ? "bg-red-900 text-white"
                                : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-400"}`} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* User / Logout */}
            <div className="p-4 border-t border-slate-800 space-y-4">
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    Logout
                </button>
                <div className="mt-4 px-3">
                    <p className="text-xs text-slate-500">Logged in as</p>
                    <p className="text-sm font-medium text-slate-300">{user?.email || 'Owner Account'}</p>
                </div>
            </div>
        </aside>
    );
}
