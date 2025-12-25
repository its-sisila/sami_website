import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Switched to Inter as it's standard and nice
import "./globals.css";
import { Sidebar } from "../components/ui/Sidebar";
import { ThemeProvider } from "@/components/theme-provider";

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased h-screen flex overflow-hidden bg-background`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          disableTransitionOnChange
        >
          {/* Sidebar - Desktop Only for now */}
          <Sidebar />

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col h-screen overflow-hidden relative md:ml-64 transition-all duration-300">
            {/* Mobile Header Placeholder (if needed later) could go here */}
            <div className="flex-1 overflow-y-auto p-0">
              {children}
            </div>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
