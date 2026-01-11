-- Migration: Add fuel_deliveries table
-- This table records fuel deliveries received into tanks
-- Run this in Supabase SQL Editor

-- First, ensure the fuel_orders table exists (in case it wasn't created)
CREATE TABLE IF NOT EXISTS fuel_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES fuel_products(id) ON DELETE RESTRICT,
    order_number VARCHAR(50),
    liters_ordered NUMERIC(12, 2) NOT NULL,
    supplier VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'cancelled')),
    placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expected_date DATE,
    received_at TIMESTAMPTZ,
    payment_made BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create fuel_deliveries table
CREATE TABLE IF NOT EXISTS fuel_deliveries (
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_fuel_deliveries_tank_id ON fuel_deliveries(tank_id);
CREATE INDEX IF NOT EXISTS idx_fuel_deliveries_order_id ON fuel_deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_fuel_deliveries_delivery_date ON fuel_deliveries(delivery_date);
CREATE INDEX IF NOT EXISTS idx_fuel_orders_station_id ON fuel_orders(station_id);
CREATE INDEX IF NOT EXISTS idx_fuel_orders_status ON fuel_orders(status);

-- Enable RLS
ALTER TABLE fuel_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fuel_orders
DROP POLICY IF EXISTS "fuel_orders_select" ON fuel_orders;
CREATE POLICY "fuel_orders_select" ON fuel_orders
    FOR SELECT USING (
        station_id IN (SELECT station_id FROM user_station_roles WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'system_admin')
    );

DROP POLICY IF EXISTS "fuel_orders_insert" ON fuel_orders;
CREATE POLICY "fuel_orders_insert" ON fuel_orders
    FOR INSERT WITH CHECK (
        station_id IN (SELECT station_id FROM user_station_roles WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "fuel_orders_update" ON fuel_orders;
CREATE POLICY "fuel_orders_update" ON fuel_orders
    FOR UPDATE USING (
        station_id IN (SELECT station_id FROM user_station_roles WHERE user_id = auth.uid())
    );

-- RLS Policies for fuel_deliveries (access via tank -> station)
DROP POLICY IF EXISTS "fuel_deliveries_select" ON fuel_deliveries;
CREATE POLICY "fuel_deliveries_select" ON fuel_deliveries
    FOR SELECT USING (
        tank_id IN (
            SELECT t.id FROM tanks t 
            JOIN user_station_roles usr ON t.station_id = usr.station_id 
            WHERE usr.user_id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'system_admin')
    );

DROP POLICY IF EXISTS "fuel_deliveries_insert" ON fuel_deliveries;
CREATE POLICY "fuel_deliveries_insert" ON fuel_deliveries
    FOR INSERT WITH CHECK (
        tank_id IN (
            SELECT t.id FROM tanks t 
            JOIN user_station_roles usr ON t.station_id = usr.station_id 
            WHERE usr.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "fuel_deliveries_update" ON fuel_deliveries;
CREATE POLICY "fuel_deliveries_update" ON fuel_deliveries
    FOR UPDATE USING (
        tank_id IN (
            SELECT t.id FROM tanks t 
            JOIN user_station_roles usr ON t.station_id = usr.station_id 
            WHERE usr.user_id = auth.uid()
        )
    );

-- Also add regulatory_returns table if it doesn't exist
CREATE TABLE IF NOT EXISTS regulatory_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tank_id UUID NOT NULL REFERENCES tanks(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    liters_returned NUMERIC(12, 2) NOT NULL,
    reason TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    recorded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_regulatory_returns_tank_id ON regulatory_returns(tank_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_returns_date ON regulatory_returns(date);

ALTER TABLE regulatory_returns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "regulatory_returns_select" ON regulatory_returns;
CREATE POLICY "regulatory_returns_select" ON regulatory_returns
    FOR SELECT USING (
        tank_id IN (
            SELECT t.id FROM tanks t 
            JOIN user_station_roles usr ON t.station_id = usr.station_id 
            WHERE usr.user_id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'system_admin')
    );

DROP POLICY IF EXISTS "regulatory_returns_insert" ON regulatory_returns;
CREATE POLICY "regulatory_returns_insert" ON regulatory_returns
    FOR INSERT WITH CHECK (
        tank_id IN (
            SELECT t.id FROM tanks t 
            JOIN user_station_roles usr ON t.station_id = usr.station_id 
            WHERE usr.user_id = auth.uid()
        )
    );
