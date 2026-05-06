"use client";

import { useState } from "react";
import useSWR from "swr";
import { Calculator, TrendingUp, DollarSign, Percent, RefreshCw, Sparkles, AlertTriangle, TrendingDown, Loader2, Activity, Globe, BarChart3, Newspaper, ExternalLink, MapPin, Minus, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
        border: "border-amber-500/30",
        bg: "bg-slate-900/60 backdrop-blur-md",
        glow: "shadow-amber-500/10",
        icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
        badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        badgeText: "Action Required",
        accentBar: "bg-amber-500",
    },
    calm: {
        border: "border-sky-500/30",
        bg: "bg-slate-900/60 backdrop-blur-md",
        glow: "shadow-sky-500/10",
        icon: <TrendingDown className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />,
        badge: "bg-sky-500/20 text-sky-300 border-sky-500/30",
        badgeText: "Favorable conditions",
        accentBar: "bg-sky-500",
    },
    neutral: {
        border: "border-slate-600/30",
        bg: "bg-slate-900/60 backdrop-blur-md",
        glow: "shadow-none",
        icon: <Minus className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />,
        badge: "bg-slate-800 text-slate-300 border-slate-700",
        badgeText: "Market Stable",
        accentBar: "bg-slate-500",
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
        const liveMogasPrice   = snapshot?.mogas_92_price ?? pricingData?.mogas_92_average ?? inputs.mopsPrice;
        const liveGasoilPrice  = snapshot?.gasoil_price ?? pricingData?.gasoil_average ?? inputs.mopsPrice;
        const liveCrudePrice   = snapshot?.crude_oil_price ?? null;
        const livePremium      = inputs.premium > 0 ? inputs.premium : 3.5;
        const fetchedAt        = snapshot?.fetched_at ?? null;

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
            exciseDuty:  taxOverrides.exciseDuty  === '' ? 0 : taxOverrides.exciseDuty,
            palLevy:     taxOverrides.palLevy     === '' ? 0 : taxOverrides.palLevy,
            ssclRate:    taxOverrides.ssclRate    === '' ? 0 : taxOverrides.ssclRate,
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
        const calcForReco  = inputs.fuelType === 'petrol_92' ? calcPetrol : calcDiesel;
        const mopsForReco  = inputs.fuelType === 'petrol_92' ? liveMogasPrice : liveGasoilPrice;
        const threshHigh   = inputs.fuelType === 'diesel' ? 85 : 90;
        const threshLow    = inputs.fuelType === 'diesel' ? 70 : 75;
        const landedShare  = calcForReco.v1_landedCost / calcForReco.mrp;
        const taxShare     = calcForReco.v4_taxation   / calcForReco.mrp;

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
    const { data: marketSnapshot, isLoading: marketLoading, mutate: refetchMarket } = useSWR(
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
    const { data: marketNews, isLoading: newsLoading, mutate: refetchNews } = useSWR(
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
    const [activeNewsTab, setActiveNewsTab] = useState<'local' | 'global'>('local');

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
        } catch(e) {
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

                {/* ── Scrolling News Ticker ── */}
                {marketNews && (marketNews.global_news?.length > 0 || marketNews.local_news?.length > 0) && (
                    <div className="mb-6 overflow-hidden rounded-lg bg-slate-900/60 border border-slate-800 py-2.5 px-4">
                        <div className="flex animate-marquee whitespace-nowrap gap-12">
                            {[...( marketNews.global_news || []), ...(marketNews.local_news || [])].slice(0, 6).map((item: any, i: number) => (
                                <span key={i} className="inline-flex items-center gap-2 text-xs text-slate-300">
                                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                                        item.sentiment === 'bullish' ? 'bg-emerald-400' :
                                        item.sentiment === 'bearish' ? 'bg-red-400' :
                                        'bg-slate-500'
                                    }`} />
                                    <span className="font-medium">{item.source}</span>
                                    <span className="text-slate-500">|</span>
                                    <span>{item.title?.length > 80 ? item.title.slice(0, 80) + '…' : item.title}</span>
                                </span>
                            ))}
                            {/* Duplicate for seamless loop */}
                            {[...(marketNews.global_news || []), ...(marketNews.local_news || [])].slice(0, 6).map((item: any, i: number) => (
                                <span key={`dup-${i}`} className="inline-flex items-center gap-2 text-xs text-slate-300">
                                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                                        item.sentiment === 'bullish' ? 'bg-emerald-400' :
                                        item.sentiment === 'bearish' ? 'bg-red-400' :
                                        'bg-slate-500'
                                    }`} />
                                    <span className="font-medium">{item.source}</span>
                                    <span className="text-slate-500">|</span>
                                    <span>{item.title?.length > 80 ? item.title.slice(0, 80) + '…' : item.title}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

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
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border ${styles.badge}`}
                                                    >
                                                        {styles.badgeText}
                                                    </span>
                                                    {isLocalFallback && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border border-slate-600 bg-slate-800 text-slate-400">
                                                            <Calculator className="w-2.5 h-2.5" />
                                                            Formula Mode
                                                        </span>
                                                    )}
                                                </div>
                                                <button 
                                                    onClick={handleCopyAdvice}
                                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-md transition-colors"
                                                    title="Copy to clipboard"
                                                >
                                                    {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            <div className="text-sm leading-relaxed text-slate-200">
                                                <ReactMarkdown 
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        p: ({node, ...props}) => <p className="mb-4 last:mb-0" {...props} />,
                                                        strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
                                                        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
                                                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
                                                        li: ({node, ...props}) => <li className="text-slate-300" {...props} />,
                                                        h1: ({node, ...props}) => <h1 className="text-lg font-bold text-white mb-2 mt-4" {...props} />,
                                                        h2: ({node, ...props}) => <h2 className="text-base font-bold text-white mb-2 mt-4" {...props} />,
                                                        h3: ({node, ...props}) => <h3 className="text-sm font-bold text-white mb-2 mt-3" {...props} />,
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
                            <div className="relative rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-900/60 to-slate-900/80 shadow-lg">
                                <div className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-amber-500" />
                                <div className="pl-6 pr-5 py-5">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-amber-300 mb-1">Unable to get AI advice</p>
                                            <p className="text-sm text-slate-300 mb-3">{analystError}</p>
                                            <Button
                                                onClick={handleAskAnalyst}
                                                className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs px-3 py-1.5 rounded-lg"
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
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                <Sparkles className="w-3 h-3" />
                                Click the button above to get live AI-powered market advice
                            </div>
                        )}
                    </div>
                </div>
                {/* ── End AI Market Analyst Section ── */}

                {/* ── Live Market Data Section ── */}
                <div className="mb-8 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500" />
                    <div className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                            <div className="flex items-center gap-3">
                                <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-2.5 rounded-xl shadow-lg shadow-emerald-500/20">
                                    <Activity className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white tracking-tight">
                                        Live Market Data
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Singapore MOPS &bull; Brent Crude &bull; USD/LKR Exchange Rate
                                    </p>
                                </div>
                            </div>
                            <Button
                                onClick={handleFetchMarket}
                                disabled={marketLoading}
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium px-5 py-2.5 rounded-lg shadow-lg shadow-emerald-500/20 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {marketLoading ? (
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
                                    <div key={i} className="bg-slate-800/60 rounded-xl p-5 space-y-3">
                                        <div className="h-3 bg-slate-700/60 rounded-full w-1/2" />
                                        <div className="h-8 bg-slate-700/40 rounded-full w-3/4" />
                                        <div className="h-3 bg-slate-700/30 rounded-full w-1/3" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Market data cards */}
                        {marketSnapshot && !marketLoading && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                    {/* Mogas 92 */}
                                    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 border border-slate-700/50 rounded-xl p-5 hover:border-emerald-500/30 transition-colors">
                                        <div className="flex items-center gap-2 mb-2">
                                            <BarChart3 className="w-4 h-4 text-emerald-400" />
                                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Mogas 92</p>
                                        </div>
                                        {marketSnapshot.mogas_92_price != null ? (
                                            <>
                                                <p className="text-2xl font-bold text-white mb-1">${marketSnapshot.mogas_92_price.toFixed(2)}</p>
                                                <p className="text-xs text-slate-500">USD/barrel</p>
                                            </>
                                        ) : (
                                            <p className="text-sm text-slate-500 italic">Unavailable</p>
                                        )}
                                        {marketSnapshot.mogas_92_source && (
                                            <p className="text-[10px] text-slate-600 mt-2">via {marketSnapshot.mogas_92_source}</p>
                                        )}
                                    </div>

                                    {/* Gasoil */}
                                    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 border border-slate-700/50 rounded-xl p-5 hover:border-amber-500/30 transition-colors">
                                        <div className="flex items-center gap-2 mb-2">
                                            <BarChart3 className="w-4 h-4 text-amber-400" />
                                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Gasoil (Diesel)</p>
                                        </div>
                                        {marketSnapshot.gasoil_price != null ? (
                                            <>
                                                <p className="text-2xl font-bold text-white mb-1">${marketSnapshot.gasoil_price.toFixed(2)}</p>
                                                <p className="text-xs text-slate-500">USD/barrel</p>
                                            </>
                                        ) : (
                                            <p className="text-sm text-slate-500 italic">Unavailable</p>
                                        )}
                                        {marketSnapshot.gasoil_source && (
                                            <p className="text-[10px] text-slate-600 mt-2">via {marketSnapshot.gasoil_source}</p>
                                        )}
                                    </div>

                                    {/* USD/LKR Exchange Rate */}
                                    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 border border-slate-700/50 rounded-xl p-5 hover:border-sky-500/30 transition-colors">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Globe className="w-4 h-4 text-sky-400" />
                                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">USD/LKR</p>
                                        </div>
                                        {marketSnapshot.exchange_rate != null ? (
                                            <>
                                                <p className="text-2xl font-bold text-white mb-1">Rs. {marketSnapshot.exchange_rate.toFixed(2)}</p>
                                                <p className="text-xs text-slate-500">per 1 USD</p>
                                            </>
                                        ) : (
                                            <p className="text-sm text-slate-500 italic">Unavailable</p>
                                        )}
                                        {marketSnapshot.exchange_source && (
                                            <p className="text-[10px] text-slate-600 mt-2">via {marketSnapshot.exchange_source}</p>
                                        )}
                                    </div>

                                    {/* Brent Crude Oil */}
                                    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 border border-slate-700/50 rounded-xl p-5 hover:border-red-500/30 transition-colors">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="w-4 h-4 text-red-400" />
                                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Brent Crude</p>
                                        </div>
                                        {marketSnapshot.crude_oil_price != null ? (
                                            <>
                                                <p className="text-2xl font-bold text-white mb-1">${marketSnapshot.crude_oil_price.toFixed(2)}</p>
                                                <p className="text-xs text-slate-500">USD/barrel</p>
                                            </>
                                        ) : (
                                            <p className="text-sm text-slate-500 italic">Unavailable</p>
                                        )}
                                        {marketSnapshot.crude_oil_source && (
                                            <p className="text-[10px] text-slate-600 mt-2">via {marketSnapshot.crude_oil_source}</p>
                                        )}
                                    </div>
                                </div>

                                {/* 7-day History Tables */}
                                {(marketSnapshot.mogas_92_history.length > 0 || marketSnapshot.gasoil_history.length > 0) && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {marketSnapshot.mogas_92_history.length > 0 && (
                                            <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-4">
                                                <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Mogas 92 — 7 Day History</p>
                                                <div className="space-y-1">
                                                    {marketSnapshot.mogas_92_history.map((d) => (
                                                        <div key={d.date} className="flex justify-between text-xs">
                                                            <span className="text-slate-500">{d.date}</span>
                                                            <span className="text-slate-300 font-mono">${d.price.toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {marketSnapshot.gasoil_history.length > 0 && (
                                            <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-4">
                                                <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Gasoil (Diesel) — 7 Day History</p>
                                                <div className="space-y-1">
                                                    {marketSnapshot.gasoil_history.map((d) => (
                                                        <div key={d.date} className="flex justify-between text-xs">
                                                            <span className="text-slate-500">{d.date}</span>
                                                            <span className="text-slate-300 font-mono">${d.price.toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
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
                                <p className="text-[10px] text-slate-600 mt-3">
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
                <div className="mb-8 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500" />
                    <div className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                            <div className="flex items-center gap-3">
                                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
                                    <Newspaper className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white tracking-tight">
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
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium px-5 py-2.5 rounded-lg shadow-lg shadow-blue-500/20 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
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

                        {/* Tabs — always visible */}
                        <div className="mb-4 border-b border-slate-800">
                            <div className="flex space-x-4">
                                <button
                                    onClick={() => setActiveNewsTab('local')}
                                    className={`pb-3 text-sm font-medium transition-colors relative ${activeNewsTab === 'local' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-300'}`}
                                >
                                    <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Sri Lanka</span>
                                    {activeNewsTab === 'local' && (
                                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full" />
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveNewsTab('global')}
                                    className={`pb-3 text-sm font-medium transition-colors relative ${activeNewsTab === 'global' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-300'}`}
                                >
                                    <span className="flex items-center gap-2"><Globe className="w-4 h-4" /> Global</span>
                                    {activeNewsTab === 'global' && (
                                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Loading skeleton */}
                        {newsLoading && (
                            <div className="space-y-4 animate-pulse mt-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30 flex gap-4">
                                        <div className="w-16 h-16 bg-slate-700/50 rounded-lg shrink-0" />
                                        <div className="flex-1 space-y-3">
                                            <div className="h-4 bg-slate-700/60 rounded-full w-3/4" />
                                            <div className="flex gap-4">
                                                <div className="h-3 bg-slate-700/40 rounded-full w-1/4" />
                                                <div className="h-3 bg-slate-700/30 rounded-full w-1/4" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* News content */}
                        {marketNews && !newsLoading && (
                            <div className="mt-4">
                                {/* Globe — shown above news on Global tab */}
                                {activeNewsTab === 'global' && (
                                    <div className="flex justify-center mb-6">
                                        <WorldGlobe size={280} />
                                    </div>
                                )}

                                {/* News list */}
                                <div className="space-y-3">
                                    {(activeNewsTab === 'local' ? marketNews.local_news : marketNews.global_news)?.map((item: any, i: number) => (
                                        <a
                                            key={i}
                                            href={item.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group flex gap-4 bg-slate-800/40 border border-slate-700/50 hover:border-blue-500/50 rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:shadow-blue-900/20"
                                        >
                                            {/* Thumbnail or gradient placeholder */}
                                            {item.image_url ? (
                                                <img
                                                    src={item.image_url}
                                                    alt=""
                                                    className="w-16 h-16 rounded-lg object-cover shrink-0 border border-slate-700/50"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            ) : (
                                                <div className="w-16 h-16 rounded-lg shrink-0 bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border border-slate-700/50 flex items-center justify-center">
                                                    <Newspaper className="w-5 h-5 text-slate-600" />
                                                </div>
                                            )}

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-medium text-slate-200 group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug mb-2">
                                                    {item.title}
                                                </h3>
                                                <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium flex-wrap">
                                                    <span className="bg-slate-900/50 px-2 py-0.5 rounded text-slate-400">{item.source}</span>
                                                    <span>•</span>
                                                    <span>{getRelativeTimeString(item.pubDate)}</span>

                                                    {/* Sentiment badge */}
                                                    {item.sentiment && item.sentiment !== 'neutral' && (
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${
                                                            item.sentiment === 'bullish'
                                                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                                                : 'bg-red-500/15 text-red-300 border-red-500/30'
                                                        }`}>
                                                            {item.sentiment === 'bullish' ? (
                                                                <><TrendingUp className="w-3 h-3" /> Bullish</>
                                                            ) : (
                                                                <><TrendingDown className="w-3 h-3" /> Bearish</>
                                                            )}
                                                        </span>
                                                    )}
                                                    {item.sentiment === 'neutral' && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider bg-slate-500/15 text-slate-400 border-slate-500/30">
                                                            <Minus className="w-3 h-3" /> Neutral
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-blue-400 shrink-0 transition-colors mt-1" />
                                        </a>
                                    ))}
                                    {(activeNewsTab === 'local' ? marketNews.local_news : marketNews.global_news)?.length === 0 && (
                                        <div className="text-center py-6 text-sm text-slate-500">
                                            No recent news found for this category.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Empty state */}
                        {!marketNews && !newsLoading && (
                            <div className="flex items-center gap-2 text-xs text-slate-600 mt-2">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Loading market news…
                            </div>
                        )}
                    </div>
                </div>
                {/* ── End Market News Section ── */}

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
