"use client";
import { SITE_CONFIG } from "@/lib/site.config";
import { useEffect } from "react";

export default function Hero() {
  useEffect(() => {
    // Just an example hook for potential analytics
  }, []);
  return (
    <section
      className="relative overflow-hidden pt-24 md:pt-32 pb-24"
      aria-label="SAMI introduction hero"
    >
      <div className="pointer-events-none absolute inset-0 bg-hero-grid bg-[size:60px_60px] opacity-[0.08] dark:opacity-[0.15]" />
      <div className="mx-auto max-w-7xl px-4 relative">
        <div className="max-w-3xl space-y-8">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight">
            <span className="gradient-text">
              Operational Clarity. Predictive Confidence. Market Foresight.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-300">
            {SITE_CONFIG.name} transforms daily station activity into demand
            forecasts, reorder guidance, anomaly alerts, and market-aware price
            intelligence, so you stay ahead of volatility.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            <li className="before:content-['•'] before:mr-2 before:text-brand-500">
              Reduce Stockouts
            </li>
            <li className="before:content-['•'] before:mr-2 before:text-brand-500">
              Optimize Reorders
            </li>
            <li className="before:content-['•'] before:mr-2 before:text-brand-500">
              Anticipate Price Shifts
            </li>
          </ul>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              data-demo-trigger
              className="inline-flex items-center justify-center rounded-md bg-brand-600 hover:bg-brand-500 px-6 py-3 text-white font-medium text-base shadow-sm focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              Request a Demo
            </button>
            <a
              href="#stages"
              className="inline-flex items-center justify-center rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 px-6 py-3 text-neutral-700 dark:text-neutral-200 font-medium text-base"
            >
              Platform Stages
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
