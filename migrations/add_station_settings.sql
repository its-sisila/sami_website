-- Migration: Add station_settings table
-- Created: 2026-01-07
-- Description: Adds table for station-specific settings like alert thresholds

-- Create station_settings table
CREATE TABLE IF NOT EXISTS station_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL UNIQUE REFERENCES stations(id) ON DELETE CASCADE,
    late_arrival_threshold INTEGER NOT NULL DEFAULT 10,
    early_departure_threshold INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on station_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_station_settings_station_id ON station_settings(station_id);

-- Add trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_station_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_station_settings_updated_at
    BEFORE UPDATE ON station_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_station_settings_updated_at();

-- Comment on table
COMMENT ON TABLE station_settings IS 'Station-specific settings including alert thresholds';
COMMENT ON COLUMN station_settings.late_arrival_threshold IS 'Minutes after shift start before flagging as late';
COMMENT ON COLUMN station_settings.early_departure_threshold IS 'Minutes before shift end to flag as early departure';
