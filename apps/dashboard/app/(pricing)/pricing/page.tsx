"use client";

import { useState } from "react";
import useSWR from "swr";
import { Calculator, TrendingUp, DollarSign, Percent, RefreshCw, Sparkles, AlertTriangle, TrendingDown, Loader2, Activity, Globe, BarChart3, Newspaper, ExternalLink, MapPin, Minus, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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
import WorldGlobe from "@/components/ui/WorldGlobe";

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
        border: "border-emerald-200",
        bg: "bg-emerald-50/50 backdrop-blur-md",
        glow: "shadow-emerald-500/5",
        icon: <AlertTriangle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
        badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
        badgeText: "Action Required",
        accentBar: "bg-emerald-500",
    },
    calm: {
        border: "border-sky-200",
        bg: "bg-sky-50/50 backdrop-blur-md",
        glow: "shadow-sky-500/5",
        icon: <TrendingDown className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />,
        badge: "bg-sky-100 text-sky-700 border-sky-200",
        badgeText: "Favorable conditions",
        accentBar: "bg-sky-500",
    },
    neutral: {
        border: "border-slate-200",
        bg: "bg-slate-50/50 backdrop-blur-md",
        glow: "shadow-none",
        icon: <Minus className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />,
        badge: "bg-slate-100 text-slate-700 border-slate-200",
        badgeText: "Market Stable",
        accentBar: "bg-slate-400",
    },
} as const;

