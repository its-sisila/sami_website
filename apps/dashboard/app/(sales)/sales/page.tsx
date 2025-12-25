"use client";

import { useState, useMemo } from "react";
import { Calendar as CalendarIcon, Sun, Moon, AlertTriangle, CheckCircle } from "lucide-react";

// Mock Data Interfaces
interface Nozzle {
    id: string;
    pumpName: string; // e.g., "Pump 1"
    productName: string; // e.g., "Diesel", "Petrol 92"
    productPrice: number;
    startMeter: number;
    endMeterDigital: number;
    endMeterAnalog: number;
    pumperId?: string; // New field for assigned pumper
    isSubmitted?: boolean; // Track if entry is locked
    cardEntries: { id: string; terminalId: string; batchNumber: string; settlementDateTime: string; amount: string }[]; // Card sales for this nozzle
    creditEntries: { id: string; companyId: string; poNumber: string; vehicleNumber: string; liters: string; amount: string }[]; // Credit sales for this nozzle
}

interface Pumper {
    id: string;
    name: string;
    nic: string;
}

// Mock Pumpers
const PUMPERS: Pumper[] = [
    { id: "p1", name: "Kamal Perera", nic: "197234567890" },
    { id: "p2", name: "Sunil Silva", nic: "198345678901" },
    { id: "p3", name: "Jayantha Bandara", nic: "199456789012" },
    { id: "p4", name: "Nimali Fernando", nic: "198567890123" },
    { id: "p5", name: "David Silva", nic: "199678901234" },
    { id: "p6", name: "JJ Bandara", nic: "197789012345" },
    { id: "p7", name: "Gee Fernando", nic: "198890123456" },
];

interface Terminal {
    id: string;
    label: string;
}

const TERMINALS: Terminal[] = [
    { id: "ID-1", label: "VISA/MASTER ID-11345671" },
    { id: "ID-2", label: "VISA/MASTER ID-12345672" },
    { id: "ID-3", label: "VISA/MASTER ID-13345673" },
    { id: "ID-4", label: "AMEX ID-14345674" },
];

// Mock Data
const INITIAL_NOZZLES: Nozzle[] = [
    { id: "n1", pumpName: "LP95 - 01", productName: "Petrol 95", productPrice: 420, startMeter: 14500.5, endMeterDigital: 0, endMeterAnalog: 0, isSubmitted: false, cardEntries: [], creditEntries: [] },
    { id: "n2", pumpName: "LSD - 01", productName: "Super Diesel", productPrice: 380, startMeter: 8900.0, endMeterDigital: 0, endMeterAnalog: 0, isSubmitted: false, cardEntries: [], creditEntries: [] },
    { id: "n3", pumpName: "LP92 - 01", productName: "Petrol 92", productPrice: 370, startMeter: 23100.2, endMeterDigital: 0, endMeterAnalog: 0, isSubmitted: false, cardEntries: [], creditEntries: [] },
    { id: "n4", pumpName: "LP92 - 02", productName: "Petrol 92", productPrice: 370, startMeter: 23250.0, endMeterDigital: 0, endMeterAnalog: 0, isSubmitted: false, cardEntries: [], creditEntries: [] },
    { id: "n5", pumpName: "LP92 - 03", productName: "Petrol 92", productPrice: 370, startMeter: 23400.8, endMeterDigital: 0, endMeterAnalog: 0, isSubmitted: false, cardEntries: [], creditEntries: [] },
    { id: "n6", pumpName: "LP92 - 04", productName: "Petrol 92", productPrice: 370, startMeter: 23550.1, endMeterDigital: 0, endMeterAnalog: 0, isSubmitted: false, cardEntries: [], creditEntries: [] },
    { id: "n7", pumpName: "LP92 - 05", productName: "Petrol 92", productPrice: 370, startMeter: 23700.3, endMeterDigital: 0, endMeterAnalog: 0, isSubmitted: false, cardEntries: [], creditEntries: [] },
    { id: "n8", pumpName: "LP92 - 06", productName: "Petrol 92", productPrice: 370, startMeter: 23850.6, endMeterDigital: 0, endMeterAnalog: 0, isSubmitted: false, cardEntries: [], creditEntries: [] },
    { id: "n9", pumpName: "LAD - 01", productName: "Auto Diesel", productPrice: 340, startMeter: 45000.0, endMeterDigital: 0, endMeterAnalog: 0, isSubmitted: false, cardEntries: [], creditEntries: [] },
    { id: "n10", pumpName: "LAD - 02", productName: "Auto Diesel", productPrice: 340, startMeter: 45200.5, endMeterDigital: 0, endMeterAnalog: 0, isSubmitted: false, cardEntries: [], creditEntries: [] },
    { id: "n11", pumpName: "LAD - 03", productName: "Auto Diesel", productPrice: 340, startMeter: 45400.2, endMeterDigital: 0, endMeterAnalog: 0, isSubmitted: false, cardEntries: [], creditEntries: [] },
    { id: "n12", pumpName: "LAD - 04", productName: "Auto Diesel", productPrice: 340, startMeter: 45600.8, endMeterDigital: 0, endMeterAnalog: 0, isSubmitted: false, cardEntries: [], creditEntries: [] },
    { id: "n13", pumpName: "LAD - 05", productName: "Auto Diesel", productPrice: 340, startMeter: 45800.1, endMeterDigital: 0, endMeterAnalog: 0, isSubmitted: false, cardEntries: [], creditEntries: [] },
    { id: "n14", pumpName: "LAD - 06", productName: "Auto Diesel", productPrice: 340, startMeter: 46000.3, endMeterDigital: 0, endMeterAnalog: 0, isSubmitted: false, cardEntries: [], creditEntries: [] },
    { id: "n15", pumpName: "LAD - 07", productName: "Auto Diesel", productPrice: 340, startMeter: 46200.6, endMeterDigital: 0, endMeterAnalog: 0, isSubmitted: false, cardEntries: [], creditEntries: [] },
    { id: "n16", pumpName: "LAD - 08", productName: "Auto Diesel", productPrice: 340, startMeter: 46400.9, endMeterDigital: 0, endMeterAnalog: 0, isSubmitted: false, cardEntries: [], creditEntries: [] },
];

