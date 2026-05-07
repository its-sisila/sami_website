/**
 * Data Fetching Hooks using SWR
 * Provides cached, revalidating data fetching for API endpoints
 */

import useSWR, { SWRConfiguration } from 'swr';
import { api } from '@/lib/api/client';
import type {
    FuelProduct,
    TankWithLevel,
    TankReading,
    Employee,
    FuelOrder,
    RegulatoryReturn,
    Nozzle,
    User,
    FuelDelivery,
    Shift,
    ShiftSummary,
    ShiftType,
    ScheduledEmployeesResponse,
    CompanyAccount,
    Transaction,
    Station,
    SupportAccess,
    AuditLog,
    PayrollResponse,
    AdvancePayment,
    ShiftHistoryEntry,
    CardTerminal,
    CardSettlement,
    ShiftSettlement,
    Expense,
    AttendanceRead,
    WeeklySalesStat,
    UserWithStation,
    BankAccount,
    DailySalesSummary,
    AccountTrendStat,
} from '@/lib/api/types';

// Default SWR configuration
const defaultConfig: SWRConfiguration = {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5000, // 5 seconds
};

// ============================================================================
// Inventory Hooks
// ============================================================================

/**
 * Fetch fuel products for the station
 */
export function useProducts(config?: SWRConfiguration) {
    return useSWR<FuelProduct[], Error>(
        '/inventory/products',
        () => api.inventory.getProducts(),
        { ...defaultConfig, ...config }
    );
}

/**
 * Fetch tanks with current levels (or levels for a specific date)
 */
export function useTanks(forDate?: string | null, config?: SWRConfiguration) {
    return useSWR<TankWithLevel[], Error>(
        forDate ? `/inventory/tanks?for_date=${forDate}` : '/inventory/tanks',
        () => api.inventory.getTanks(forDate || undefined),
        { ...defaultConfig, ...config }
    );
}

/**
 * Fetch all nozzles with pump and product info
 */
export function useNozzles(config?: SWRConfiguration) {
    return useSWR<Nozzle[], Error>(
        '/inventory/nozzles',
        () => api.inventory.getNozzles(),
        { ...defaultConfig, ...config }
    );
}

/**
 * Fetch historical readings for a specific tank
 */
export function useTankReadings(tankId: string | null, limit = 30, config?: SWRConfiguration) {
    return useSWR<TankReading[], Error>(
        tankId ? `/inventory/tanks/${tankId}/readings?limit=${limit}` : null,
        () => tankId ? api.inventory.getTankReadings(tankId, limit) : Promise.reject('No tank ID'),
        { ...defaultConfig, ...config }
    );
}

// ============================================================================
// Fuel Order Hooks
// ============================================================================

/**
 * Fetch all fuel orders for the station
 */
export function useFuelOrders(status?: string, config?: SWRConfiguration) {
    const key = status ? `/orders?status=${status}` : '/orders';
    return useSWR<FuelOrder[], Error>(
        key,
        () => api.orders.getAll(status),
        { ...defaultConfig, ...config }
    );
}

/**
 * Fetch all regulatory returns
 */
export function useRegulatoryReturns(config?: SWRConfiguration) {
    return useSWR<RegulatoryReturn[], Error>(
        '/orders/returns',
        () => api.regulatoryReturns.getAll(),
        { ...defaultConfig, ...config }
    );
}

// ============================================================================
// Employee Hooks
// ============================================================================

/**
 * Fetch all employees for the station
 */
export function useEmployees(config?: SWRConfiguration) {
    return useSWR<Employee[], Error>(
        '/employees',
        () => api.employees.getAll(),
        { ...defaultConfig, ...config }
    );
}

/**
 * Fetch active employees only
 */
export function useActiveEmployees(config?: SWRConfiguration) {
    return useSWR<Employee[], Error>(
        '/employees?active=true',
        () => api.employees.getActive(),
        { ...defaultConfig, ...config }
    );
}


/**
 * Fetch daily attendance for a specific date
 */
export function useDailyAttendance(date: string | null, config?: SWRConfiguration) {
    return useSWR<AttendanceRead[], Error>(
        date ? `/employees/attendance?date=${date}` : null,
        () => date ? api.employees.getDailyAttendance(date) : Promise.reject('No date'),
        { ...defaultConfig, ...config }
    );
}

/**
 * Fetch payroll data for a date range
 */
export function usePayroll(startDate: string | null, endDate: string | null, config?: SWRConfiguration) {
    return useSWR<PayrollResponse, Error>(
        startDate && endDate ? `/employees/payroll?start=${startDate}&end=${endDate}` : null,
        () => startDate && endDate ? api.employees.getPayroll(startDate, endDate) : Promise.reject('No dates'),
        { ...defaultConfig, ...config }
    );
}

/**
 * Fetch advance payments for an employee
 */
export function useAdvances(employeeId: string | null, limit = 50, config?: SWRConfiguration) {
    return useSWR<AdvancePayment[], Error>(
        employeeId ? `/employees/${employeeId}/advances?limit=${limit}` : null,
        () => employeeId ? api.employees.getAdvances(employeeId, limit) : Promise.reject('No employee ID'),
        { ...defaultConfig, ...config }
    );
}

