export default function PricingTeaser() {
  return (
    <div className="mx-auto max-w-4xl px-4 text-center">
      <h2 className="text-3xl md:text-4xl font-semibold mb-6">
        Pricing & Access
      </h2>
      <p className="text-neutral-600 dark:text-neutral-300 mb-6">
        SAMI is currently in curated pilot with early operators. Flexible
        multi-site licensing tiers will launch publicly soon. We prioritize
        operational fit over volume—reach out to explore alignment.
      </p>
      <button
        data-demo-trigger
        className="inline-flex items-center justify-center rounded-md bg-brand-600 hover:bg-brand-500 px-8 py-3 text-white font-medium focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        Join Pilot / Request Access
      </button>
    </div>
  );
}
