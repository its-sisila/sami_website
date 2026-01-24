/**
 * Loading Skeleton Components
 * Provides skeleton loaders for various UI elements during data fetching
 */

import { cn } from "@/lib/utils";
import { CSSProperties } from "react";

interface SkeletonProps {
    className?: string;
    style?: CSSProperties;
}

/**
 * Generic skeleton component
 */
export function Skeleton({ className, style }: SkeletonProps) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-md bg-muted",
                className
            )}
            style={style}
        />
    );
}

/**
 * Table skeleton loader
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex gap-4">
                <Skeleton className="h-10 w-full" />
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex gap-4">
                    <Skeleton className="h-16 w-full" />
                </div>
            ))}
        </div>
    );
}

/**
 * Card skeleton loader
 */
export function CardSkeleton({ count = 1 }: { count?: number }) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-6">
                    <Skeleton className="mb-4 h-6 w-1/2" />
                    <Skeleton className="mb-2 h-10 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                </div>
            ))}
        </div>
    );
}

/**
 * Form skeleton loader
 */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
    return (
        <div className="space-y-6">
            {Array.from({ length: fields }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ))}
            <Skeleton className="h-10 w-32" />
        </div>
    );
}

/**
 * Dashboard stats skeleton
 */
export function StatsSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-6">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-4 rounded" />
                    </div>
                    <Skeleton className="mt-4 h-8 w-32" />
                    <Skeleton className="mt-2 h-3 w-20" />
                </div>
            ))}
        </div>
    );
}

/**
 * List skeleton loader
 */
export function ListSkeleton({ items = 5 }: { items?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: items }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * Chart skeleton loader
 */
export function ChartSkeleton() {
    const heights = ['60%', '80%', '50%', '70%', '90%', '65%'];

    return (
        <div className="rounded-lg border border-border bg-card p-6">
            <Skeleton className="mb-6 h-6 w-48" />
            <div className="flex items-end gap-2" style={{ height: '200px' }}>
                {heights.map((height, i) => (
                    <Skeleton
                        key={i}
                        className="w-full"
                        style={{ height }}
                    />
                ))}
            </div>
        </div>
    );
}