/**
 * Fetch shift history for an employee
 */
export function useShifts(employeeId: string | null, limit = 50, config?: SWRConfiguration) {
    return useSWR<ShiftHistoryEntry[], Error>(
        employeeId ? `/employees/${employeeId}/shifts?limit=${limit}` : null,
        () => employeeId ? api.employees.getShifts(employeeId, limit) : Promise.reject('No employee ID'),
        { ...defaultConfig, ...config }
    );
}

// ============================================================================
// Orders Hooks
// ============================================================================

/**
 * Fetch fuel orders, optionally filtered by status
 */
export function useOrders(status?: string, config?: SWRConfiguration) {
    const key = status ? `/orders?status=${status}` : '/orders';
    return useSWR<FuelOrder[], Error>(
        key,
        () => api.orders.getAll(status),
        { ...defaultConfig, ...config }
    );
}

/**
 * Fetch pending orders only
 */
export function usePendingOrders(config?: SWRConfiguration) {
    return useOrders('pending', config);
}

/**
 * Fetch fuel deliveries
 */
export function useDeliveries(config?: SWRConfiguration) {
    return useSWR<FuelDelivery[], Error>(
        '/orders/deliveries',
        () => api.orders.getDeliveries(),
        { ...defaultConfig, ...config }
    );
}

// ============================================================================
// Users Hooks
// ============================================================================

/**
 * Fetch users for the station
 */
export function useUsers(config?: SWRConfiguration) {
    return useSWR<User[], Error>(
        '/users',
        () => api.users.getAll(),
        { ...defaultConfig, ...config }
    );
}

// ============================================================================
// Sales Hooks
// ============================================================================

/**
 * Fetch current open shift
 */
export function useCurrentShift(config?: SWRConfiguration) {
    return useSWR<Shift | null, Error>(
        '/sales/shifts/current',
        () => api.sales.getCurrentShift(),
        { ...defaultConfig, ...config }
    );
}

/**
 * Fetch most recently closed shift (for dashboard fallback)
 */
export function useLatestShift(config?: SWRConfiguration) {
    return useSWR<Shift | null, Error>(
        '/sales/shifts/latest',
        () => api.sales.getLatestShift(),
        { ...defaultConfig, ...config }
    );
}

/**
 * Fetch shift summary with sales totals
 */
export function useShiftSummary(shiftId: string | null, config?: SWRConfiguration) {
    return useSWR<ShiftSummary, Error>(
        shiftId ? `/sales/shifts/${shiftId}` : null,
        () => shiftId ? api.sales.getShiftSummary(shiftId) : Promise.reject('No shift ID'),
        { ...defaultConfig, ...config }
    );
}

/**
 * Fetch scheduled employees for a specific shift
 */
export function useScheduledEmployees(
    shiftDate: string | null,
    shiftType: ShiftType | null,
    config?: SWRConfiguration
) {
    return useSWR<ScheduledEmployeesResponse, Error>(
        shiftDate && shiftType ? `/sales/shifts/schedule?date=${shiftDate}&type=${shiftType}` : null,
        () => shiftDate && shiftType ? api.sales.getScheduledEmployees(shiftDate, shiftType) : Promise.reject('Missing params'),
        { ...defaultConfig, ...config }
    );
}

/**
 * Fetch weekly sales stats for chart
 */
export function useWeeklySales(startDate: string, endDate: string, config?: SWRConfiguration) {
    return useSWR<WeeklySalesStat[], Error>(
        startDate && endDate ? `/sales/chart/weekly?start_date=${startDate}&end_date=${endDate}` : null,
        () => api.sales.getWeeklySalesChart(startDate, endDate),
        { ...defaultConfig, ...config }
    );
}

/**
 * Fetch daily sales summary for a specific date
 */
export function useDailySales(date: string | null, config?: SWRConfiguration) {
    return useSWR<DailySalesSummary, Error>(
        date ? `/sales/daily-summary?date=${date}` : null,
        () => date ? api.sales.getDailySummary(date) : Promise.reject('No date'),
        { ...defaultConfig, ...config }
    );
}

// ============================================================================
// Account Hooks
// ============================================================================

/**
 * Fetch all company accounts
 */
export function useAccounts(activeOnly = true, config?: SWRConfiguration) {
    return useSWR<CompanyAccount[], Error>(
        `/accounts?active_only=${activeOnly}`,
        () => api.accounts.getAll(activeOnly),
        { ...defaultConfig, ...config }
    );
}

/**
 * Fetch a single company account
 */
export function useAccount(accountId: string | null, config?: SWRConfiguration) {
    return useSWR<CompanyAccount, Error>(
        accountId ? `/accounts/${accountId}` : null,
        () => accountId ? api.accounts.get(accountId) : Promise.reject('No account ID'),
        { ...defaultConfig, ...config }
    );
}

