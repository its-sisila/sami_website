"use client";

import React, { useState } from "react";
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
    Menu,
    X,
    Calculator,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentUser } from "@/lib/hooks";

const NAV_ITEMS = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Sales", href: "/sales", icon: Banknote },
    { name: "Inventory", href: "/inventory", icon: Droplets },
    // { name: "Orders", href: "/orders", icon: ShoppingCart },
    // { name: "Deposits", href: "/deposits", icon: Landmark },
    { name: "Accounts", href: "/accounts", icon: ChartColumnIncreasing },
    { name: "Staff", href: "/staff", icon: UserCog },
    { name: "Price Formula", href: "/pricing", icon: Calculator },
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "Admin Panel", href: "/admin", icon: Shield, requiresRole: 'system_admin' },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, signOut, isLoading } = useAuth();
    const { data: currentUser } = useCurrentUser();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Filter navigation items based on user role
    const visibleNavItems = NAV_ITEMS.filter(item =>
        !item.requiresRole || currentUser?.role === item.requiresRole
    );

    const handleLogout = async () => {
        await signOut();
        router.push('/login');
    };

    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    const SidebarContent = () => (
        <>
            {/* Brand / Logo */}
            <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800">
                <div className="bg-black p-1.5 rounded-lg">
                    <Fuel className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight">SAMI</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                {visibleNavItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={closeMobileMenu}
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
                    <p className="text-sm font-medium text-slate-300 truncate">{user?.email || 'Owner Account'}</p>
                </div>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Header Bar */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-black text-white flex items-center justify-between px-4 border-b border-slate-800">
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
                    aria-label="Toggle menu"
                >
                    {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
                <div className="flex items-center gap-2">
                    <Fuel className="w-5 h-5 text-white" />
                    <span className="text-lg font-bold">SAMI</span>
                </div>
            </div>

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                    onClick={closeMobileMenu}
                />
            )}

            {/* Mobile Slide-out Sidebar */}
            <aside
                className={`md:hidden fixed left-0 top-14 z-50 h-[calc(100vh-3.5rem)] w-64 bg-black text-white flex flex-col border-r border-slate-800 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <SidebarContent />
            </aside>

            {/* Desktop Sidebar */}
            <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-black text-white hidden md:flex flex-col border-r border-slate-800">
                <SidebarContent />
            </aside>
        </>
    );
}

