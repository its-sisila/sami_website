"use client";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function PricingTeaser() {
  return (
    <div className="mx-auto max-w-4xl px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="relative p-8 md:p-12 rounded-3xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm overflow-hidden"
      >
        <div className="absolute inset-0 bg-hero-grid opacity-[0.05]" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-800/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Pricing & <span className="gradient-text">Access</span>
          </h2>

          <p className="text-lg text-neutral-400 mb-8 max-w-2xl mx-auto leading-relaxed">
            SAMI is currently in curated pilot with early operators. Flexible
            multi-site licensing tiers will launch publicly soon. We prioritize
            operational fit over volume.
          </p>

          <button
            data-demo-trigger
            className="group inline-flex items-center justify-center rounded-full bg-brand-600 px-8 py-4 text-white font-semibold text-lg shadow-lg shadow-brand-600/25 hover:bg-brand-500 hover:shadow-brand-600/40 transition-all duration-300 hover:-translate-y-1"
          >
            Join Pilot / Request Access
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
