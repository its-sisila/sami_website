"use client";
import {
  BarChart3,
  Radar,
  BrainCircuit,
  LineChart,
  ShieldCheck,
  Boxes,
} from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Boxes,
    title: "Unified Operational Logging",
    text: "Structured shift data forms a clean foundation for intelligence layers.",
  },
  {
    icon: LineChart,
    title: "Demand Forecasting",
    text: "Forward-looking inventory guidance reduces emergency procurement.",
  },
  {
    icon: Radar,
    title: "Anomaly Detection",
    text: "Surface outliers early with natural language insights.",
  },
  {
    icon: BarChart3,
    title: "Market Integration",
    text: "Brent, FX, and more to contextualize station performance.",
  },
  {
    icon: BrainCircuit,
    title: "Price Projection",
    text: "Anticipate pricing dynamics and test what-if futures.",
  },
  {
    icon: ShieldCheck,
    title: "Governance & Security",
    text: "Transparent, role-based access and immutable activity history.",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function FeaturePillars() {
  return (
    <div className="mx-auto max-w-7xl px-4">
      <div className="mb-16 max-w-3xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-5xl font-bold mb-6"
        >
          Core <span className="gradient-text">Capabilities</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-lg text-neutral-400"
        >
          Each feature pillar compounds value. First operational clarity, then
          predictive intelligence, and finally strategic foresight.
        </motion.p>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="grid gap-8 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
      >
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            variants={item}
            whileHover={{ y: -5 }}
            className="group relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm p-8 hover:border-brand-600/50 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-brand-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10">
              <div className="w-12 h-12 rounded-lg bg-brand-900/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-brand-500/20">
                <f.icon className="h-6 w-6 text-brand-500" />
              </div>

              <h3 className="font-bold text-xl mb-3 text-neutral-100 group-hover:text-brand-400 transition-colors">
                {f.title}
              </h3>

              <p className="text-neutral-400 leading-relaxed">
                {f.text}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
