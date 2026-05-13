'use client';

/**
 * Backend Connection Context
 * Manages backend API connection status with health checks and auto-retry
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { api } from '@/lib/api/client';
import { BackendError } from '@/components/ui/backend-error';

type ConnectionStatus = 'connected' | 'disconnected' | 'checking';

// Number of consecutive health-check failures required before showing the error page.
// This prevents a single transient network hiccup from hijacking the entire UI during demos.
const FAILURE_THRESHOLD = 3;

interface BackendConnectionContextType {
    status: ConnectionStatus;
    isConnected: boolean;
    checkConnection: () => Promise<void>;
}

const BackendConnectionContext = createContext<BackendConnectionContextType | undefined>(undefined);

interface BackendConnectionProviderProps {
    children: ReactNode;
}

export function BackendConnectionProvider({ children }: BackendConnectionProviderProps) {
    const [status, setStatus] = useState<ConnectionStatus>('checking');
    const [isRetrying, setIsRetrying] = useState(false);
    const consecutiveFailures = useRef(0);

    /**
     * Check backend connection
     */
    const checkConnection = useCallback(async () => {
        // Defer state update to avoid updating during render
        setTimeout(() => {
            setStatus('checking');
            setIsRetrying(true);
        }, 0);

        try {
            await api.health.check();

            consecutiveFailures.current = 0;
            setStatus('connected');
            console.log('[Backend Connection] Connected to backend server');
        } catch (error) {
            consecutiveFailures.current += 1;
            console.error(
                `[Backend Connection] Health check failed (${consecutiveFailures.current}/${FAILURE_THRESHOLD}):`,
                error,
            );
            // Only show the full-page error after multiple consecutive failures
            if (consecutiveFailures.current >= FAILURE_THRESHOLD) {
                setStatus('disconnected');
            }
        } finally {
            setIsRetrying(false);
        }
    }, []);

    /**
     * Initial connection check on mount
     */
    useEffect(() => {
        checkConnection();
    }, [checkConnection]);

    /**
     * Periodic health check (every 60 seconds) when connected
     */
    useEffect(() => {
        if (status !== 'connected') {
            return;
        }

        const interval = setInterval(async () => {
            try {
                await api.health.check();
                consecutiveFailures.current = 0;
            } catch (error) {
                consecutiveFailures.current += 1;
                console.warn(
                    `[Backend Connection] Periodic check failed (${consecutiveFailures.current}/${FAILURE_THRESHOLD})`,
                );
                if (consecutiveFailures.current >= FAILURE_THRESHOLD) {
                    setStatus('disconnected');
                }
            }
        }, 60000); // 60 seconds — longer interval to reduce noise during demos

        return () => clearInterval(interval);
    }, [status]);

    const value: BackendConnectionContextType = {
        status,
        isConnected: status === 'connected',
        checkConnection,
    };

    // Show backend error page when disconnected
    if (status === 'disconnected') {
        return <BackendError onRetry={checkConnection} isRetrying={isRetrying} />;
    }

    // Show loading state during initial check
    if (status === 'checking') {
        return (
            <div className="flex min-h-screen w-full items-center justify-center bg-background">
                <div className="text-center">
                    <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Connecting to server...</p>
                </div>
            </div>
        );
    }

    // Render children when connected
    return (
        <BackendConnectionContext.Provider value={value}>
            {children}
        </BackendConnectionContext.Provider>
    );
}

/**
 * Hook to use backend connection context
 */
export function useBackendConnection() {
    const context = useContext(BackendConnectionContext);
    if (context === undefined) {
        throw new Error('useBackendConnection must be used within a BackendConnectionProvider');
    }
    return context;
}
