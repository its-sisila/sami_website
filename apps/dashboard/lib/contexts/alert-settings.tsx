"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api/client';
import type { StationSettings as ApiStationSettings } from '@/lib/api/types';
import { useAuth } from '@/contexts/AuthContext';

// Default threshold values
const DEFAULT_LATE_THRESHOLD_MINUTES = 10;
const DEFAULT_EARLY_THRESHOLD_MINUTES = 30;

// LocalStorage key (for fallback when API is unavailable)
const ALERT_SETTINGS_KEY = 'sami_alert_settings';

interface AlertSettings {
    lateArrivalThreshold: number; // minutes after shift start to be considered late
    earlyDepartureThreshold: number; // minutes before shift end to be considered early departure
}

interface AlertSettingsContextType {
    settings: AlertSettings;
    updateSettings: (newSettings: Partial<AlertSettings>) => Promise<void>;
    isLoading: boolean;
}

const defaultSettings: AlertSettings = {
    lateArrivalThreshold: DEFAULT_LATE_THRESHOLD_MINUTES,
    earlyDepartureThreshold: DEFAULT_EARLY_THRESHOLD_MINUTES,
};

const AlertSettingsContext = createContext<AlertSettingsContextType | undefined>(undefined);

// Fetch function for SWR
const fetchSettings = async (): Promise<ApiStationSettings> => {
    return api.stations.getSettings();
};

export function AlertSettingsProvider({ children }: { children: ReactNode }) {
    const { user, isLoading: authLoading } = useAuth();
    const shouldFetch = user && !authLoading;

    // Use SWR to fetch settings from API
    const { data: apiSettings, error, mutate, isLoading } = useSWR<ApiStationSettings>(
        shouldFetch ? '/stations/settings' : null,
        fetchSettings,
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000, // Cache for 1 minute
        }
    );

    // Initialize from localStorage explicitly on mount (bypasses SSR mismatch by doing this mostly on client-side state)
    const [localSettings, setLocalSettings] = useState<AlertSettings>(() => {
        if (typeof window === 'undefined') return defaultSettings;
        try {
            const stored = localStorage.getItem(ALERT_SETTINGS_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return {
                    lateArrivalThreshold: parsed.lateArrivalThreshold ?? DEFAULT_LATE_THRESHOLD_MINUTES,
                    earlyDepartureThreshold: parsed.earlyDepartureThreshold ?? DEFAULT_EARLY_THRESHOLD_MINUTES,
                };
            }
        } catch (err) {
            console.error('Failed to load alert settings from localStorage:', err);
        }
        return defaultSettings;
    });

    // Derive settings from API (if available) or localStorage
    const settings: AlertSettings = apiSettings
        ? {
            lateArrivalThreshold: apiSettings.late_arrival_threshold,
            earlyDepartureThreshold: apiSettings.early_departure_threshold,
        }
        : localSettings;

    // Update settings (tries API first, falls back to localStorage)
    const updateSettings = useCallback(async (newSettings: Partial<AlertSettings>) => {
        const updatedSettings = { ...settings, ...newSettings };

        // Update localStorage immediately for responsiveness
        setLocalSettings(updatedSettings);
        try {
            localStorage.setItem(ALERT_SETTINGS_KEY, JSON.stringify(updatedSettings));
        } catch (err) {
            console.error('Failed to save to localStorage:', err);
        }

        // Try to update via API
        try {
            await api.stations.updateSettings({
                late_arrival_threshold: updatedSettings.lateArrivalThreshold,
                early_departure_threshold: updatedSettings.earlyDepartureThreshold,
            });
            // Revalidate SWR cache
            mutate();
        } catch (err) {
            console.error('Failed to save settings to API, using localStorage:', err);
            // API failed, but localStorage is already updated as fallback
        }
    }, [settings, mutate]);

    return (
        <AlertSettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
            {children}
        </AlertSettingsContext.Provider>
    );
}

export function useAlertSettings() {
    const context = useContext(AlertSettingsContext);
    if (context === undefined) {
        // Return defaults if context not available (for SSR or outside provider)
        return {
            settings: defaultSettings,
            updateSettings: async () => { },
            isLoading: false,
        };
    }
    return context;
}

// Export defaults for reference
export { DEFAULT_LATE_THRESHOLD_MINUTES, DEFAULT_EARLY_THRESHOLD_MINUTES };
