"use client";

import { useState, useMemo, useEffect } from "react";
import { Calendar as CalendarIcon, Sun, Moon, AlertTriangle, CheckCircle, Download, Play, Square, Loader2, XCircle } from "lucide-react";
import { api } from "@/lib/api/client";
import { useSales } from "@/lib/hooks/use-sales";
import { saveNozzlesToLocal, loadNozzlesFromLocal, clearNozzlesFromLocal, hasLocalNozzleData, type LocalNozzleData } from "@/lib/hooks/useNozzleStorage";
import type { ShiftType, Employee, CardTerminal, CompanyAccount, Nozzle as ApiNozzle, SalesHistoryItem } from "@/lib/api/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Mock Data Interfaces
interface Nozzle {
    id: string;
    displayName: string; // e.g., "LAD-1"
    pumpName: string; // e.g., "P-LAD-1"
    productName: string; // e.g., "Diesel", "Petrol 92"
    productPrice: number;
    startMeter: number;
    endMeterDigital: number;
    endMeterAnalog: number;
    pumperId?: string; // Field for assigned pumper
    isSubmitted?: boolean; // Track if entry is locked
    cardEntries: { id: string; terminalId: string; batchNumber: string; invoiceNumber: string; invoiceDateTime: string; amount: string }[];
    creditEntries: { id: string; companyId: string; poNumber: string; vehicleNumber: string; liters: string; amount: string; notes: string }[];
}

// Available nozzle from API (for dropdown)
interface AvailableNozzle {
    id: string;
    displayName: string; // e.g., "LAD-1"
    pumpName: string;
    productName: string;
    productPrice: number;
}

interface Pumper {
    id: string;
    name: string;
    nic: string;
}

// Pumpers will be loaded from API (employees with role=pumper)

interface Terminal {
    id: string;
    label: string;
}

// Terminals will be loaded from API

interface Company {
    id: string;
    name: string;
}