/**
 * Fetch transaction history for an account
 */
export function useTransactions(accountId: string | null, limit = 50, config?: SWRConfiguration) {
    return useSWR<Transaction[], Error>(
        accountId ? `/accounts/${accountId}/transactions?limit=${limit}` : null,
        () => accountId ? api.accounts.getTransactions(accountId, limit) : Promise.reject('No account ID'),
        { ...defaultConfig, ...config }
    );
}

/**
 * Fetch account balance trends
 */
export function useAccountTrends(range: "6months" | "12months" | "year", config?: SWRConfiguration) {
    return useSWR<AccountTrendStat[], Error>(
        `/accounts/trends?range=${range}`,
        () => api.accounts.getTrends(range),
        { ...defaultConfig, ...config }
    );
}

// ============================================================================
// Admin Hooks (System Admin Only)
// ============================================================================

/**
 * Fetch all stations (system admin only)
 */
export function useStations(config?: SWRConfiguration) {
    return useSWR<Station[], Error>(
        '/admin/stations',
        () => api.admin.getStations(),
        { ...defaultConfig, ...config }
    );
}

/**
 * Fetch support access status for a station
 */
export function useSupportAccess(stationId: string | null, config?: SWRConfiguration) {
    return useSWR<SupportAccess | null, Error>(
        stationId ? `/admin/support-access/${stationId}` : null,
        () => stationId ? api.admin.getSupportAccess(stationId) : Promise.reject('No station ID'),
        { ...defaultConfig, ...config }
    );
}

/**
 * Fetch audit log entries
 */
export function useAuditLog(stationId?: string, limit = 100, config?: SWRConfiguration) {
    const key = stationId
        ? `/admin/audit-log?station_id=${stationId}&limit=${limit}`
        : `/admin/audit-log?limit=${limit}`;
    return useSWR<AuditLog[], Error>(
        key,
        () => api.admin.getAuditLog(stationId, limit),
        { ...defaultConfig, ...config }
    );
}

// ============================================================================
// Settlements Hooks
// ============================================================================

/**
 * Fetch all card terminals for the station
 */
export function useCardTerminals(config?: SWRConfiguration) {
    return useSWR<CardTerminal[], Error>(
        '/settlements/terminals',
        () => api.settlements.getTerminals(),
        { ...defaultConfig, ...config }
    );
}

/**
 * Fetch all card settlements
 */
export function useCardSettlements(config?: SWRConfiguration) {
    return useSWR<CardSettlement[], Error>(
        '/settlements/card',
        () => api.settlements.getCardSettlements(),
        { ...defaultConfig, ...config }
    );
}

/**
 * Fetch all shift settlements (cash deposits)
 */
export function useShiftSettlements(config?: SWRConfiguration) {
    return useSWR<ShiftSettlement[], Error>(
        '/settlements/shift',
        () => api.settlements.getShiftSettlements(),
        { ...defaultConfig, ...config }
    );
}

// ============================================================================
// Expenses Hooks
// ============================================================================

/**
 * Fetch expenses with optional filters
 */
export function useExpenses(
    params?: { start_date?: string; end_date?: string; category?: string; limit?: number },
    config?: SWRConfiguration
) {
    const key = params
        ? `/expenses?${new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== undefined) as [string, string][]).toString()}`
        : '/expenses';
    return useSWR<Expense[], Error>(
        key,
        () => api.expenses.getAll(params),
        { ...defaultConfig, ...config }
    );
}

// ============================================================================
// Auth Hooks
// ============================================================================

/**
 * Fetch current user profile with role and station info
 */
export function useCurrentUser(config?: SWRConfiguration) {
    return useSWR<UserWithStation, Error>(
        '/auth/me',
        () => api.auth.getCurrentUser(),
        { ...defaultConfig, ...config }
    );
}

/**
 * Fetch all bank accounts for the station
 */
export function useBanks(activeOnly = true, config?: SWRConfiguration) {
    return useSWR<BankAccount[], Error>(
        `/accounts/banks?active_only=${activeOnly}`,
        () => api.accounts.getBanks(activeOnly),
        { ...defaultConfig, ...config }
    );
}

// ============================================================================
// Intelligence / Forecasting Hooks
// ============================================================================

import { getAccessToken } from '@/lib/supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function forecastingFetcher(url: string) {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}${url}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `HTTP ${res.status}`);
    }
    return res.json();
}

/**
 * Fetch alerts for a station (unresolved by default)
 */
export function useAlerts(stationId: string | null, resolved = false, config?: SWRConfiguration) {
    return useSWR<any[], Error>(
        stationId ? `/forecasting/${stationId}/alerts?resolved=${resolved}` : null,
        (url: string) => forecastingFetcher(url),
        { ...defaultConfig, refreshInterval: 60000, ...config }
    );
}

/**
 * Trigger the forecasting pipeline for a station (POST mutation)
 */
export async function runForecastingPipeline(stationId: string): Promise<any> {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/forecasting/${stationId}/run`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `HTTP ${res.status}`);
    }
    return res.json();
}

