"use client";
import { motion } from "framer-motion";
import { Users, Building2, Briefcase, Calculator } from "lucide-react";

const roles = [
  {
    title: "Shed Owners",
    pain: "Need transparent performance & pricing insight.",
    value: "Unified visibility across sales, pricing & upcoming demand signals.",
    icon: Users,
  },
  {
    title: "Multi-Shed Owners",
    pain: "Hard to standardize intelligence across stations.",
    value: "Cross-location consistency with centralized forecasting & anomalies.",
    icon: Building2,
  },
  {
    title: "Shed Managers",
    pain: "Shift closing friction & manual anomaly checks.",
    value: "Automated shift summaries & irregularity detection.",
    icon: Briefcase,
  },
  {
    title: "Shed Accountants",
    pain: "Reconciling costs, advances & salaries is time-consuming.",
    value: "Structured, auditable financial alignment from day one.",
    icon: Calculator,
  },
];

export default function WhoItIsFor() {
  return (
    <div className="mx-auto max-w-7xl px-4">
      <div className="mb-16 max-w-3xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-5xl font-bold mb-6"
        >
          Built For <span className="gradient-text">Real Operators</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-lg text-neutral-400"
        >
          SAMI focuses on operator workflows first, so intelligence is embedded
          in daily routines, not an afterthought.
        </motion.p>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {roles.map((r, i) => (
          <motion.div
            key={r.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -5 }}
            className="group relative rounded-2xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm p-6 flex flex-col transition-all duration-300 hover:border-brand-600/50"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-brand-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />

            <div className="relative z-10">
              <div className="w-10 h-10 rounded-lg bg-brand-900/20 flex items-center justify-center mb-4 text-brand-500 group-hover:scale-110 transition-transform">
                <r.icon className="w-5 h-5" />
              </div>

              <h3 className="font-bold text-lg mb-4 text-neutral-100 group-hover:text-brand-400 transition-colors">
                {r.title}
              </h3>

              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-red-950/30 border border-red-900/30">
                  <p className="text-xs text-red-200/80 uppercase tracking-wider font-semibold mb-1">Pain</p>
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    {r.pain}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-brand-950/30 border border-brand-900/30">
                  <p className="text-xs text-brand-200/80 uppercase tracking-wider font-semibold mb-1">Value</p>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    {r.value}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
