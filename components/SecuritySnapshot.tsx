const items = [
  "Role-based access control & least privilege",
  "Immutable audit logs of critical actions",
  "Encrypted data in transit & at rest",
  "Data minimization & classification practices",
  "Backups with restore runbook tested",
  "Anomaly & integrity monitoring pipeline",
];

export default function SecuritySnapshot() {
  return (
    <div className="mx-auto max-w-6xl px-4">
      <header className="mb-10 max-w-2xl">
        <h2 className="text-3xl md:text-4xl font-semibold mb-4">
          Security & Governance Snapshot
        </h2>
        <p className="text-neutral-600 dark:text-neutral-300">
          Designed with operational resilience & data stewardship from day
          one—not retrofitted later.
        </p>
      </header>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <div
            key={i}
            className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/40 p-5 text-sm text-neutral-700 dark:text-neutral-300"
          >
            <span className="text-brand-500 font-semibold mr-2">•</span>
            {i}
          </div>
        ))}
      </div>
    </div>
  );
}
