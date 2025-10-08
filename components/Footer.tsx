import { SITE_CONFIG } from "@/lib/site.config";
import Logo from "./Logo";

const links = [
  { label: "Features", href: "#features" },
  { label: "Stages", href: "#stages" },
  { label: "Security", href: "#security" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto max-w-7xl px-4 py-12 grid gap-10 md:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Turning fuel station data into strategic advantage.
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-500">
            © {new Date().getFullYear()} {SITE_CONFIG.name}. All rights
            reserved.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-3">Explore</h3>
          <ul className="space-y-2">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-3">Contact</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href={`mailto:${SITE_CONFIG.contactEmail}`}
                className="text-neutral-600 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400"
              >
                {SITE_CONFIG.contactEmail}
              </a>
            </li>
            <li className="text-neutral-600 dark:text-neutral-400">
              No self-service signup
            </li>
            <li className="text-neutral-600 dark:text-neutral-400">
              <a
                href={SITE_CONFIG.loginPath}
                className="hover:text-brand-600 dark:hover:text-brand-400"
              >
                Client Login
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-3">Legal</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href="#"
                className="text-neutral-600 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400"
              >
                Privacy Notice
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-neutral-600 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400"
              >
                Terms
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-neutral-600 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400"
              >
                Accessibility
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
