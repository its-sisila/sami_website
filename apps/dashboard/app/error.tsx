"use client";

/**
 * Root Error Boundary
 * Catches and displays runtime errors at the application level
 */

import { useEffect } from "react";
import { ErrorPage } from "@/components/ui/error-page";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log error to console for debugging
        console.error("Application error:", error);
    }, [error]);

    return (
        <ErrorPage
            title="Something Went Wrong"
            message={
                process.env.NODE_ENV === "development"
                    ? error.message
                    : "An unexpected error occurred. Our team has been notified."
            }
            statusCode={500}
            icon="server"
            showRetry
            onRetry={reset}
            showHome
        />
    );
}
