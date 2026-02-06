/**
 * SWR hook for fetching live pricing data
 */

import useSWR from 'swr';
import api from '@/lib/api/client';

interface PricingData {
    mogas_92_average: number | null;
    gasoil_average: number | null;
    exchange_rate: number | null;
    last_updated: string | null;
    period_days: number;
    data_source: string;
}

export function usePricingData() {
    const { data, error, isLoading, mutate } = useSWR<PricingData>(
        '/pricing/latest',
        api.pricing.getLatest,
        {
            refreshInterval: 0, // Don't auto-refresh (data changes daily)
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        }
    );

    return {
        pricingData: data,
        isLoading,
        error,
        refresh: mutate,
    };
}