interface Company {
    id: string;
    name: string;
}

const COMPANIES: Company[] = [
    { id: "C001", name: "Telecom 123456789" },
    { id: "C002", name: "Telecom 987654321" },
    { id: "C003", name: "Telecom 135791113" },
    { id: "C004", name: "Telecom 246802468" },
];

const EXPENSE_CATEGORIES = ["Transport", "Bowser", "Bills", "Utilities", "Refreshments", "Maintenance", "Office Supplies", "Other"];

// Category to Payee mapping
const CATEGORY_PAYEES: Record<string, string[]> = {
    "Transport": ["Threewheeler", "Bike", "Other"],
    "Bowser": ["Bowser Highway", "Bowser Repair", "Other"],
    "Bills": ["Dialog", "SLT", "Credit Card Payment", "Chairman Vehicle Fuel", "Other"],
    "Utilities": ["CEB", "LECO", "Water Board", "Tax", "Lease", "Generator Fuel", "Other"],
    "Refreshments": ["Soft Drinks", "Lunch", "Snacks", "Bottled Water", "Other"],
    "Maintenance": ["Electrician", "Plumber", "AC Technician", "Pump Technician", "General Repair", "Other"],
    "Office Supplies": ["Stationery", "Printing", "Computer Accessories", "Cleaning Supplies", "Other"],
    "Other": ["Other"],
};

