/**
 * useMonthlyAttendance Hook
 * Fetches monthly attendance data for all employees
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import type { MonthlyAttendance } from '@/lib/api/types';

interface UseMonthlyAttendanceState {
    data: MonthlyAttendance[] | null;
    isLoading: boolean;
    error: string | null;
}

export function useMonthlyAttendance(year: number, month: number) {
    const [state, setState] = useState<UseMonthlyAttendanceState>({
        data: null,
        isLoading: false,
        error: null,
    });

    const fetchData = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        try {
            const data = await api.employees.getMonthlyAttendance(year, month);
            setState({
                data,
                isLoading: false,
                error: null,
            });
        } catch (err: any) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: err.detail || err.message || 'Failed to fetch attendance',
            }));
        }
    }, [year, month]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        ...state,
        refetch: fetchData,
    };
}
