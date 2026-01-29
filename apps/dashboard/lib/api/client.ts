/**
 * API Client for FastAPI Backend
 * Handles authenticated requests to the SAMI API
 * 
 * Required environment variables:
 * - NEXT_PUBLIC_API_URL: FastAPI backend URL (e.g., http://localhost:8000)
 * - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY: Supabase anon/public key
 */

import { getAccessToken } from '@/lib/supabase';
import type {
    FuelProduct,
    Tank,
    TankWithLevel,
    TankCreate,
    TankReadingCreate,
    TankReading,
    FuelDeliveryCreate,
    FuelDelivery,
    ReadingHistoryItem,
    Nozzle,
    Employee,
    EmployeeCreate,
    Attendance,
    BulkAttendanceCreate,
    MonthlyAttendance,
    ShiftHistoryEntry,
    PayrollResponse,
    AdvancePayment,
    AdvancePaymentCreate,
    FuelOrder,
    FuelOrderCreate,
    FuelOrderUpdate,
    User,
    InviteCreate,
    ApiError,
    Shift,
    ShiftSummary,
    ShiftStart,
    ShiftEnd,
    SaleEntryCreate,
    Sale,
    ShiftType,
    ShiftAssignment,
    ShiftAssignmentCreate,
    ScheduledEmployeesResponse,
    AttendanceRead,
    CompanyAccount,
    CompanyAccountCreate,
    CompanyAccountUpdate,
    Transaction,
    TransactionCreate,
    TransactionWithBalance,
    Station,
    SupportAccess,
    SupportAccessToggle,
    AuditLog,
    CardTerminal,
    CardTerminalCreate,
    CardTerminalUpdate,
    CardSettlement,
    CardSettlementCreate,
    CardSettlementUpdate,
    ShiftSettlement,
    ShiftSettlementCreate,
    ShiftSettlementUpdate,
    Expense,
    ExpenseCreate,
    ExpenseUpdate,
    WeeklySalesStat,
    TankSalesResponse,
    SalesHistoryResponse,
    UserWithStation,
    RegulatoryReturn,
    RegulatoryReturnCreate,
    ReconciliationStats,
    BankAccount,
    BankAccountCreate,
    BankAccountUpdate,
    ExpenseCategoryRead,
    ExpenseCategoryCreate,
    ExpenseCategoryUpdate,
    DailySalesSummary,
} from './types';


// Base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Custom error class for API errors
 */
export class ApiClientError extends Error {
    constructor(
        public status: number,
        public detail: string,
    ) {
        super(detail);
        this.name = 'ApiClientError';
    }
}

/**
 * Make an authenticated request to the API with timeout and enhanced error handling
 */
async function request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeout: number = 30000, // 30 second default timeout
): Promise<T> {
    const token = await getAccessToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    } else {
        console.warn('[API Client] No auth token available for request:', endpoint);
    }

    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            let detail = 'An error occurred';
            let errorData: any = null;

            try {
                errorData = await response.json();
                detail = errorData.detail || detail;
            } catch {
                detail = response.statusText;
            }

            // Import error types dynamically to avoid circular dependencies
            const { parseApiError } = await import('@/lib/utils/error-utils');
            throw parseApiError(response, errorData);
        }

        // Handle 204 No Content
        if (response.status === 204) {
            return {} as T;
        }

        return response.json();
    } catch (error) {
        clearTimeout(timeoutId);

        // Handle abort/timeout errors
        if (error instanceof DOMException && error.name === 'AbortError') {
            const { NetworkError } = await import('@/lib/api/error-types');
            throw new NetworkError('Request timeout. Please try again.');
        }

        // Handle network errors
        if (error instanceof TypeError) {
            const { NetworkError } = await import('@/lib/api/error-types');
            throw new NetworkError('Unable to connect to the server. Please check your network connection.', error);
        }

        // Re-throw other errors
        throw error;
    }
}

// ============================================================================
// Inventory Endpoints
// ============================================================================

