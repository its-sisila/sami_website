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
      <header className="mb-12 max-w-2xl">
        <h2 className="text-3xl md:text-4xl font-semibold mb-4">
          How SAMI Works
        </h2>
        <p className="text-neutral-600 dark:text-neutral-300">
          A disciplined pipeline that turns raw shifts into structured strategic
          foresight.
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-6">
        {steps.map((s) => (
          <div
            key={s.n}
            className="relative rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/50 backdrop-blur p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium uppercase tracking-wide text-brand-600 dark:text-brand-400">
                Step {s.n}
              </div>
            </div>
            <h3 className="font-semibold mb-1 text-sm">{s.title}</h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {s.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
