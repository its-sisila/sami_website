/**
 * API Type Definitions
 * TypeScript types matching the FastAPI Pydantic schemas
 */

// ============================================================================
// Common Types
// ============================================================================

export type UUID = string;

// ============================================================================
// Enums
// ============================================================================

export type EmployeeRole = 'staff' | 'pumper';
export type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'overtime';
export type OrderStatus = 'pending' | 'delivered' | 'cancelled';
export type SettlementStatus = 'pending' | 'settled' | 'verified';
export type UserRole = 'system_admin' | 'owner' | 'manager' | 'accountant' | 'supervisor';

// ============================================================================
// Inventory Types
// ============================================================================

export interface FuelProduct {
    id: UUID;
    station_id: UUID;
    code: string;
    name: string;
    price_per_liter: number;
    is_active: boolean;
}

export interface Tank {
    id: UUID;
    station_id: UUID;
    name: string;
    product_id: UUID;
    tank_type: string | null;
    capacity_liters: number;
    color: string | null;
    is_active: boolean;
    created_at: string;
}

export interface TankWithLevel extends Tank {
    current_volume: number | null;
    product_name: string | null;
    product_code: string | null;
}

export interface Pump {
    id: UUID;
    station_id: UUID;
    name: string;
    location: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    nozzles?: Nozzle[];
}

export interface Nozzle {
    nozzle_id: string; // Primary key is string here
    pump_id: UUID;
    tank_id: UUID;
    product_id: UUID;
    nozzle_name: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    // Optional joins
    pump_name?: string;
    tank_name?: string;
    product_name?: string;
}

export interface TankCreate {
    name: string;
    product_id: UUID;
    tank_type?: string | null;
    capacity_liters: number;
    color?: string | null;
}

export interface NozzleReadingEntry {
    nozzle_id: string;
    end_meter: number;
}

export interface TankReadingEntry {
    tank_id: UUID;
    height_cm: number | null;
    volume_liters: number;
    staff_responsible_ids?: string[] | null;
    monitored_by_ids?: string[] | null;
    meter_readings?: NozzleReadingEntry[] | null;
}

export interface TankReadingCreate {
    reading_date: string; // YYYY-MM-DD
    readings: TankReadingEntry[];
    staff_responsible_ids?: string[] | null;
    monitored_by_ids?: string[] | null;
}

export interface TankReading {
    id: UUID;
    tank_id: UUID;
    tank_name?: string; // Derived
    reading_date: string;
    height_cm: number | null;
    volume_liters: number;
    reading_type: string | null;
    staff_responsible_ids?: string[] | null;
    monitored_by_ids?: string[] | null;
    meter_readings?: NozzleReadingEntry[] | null;
    created_at: string;
}

export interface FuelDeliveryCreate {
    tank_id: UUID;
    order_id?: UUID | null;
    liters_received: number;
    delivery_date?: string | null;
    delivery_time?: string | null;
    delivery_slip_number?: string | null;
    vehicle_number?: string | null;
    driver_name?: string | null;
    notes?: string | null;
}

export interface FuelDelivery {
    id: UUID;
    tank_id: UUID;
    order_id: UUID | null;
    liters_received: number;
    delivery_date: string;
    delivery_time: string | null;
    delivery_slip_number: string | null;
    vehicle_number: string | null;
    driver_name: string | null;
    created_at: string;
}

export interface ReadingHistoryItem {
    id: string;
    tank_id: string;
    tank_name: string;
    reading_date: string;
    volume_liters: number;
    height_cm: number | null;
    staff_responsible_ids: string[];
    staff_responsible_names: string[];
    monitored_by_ids: string[];
    monitored_by_names: string[];
    created_at: string;
}

// ============================================================================
// Employee Types
// ============================================================================

