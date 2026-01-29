"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallbackTitle?: string;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary component for catching JavaScript errors in child components.
 * Displays a fallback UI with a retry button.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error to console for debugging
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center p-8 min-h-[200px] border rounded-lg bg-muted/30">
                    <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                        {this.props.fallbackTitle || "Something went wrong"}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                        An error occurred while loading this section.
                        Please try again or contact support if the problem persists.
                    </p>
                    {this.state.error && (
                        <details className="mb-4 text-xs text-muted-foreground max-w-md">
                            <summary className="cursor-pointer">Technical details</summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                                {this.state.error.message}
                            </pre>
                        </details>
                    )}
                    <Button onClick={this.handleRetry} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
