"use client";
import React from "react";
import { Timeline as TimelineUI } from "@/components/ui/timeline";
import { CheckCircle2, Circle, Clock } from "lucide-react";

const stages = [
  {
    number: "Stage 1",
    title: "Core Operational Intelligence",
    status: "Completed",
    desc: "Structured logging, baseline demand modeling, reorder & anomaly foundations.",
    icon: CheckCircle2,
  },
  {
    number: "Stage 2",
    title: "Predictive Operations",
    status: "Current",
    desc: "Hybrid demand forecasting, proactive reorder, refined anomaly detection & automation.",
    icon: Clock,
  },
  {
    number: "Stage 3",
    title: "Strategic Market Intelligence",
    status: "Next",
    desc: "External signal fusion, market-aware price projections, what-if simulations & uncertainty bands.",
    icon: Circle,
  },
];

export default function Timeline() {
  const data = stages.map((stage) => ({
    title: stage.number,
    content: (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <stage.icon className={`w-8 h-8 ${stage.status === "Current" ? "text-brand-500" :
            stage.status === "Next" ? "text-amber-500" : "text-neutral-500"
            }`} />
          <h3 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            {stage.title}
          </h3>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <span
            className={`text-xs px-3 py-1 rounded-full border font-medium ${stage.status === "Current"
              ? "border-brand-500/30 bg-brand-500/10 text-brand-400"
              : stage.status === "Next"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                : "border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
              }`}
          >
            {stage.status}
          </span>
        </div>

        <p className="text-neutral-600 dark:text-neutral-400 text-base md:text-lg leading-relaxed mb-8">
          {stage.desc}
        </p>
      </div>
    ),
  }));

  return (
    <div className="font-bold w-full">
      <TimelineUI
        data={data}
        title={
          <span>
            Three-Stage <span className="text-brand-600">Evolution</span>
          </span>
        }
        description={
          <span>
            SAMI is intentionally sequenced: deliver immediate operational value, then predictive accuracy, then strategic advantage.
          </span>
        }
      />
    </div>
  );
}
