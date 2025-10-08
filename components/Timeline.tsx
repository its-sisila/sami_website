const stages = [
  {
    number: "Stage 1",
    title: "Core Operational Intelligence",
    status: "Current",
    desc: "Structured logging, baseline demand modeling, reorder & anomaly foundations.",
  },
  {
    number: "Stage 2",
    title: "Predictive Operations",
    status: "Next",
    desc: "Hybrid demand forecasting, proactive reorder, refined anomaly detection & automation.",
  },
  {
    number: "Stage 3",
    title: "Strategic Market Intelligence",
    status: "Upcoming",
    desc: "External signal fusion, market-aware price projections, what-if simulations & uncertainty bands.",
  },
];

export default function Timeline() {
  return (
    <div className="mx-auto max-w-7xl px-4">
      <header className="mb-12 max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-semibold mb-4">
          Three-Stage Evolution
        </h2>
        <p className="text-neutral-600 dark:text-neutral-300">
          SAMI is intentionally sequenced: deliver immediate operational value,
          then predictive accuracy, then strategic advantage.
        </p>
      </header>
      <ol className="relative border-l border-neutral-300 dark:border-neutral-700 ml-4 space-y-10">
        {stages.map((s) => (
          <li key={s.number} className="ml-6">
            <div className="absolute -left-3 top-1 h-6 w-6 rounded-full border-2 border-brand-500 bg-white dark:bg-neutral-950 flex items-center justify-center text-[10px] font-semibold text-brand-600 dark:text-brand-400">
              {s.number.split(" ")[1]}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold">{s.title}</h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    s.status === "Current"
                      ? "border-brand-500 text-brand-600"
                      : s.status === "Next"
                      ? "border-amber-500 text-amber-600"
                      : "border-neutral-400 text-neutral-500 dark:border-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  {s.status}
                </span>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-2xl">
                {s.desc}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
