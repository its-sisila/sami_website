/**
 * Custom Error Types for API Client
 * Provides specific error classes for different failure scenarios
 */

/**
 * Base API Error class
 */
export class ApiError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public detail?: string
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * Network Error - when backend is unreachable or network fails
 */
export class NetworkError extends Error {
    constructor(
        public message: string = 'Unable to connect to the server',
        public originalError?: Error
    ) {
        super(message);
        this.name = 'NetworkError';
    }
}

/**
 * Authentication Error - when user credentials are invalid or token expired
 */
export class AuthenticationError extends ApiError {
    constructor(message: string = 'Authentication failed', detail?: string) {
        super(401, message, detail);
        this.name = 'AuthenticationError';
    }
}

/**
 * Authorization Error - when user lacks permission for an action
 */
export class AuthorizationError extends ApiError {
    constructor(message: string = 'Access denied', detail?: string) {
        super(403, message, detail);
        this.name = 'AuthorizationError';
    }
}

/**
 * Validation Error - when request data is invalid
 */
export class ValidationError extends ApiError {
    constructor(
        message: string = 'Validation failed',
        detail?: string,
        public errors?: Record<string, string[]>
    ) {
        super(422, message, detail);
        this.name = 'ValidationError';
    }
}

/**
 * Not Found Error - when resource doesn't exist
 */
export class NotFoundError extends ApiError {
    constructor(message: string = 'Resource not found', detail?: string) {
        super(404, message, detail);
        this.name = 'NotFoundError';
    }
}

/**
 * Server Error - when server encounters an internal error
 */
export class ServerError extends ApiError {
    constructor(message: string = 'Server error', detail?: string) {
        super(500, message, detail);
        this.name = 'ServerError';
    }
}

/**
 * Type guards for error checking
 */
export function isNetworkError(error: unknown): error is NetworkError {
    return error instanceof NetworkError;
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
    return error instanceof AuthenticationError;
}

export function isAuthorizationError(error: unknown): error is AuthorizationError {
    return error instanceof AuthorizationError;
}

export function isValidationError(error: unknown): error is ValidationError {
    return error instanceof ValidationError;
}

export function isNotFoundError(error: unknown): error is NotFoundError {
    return error instanceof NotFoundError;
}

export function isServerError(error: unknown): error is ServerError {
    return error instanceof ServerError;
}

export function isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
}

/**
 * Helper to check if error is a client error (4xx)
 */
export function isClientError(error: unknown): boolean {
    return isApiError(error) && error.statusCode >= 400 && error.statusCode < 500;
}

/**
 * Helper to check if error is a server error (5xx)
 */
export function isServerSideError(error: unknown): boolean {
    return isApiError(error) && error.statusCode >= 500;
}
