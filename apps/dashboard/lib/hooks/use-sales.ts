/**
 * Sales API Hooks
 * React hooks for managing shifts and sales entries via the API
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import type { Shift, Sale, ShiftType, SaleEntryCreate, ShiftSummary } from '@/lib/api/types';

interface UseSalesState {
    currentShift: Shift | null;
    sales: Sale[];
    summary: ShiftSummary | null;
    isLoading: boolean;
    error: string | null;
}

export function useSales() {
    const [state, setState] = useState<UseSalesState>({
        currentShift: null,
        sales: [],
        summary: null,
        isLoading: false,
        error: null,
    });

    /**
     * Fetch the current open shift
     */
    const fetchCurrentShift = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        try {
            const shift = await api.sales.getCurrentShift();
            setState(prev => ({
                ...prev,
                currentShift: shift,
                isLoading: false
            }));

            // If there's a shift, fetch its sales
            if (shift) {
                const sales = await api.sales.getShiftSales(shift.id);
                setState(prev => ({ ...prev, sales }));
            }

            return shift;
        } catch (err: any) {
            setState(prev => ({
                ...prev,
                error: err.detail || err.message || 'Failed to fetch shift',
                isLoading: false
            }));
            return null;
        }
    }, []);

    /**
     * Start a new shift
     */
    const startShift = useCallback(async (
        shiftType: ShiftType,
        shiftDate?: string,
        notes?: string
    ) => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        try {
            const shift = await api.sales.startShift({
                shift_type: shiftType,
                shift_date: shiftDate,
                notes,
            });
            setState(prev => ({
                ...prev,
                currentShift: shift,
                sales: [],
                isLoading: false
            }));
            return shift;
        } catch (err: any) {
            const errorMessage = err.detail || err.message || 'Failed to start shift';
            setState(prev => ({
                ...prev,
                error: errorMessage,
                isLoading: false
            }));
            throw new Error(errorMessage);
        }
    }, []);

    /**
     * End/close the current shift
     */
    const endShift = useCallback(async (notes?: string) => {
        if (!state.currentShift) {
            throw new Error('No active shift to end');
        }

        setState(prev => ({ ...prev, isLoading: true, error: null }));
        try {
            await api.sales.endShift({
                shift_id: state.currentShift.id,
                notes,
            });
            // Clear the current shift after closing
            setState(prev => ({
                ...prev,
                currentShift: null,
                sales: [],
                summary: null,
                isLoading: false
            }));
        } catch (err: any) {
            const errorMessage = err.detail || err.message || 'Failed to end shift';
            setState(prev => ({
                ...prev,
                error: errorMessage,
                isLoading: false
            }));
            throw new Error(errorMessage);
        }
    }, [state.currentShift]);

    /**
     * Record a sale entry for a nozzle
     */
    const recordSaleEntry = useCallback(async (data: Omit<SaleEntryCreate, 'shift_id'>) => {
        if (!state.currentShift) {
            throw new Error('No active shift');
        }

        try {
            const sale = await api.sales.recordSaleEntry({
                ...data,
                shift_id: state.currentShift.id,
            });

            // Update sales list
            setState(prev => ({
                ...prev,
                sales: [...prev.sales, sale],
            }));

            return sale;
        } catch (err: any) {
            const errorMessage = err.detail || err.message || 'Failed to record sale';
            setState(prev => ({ ...prev, error: errorMessage }));
            throw new Error(errorMessage);
        }
    }, [state.currentShift]);

    /**
     * Get shift summary with totals
     */
    const getShiftSummary = useCallback(async (shiftId?: string) => {
        const id = shiftId || state.currentShift?.id;
        if (!id) {
            throw new Error('No shift ID');
        }

        try {
            const summary = await api.sales.getShiftSummary(id);
            setState(prev => ({ ...prev, summary }));
            return summary;
        } catch (err: any) {
            const errorMessage = err.detail || err.message || 'Failed to get summary';
            setState(prev => ({ ...prev, error: errorMessage }));
            throw new Error(errorMessage);
        }
    }, [state.currentShift]);

    /**
     * Clear error state
     */
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    // Initial load
    useEffect(() => {
        fetchCurrentShift();
    }, [fetchCurrentShift]);

    return {
        // State
        currentShift: state.currentShift,
        sales: state.sales,
        summary: state.summary,
        isLoading: state.isLoading,
        error: state.error,
        hasActiveShift: state.currentShift?.status === 'open',

        // Actions
        fetchCurrentShift,
        startShift,
        endShift,
        recordSaleEntry,
        getShiftSummary,
        clearError,
    };
}

/**
 * Calculate totals from sales entries
 */
export function calculateTotals(sales: Sale[]) {
    return {
        totalLiters: sales.reduce((sum, s) => sum + Number(s.liters_sold), 0),
        totalAmount: sales.reduce((sum, s) => sum + Number(s.amount_lkr), 0),
        salesCount: sales.length,
    };
}
