/**
 * Feature Flags Configuration
 * Toggle various application behaviors for testing/development
 */

/**
 * When true, components will NOT fall back to mock data when API calls fail.
 * Set NEXT_PUBLIC_DISABLE_MOCK_DATA=true in .env.local to disable mock data.
 */
export const DISABLE_MOCK_DATA = process.env.NEXT_PUBLIC_DISABLE_MOCK_DATA === 'true';

/**
 * Helper to get data with optional mock fallback
 * @param apiData - Data from API (could be undefined/null if API failed)
 * @param mockData - Mock data to use as fallback
 * @returns API data if available, mock data only if DISABLE_MOCK_DATA is false
 */
export function withMockFallback<T>(apiData: T | undefined | null, mockData: T): T {
    if (apiData !== undefined && apiData !== null) {
        // API data is available, use it
        if (Array.isArray(apiData) && apiData.length > 0) {
            return apiData;
        }
        if (!Array.isArray(apiData)) {
            return apiData;
        }
    }

    // No API data - check if mock fallback is allowed
    if (DISABLE_MOCK_DATA) {
        // Return empty array or null based on mock data type
        return Array.isArray(mockData) ? ([] as unknown as T) : (null as unknown as T);
    }

    return mockData;
}
