"use client";
import { SITE_CONFIG } from "@/lib/site.config";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function CallToAction() {
  return (
    <div className="relative overflow-hidden">

      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-6xl font-bold mb-8 leading-tight"
        >
          Ready to unlock <br />
          <span className="gradient-text">market-aware intelligence?</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-xl text-neutral-300 mb-12 max-w-2xl mx-auto"
        >
          Request a curated walkthrough and see how SAMI adapts to your
          operational realities.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-6 justify-center items-center"
        >
          <button
            data-demo-trigger
            className="group relative inline-flex items-center justify-center rounded-full bg-brand-600 px-8 py-4 text-white font-semibold text-lg shadow-lg shadow-brand-600/25 hover:bg-brand-500 hover:shadow-brand-600/40 transition-all duration-300 hover:-translate-y-1"
          >
            Request a Demo
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <a
            href={SITE_CONFIG.loginPath}
            className="text-neutral-400 font-medium hover:text-brand-500 transition-colors"
          >
            Already a Client? Login
          </a>
        </motion.div>
      </div>
    </div>
  );
}
