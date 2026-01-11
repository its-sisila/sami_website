import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Retry options for withRetry utility
 */
interface RetryOptions {
    /** Maximum number of retry attempts (default: 3) */
    maxRetries?: number;
    /** Base delay in ms between retries (default: 1000) */
    baseDelay?: number;
    /** Whether to use exponential backoff (default: true) */
    exponentialBackoff?: boolean;
    /** Optional callback when retry occurs */
    onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Retry a failed async operation with optional exponential backoff.
 * 
 * @example
 * ```ts
 * const result = await withRetry(() => api.settlements.create(data), { maxRetries: 3 });
 * ```
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxRetries = 3,
        baseDelay = 1000,
        exponentialBackoff = true,
        onRetry
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt < maxRetries) {
                // Calculate delay with optional exponential backoff
                const delay = exponentialBackoff
                    ? baseDelay * Math.pow(2, attempt)
                    : baseDelay;

                // Call onRetry callback if provided
                if (onRetry) {
                    onRetry(attempt + 1, lastError);
                }

                // Wait before next retry
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // All retries exhausted - throw the last error
    throw lastError;
}