// Companies will be loaded from API
// Nozzles will be loaded from API

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

    // Available nozzles from API (for dropdown selection in each card)
    const [availableNozzles, setAvailableNozzles] = useState<AvailableNozzle[]>([]);

    // Nozzle entries state for meter readings and form data
    const [nozzles, setNozzles] = useState<Nozzle[]>([]);

    // State for API-fetched data
    const [pumpers, setPumpers] = useState<Pumper[]>([]);
    const [terminals, setTerminals] = useState<Terminal[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [dataError, setDataError] = useState<string | null>(null);

    // Sales History State
    const [salesHistory, setSalesHistory] = useState<SalesHistoryItem[]>([]);
    const [salesHistoryTotal, setSalesHistoryTotal] = useState(0);
    const [salesHistoryLoading, setSalesHistoryLoading] = useState(false);
    const [salesHistoryOffset, setSalesHistoryOffset] = useState(0);
    const SALES_HISTORY_LIMIT = 20;
    const [salesHistoryFromDate, setSalesHistoryFromDate] = useState<string>('');
    const [salesHistoryToDate, setSalesHistoryToDate] = useState<string>('');

    // Add Nozzle Modal State
    const [showAddNozzleModal, setShowAddNozzleModal] = useState(false);
    const [availablePumps, setAvailablePumps] = useState<{ id: string; name: string }[]>([]);
    const [availableTanks, setAvailableTanks] = useState<{ id: string; name: string; product_id?: string; product_name?: string }[]>([]);
    const [availableProducts, setAvailableProducts] = useState<{ id: string; name: string }[]>([]);
    const [newNozzleData, setNewNozzleData] = useState({
        nozzle_id: '',         // e.g., N-LAD-1
        display_name: '',      // e.g., LAD-1
        tank_id: '',           // Tank selector
        pump_id: '',           // e.g., P-LAD-1 (text input)
        product_id: '',        // Auto-selected from tank
        digital_meter: '',     // Current digital meter reading
        analog_meter: '',      // Current analog meter reading
    });
    const [isCreatingNozzle, setIsCreatingNozzle] = useState(false);

    // Single-entry workflow: currently selected nozzle for data entry
    const [selectedNozzleId, setSelectedNozzleId] = useState<string | null>(null);

    // API Hook for shift management (read-only - shifts are managed from Staff page)
    const {
        currentShift,
        sales,
        isLoading,
        error,
        hasActiveShift,
        recordSaleEntry,
        clearError,
    } = useSales();

    // Fetch master data from API on mount
    useEffect(() => {
        async function fetchMasterData() {
            setIsLoadingData(true);
            setDataError(null);
            try {
                const [employeesData, terminalsData, companiesData, nozzlesData, lastReadings] = await Promise.all([
                    api.employees.getActive(),
                    api.settlements.getTerminals(),
                    api.accounts.getAll(),
                    api.inventory.getNozzles(),
                    api.inventory.getLastMeterReadings().catch(() => ({})), // Fallback to empty if no readings exist
                ]);

                // Map employees to pumpers (filter by pumper role)
                setPumpers(
                    employeesData
                        .filter((e: Employee) => e.role === 'pumper')
                        .map((e: Employee) => ({
                            id: e.id,
                            name: e.full_name,
                            nic: e.nic || '',
                        }))
                );

                // Map terminals
                setTerminals(
                    terminalsData.map((t: CardTerminal) => ({
                        id: t.id,
                        label: t.label || `${t.provider.toUpperCase()} ${t.terminal_id}`,
                    }))
                );

                // Map companies
                setCompanies(
                    companiesData.map((c: CompanyAccount) => ({
                        id: c.id,
                        name: c.name,
                    }))
                );

                // Map nozzles for dropdown (available nozzles)
                setAvailableNozzles(
                    nozzlesData.map((n: ApiNozzle) => ({
                        id: n.nozzle_id,
                        displayName: n.nozzle_name || 'Unknown',  // e.g., LAD-1
                        pumpName: n.pump_name || n.nozzle_name || 'Unknown',
                        productName: n.product_name || 'Unknown',
                        productPrice: n.price_per_liter || 0,
                    }))
                );

                // Populate full nozzles state with start meter from previous shift
                setNozzles(
                    nozzlesData.map((n: ApiNozzle) => ({
                        id: n.nozzle_id,
                        displayName: n.nozzle_name || 'Unknown',  // e.g., LAD-1
                        pumpName: n.pump_name || n.nozzle_name || 'Unknown',
                        productName: n.product_name || 'Unknown',
                        productPrice: n.price_per_liter || 0,
                        startMeter: (lastReadings as Record<string, number>)[n.nozzle_id] || 0,
                        endMeterDigital: (lastReadings as Record<string, number>)[n.nozzle_id] || 0,
                        endMeterAnalog: 0,
                        isSubmitted: false,
                        cardEntries: [],
                        creditEntries: [],
                    }))
                );
            } catch (err) {
                console.error('Failed to fetch master data:', err);
                setDataError('Failed to load data. Please refresh the page.');
            } finally {
                setIsLoadingData(false);
            }
        }

        fetchMasterData();
    }, []);

    // Fetch sales history on mount
    useEffect(() => {
        async function fetchSalesHistory() {
            setSalesHistoryLoading(true);
            try {
                const response = await api.sales.getSalesHistory({
                    limit: SALES_HISTORY_LIMIT,
                    offset: 0,
                });
                setSalesHistory(response.items);
                setSalesHistoryTotal(response.total);
                setSalesHistoryOffset(0);
            } catch (err) {
                console.error('Failed to fetch sales history:', err);
            } finally {
                setSalesHistoryLoading(false);
            }
        }
        fetchSalesHistory();
    }, []);

    // Recover from localStorage if there's saved data for current shift
    const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
    const [recoveryData, setRecoveryData] = useState<LocalNozzleData[] | null>(null);

    useEffect(() => {
        if (currentShift?.id && typeof window !== 'undefined') {
            const savedData = loadNozzlesFromLocal(currentShift.id);
            if (savedData && savedData.nozzles.length > 0) {
                // Check if any nozzles have actual submission data
                const hasSubmittedData = savedData.nozzles.some(n => n.isSubmitted);
                if (hasSubmittedData) {
                    setRecoveryData(savedData.nozzles);
                    setShowRecoveryPrompt(true);
                }
            }
        }
    }, [currentShift?.id]);

    // Sync sales from API to local state (Persistence)
    useEffect(() => {
        if (!sales || nozzles.length === 0) return;

        setNozzles(prevNozzles => {
            let hasChanges = false;
            const newNozzles = prevNozzles.map(nozzle => {
                const sale = sales.find(s => s.nozzle_id === nozzle.id);
                if (sale && !nozzle.isSubmitted) {
                    hasChanges = true;
                    return {
                        ...nozzle,
                        isSubmitted: true,
                        startMeter: parseFloat(sale.start_meter_digital.toString()),
                        endMeterDigital: parseFloat(sale.end_meter_digital.toString()),
                        endMeterAnalog: sale.end_meter_analog ? parseFloat(sale.end_meter_analog.toString()) : 0,
                        cardEntries: sale.card_sales?.map(c => ({
                            id: c.id as string,
                            terminalId: c.terminal_id as string,
                            batchNumber: c.batch_number || '',
                            invoiceNumber: c.invoice_number || '',
                            invoiceDateTime: c.invoice_datetime || '',
                            amount: c.amount.toString(),
                        })) || [],
                        creditEntries: sale.credit_sales?.map(c => ({
                            id: c.id as string,
                            companyId: c.account_id as string,
                            poNumber: c.po_number || '',
                            vehicleNumber: c.vehicle_number || '',
                            liters: c.liters ? c.liters.toString() : '',
                            amount: c.amount.toString(),
                            notes: c.notes || ''
                        })) || []
                    };
                }
                return nozzle;
            });
            return hasChanges ? newNozzles : prevNozzles;
        });
    }, [sales, nozzles.length]); // Depend on sales and nozzles initialization

    const handleAcceptRecovery = () => {
        if (recoveryData) {
            setNozzles(recoveryData as Nozzle[]);
            // Set selectedNozzleId to the first unsubmitted nozzle
            const firstUnsubmitted = recoveryData.find(n => !n.isSubmitted);
            setSelectedNozzleId(firstUnsubmitted ? firstUnsubmitted.id : null);
        }
        setShowRecoveryPrompt(false);
        setRecoveryData(null);
    };

    const handleDismissRecovery = () => {
        if (currentShift?.id) {
            clearNozzlesFromLocal(currentShift.id);
        }
        setShowRecoveryPrompt(false);
        setRecoveryData(null);
    };

    // Sync shift type from API response
    useEffect(() => {
        if (currentShift) {
            setShift(currentShift.shift_type === 'day' ? 'Day' : 'Night');
            setDate(currentShift.shift_date);
        }
    }, [currentShift]);

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

    // Saving state for UI feedback
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Submit nozzle entry: save to API + localStorage, then advance to next
    const handleNozzleSubmit = async (id: string) => {
        const nozzle = nozzles.find(n => n.id === id);
        if (!nozzle || !currentShift) return;

        setIsSaving(true);
        setSaveError(null);

        // Update local state first
        const updatedNozzles = nozzles.map((n) => {
            if (n.id === id) {
                return { ...n, isSubmitted: true };
            }
            return n;
        });
        setNozzles(updatedNozzles);

        // Auto-select next unsubmitted nozzle
        const nextUnsubmitted = updatedNozzles.find(n => !n.isSubmitted);
        setSelectedNozzleId(nextUnsubmitted ? nextUnsubmitted.id : null);

        // Save to localStorage as backup (always succeeds)
        saveNozzlesToLocal(currentShift.id, updatedNozzles as LocalNozzleData[]);

        try {
            // Prepare card entries
            const cardEntries = nozzle.cardEntries
                .filter(c => c.terminalId && c.amount && parseFloat(c.amount) > 0)
                .map(c => ({
                    terminal_id: c.terminalId,
                    amount: parseFloat(c.amount),
                    batch_number: c.batchNumber || null,
                    invoice_number: c.invoiceNumber || null,
                    invoice_datetime: c.invoiceDateTime || null
                }));

            // Prepare credit entries  
            const creditEntries = nozzle.creditEntries
                .filter(c => c.companyId && c.amount && parseFloat(c.amount) > 0)
                .map(c => ({
                    account_id: c.companyId,
                    amount: parseFloat(c.amount),
                    liters: c.liters ? parseFloat(c.liters) : null,
                    po_number: c.poNumber || null,
                    vehicle_number: c.vehicleNumber || null,
                    notes: c.notes || null
                }));

            // Save to database via API
            await api.sales.recordSaleEntry({
                shift_id: currentShift.id,
                nozzle_id: nozzle.id,
                employee_id: nozzle.pumperId || null,
                start_meter_digital: nozzle.startMeter,
                end_meter_digital: nozzle.endMeterDigital,
                start_meter_analog: nozzle.startMeter,
                end_meter_analog: nozzle.endMeterAnalog || nozzle.startMeter,
                price_per_liter: nozzle.productPrice,
                card_entries: cardEntries.length > 0 ? cardEntries : null,
                credit_entries: creditEntries.length > 0 ? creditEntries : null
            });
        } catch (error) {
            console.error('Failed to save to API:', error);
            setSaveError('Failed to save to server. Data backed up locally.');
            // Data is still in localStorage, so user won't lose it
        } finally {
            setIsSaving(false);
        }
    };

    // Edit a submitted entry - reopens the form for that nozzle
    const handleEditEntry = (id: string) => {
        setNozzles((prev) =>
            prev.map((n) => {
                if (n.id === id) {
                    return { ...n, isSubmitted: false };
                }
                return n;
            })
        );
        setSelectedNozzleId(id);
    };

    // Delete a submitted entry - clears data and returns to unsubmitted state
    const handleDeleteEntry = (id: string) => {
        setNozzles((prev) =>
            prev.map((n) => {
                if (n.id === id) {
                    return {
                        ...n,
                        isSubmitted: false,
                        endMeterDigital: n.startMeter,
                        endMeterAnalog: 0,
                        pumperId: undefined,
                        cardEntries: [],
                        creditEntries: [],
                    };
                }
                return n;
            })
        );
    };

    // Nozzle Card Entry Handlers
    const addNozzleCardEntry = (nozzleId: string) => {
        setNozzles(prev => prev.map(n => {
            if (n.id === nozzleId) {
                return { ...n, cardEntries: [...n.cardEntries, { id: Math.random().toString(36).substr(2, 9), terminalId: "", batchNumber: "", invoiceNumber: "", invoiceDateTime: "", amount: "" }] };
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

    const updateNozzleCardEntry = (nozzleId: string, cardId: string, field: "terminalId" | "batchNumber" | "invoiceNumber" | "invoiceDateTime" | "amount", value: string) => {
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
                return { ...n, creditEntries: [...n.creditEntries, { id: Math.random().toString(36).substr(2, 9), companyId: "", poNumber: "", vehicleNumber: "", liters: "", amount: "", notes: "" }] };
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

    const updateNozzleCreditEntry = (nozzleId: string, creditId: string, field: "companyId" | "poNumber" | "vehicleNumber" | "liters" | "amount" | "notes", value: string) => {
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

    // Nozzle Swap Handler - swaps the nozzle for a specific entry while preserving entered data
    const handleNozzleSwap = (currentNozzleId: string, newNozzleId: string) => {
        // Find the new nozzle data from availableNozzles
        const newNozzleData = availableNozzles.find(n => n.id === newNozzleId);
        if (!newNozzleData) {
            console.error('New nozzle not found');
            return;
        }

        // Check if the new nozzle is already in use
        const isAlreadyInUse = nozzles.some(n => n.id === newNozzleId);
        if (isAlreadyInUse) {
            alert('This nozzle is already being used in another entry. Please choose a different nozzle.');
            return;
        }

        // Update the nozzles state: replace the old nozzle with new nozzle data, preserving entered values
        setNozzles(prev => prev.map(n => {
            if (n.id === currentNozzleId) {
                return {
                    ...n,
                    id: newNozzleData.id,
                    displayName: newNozzleData.displayName,
                    pumpName: newNozzleData.pumpName,
                    productName: newNozzleData.productName,
                    productPrice: newNozzleData.productPrice,
                    // Preserve user-entered data
                    startMeter: n.startMeter,
                    endMeterDigital: n.endMeterDigital,
                    endMeterAnalog: n.endMeterAnalog,
                    pumperId: n.pumperId,
                    isSubmitted: n.isSubmitted,
                    cardEntries: n.cardEntries,
                    creditEntries: n.creditEntries,
                };
            }
            return n;
        }));
    };

    // Add Nozzle Modal Handlers
    const openAddNozzleModal = async () => {
        setShowAddNozzleModal(true);
        try {
            // Fetch pumps, tanks, and products for dropdowns
            const [pumpsData, tanksData, productsData] = await Promise.all([
                api.inventory.getPumps(),
                api.inventory.getTanks(),
                api.inventory.getProducts(),
            ]);
            setAvailablePumps(pumpsData.map(p => ({ id: p.id, name: p.name })));
            setAvailableTanks(tanksData.map(t => ({ id: t.id, name: t.name, product_id: t.product_id, product_name: t.product_name ?? undefined })));
            setAvailableProducts(productsData.map(p => ({ id: p.id, name: p.name })));
        } catch (err) {
            console.error('Failed to fetch data for Add Nozzle modal:', err);
        }
    };

    const handleCreateNozzle = async () => {
        if (!newNozzleData.nozzle_id || !newNozzleData.display_name || !newNozzleData.tank_id || !newNozzleData.product_id) {
            alert('Please fill in Nozzle ID, Display Name, Tank, and Product');
            return;
        }
        setIsCreatingNozzle(true);
        try {
            await api.inventory.createNozzle({
                nozzle_id: newNozzleData.nozzle_id,
                nozzle_name: newNozzleData.display_name,
                tank_id: newNozzleData.tank_id,
                product_id: newNozzleData.product_id,
                pump_id: newNozzleData.pump_id || undefined,
                digital_meter: newNozzleData.digital_meter || undefined,
                analog_meter: newNozzleData.analog_meter || undefined,
            });
            // Refresh nozzles list
            const nozzlesData = await api.inventory.getNozzles();
            setAvailableNozzles(
                nozzlesData.map((n) => ({
                    id: n.nozzle_id,
                    displayName: n.nozzle_name || 'Unknown',
                    pumpName: n.pump_name || n.nozzle_name || 'Unknown',
                    productName: n.product_name || 'Unknown',
                    productPrice: n.price_per_liter || 0,
                }))
            );
            setNozzles(
                nozzlesData.map((n) => ({
                    id: n.nozzle_id,
                    displayName: n.nozzle_name || 'Unknown',
                    pumpName: n.pump_name || n.nozzle_name || 'Unknown',
                    productName: n.product_name || 'Unknown',
                    productPrice: n.price_per_liter || 0,
                    startMeter: 0,
                    endMeterDigital: 0,
                    endMeterAnalog: 0,
                    isSubmitted: false,
                    cardEntries: [],
                    creditEntries: [],
                }))
            );
            setShowAddNozzleModal(false);
            setNewNozzleData({ nozzle_id: '', display_name: '', tank_id: '', pump_id: '', product_id: '', digital_meter: '', analog_meter: '' });
        } catch (err) {
            console.error('Failed to create nozzle:', err);
            alert('Failed to create nozzle. Please try again.');
        } finally {
            setIsCreatingNozzle(false);
        }
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

    // Submit Shift State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [showResultDialog, setShowResultDialog] = useState(false);
    const [shiftResult, setShiftResult] = useState<{
        sales_count: number;
        card_sales_count: number;
        credit_sales_count: number;
        advances_saved: number;
        expenses_saved: number;
        total_fuel_sales: number;
        total_card_sales: number;
        total_credit_sales: number;
    } | null>(null);

    // Handle Complete Shift - Send all data to API
    const handleCompleteShift = async () => {
        if (!currentShift) {
            alert('No active shift to complete. Please start a shift first.');
            return;
        }

        // Validate that at least some entries exist
        const submittedNozzles = nozzles.filter(n => n.endMeterDigital > 0 || n.isSubmitted);
        if (submittedNozzles.length === 0) {
            alert('No nozzle readings to submit. Please enter meter readings first.');
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);
        setSubmitSuccess(false);

        try {
            // 1. Collect sale entries from nozzles
            const sale_entries = submittedNozzles.map(n => ({
                nozzle_id: n.id,
                employee_id: n.pumperId || null,
                start_meter_digital: n.startMeter,
                end_meter_digital: n.endMeterDigital,
                start_meter_analog: n.endMeterAnalog || null,
                end_meter_analog: n.endMeterAnalog || null,
                price_per_liter: n.productPrice,
                notes: null,
            }));

            // 2. Collect card sales from all nozzles + global card entries
            const card_sales: {
                terminal_id: string;
                nozzle_id?: string | null;
                batch_number?: string | null;
                settlement_datetime?: string | null;
                amount: number;
                notes?: string | null;
            }[] = [];

            // Add nozzle-level card sales
            nozzles.forEach(n => {
                n.cardEntries.forEach(c => {
                    if (c.terminalId && c.amount) {
                        card_sales.push({
                            terminal_id: c.terminalId,
                            nozzle_id: n.id,
                            batch_number: c.batchNumber || null,
                            settlement_datetime: c.invoiceDateTime || null,
                            amount: parseFloat(c.amount) || 0,
                            notes: null,
                        });
                    }
                });
            });

            // Add global card entries (no nozzle_id)
            cardEntries.forEach(c => {
                if (c.terminalId && c.amount) {
                    card_sales.push({
                        terminal_id: c.terminalId,
                        nozzle_id: null,
                        batch_number: null,
                        settlement_datetime: null,
                        amount: parseFloat(c.amount) || 0,
                        notes: 'Global card entry',
                    });
                }
            });

            // 3. Collect credit sales from all nozzles + global credit entries
            const credit_sales: {
                account_id: string;
                nozzle_id?: string | null;
                po_number?: string | null;
                vehicle_number?: string | null;
                liters?: number;
                amount: number;
                notes?: string | null;
            }[] = [];

            // Add nozzle-level credit sales
            nozzles.forEach(n => {
                n.creditEntries.forEach(c => {
                    if (c.companyId && c.amount) {
                        credit_sales.push({
                            account_id: c.companyId,
                            nozzle_id: n.id,
                            po_number: c.poNumber || null,
                            vehicle_number: c.vehicleNumber || null,
                            liters: parseFloat(c.liters) || 0,
                            amount: parseFloat(c.amount) || 0,
                            notes: null,
                        });
                    }
                });
            });

            // Add global credit entries (no nozzle_id)
            creditEntries.forEach(c => {
                if (c.companyId && c.amount) {
                    credit_sales.push({
                        account_id: c.companyId,
                        nozzle_id: null,
                        po_number: c.poNumber || null,
                        vehicle_number: c.vehicleNumber || null,
                        liters: 0,
                        amount: parseFloat(c.amount) || 0,
                        notes: 'Global credit entry',
                    });
                }
            });

            // 4. Call the Complete Shift API
            const result = await api.sales.completeShift(currentShift.id, {
                cash_collected: parseFloat(cashCollected) || 0,
                sale_entries,
                card_sales,
                credit_sales,
                notes: null,
            });

            console.log('Shift completed successfully:', result);

            // 5. Save Staff Advances
            let advancesSaved = 0;
            for (const adv of advanceEntries) {
                if (adv.pumperId && adv.amount && parseFloat(adv.amount) > 0) {
                    try {
                        await api.employees.createAdvance({
                            employee_id: adv.pumperId,
                            amount: parseFloat(adv.amount),
                            payment_date: adv.dateTime ? adv.dateTime.split('T')[0] : undefined,
                            payment_time: adv.dateTime ? adv.dateTime.split('T')[1] : undefined,
                            reason: adv.reason || undefined,
                            notes: `Shift: ${currentShift.shift_type} - ${currentShift.shift_date}`,
                        });
                        advancesSaved++;
                    } catch (advErr) {
                        console.error('Failed to save advance:', advErr);
                    }
                }
            }

            // 6. Save Company Expenses
            let expensesSaved = 0;
            for (const exp of expenseEntries) {
                if (exp.category && exp.amount && parseFloat(exp.amount) > 0) {
                    try {
                        await api.expenses.create({
                            category: exp.category,
                            payee: exp.payee || 'Unknown',
                            amount: parseFloat(exp.amount),
                            description: exp.description || undefined,
                            invoice_number: exp.invoiceNumber || undefined,
                            expense_date: currentShift.shift_date,
                            shift_id: currentShift.id,
                            notes: undefined,
                        });
                        expensesSaved++;
                    } catch (expErr) {
                        console.error('Failed to save expense:', expErr);
                    }
                }
            }

            setSubmitSuccess(true);

            // Show success dialog
            setShiftResult({
                sales_count: result.sales_count,
                card_sales_count: result.card_sales_count,
                credit_sales_count: result.credit_sales_count,
                advances_saved: advancesSaved,
                expenses_saved: expensesSaved,
                total_fuel_sales: result.total_fuel_sales,
                total_card_sales: result.total_card_sales,
                total_credit_sales: result.total_credit_sales,
            });
            setShowResultDialog(true);

        } catch (err) {
            console.error('Failed to complete shift:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to complete shift';
            setSubmitError(errorMessage);
            setShiftResult(null);
            setShowResultDialog(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="flex flex-col gap-6 p-6 min-h-screen bg-background">

                {/* Loading Overlay */}
                {isLoading && (
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <span className="text-sm font-medium text-muted-foreground">Loading shift data...</span>
                        </div>
                    </div>
                )}

                {/* Header Section */}
                <div className="flex flex-col md::flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Sales Entry</h1>
                        <p className="text-muted-foreground">Record shift data and payments.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Export Button */}
                        <button
                            onClick={() => {
                                const today = new Date();
                                const thirtyDaysAgo = new Date(today);
                                thirtyDaysAgo.setDate(today.getDate() - 30);
                                const startDate = thirtyDaysAgo.toISOString().split('T')[0];
                                const endDate = today.toISOString().split('T')[0];
                                api.exports.downloadSales(startDate, endDate)
                                    .catch(err => alert(`Export failed: ${err.message}`));
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground bg-card border border-border rounded-md shadow-sm hover:bg-muted transition-colors"
                        >
                            <Download className="h-4 w-4" /> Export CSV
                        </button>

                        {/* Shift Selector */}
                        <div className="flex items-center bg-card border border-border rounded-md p-1 shadow-sm">
                            <button
                                onClick={() => !hasActiveShift && setShift("Day")}
                                disabled={hasActiveShift}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${shift === "Day" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"} ${hasActiveShift ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                <Sun className="h-4 w-4" /> Day
                            </button>
                            <button
                                onClick={() => !hasActiveShift && setShift("Night")}
                                disabled={hasActiveShift}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${shift === "Night" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"} ${hasActiveShift ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                <Moon className="h-4 w-4" /> Night
                            </button>
                        </div>

                        {/* Date Picker (Native Input for now) */}
                        <div className="relative">
                            <input
                                type="date"
                                className="pl-10 pr-3 py-2 border border-input rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                disabled={hasActiveShift}
                            />
                            <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Active Shift Indicator or No Shift Notice */}
                {hasActiveShift && currentShift ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-3">
                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-sm font-medium text-green-800">
                            Active Shift: {currentShift.shift_type === 'day' ? 'Day' : 'Night'} shift on {currentShift.shift_date}
                        </span>
                        <span className="text-xs text-green-600">
                            ID: {currentShift.id.slice(0, 8)}...
                        </span>
                        <a
                            href="/staff"
                            className="ml-auto text-xs font-medium text-green-700 hover:text-green-900 underline underline-offset-2"
                        >
                            End Shift on Staff Page →
                        </a>
                    </div>
                ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-800">
                            No active shift. Start a shift from the <a href="/staff" className="underline font-semibold">Staff page → Daily Shifts</a> tab first.
                        </span>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between">
                        <span className="text-sm text-red-800">{error}</span>
                        <button onClick={clearError} className="text-red-600 hover:text-red-800 text-sm underline">
                            Dismiss
                        </button>
                    </div>
                )}

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
                                        const termLabel = terminals.find((t: Terminal) => t.id === termId)?.label || termId;
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
                                        const compLabel = companies.find((c: Company) => c.id === compId)?.name || compId;
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
                                        const selectedPumper = pumpers.find((p: Pumper) => p.id === entry.pumperId);
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
                                                            {pumpers.map((p: Pumper) => (
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
                            <div className={`border-l-4 rounded-xl shadow-sm overflow-hidden ${isDiscrepancyBad ? "border-l-red-500 border border-red-200 bg-red-50/30" : "border-l-green-500 border border-green-200 bg-green-50/30"}`}>
                                <div className="p-4 border-b border-transparent">
                                    <h3 className="text-base font-semibold flex items-center gap-2">
                                        {isDiscrepancyBad ? <AlertTriangle className="h-5 w-5 text-red-600" /> : <CheckCircle className="h-5 w-5 text-green-600" />}
                                        <span className={isDiscrepancyBad ? "text-red-900" : "text-green-900"}>Reconciliation</span>
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
                                        <span className={`text-xl font-bold ${discrepancy < 0 ? "text-destructive" : "text-emerald-600"}`}>
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
                                    className="w-full py-4 bg-primary text-primary-foreground text-lg font-bold rounded-xl shadow-lg hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    onClick={handleCompleteShift}
                                    disabled={isSubmitting || !hasActiveShift || isLoadingData}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Complete Shift'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6">

                    {/* Nozzle Entry - Single Form Workflow */}
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-foreground">Nozzle Meter Readings</h2>
                            <div className="flex items-center gap-4">
                                <div className="text-sm text-muted-foreground">
                                    {nozzles.filter(n => n.isSubmitted).length} / {nozzles.length} Submitted
                                </div>
                                <button
                                    type="button"
                                    onClick={openAddNozzleModal}
                                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                                >
                                    + Add Nozzle
                                </button>
                            </div>
                        </div>

                        {/* No Nozzles State */}
                        {nozzles.length === 0 ? (
                            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                                <div className="text-muted-foreground mb-4">
                                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                    </svg>
                                    <p className="text-sm font-medium">No nozzles configured yet</p>
                                    <p className="text-xs mt-1">Add nozzles to start recording meter readings</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={openAddNozzleModal}
                                    className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                >
                                    + Add Your First Nozzle
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left Column: Single Entry Form */}
                                <div>
                                    {(() => {
                                        const unsubmittedNozzles = nozzles.filter(n => !n.isSubmitted);

                                        // Find current nozzle: try selected first, fall back to first unsubmitted
                                        let currentNozzle = selectedNozzleId
                                            ? nozzles.find(n => n.id === selectedNozzleId && !n.isSubmitted)
                                            : unsubmittedNozzles[0];

                                        // If selectedNozzleId points to a submitted nozzle, clear it and use first unsubmitted
                                        if (!currentNozzle && unsubmittedNozzles.length > 0) {
                                            currentNozzle = unsubmittedNozzles[0];
                                            // Update selection to match
                                            setTimeout(() => setSelectedNozzleId(unsubmittedNozzles[0].id), 0);
                                        }

                                        // Auto-select first unsubmitted if no selection at all
                                        if (!selectedNozzleId && unsubmittedNozzles.length > 0 && unsubmittedNozzles[0]) {
                                            setTimeout(() => setSelectedNozzleId(unsubmittedNozzles[0].id), 0);
                                        }

                                        if (!currentNozzle && unsubmittedNozzles.length === 0) {
                                            // All nozzles submitted
                                            return (
                                                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                                                    <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
                                                    <h3 className="text-lg font-semibold text-green-800 mb-1">All Nozzle Readings Submitted!</h3>
                                                    <p className="text-sm text-green-600">Review the submitted entries table and complete the shift when ready.</p>
                                                </div>
                                            );
                                        }

                                        if (!currentNozzle) return null;

                                        // Calculate values for current nozzle
                                        const liters = Math.max(0, currentNozzle.endMeterDigital - currentNozzle.startMeter);
                                        const saleValue = liters * currentNozzle.productPrice;
                                        const totalCardAmount = currentNozzle.cardEntries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                                        const totalCreditAmount = currentNozzle.creditEntries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                                        const cashToCollect = saleValue - totalCardAmount - totalCreditAmount;

                                        return (
                                            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                                                {/* Form Header with Nozzle Selector */}
                                                <div className="p-4 border-b border-border bg-muted/30">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-3">
                                                            <label className="text-sm font-medium text-foreground whitespace-nowrap">Select Nozzle:</label>
                                                            <select
                                                                className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                                                                value={currentNozzle.id}
                                                                onChange={(e) => setSelectedNozzleId(e.target.value)}
                                                            >
                                                                {unsubmittedNozzles.map(n => (
                                                                    <option key={n.id} value={n.id}>{n.displayName} ({n.productName})</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">
                                                            {unsubmittedNozzles.length} remaining
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Form Body */}
                                                <div className="p-4 space-y-4">
                                                    {/* Product & Price Info */}
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-muted-foreground">Product:</span>
                                                        <span className="font-medium">{currentNozzle.productName} @ LKR {currentNozzle.productPrice}/L</span>
                                                    </div>

                                                    {/* Pumper Selection */}
                                                    <div>
                                                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Assigned Pumper</label>
                                                        <select
                                                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                                                            value={currentNozzle.pumperId || ""}
                                                            onChange={(e) => handleNozzleChange(currentNozzle.id, "pumperId", e.target.value)}
                                                        >
                                                            <option value="">Select Pumper</option>
                                                            {pumpers.map(p => (
                                                                <option key={p.id} value={p.id}>{p.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Meter Readings Grid */}
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-medium text-muted-foreground">Digital Start (B/F)</label>
                                                            <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                                                                {currentNozzle.startMeter.toFixed(1)}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-medium text-foreground">Digital End Meter *</label>
                                                            <input
                                                                type="number"
                                                                placeholder="0000.0"
                                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                                                                value={currentNozzle.endMeterDigital || ""}
                                                                onChange={(e) => handleNozzleChange(currentNozzle.id, "endMeterDigital", parseFloat(e.target.value) || 0)}
                                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-medium text-muted-foreground">Analog Start (B/F)</label>
                                                            <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                                                                {currentNozzle.startMeter.toFixed(1)}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-medium text-foreground">Analog End Meter</label>
                                                            <input
                                                                type="number"
                                                                placeholder="0000.0"
                                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                                                                value={currentNozzle.endMeterAnalog || ""}
                                                                onChange={(e) => handleNozzleChange(currentNozzle.id, "endMeterAnalog", parseFloat(e.target.value) || 0)}
                                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Calculated Values */}
                                                    <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
                                                        <div>
                                                            <span className="text-xs text-muted-foreground">Liters Sold</span>
                                                            <p className="text-lg font-bold text-foreground">{liters.toFixed(2)}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-xs text-muted-foreground">Sale Value</span>
                                                            <p className="text-lg font-bold text-primary">LKR {saleValue.toLocaleString()}</p>
                                                        </div>
                                                    </div>

                                                    {/* Card Sales Section */}
                                                    <div className="border-t border-border pt-4">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <label className="text-xs font-medium text-muted-foreground">Card Sales (This Nozzle)</label>
                                                            <button onClick={() => addNozzleCardEntry(currentNozzle.id)} className="text-xs text-primary hover:underline">+ Add Card Sale</button>
                                                        </div>
                                                        {currentNozzle.cardEntries.length > 0 && (
                                                            <div className="space-y-2">
                                                                {currentNozzle.cardEntries.map((cardEntry) => (
                                                                    <div key={cardEntry.id} className="flex items-center gap-2 flex-wrap">
                                                                        <select
                                                                            className="flex-1 min-w-[120px] h-9 rounded-md border border-input bg-background px-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                                                                            value={cardEntry.terminalId}
                                                                            onChange={(e) => updateNozzleCardEntry(currentNozzle.id, cardEntry.id, "terminalId", e.target.value)}
                                                                        >
                                                                            <option value="">Terminal</option>
                                                                            {terminals.map((t: Terminal) => (
                                                                                <option key={t.id} value={t.id}>{t.label}</option>
                                                                            ))}
                                                                        </select>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Batch#"
                                                                            className="w-[80px] h-9 rounded-md border border-input bg-background px-2 text-sm"
                                                                            value={cardEntry.batchNumber || ""}
                                                                            onChange={(e) => updateNozzleCardEntry(currentNozzle.id, cardEntry.id, "batchNumber", e.target.value)}
                                                                        />
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Invoice#"
                                                                            className="w-[90px] h-9 rounded-md border border-input bg-background px-2 text-sm"
                                                                            value={cardEntry.invoiceNumber || ""}
                                                                            onChange={(e) => updateNozzleCardEntry(currentNozzle.id, cardEntry.id, "invoiceNumber", e.target.value)}
                                                                        />
                                                                        <input
                                                                            type="datetime-local"
                                                                            placeholder="Invoice Date"
                                                                            className="w-[160px] h-9 rounded-md border border-input bg-background px-2 text-sm"
                                                                            value={cardEntry.invoiceDateTime || ""}
                                                                            onChange={(e) => updateNozzleCardEntry(currentNozzle.id, cardEntry.id, "invoiceDateTime", e.target.value)}
                                                                        />
                                                                        <input
                                                                            type="number"
                                                                            placeholder="Amount"
                                                                            className="w-[100px] h-9 rounded-md border border-input bg-background px-2 text-sm"
                                                                            value={cardEntry.amount || ""}
                                                                            onChange={(e) => updateNozzleCardEntry(currentNozzle.id, cardEntry.id, "amount", e.target.value)}
                                                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                                        />
                                                                        <button
                                                                            onClick={() => removeNozzleCardEntry(currentNozzle.id, cardEntry.id)}
                                                                            className="h-9 w-9 flex items-center justify-center rounded-md border border-input hover:bg-muted text-muted-foreground"
                                                                        >
                                                                            &times;
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Credit Sales Section */}
                                                    <div className="border-t border-border pt-4">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <label className="text-xs font-medium text-muted-foreground">Credit Sales (This Nozzle)</label>
                                                            <button onClick={() => addNozzleCreditEntry(currentNozzle.id)} className="text-xs text-primary hover:underline">+ Add Credit Sale</button>
                                                        </div>
                                                        {currentNozzle.creditEntries.length > 0 && (
                                                            <div className="space-y-2">
                                                                {currentNozzle.creditEntries.map((creditEntry) => (
                                                                    <div key={creditEntry.id} className="flex items-center gap-2 flex-wrap">
                                                                        <select
                                                                            className="flex-1 min-w-[120px] h-9 rounded-md border border-input bg-background px-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                                                                            value={creditEntry.companyId}
                                                                            onChange={(e) => updateNozzleCreditEntry(currentNozzle.id, creditEntry.id, "companyId", e.target.value)}
                                                                        >
                                                                            <option value="">Company</option>
                                                                            {companies.map((c: Company) => (
                                                                                <option key={c.id} value={c.id}>{c.name}</option>
                                                                            ))}
                                                                        </select>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="PO#"
                                                                            className="w-[80px] h-9 rounded-md border border-input bg-background px-2 text-sm"
                                                                            value={creditEntry.poNumber || ""}
                                                                            onChange={(e) => updateNozzleCreditEntry(currentNozzle.id, creditEntry.id, "poNumber", e.target.value)}
                                                                        />
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Vehicle"
                                                                            className="w-[80px] h-9 rounded-md border border-input bg-background px-2 text-sm"
                                                                            value={creditEntry.vehicleNumber || ""}
                                                                            onChange={(e) => updateNozzleCreditEntry(currentNozzle.id, creditEntry.id, "vehicleNumber", e.target.value)}
                                                                        />
                                                                        <input
                                                                            type="number"
                                                                            placeholder="Liters"
                                                                            className="w-[70px] h-9 rounded-md border border-input bg-background px-2 text-sm"
                                                                            value={creditEntry.liters || ""}
                                                                            onChange={(e) => updateNozzleCreditEntry(currentNozzle.id, creditEntry.id, "liters", e.target.value)}
                                                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                                        />
                                                                        <input
                                                                            type="number"
                                                                            placeholder="Amount"
                                                                            className="w-[100px] h-9 rounded-md border border-input bg-background px-2 text-sm"
                                                                            value={creditEntry.amount || ""}
                                                                            onChange={(e) => updateNozzleCreditEntry(currentNozzle.id, creditEntry.id, "amount", e.target.value)}
                                                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                                        />
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Notes"
                                                                            className="w-[100px] h-9 rounded-md border border-input bg-background px-2 text-sm"
                                                                            value={creditEntry.notes || ""}
                                                                            onChange={(e) => updateNozzleCreditEntry(currentNozzle.id, creditEntry.id, "notes", e.target.value)}
                                                                        />
                                                                        <button
                                                                            onClick={() => removeNozzleCreditEntry(currentNozzle.id, creditEntry.id)}
                                                                            className="h-9 w-9 flex items-center justify-center rounded-md border border-input hover:bg-muted text-muted-foreground"
                                                                        >
                                                                            &times;
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Cash to Collect Summary */}
                                                    <div className="bg-muted/40 rounded-lg p-4 flex justify-between items-center">
                                                        <span className="text-sm font-medium text-foreground">Cash to Collect</span>
                                                        <span className={`text-lg font-bold ${cashToCollect < 0 ? "text-red-500" : "text-green-600"}`}>
                                                            LKR {cashToCollect.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    </div>

                                                    {/* Save Error Message */}
                                                    {saveError && (
                                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
                                                            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                                                            <span className="text-sm text-amber-800">{saveError}</span>
                                                        </div>
                                                    )}

                                                    {/* Submit Button */}
                                                    <button
                                                        onClick={() => handleNozzleSubmit(currentNozzle.id)}
                                                        disabled={currentNozzle.endMeterDigital <= currentNozzle.startMeter || isSaving}
                                                        className="w-full h-12 flex items-center justify-center gap-2 text-base font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {isSaving ? (
                                                            <>
                                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                                Saving...
                                                            </>
                                                        ) : (
                                                            <>Submit & Next →</>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Right Column: Submitted Entries Table */}
                                <div>
                                    {nozzles.filter(n => n.isSubmitted).length > 0 ? (
                                        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden h-full">
                                            <div className="p-4 border-b border-border">
                                                <h3 className="text-base font-semibold text-foreground">Submitted Entries</h3>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-muted/50 text-left">
                                                        <tr>
                                                            <th className="px-5 py-3 font-medium text-muted-foreground">Nozzle</th>
                                                            <th className="px-4 py-3 font-medium text-muted-foreground text-right">Liters</th>
                                                            <th className="px-4 py-3 font-medium text-muted-foreground text-right">Total Value</th>
                                                            <th className="px-4 py-3 font-medium text-muted-foreground text-right">Card</th>
                                                            <th className="px-4 py-3 font-medium text-muted-foreground text-right">Credit</th>
                                                            <th className="px-4 py-3 font-medium text-muted-foreground text-right">Cash</th>
                                                            <th className="px-4 py-3 font-medium text-muted-foreground text-center">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border">
                                                        {nozzles.filter(n => n.isSubmitted).map(n => {
                                                            const liters = Math.max(0, n.endMeterDigital - n.startMeter);
                                                            const value = liters * n.productPrice;
                                                            const card = n.cardEntries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                                                            const credit = n.creditEntries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                                                            const cash = value - card - credit;
                                                            return (
                                                                <tr key={n.id} className="hover:bg-muted/30">
                                                                    <td className="px-4 py-3">
                                                                        <div className="font-medium">{n.displayName}</div>
                                                                        <div className="text-xs text-muted-foreground">{n.productName}</div>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right">{liters.toFixed(2)}</td>
                                                                    <td className="px-4 py-3 text-right">{value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                                                    <td className="px-4 py-3 text-right">{card > 0 ? card.toLocaleString() : "-"}</td>
                                                                    <td className="px-4 py-3 text-right">{credit > 0 ? credit.toLocaleString() : "-"}</td>
                                                                    <td className="px-4 py-3 text-right font-medium">{cash.toLocaleString()}</td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <button
                                                                            onClick={() => handleEditEntry(n.id)}
                                                                            className="text-primary hover:underline text-xs mr-2"
                                                                        >
                                                                            Edit
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteEntry(n.id)}
                                                                            className="text-red-600 hover:underline text-xs"
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                    <tfoot className="bg-muted/30 font-medium">
                                                        <tr>
                                                            <td className="px-4 py-3">Total</td>
                                                            <td className="px-4 py-3 text-right">
                                                                {nozzles.filter(n => n.isSubmitted).reduce((acc, n) => acc + Math.max(0, n.endMeterDigital - n.startMeter), 0).toFixed(2)}
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                {nozzles.filter(n => n.isSubmitted).reduce((acc, n) => acc + Math.max(0, n.endMeterDigital - n.startMeter) * n.productPrice, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                {nozzles.filter(n => n.isSubmitted).reduce((acc, n) => acc + n.cardEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0), 0).toLocaleString()}
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                {nozzles.filter(n => n.isSubmitted).reduce((acc, n) => acc + n.creditEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0), 0).toLocaleString()}
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                {nozzles.filter(n => n.isSubmitted).reduce((acc, n) => {
                                                                    const val = Math.max(0, n.endMeterDigital - n.startMeter) * n.productPrice;
                                                                    const card = n.cardEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
                                                                    const credit = n.creditEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
                                                                    return acc + (val - card - credit);
                                                                }, 0).toLocaleString()}
                                                            </td>
                                                            <td></td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-muted/30 border border-dashed border-border rounded-xl p-6 text-center h-full flex flex-col items-center justify-center">
                                            <div className="text-muted-foreground">
                                                <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <p className="text-sm font-medium">No entries submitted yet</p>
                                                <p className="text-xs mt-1">Submit nozzle readings to see them here</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Add Nozzle Modal */}
            {/* ======= Sales History Section ======= */}
            <div className="bg-card border border-border rounded-xl shadow-sm mt-6">
                <div className="p-4 border-b border-border">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-base font-semibold text-foreground">Sales History</h3>
                            <p className="text-sm text-muted-foreground">All recorded sales from the database</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-muted-foreground whitespace-nowrap">From:</label>
                                <input
                                    type="date"
                                    value={salesHistoryFromDate}
                                    onChange={(e) => setSalesHistoryFromDate(e.target.value)}
                                    className="h-8 px-2 text-sm rounded-md border border-input bg-background text-foreground"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-muted-foreground whitespace-nowrap">To:</label>
                                <input
                                    type="date"
                                    value={salesHistoryToDate}
                                    onChange={(e) => setSalesHistoryToDate(e.target.value)}
                                    className="h-8 px-2 text-sm rounded-md border border-input bg-background text-foreground"
                                />
                            </div>
                            <button
                                onClick={async () => {
                                    setSalesHistoryLoading(true);
                                    setSalesHistoryOffset(0);
                                    try {
                                        const response = await api.sales.getSalesHistory({
                                            limit: SALES_HISTORY_LIMIT,
                                            offset: 0,
                                            startDate: salesHistoryFromDate || undefined,
                                            endDate: salesHistoryToDate || undefined,
                                        });
                                        setSalesHistory(response.items);
                                        setSalesHistoryTotal(response.total);
                                    } catch {
                                        console.error('Failed to filter sales history');
                                    } finally {
                                        setSalesHistoryLoading(false);
                                    }
                                }}
                                disabled={salesHistoryLoading}
                                className="h-8 px-3 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                                {salesHistoryLoading ? 'Loading...' : 'Filter'}
                            </button>
                            {(salesHistoryFromDate || salesHistoryToDate) && (
                                <button
                                    onClick={async () => {
                                        setSalesHistoryFromDate('');
                                        setSalesHistoryToDate('');
                                        setSalesHistoryLoading(true);
                                        setSalesHistoryOffset(0);
                                        try {
                                            const response = await api.sales.getSalesHistory({
                                                limit: SALES_HISTORY_LIMIT,
                                                offset: 0,
                                            });
                                            setSalesHistory(response.items);
                                            setSalesHistoryTotal(response.total);
                                        } catch {
                                            console.error('Failed to clear filter');
                                        } finally {
                                            setSalesHistoryLoading(false);
                                        }
                                    }}
                                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    Clear
                                </button>
                            )}
                            <span className="text-xs text-muted-foreground ml-2">
                                {salesHistoryTotal > 0 ? `${salesHistory.length} of ${salesHistoryTotal}` : 'No records'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="p-4">
                    {salesHistoryLoading && salesHistory.length === 0 ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-sm text-muted-foreground">Loading sales history...</span>
                        </div>
                    ) : salesHistory.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p className="text-sm">No sales records found.</p>
                            <p className="text-xs mt-1">Complete a shift with nozzle entries to see history.</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-muted/50">
                                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Shift</th>
                                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Nozzle</th>
                                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Product</th>
                                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Pumper</th>
                                            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Liters</th>
                                            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Amount (LKR)</th>
                                            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Card</th>
                                            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Credit</th>
                                            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Cash</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {salesHistory.map((sale) => (
                                            <tr key={sale.id} className="border-b border-border/50 hover:bg-muted/30">
                                                <td className="px-3 py-2 text-foreground">{sale.shift_date}</td>
                                                <td className="px-3 py-2">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sale.shift_type === 'day' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                                                        {sale.shift_type === 'day' ? 'Day' : 'Night'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-foreground">{sale.nozzle_name || sale.nozzle_id}</td>
                                                <td className="px-3 py-2 text-foreground">{sale.product_name || sale.product_code || '-'}</td>
                                                <td className="px-3 py-2 text-muted-foreground">{sale.employee_name || '-'}</td>
                                                <td className="px-3 py-2 text-right font-mono text-foreground">{Number(sale.liters_sold).toFixed(2)}</td>
                                                <td className="px-3 py-2 text-right font-mono text-foreground">{Number(sale.amount_lkr).toLocaleString()}</td>
                                                <td className="px-3 py-2 text-right font-mono text-muted-foreground">{Number(sale.card_sales_total) > 0 ? Number(sale.card_sales_total).toLocaleString() : '-'}</td>
                                                <td className="px-3 py-2 text-right font-mono text-muted-foreground">{Number(sale.credit_sales_total) > 0 ? Number(sale.credit_sales_total).toLocaleString() : '-'}</td>
                                                <td className="px-3 py-2 text-right font-mono text-green-600">{Number(sale.cash_sales) > 0 ? Number(sale.cash_sales).toLocaleString() : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {salesHistory.length < salesHistoryTotal && (
                                <div className="mt-4 flex justify-center">
                                    <button
                                        onClick={async () => {
                                            setSalesHistoryLoading(true);
                                            try {
                                                const response = await api.sales.getSalesHistory({
                                                    limit: SALES_HISTORY_LIMIT,
                                                    offset: salesHistoryOffset + SALES_HISTORY_LIMIT,
                                                    startDate: salesHistoryFromDate || undefined,
                                                    endDate: salesHistoryToDate || undefined,
                                                });
                                                setSalesHistory([...salesHistory, ...response.items]);
                                                setSalesHistoryOffset(salesHistoryOffset + SALES_HISTORY_LIMIT);
                                            } catch {
                                                console.error('Failed to load more sales history');
                                            } finally {
                                                setSalesHistoryLoading(false);
                                            }
                                        }}
                                        disabled={salesHistoryLoading}
                                        className="px-4 py-2 text-sm border border-input rounded-md hover:bg-muted transition-colors disabled:opacity-50"
                                    >
                                        {salesHistoryLoading ? (
                                            <span className="flex items-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Loading...
                                            </span>
                                        ) : (
                                            `Load More (${salesHistoryTotal - salesHistory.length} remaining)`
                                        )}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            {/* ======= End Sales History Section ======= */}

            {showAddNozzleModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card rounded-xl shadow-xl p-6 w-full max-w-md mx-4 border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Add New Nozzle</h3>

                        <div className="space-y-4">
                            {/* Row 1: Nozzle ID and Display Name */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Nozzle ID *</label>
                                    <input
                                        type="text"
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                                        placeholder="e.g., N-LAD-1"
                                        value={newNozzleData.nozzle_id}
                                        onChange={(e) => setNewNozzleData(prev => ({ ...prev, nozzle_id: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Display Name *</label>
                                    <input
                                        type="text"
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                                        placeholder="e.g., LAD-1"
                                        value={newNozzleData.display_name}
                                        onChange={(e) => setNewNozzleData(prev => ({ ...prev, display_name: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Row 2: Tank and Pump ID */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Tank Name *</label>
                                    <select
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                                        value={newNozzleData.tank_id}
                                        onChange={(e) => {
                                            const tankId = e.target.value;
                                            const selectedTank = availableTanks.find(t => t.id === tankId);
                                            setNewNozzleData(prev => ({
                                                ...prev,
                                                tank_id: tankId,
                                                product_id: selectedTank?.product_id || prev.product_id,
                                            }));
                                        }}
                                    >
                                        <option value="">Select Tank</option>
                                        {availableTanks.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Pump ID</label>
                                    <input
                                        type="text"
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                                        placeholder="e.g., P-LAD-1"
                                        value={newNozzleData.pump_id}
                                        onChange={(e) => setNewNozzleData(prev => ({ ...prev, pump_id: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Row 3: Product (auto-selected based on tank) */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Product (auto-selected from Tank)</label>
                                <select
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                                    value={newNozzleData.product_id}
                                    onChange={(e) => setNewNozzleData(prev => ({ ...prev, product_id: e.target.value }))}
                                >
                                    <option value="">Select Product</option>
                                    {availableProducts.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Row 4: Current Meter Readings */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Current Digital Meter</label>
                                    <input
                                        type="number"
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                                        placeholder="0.00"
                                        value={newNozzleData.digital_meter}
                                        onChange={(e) => setNewNozzleData(prev => ({ ...prev, digital_meter: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Current Analog Meter</label>
                                    <input
                                        type="number"
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                                        placeholder="0.00"
                                        value={newNozzleData.analog_meter}
                                        onChange={(e) => setNewNozzleData(prev => ({ ...prev, analog_meter: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddNozzleModal(false);
                                    setNewNozzleData({ nozzle_id: '', display_name: '', tank_id: '', pump_id: '', product_id: '', digital_meter: '', analog_meter: '' });
                                }}
                                className="px-4 py-2 text-sm rounded-md border border-input text-foreground hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateNozzle}
                                disabled={isCreatingNozzle || !newNozzleData.nozzle_id || !newNozzleData.display_name || !newNozzleData.tank_id || !newNozzleData.product_id}
                                className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isCreatingNozzle ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Nozzle'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Data Recovery Prompt */}
            {showRecoveryPrompt && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card rounded-xl shadow-xl p-6 w-full max-w-md mx-4 border border-border">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <AlertTriangle className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">Resume Previous Session?</h3>
                                <p className="text-sm text-muted-foreground">Found unsaved data from your last session</p>
                            </div>
                        </div>

                        <p className="text-sm text-muted-foreground mb-6">
                            You have {recoveryData?.filter(n => n.isSubmitted).length || 0} nozzle entries saved locally.
                            Would you like to resume where you left off?
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={handleDismissRecovery}
                                className="px-4 py-2 text-sm rounded-md border border-input text-foreground hover:bg-muted transition-colors"
                            >
                                Start Fresh
                            </button>
                            <button
                                onClick={handleAcceptRecovery}
                                className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                                Resume Session
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Shift Completion Result Dialog */}
            <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {shiftResult ? (
                                <>
                                    <CheckCircle className="h-6 w-6 text-green-500" />
                                    <span className="text-green-700">Shift Completed Successfully!</span>
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-6 w-6 text-red-500" />
                                    <span className="text-red-700">Shift Completion Failed</span>
                                </>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            {shiftResult
                                ? "All sales data has been saved to the system."
                                : submitError || "An error occurred while completing the shift."}
                        </DialogDescription>
                    </DialogHeader>

                    {shiftResult && (
                        <div className="space-y-4 py-4">
                            {/* Entries Summary */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="flex justify-between bg-muted/50 p-2 rounded">
                                    <span className="text-muted-foreground">Fuel Sales</span>
                                    <span className="font-medium">{shiftResult.sales_count}</span>
                                </div>
                                <div className="flex justify-between bg-muted/50 p-2 rounded">
                                    <span className="text-muted-foreground">Card Sales</span>
                                    <span className="font-medium">{shiftResult.card_sales_count}</span>
                                </div>
                                <div className="flex justify-between bg-muted/50 p-2 rounded">
                                    <span className="text-muted-foreground">Credit Sales</span>
                                    <span className="font-medium">{shiftResult.credit_sales_count}</span>
                                </div>
                                <div className="flex justify-between bg-muted/50 p-2 rounded">
                                    <span className="text-muted-foreground">Advances</span>
                                    <span className="font-medium">{shiftResult.advances_saved}</span>
                                </div>
                                <div className="flex justify-between bg-muted/50 p-2 rounded">
                                    <span className="text-muted-foreground">Expenses</span>
                                    <span className="font-medium">{shiftResult.expenses_saved}</span>
                                </div>
                            </div>

                            {/* Totals Summary */}
                            <div className="border-t pt-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Total Fuel Sales</span>
                                    <span className="font-semibold">LKR {shiftResult.total_fuel_sales.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Total Card Sales</span>
                                    <span className="font-semibold">LKR {shiftResult.total_card_sales.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Total Credit Sales</span>
                                    <span className="font-semibold">LKR {shiftResult.total_credit_sales.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            onClick={() => {
                                setShowResultDialog(false);
                                if (shiftResult) {
                                    // Clear local storage and optionally refresh page
                                    if (currentShift?.id) {
                                        clearNozzlesFromLocal(currentShift.id);
                                    }
                                    window.location.reload();
                                }
                            }}
                            className={shiftResult ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                        >
                            {shiftResult ? "Done" : "Close"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
