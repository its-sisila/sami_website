/**
 * Sri Lankan Fuel Price Formula Calculator (2025 Revision)
 * Based on: docs/stage_3_price_formula.md
 * 
 * Formula: MRP = V1 + V2 + V3 + V4
 * - V1: Landed Cost = (MOPS + Premium + Evaporation) × Exchange Rate
 * - V2: Processing Cost (Fixed USD/L)
 * - V3: Administrative Cost (2% of V1)
 * - V4: Taxation
 */

export type FuelType = 'petrol_92' | 'diesel';

export interface PricingInputs {
    fuelType: FuelType;

    // V1 Components (in USD/barrel)
    mopsPrice: number;           // Mean of Platts Singapore (USD/bbl)
    premium: number;             // Freight, insurance, supplier margin (USD/bbl)

    // Exchange Rate
    exchangeRate: number;        // LKR/USD (CBSL TT Selling Rate)

    // Optional V4 Taxation Overrides (LKR/L) - if provided, overrides TAX_RATES
    taxOverrides?: {
        customsDuty?: number;     // Customs Import Duty
        exciseDuty?: number;      // Excise Duty
        palLevy?: number;         // Ports & Airports Development Levy
        ssclRate?: number;        // Social Security Contribution Levy (%)
    };
}

export interface PricingBreakdown {
    // Cost Components (LKR/L)
    v1_landedCost: number;
    v2_processingCost: number;
    v3_adminCost: number;
    v4_taxation: number;

    // Final MRP
    mrp: number;

    // Additional Info
    v1_usd_per_liter: number;    // Landed cost before exchange
    evaporationLoss: number;     // 0.3% evaporation
}

// Constants
const BARRELS_TO_LITERS = 158.987;
const EVAPORATION_RATE = 0.003; // 0.3%

// V2 Processing Costs (USD/L)
const PROCESSING_COSTS: Record<FuelType, number> = {
    petrol_92: 0.06,
    diesel: 0.05,
};

// V3 Admin Cost Rate
const ADMIN_COST_RATE = 0.02; // 2% of V1

// V4 Taxation Configuration (LKR/L)
// ⚠️ CONFIDENTIAL: Fill these values from your private source (gazette/official rates)
// These are placeholder values - update them based on actual tax rates
const TAX_RATES = {
    diesel: {
        customsDuty: 18,      // LKR/L - Customs Import Duty (CID)
        exciseDuty: 0,       // LKR/L - Excise Duty
        palLevy: 0,          // LKR/L - Ports & Airports Development Levy
        ssclRate: 1.25,      // % - Social Security Contribution Levy (fixed at 1.25%)
    },
    petrol_92: {
        customsDuty: 18,      // LKR/L - Customs Import Duty (CID)
        exciseDuty: 0,       // LKR/L - Excise Duty
        palLevy: 0,          // LKR/L - Ports & Airports Development Levy
        ssclRate: 1.25,      // % - Social Security Contribution Levy (fixed at 1.25%)
    },
};

/**
 * Calculate the Maximum Retail Price (MRP) for fuel
 */
export function calculateFuelPrice(inputs: PricingInputs): PricingBreakdown {
    const {
        fuelType,
        mopsPrice,
        premium,
        exchangeRate,
    } = inputs;

    // Step 1: Calculate V1 (Landed Cost)
    // V1 = (MOPS + Premium) × (1 + Evaporation%) ÷ Barrels_to_Liters × Exchange_Rate
    const evaporationLoss = (mopsPrice + premium) * EVAPORATION_RATE;
    const totalCostPerBarrel = mopsPrice + premium + evaporationLoss;
    const v1_usd_per_liter = totalCostPerBarrel / BARRELS_TO_LITERS;
    const v1_landedCost = v1_usd_per_liter * exchangeRate;

    // Step 2: Calculate V2 (Processing Cost)
    // Fixed USD/L converted to LKR
    const v2_processingCost = PROCESSING_COSTS[fuelType] * exchangeRate;

    // Step 3: Calculate V3 (Administrative Cost)
    // 2% of V1
    const v3_adminCost = v1_landedCost * ADMIN_COST_RATE;

    // Step 4: Calculate V4 (Taxation)
    // Use tax overrides if provided (and non-zero), otherwise use TAX_RATES
    const defaultTaxRates = TAX_RATES[fuelType];
    const taxRates = {
        customsDuty: inputs.taxOverrides?.customsDuty || defaultTaxRates.customsDuty,
        exciseDuty: inputs.taxOverrides?.exciseDuty || defaultTaxRates.exciseDuty,
        palLevy: inputs.taxOverrides?.palLevy || defaultTaxRates.palLevy,
        ssclRate: inputs.taxOverrides?.ssclRate || defaultTaxRates.ssclRate,
    };

    // Base taxes (fixed LKR/L amounts)
    const baseTaxes = taxRates.customsDuty + taxRates.exciseDuty + taxRates.palLevy;

    // SSCL is calculated as a percentage of (V1 + V2 + V3 + Base Taxes)
    const baseForSSCL = v1_landedCost + v2_processingCost + v3_adminCost + baseTaxes;
    const ssclAmount = baseForSSCL * (taxRates.ssclRate / 100);

    // Total taxation
    const v4_taxation = baseTaxes + ssclAmount;

    // Step 5: Calculate MRP
    const mrp = v1_landedCost + v2_processingCost + v3_adminCost + v4_taxation;

    return {
        v1_landedCost,
        v2_processingCost,
        v3_adminCost,
        v4_taxation,
        mrp,
        v1_usd_per_liter,
        evaporationLoss,
    };
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number, currency: 'LKR' | 'USD' = 'LKR'): string {
    if (currency === 'LKR') {
        return `Rs. ${value.toFixed(2)}`;
    }
    return `$${value.toFixed(4)}`;
}

/**
 * Get fuel type display name
 */
export function getFuelTypeName(fuelType: FuelType): string {
    return fuelType === 'petrol_92' ? 'Petrol 92' : 'Diesel';
}
