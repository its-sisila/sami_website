-- ============================================================================
-- SAMI Database Schema (Stage 1 & 2)
-- Compatible with Supabase PostgreSQL
-- ============================================================================
-- Version: 1.1.0
-- Date: 2025-12-21
-- Description: Complete schema for SAMI fuel station management system
-- Based on: accounts, inventory, sales, and staff pages only
-- ============================================================================

-- Enable UUID extension (Supabase has this by default, but good to be explicit)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- User roles for login users (profiles)
CREATE TYPE user_role AS ENUM ('system_admin', 'owner', 'manager', 'accountant');

-- Employee roles (non-login employees)
CREATE TYPE employee_role AS ENUM ('staff', 'pumper');

-- Attendance status
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'half_day', 'overtime');

-- Shift types
CREATE TYPE shift_type AS ENUM ('day', 'night');

-- Shift status
CREATE TYPE shift_status AS ENUM ('open', 'closed', 'reconciled');

-- Fuel order status
CREATE TYPE order_status AS ENUM ('pending', 'delivered', 'cancelled');

-- Settlement status
CREATE TYPE settlement_status AS ENUM ('pending', 'settled', 'verified');

-- Card provider type
CREATE TYPE card_provider AS ENUM ('visa_master', 'amex');

-- Transaction type for company accounts
CREATE TYPE transaction_type AS ENUM ('debit', 'credit');

-- Station status
CREATE TYPE station_status AS ENUM ('setup', 'active', 'suspended');

-- Terminal status
CREATE TYPE terminal_status AS ENUM ('active', 'offline');

-- ============================================================================
-- 1. AUTH & TENANTS
-- ============================================================================

-- Stations (fuel stations / tenants)
CREATE TABLE stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(500),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    status station_status NOT NULL DEFAULT 'setup',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE stations IS 'Fuel stations (tenants) in the SAMI system';

-- Profiles linked to auth.users
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'owner',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'User profiles linked to Supabase auth.users';

-- User-Station-Role mapping
-- Constraint: Each user belongs to exactly ONE station (except system_admin who can have none)
CREATE TABLE user_station_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Each user can only belong to ONE station
    CONSTRAINT uq_user_station UNIQUE (user_id)
);

COMMENT ON TABLE user_station_roles IS 'Maps users to stations. Each user belongs to exactly one station.';

-- Support Access (for System Admin temporary write access)
CREATE TABLE support_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    reason TEXT,
    enabled_by UUID REFERENCES profiles(id),
    enabled_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    disabled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE support_access IS 'Tracks System Admin support edit mode per station';

-- Audit Log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES profiles(id),
    station_id UUID REFERENCES stations(id),
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_log IS 'Audit trail for all important actions in the system';

-- ============================================================================
-- 2. HR & PAYROLL (from staff/page.tsx)
-- ============================================================================

-- Employees (staff/pumper - NOT login users)
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    employee_code VARCHAR(50),
    full_name VARCHAR(255) NOT NULL,
    name_with_initials VARCHAR(255),
    nic VARCHAR(50),
    address TEXT,
    phone VARCHAR(50),
    date_of_birth DATE,
    gender VARCHAR(20),
    role employee_role NOT NULL DEFAULT 'pumper',
    joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
    daily_wage NUMERIC(10, 2) NOT NULL DEFAULT 0,
    overtime_bonus NUMERIC(10, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE employees IS 'Station employees (staff/pumper) - do not have login accounts';

-- Shifts (need to declare before attendance for FK)
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    shift_type shift_type NOT NULL,
    date DATE NOT NULL,
    status shift_status NOT NULL DEFAULT 'open',
    opened_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    opened_by UUID REFERENCES profiles(id),
    closed_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- One shift per type per date per station
    CONSTRAINT uq_shift_station_type_date UNIQUE (station_id, shift_type, date)
);

COMMENT ON TABLE shifts IS 'Day/Night shifts per station';

-- Attendance records
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    status attendance_status NOT NULL DEFAULT 'present',
    time_in TIME,
    time_out TIME,
    marked_at TIMESTAMPTZ,
    marked_out_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- One attendance record per employee per date
    CONSTRAINT uq_attendance_employee_date UNIQUE (employee_id, date)
);

COMMENT ON TABLE attendance IS 'Daily attendance records for employees';

-- Advance Payments (from staff and sales pages)
CREATE TABLE advance_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TIME,
    reason TEXT,
    approved_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE advance_payments IS 'Advance payments given to employees';

