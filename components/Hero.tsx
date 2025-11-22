"use client";
import { SITE_CONFIG } from "@/lib/site.config";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useRef } from "react";

export default function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-24 pb-16 md:pt-32 md:pb-20 group"
      aria-label="SAMI introduction hero"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-black -z-20" />
      <div className="absolute inset-0 bg-hero-grid bg-[size:60px_60px] opacity-[0.1] -z-10" />

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-brand-800/20 rounded-full blur-[100px] animate-float" />
      </div>

      <motion.div
        style={{ y, opacity }}
        className="container mx-auto px-4 relative z-10"
      >
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <span className="inline-block py-1 px-3 rounded-full bg-brand-900/30 border border-brand-500/30 text-brand-400 text-sm font-medium mb-6 backdrop-blur-sm shadow-[0_0_15px_rgba(225,29,72,0.3)]">
              Next-Gen Station Intelligence
            </span>
            <h1 className="text-4xl md:text-7xl font-bold leading-tight tracking-tight px-2">
              <span className="block text-white mb-2">Operational Clarity.</span>
              <span className="gradient-text">Predictive Confidence.</span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed"
          >
            {SITE_CONFIG.name} transforms daily station activity into demand
            forecasts, reorder guidance, and market-aware price intelligence.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="flex flex-wrap justify-center gap-4 text-sm font-medium text-neutral-300"
          >
            {[
              "Reduce Stockouts",
              "Optimize Reorders",
              "Anticipate Price Shifts",
            ].map((item, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm cursor-default transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 text-brand-500" />
                {item}
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 pt-4 px-4 sm:px-0"
          >
            <button
              data-demo-trigger
              className="group relative inline-flex items-center justify-center rounded-full bg-brand-600 px-8 py-4 text-white font-semibold text-lg shadow-[0_0_20px_rgba(225,29,72,0.4)] hover:bg-brand-500 hover:shadow-[0_0_30px_rgba(225,29,72,0.6)] transition-all duration-300 hover:-translate-y-1"
            >
              Request a Demo
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="#stages"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-8 py-4 text-white font-medium text-lg hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-sm"
            >
              Explore Platform
            </a>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
