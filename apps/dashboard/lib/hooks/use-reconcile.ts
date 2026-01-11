import useSWR from 'swr';
import { api } from '@/lib/api/client';
import type { ReconciliationStats, WeeklySalesStat } from '@/lib/api/types';

export function useReconciliation(date: string, range: string) {
    const { data, error, isLoading, mutate } = useSWR<ReconciliationStats>(
        `/sales/reconciliation?date=${date}&range=${range}`,
        () => api.sales.getReconciliation(date, range)
    );

    return {
        stats: data,
        isLoading,
        isError: error,
        mutate,
    };
}

export function useSalesChart(startDate: string, endDate: string) {
    const { data, error, isLoading } = useSWR<WeeklySalesStat[]>(
        `/sales/chart/weekly?start_date=${startDate}&end_date=${endDate}`,
        () => api.sales.getWeeklySalesChart(startDate, endDate)
    );

    return {
        chartData: data,
        isChartLoading: isLoading,
        isChartError: error,
    };
}
