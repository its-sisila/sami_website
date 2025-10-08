const faqs = [
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
    <div className="mx-auto max-w-5xl px-4">
      <header className="mb-10 max-w-2xl">
        <h2 className="text-3xl md:text-4xl font-semibold mb-4">
          Frequently Asked Questions
        </h2>
        <p className="text-neutral-600 dark:text-neutral-300">
          Still have questions? Reach out and we can walk through your
          operational context together.
        </p>
      </header>
      <dl className="divide-y divide-neutral-200 dark:divide-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/40">
        {faqs.map((f, idx) => (
          <div key={f.q} className="p-6">
            <dt className="font-medium mb-2">{f.q}</dt>
            <dd className="text-sm text-neutral-600 dark:text-neutral-400">
              {f.a}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