export interface Employee {
    id: UUID;
    station_id: UUID;
    employee_code: string | null;
    full_name: string;
    name_with_initials: string | null;
    nic: string | null;
    address: string | null;
    phone: string | null;
    date_of_birth: string | null;
    gender: string | null;
    role: EmployeeRole;
    joined_date: string | null;
    daily_wage: number;
    overtime_bonus: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface EmployeeCreate {
    full_name: string;
    name_with_initials?: string | null;
    nic?: string | null;
    address?: string | null;
    phone?: string | null;
    date_of_birth?: string | null;
    gender?: string | null;
    role?: EmployeeRole;
    joined_date?: string | null;
    daily_wage?: number;
    overtime_bonus?: number;
}

export interface AttendanceEntry {
    employee_id: UUID;
    status: AttendanceStatus;
    time_in?: string | null;
    time_out?: string | null;
    notes?: string | null;
}

export interface AttendanceRead {
    id: UUID;
    employee_id: UUID;
    attendance_date: string;
    status: AttendanceStatus;
    time_in: string | null;
    time_out: string | null;
    notes: string | null;
    created_at: string;
}

export interface Attendance {
    id: UUID;
    employee_id: UUID;
    attendance_date: string;
    status: AttendanceStatus;
    time_in: string | null;
    time_out: string | null;
    notes: string | null;
    created_at: string;
}

export interface BulkAttendanceCreate {
    attendance_date: string;
    shift_id?: UUID | null;
    entries: AttendanceEntry[];
}

export interface DayAttendance {
    day: number;
    status: AttendanceStatus | null;
    time_in?: string | null;
    time_out?: string | null;
}

export interface MonthlyAttendance {
    employee_id: UUID;
    employee_name: string;
    attendance: DayAttendance[];
}

export interface ShiftHistoryEntry {
    id: UUID;
    attendance_date: string;
    shift_type: 'day' | 'night' | null;
    status: AttendanceStatus;
    time_in: string | null;
    time_out: string | null;
    hours_worked: number | null;
}

// ============================================================================
// Payroll Types
// ============================================================================


export interface PayrollEntry {
    employee_id: UUID;
    employee_name: string;
    role: EmployeeRole;
    daily_wage: number;
    days_present: number;
    days_half: number;
    days_overtime: number;
    total_days_worked: number;
    gross_wage: number;
    total_advances: number;
    net_payable: number;
    is_paid: boolean;
    paid_at: string | null;
}

export interface PayrollResponse {
    start_date: string;
    end_date: string;
    employees: PayrollEntry[];
    total_gross: number;
    total_advances: number;
    total_net: number;
}

// ============================================================================
// Advance Payment Types
// ============================================================================

export interface AdvancePaymentCreate {
    employee_id: UUID;
    amount: number;
    payment_date?: string | null;
    payment_time?: string | null;
    reason?: string | null;
    notes?: string | null;
}

export interface AdvancePayment {
    id: UUID;
    employee_id: UUID;
    amount: number;
    payment_date: string;
    payment_time: string | null;
    reason: string | null;
    created_at: string;
}

// ============================================================================
// Orders Types
// ============================================================================

export interface FuelOrderCreate {
    product_id: UUID;
    order_number?: string | null;
    liters_ordered: number;
    supplier: string;
    expected_date?: string | null;
    notes?: string | null;
    placed_at?: string | null;
}

export interface FuelOrder {
    id: UUID;
    station_id: UUID;
    product_id: UUID;
    order_number: string | null;
    liters_ordered: number;
    supplier: string;
    status: OrderStatus;
    placed_at: string;
    expected_date: string | null;
    received_at: string | null;
    payment_made: boolean;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface FuelOrderUpdate {
    status?: OrderStatus;
    received_at?: string | null;
    payment_made?: boolean;
    notes?: string | null;
}

// ============================================================================
// User Types
// ============================================================================

export interface User {
    id: UUID;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    role: UserRole;
    station_id: UUID | null;
    created_at: string;
    updated_at: string;
}

export interface InviteCreate {
    email: string;
    full_name?: string | null;
    role: UserRole;
    station_id?: UUID | null;
}

export interface UserWithStation {
    user_id: UUID;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    role: UserRole;
    station_id: UUID | null;
    station_name: string | null;
}

// ============================================================================
// Sales/Shift Types
// ============================================================================

export type ShiftType = 'day' | 'night';
export type ShiftStatus = 'open' | 'closed';

export interface Shift {
    id: UUID;
    station_id: UUID;
    shift_type: ShiftType;
    shift_date: string;
    status: ShiftStatus;
    opened_at: string | null;
    closed_at: string | null;
    notes: string | null;
    created_at: string;
}

export interface ShiftStart {
    shift_type: ShiftType;
    shift_date?: string | null;  // Defaults to today on backend
    notes?: string | null;
}

export interface ShiftEnd {
    shift_id: UUID;
    notes?: string | null;
}

export interface SaleCardEntry {
    terminal_id: string; // UUID
    amount: number;
    batch_number?: string | null;
    invoice_number?: string | null;
    invoice_datetime?: string | null; // ISO datetime string
}

export interface SaleCreditEntry {
    account_id: string; // UUID
    amount: number;
    liters?: number | null;
    po_number?: string | null;
    vehicle_number?: string | null;
    notes?: string | null;
}

export interface SaleEntryCreate {
    shift_id: UUID;
    nozzle_id: string;  // VARCHAR nozzle ID like "LAD-1"
    employee_id?: UUID | null;
    start_meter_digital: number;
    end_meter_digital: number;
    start_meter_analog?: number | null;
    end_meter_analog?: number | null;
    price_per_liter: number;
    notes?: string | null;

