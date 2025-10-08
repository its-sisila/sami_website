"use client";
import Link from "next/link";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import { SITE_CONFIG } from "@/lib/site.config";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navItems = [
  { href: "#features", label: "Features" },
  { href: "#stages", label: "Stages" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#benefits", label: "Benefits" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur bg-white/70 dark:bg-neutral-950/70 border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto max-w-7xl px-4 flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="SAMI Home"
        >
          <Logo />
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <a
            href={SITE_CONFIG.loginPath}
            className="text-sm font-medium rounded-md border px-4 py-2 border-brand-500 text-brand-600 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition"
          >
            Login
          </a>
          <button
            data-demo-trigger
            className="text-sm font-medium rounded-md bg-brand-600 text-white px-4 py-2 hover:bg-brand-500 focus:ring-2 focus:ring-brand-400 transition"
          >
            Request Demo
          </button>
          <ThemeToggle />
        </div>
        <button
          className="md:hidden inline-flex items-center justify-center rounded-md border border-neutral-300 dark:border-neutral-700 p-2"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Toggle navigation"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-4 pb-6 pt-4 space-y-4">
          <nav className="flex flex-col gap-4">
            {navItems.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-brand-600"
              >
                {n.label}
              </a>
            ))}
            <a
              href={SITE_CONFIG.loginPath}
              className="text-sm font-medium rounded-md border px-4 py-2 w-full text-center border-brand-500 text-brand-600 dark:text-brand-300"
              onClick={() => setOpen(false)}
            >
              Login
            </a>
            <button
              data-demo-trigger
              className="text-sm font-medium rounded-md bg-brand-600 text-white px-4 py-2 w-full hover:bg-brand-500"
              onClick={() => setOpen(false)}
            >
              Request Demo
            </button>
            <ThemeToggle />
          </nav>
        </div>
      )}
    </header>
  );
}
