"use client";
import { motion } from "framer-motion";
import { Shield, Lock, FileKey, Eye, Database, Server } from "lucide-react";

const items = [
  { text: "Role-based access control", icon: Lock },
  { text: "Immutable audit logs", icon: FileKey },
  { text: "Encrypted data in transit & at rest", icon: Shield },
  { text: "Data minimization practices", icon: Database },
  { text: "Disaster recovery ready", icon: Server },
  { text: "Anomaly & integrity monitoring", icon: Eye },
];

export default function SecuritySnapshot() {
  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="mb-16 max-w-3xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-5xl font-bold mb-6"
        >
          Security & <span className="gradient-text">Governance</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-lg text-neutral-400"
        >
          Designed with operational resilience & data stewardship from day
          one.
        </motion.p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <motion.div
            key={item.text}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-4 p-6 rounded-xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm hover:border-brand-600/30 transition-colors group"
          >
            <div className="p-2 rounded-lg bg-brand-900/20 text-brand-500 group-hover:scale-110 transition-transform border border-brand-500/10">
              <item.icon className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-neutral-300 group-hover:text-white transition-colors">
              {item.text}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