-- ============================================================================
-- 3. INVENTORY & OPERATIONS (from inventory/page.tsx)
-- ============================================================================

-- Fuel Products
CREATE TABLE fuel_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL, -- e.g., LP92, LP95, LAD, LSD
    name VARCHAR(100) NOT NULL, -- e.g., Petrol 92, Petrol 95, Auto Diesel, Super Diesel
    price_per_liter NUMERIC(10, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_product_code_station UNIQUE (station_id, code)
);

COMMENT ON TABLE fuel_products IS 'Fuel product types per station';

-- Tanks
CREATE TABLE tanks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES fuel_products(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL, -- e.g., LAD-1, LP92-2
    tank_type VARCHAR(50), -- e.g., 3000G, 5000G
    capacity_liters NUMERIC(12, 2) NOT NULL,
    color VARCHAR(50), -- for UI visualization (blue, red, yellow, white)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tanks IS 'Fuel storage tanks at the station';

-- Pumps (from sales page nozzle mappings)
CREATE TABLE pumps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g., LP92 - 01, LAD - 02
    location VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE pumps IS 'Fuel dispensing pumps at the station';

-- Nozzles
CREATE TABLE nozzles (
    nozzle_id VARCHAR(50) PRIMARY KEY,  -- Human-readable ID (e.g., N-LAD-1)
    pump_id UUID NOT NULL REFERENCES pumps(id) ON DELETE CASCADE,
    tank_id UUID NOT NULL REFERENCES tanks(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES fuel_products(id) ON DELETE RESTRICT,
    nozzle_name VARCHAR(100),  -- Display name (e.g., LAD-1)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE nozzles IS 'Nozzles linked to pumps, tanks, and products';

-- Tank Readings (daily dip readings from inventory page)
CREATE TABLE tank_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tank_id UUID NOT NULL REFERENCES tanks(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    height_cm NUMERIC(10, 2),
    volume_liters NUMERIC(12, 2) NOT NULL,
    reading_type VARCHAR(50) DEFAULT 'manual', -- manual, automated
    recorded_by UUID REFERENCES profiles(id),
    meter_readings JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tank_readings IS 'Daily tank level readings (dip readings)';

-- Regulatory Returns (from inventory page)
CREATE TABLE regulatory_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tank_id UUID NOT NULL REFERENCES tanks(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    liters_returned NUMERIC(12, 2) NOT NULL,
    reason TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    recorded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE regulatory_returns IS 'Fuel returned to tanks (regulatory/adjustment)';

-- Fuel Orders (from inventory page Fuel Orders tab)
CREATE TABLE fuel_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES fuel_products(id) ON DELETE RESTRICT,
    order_number VARCHAR(50),
    liters_ordered NUMERIC(12, 2) NOT NULL,
    supplier VARCHAR(255) NOT NULL, -- e.g., CPC, Badulla, Kolonnawa
    status order_status NOT NULL DEFAULT 'pending',
    placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expected_date DATE,
    received_at TIMESTAMPTZ,
    payment_made BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE fuel_orders IS 'Fuel orders to suppliers';

-- Fuel Deliveries (from inventory page)
CREATE TABLE fuel_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES fuel_orders(id) ON DELETE SET NULL,
    tank_id UUID NOT NULL REFERENCES tanks(id) ON DELETE RESTRICT,
    liters_received NUMERIC(12, 2) NOT NULL,
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_time TIME,
    delivery_slip_number VARCHAR(100),
    vehicle_number VARCHAR(50),
    driver_name VARCHAR(255),
    recorded_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE fuel_deliveries IS 'Fuel deliveries received into tanks';

-- ============================================================================
-- 4. ACCOUNTS & FINANCE (from accounts/page.tsx)
-- Declared BEFORE sales because sales references these tables
-- ============================================================================

-- Company Accounts (credit customers - from Company Accounts tab)
CREATE TABLE company_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    contact_number VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    credit_limit NUMERIC(15, 2) NOT NULL DEFAULT 0,
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0, -- positive = owes, negative = credit
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE company_accounts IS 'Credit accounts for company/business customers';

-- Company Transactions (debits and credits)
CREATE TABLE company_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES company_accounts(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    transaction_type transaction_type NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    description TEXT,
    reference_number VARCHAR(100),
    recorded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE company_transactions IS 'Debit/credit transactions for company accounts';

-- Card Terminals (from Card Terminals tab)
CREATE TABLE card_terminals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    provider card_provider NOT NULL,
    terminal_id VARCHAR(100) NOT NULL, -- e.g., 40203510
    label VARCHAR(255), -- e.g., VISA/MASTER ID-11345671
    bank_account VARCHAR(255),
    status terminal_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE card_terminals IS 'Card payment terminals (VISA/Master, AMEX)';

-- Card Settlements (from Card Terminals tab - batch settlements)
CREATE TABLE card_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    terminal_id UUID NOT NULL REFERENCES card_terminals(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    batch_id VARCHAR(100),
    date DATE NOT NULL,
    time TIME,
    amount NUMERIC(15, 2) NOT NULL,
    status settlement_status NOT NULL DEFAULT 'pending',
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE card_settlements IS 'Card terminal batch settlements';

-- Shift Settlements / Deposits (from accounts page - cash deposits)
CREATE TABLE shift_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    bank_name VARCHAR(255) NOT NULL,
    bank_account VARCHAR(100),
    deposit_method VARCHAR(50) NOT NULL, -- CDM, Slip, Online
    amount NUMERIC(15, 2) NOT NULL,
    reference_number VARCHAR(100),
    deposit_time TIMESTAMPTZ,
    proof_url TEXT,
    status settlement_status NOT NULL DEFAULT 'pending',
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE shift_settlements IS 'Cash deposits from shift sales';

-- Expenses (from accounts page and sales page)
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    category VARCHAR(100) NOT NULL, -- Transport, Bowser, Bills, Utilities, Refreshments, Maintenance, Office Supplies, Other
    payee VARCHAR(255) NOT NULL, -- Threewheeler, CEB, Dialog, etc.
    description TEXT,
    invoice_number VARCHAR(100),
    amount NUMERIC(15, 2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    approved_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE expenses IS 'Operational expenses for the station';

-- ============================================================================
-- 5. SALES (from sales/page.tsx)
-- ============================================================================

-- Sales (per nozzle per shift - meter readings)
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    nozzle_id VARCHAR(50) NOT NULL REFERENCES nozzles(nozzle_id) ON DELETE RESTRICT,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL, -- pumper assigned
    start_meter_digital NUMERIC(12, 2) NOT NULL DEFAULT 0,
    end_meter_digital NUMERIC(12, 2) NOT NULL DEFAULT 0,
    start_meter_analog NUMERIC(12, 2),
    end_meter_analog NUMERIC(12, 2),
    liters_sold NUMERIC(12, 2) NOT NULL DEFAULT 0,
    price_per_liter NUMERIC(10, 2) NOT NULL,
    amount_lkr NUMERIC(15, 2) NOT NULL DEFAULT 0,
    is_submitted BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sales IS 'Sales records per nozzle per shift (meter readings)';

-- Card Sales (from sales page - card entries per nozzle or per shift)
CREATE TABLE card_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL, -- Optional: links to specific nozzle sale
    nozzle_id VARCHAR(50) REFERENCES nozzles(nozzle_id) ON DELETE RESTRICT, -- Optional: direct nozzle reference
    terminal_id UUID NOT NULL REFERENCES card_terminals(id) ON DELETE RESTRICT,
    batch_number VARCHAR(100),
    settlement_datetime TIMESTAMPTZ,
    amount NUMERIC(15, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE card_sales IS 'Card payment entries linked to nozzle sales';

-- Credit Sales (from sales page - company credit entries per nozzle or per shift)
CREATE TABLE credit_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL, -- Optional: links to specific nozzle sale
    nozzle_id VARCHAR(50) REFERENCES nozzles(nozzle_id) ON DELETE RESTRICT, -- Optional: direct nozzle reference
    account_id UUID NOT NULL REFERENCES company_accounts(id) ON DELETE RESTRICT,
    po_number VARCHAR(100),
    vehicle_number VARCHAR(50),
    liters NUMERIC(12, 2),
    amount NUMERIC(15, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE credit_sales IS 'Company credit sales linked to nozzle sales';

-- ============================================================================
-- 6. INDEXES
-- ============================================================================

-- Auth & Tenants
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_user_station_roles_station ON user_station_roles(station_id);
CREATE INDEX idx_support_access_station ON support_access(station_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_station ON audit_log(station_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- HR & Payroll
CREATE INDEX idx_employees_station ON employees(station_id);
CREATE INDEX idx_employees_active ON employees(station_id, is_active);
CREATE INDEX idx_attendance_employee ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_shift ON attendance(shift_id);
CREATE INDEX idx_advance_payments_employee ON advance_payments(employee_id);
CREATE INDEX idx_advance_payments_date ON advance_payments(date);

-- Inventory & Operations
CREATE INDEX idx_fuel_products_station ON fuel_products(station_id);
CREATE INDEX idx_tanks_station ON tanks(station_id);
CREATE INDEX idx_tanks_product ON tanks(product_id);
CREATE INDEX idx_pumps_station ON pumps(station_id);
CREATE INDEX idx_nozzles_pump ON nozzles(pump_id);
CREATE INDEX idx_nozzles_tank ON nozzles(tank_id);
CREATE INDEX idx_tank_readings_tank ON tank_readings(tank_id);
CREATE INDEX idx_tank_readings_date ON tank_readings(date);
CREATE INDEX idx_shifts_station ON shifts(station_id);
CREATE INDEX idx_shifts_date ON shifts(date);
CREATE INDEX idx_shifts_status ON shifts(station_id, status);
CREATE INDEX idx_regulatory_returns_tank ON regulatory_returns(tank_id);
CREATE INDEX idx_fuel_orders_station ON fuel_orders(station_id);
CREATE INDEX idx_fuel_orders_status ON fuel_orders(station_id, status);
CREATE INDEX idx_fuel_orders_product ON fuel_orders(product_id);
CREATE INDEX idx_fuel_deliveries_order ON fuel_deliveries(order_id);
CREATE INDEX idx_fuel_deliveries_tank ON fuel_deliveries(tank_id);

-- Accounts & Finance
CREATE INDEX idx_company_accounts_station ON company_accounts(station_id);
CREATE INDEX idx_company_transactions_account ON company_transactions(account_id);
CREATE INDEX idx_card_terminals_station ON card_terminals(station_id);
CREATE INDEX idx_card_settlements_terminal ON card_settlements(terminal_id);
CREATE INDEX idx_card_settlements_status ON card_settlements(status);
CREATE INDEX idx_shift_settlements_shift ON shift_settlements(shift_id);
CREATE INDEX idx_shift_settlements_status ON shift_settlements(status);
CREATE INDEX idx_expenses_station ON expenses(station_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(station_id, category);

-- Sales
CREATE INDEX idx_sales_shift ON sales(shift_id);
CREATE INDEX idx_sales_nozzle ON sales(nozzle_id);
CREATE INDEX idx_sales_employee ON sales(employee_id);
CREATE INDEX idx_card_sales_shift ON card_sales(shift_id);
CREATE INDEX idx_card_sales_sale ON card_sales(sale_id);
CREATE INDEX idx_card_sales_terminal ON card_sales(terminal_id);
CREATE INDEX idx_card_sales_nozzle ON card_sales(nozzle_id);
CREATE INDEX idx_credit_sales_shift ON credit_sales(shift_id);
CREATE INDEX idx_credit_sales_sale ON credit_sales(sale_id);
CREATE INDEX idx_credit_sales_account ON credit_sales(account_id);
CREATE INDEX idx_credit_sales_nozzle ON credit_sales(nozzle_id);

-- ============================================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================================
-- Enable RLS on all tables (policies to be added later)

ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_station_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE advance_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE nozzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tank_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_sales ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 8. TRIGGERS FOR updated_at
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER set_updated_at_stations BEFORE UPDATE ON stations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_user_station_roles BEFORE UPDATE ON user_station_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_support_access BEFORE UPDATE ON support_access FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_employees BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_attendance BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_advance_payments BEFORE UPDATE ON advance_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_shifts BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_fuel_products BEFORE UPDATE ON fuel_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_tanks BEFORE UPDATE ON tanks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_pumps BEFORE UPDATE ON pumps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_nozzles BEFORE UPDATE ON nozzles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_tank_readings BEFORE UPDATE ON tank_readings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_regulatory_returns BEFORE UPDATE ON regulatory_returns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_fuel_orders BEFORE UPDATE ON fuel_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_fuel_deliveries BEFORE UPDATE ON fuel_deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_company_accounts BEFORE UPDATE ON company_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_card_terminals BEFORE UPDATE ON card_terminals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_card_settlements BEFORE UPDATE ON card_settlements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_shift_settlements BEFORE UPDATE ON shift_settlements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_expenses BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_sales BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_card_sales BEFORE UPDATE ON card_sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_credit_sales BEFORE UPDATE ON credit_sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
