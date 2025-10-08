export const metadata = {
  title: "Login – SAMI",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6">
        <h1 className="text-3xl font-semibold">Client Login</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Your IP is not authorized to access this route. This route will
          redirect to the main application’s authenticated portal.
        </p>
        <div className="rounded-lg border border-dashed p-6 text-sm bg-neutral-50 dark:bg-neutral-900/40">
          <p>
            Please contact System Admin at sisila@ieee.org to request access.
          </p>
        </div>
      </div>
    </div>
  );
}
