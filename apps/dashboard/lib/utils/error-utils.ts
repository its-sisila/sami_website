/**
 * Error Handling Utilities
 * Centralized error handling and user-friendly error message generation
 */

import { toast } from 'sonner';
import {
    isNetworkError,
    isAuthenticationError,
    isAuthorizationError,
    isValidationError,
    isNotFoundError,
    isServerError,
    isApiError,
    NetworkError,
    ApiError,
} from '@/lib/api/error-types';

/**
 * Extract user-friendly error message from any error type
 */
export function getErrorMessage(error: unknown): string {
    // Network errors
    if (isNetworkError(error)) {
        return error.message || 'Unable to connect to the server. Please check your network connection.';
    }

    // Authentication errors
    if (isAuthenticationError(error)) {
        return error.detail || error.message || 'Your session has expired. Please log in again.';
    }

    // Authorization errors
    if (isAuthorizationError(error)) {
        return error.detail || error.message || 'You do not have permission to perform this action.';
    }

    // Validation errors
    if (isValidationError(error)) {
        if (error.errors) {
            const firstError = Object.values(error.errors)[0];
            return firstError?.[0] || error.message;
        }
        return error.detail || error.message || 'Invalid data provided.';
    }

    // Not found errors
    if (isNotFoundError(error)) {
        return error.detail || error.message || 'The requested resource was not found.';
    }

    // Server errors
    if (isServerError(error)) {
        return error.detail || error.message || 'A server error occurred. Please try again later.';
    }

    // Generic API errors
    if (isApiError(error)) {
        return error.detail || error.message || 'An error occurred.';
    }

    // Standard Error object
    if (error instanceof Error) {
        return error.message;
    }

    // Fallback for unknown errors
    if (typeof error === 'string') {
        return error;
    }

    return 'An unexpected error occurred.';
}

/**
 * Parse API error response and create appropriate error object
 */
export function parseApiError(response: Response, errorData?: any): ApiError | NetworkError {
    const status = response.status;
    const detail = errorData?.detail || response.statusText;

    // Map status codes to specific error types
    switch (status) {
        case 401:
            return new (require('@/lib/api/error-types').AuthenticationError)(
                'Authentication failed',
                detail
            );
        case 403:
            return new (require('@/lib/api/error-types').AuthorizationError)(
                'Access denied',
                detail
            );
        case 404:
            return new (require('@/lib/api/error-types').NotFoundError)(
                'Resource not found',
                detail
            );
        case 422:
            return new (require('@/lib/api/error-types').ValidationError)(
                'Validation failed',
                detail,
                errorData?.errors
            );
        case 500:
        case 502:
        case 503:
        case 504:
            return new (require('@/lib/api/error-types').ServerError)(
                'Server error',
                detail
            );
        default:
            return new ApiError(status, detail || 'An error occurred', detail);
    }
}

/**
 * Determine if an error should be retried
 */
export function shouldRetry(error: unknown, attemptCount: number = 0): boolean {
    const maxRetries = 3;

    if (attemptCount >= maxRetries) {
        return false;
    }

    // Retry network errors
    if (isNetworkError(error)) {
        return true;
    }

    // Retry server errors (5xx)
    if (isServerError(error)) {
        return true;
    }

    // Retry rate limiting (429)
    if (isApiError(error) && error.statusCode === 429) {
        return true;
    }

    // Don't retry client errors (4xx) except rate limiting
    return false;
}

/**
 * Handle API errors with toast notifications
 */
export function handleApiError(error: unknown, customMessage?: string): void {
    const message = customMessage || getErrorMessage(error);

    // Special handling for authentication errors
    if (isAuthenticationError(error)) {
        toast.error('Session Expired', {
            description: message,
            action: {
                label: 'Log In',
                onClick: () => {
                    window.location.href = '/login';
                },
            },
        });
        return;
    }

    // Special handling for authorization errors
    if (isAuthorizationError(error)) {
        toast.error('Access Denied', {
            description: message,
        });
        return;
    }

    // Network errors
    if (isNetworkError(error)) {
        toast.error('Connection Error', {
            description: message,
        });
        return;
    }

    // Validation errors
    if (isValidationError(error)) {
        toast.error('Validation Error', {
            description: message,
        });
        return;
    }

    // Generic error toast
    toast.error('Error', {
        description: message,
    });
}

/**
 * Check if error is a network/connection error
 */
export function isConnectionError(error: unknown): boolean {
    if (isNetworkError(error)) {
        return true;
    }

    // Check for fetch errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
        return true;
    }

    // Check for network-related error messages
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
            message.includes('network') ||
            message.includes('fetch') ||
            message.includes('connection') ||
            message.includes('timeout')
        );
    }

    return false;
}

/**
 * Get retry delay based on attempt count (exponential backoff)
 */
export function getRetryDelay(attemptCount: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 10000; // 10 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attemptCount), maxDelay);
    return delay;
}