export default function SalesPage() {
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [shift, setShift] = useState<"Day" | "Night">("Day");
    const [nozzles, setNozzles] = useState<Nozzle[]>(INITIAL_NOZZLES);

    // Payment State
    const [cashCollected, setCashCollected] = useState<string>("");

    // Global Card Sales (General)
    const [cardEntries, setCardEntries] = useState<{ id: string; terminalId: string; amount: string }[]>([
        { id: "c1", terminalId: "", amount: "" }
    ]);
    // Detailed Company Credit State
    const [creditEntries, setCreditEntries] = useState<{ id: string; companyId: string; poNumber: string; vehicleNumber: string; amount: string }[]>([
        { id: "cr1", companyId: "", poNumber: "", vehicleNumber: "", amount: "" }
    ]);
    // Staff Advances State
    const [advanceEntries, setAdvanceEntries] = useState<{ id: string; pumperId: string; dateTime: string; amount: string; reason: string }[]>([
        { id: "adv1", pumperId: "", dateTime: new Date().toISOString().slice(0, 16), amount: "", reason: "" }
    ]);
    // Company Expenses State
    const [expenseEntries, setExpenseEntries] = useState<{ id: string; category: string; description: string; payee: string; invoiceNumber: string; amount: string }[]>([
        { id: "exp1", category: "Other", description: "", payee: "", invoiceNumber: "", amount: "" }
    ]);

    // Handler for updating nozzle meters
    const handleNozzleChange = (id: string, field: keyof Nozzle, value: string | number) => {
        setNozzles((prev) =>
            prev.map((n) => {
                if (n.id === id) {
                    return { ...n, [field]: value };
                }
                return n;
            })
        );
    };

    // Toggle Submit State
    const handleNozzleSubmit = (id: string) => {
        setNozzles((prev) =>
            prev.map((n) => {
                if (n.id === id) {
                    return { ...n, isSubmitted: !n.isSubmitted };
                }
                return n;
            })
        );
    };

    // Nozzle Card Entry Handlers
    const addNozzleCardEntry = (nozzleId: string) => {
        setNozzles(prev => prev.map(n => {
            if (n.id === nozzleId) {
                return { ...n, cardEntries: [...n.cardEntries, { id: Math.random().toString(36).substr(2, 9), terminalId: "", batchNumber: "", settlementDateTime: new Date().toISOString().slice(0, 16), amount: "" }] };
            }
            return n;
        }));
    };

    const removeNozzleCardEntry = (nozzleId: string, cardId: string) => {
        setNozzles(prev => prev.map(n => {
            if (n.id === nozzleId) {
                return { ...n, cardEntries: n.cardEntries.filter(c => c.id !== cardId) };
            }
            return n;
        }));
    };

    const updateNozzleCardEntry = (nozzleId: string, cardId: string, field: "terminalId" | "batchNumber" | "settlementDateTime" | "amount", value: string) => {
        setNozzles(prev => prev.map(n => {
            if (n.id === nozzleId) {
                return {
                    ...n, cardEntries: n.cardEntries.map(c =>
                        c.id === cardId ? { ...c, [field]: value } : c
                    )
                };
            }
            return n;
        }));
    };

    // Nozzle Credit Entry Handlers
    const addNozzleCreditEntry = (nozzleId: string) => {
        setNozzles(prev => prev.map(n => {
            if (n.id === nozzleId) {
                return { ...n, creditEntries: [...n.creditEntries, { id: Math.random().toString(36).substr(2, 9), companyId: "", poNumber: "", vehicleNumber: "", liters: "", amount: "" }] };
            }
            return n;
        }));
    };

    const removeNozzleCreditEntry = (nozzleId: string, creditId: string) => {
        setNozzles(prev => prev.map(n => {
            if (n.id === nozzleId) {
                return { ...n, creditEntries: n.creditEntries.filter(c => c.id !== creditId) };
            }
            return n;
        }));
    };

    const updateNozzleCreditEntry = (nozzleId: string, creditId: string, field: "companyId" | "poNumber" | "vehicleNumber" | "liters" | "amount", value: string) => {
        setNozzles(prev => prev.map(n => {
            if (n.id === nozzleId) {
                return {
                    ...n, creditEntries: n.creditEntries.map(c =>
                        c.id === creditId ? { ...c, [field]: value } : c
                    )
                };
            }
            return n;
        }));
    };

    // Card Entry Handlers
    const addCardEntry = () => {
        setCardEntries(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), terminalId: "", amount: "" }]);
    };

    const removeCardEntry = (id: string) => {
        if (cardEntries.length > 1) {
            setCardEntries(prev => prev.filter(e => e.id !== id));
        } else {
            setCardEntries([{ id: "c1", terminalId: "", amount: "" }]);
        }
    };

    const updateCardEntry = (id: string, field: "terminalId" | "amount", value: string) => {
        setCardEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    };

    // Credit Entry Handlers
    const addCreditEntry = () => {
        setCreditEntries(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), companyId: "", poNumber: "", vehicleNumber: "", amount: "" }]);
    };

    const removeCreditEntry = (id: string) => {
        if (creditEntries.length > 1) {
            setCreditEntries(prev => prev.filter(e => e.id !== id));
        } else {
            setCreditEntries([{ id: "cr1", companyId: "", poNumber: "", vehicleNumber: "", amount: "" }]);
        }
    };

    const updateCreditEntry = (id: string, field: "companyId" | "poNumber" | "vehicleNumber" | "amount", value: string) => {
        setCreditEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    };

    // Advance Entry Handlers
    const addAdvanceEntry = () => {
        setAdvanceEntries(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), pumperId: "", dateTime: new Date().toISOString().slice(0, 16), amount: "", reason: "" }]);
    };

    const removeAdvanceEntry = (id: string) => {
        if (advanceEntries.length > 1) {
            setAdvanceEntries(prev => prev.filter(e => e.id !== id));
        } else {
            setAdvanceEntries([{ id: "adv1", pumperId: "", dateTime: new Date().toISOString().slice(0, 16), amount: "", reason: "" }]);
        }
    };

    const updateAdvanceEntry = (id: string, field: "pumperId" | "dateTime" | "amount" | "reason", value: string) => {
        setAdvanceEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    };

    // Expense Entry Handlers
    const addExpenseEntry = () => {
        setExpenseEntries(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), category: "Other", description: "", payee: "", invoiceNumber: "", amount: "" }]);
    };

    const removeExpenseEntry = (id: string) => {
        if (expenseEntries.length > 1) {
            setExpenseEntries(prev => prev.filter(e => e.id !== id));
        } else {
            setExpenseEntries([{ id: "exp1", category: "Other", description: "", payee: "", invoiceNumber: "", amount: "" }]);
        }
    };

    const updateExpenseEntry = (id: string, field: "category" | "description" | "payee" | "invoiceNumber" | "amount", value: string) => {
        setExpenseEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    };

    // Calculations
    const calculatedSales = useMemo(() => {
        let totalLiters = 0;
        let totalValue = 0;

        const nozzleSales = nozzles.map(n => {
            // Use Digital meter for calculation if available and greater than start
            // Otherwise use 0 sales
            const endVal = n.endMeterDigital;
            const sold = Math.max(0, endVal - n.startMeter); // Ensure no negative sales display
            const value = sold * n.productPrice; // Simple calculation

            const totalNozzleCard = n.cardEntries.reduce((acc, c) => acc + (parseFloat(c.amount) || 0), 0);
            const totalNozzleCredit = n.creditEntries.reduce((acc, c) => acc + (parseFloat(c.amount) || 0), 0);
            const cashToCollect = value - totalNozzleCard - totalNozzleCredit;

            totalLiters += sold;
            totalValue += value;

            return {
                ...n,
                soldLiters: sold,
                value: value,
                cashToCollect: cashToCollect
            };
        });

        return { totalLiters, totalValue, nozzleSales };
    }, [nozzles]);

    const totalCollected = useMemo(() => {
        const totalCardMock = cardEntries.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
        // Calculate total card sales from all nozzles
        const totalNozzleCards = nozzles.reduce((acc, nozzle) => {
            return acc + nozzle.cardEntries.reduce((nAcc, c) => nAcc + (parseFloat(c.amount) || 0), 0);
        }, 0);

        const totalCards = totalCardMock + totalNozzleCards;

        // Calculate total credit sales from all nozzles
        const totalNozzleCredit = nozzles.reduce((acc, nozzle) => {
            return acc + nozzle.creditEntries.reduce((nAcc, c) => nAcc + (parseFloat(c.amount) || 0), 0);
        }, 0);

        const totalAdvances = advanceEntries.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
        const totalExpenses = expenseEntries.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
        return (parseFloat(cashCollected) || 0) + totalCards + totalNozzleCredit + totalAdvances + totalExpenses;
    }, [cashCollected, cardEntries, advanceEntries, expenseEntries, nozzles]);

    const discrepancy = totalCollected - calculatedSales.totalValue;
    const isDiscrepancyBad = Math.abs(discrepancy) > 1000; // Threshold example: 1000 LKR

    // Aggregate Terminal Sales for Display
    const terminalSales = useMemo(() => {
        const salesByTerminal: { [key: string]: number } = {};
        nozzles.forEach(n => {
            n.cardEntries.forEach(c => {
                if (c.terminalId && c.amount) {
                    const amount = parseFloat(c.amount) || 0;
                    salesByTerminal[c.terminalId] = (salesByTerminal[c.terminalId] || 0) + amount;
                }
            });
        });
        return salesByTerminal;
    }, [nozzles]);

    // Aggregate Credit Sales for Display
    const creditSalesSummary = useMemo(() => {
        const salesByCompany: { [key: string]: number } = {};
        nozzles.forEach(n => {
            n.creditEntries.forEach(c => {
                if (c.companyId && c.amount) {
                    const amount = parseFloat(c.amount) || 0;
                    salesByCompany[c.companyId] = (salesByCompany[c.companyId] || 0) + amount;
                }
            });
        });
        return salesByCompany;
    }, [nozzles]);

    return (
        <div className="flex flex-col gap-6 p-6 min-h-screen bg-background">

            {/* Header Section */}
            <div className="flex flex-col md::flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Sales Entry</h1>
                    <p className="text-muted-foreground">Record shift data and payments.</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Shift Selector */}
                    <div className="flex items-center bg-card border border-border rounded-md p-1 shadow-sm">
                        <button
                            onClick={() => setShift("Day")}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${shift === "Day" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                        >
                            <Sun className="h-4 w-4" /> Day
                        </button>
                        <button
                            onClick={() => setShift("Night")}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${shift === "Night" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                        >
                            <Moon className="h-4 w-4" /> Night
                        </button>
                    </div>

                    {/* Date Picker (Native Input for now) */}
                    <div className="relative">
                        <input
                            type="date"
                            className="pl-10 pr-3 py-2 border border-input rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                        <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                </div>
            </div>

            <hr className="border-border" />

            {/* Payment Breakdown */}
            <div className="bg-card border border-border rounded-xl shadow-sm">
                <div className="p-4 border-b border-border">
                    <h3 className="text-base font-semibold text-foreground">Payment Breakdown</h3>
                </div>
                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Collections & Sales */}
                    <div className="space-y-6">
                        <h4 className="font-medium text-sm text-muted-foreground border-b border-border/50 pb-2">Collections & Sales</h4>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Cash Collection</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                                value={cashCollected}
                                onChange={(e) => setCashCollected(e.target.value)}
                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            />
                        </div>

                        {/* Card Sales Summary (Computed) */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Card Sales Summary</label>
                            <div className="space-y-2 bg-muted/20 p-3 rounded-md border border-border/50">
                                {Object.entries(terminalSales).length === 0 && (
                                    <div className="text-xs text-muted-foreground italic">No card sales recorded</div>
                                )}
                                {Object.entries(terminalSales).map(([termId, amount]) => {
                                    const termLabel = TERMINALS.find(t => t.id === termId)?.label || termId;
                                    return (
                                        <div key={termId} className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">{termLabel} <span className="text-[10px] opacity-70">({termId})</span></span>
                                            <span className="font-medium">LKR {amount.toLocaleString()}</span>
                                        </div>
                                    );
                                })}
                                <div className="pt-2 border-t border-border/50 flex justify-between items-center font-semibold text-sm">
                                    <span>Total Card Sales</span>
                                    <span>LKR {Object.values(terminalSales).reduce((a, b) => a + b, 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Company Credit Summary (Computed) */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Company Credit Summary</label>
                            <div className="space-y-2 bg-muted/20 p-3 rounded-md border border-border/50">
                                {Object.entries(creditSalesSummary).length === 0 && (
                                    <div className="text-xs text-muted-foreground italic">No credit sales recorded</div>
                                )}
                                {Object.entries(creditSalesSummary).map(([compId, amount]) => {
                                    const compLabel = COMPANIES.find(c => c.id === compId)?.name || compId;
                                    return (
                                        <div key={compId} className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">{compLabel} <span className="text-[10px] opacity-70">({compId})</span></span>
                                            <span className="font-medium">LKR {amount.toLocaleString()}</span>
                                        </div>
                                    );
                                })}
                                <div className="pt-2 border-t border-border/50 flex justify-between items-center font-semibold text-sm">
                                    <span>Total Credit Sales</span>
                                    <span>LKR {Object.values(creditSalesSummary).reduce((a, b) => a + b, 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-border mt-6">
                            <span className="text-sm font-medium text-muted-foreground">Total Collected</span>
                            <span className="text-xl font-bold text-foreground">LKR {totalCollected.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Right Column: Deductions & Expenses */}
                    <div className="space-y-6">
                        <h4 className="font-medium text-sm text-muted-foreground border-b border-border/50 pb-2">Deductions & Expenses</h4>

                        {/* Staff Advances */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-foreground">Staff Advances</label>
                                <button onClick={addAdvanceEntry} className="text-xs text-primary hover:underline">+ Add Staff</button>
                            </div>
                            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                                {advanceEntries.map((entry, index) => {
                                    const selectedPumper = PUMPERS.find(p => p.id === entry.pumperId);
                                    return (
                                        <div key={entry.id} className="flex gap-2 items-start p-2 border border-border/50 rounded-md bg-muted/10">
                                            <div className="flex-1 flex flex-col gap-2">
                                                <div className="flex gap-2 items-center">
                                                    <select
                                                        className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                                                        value={entry.pumperId}
                                                        onChange={(e) => updateAdvanceEntry(entry.id, "pumperId", e.target.value)}
                                                    >
                                                        <option value="">Select Staff</option>
                                                        {PUMPERS.map((p) => (
                                                            <option key={p.id} value={p.id}>{p.name}</option>
                                                        ))}
                                                    </select>
                                                    {selectedPumper && (
                                                        <span className="text-xs text-muted-foreground whitespace-nowrap px-2">
                                                            NIC: {selectedPumper.nic}
                                                        </span>
                                                    )}
                                                </div>
                                                <input
                                                    type="datetime-local"
                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                                                    value={entry.dateTime}
                                                    onChange={(e) => updateAdvanceEntry(entry.id, "dateTime", e.target.value)}
                                                />
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        placeholder="Amount"
                                                        className="flex h-9 w-28 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                                                        value={entry.amount}
                                                        onChange={(e) => updateAdvanceEntry(entry.id, "amount", e.target.value)}
                                                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Reason"
                                                        className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                                                        value={entry.reason || ""}
                                                        onChange={(e) => updateAdvanceEntry(entry.id, "reason", e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            {advanceEntries.length > 1 && (
                                                <button
                                                    onClick={() => removeAdvanceEntry(entry.id)}
                                                    className="h-9 w-9 flex items-center justify-center rounded-md border border-input hover:bg-muted text-muted-foreground self-center"
                                                >
                                                    &times;
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="text-right text-xs text-muted-foreground pt-1">
                                Total Advances: LKR {advanceEntries.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0).toLocaleString()}
                            </div>
                        </div>

                        {/* Company Expenses */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-foreground">Company Expenses</label>
                                <button onClick={addExpenseEntry} className="text-xs text-primary hover:underline">+ Add Expense</button>
                            </div>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                {expenseEntries.map((entry, index) => (
                                    <div key={entry.id} className="flex flex-col gap-2 border-b last:border-0 pb-4 border-border/50">
                                        <div className="grid grid-cols-2 gap-2">
                                            <select
                                                className="col-span-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                                                value={entry.category}
                                                onChange={(e) => updateExpenseEntry(entry.id, "category", e.target.value)}
                                            >
                                                {EXPENSE_CATEGORIES.map((cat) => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                            {(() => {
                                                const payees = CATEGORY_PAYEES[entry.category] || ["Other"];
                                                const isOtherSelected = entry.payee === "__OTHER__" || (entry.payee && !payees.includes(entry.payee) && entry.payee !== "");
                                                return (
                                                    <>
                                                        <select
                                                            className="col-span-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                                                            value={isOtherSelected ? "__OTHER__" : entry.payee}
                                                            onChange={(e) => {
                                                                if (e.target.value === "__OTHER__") {
                                                                    updateExpenseEntry(entry.id, "payee", "__OTHER__");
                                                                } else {
                                                                    updateExpenseEntry(entry.id, "payee", e.target.value);
                                                                }
                                                            }}
                                                        >
                                                            <option value="">Select Payee</option>
                                                            {payees.map((payee) => (
                                                                <option key={payee} value={payee === "Other" ? "__OTHER__" : payee}>
                                                                    {payee}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {isOtherSelected && (
                                                            <input
                                                                type="text"
                                                                placeholder="Enter Payee Name"
                                                                className="col-span-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                                                                value={entry.payee === "__OTHER__" ? "" : entry.payee}
                                                                onChange={(e) => updateExpenseEntry(entry.id, "payee", e.target.value || "__OTHER__")}
                                                            />
                                                        )}
                                                    </>
                                                );
                                            })()}
                                            <input
                                                type="text"
                                                placeholder="Invoice No"
                                                className="col-span-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                                                value={entry.invoiceNumber || ""}
                                                onChange={(e) => updateExpenseEntry(entry.id, "invoiceNumber", e.target.value)}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Amount"
                                                className="col-span-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                                                value={entry.amount}
                                                onChange={(e) => updateExpenseEntry(entry.id, "amount", e.target.value)}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Short detail (e.g. Threewheeler To DFCC Bank)"
                                                className="flex-1 flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                                                value={entry.description}
                                                onChange={(e) => updateExpenseEntry(entry.id, "description", e.target.value)}
                                            />
                                            {expenseEntries.length > 1 && (
                                                <button
                                                    onClick={() => removeExpenseEntry(entry.id)}
                                                    className="h-8 w-8 flex items-center justify-center rounded-md border border-input hover:bg-muted text-muted-foreground"
                                                >
                                                    &times;
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="text-right text-xs text-muted-foreground pt-1">
                                Total Expenses: LKR {expenseEntries.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0).toLocaleString()}
                            </div>
                        </div>
                    </div>


                    {/* Right Column: Reconciliation & Actions */}
                    <div className="space-y-6">
                        <h4 className="font-medium text-sm text-muted-foreground border-b border-border/50 pb-2">Reconciliation & Actions</h4>

                        {/* Reconciliation / Discrepancy */}
                        <div className={`border-l-4 rounded-xl shadow-sm overflow-hidden ${isDiscrepancyBad ? "border-l-red-500 border border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/10" : "border-l-green-500 border border-green-200 dark:border-green-900/50 bg-green-50/30 dark:bg-green-900/10"}`}>
                            <div className="p-4 border-b border-transparent">
                                <h3 className="text-base font-semibold flex items-center gap-2">
                                    {isDiscrepancyBad ? <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" /> : <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />}
                                    <span className={isDiscrepancyBad ? "text-red-900 dark:text-red-200" : "text-green-900 dark:text-green-200"}>Reconciliation</span>
                                </h3>
                            </div>
                            <div className="p-4 space-y-3 pt-0">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Total Sales Value:</span>
                                    <span className="font-medium text-foreground">LKR {calculatedSales.totalValue.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Total Collected:</span>
                                    <span className="font-medium text-foreground">LKR {totalCollected.toLocaleString()}</span>
                                </div>

                                <hr className={isDiscrepancyBad ? "border-destructive/20" : "border-emerald-500/20"} />

                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-foreground">Difference</span>
                                    <span className={`text-xl font-bold ${discrepancy < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                                        {discrepancy > 0 ? "+" : ""}{discrepancy.toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {isDiscrepancyBad ? "Significant discrepancy detected. Please double check entries." : "Balanced within accepted threshold."}
                                </p>
                            </div>
                        </div>

                        {/* Final Action */}
                        <div className="pt-2">
                            <button
                                className="w-full py-4 bg-primary text-primary-foreground text-lg font-bold rounded-xl shadow-lg hover:bg-primary/90 transition-all active:scale-[0.98]"
                                onClick={() => alert("Saving shift data to database...")}
                            >
                                Complete Shift
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6">

                {/* Nozzle Entry Grid (Main Area) */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-foreground">Nozzle Meter Readings</h2>
                        <div className="text-sm text-muted-foreground">
                            {nozzles.filter(n => n.isSubmitted).length} / {nozzles.length} Submitted
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {calculatedSales.nozzleSales.map((nozzle) => (
                            <div key={nozzle.id} className={`border rounded-xl shadow-sm p-4 transition-colors ${nozzle.isSubmitted ? "bg-muted/30 border-border opacity-90" : "bg-card border-border"}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-base font-medium text-foreground">{nozzle.pumpName}</h3>
                                        <p className="text-sm text-muted-foreground">{nozzle.productName} - LKR {nozzle.productPrice}/L</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-foreground">LKR {nozzle.value.toLocaleString()}</div>
                                        <div className="text-xs text-muted-foreground">Sale Liters: {nozzle.soldLiters.toFixed(2)} L</div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {/* Pumper Selection */}
                                    <div className="space-y-1.5">
                                        <label htmlFor={`pumper-${nozzle.id}`} className="text-xs font-medium text-muted-foreground">Assigned Pumper</label>
                                        <select
                                            id={`pumper-${nozzle.id}`}
                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                                            value={nozzle.pumperId || ""}
                                            onChange={(e) => handleNozzleChange(nozzle.id, "pumperId", e.target.value)}
                                            disabled={nozzle.isSubmitted}
                                        >
                                            <option value="">Select Pumper</option>
                                            {PUMPERS.map((pumper) => (
                                                <option key={pumper.id} value={pumper.id}>
                                                    {pumper.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Digital Start Meter (B/F)</label>
                                            <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 py-1 text-sm text-muted-foreground shadow-sm/5">
                                                {nozzle.startMeter.toFixed(1)}
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor={`dig-${nozzle.id}`} className="text-xs font-medium text-foreground">Digital End Meter</label>
                                            <input
                                                id={`dig-${nozzle.id}`}
                                                type="number"
                                                placeholder="0000.0"
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                                                value={nozzle.endMeterDigital || ""}
                                                onChange={(e) => handleNozzleChange(nozzle.id, "endMeterDigital", parseFloat(e.target.value))}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                disabled={nozzle.isSubmitted}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Analog Start Meter (B/F)</label>
                                            <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 py-1 text-sm text-muted-foreground shadow-sm/5">
                                                {nozzle.startMeter.toFixed(1)}
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor={`ana-${nozzle.id}`} className="text-xs font-medium text-foreground">Analog End Meter</label>
                                            <input
                                                id={`ana-${nozzle.id}`}
                                                type="number"
                                                placeholder="0000.0"
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                                                value={nozzle.endMeterAnalog || ""}
                                                onChange={(e) => handleNozzleChange(nozzle.id, "endMeterAnalog", parseFloat(e.target.value))}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                disabled={nozzle.isSubmitted}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 pt-2 border-t border-border/50">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-medium text-muted-foreground">Card Sales (This Nozzle)</label>
                                            <button onClick={() => addNozzleCardEntry(nozzle.id)} className="text-[10px] text-primary hover:underline">+ Add Card</button>
                                        </div>
                                        {nozzle.cardEntries.map((cardEntry) => (
                                            <div key={cardEntry.id} className="flex gap-2 items-center flex-wrap">
                                                <select
                                                    className="flex-1 min-w-[200px] h-8 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground disabled:opacity-50"
                                                    value={cardEntry.terminalId || ""}
                                                    onChange={(e) => updateNozzleCardEntry(nozzle.id, cardEntry.id, "terminalId", e.target.value)}
                                                    disabled={nozzle.isSubmitted}
                                                >
                                                    <option value="">Select Terminal</option>
                                                    {TERMINALS.map((t) => (
                                                        <option key={t.id} value={t.id}>{t.label}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="text"
                                                    placeholder="Batch No"
                                                    className="w-[100px] flex h-8 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground disabled:opacity-50"
                                                    value={cardEntry.batchNumber || ""}
                                                    onChange={(e) => updateNozzleCardEntry(nozzle.id, cardEntry.id, "batchNumber", e.target.value)}
                                                    disabled={nozzle.isSubmitted}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="Amount"
                                                    className="w-[100px] flex h-8 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground disabled:opacity-50"
                                                    value={cardEntry.amount || ""}
                                                    onChange={(e) => updateNozzleCardEntry(nozzle.id, cardEntry.id, "amount", e.target.value)}
                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                    disabled={nozzle.isSubmitted}
                                                />
                                                <input
                                                    type="datetime-local"
                                                    className="w-[190px] flex h-8 rounded-md border border-input bg-background px-2 py-1 text-[14px] shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground disabled:opacity-50"
                                                    value={cardEntry.settlementDateTime || ""}
                                                    onChange={(e) => updateNozzleCardEntry(nozzle.id, cardEntry.id, "settlementDateTime", e.target.value)}
                                                    disabled={nozzle.isSubmitted}
                                                />
                                                <button
                                                    onClick={() => removeNozzleCardEntry(nozzle.id, cardEntry.id)}
                                                    className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-md border border-input hover:bg-muted text-muted-foreground"
                                                    disabled={nozzle.isSubmitted}
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Company Credit (This Nozzle) */}
                                    <div className="space-y-1.5 pt-2 border-t border-border/50">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-medium text-muted-foreground">Company Credit (This Nozzle)</label>
                                            <button onClick={() => addNozzleCreditEntry(nozzle.id)} className="text-[10px] text-primary hover:underline">+ Add Credit</button>
                                        </div>
                                        {nozzle.creditEntries.map((creditEntry) => (
                                            <div key={creditEntry.id} className="flex gap-2 items-center flex-wrap">
                                                <select
                                                    className="flex-1 min-w-[200px] h-8 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground disabled:opacity-50"
                                                    value={creditEntry.companyId || ""}
                                                    onChange={(e) => updateNozzleCreditEntry(nozzle.id, creditEntry.id, "companyId", e.target.value)}
                                                    disabled={nozzle.isSubmitted}
                                                >
                                                    <option value="">Select Company</option>
                                                    {COMPANIES.map((c) => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="text"
                                                    placeholder="PO No"
                                                    className="w-[100px] flex h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground disabled:opacity-50"
                                                    value={creditEntry.poNumber || ""}
                                                    onChange={(e) => updateNozzleCreditEntry(nozzle.id, creditEntry.id, "poNumber", e.target.value)}
                                                    disabled={nozzle.isSubmitted}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Veh No"
                                                    className="w-[100px] flex h-8 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground disabled:opacity-50"
                                                    value={creditEntry.vehicleNumber || ""}
                                                    onChange={(e) => updateNozzleCreditEntry(nozzle.id, creditEntry.id, "vehicleNumber", e.target.value)}
                                                    disabled={nozzle.isSubmitted}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="Liters"
                                                    className="w-[80px] flex h-8 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground disabled:opacity-50"
                                                    value={creditEntry.liters || ""}
                                                    onChange={(e) => updateNozzleCreditEntry(nozzle.id, creditEntry.id, "liters", e.target.value)}
                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                    disabled={nozzle.isSubmitted}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="Amount"
                                                    className="w-[100px] flex h-8 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground disabled:opacity-50"
                                                    value={creditEntry.amount || ""}
                                                    onChange={(e) => updateNozzleCreditEntry(nozzle.id, creditEntry.id, "amount", e.target.value)}
                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                    disabled={nozzle.isSubmitted}
                                                />
                                                <button
                                                    onClick={() => removeNozzleCreditEntry(nozzle.id, creditEntry.id)}
                                                    className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-md border border-input hover:bg-muted text-muted-foreground"
                                                    disabled={nozzle.isSubmitted}
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Net Cash Display */}
                                    <div className="mt-4 p-3 bg-muted/40 rounded-lg border border-border/50 flex justify-between items-center">
                                        <span className="text-sm font-medium text-foreground">Cash to Collect</span>
                                        <span className={`text-lg font-bold ${nozzle.cashToCollect < 0 ? "text-red-500" : "text-green-600"}`}>
                                            LKR {nozzle.cashToCollect.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>

                                    {/* Action Button */}
                                    <div className="pt-2">
                                        <button
                                            onClick={() => handleNozzleSubmit(nozzle.id)}
                                            className={`w-full flex items-center justify-center -3 py-2 text-sm font-medium rounded-md transition-colors ${nozzle.isSubmitted
                                                ? "bg-muted text-muted-foreground hover:bg-muted/80"
                                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                                                }`}
                                        >
                                            {nozzle.isSubmitted ? "Edit Entry" : "Submit Reading"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
