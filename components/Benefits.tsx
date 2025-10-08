const benefits = [
  {
    metric: "Fewer Stockouts",
    text: "Reorder recommendations informed by forecast intervals reduce emergency procurement.",
  },
  {
    metric: "Faster Shift Close",
    text: "Automated summaries & anomaly checks shrink reconciliation friction.",
  },
  {
    metric: "Pricing Confidence",
    text: "Market-aware price pressure insight gives early visibility to trend shifts.",
  },
  {
    metric: "Data Trust",
    text: "Transparent metrics & audit trails improve confidence in every recommendation.",
  },
];

export default function Benefits() {
  return (
    <div className="mx-auto max-w-7xl px-4">
      <header className="mb-12 max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-semibold mb-4">
          Outcome-Oriented Benefits
        </h2>
        <p className="text-neutral-600 dark:text-neutral-300">
          SAMI is judged not by charts delivered, but by operational friction
          removed and margin protected.
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {benefits.map((b) => (
          <div
            key={b.metric}
            className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/40 p-6 flex flex-col"
          >
            <h3 className="text-lg font-semibold mb-2">{b.metric}</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {b.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
