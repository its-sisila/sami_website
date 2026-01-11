"use client";
import { motion } from "framer-motion";
import { TrendingDown, Zap, BarChart2, ShieldCheck } from "lucide-react";

const benefits = [
  {
    metric: "Fewer Stockouts",
    text: "Reorder recommendations informed by forecast intervals reduce emergency procurement.",
    icon: TrendingDown,
  },
  {
    metric: "Faster Shift Close",
    text: "Automated summaries & anomaly checks shrink reconciliation friction.",
    icon: Zap,
  },
  {
    metric: "Pricing Confidence",
    text: "Market-aware price pressure insight gives early visibility to trend shifts.",
    icon: BarChart2,
  },
  {
    metric: "Data Trust",
    text: "Transparent metrics & audit trails improve confidence in every recommendation.",
    icon: ShieldCheck,
  },
];

export default function Benefits() {
  return (
    <div className="mx-auto max-w-7xl px-4">
      <div className="mb-16 max-w-3xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-5xl font-bold mb-6"
        >
          Outcome-Oriented <span className="gradient-text">Benefits</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-lg text-neutral-400"
        >
          SAMI is judged not by charts delivered, but by operational friction
          removed and margin protected.
        </motion.p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {benefits.map((b, i) => (
          <motion.div
            key={b.metric}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -5 }}
            className="group relative p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm hover:border-brand-600/30 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-brand-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />

            <div className="relative z-10">
              <div className="w-12 h-12 rounded-lg bg-brand-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-brand-500/20">
                <b.icon className="h-6 w-6 text-brand-500" />
              </div>

              <h3 className="text-lg font-bold mb-3 text-neutral-100 group-hover:text-brand-400 transition-colors">
                {b.metric}
              </h3>

              <p className="text-sm text-neutral-400 leading-relaxed">
                {b.text}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
