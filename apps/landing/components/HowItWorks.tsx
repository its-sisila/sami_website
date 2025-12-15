"use client";
import { motion } from "framer-motion";

const steps = [
  {
    n: 1,
    title: "Capture",
    text: "Shift, sales, pricing & cost data structured at point of entry.",
  },
  {
    n: 2,
    title: "Validate",
    text: "Automated integrity checks & anomaly flagging prepare clean datasets.",
  },
  {
    n: 3,
    title: "Forecast & Detect",
    text: "Demand predictions & early anomalies surface emerging issues.",
  },
  {
    n: 4,
    title: "Enrich",
    text: "External market signals contextualize operational patterns.",
  },
  {
    n: 5,
    title: "Generate Guidance",
    text: "Reorder timing, price pressure & shift summaries delivered.",
  },
  {
    n: 6,
    title: "Simulate & Plan",
    text: "What-if scenarios inform pricing & procurement strategy.",
  },
];

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-7xl px-4">
      <div className="mb-16 max-w-3xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-5xl font-bold mb-6"
        >
          How SAMI <span className="gradient-text">Works</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-lg text-neutral-400"
        >
          A disciplined pipeline that turns raw shifts into structured strategic
          foresight.
        </motion.p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {steps.map((s, i) => (
          <motion.div
            key={s.n}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -5, scale: 1.02 }}
            className="relative rounded-xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm p-5 flex flex-col h-full hover:border-brand-600/50 transition-all duration-300 group"
          >
            <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-sm font-bold text-brand-500 shadow-lg group-hover:border-brand-600 group-hover:scale-110 transition-all">
              {s.n}
            </div>

            <div className="mt-2">
              <h3 className="font-bold text-neutral-100 mb-2 group-hover:text-brand-400 transition-colors">
                {s.title}
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                {s.text}
              </p>
            </div>

            {/* Connector Line (except last item) */}
            {i !== steps.length - 1 && (
              <div className="hidden xl:block absolute top-1/2 -right-4 w-8 h-px bg-neutral-800 z-[-1]" />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