    // Optional nested entries
    card_entries?: SaleCardEntry[] | null;
    credit_entries?: SaleCreditEntry[] | null;
}

export interface Sale {
    id: UUID;
    shift_id: UUID;
    nozzle_id: UUID;
    employee_id: UUID | null;
    start_meter_digital: number;
    end_meter_digital: number;
    start_meter_analog: number | null;
    end_meter_analog: number | null;
    liters_sold: number;
    price_per_liter: number;
    amount_lkr: number;
    is_submitted: boolean;
    notes: string | null;
    created_at: string;
}

export interface ShiftSummary {
    shift: Shift;
    total_liters: number;
    total_amount: number;
    sales_count: number;
}

export interface ShiftAssignment {
    id: UUID;
    station_id: UUID;
    shift_date: string;
    shift_type: ShiftType;
    employee_id: UUID;
    assigned_by: UUID | null;
    created_at: string;
}

export interface ShiftAssignmentCreate {
    shift_date: string;
    shift_type: ShiftType;
    employee_id: UUID;
}

export interface ScheduledEmployeesResponse {
    shift_date: string;
    shift_type: ShiftType;
    employee_ids: UUID[];
}

export interface WeeklySalesStat {
    date: string;
    name: string;
    totalSalesAmount: number;
    verifiedFunds: number;
}

export interface TankNozzleSales {
    nozzle_id: string;
    nozzle_name: string;
    day_liters: number;
    night_liters: number;
}

export interface TankSalesResponse {
    tank_id: string;
    tank_name: string;
    date: string;
    nozzles: TankNozzleSales[];
    total_liters: number;
}

export interface SalesHistoryItem {
    id: UUID;
    shift_date: string;
    shift_type: ShiftType;
    nozzle_id: string;
    nozzle_name: string | null;
    product_name: string | null;
    product_code: string | null;
    employee_id: UUID | null;
    employee_name: string | null;
    liters_sold: number;
    price_per_liter: number;
    amount_lkr: number;
    card_sales_total: number;
    credit_sales_total: number;
    cash_sales: number;
    created_at: string;
}

export interface SalesHistoryResponse {
    items: SalesHistoryItem[];
    total: number;
    limit: number;
    offset: number;
}

export interface ReconciliationShiftStats {
    expected_sales: number;
    verified_funds: number;
    variance: number;
}

export interface ReconciliationStats {
    day_shift: ReconciliationShiftStats;
    night_shift: ReconciliationShiftStats;
    total: ReconciliationShiftStats;
}

// ============================================================================
// Account Types
// ============================================================================

export type TransactionType = 'debit' | 'credit';

export interface CompanyAccount {
    id: UUID;
    station_id: UUID;
    name: string;
    contact_person: string | null;
    contact_number: string | null;
    email: string | null;
    address: string | null;
    credit_limit: number;
    current_balance: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CompanyAccountCreate {
    name: string;
    contact_person?: string | null;
    contact_number?: string | null;
    email?: string | null;
    address?: string | null;
    credit_limit?: number;
}

export interface CompanyAccountUpdate {
    name?: string;
    contact_person?: string | null;
    contact_number?: string | null;
    email?: string | null;
    address?: string | null;
    credit_limit?: number;
    is_active?: boolean;
}

export interface Transaction {
    id: UUID;
    account_id: UUID;
    transaction_type: TransactionType;
    amount: number;
    description: string | null;
    reference_number: string | null;
    created_at: string;
}

export interface TransactionCreate {
    account_id: UUID;
    transaction_type: TransactionType;
    amount: number;
    description?: string | null;
    reference_number?: string | null;
    shift_id?: UUID | null;
}

export interface TransactionWithBalance extends Transaction {
    new_balance: number;
}

// ============================================================================
// Admin Types
// ============================================================================

export interface Station {
    id: UUID;
    name: string;
    code: string;
    address: string | null;
    owner_email: string | null;
    is_active: boolean;
    created_at: string;
}

export interface SupportAccess {
    id: UUID;
    station_id: UUID;
    enabled: boolean;
    reason: string | null;
    enabled_by: UUID | null;
    enabled_at: string | null;
    expires_at: string | null;
}

export interface SupportAccessToggle {
    enabled: boolean;
    reason?: string | null;
    expires_in_hours?: number | null;
}

export interface AuditLog {
    id: UUID;
    actor_id: UUID | null;
    station_id: UUID | null;
    action: string;
    entity_type: string | null;
    entity_id: UUID | null;
    details: Record<string, unknown> | null;
    created_at: string;
}

// ============================================================================
// Settlements Types (Card Terminals, Card/Shift Settlements)
// ============================================================================

export type CardProvider = 'visa_master' | 'amex';
export type TerminalStatus = 'active' | 'offline';
// SettlementStatus is already defined above: 'pending' | 'settled' | 'verified'

export interface CardTerminal {
    id: UUID;
    station_id: UUID;
    provider: CardProvider;
    terminal_id: string;
    label: string | null;
    bank_account: string | null;
    status: TerminalStatus;
    created_at: string;
    updated_at: string;
}

export interface CardTerminalCreate {
    provider: CardProvider;
    terminal_id: string;
    label?: string | null;
    bank_account?: string | null;
}

export interface CardTerminalUpdate {
    provider?: CardProvider;
    terminal_id?: string;
    label?: string | null;
    bank_account?: string | null;
    status?: TerminalStatus;
}

export interface CardSettlementCreate {
    terminal_id: UUID;
    shift_id?: UUID | null;
    batch_id?: string | null;
    settlement_date: string;
    settlement_time?: string | null;
    amount: number;
    notes?: string | null;
}

export interface CardSettlement {
    id: UUID;
    terminal_id: UUID;
    shift_id: UUID | null;
    batch_id: string | null;
    settlement_date: string;
    settlement_time: string | null;
    amount: number;
    notes: string | null;
    status: SettlementStatus;
    verified_at: string | null;
    verified_by: UUID | null;
    created_at: string;
    updated_at: string;
}

export interface CardSettlementUpdate {
    status?: SettlementStatus;
    notes?: string | null;
}

export interface ShiftSettlementCreate {
    shift_id: UUID;
    bank_name: string;
    bank_account?: string | null;
    deposit_method: string;
    amount: number;
    reference_number?: string | null;
    deposit_time?: string | null;
    proof_url?: string | null;
    notes?: string | null;
}

export interface ShiftSettlement {
    id: UUID;
    shift_id: UUID;
    bank_name: string;
    bank_account: string | null;
    deposit_method: string;
    amount: number;
    reference_number: string | null;
    deposit_time: string | null;
    proof_url: string | null;
    notes: string | null;
    status: SettlementStatus;
    verified_at: string | null;
    verified_by: UUID | null;
    created_at: string;
    updated_at: string;
}

export interface ShiftSettlementUpdate {
    status?: SettlementStatus;
    notes?: string | null;
}

// ============================================================================
// Expense Types
// ============================================================================

export interface Expense {
    id: UUID;
    station_id: UUID;
    shift_id: UUID | null;
    category: string;
    payee: string;
    description: string | null;
    invoice_number: string | null;
    amount: number;
    expense_date: string;
    approved_by: UUID | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface ExpenseCreate {
    category: string;
    payee: string;
    amount: number;
    description?: string | null;
    invoice_number?: string | null;
    expense_date?: string | null;
    shift_id?: UUID | null;
    notes?: string | null;
}

export interface ExpenseUpdate {
    category?: string | null;
    payee?: string | null;
    amount?: number | null;
    description?: string | null;
    invoice_number?: string | null;
    expense_date?: string | null;
    notes?: string | null;
}

export const EXPENSE_CATEGORIES = [
    'Transport',
    'Bowser',
    'Bills',
    'Utilities',
    'Refreshments',
    'Maintenance',
    'Office Supplies',
    'Fuel',
    'Wages',
    'Other',
] as const;

// ============================================================================
// Fuel Order Types
// ============================================================================

export type OrderStatus = 'pending' | 'delivered' | 'cancelled';

export interface FuelOrder {
    id: UUID;
    station_id: UUID;
    product_id: UUID;
    order_number: string | null;
    liters_ordered: number;
    supplier: string;
    status: OrderStatus;
    placed_at: string;
    expected_date: string | null;
    received_at: string | null;
    payment_made: boolean;
    notes: string | null;
    created_at: string;
    updated_at: string;
    // Optionally populated via join
    product_name?: string;
}

export interface FuelOrderCreate {
    product_id: UUID;
    order_number?: string | null;
    liters_ordered: number;
    supplier: string;
    expected_date?: string | null;
    notes?: string | null;
    placed_at?: string | null;
}

export interface FuelOrderUpdate {
    status?: OrderStatus | null;
    received_at?: string | null;
    payment_made?: boolean | null;
    notes?: string | null;
}

// ============================================================================
// Regulatory Return Types
// ============================================================================

export interface RegulatoryReturn {
    id: UUID;
    tank_id: UUID;
    shift_id: UUID | null;
    staff_id: UUID | null;
    liters_returned: number;
    reason: string | null;
    return_date: string;
    recorded_by: UUID | null;
    created_at: string;
    updated_at: string;
    // Optionally populated via join/frontend mapping
    tank_name?: string;
    recorded_by_name?: string;
}

export interface RegulatoryReturnCreate {
    tank_id: UUID;
    shift_id?: UUID | null;
    liters_returned: number;
    reason?: string | null;
    return_date?: string | null;
    staff_id?: UUID | null; // For UI mapping, backend uses recorded_by from token usually, but model allows explicit if needed?
    // Wait, let's check backend schema again. Backend schema RegulatoryReturnCreate has tank_id, shift_id, liters_returned, reason, return_date.
    // Backend route creates it and sets recorded_by = current_user.
    // BUT the requirement says "Replace mock STAFF with useEmployees() hook".
    // AND the database schema proposed in next_steps_for_inventory.md says "staff_id UUID REFERENCES employees(id)".
    // Let's check existing backend code for `RegulatoryReturn`.
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiError {
    detail: string;
}