export default function PricingPage() {
    const { pricingData, isLoading: loadingPricing, error: pricingError } = usePricingData();
    const [activeChartPeriod, setActiveChartPeriod] = useState<'1W' | '1M' | '3M' | '1Y'>('1M');

    const filterChartData = (data: any[], period: string) => {
        if (!data || data.length === 0) return [];
        let days = 30;
        if (period === '1W') days = 7;
        else if (period === '1M') days = 30;
        else if (period === '3M') days = 90;
        else if (period === '1Y') days = 365;
        return data.slice(-days);
    };

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
    const [analystError, setAnalystError] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [isLocalFallback, setIsLocalFallback] = useState(false);

    // Generate a local, formula-based advice report using FRESHLY SCRAPED live data
    const generateLocalFallbackAdvice = (snapshot?: {
        mogas_92_price: number | null;
        gasoil_price: number | null;
        exchange_rate: number | null;
        crude_oil_price: number | null;
        fetched_at: string;
    }): string => {
        // Use fresh snapshot data first, then DB data, then user inputs as last resort
        const liveExchangeRate = snapshot?.exchange_rate ?? pricingData?.exchange_rate ?? inputs.exchangeRate;
        const liveMogasPrice = snapshot?.mogas_92_price ?? pricingData?.mogas_92_average ?? inputs.mopsPrice;
        const liveGasoilPrice = snapshot?.gasoil_price ?? pricingData?.gasoil_average ?? inputs.mopsPrice;
        const liveCrudePrice = snapshot?.crude_oil_price ?? null;
        const livePremium = inputs.premium > 0 ? inputs.premium : 3.5;
        const fetchedAt = snapshot?.fetched_at ?? null;

        const hasData = liveExchangeRate > 0 && (liveMogasPrice > 0 || liveGasoilPrice > 0);

        if (!hasData) {
            return [
                "## ⚡ Formula Price Analysis",
                "",
                "The AI analyst is temporarily unavailable and live market data could not be fetched.",
                "Please click **Use Live Data** or enter the MOPS Price and Exchange Rate manually, then try again.",
            ].join("\n");
        }

        // Calculate for BOTH fuel types using live scraped prices
        const txOverrides = {
            customsDuty: taxOverrides.customsDuty === '' ? 0 : taxOverrides.customsDuty,
            exciseDuty: taxOverrides.exciseDuty === '' ? 0 : taxOverrides.exciseDuty,
            palLevy: taxOverrides.palLevy === '' ? 0 : taxOverrides.palLevy,
            ssclRate: taxOverrides.ssclRate === '' ? 0 : taxOverrides.ssclRate,
        };

        const calcPetrol = calculateFuelPrice({
            fuelType: 'petrol_92',
            mopsPrice: liveMogasPrice,
            premium: livePremium,
            exchangeRate: liveExchangeRate,
            taxOverrides: txOverrides,
        });

        const calcDiesel = calculateFuelPrice({
            fuelType: 'diesel',
            mopsPrice: liveGasoilPrice,
            premium: livePremium,
            exchangeRate: liveExchangeRate,
            taxOverrides: txOverrides,
        });

        // Inventory recommendation based on MOPS thresholds
        const calcForReco = inputs.fuelType === 'petrol_92' ? calcPetrol : calcDiesel;
        const mopsForReco = inputs.fuelType === 'petrol_92' ? liveMogasPrice : liveGasoilPrice;
        const threshHigh = inputs.fuelType === 'diesel' ? 85 : 90;
        const threshLow = inputs.fuelType === 'diesel' ? 70 : 75;
        const landedShare = calcForReco.v1_landedCost / calcForReco.mrp;
        const taxShare = calcForReco.v4_taxation / calcForReco.mrp;

        let stockReco: string;
        let rationale: string;
        if (mopsForReco > threshHigh) {
            stockReco = "🔴 **Stock Up** — MOPS is elevated. Consider placing a full order now before costs rise further.";
            rationale = `MOPS is at **$${mopsForReco.toFixed(2)}/bbl**, above the $${threshHigh}/bbl alert threshold. Landed cost is **${(landedShare * 100).toFixed(1)}%** of MRP.`;
        } else if (mopsForReco < threshLow) {
            stockReco = "🟢 **Run Down Stocks** — prices are in a soft range. You can afford to delay re-ordering slightly.";
            rationale = `MOPS is at **$${mopsForReco.toFixed(2)}/bbl**, below the $${threshLow}/bbl low threshold — a buyer-friendly market.`;
        } else {
            stockReco = "🟡 **Hold** — market is in a neutral range. Maintain your normal ordering schedule.";
            rationale = `MOPS is at **$${mopsForReco.toFixed(2)}/bbl**, within the normal $${threshLow}–$${threshHigh}/bbl band.`;
        }

        const dataSource = snapshot ? "live scraped prices" : pricingData ? "database averages (may be outdated)" : "user-entered inputs";

        return [
            "## ⚡ Formula Price Analysis",
            "",
            `> *AI analyst unavailable. Calculated using ${dataSource}.*`,
            "",
            "### Calculated MRP",
            `| Fuel Type   | MOPS (USD/bbl) | MRP (LKR/L) | Landed Cost | Taxes |`,
            `|-------------|---------------|-------------|-------------|-------|`,
            `| **Petrol 92** | $${liveMogasPrice.toFixed(2)} | **Rs. ${calcPetrol.mrp.toFixed(2)}** | Rs. ${calcPetrol.v1_landedCost.toFixed(2)} | Rs. ${calcPetrol.v4_taxation.toFixed(2)} |`,
            `| **Diesel**    | $${liveGasoilPrice.toFixed(2)} | **Rs. ${calcDiesel.mrp.toFixed(2)}** | Rs. ${calcDiesel.v1_landedCost.toFixed(2)} | Rs. ${calcDiesel.v4_taxation.toFixed(2)} |`,
            "",
            "### Cost Breakdown (selected fuel)",
            `- **Landed Cost (V1):** Rs. ${calcForReco.v1_landedCost.toFixed(2)}/L — ${(landedShare * 100).toFixed(1)}% of MRP`,
            `- **Processing & Admin (V2+V3):** Rs. ${(calcForReco.v2_processingCost + calcForReco.v3_adminCost).toFixed(2)}/L`,
            `- **Finance Surcharge:** Rs. ${calcForReco.financeSurcharge.toFixed(2)}/L`,
            `- **Total Taxation (V4):** Rs. ${calcForReco.v4_taxation.toFixed(2)}/L — ${(taxShare * 100).toFixed(1)}% of MRP`,
            "",
            liveCrudePrice ? `> Brent Crude: **$${liveCrudePrice.toFixed(2)}/bbl**` : "",
            "",
            "### Inventory Recommendation",
            stockReco,
            "",
            rationale,
            "",
            "### Data Sources",
            `- Exchange Rate: **Rs. ${liveExchangeRate.toFixed(2)}/USD**`,
            `- Premium: **$${livePremium.toFixed(2)}/bbl**`,
            fetchedAt ? `- Fetched at: **${new Date(fetchedAt).toLocaleString()}**` : "",
        ].filter(Boolean).join("\n");
    };

    const handleCopyAdvice = async () => {
        if (!analystAdvice) return;
        try {
            await navigator.clipboard.writeText(analystAdvice);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
            toast.success("Advice copied to clipboard");
        } catch (err) {
            toast.error("Failed to copy advice");
        }
    };

    const handleAskAnalyst = async () => {
        setAnalystLoading(true);
        setAnalystAdvice(null);
        setAnalystError(null);
        setIsLocalFallback(false);
        try {
            const { advice } = await api.pricing.askAnalyst(AI_DEFAULT_PROMPT);

            // Check if the AI returned a raw JSON error string instead of actual advice
            if (typeof advice === 'string' && advice.trim().startsWith('{') && advice.includes('"error"')) {
                let parsed: { error?: { message?: string } } | null = null;
                try {
                    parsed = JSON.parse(advice);
                } catch {
                    // Not valid JSON — treat it as normal advice text
                }
                if (parsed?.error) {
                    throw new Error(parsed.error.message || "The AI model is temporarily unavailable.");
                }
            }

            setAnalystAdvice(advice);
        } catch (err: unknown) {
            // AI unavailable — fetch fresh live data and fall back to formula-based analysis
            toast.info("AI analyst is busy. Fetching live prices for formula analysis...");
            setIsLocalFallback(true);
            try {
                const snapshot = await api.pricing.getMarketSnapshot();
                setAnalystAdvice(generateLocalFallbackAdvice(snapshot));
            } catch {
                // If even the scraper fails, use whatever data we have
                setAnalystAdvice(generateLocalFallbackAdvice());
            }
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

    // ----- Market Snapshot state (on-demand) -----
    const { data: marketSnapshot, isLoading: marketLoading, isValidating: marketValidating, mutate: refetchMarket } = useSWR(
        '/pricing/market-snapshot',
        api.pricing.getMarketSnapshot,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            refreshInterval: 0,
            revalidateOnMount: false, // Don't auto-fetch on mount
        }
    );
    const [marketFetched, setMarketFetched] = useState(false);
    const handleFetchMarket = async () => {
        setMarketFetched(true);
        await refetchMarket();
    };

    // ----- Market News state (auto-fetch, backend has 15-min cache) -----
    const { data: marketNews, isLoading: newsLoading, error: newsError, mutate: refetchNews } = useSWR(
        '/pricing/market-news',
        api.pricing.getMarketNews,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            refreshInterval: 0,
            revalidateOnMount: true,
        }
    );
    const [newsFetched, setNewsFetched] = useState(false);

    const handleFetchNews = async () => {
        setNewsFetched(true);
        try {
            await refetchNews();
            toast.success('Market news refreshed');
        } catch {
            toast.error('Failed to refresh news');
        }
    };

    // Helper to format date
    const getRelativeTimeString = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffInMs = now.getTime() - date.getTime();
            const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
            const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

            if (diffInHours < 1) return 'Just now';
            if (diffInHours < 24) {
                return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
            } else {
                return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
            }
        } catch (e) {
            return dateStr;
        }
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
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* ── Terminal Header ── */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-amber-500 to-yellow-500 p-2 rounded-lg shadow-sm shadow-amber-500/10">
                                <Calculator className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                                    Price Formula
                                    <span className="text-amber-600 ml-2 text-sm font-semibold tracking-widest uppercase">Terminal</span>
                                </h1>
                            </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="uppercase tracking-wider font-medium text-emerald-600">Live</span>
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="font-financial">{new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 ml-12">
                        Sri Lanka Fuel Pricing Engine &bull; 2025 MOPS-Based Formula &bull; Gazette Revision
                    </p>
                </div>

                {/* ── Market Wire Ticker ── */}
                {marketNews && (marketNews.news?.length > 0) && (
                    <div className="mb-6 relative overflow-hidden rounded-lg border border-amber-200 bg-white ticker-scanline">
                        <div className="flex items-stretch">
                            <div className="flex items-center px-3 bg-amber-50 border-r border-amber-200 shrink-0">
                                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest whitespace-nowrap">Market Wire</span>
                            </div>
                            <div className="overflow-hidden py-2.5 px-3 flex-1">
                                <div className="flex animate-marquee whitespace-nowrap gap-10">
                                    {(marketNews.news || []).slice(0, 6).map((item: any, i: number) => (
                                        <span key={i} className="inline-flex items-center gap-2 text-xs text-slate-600">
                                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${item.sentiment === 'likely increase' ? 'bg-emerald-500' :
                                                item.sentiment === 'likely decrease' ? 'bg-red-500' :
                                                    'bg-slate-400'
                                                }`} />
                                            <span className="font-medium text-slate-800">{item.source}</span>
                                            <span className="text-slate-300">|</span>
                                            <span>{item.title?.length > 80 ? item.title.slice(0, 80) + '…' : item.title}</span>
                                        </span>
                                    ))}
                                    {/* Duplicate for seamless loop */}
                                    {(marketNews.news || []).slice(0, 6).map((item: any, i: number) => (
                                        <span key={`dup-${i}`} className="inline-flex items-center gap-2 text-xs text-slate-600">
                                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${item.sentiment === 'likely increase' ? 'bg-emerald-500' :
                                                item.sentiment === 'likely decrease' ? 'bg-red-500' :
                                                    'bg-slate-400'
                                                }`} />
                                            <span className="font-medium text-slate-800">{item.source}</span>
                                            <span className="text-slate-300">|</span>
                                            <span>{item.title?.length > 80 ? item.title.slice(0, 80) + '…' : item.title}</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── AI Market Analyst Section ── */}
                <div className="mb-6 bg-white backdrop-blur-sm border border-emerald-200 rounded-xl overflow-hidden shadow-sm">
                    {/* Top accent bar */}
                    <div className="h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />

                    <div className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-2.5 rounded-xl shadow-sm shadow-emerald-500/20">
                                        <Sparkles className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
                                        SAMI AI Analyst
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Gemini 2.5 Flash &bull; Real-time MOPS & LKR Analysis
                                    </p>
                                </div>
                            </div>

                            <Button
                                onClick={handleAskAnalyst}
                                disabled={analystLoading}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 hover:border-emerald-300 font-medium px-5 py-2.5 rounded-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
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
                                <div className="h-4 bg-slate-200 rounded-full w-3/4" />
                                <div className="h-4 bg-slate-100 rounded-full w-1/2" />
                                <div className="h-4 bg-slate-100 rounded-full w-2/3" />
                            </div>
                        )}

                        {/* Advice display */}
                        {analystAdvice && styles && (
                            <div
                                className={`
                                    relative rounded-xl border ${styles.border} ${styles.bg}
                                    shadow-sm ${styles.glow}
                                    transition-all duration-500 ease-out
                                `}
                            >
                                {/* Thin left accent bar */}
                                <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-full ${styles.accentBar}`} />

                                <div className="pl-6 pr-5 py-5">
                                    <div className="flex items-start gap-3">
                                        {styles.icon}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border ${styles.badge}`}
                                                    >
                                                        {styles.badgeText}
                                                    </span>
                                                    {isLocalFallback && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border border-slate-300 bg-slate-100 text-slate-600">
                                                            <Calculator className="w-2.5 h-2.5" />
                                                            Formula Mode
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={handleCopyAdvice}
                                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                                                    title="Copy to clipboard"
                                                >
                                                    {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            <div className="text-sm leading-relaxed text-slate-800">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        p: ({ node, ...props }) => <p className="mb-4 last:mb-0" {...props} />,
                                                        strong: ({ node, ...props }) => <strong className="font-semibold text-slate-900" {...props} />,
                                                        ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
                                                        ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
                                                        li: ({ node, ...props }) => <li className="text-slate-700" {...props} />,
                                                        h1: ({ node, ...props }) => <h1 className="text-lg font-bold text-slate-900 mb-2 mt-4" {...props} />,
                                                        h2: ({ node, ...props }) => <h2 className="text-base font-bold text-slate-900 mb-2 mt-4" {...props} />,
                                                        h3: ({ node, ...props }) => <h3 className="text-sm font-bold text-slate-900 mb-2 mt-3" {...props} />,
                                                    }}
                                                >
                                                    {analystAdvice}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error state */}
                        {analystError && !analystLoading && (
                            <div className="relative rounded-xl border border-amber-200 bg-amber-50/50 shadow-sm">
                                <div className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-amber-500" />
                                <div className="pl-6 pr-5 py-5">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-amber-800 mb-1">Unable to get AI advice</p>
                                            <p className="text-sm text-slate-700 mb-3">{analystError}</p>
                                            <Button
                                                onClick={handleAskAnalyst}
                                                className="bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200 text-xs px-3 py-1.5 rounded-lg shadow-sm"
                                            >
                                                <RefreshCw className="w-3 h-3 mr-1.5" />
                                                Try Again
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Empty-state hint */}
                        {!analystAdvice && !analystLoading && !analystError && (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Sparkles className="w-3 h-3" />
                                Click the button above to get live AI-powered market advice
                            </div>
                        )}
                    </div>
                </div>
                {/* ── End AI Market Analyst Section ── */}

                {/* ── Live Market Data Section ── */}
                <div className="mb-6 bg-white backdrop-blur-sm border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
                    <div className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                            <div className="flex items-center gap-3">
                                <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-2.5 rounded-xl shadow-sm shadow-emerald-500/20">
                                    <Activity className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
                                        Live Market Data
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Singapore MOPS &bull; Brent Crude &bull; USD/LKR Exchange Rate
                                    </p>
                                </div>
                            </div>
                            <Button
                                onClick={handleFetchMarket}
                                disabled={marketValidating}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 hover:border-emerald-300 font-medium px-5 py-2.5 rounded-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {marketValidating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Fetching…
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        {marketFetched ? 'Refresh Data' : 'Load Live Market Data'}
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Loading skeleton */}
                        {marketLoading && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="bg-slate-50 rounded-xl p-5 space-y-3 border border-slate-200">
                                        <div className="h-3 bg-slate-200 rounded-full w-1/2" />
                                        <div className="h-8 bg-slate-100 rounded-full w-3/4" />
                                        <div className="h-3 bg-slate-100 rounded-full w-1/3" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Market data cards */}
                        {marketSnapshot && !marketLoading && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                    {/* Mogas 92 */}
                                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-5 hover:border-emerald-200 transition-all duration-300 group">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mogas 92</p>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-medium">USD/bbl</span>
                                        </div>
                                        {marketSnapshot.mogas_92_price != null ? (
                                            <p className="text-2xl font-bold text-slate-900 font-financial mb-1 group-hover:text-emerald-700 transition-colors">${marketSnapshot.mogas_92_price.toFixed(2)}</p>
                                        ) : (
                                            <p className="text-sm text-slate-500 italic">Unavailable</p>
                                        )}
                                        {marketSnapshot.mogas_92_source && (
                                            <p className="text-[10px] text-slate-400 mt-2">via {marketSnapshot.mogas_92_source}</p>
                                        )}
                                    </div>

                                    {/* Gasoil */}
                                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-5 hover:border-amber-200 transition-all duration-300 group">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gasoil</p>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-medium">USD/bbl</span>
                                        </div>
                                        {marketSnapshot.gasoil_price != null ? (
                                            <p className="text-2xl font-bold text-slate-900 font-financial mb-1 group-hover:text-amber-700 transition-colors">${marketSnapshot.gasoil_price.toFixed(2)}</p>
                                        ) : (
                                            <p className="text-sm text-slate-500 italic">Unavailable</p>
                                        )}
                                        {marketSnapshot.gasoil_source && (
                                            <p className="text-[10px] text-slate-400 mt-2">via {marketSnapshot.gasoil_source}</p>
                                        )}
                                    </div>

                                    {/* USD/LKR Exchange Rate */}
                                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-5 hover:border-sky-200 transition-all duration-300 group">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <Globe className="w-3.5 h-3.5 text-sky-600" />
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">USD/LKR</p>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-medium">per 1 USD</span>
                                        </div>
                                        {marketSnapshot.exchange_rate != null ? (
                                            <p className="text-2xl font-bold text-slate-900 font-financial mb-1 group-hover:text-sky-700 transition-colors">Rs. {marketSnapshot.exchange_rate.toFixed(2)}</p>
                                        ) : (
                                            <p className="text-sm text-slate-500 italic">Unavailable</p>
                                        )}
                                        {marketSnapshot.exchange_source && (
                                            <p className="text-[10px] text-slate-400 mt-2">via {marketSnapshot.exchange_source}</p>
                                        )}
                                    </div>

                                    {/* Brent Crude Oil */}
                                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-5 hover:border-red-200 transition-all duration-300 group">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="w-3.5 h-3.5 text-red-600" />
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Brent Crude</p>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-medium">USD/bbl</span>
                                        </div>
                                        {marketSnapshot.crude_oil_price != null ? (
                                            <p className="text-2xl font-bold text-slate-900 font-financial mb-1 group-hover:text-red-700 transition-colors">${marketSnapshot.crude_oil_price.toFixed(2)}</p>
                                        ) : (
                                            <p className="text-sm text-slate-500 italic">Unavailable</p>
                                        )}
                                        {marketSnapshot.crude_oil_source && (
                                            <p className="text-[10px] text-slate-400 mt-2">via {marketSnapshot.crude_oil_source}</p>
                                        )}
                                    </div>
                                </div>

                                {/* 7-day History Tables */}
                                {(marketSnapshot.mogas_92_history.length > 0 || marketSnapshot.gasoil_history.length > 0) && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {marketSnapshot.mogas_92_history.length > 0 && (
                                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                                <p className="text-[10px] font-bold text-slate-500 mb-3 uppercase tracking-widest">Mogas 92 — 7 Day History</p>
                                                <div className="space-y-1.5">
                                                    {marketSnapshot.mogas_92_history.map((d, idx) => (
                                                        <div key={d.date} className={`flex justify-between text-xs px-2 py-1 rounded ${idx % 2 === 0 ? 'bg-white' : ''}`}>
                                                            <span className="text-slate-500">{d.date}</span>
                                                            <span className="text-slate-700 font-financial">${d.price.toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {marketSnapshot.gasoil_history.length > 0 && (
                                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                                <p className="text-[10px] font-bold text-slate-500 mb-3 uppercase tracking-widest">Gasoil (Diesel) — 7 Day History</p>
                                                <div className="space-y-1.5">
                                                    {marketSnapshot.gasoil_history.map((d, idx) => (
                                                        <div key={d.date} className={`flex justify-between text-xs px-2 py-1 rounded ${idx % 2 === 0 ? 'bg-white' : ''}`}>
                                                            <span className="text-slate-500">{d.date}</span>
                                                            <span className="text-slate-700 font-financial">${d.price.toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Charts Section */}
                                {(marketSnapshot.crude_oil_history?.length > 0 || marketSnapshot.exchange_rate_history?.length > 0) && (
                                    <div className="mt-6 pt-6 border-t border-slate-200">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Market Trends</h3>
                                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                                {['1W', '1M', '3M', '1Y'].map(period => (
                                                    <button
                                                        key={period}
                                                        onClick={() => setActiveChartPeriod(period as any)}
                                                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${activeChartPeriod === period ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                    >
                                                        {period}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Crude Oil Chart */}
                                            {marketSnapshot.crude_oil_history?.length > 0 && (
                                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                                                    <p className="text-[10px] font-bold text-slate-500 mb-4 uppercase tracking-widest flex items-center gap-2">
                                                        <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                                                        Brent Crude Oil (USD/bbl)
                                                    </p>
                                                    <div className="h-48 w-full">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <LineChart data={filterChartData(marketSnapshot.crude_oil_history, activeChartPeriod)}>
                                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => val.substring(5)} axisLine={false} tickLine={false} minTickGap={20} />
                                                                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={30} />
                                                                <Tooltip
                                                                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}
                                                                    labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                                                                    itemStyle={{ color: '#0f172a', fontWeight: 600 }}
                                                                />
                                                                <Line type="monotone" dataKey="price" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#ef4444', stroke: '#ffffff' }} />
                                                            </LineChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </div>
                                            )}

                                            {/* USD/LKR Chart */}
                                            {marketSnapshot.exchange_rate_history?.length > 0 && (
                                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                                                    <p className="text-[10px] font-bold text-slate-500 mb-4 uppercase tracking-widest flex items-center gap-2">
                                                        <Globe className="w-3.5 h-3.5 text-sky-500" />
                                                        USD to LKR Exchange Rate
                                                    </p>
                                                    <div className="h-48 w-full">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <LineChart data={filterChartData(marketSnapshot.exchange_rate_history, activeChartPeriod)}>
                                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => val.substring(5)} axisLine={false} tickLine={false} minTickGap={20} />
                                                                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={35} />
                                                                <Tooltip
                                                                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}
                                                                    labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                                                                    itemStyle={{ color: '#0f172a', fontWeight: 600 }}
                                                                />
                                                                <Line type="monotone" dataKey="price" stroke="#0ea5e9" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#0ea5e9', stroke: '#ffffff' }} />
                                                            </LineChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Errors from scrapers */}
                                {marketSnapshot.errors.length > 0 && (
                                    <div className="mt-3 text-[11px] text-amber-500/70">
                                        {marketSnapshot.errors.map((err, i) => (
                                            <p key={i}>⚠ {err}</p>
                                        ))}
                                    </div>
                                )}

                                {/* Fetched timestamp */}
                                <p className="text-[10px] text-slate-600 mt-3 font-financial">
                                    Last fetched: {new Date(marketSnapshot.fetched_at).toLocaleTimeString()}
                                </p>
                            </>
                        )}

                        {/* Empty state */}
                        {!marketSnapshot && !marketLoading && !marketFetched && (
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                <Activity className="w-3 h-3" />
                                Click the button above to fetch live market prices
                            </div>
                        )}
                    </div>
                </div>
                {/* ── End Live Market Data Section ── */}

                {/* ── Market News Section ── */}
                <div className="mb-6 bg-white backdrop-blur-sm border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="h-px bg-gradient-to-r from-transparent via-indigo-400 to-transparent" />
                    <div className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                            <div className="flex items-center gap-3">
                                <div className="bg-gradient-to-br from-blue-500 to-indigo-500 p-2.5 rounded-xl shadow-sm shadow-blue-500/20">
                                    <Newspaper className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
                                        Energy Market News
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        AI-Powered Sentiment &bull; Global &amp; Local Updates
                                    </p>
                                </div>
                            </div>
                            <Button
                                onClick={handleFetchNews}
                                disabled={newsLoading}
                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 hover:border-indigo-300 font-medium px-5 py-2.5 rounded-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {newsLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Fetching…
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Refresh News
                                    </>
                                )}
                            </Button>
                        </div>



                        {/* Loading skeleton */}
                        {newsLoading && (
                            <div className="space-y-4 animate-pulse mt-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex gap-4">
                                        <div className="w-16 h-16 bg-slate-200 rounded-lg shrink-0" />
                                        <div className="flex-1 space-y-3">
                                            <div className="h-4 bg-slate-200 rounded-full w-3/4" />
                                            <div className="flex gap-4">
                                                <div className="h-3 bg-slate-100 rounded-full w-1/4" />
                                                <div className="h-3 bg-slate-100 rounded-full w-1/4" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* News content */}
                        {marketNews && !newsLoading && (
                            <div className="mt-4">
                                {/* News list */}
                                <div className="space-y-3">
                                    {marketNews.news?.map((item: any, i: number) => (
                                        <a
                                            key={i}
                                            href={item.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group flex gap-4 bg-slate-50/50 border border-slate-200 hover:border-blue-300 rounded-xl p-4 transition-all duration-300 hover:shadow-sm hover:shadow-blue-900/5"
                                        >
                                            {/* Thumbnail or gradient placeholder */}
                                            {item.image_url ? (
                                                <img
                                                    src={item.image_url}
                                                    alt=""
                                                    className="w-16 h-16 rounded-lg object-cover shrink-0 border border-slate-200"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            ) : (
                                                <div className="w-16 h-16 rounded-lg shrink-0 bg-gradient-to-br from-blue-100 to-indigo-100 border border-slate-200 flex items-center justify-center">
                                                    <Newspaper className="w-5 h-5 text-slate-400" />
                                                </div>
                                            )}

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug mb-2">
                                                    {item.title}
                                                </h3>
                                                <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium flex-wrap">
                                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{item.source}</span>
                                                    <span>•</span>
                                                    <span>{getRelativeTimeString(item.pubDate)}</span>

                                                    {/* Sentiment badge */}
                                                    {item.sentiment && item.sentiment !== 'neutral' && (
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${item.sentiment === 'likely increase'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : 'bg-red-50 text-red-700 border-red-200'
                                                            }`}>
                                                            {item.sentiment === 'likely increase' ? (
                                                                <><TrendingUp className="w-3 h-3" /> Likely Increase</>
                                                            ) : (
                                                                <><TrendingDown className="w-3 h-3" /> Likely Decrease</>
                                                            )}
                                                        </span>
                                                    )}
                                                    {item.sentiment === 'neutral' && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 border-slate-200">
                                                            <Minus className="w-3 h-3" /> Neutral
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 transition-colors mt-1" />
                                        </a>
                                    ))}
                                    {marketNews.news?.length === 0 && (
                                        <div className="text-center py-6 text-sm text-slate-500">
                                            No recent news found.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Error state */}
                        {newsError && !newsLoading && (
                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                <AlertTriangle className="w-8 h-8 text-red-400 mb-2" />
                                <p className="text-sm text-red-600 font-medium">Failed to load market news</p>
                                <p className="text-xs text-slate-500 mt-1">Please check the console or try again later.</p>
                            </div>
                        )}

                        {/* Empty state */}
                        {!marketNews && !newsLoading && !newsError && (
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Loading market news…
                            </div>
                        )}
                    </div>
                </div>
                {/* ── End Market News Section ── */}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Input Panel */}
                    <div className="bg-white backdrop-blur-sm border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                        <div className="p-6">
                            <h2 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-widest">
                                <DollarSign className="w-4 h-4 text-amber-500" />
                                Input Parameters
                            </h2>

                            <div className="space-y-4">
                                {/* Use Live Data */}
                                <div className="border border-amber-200 rounded-lg p-4 bg-amber-50/50">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">Live Market Data</p>
                                            {pricingData?.last_updated && (
                                                <p className="text-[10px] text-slate-500 font-financial">
                                                    Updated: {new Date(pricingData.last_updated).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            onClick={handleUseLiveData}
                                            disabled={loadingPricing || !pricingData}
                                            className="bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-200 text-xs disabled:opacity-50"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                                            {loadingPricing ? "Loading..." : "Use Live Data"}
                                        </Button>
                                    </div>
                                    {pricingError && (
                                        <p className="text-xs text-red-600">Unable to load live data</p>
                                    )}
                                </div>

                                {/* Fuel Type */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
                                        Fuel Type
                                    </label>
                                    <select
                                        value={inputs.fuelType}
                                        onChange={(e) => handleInputChange("fuelType", e.target.value as FuelType)}
                                        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 font-financial focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 transition-all"
                                    >
                                        <option value="petrol_92">Petrol 92</option>
                                        <option value="diesel">Diesel</option>
                                    </select>
                                </div>

                                {/* MOPS Price */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
                                        MOPS Price <span className="text-slate-500 normal-case tracking-normal font-normal">USD/barrel</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={inputs.mopsPrice}
                                        onChange={(e) => handleInputChange("mopsPrice", e.target.value)}
                                        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 font-financial focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 transition-all"
                                    />
                                </div>

                                {/* Premium */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
                                        Premium <span className="text-slate-500 normal-case tracking-normal font-normal">Freight + Insurance + Margin</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={inputs.premium}
                                        onChange={(e) => handleInputChange("premium", e.target.value)}
                                        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 font-financial focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 transition-all"
                                    />
                                </div>

                                {/* Exchange Rate */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
                                        Exchange Rate <span className="text-slate-500 normal-case tracking-normal font-normal">CBSL TT Selling Rate</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={inputs.exchangeRate}
                                        onChange={(e) => handleInputChange("exchangeRate", e.target.value)}
                                        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 font-financial focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 transition-all"
                                    />
                                </div>

                                {/* Taxation */}
                                <div className="border-t border-slate-200 pt-4">
                                    <h3 className="text-[10px] font-bold text-slate-500 mb-2 flex items-center gap-2 uppercase tracking-widest">
                                        <Percent className="w-3.5 h-3.5 text-amber-500" />
                                        Taxation Override <span className="text-slate-500 normal-case tracking-normal font-normal">LKR/Liter — leave 0 for defaults</span>
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3 mt-3">
                                        <div>
                                            <label className="block text-[10px] text-slate-500 mb-1">Customs Duty</label>
                                            <input type="number" step="0.01" value={taxOverrides.customsDuty}
                                                onChange={(e) => setTaxOverrides(prev => ({ ...prev, customsDuty: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 }))}
                                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm font-financial focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-slate-500 mb-1">Excise Duty</label>
                                            <input type="number" step="0.01" value={taxOverrides.exciseDuty}
                                                onChange={(e) => setTaxOverrides(prev => ({ ...prev, exciseDuty: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 }))}
                                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm font-financial focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-slate-500 mb-1">PAL Levy</label>
                                            <input type="number" step="0.01" value={taxOverrides.palLevy}
                                                onChange={(e) => setTaxOverrides(prev => ({ ...prev, palLevy: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 }))}
                                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm font-financial focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-slate-500 mb-1">SSCL Rate (%)</label>
                                            <input type="number" step="0.01" value={taxOverrides.ssclRate}
                                                onChange={(e) => setTaxOverrides(prev => ({ ...prev, ssclRate: e.target.value === '' ? '' : parseFloat(e.target.value) || 1.25 }))}
                                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm font-financial focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
                                        </div>
                                    </div>
                                </div>

                                {/* Calculate Button */}
                                <Button
                                    onClick={handleCalculate}
                                    className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white py-3 rounded-lg font-semibold transition-all shadow-sm shadow-amber-500/15"
                                >
                                    <Calculator className="w-5 h-5 mr-2" />
                                    Calculate Price
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Results Panel */}
                    <div className="bg-white backdrop-blur-sm border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
                        <div className="p-6">
                            <h2 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-widest">
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                                Calculation Results
                            </h2>

                            {breakdown ? (
                                <div className="space-y-4">
                                    {/* MRP Hero Display */}
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Maximum Retail Price (MRP)</p>
                                        <p className="text-5xl font-bold text-amber-600 font-financial">{formatCurrency(breakdown.mrp)}</p>
                                        <p className="text-xs text-slate-500 mt-2 font-financial">per Liter — {getFuelTypeName(inputs.fuelType)}</p>
                                    </div>

                                    {/* Breakdown with progress bars */}
                                    <div className="space-y-3">
                                        <h3 className="text-[10px] font-bold text-slate-500 border-b border-slate-200 pb-2 uppercase tracking-widest">
                                            Cost Breakdown
                                        </h3>

                                        {[
                                            { label: "V1 — Landed Cost", sub: `${formatCurrency(breakdown.v1_usd_per_liter, "USD")} × ${inputs.exchangeRate}`, value: breakdown.v1_landedCost, color: "bg-sky-500" },
                                            { label: "V2 — Processing Cost", sub: "Fixed operational cost", value: breakdown.v2_processingCost, color: "bg-teal-500" },
                                            { label: "V3 — Admin Cost", sub: "2% of V1", value: breakdown.v3_adminCost, color: "bg-slate-400" },
                                            { label: "V4 — Taxation", sub: "Customs + Excise + PAL + SSCL", value: breakdown.v4_taxation, color: "bg-amber-500" },
                                        ].map((item, idx) => (
                                            <div key={idx} className="p-3 bg-slate-50 rounded-lg animate-fade-in-up border border-slate-100" style={{ animationDelay: `${idx * 100}ms` }}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900">{item.label}</p>
                                                        <p className="text-[10px] text-slate-500">{item.sub}</p>
                                                    </div>
                                                    <p className="text-lg font-semibold text-slate-900 font-financial">{formatCurrency(item.value)}</p>
                                                </div>
                                                {/* Progress bar showing share of MRP */}
                                                <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${item.color} rounded-full transition-all duration-700`}
                                                        style={{ width: `${Math.min((item.value / breakdown.mrp) * 100, 100)}%` }}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-slate-500 mt-1 text-right font-financial">{((item.value / breakdown.mrp) * 100).toFixed(1)}%</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Footer metadata */}
                                    <div className="border-t border-slate-200 pt-4 space-y-1.5 text-[10px] text-slate-500 font-financial">
                                        <p>Evaporation Loss: {formatCurrency(breakdown.evaporationLoss, "USD")} (0.3%)</p>
                                        <p>Cost/barrel: ${(inputs.mopsPrice + inputs.premium).toFixed(2)}</p>
                                        <p>Formula: 2025 Gazette Revision</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-center">
                                    <Calculator className="w-12 h-12 text-slate-300 mb-4" />
                                    <p className="text-slate-500 text-sm">
                                        Enter parameters and click <span className="font-semibold text-amber-600">Calculate Price</span> to see results
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
