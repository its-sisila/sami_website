# Main App Error Log

## 2025-12-14 - Theme Unification & Dark Mode Fixes

### 1. Inconsistent Dark Mode Styling

**Issue:**  
The `Sales`, `Inventory`, `Orders`, `Deposits`, `Accounts`, and `Staff` pages retained their white backgrounds even when Dark Mode was toggled. This was caused by hardcoded `bg-slate-50` and `bg-white` classes taking precedence over the global theme.

**Fix:**  

- Refactored all affected pages to use semantic CSS variables:
  - Replaced `bg-slate-50` / `bg-white` with `bg-background` (resolves to Black in dark mode).
  - Replaced `bg-white` card containers with `bg-card`.
  - Replaced hardcoded text colors (`text-slate-900`, `text-gray-500`) with `text-foreground` and `text-muted-foreground`.
- Standardized border radius to `rounded-xl` to match the main Dashboard.

### 2. Tool Execution Mismatch (replace_file_content)

**Issue:**  
During the mass refactor, the `replace_file_content` tool failed on `sales/page.tsx` with a "target content not found" error. This happened because the file content in the agent's context was slightly stale compared to the actual file on disk (likely due to auto-formatting or previous partial edits).

**Fix:**  

- Used `view_file` to re-read the absolute latest state of the file.
- Re-generated the `replace_file_content` call with the exact matching strings from the fresh read.

### 3. Hydration Mismatch Warning

**Issue:**  
Warning in console: `Extra attributes from the server: class, style`. This occurred because `next-themes` injects attributes into the `<html>` tag at runtime, causing a mismatch with the server-rendered HTML.

**Fix:**  

- Added `suppressHydrationWarning` to the `<html>` tag in `app/layout.tsx`.

### 4. Global Theme Fallback

**Issue:**  
Even after fixing individual pages, some components and the global background could potentially revert to defaults if not explicitly set.

**Fix:**  

- Updated `app/layout.tsx` to enforce `bg-background` and `text-foreground` on the `body` tag, ensuring a fail-safe theme application across the entire app.