export const inventory = {
    /**
     * Get all fuel products for the station
     */
    getProducts: () => request<FuelProduct[]>('/inventory/products'),

    /**
     * Create a new fuel product
     */
    createProduct: (data: { code: string; name: string; price_per_liter: number }) =>
        request<FuelProduct>('/inventory/products', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * Get all tanks with current levels (or levels for a specific date)
     */
    getTanks: (forDate?: string) => request<TankWithLevel[]>(
        forDate ? `/inventory/tanks?for_date=${forDate}` : '/inventory/tanks'
    ),

    /**
     * Submit daily dip readings
     */
    submitReadings: (data: TankReadingCreate) =>
        request<TankReading[]>('/inventory/readings', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * Record a fuel delivery
     */
    createDelivery: (data: FuelDeliveryCreate) =>
        request<FuelDelivery>('/inventory/deliveries', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * Get all readings history with filtering
     */
    getReadingsHistory: (params?: { startDate?: string; endDate?: string; tankId?: string; limit?: number }) => {
        const queryParams = new URLSearchParams();
        if (params?.startDate) queryParams.set('start_date', params.startDate);
        if (params?.endDate) queryParams.set('end_date', params.endDate);
        if (params?.tankId) queryParams.set('tank_id', params.tankId);
        if (params?.limit) queryParams.set('limit', params.limit.toString());
        const url = queryParams.toString() ? `/inventory/readings/history?${queryParams}` : '/inventory/readings/history';
        return request<ReadingHistoryItem[]>(url);
    },

    /**
     * Create a new tank
     */
    createTank: (data: TankCreate) =>
        request<Tank>('/inventory/tanks', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * Get tank readings history
     */
    getTankReadings: (tankId: string, limit = 30) =>
        request<TankReading[]>(`/inventory/tanks/${tankId}/readings?limit=${limit}`),

    /**
     * Get all nozzles for the station with pump and product info
     */
    getNozzles: () => request<Nozzle[]>('/inventory/nozzles'),

    /**
     * Create a new nozzle
     */
    createNozzle: (data: {
        nozzle_id: string;
        nozzle_name: string;
        tank_id: string;
        product_id: string;
        pump_id?: string;
        digital_meter?: string;
        analog_meter?: string;
    }) =>
        request<Nozzle>('/inventory/nozzles', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * Update a product
     */
    updateProduct: (productId: string, data: { code: string; name: string; price_per_liter: number }) =>
        request<FuelProduct>(`/inventory/products/${productId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    /**
     * Update a tank
     */
    updateTank: (tankId: string, data: { name: string; product_id: string; tank_type?: string; capacity_liters: number; color?: string }) =>
        request<Tank>(`/inventory/tanks/${tankId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    /**
     * Update a nozzle
     */
    updateNozzle: (nozzleId: string, data: { nozzle_id: string; nozzle_name: string; tank_id: string; product_id: string; pump_id?: string }) =>
        request<Nozzle>(`/inventory/nozzles/${nozzleId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    /**
     * Get all pumps for the station
     */
    getPumps: () => request<{ id: string; station_id: string; name: string; location?: string; is_active: boolean }[]>('/inventory/pumps'),

    /**
     * Delete a product
     */
    deleteProduct: (productId: string) =>
        request<void>(`/inventory/products/${productId}`, { method: 'DELETE' }),

    /**
     * Delete a tank
     */
    deleteTank: (tankId: string) =>
        request<void>(`/inventory/tanks/${tankId}`, { method: 'DELETE' }),

    /**
     * Delete a nozzle
     */
    deleteNozzle: (nozzleId: string) =>
        request<void>(`/inventory/nozzles/${nozzleId}`, { method: 'DELETE' }),

    /**
     * Get last meter readings for all nozzles (to auto-populate start meter)
     * Returns a dict of nozzle_id -> last_end_meter value
     */
    getLastMeterReadings: () => request<Record<string, number>>('/sales/nozzles/last-readings'),
};

// ============================================================================
// Fuel Orders Endpoints
// ============================================================================

export const orders = {
    /**
     * Get all fuel orders for the station
     */
    getAll: (status?: string) => {
        const url = status ? `/orders?status=${status}` : '/orders';
        return request<FuelOrder[]>(url);
    },

    /**
     * Get a single fuel order by ID
     */
    getById: (orderId: string) => request<FuelOrder>(`/orders/${orderId}`),

    /**
     * Create a new fuel order
     */
    create: (data: FuelOrderCreate) =>
        request<FuelOrder>('/orders', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * Update a fuel order (status, payment, etc.)
     */
    update: (orderId: string, data: FuelOrderUpdate) =>
        request<FuelOrder>(`/orders/${orderId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    /**
     * Mark order as delivered
     */
    markDelivered: (orderId: string) =>
        request<FuelOrder>(`/orders/${orderId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'delivered', received_at: new Date().toISOString() }),
        }),

    /**
     * Cancel an order
     */
    cancel: (orderId: string) =>
        request<FuelOrder>(`/orders/${orderId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'cancelled' }),
        }),

    /**
     * Mark payment made
     */
    markPaid: (orderId: string) =>
        request<FuelOrder>(`/orders/${orderId}`, {
            method: 'PATCH',
            body: JSON.stringify({ payment_made: true }),
        }),

    /**
     * Get all deliveries
     */
    getDeliveries: () => request<FuelDelivery[]>('/orders/deliveries'),

    /**
     * Record a delivery
     */
    createDelivery: (data: FuelDeliveryCreate) =>
        request<FuelDelivery>('/orders/deliveries', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};

// ============================================================================
// Regulatory Returns Endpoints
// ============================================================================

export const regulatoryReturns = {
    /**
     * Get all regulatory returns
     */
    getAll: () => request<RegulatoryReturn[]>('/orders/returns'),

    /**
     * Create a new regulatory return
     */
    create: (data: RegulatoryReturnCreate) =>
        request<RegulatoryReturn>('/orders/returns', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};

// ============================================================================
// Employee Endpoints
// ============================================================================

export const employees = {
    /**
     * Get all employees for the station
     */
    getAll: () => request<Employee[]>('/employees'),

    /**
     * Get active employees only
     */
    getActive: () => request<Employee[]>('/employees?active_only=true'),

    /**
     * Create a new employee
     */
    create: (data: EmployeeCreate) =>
        request<Employee>('/employees', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * Update an employee
     */
    update: (id: string, data: Partial<EmployeeCreate>) =>
        request<Employee>(`/employees/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    /**
     * Delete (deactivate) an employee
     */
    delete: (id: string) =>
        request<Employee>(`/employees/${id}`, { method: 'DELETE' }),

    /**
     * Bulk mark attendance for multiple employees
     */
    markAttendance: (data: BulkAttendanceCreate) =>
        request<AttendanceRead[]>('/employees/attendance', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * Get daily attendance for a specific date
     */
    getDailyAttendance: (date: string) =>
        request<AttendanceRead[]>(`/employees/attendance?date=${date}`),

    /**
     * Get monthly attendance history for all employees
     */
    getMonthlyAttendance: (year: number, month: number) =>
        request<MonthlyAttendance[]>(`/employees/attendance/history?year=${year}&month=${month}`),

    /**
     * Get payroll calculation for a date range
     */
    getPayroll: (startDate: string, endDate: string) =>
        request<PayrollResponse>(`/employees/payroll?start_date=${startDate}&end_date=${endDate}`),

    /**
     * Record a payroll payment for an employee
     */
    recordPayrollPayment: (data: {
        employee_id: string;
        period_start: string;
        period_end: string;
        gross_amount: number;
        advances_deducted: number;
        net_amount: number;
        paid_by?: string;
        notes?: string;
    }) =>
        request<{
            id: string;
            employee_id: string;
            period_start: string;
            period_end: string;
            gross_amount: number;
            advances_deducted: number;
            net_amount: number;
            paid_at: string;
            paid_by: string | null;
        }>('/employees/payroll/pay', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * Create an advance payment
     */
    createAdvance: (data: AdvancePaymentCreate) =>
        request<AdvancePayment>('/employees/advances', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * Get advance payments for an employee
     */
    getAdvances: (employeeId: string, limit = 50) =>
        request<AdvancePayment[]>(`/employees/${employeeId}/advances?limit=${limit}`),



    /**
     * Get shift history for an employee
     */
    getShifts: (employeeId: string, limit = 50) =>
        request<ShiftHistoryEntry[]>(`/employees/${employeeId}/shifts?limit=${limit}`),
};



// ============================================================================
// Users Endpoints
// ============================================================================

export const users = {
    /**
     * Get all users for the station
     */
    getAll: (stationId?: string) => {
        const query = stationId ? `?station_id=${stationId}` : '';
        return request<User[]>(`/users${query}`);
    },

    /**
     * Invite a new user
     */
    invite: (data: InviteCreate) =>
        request<{ user_id: string; email: string; message: string }>('/users/invite', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * Remove a user from the station
     */
    remove: (userId: string) =>
        request<{ user_id: string; message: string }>(`/users/${userId}`, {
            method: 'DELETE',
        }),

    /**
     * Update user password (system admin only)
     */
    updatePassword: (userId: string, password: string) =>
        request<{ message: string }>(`/users/${userId}/password`, {
            method: 'PATCH',
            body: JSON.stringify({ password }),
        }),

    /**
     * Assign user to a station (system admin only)
     */
    assignStation: (userId: string, stationId: string, role: string = 'owner') =>
        request<{ message: string }>(`/users/${userId}/station`, {
            method: 'PUT',
            body: JSON.stringify({ station_id: stationId, role }),
        }),
};

// ============================================================================
// Sales Endpoints
// ============================================================================

export const sales = {
    /**
     * Get current open shift
     */
    getCurrentShift: () => request<Shift | null>('/sales/shifts/current'),

    /**
     * Get most recently closed shift (for dashboard fallback)
     */
    getLatestShift: () => request<Shift | null>('/sales/shifts/latest'),

    /**
     * Get shift summary with sales totals
     */
    getShiftSummary: (shiftId: string) =>
        request<ShiftSummary>(`/sales/shifts/${shiftId}`),

    /**
     * Start a new shift (day or night)
     */
    startShift: (data: ShiftStart) =>
        request<Shift>('/sales/shifts/start', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * End/close the current shift
     */
    endShift: (data: ShiftEnd) =>
        request<Shift>('/sales/shifts/end', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * Record a sale entry for a nozzle
     */
    recordSaleEntry: (data: SaleEntryCreate) =>
        request<Sale>('/sales/entry', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * Get all sales for a shift
     */
    getShiftSales: (shiftId: string) =>
        request<Sale[]>(`/sales/shifts/${shiftId}/sales`),

    /**
     * Get employees scheduled for a shift
     */
    getScheduledEmployees: (shiftDate: string, shiftType: ShiftType) =>
        request<ScheduledEmployeesResponse>(`/sales/shifts/schedule?shift_date=${shiftDate}&shift_type=${shiftType}`),

    /**
     * Schedule an employee for a shift
     */
    scheduleEmployee: (data: ShiftAssignmentCreate) =>
        request<ShiftAssignment>('/sales/shifts/schedule', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * Remove an employee from a shift schedule
     */
    unscheduleEmployee: (shiftDate: string, shiftType: ShiftType, employeeId: string) =>
        request<void>(`/sales/shifts/schedule?shift_date=${shiftDate}&shift_type=${shiftType}&employee_id=${employeeId}`, {
            method: 'DELETE',
        }),

    /**
     * Get weekly sales stats for chart
     */
    getWeeklySalesChart: (startDate: string, endDate: string) =>
        request<WeeklySalesStat[]>(`/sales/chart/weekly?start_date=${startDate}&end_date=${endDate}`),

    /**
     * Get daily sales summary with day/night breakdown
     */
    getDailySummary: (date: string) =>
        request<DailySalesSummary>(`/sales/daily-summary?date=${date}`),

    /**
     * Get aggregated nozzle sales for a tank (for dip calculation)
     */
    getTankSales: (tankId: string, salesDate: string) =>
        request<TankSalesResponse>(`/sales/tank-sales?tank_id=${tankId}&sales_date=${salesDate}`),

    /**
     * Complete a shift by saving all sales data
     */
    completeShift: (shiftId: string, payload: {
        cash_collected?: number;
        sale_entries?: {
            nozzle_id: string;
            employee_id?: string | null;
            start_meter_digital: number;
            end_meter_digital: number;
            start_meter_analog?: number | null;
            end_meter_analog?: number | null;
            price_per_liter: number;
            notes?: string | null;
        }[];
        card_sales?: {
            terminal_id: string;
            nozzle_id?: string | null;
            batch_number?: string | null;
            settlement_datetime?: string | null;
            amount: number;
            notes?: string | null;
        }[];
        credit_sales?: {
            account_id: string;
            nozzle_id?: string | null;
            po_number?: string | null;
            vehicle_number?: string | null;
            liters?: number;
            amount: number;
            notes?: string | null;
        }[];
        notes?: string | null;
    }) =>
        request<{
            shift_id: string;
            sales_count: number;
            card_sales_count: number;
            credit_sales_count: number;
            total_fuel_sales: number;
            total_card_sales: number;
            total_credit_sales: number;
            cash_collected: number;
        }>(`/sales/shifts/${shiftId}/complete`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    /**
     * Get paginated sales history for the station
     */
    getSalesHistory: (params?: { limit?: number; offset?: number; startDate?: string; endDate?: string; nozzleId?: string; productCode?: string }) => {
        const searchParams = new URLSearchParams();
        if (params?.limit) searchParams.set('limit', String(params.limit));
        if (params?.offset) searchParams.set('offset', String(params.offset));
        if (params?.startDate) searchParams.set('start_date', params.startDate);
        if (params?.endDate) searchParams.set('end_date', params.endDate);
        if (params?.nozzleId) searchParams.set('nozzle_id', params.nozzleId);
        if (params?.productCode) searchParams.set('product_code', params.productCode);
        const queryString = searchParams.toString();
        return request<SalesHistoryResponse>(`/sales/history${queryString ? `?${queryString}` : ''}`);
    },

    /**
     * Get working capital reconciliation stats
     */
    getReconciliation: (date: string, range: string) =>
        request<ReconciliationStats>(`/sales/reconciliation?date=${date}&range=${range}`),
};

// ============================================================================
// Exports Endpoints (CSV Downloads)
// ============================================================================

/**
 * Trigger a file download from the API
 */
async function downloadFile(endpoint: string, filename: string): Promise<void> {
    const token = await getAccessToken();

    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });

    if (!response.ok) {
        let detail = 'Export failed';
        try {
            const errorData = await response.json();
            detail = errorData.detail || detail;
        } catch {
            detail = response.statusText;
        }
        throw new ApiClientError(response.status, detail);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

export const exports = {
    /**
     * Export sales data as CSV
     */
    downloadSales: (startDate: string, endDate: string) => {
        const filename = `sales_${startDate}_to_${endDate}.csv`;
        return downloadFile(`/exports/sales?start=${startDate}&end=${endDate}`, filename);
    },

    /**
     * Export attendance data as CSV for a month
     */
    downloadAttendance: (month: string) => {
        const filename = `attendance_${month}.csv`;
        return downloadFile(`/exports/attendance?month=${month}`, filename);
    },

    /**
     * Export employees list as CSV
     */
    downloadEmployees: (includeInactive: boolean = false) => {
        const today = new Date().toISOString().split('T')[0];
        const filename = `employees_${today}.csv`;
        return downloadFile(`/exports/employees?include_inactive=${includeInactive}`, filename);
    },

    /**
     * Export card settlements as CSV
     */
    downloadCardSettlements: (startDate: string, endDate: string) => {
        const filename = `card_settlements_${startDate}_to_${endDate}.csv`;
        return downloadFile(`/exports/settlements/card?start=${startDate}&end=${endDate}`, filename);
    },

    /**
     * Export deposits as CSV
     */
    downloadDeposits: (startDate: string, endDate: string) => {
        const filename = `deposits_${startDate}_to_${endDate}.csv`;
        return downloadFile(`/exports/settlements/deposits?start=${startDate}&end=${endDate}`, filename);
    },

    /**
     * Export expenses as CSV
     */
    downloadExpenses: (startDate: string, endDate: string) => {
        const filename = `expenses_${startDate}_to_${endDate}.csv`;
        return downloadFile(`/exports/expenses?start=${startDate}&end=${endDate}`, filename);
    },

    /**
     * Export reconciliation report as CSV
     */
    downloadReconciliation: (startDate: string, endDate: string) => {
        const filename = `reconciliation_${startDate}_to_${endDate}.csv`;
        return downloadFile(`/exports/reconciliation?start=${startDate}&end=${endDate}`, filename);
    },
};

// ============================================================================
// Accounts Endpoints
// ============================================================================

export const accounts = {
    /**
     * Get all company accounts
     */
    getAll: (activeOnly = true) =>
        request<CompanyAccount[]>(`/accounts?active_only=${activeOnly}`),

    /**
     * Get a single company account
     */
    get: (id: string) =>
        request<CompanyAccount>(`/accounts/${id}`),

    /**
     * Create a new company account
     */
    create: (data: CompanyAccountCreate) =>
        request<CompanyAccount>('/accounts', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * Update a company account
     */
    update: (id: string, data: CompanyAccountUpdate) =>
        request<CompanyAccount>(`/accounts/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    /**
     * Record a transaction (credit sale or payment)
     */
    recordTransaction: (data: TransactionCreate) =>
        request<TransactionWithBalance>('/accounts/transaction', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * Get transaction history for an account
     */
    getTransactions: (accountId: string, limit = 50) =>
        request<Transaction[]>(`/accounts/${accountId}/transactions?limit=${limit}`),

    /**
     * Get all bank accounts
     */
    getBanks: (activeOnly = true) =>
        request<BankAccount[]>(`/accounts/banks?active_only=${activeOnly}`),

    /**
     * Create a new bank account
     */
    createBank: (data: BankAccountCreate) =>
        request<BankAccount>('/accounts/banks', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * Update a bank account
     */
    updateBank: (id: string, data: BankAccountUpdate) =>
        request<BankAccount>(`/accounts/banks/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    /**
     * Delete a bank account
     */
    deleteBank: (id: string) =>
        request<void>(`/accounts/banks/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// Admin Endpoints (System Admin Only)
// ============================================================================

export const admin = {
    /**
     * Get all stations (system admin only)
     */
    getStations: () =>
        request<Station[]>('/admin/stations'),

    /**
     * Create a new station (system admin only)
     */
    createStation: (data: { name: string; owner_email: string; address?: string; phone?: string }) =>
        request<Station>('/admin/stations', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * Update station details (system admin only)
     */
    updateStation: (stationId: string, data: { name?: string; address?: string; phone?: string; email?: string; status?: string }) =>
        request<Station>(`/admin/stations/${stationId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    /**
     * Get support access status for a station
     */
    getSupportAccess: (stationId: string) =>
        request<SupportAccess | null>(`/admin/support-access/${stationId}`),

    /**
     * Toggle support access for a station
     */
    toggleSupportAccess: (stationId: string, data: SupportAccessToggle) =>
        request<SupportAccess>(`/admin/support-access/${stationId}`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * Get audit log entries
     */
    getAuditLog: (stationId?: string, limit = 100) => {
        const params = new URLSearchParams();
        if (stationId) params.append('station_id', stationId);
        params.append('limit', limit.toString());
        return request<AuditLog[]>(`/admin/audit-log?${params.toString()}`);
    },

    /**
     * Invite a user to a station (system admin only)
     */
    inviteUser: (data: { email: string; full_name?: string; role: string; station_id: string }) =>
        request<{ user_id: string; email: string; role: string; station_id: string; message: string }>('/users/invite', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};

// ============================================================================
// Settlements Endpoints (Card Terminals, Card/Shift Settlements)
// ============================================================================

export const settlements = {
    /**
     * Get all card terminals for the station
     */
    getTerminals: () =>
        request<CardTerminal[]>('/settlements/terminals'),

    /**
     * Create a new card terminal
     */
    createTerminal: (data: CardTerminalCreate) =>
        request<CardTerminal>('/settlements/terminals', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * Update a card terminal
     */
    updateTerminal: (id: string, data: CardTerminalUpdate) =>
        request<CardTerminal>(`/settlements/terminals/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    /**
     * Delete a card terminal
     */
    deleteTerminal: (id: string) =>
        request<void>(`/settlements/terminals/${id}`, {
            method: 'DELETE',
        }),

    /**
     * Get all card settlements
     */
    getCardSettlements: () =>
        request<CardSettlement[]>('/settlements/card'),

    /**
     * Create a card settlement
     */
    createCardSettlement: (data: CardSettlementCreate) =>
        request<CardSettlement>('/settlements/card', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * Update/verify a card settlement
     */
    updateCardSettlement: (id: string, data: CardSettlementUpdate) =>
        request<CardSettlement>(`/settlements/card/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    /**
     * Get all shift settlements (cash deposits)
     */
    getShiftSettlements: () =>
        request<ShiftSettlement[]>('/settlements/shift'),

    /**
     * Create a shift settlement (cash deposit)
     */
    createShiftSettlement: (data: ShiftSettlementCreate) =>
        request<ShiftSettlement>('/settlements/shift', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * Update/verify a shift settlement (cash deposit)
     */
    updateShiftSettlement: (id: string, data: ShiftSettlementUpdate) =>
        request<ShiftSettlement>(`/settlements/shift/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
};

// ============================================================================
// Expenses Endpoints
// ============================================================================

export const expenses = {
    /**
     * Get all expenses with optional filters
     */
    getAll: (params?: { start_date?: string; end_date?: string; category?: string; limit?: number }) => {
        const searchParams = new URLSearchParams();
        if (params?.start_date) searchParams.append('start_date', params.start_date);
        if (params?.end_date) searchParams.append('end_date', params.end_date);
        if (params?.category) searchParams.append('category', params.category);
        if (params?.limit) searchParams.append('limit', params.limit.toString());
        const query = searchParams.toString();
        return request<Expense[]>(`/expenses${query ? `?${query}` : ''}`);
    },

    /**
     * Get expense categories
     */
    getCategories: () =>
        request<ExpenseCategoryRead[]>('/expenses/categories'),

    /**
     * Create expense category
     */
    createCategory: (data: ExpenseCategoryCreate) =>
        request<ExpenseCategoryRead>('/expenses/categories', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * Update expense category
     */
    updateCategory: (id: string, data: ExpenseCategoryUpdate) =>
        request<ExpenseCategoryRead>(`/expenses/categories/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    /**
     * Delete expense category
     */
    deleteCategory: (id: string) =>
        request<void>(`/expenses/categories/${id}`, { method: 'DELETE' }),

    /**
     * Get a single expense by ID
     */
    get: (id: string) =>
        request<Expense>(`/expenses/${id}`),

    /**
     * Create a new expense
     */
    create: (data: ExpenseCreate) =>
        request<Expense>('/expenses', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * Update an expense
     */
    update: (id: string, data: ExpenseUpdate) =>
        request<Expense>(`/expenses/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    /**
     * Delete an expense
     */
    delete: (id: string) =>
        request<void>(`/expenses/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// Auth Endpoints
// ============================================================================

export const auth = {
    /**
     * Get current user profile with role and station info
     */
    getCurrentUser: () => request<UserWithStation>('/auth/me'),
};

// ============================================================================
// Stations Endpoints (Settings)
// ============================================================================

import type { StationSettings, StationSettingsUpdate } from './types';

export const stations = {
    /**
     * Get station settings (alert thresholds, etc.)
     */
    getSettings: () => request<StationSettings>('/stations/settings'),

    /**
     * Update station settings
     */
    updateSettings: (data: StationSettingsUpdate) =>
        request<StationSettings>('/stations/settings', {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
};

// ============================================================================
// Health Check
// ============================================================================

export const health = {
    /**
     * Check if backend API is reachable
     * Returns true if healthy, throws NetworkError if not
     */
    check: async (): Promise<boolean> => {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout for health checks

            const response = await fetch(`${API_BASE_URL}/health`, {
                method: 'GET',
                signal: controller.signal,
            });

            clearTimeout(timeout);
            return response.ok;
        } catch (error) {
            const { NetworkError } = await import('@/lib/api/error-types');

            if (error instanceof DOMException && error.name === 'AbortError') {
                throw new NetworkError('Health check timeout');
            }

            throw new NetworkError('Backend server is not reachable');
        }
    },
};

// ============================================================================
// Export all API modules
// ============================================================================

export const api = {
    inventory,
    employees,
    orders,
    regulatoryReturns,
    users,
    sales,
    exports,
    accounts,
    admin,
    settlements,
    expenses,
    auth,
    stations,
    health,
};

export default api;
