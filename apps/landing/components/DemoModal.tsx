"use client";
import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { X } from "lucide-react";
import { SITE_CONFIG } from "@/lib/site.config";
import { submitDemoRequest } from "@/actions/submit-demo";

const schema = z.object({
  name: z.string().min(2),
  company: z.string().min(2),
  email: z.string().email(),
  message: z.string().min(5),
});
type FormValues = z.infer<typeof schema>;

export default function DemoModal() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (t?.closest("[data-demo-trigger]")) {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function onSubmit(values: FormValues) {
    const result = await submitDemoRequest(values);
    if (result.error) {
      alert(result.error);
      return;
    }
    setSubmitted(true);
    setTimeout(() => {
      reset();
    }, 300);
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Request a demo"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm" />
      <div
        ref={ref}
        className="relative w-full max-w-lg rounded-xl border border-neutral-800 bg-black p-6 shadow-xl"
      >
        <button
          aria-label="Close modal"
          className="absolute top-3 right-3 rounded-md p-2 hover:bg-neutral-800"
          onClick={() => setOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-2xl font-semibold mb-2">Request a Demo</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          We’ll review your context and reply from {SITE_CONFIG.contactEmail}.
        </p>
        {submitted ? (
          <div className="rounded-md bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-600 px-4 py-4 text-sm text-brand-700 dark:text-brand-300">
            Request received. We will contact you shortly.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium uppercase tracking-wide mb-1">
                  Name
                </label>
                <input
                  {...register("name", { required: true })}
                  className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  placeholder="First Name and Last Name"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">
                    Required (min 2 chars)
                  </p>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium uppercase tracking-wide mb-1">
                  Company
                </label>
                <input
                  {...register("company", { required: true })}
                  className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  placeholder="Station Group Ltd"
                />
                {errors.company && (
                  <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">
                    Required (min 2 chars)
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide mb-1">
                Email
              </label>
              <input
                type="email"
                {...register("email", { required: true })}
                className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                placeholder="you@company.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-danger-400">
                  Valid email required
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide mb-1">
                Message / Context
              </label>
              <textarea
                {...register("message", { required: true })}
                rows={4}
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                placeholder="Number of stations, current tools, desired outcomes..."
              />
              {errors.message && (
                <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">
                  Provide a short context
                </p>
              )}
            </div>
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                }}
                className="text-sm px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <div className="flex gap-2">
                <a
                  href={`mailto:${SITE_CONFIG.contactEmail
                    }?subject=Request%20Demo%20(${encodeURIComponent(
                      new Date().toISOString()
                    )})`}
                  className="text-sm px-4 py-2 rounded-md border border-brand-500 text-brand-600 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-500/10"
                >
                  Email Instead
                </a>
                <button
                  disabled={isSubmitting}
                  className="text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white px-5 py-2 rounded-md focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-60"
                >
                  {isSubmitting ? "Sending..." : "Submit Request"}
                </button>
              </div>
            </div>
          </form>
        )}
        <p className="mt-6 text-[11px] text-neutral-500 dark:text-neutral-500">
          By requesting a demo you acknowledge data is processed for evaluation.
        </p>
      </div>
    </div>
  );
}
