⨯ Internal error: Error: The default export is not a React Component in page: "/"
at rU (C:\Projects\SAMI\Company_website\node_modules\next\dist\compiled\next-server\app-page.runtime.dev.js:39:9573)
at runNextTicks (node:internal/process/task_queues:60:5)
at listOnTimeout (node:internal/timers:545:9)
at process.processTimers (node:internal/timers:519:7)
at async r0 (C:\Projects\SAMI\Company_website\node_modules\next\dist\compiled\next-server\app-page.runtime.dev.js:39:17076)  
digest: "3060387389"
⨯ Internal error: Error: The default export is not a React Component in page: "/"
at rU (C:\Projects\SAMI\Company_website\node_modules\next\dist\compiled\next-server\app-page.runtime.dev.js:39:9573)
at runNextTicks (node:internal/process/task_queues:60:5)
at listOnTimeout (node:internal/timers:545:9)
at process.processTimers (node:internal/timers:519:7)
at async r0 (C:\Projects\SAMI\Company_website\node_modules\next\dist\compiled\next-server\app-page.runtime.dev.js:39:17076)  
digest: "3060387389"
GET / 500 in 7002ms

---

### 2025-11-22 – Local dev server
- Reproduced the `"The default export is not a React Component in page: "/""` error while running `next dev`.
- Stack trace identical to above (`app-page.runtime.dev.js:39:9573` → `runNextTicks` → `processTimers`).
- Request returned `GET / 500` after ~7s. Root cause still under investigation.
