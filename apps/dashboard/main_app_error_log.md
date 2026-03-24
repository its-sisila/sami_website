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

---

## 2026-01-31 - Admin Panel Data Isolation Issues

### 1. Stale Configuration Data After Station Onboarding

**Issue:**  
When creating a new station via "Onboard New Station" in the Admin Panel, the Station Configuration section continued to display the previously selected station's products, tanks, and nozzles instead of being cleared or switching to the new station.

**Root Cause:**  
The `handleOnboardStation` function cleared the onboarding form and refreshed the stations list, but did not reset the `selectedStationId` or clear the configuration data state variables (`products`, `tanks`, `nozzles`, `stationUsers`, `ownerUser`).

**Fix:**  
Modified `handleOnboardStation` in [`apps/dashboard/app/(admin)/admin/page.tsx`](file:///c:/Projects/SAMI/SAMI_v1_5/apps/dashboard/app/(admin)/admin/page.tsx) to clear all station-related state after successful onboarding:

```typescript
// Clear selected station and config data to prevent stale data from showing
setSelectedStationId('');
setProducts([]);
setTanks([]);
setNozzles([]);
setStationUsers([]);
setOwnerUser(null);
```

### 2. Data Isolation Bug - Inventory Operations on Wrong Station

**Issue:**  
When viewing a different station in the Admin Panel dropdown, all inventory data (products, tanks, nozzles) and mutation operations (create/update/delete) were being performed on the System Admin's **assigned station** (from "Access Dashboard") instead of the **selected station** in the dropdown. This caused the admin to see and modify the wrong station's data.

**Root Cause:**  
All inventory API endpoints (`/inventory/products`, `/inventory/tanks`, `/inventory/nozzles`) used `current_user.station_id` from the JWT token, which reflected the admin's dashboard assignment, not the admin panel's selected station. The endpoints had no mechanism for System Admins to override this context.

**Fix:**  
Implemented station context override for System Admins across the entire inventory API layer:

**Backend Changes:**

- Modified all inventory endpoints in [`services/api/app/modules/inventory/routes.py`](file:///c:/Projects/SAMI/SAMI_v1_5/services/api/app/modules/inventory/routes.py)
- Added optional `station_id` query parameter to:
  - GET: `list_products`, `list_tanks`, `list_nozzles`
  - POST: `create_product`, `create_tank`, `create_nozzle`
  - PUT: `update_product`, `update_tank`, `update_nozzle`
  - DELETE: `delete_product`, `delete_tank`, `delete_nozzle`
- Added authorization logic: if `station_id` is provided AND `current_user.role == "system_admin"`, use the provided station_id instead of `current_user.station_id`

**Frontend Changes:**

- Updated API client methods in [`apps/dashboard/lib/api/client.ts`](file:///c:/Projects/SAMI/SAMI_v1_5/apps/dashboard/lib/api/client.ts) to accept optional `stationId` parameter
- Modified Admin Panel handlers in [`apps/dashboard/app/(admin)/admin/page.tsx`](file:///c:/Projects/SAMI/SAMI_v1_5/apps/dashboard/app/(admin)/admin/page.tsx) to pass `selectedStationId` to all inventory API calls

### 3. Refresh Bug - Stale Data After Mutations

**Issue:**  
After creating, updating, or deleting inventory items (products, tanks, nozzles) in the Admin Panel, the UI would display data from the admin's assigned station instead of the selected station until a full page refresh.

**Root Cause:**  
The `refreshConfigData` function called after mutations was not passing `selectedStationId` to the inventory API calls, causing it to fetch data using the admin's assigned station context.

**Fix:**  
Updated `refreshConfigData` in [`apps/dashboard/app/(admin)/admin/page.tsx`](file:///c:/Projects/SAMI/SAMI_v1_5/apps/dashboard/app/(admin)/admin/page.tsx) to pass `selectedStationId`:

```typescript
const [productsData, tanksData, nozzlesData] = await Promise.all([
    api.inventory.getProducts(selectedStationId),
    api.inventory.getTanks(undefined, selectedStationId),
    api.inventory.getNozzles(selectedStationId),
]);
```

Also updated `executeDelete` function to pass `selectedStationId` to all delete operations.

**Impact:**  
System Admins can now properly manage multiple stations from the Admin Panel without data leakage or cross-station contamination. All inventory operations correctly target the selected station.
