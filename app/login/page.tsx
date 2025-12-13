import { Analytics } from "@vercel/analytics/next";
import { SITE_CONFIG } from "@/lib/site.config";
export const metadata = {
  title: "Login to SAMI",
};

export default function LoginPage() {
  return (
    <>
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-6">
          <h1 className="text-3xl font-semibold">Client Login</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Your IP is not authorized to access this route. This route will
            redirect to the main application’s authenticated portal.
          </p>
          <div className="rounded-2xl border border-dashed border-white/25 bg-white/5 p-6 text-sm text-neutral-100 shadow-[0_0_20px_rgba(0,0,0,0.2)] backdrop-blur-sm">
            <p>
              Please contact System Admin at <span className="font-semibold text-brand-400">{SITE_CONFIG.contactEmail}</span> to
              request access.
            </p>
          </div>
        </div>
      </div>
      <Analytics />
    </>
  );
}
