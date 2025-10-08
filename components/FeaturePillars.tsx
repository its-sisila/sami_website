import {
  BarChart3,
  Radar,
  BrainCircuit,
  LineChart,
  ShieldCheck,
  Boxes,
} from "lucide-react";

const features = [
  {
    icon: Boxes,
    title: "Unified Operational Logging",
    text: "Structured shift data forms a clean foundation for intelligence layers.",
  },
  {
    icon: LineChart,
    title: "Demand Forecasting & Reorder Intelligence",
    text: "Forward-looking inventory guidance reduces emergency procurement.",
  },
  {
    icon: Radar,
    title: "Anomaly Detection & Shift Summaries",
    text: "Surface outliers early with natural language insights.",
  },
  {
    icon: BarChart3,
    title: "External Market Signal Integration",
    text: "Brent, FX, and more to contextualize station performance.",
  },
  {
    icon: BrainCircuit,
    title: "Price Projection & Scenario Simulation",
    text: "Anticipate pricing dynamics and test what-if futures.",
  },
  {
    icon: ShieldCheck,
    title: "Governance, Security & Audit Trails",
    text: "Transparent, role-based access and immutable activity history.",
  },
];

export default function FeaturePillars() {
  return (
    <div className="mx-auto max-w-7xl px-4">
      <header className="mb-12 max-w-2xl">
        <h2 className="text-3xl md:text-4xl font-semibold mb-4">
          Core Capabilities
        </h2>
        <p className="text-neutral-600 dark:text-neutral-300">
          Each feature pillar compounds value—first operational clarity, then
          predictive intelligence, and finally strategic foresight.
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="group relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/40 backdrop-blur p-6"
          >
            <f.icon className="h-8 w-8 text-brand-600 dark:text-brand-400 mb-4" />
            <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {f.text}
            </p>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition pointer-events-none bg-gradient-to-br from-brand-500/5 to-transparent" />
          </div>
        ))}
      </div>
    </div>
  );
}
