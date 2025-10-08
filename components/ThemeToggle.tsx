"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<string>("light");

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme");
    if (stored) setTheme(stored);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
  }

  if (!mounted) return null;

  return (
    <button
      aria-label="Toggle dark mode"
      onClick={toggle}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 text-amber-300" />
      ) : (
        <Moon className="h-5 w-5 text-neutral-700" />
      )}
    </button>
  );
}
