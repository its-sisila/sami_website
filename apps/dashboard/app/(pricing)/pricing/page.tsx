"use client";

import { useState } from "react";
import { Calculator, TrendingUp, DollarSign, Percent, RefreshCw, Sparkles, AlertTriangle, TrendingDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
    calculateFuelPrice,
    formatCurrency,
    getFuelTypeName,
    type FuelType,
    type PricingInputs,
    type PricingBreakdown,
} from "@/lib/pricing-formula";
import { usePricingData } from "@/lib/hooks/use-pricing-data";
import api from "@/lib/api/client";

const AI_DEFAULT_PROMPT =
    "Based on current global MOPS and LKR rates, what is your inventory recommendation for Petrol 92 and Diesel for the upcoming week?";

/**
 * Determine the alert style based on advice content.
 * - "stock up" / "surge" → amber/warning
 * - "run down"           → blue/calm
 * - fallback             → neutral slate
 */
function getAdviceSentiment(advice: string): "warning" | "calm" | "neutral" {
    const lower = advice.toLowerCase();
    if (lower.includes("stock up") || lower.includes("surge")) return "warning";
    if (lower.includes("run down")) return "calm";
    return "neutral";
}

const SENTIMENT_STYLES = {
    warning: {
        border: "border-amber-500/40",
        bg: "bg-gradient-to-br from-amber-950/60 via-amber-900/30 to-slate-900/80",
        glow: "shadow-amber-500/10",
        icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
        badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        badgeText: "Action Required",
        accentBar: "bg-amber-500",
    },
    calm: {
        border: "border-sky-500/40",
        bg: "bg-gradient-to-br from-sky-950/60 via-sky-900/30 to-slate-900/80",
        glow: "shadow-sky-500/10",
        icon: <TrendingDown className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />,
        badge: "bg-sky-500/20 text-sky-300 border-sky-500/30",
        badgeText: "Market Declining",
        accentBar: "bg-sky-500",
    },
    neutral: {
        border: "border-slate-600/40",
        bg: "bg-gradient-to-br from-slate-800/60 via-slate-900/30 to-slate-900/80",
        glow: "shadow-slate-500/5",
        icon: <Sparkles className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />,
        badge: "bg-red-500/20 text-red-300 border-red-500/30",
        badgeText: "Market Stable",
        accentBar: "bg-red-500",
    },
} as const;

