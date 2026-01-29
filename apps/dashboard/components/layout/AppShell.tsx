'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '../ui/Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    // Check if we are on the login page
    const isLoginPage = pathname === '/login';

    if (isLoginPage) {
        return (
            <main className="flex-1 flex flex-col h-screen relative overflow-hidden">
                <div className="flex-1 overflow-y-auto p-0">
                    {children}
                </div>
            </main>
        );
    }

    return (
        <>
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative md:ml-64 transition-all duration-300">
                {/* Mobile Header Spacer */}
                <div className="md:hidden h-14 flex-shrink-0" />

                <div className="flex-1 overflow-y-auto p-0">
                    {children}
                </div>
            </main>
        </>
    );
}
