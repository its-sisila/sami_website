"use client";

/**
 * Backend Connection Error Page
 * Displays when the backend API server is unreachable
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ServerCrash, WifiOff, RefreshCw, AlertCircle } from "lucide-react";

interface BackendErrorProps {
    onRetry: () => void;
    isRetrying?: boolean;
}

export function BackendError({ onRetry, isRetrying = false }: BackendErrorProps) {
    const [countdown, setCountdown] = useState(30);

    useEffect(() => {
        // Auto-retry countdown
        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    onRetry();
                    return 30;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [onRetry]);

    return (
        <div className="flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-gradient-to-br from-background via-background to-muted/20 p-4 sm:p-6 md:p-8">
            <div className="w-full max-w-lg space-y-6">
                {/* Animated Icon */}
                <div className="flex justify-center">
                    <div className="relative">
                        <div className="absolute inset-0 animate-ping rounded-full bg-destructive/20" />
                        <div className="relative rounded-full bg-destructive/10 p-6 sm:p-8">
                            <ServerCrash className="h-16 w-16 text-destructive sm:h-20 sm:w-20" />
                        </div>
                    </div>
                </div>

                {/* Title */}
                <h1 className="break-words text-center text-2xl font-bold text-foreground sm:text-3xl">
                    Backend Server Unavailable
                </h1>

                {/* Message */}
                <p className="break-words text-center text-sm text-muted-foreground sm:text-base">
                    Unable to connect to the SAMI backend server. Please contact system admin{' '}
                    <a
                        href="mailto:contact@getsami.app"
                        className="text-primary underline-offset-4 hover:underline"
                    >
                        contact@getsami.app
                    </a>
                </p>

                {/* Status Card */}
                <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
                    <div className="mb-4 flex items-start gap-3">
                        <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                        <div className="min-w-0 flex-1">
                            <h3 className="mb-1 font-semibold text-foreground">
                                Connection Failed
                            </h3>
                            <p className="break-words text-xs text-muted-foreground sm:text-sm">
                                The dashboard cannot reach the API server. This could be because:
                            </p>
                        </div>
                    </div>

                    <ul className="ml-4 space-y-2 text-xs text-muted-foreground sm:ml-8 sm:text-sm">
                        <li className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
                            <span className="break-words">The backend server is not running</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
                            <span className="break-words">The server is starting up (please wait)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
                            <span className="break-words">Network connectivity issues</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
                            <span className="break-words">Incorrect API URL configuration</span>
                        </li>
                    </ul>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <Button
                        onClick={onRetry}
                        disabled={isRetrying}
                        className="w-full"
                        size="lg"
                    >
                        {isRetrying ? (
                            <>
                                <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                                Connecting...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2 h-5 w-5" />
                                Retry Connection
                            </>
                        )}
                    </Button>

                    {/* Auto-retry Countdown */}
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground sm:text-sm">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span className="break-words">
                            Auto-retry in {countdown} second{countdown !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
