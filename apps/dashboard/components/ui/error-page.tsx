"use client";

/**
 * Reusable Error Page Component
 * Displays formatted error messages for various error scenarios
 */

import { Button } from "@/components/ui/button";
import {
    AlertTriangle,
    ServerCrash,
    FileQuestion,
    ShieldAlert,
    WifiOff,
    Home,
    ArrowLeft,
    RefreshCw
} from "lucide-react";
import Link from "next/link";

export interface ErrorPageProps {
    title?: string;
    message?: string;
    statusCode?: number;
    showRetry?: boolean;
    onRetry?: () => void;
    showHome?: boolean;
    showBack?: boolean;
    icon?: "alert" | "server" | "notfound" | "forbidden" | "network";
}

const icons = {
    alert: AlertTriangle,
    server: ServerCrash,
    notfound: FileQuestion,
    forbidden: ShieldAlert,
    network: WifiOff,
};

export function ErrorPage({
    title = "Something went wrong",
    message = "An unexpected error occurred. Please try again later.",
    statusCode,
    showRetry = false,
    onRetry,
    showHome = true,
    showBack = false,
    icon = "alert",
}: ErrorPageProps) {
    const Icon = icons[icon];

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <div className="w-full max-w-md text-center">
                {/* Icon */}
                <div className="mb-6 flex justify-center">
                    <div className="rounded-full bg-destructive/10 p-6">
                        <Icon className="h-16 w-16 text-destructive" />
                    </div>
                </div>

                {/* Status Code */}
                {statusCode && (
                    <div className="mb-2 text-6xl font-bold text-muted-foreground/30">
                        {statusCode}
                    </div>
                )}

                {/* Title */}
                <h1 className="mb-3 text-2xl font-bold text-foreground">
                    {title}
                </h1>

                {/* Message */}
                <p className="mb-8 text-sm text-muted-foreground">
                    {message}
                </p>

                {/* Actions */}
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                    {showRetry && onRetry && (
                        <Button
                            onClick={onRetry}
                            variant="default"
                            className="w-full sm:w-auto"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Try Again
                        </Button>
                    )}

                    {showHome && (
                        <Link href="/dashboard" className="w-full sm:w-auto">
                            <Button variant="outline" className="w-full">
                                <Home className="mr-2 h-4 w-4" />
                                Go to Dashboard
                            </Button>
                        </Link>
                    )}

                    {showBack && (
                        <Button
                            variant="outline"
                            onClick={() => window.history.back()}
                            className="w-full sm:w-auto"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Go Back
                        </Button>
                    )}
                </div>

                {/* Additional Help */}
                <div className="mt-8 text-xs text-muted-foreground">
                    <p>
                        If this problem persists, please contact support.
                    </p>
                </div>
            </div>
        </div>
    );
}
