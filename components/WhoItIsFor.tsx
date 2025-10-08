const roles = [
  {
    title: "Owners",
    pain: "Need transparent performance & pricing insight.",
    value:
      "Unified visibility across sales, pricing & upcoming demand signals.",
  },
  {
    title: "Multi-Site Operators",
    pain: "Hard to standardize intelligence across stations.",
    value:
      "Cross-location consistency with centralized forecasting & anomalies.",
  },
  {
    title: "Managers",
    pain: "Shift closing friction & manual anomaly checks.",
    value: "Automated shift summaries & irregularity detection.",
  },
  {
    title: "Accountants",
    pain: "Reconciling costs, advances & salaries is time-consuming.",
    value: "Structured, auditable financial alignment from day one.",
  },
];

export default function WhoItIsFor() {
  return (
    <div className="mx-auto max-w-7xl px-4">
      <header className="mb-12 max-w-2xl">
        <h2 className="text-3xl md:text-4xl font-semibold mb-4">
          Built For Real Operators
        </h2>
        <p className="text-neutral-600 dark:text-neutral-300">
          SAMI focuses on operator workflows first, so intelligence is embedded
          in daily routines, not an afterthought.
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {roles.map((r) => (
          <div
            key={r.title}
            className="group relative rounded-xl border bg-white/70 dark:bg-neutral-900/50 backdrop-blur border-neutral-200 dark:border-neutral-800 p-5 flex flex-col transition-colors hover:border-danger-300 dark:hover:border-danger-500"
          >
            <span className="pointer-events-none absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-danger-400 via-danger-500 to-danger-600 opacity-70 group-hover:opacity-100 transition-opacity" />
            <h3 className="font-semibold text-lg mb-2 pr-2">{r.title}</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3 leading-relaxed">
              <span className="font-semibold text-danger-600 dark:text-danger-400 mr-1">
                Pain:
              </span>
              <span className="text-neutral-600 dark:text-neutral-400">
                {r.pain}
              </span>
            </p>
            <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
              <span className="font-semibold text-brand-600 dark:text-brand-400 mr-1">
                Value:
              </span>
              {r.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
