import { SITE_CONFIG } from "@/lib/site.config";

export default function CallToAction() {
  return (
    <div className="mx-auto max-w-5xl px-4 text-center">
      <h2 className="text-3xl md:text-4xl font-semibold mb-6">
        Ready to unlock market-aware station intelligence?
      </h2>
      <p className="text-neutral-600 dark:text-neutral-300 mb-8">
        Request a curated walkthrough and see how SAMI adapts to your
        operational realities.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          data-demo-trigger
          className="inline-flex items-center justify-center rounded-md bg-brand-600 hover:bg-brand-500 px-8 py-3 text-white font-medium focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          Request a Demo
        </button>
        <a
          href={SITE_CONFIG.loginPath}
          className="inline-flex items-center justify-center rounded-md border border-neutral-300 dark:border-neutral-700 px-8 py-3 font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Already a Client? Login
        </a>
      </div>
    </div>
  );
}
