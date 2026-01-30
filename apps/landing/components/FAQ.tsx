"use client";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useState } from "react";

const faqs = [
  {
    q: "Who it is for?",
    a: "SAMI is for owners and managers of fuel stations who want to improve their operational efficiency, reduce costs, and increase profits.",
  },
  {
    q: "Is there self-service signup?",
    a: "No. Onboarding is curated to ensure data structure and operational readiness align before forecasts are activated.",
  },
  {
    q: "Do I need historical data?",
    a: "SAMI begins producing value quickly; accuracy improves as shift logs accumulate. Synthetic bootstrapping covers initial cold start.",
  },
  {
    q: "How are forecasts generated?",
    a: "Progressive modeling: baseline statistical → hybrid models incorporating external signals with continuous monitoring.",
  },
  {
    q: "What external signals are used?",
    a: "Initially Brent crude and FX. Additional regulatory, freight and macro signals are planned.",
  },
  {
    q: "Can multiple stations be managed?",
    a: "Yes. Multi-tenant architecture with role-scoped data visibility supports multi-site operators.",
  },
  {
    q: "Is my staff financial data private?",
    a: "Yes. Sensitive compensation data is access-controlled and logged. Minimal retention beyond operational necessity.",
  },
];

export default function FAQ() {
  return (
    <div className="mx-auto max-w-4xl px-4">
      <div className="mb-16 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-5xl font-bold mb-6"
        >
          Frequently Asked <span className="gradient-text">Questions</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-lg text-neutral-600 dark:text-neutral-400"
        >
          Still have questions? Reach out and we can walk through your
          operational context together.
        </motion.p>
      </div>

      <div className="space-y-4">
        {faqs.map((f, i) => (
          <FAQItem key={i} faq={f} index={i} />
        ))}
      </div>
    </div>
  );
}

function FAQItem({ faq, index }: { faq: { q: string; a: string }; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm overflow-hidden hover:border-brand-600/30 transition-colors"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-colors"
      >
        <span className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">
          {faq.q}
        </span>
        <Plus
          className={`w-5 h-5 text-brand-600 dark:text-brand-500 transition-transform duration-300 ${isOpen ? "rotate-45" : ""
            }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
      >
        <div className="overflow-hidden">
          <div className="p-6 pt-0 text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {faq.a}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
