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

---

## 2025-12-21 - TypeScript Build Errors

### 1. Parameter 'val' Implicitly Has an 'any' Type

**Issue:**  
Build failed with multiple TypeScript errors: `Parameter 'val' implicitly has an 'any' type` in `onValueChange` handlers across several Select components.

**Affected Files:**

- `app/(accounts)/accounts/page.tsx` - Lines 379, 1296, 1314, 1547, 1561, 1584

**Fix:**  
Added explicit `string` type annotation to all `val` parameters in `onValueChange` handlers:

```tsx
// Before
onValueChange={(val) => setTimeRange(val as TimeRange)}

// After  
onValueChange={(val: string) => setTimeRange(val as TimeRange)}
```

### 2. Type Literal Mismatch in Staff Page

**Issue:**  
TypeScript error in `getMockShiftHistory` function where the ternary operator `i % 2 === 0 ? "Day" : "Night"` was inferred as `string` instead of `"Day" | "Night"`.

**Affected File:**

- `app/(staff)/staff/page.tsx` - Line 208

**Fix:**  
Added type assertion to the shift property:

```tsx
// Before
shift: i % 2 === 0 ? "Day" : "Night",

// After
shift: (i % 2 === 0 ? "Day" : "Night") as "Day" | "Night",
```

### 3. Comparison Between Incompatible Literal Types

**Issue:**  
TypeScript error: `This comparison appears to be unintentional because the types '"Night"' and '"Day"' have no overlap`. The `LAST_SHIFT.type` was typed as literal `"Night"` using `as const`, but then compared to `"Day"`.

**Affected File:**

- `app/(dashboard)/dashboard/page.tsx` - Line 244

**Fix:**  
Changed the type assertion from narrow literal to union type:

```tsx
// Before
type: "Night" as const,

// After
type: "Night" as "Day" | "Night",
```
