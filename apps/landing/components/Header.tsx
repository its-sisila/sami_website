"use client";
import Link from "next/link";
import Logo from "./Logo";
import { SITE_CONFIG } from "@/lib/site.config";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { href: "#features", label: "Features" },
  { href: "#stages", label: "Stages" },
  // { href: "#how-it-works", label: "How It Works" },
  { href: "#benefits", label: "Benefits" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${scrolled
        ? "bg-black/80 backdrop-blur-md border-b border-neutral-800/50 shadow-sm"
        : "bg-transparent"
        }`}
    >
      <div className="mx-auto max-w-7xl px-4 flex h-20 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 relative z-50"
          aria-label="SAMI Home"
        >
          <Logo />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-neutral-300 hover:text-brand-500 transition-colors relative group"
            >
              {item.label}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-600 transition-all group-hover:w-full" />
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-4">
          <a
            href={SITE_CONFIG.loginPath}
            className="text-sm font-medium rounded-full bg-brand-700 text-white px-6 py-2.5 hover:bg-brand-500 shadow-lg shadow-brand-600/20 hover:shadow-brand-600/40 transition-all hover:-translate-y-0.5"
          >
            Login
          </a>
          <button
            data-demo-trigger
            className="text-sm font-medium text-neutral-300 hover:text-brand-500 transition-colors"
          >
            Request Demo
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="lg:hidden relative z-50 p-2 text-neutral-300"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Toggle navigation"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-neutral-950/95 backdrop-blur-xl pt-24 px-6 pb-6 lg:hidden border-b border-neutral-800"
          >
            <nav className="flex flex-col gap-6 h-full">
              {navItems.map((n, i) => (
                <motion.a
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="text-3xl font-bold text-neutral-200 hover:text-brand-500 tracking-tight"
                >
                  {n.label}
                </motion.a>
              ))}
              <div className="mt-auto space-y-4">
                <a
                  href={SITE_CONFIG.loginPath}
                  className="flex items-center justify-center w-full py-3 rounded-xl border border-neutral-800 text-neutral-300 font-medium hover:border-brand-600 hover:text-brand-500 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  Login
                </a>
                <button
                  data-demo-trigger
                  className="w-full py-3 rounded-xl bg-brand-600 text-white font-medium shadow-lg shadow-brand-600/25"
                  onClick={() => setOpen(false)}
                >
                  Request Demo
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
