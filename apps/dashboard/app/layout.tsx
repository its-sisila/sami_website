import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Switched to Inter as it's standard and nice
import "./globals.css";
import { AppShell } from "../components/layout/AppShell";
import { AuthProvider } from "@/contexts/AuthContext";
import { AlertSettingsProvider } from "@/lib/contexts/alert-settings";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SAMI | Fuel Station Management",
  description: "Shed AI Manager Interface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className={`${inter.className} antialiased h-screen flex overflow-hidden bg-background`} suppressHydrationWarning>
        <AuthProvider>
          <AlertSettingsProvider>
            <AppShell>
              {children}
            </AppShell>
          </AlertSettingsProvider>
        </AuthProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
