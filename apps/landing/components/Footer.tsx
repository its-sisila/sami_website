import { SITE_CONFIG } from "@/lib/site.config";
import Logo from "./Logo";

const links = [
  { label: "Features", href: "#features" },
  { label: "Stages", href: "#stages" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export default function Footer() {
  return (
    <footer className="relative mt-24 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/20 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-16 grid gap-12 md:grid-cols-4">
        <div className="space-y-4">
          <Logo />
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Turning fuel station data into strategic advantage with predictive intelligence.
          </p>
          <p className="text-xs text-neutral-500">
            © {new Date().getFullYear()} {SITE_CONFIG.name}. All rights reserved.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-4 text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Explore</h3>
          <ul className="space-y-3">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-brand-500 transition-colors"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-4 text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Contact</h3>
          <ul className="space-y-3 text-sm">
            <li>
              <a
                href={`mailto:${SITE_CONFIG.contactEmail}`}
                className="text-neutral-600 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-brand-500 transition-colors"
              >
                {SITE_CONFIG.contactEmail}
              </a>
            </li>
            <li>
              <a
                href={SITE_CONFIG.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-600 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-brand-500 transition-colors"
              >
                LinkedIn
              </a>
            </li>
            <li>
              <a
                href={SITE_CONFIG.loginPath}
                className="inline-flex items-center text-brand-600 dark:text-brand-500 hover:underline"
              >
                Client Login
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-4 text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Legal</h3>
          <ul className="space-y-3 text-sm">
            {["Privacy Notice", "Terms", "Cookies"].map((item) => (
              <li key={item}>
                <a
                  href="#"
                  className="text-neutral-600 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-brand-500 transition-colors"
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
