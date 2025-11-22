"use client";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Clock } from "lucide-react";

const stages = [
  {
    number: "Stage 1",
    title: "Core Operational Intelligence",
    status: "Current",
    desc: "Structured logging, baseline demand modeling, reorder & anomaly foundations.",
    icon: CheckCircle2,
  },
  {
    number: "Stage 2",
    title: "Predictive Operations",
    status: "Next",
    desc: "Hybrid demand forecasting, proactive reorder, refined anomaly detection & automation.",
    icon: Clock,
  },
  {
    number: "Stage 3",
    title: "Strategic Market Intelligence",
    status: "Upcoming",
    desc: "External signal fusion, market-aware price projections, what-if simulations & uncertainty bands.",
    icon: Circle,
  },
];

export default function Timeline() {
  return (
    <div className="mx-auto max-w-7xl px-4">
      <div className="mb-16 max-w-3xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-5xl font-bold mb-6"
        >
          Three-Stage <span className="gradient-text">Evolution</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-lg text-neutral-400"
        >
          SAMI is intentionally sequenced: deliver immediate operational value,
          then predictive accuracy, then strategic advantage.
        </motion.p>
      </div>

      <div className="relative max-w-4xl mx-auto">
        {/* Connecting Line */}
        <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-brand-600/50 via-brand-600/20 to-transparent -translate-x-1/2 hidden md:block" />

        <div className="space-y-12">
          {stages.map((s, i) => (
            <motion.div
              key={s.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className={`relative flex flex-col md:flex-row gap-8 ${i % 2 === 0 ? "md:flex-row-reverse" : ""
                }`}
            >
              {/* Timeline Node */}
              <div className="absolute left-8 md:left-1/2 top-0 w-4 h-4 rounded-full bg-brand-600 border-4 border-black shadow-[0_0_0_4px_rgba(225,29,72,0.2)] -translate-x-1/2 z-10 hidden md:block" />

              <div className="flex-1">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className={`p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm hover:border-brand-600/30 transition-all duration-300 ${s.status === "Current" ? "ring-1 ring-brand-600/50 shadow-[0_0_20px_rgba(225,29,72,0.15)]" : ""
                    }`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-mono text-brand-500 font-semibold tracking-wider">
                      {s.number}
                    </span>
                    <span
                      className={`text-xs px-3 py-1 rounded-full border font-medium ${s.status === "Current"
                          ? "border-brand-500/30 bg-brand-500/10 text-brand-400"
                          : s.status === "Next"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                            : "border-neutral-700 bg-neutral-800 text-neutral-400"
                        }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold mb-3 text-neutral-100">
                    {s.title}
                  </h3>

                  <p className="text-neutral-400 leading-relaxed">
                    {s.desc}
                  </p>
                </motion.div>
              </div>

              <div className="flex-1 hidden md:block" />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
