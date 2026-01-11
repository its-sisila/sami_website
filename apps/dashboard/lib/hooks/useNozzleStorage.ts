/**
 * Custom hook for storing nozzle submission data in localStorage
 * Provides backup persistence in case API calls fail or page is refreshed
 */

const STORAGE_KEY_PREFIX = 'sami_nozzle_data_';

export interface LocalNozzleData {
    id: string;
    displayName: string;
    productName: string;
    productPrice: number;
    startMeter: number;
    endMeterDigital: number;
    endMeterAnalog: number;
    pumperId?: string;
    isSubmitted: boolean;
    cardEntries: Array<{
        id: string;
        terminalId: string;
        batchNumber: string;
        amount: string;
        invoiceNumber: string;
        invoiceDateTime: string;
    }>;
    creditEntries: Array<{
        id: string;
        companyId: string;
        poNumber: string;
        vehicleNumber: string;
        liters: string;
        amount: string;
        notes: string;
    }>;
}

export interface StoredShiftData {
    shiftId: string;
    savedAt: string;
    nozzles: LocalNozzleData[];
}

/**
 * Save nozzle data to localStorage for a specific shift
 */
export function saveNozzlesToLocal(shiftId: string, nozzles: LocalNozzleData[]): void {
    if (typeof window === 'undefined') return;

    const data: StoredShiftData = {
        shiftId,
        savedAt: new Date().toISOString(),
        nozzles,
    };

    try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${shiftId}`, JSON.stringify(data));
    } catch (error) {
        console.warn('Failed to save to localStorage:', error);
    }
}

/**
 * Load nozzle data from localStorage for a specific shift
 */
export function loadNozzlesFromLocal(shiftId: string): StoredShiftData | null {
    if (typeof window === 'undefined') return null;

    try {
        const data = localStorage.getItem(`${STORAGE_KEY_PREFIX}${shiftId}`);
        if (!data) return null;
        return JSON.parse(data) as StoredShiftData;
    } catch (error) {
        console.warn('Failed to load from localStorage:', error);
        return null;
    }
}

/**
 * Clear localStorage data for a specific shift (call after shift is completed)
 */
export function clearNozzlesFromLocal(shiftId: string): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}${shiftId}`);
    } catch (error) {
        console.warn('Failed to clear localStorage:', error);
    }
}

/**
 * Check if there's unsaved/recoverable data for a shift
 */
export function hasLocalNozzleData(shiftId: string): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}${shiftId}`) !== null;
}

/**
 * Get all stored shift data keys (for cleanup purposes)
 */
export function getAllStoredShiftIds(): string[] {
    if (typeof window === 'undefined') return [];

    const ids: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_KEY_PREFIX)) {
            ids.push(key.replace(STORAGE_KEY_PREFIX, ''));
        }
    }
    return ids;
}