export default function PricingPage() {
    const { pricingData, isLoading: loadingPricing, error: pricingError } = usePricingData();

    const [inputs, setInputs] = useState<PricingInputs>({
        fuelType: "diesel",
        mopsPrice: 0,
        premium: 0,
        exchangeRate: 0,
    });

    // Optional tax overrides (if 0, will use TAX_RATES from formula)
    const [taxOverrides, setTaxOverrides] = useState({
        customsDuty: 0 as number | '',
        exciseDuty: 0 as number | '',
        palLevy: 0 as number | '',
        ssclRate: 1.25 as number | '',
    });

    const [breakdown, setBreakdown] = useState<PricingBreakdown | null>(null);

    // ----- AI Analyst state -----
    const [analystAdvice, setAnalystAdvice] = useState<string | null>(null);
    const [analystLoading, setAnalystLoading] = useState(false);

    const handleAskAnalyst = async () => {
        setAnalystLoading(true);
        setAnalystAdvice(null);
        try {
            const { advice } = await api.pricing.askAnalyst(AI_DEFAULT_PROMPT);
            setAnalystAdvice(advice);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to get AI advice";
            toast.error(message);
        } finally {
            setAnalystLoading(false);
        }
    };

    const handleCalculate = () => {
        const result = calculateFuelPrice({
            ...inputs,
            taxOverrides: {
                customsDuty: taxOverrides.customsDuty === '' ? 0 : taxOverrides.customsDuty,
                exciseDuty: taxOverrides.exciseDuty === '' ? 0 : taxOverrides.exciseDuty,
                palLevy: taxOverrides.palLevy === '' ? 0 : taxOverrides.palLevy,
                ssclRate: taxOverrides.ssclRate === '' ? 0 : taxOverrides.ssclRate,
            },
        });
        setBreakdown(result);
    };

    const handleInputChange = (field: keyof PricingInputs, value: string | FuelType) => {
        setInputs((prev) => {
            const updates: Partial<PricingInputs> = {
                [field]: typeof value === "string" && field !== "fuelType" ? parseFloat(value) || 0 : value,
            };

            // Auto-switch MOPS price if the user changes Fuel Type and the current price matches the previous live data
            if (field === "fuelType" && pricingData) {
                const newFuel = value as FuelType;

                if (prev.fuelType === "diesel" && newFuel === "petrol_92" && prev.mopsPrice === pricingData.gasoil_average) {
                    updates.mopsPrice = pricingData.mogas_92_average || prev.mopsPrice;
                } else if (prev.fuelType === "petrol_92" && newFuel === "diesel" && prev.mopsPrice === pricingData.mogas_92_average) {
                    updates.mopsPrice = pricingData.gasoil_average || prev.mopsPrice;
                }
            }

            return {
                ...prev,
                ...updates,
            };
        });
    };

    const handleUseLiveData = () => {
        if (!pricingData) {
            toast.error("Unable to load live market data");
            return;
        }

        const hasMogas = pricingData.mogas_92_average !== null;
        const hasGasoil = pricingData.gasoil_average !== null;
        const hasExchange = pricingData.exchange_rate !== null;

        if (!hasMogas && !hasGasoil && !hasExchange) {
            toast.warning("No live data available yet. Please check back later.");
            return;
        }

        setInputs((prev) => ({
            ...prev,
            mopsPrice: inputs.fuelType === "petrol_92"
                ? (pricingData.mogas_92_average || prev.mopsPrice)
                : (pricingData.gasoil_average || prev.mopsPrice),
            exchangeRate: pricingData.exchange_rate || prev.exchangeRate,
        }));

        toast.success("Live market data applied");
    };

    // Compute sentiment styling once
    const sentiment = analystAdvice ? getAdviceSentiment(analystAdvice) : null;
    const styles = sentiment ? SENTIMENT_STYLES[sentiment] : null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-red-900 p-2 rounded-lg">
                            <Calculator className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white">Price Formula Calculator</h1>
                    </div>
                    <p className="text-slate-400">
                        Calculate fuel prices based on the 2025 Sri Lankan Formula (MOPS-based)
                    </p>
                </div>

                {/* ── AI Market Analyst Section ── */}
                <div className="mb-8 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden">
                    {/* Top accent bar */}
                    <div className="h-1 bg-gradient-to-r from-red-600 via-red-500 to-amber-500" />

                    <div className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="bg-gradient-to-br from-red-600 to-red-600 p-2.5 rounded-xl shadow-lg shadow-purple-500/20">
                                        <Sparkles className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white tracking-tight">
                                        SAMI AI Analyst Advice
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Powered by Gemini &bull; Real-time MOPS & LKR analysis
                                    </p>
                                </div>
                            </div>

                            <Button
                                onClick={handleAskAnalyst}
                                disabled={analystLoading}
                                className="bg-gradient-to-r from-red-600 to-re-600 hover:from-red-500 hover:to-red-500 text-white font-medium px-5 py-2.5 rounded-lg shadow-lg shadow-red-500/20 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {analystLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Analysing…
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Get AI Market Advice
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Loading shimmer */}
                        {analystLoading && (
                            <div className="space-y-3 animate-pulse">
                                <div className="h-4 bg-slate-700/60 rounded-full w-3/4" />
                                <div className="h-4 bg-slate-700/40 rounded-full w-1/2" />
                                <div className="h-4 bg-slate-700/30 rounded-full w-2/3" />
                            </div>
                        )}

                        {/* Advice display */}
                        {analystAdvice && styles && (
                            <div
                                className={`
                                    relative rounded-xl border ${styles.border} ${styles.bg}
                                    shadow-lg ${styles.glow}
                                    transition-all duration-500 ease-out
                                `}
                            >
                                {/* Thin left accent bar */}
                                <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-full ${styles.accentBar}`} />

                                <div className="pl-6 pr-5 py-5">
                                    <div className="flex items-start gap-3">
                                        {styles.icon}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span
                                                    className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border ${styles.badge}`}
                                                >
                                                    {styles.badgeText}
                                                </span>
                                            </div>
                                            <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
                                                {analystAdvice}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Empty-state hint */}
                        {!analystAdvice && !analystLoading && (
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                <Sparkles className="w-3 h-3" />
                                Click the button above to get live AI-powered market advice
                            </div>
                        )}
                    </div>
                </div>
                {/* ── End AI Market Analyst Section ── */}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Input Panel */}
                    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
                        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-red-400" />
                            Input Parameters
                        </h2>

                        <div className="space-y-4">
                            {/* Use Live Data Button */}
                            <div className="border border-slate-700 rounded-lg p-4 bg-slate-800/30">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <p className="text-sm font-medium text-white">Live Market Data</p>
                                        {pricingData?.last_updated && (
                                            <p className="text-xs text-slate-500">
                                                Updated: {new Date(pricingData.last_updated).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        onClick={handleUseLiveData}
                                        disabled={loadingPricing || !pricingData}
                                        className="bg-green-900 hover:bg-green-800 text-white text-sm disabled:opacity-50"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-1.5" />
                                        {loadingPricing ? "Loading..." : "Use Live Data"}
                                    </Button>
                                </div>
                                {pricingError && (
                                    <p className="text-xs text-red-400">Unable to load live data</p>
                                )}
                            </div>

                            {/* Fuel Type */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Fuel Type
                                </label>
                                <select
                                    value={inputs.fuelType}
                                    onChange={(e) => handleInputChange("fuelType", e.target.value as FuelType)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                    <option value="petrol_92">Petrol 92</option>
                                    <option value="diesel">Diesel</option>
                                </select>
                            </div>

                            {/* MOPS Price */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    MOPS Price (USD/barrel)
                                    <span className="text-xs text-slate-500 ml-2">Mean of Platts Singapore</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={inputs.mopsPrice}
                                    onChange={(e) => handleInputChange("mopsPrice", e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>

                            {/* Premium */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Premium (USD/barrel)
                                    <span className="text-xs text-slate-500 ml-2">Freight + Insurance + Margin</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={inputs.premium}
                                    onChange={(e) => handleInputChange("premium", e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>

                            {/* Exchange Rate */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Exchange Rate (LKR/USD)
                                    <span className="text-xs text-slate-500 ml-2">CBSL TT Selling Rate</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={inputs.exchangeRate}
                                    onChange={(e) => handleInputChange("exchangeRate", e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>


                            {/* Taxation Inputs (Optional Override) */}
                            <div className="border-t border-slate-700 pt-4">
                                <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                                    <Percent className="w-4 h-4 text-red-400" />
                                    Taxation (LKR/Liter) - Optional Override
                                </h3>
                                <p className="text-xs text-slate-400 mb-3">
                                    Leave at 0 to use configured rates. Enter values to override for testing.
                                </p>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Customs Duty</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={taxOverrides.customsDuty}
                                            onChange={(e) => setTaxOverrides(prev => ({ ...prev, customsDuty: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 }))}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Excise Duty</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={taxOverrides.exciseDuty}
                                            onChange={(e) => setTaxOverrides(prev => ({ ...prev, exciseDuty: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 }))}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">PAL Levy</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={taxOverrides.palLevy}
                                            onChange={(e) => setTaxOverrides(prev => ({ ...prev, palLevy: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 }))}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">SSCL Rate (%)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={taxOverrides.ssclRate}
                                            onChange={(e) => setTaxOverrides(prev => ({ ...prev, ssclRate: e.target.value === '' ? '' : parseFloat(e.target.value) || 1.25 }))}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                        />
                                    </div>
                                </div>
                            </div>


                            {/* Calculate Button */}
                            <Button
                                onClick={handleCalculate}
                                className="w-full bg-red-900 hover:bg-red-800 text-white py-3 rounded-lg font-semibold transition-colors"
                            >
                                <Calculator className="w-5 h-5 mr-2" />
                                Calculate Price
                            </Button>
                        </div>
                    </div>

                    {/* Results Panel */}
                    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
                        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                            Calculation Results
                        </h2>

                        {breakdown ? (
                            <div className="space-y-4">
                                {/* MRP Display */}
                                <div className="bg-gradient-to-br from-red-900/30 to-red-800/20 border border-red-700/50 rounded-xl p-6">
                                    <p className="text-sm text-slate-400 mb-1">Maximum Retail Price (MRP)</p>
                                    <p className="text-4xl font-bold text-white">{formatCurrency(breakdown.mrp)}</p>
                                    <p className="text-xs text-slate-500 mt-1">per Liter for {getFuelTypeName(inputs.fuelType)}</p>
                                </div>

                                {/* Breakdown */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-slate-300 border-b border-slate-700 pb-2">
                                        Cost Breakdown
                                    </h3>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                                            <div>
                                                <p className="text-sm font-medium text-white">V1 - Landed Cost</p>
                                                <p className="text-xs text-slate-500">
                                                    {formatCurrency(breakdown.v1_usd_per_liter, "USD")} × {inputs.exchangeRate}
                                                </p>
                                            </div>
                                            <p className="text-lg font-semibold text-white">{formatCurrency(breakdown.v1_landedCost)}</p>
                                        </div>

                                        <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                                            <div>
                                                <p className="text-sm font-medium text-white">V2 - Processing Cost</p>
                                                <p className="text-xs text-slate-500">Fixed operational cost</p>
                                            </div>
                                            <p className="text-lg font-semibold text-white">{formatCurrency(breakdown.v2_processingCost)}</p>
                                        </div>

                                        <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                                            <div>
                                                <p className="text-sm font-medium text-white">V3 - Admin Cost</p>
                                                <p className="text-xs text-slate-500">2% of V1</p>
                                            </div>
                                            <p className="text-lg font-semibold text-white">{formatCurrency(breakdown.v3_adminCost)}</p>
                                        </div>

                                        <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                                            <div>
                                                <p className="text-sm font-medium text-white">V4 - Taxation</p>
                                                <p className="text-xs text-slate-500">Customs + Excise + PAL + SSCL</p>
                                            </div>
                                            <p className="text-lg font-semibold text-white">{formatCurrency(breakdown.v4_taxation)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Additional Info */}
                                <div className="border-t border-slate-700 pt-4 space-y-2 text-xs text-slate-500">
                                    <p>• Evaporation Loss: {formatCurrency(breakdown.evaporationLoss, "USD")} (0.3%)</p>
                                    <p>• Cost per barrel: ${(inputs.mopsPrice + inputs.premium).toFixed(2)}</p>
                                    <p>• Formula Version: 2025 Revision</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                                <Calculator className="w-16 h-16 text-slate-700 mb-4" />
                                <p className="text-slate-400 text-sm">
                                    Enter parameters and click <span className="font-semibold">Calculate Price</span> to see results
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
