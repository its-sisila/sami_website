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

### 2025-11-22 – Hero Section Fix & Agent Tooling
- **Visual Issue**: Hero section had a visible border at the bottom due to `bg-hero-grid` pattern ending abruptly. Fixed by adding a gradient overlay.
- **Agent Tool Error**: Encountered `invalid tool call` when creating `task.md`. Error message: `artifact metadata is required when IsArtifact is true`. Fixed by including `ArtifactMetadata`.

### 2025-12-13 – Resend Integration & DNS Conflicts
- **Resend API Error (403)**:
  - **Error Code**: `validation_error`
  - **Message**: "You can only send testing emails to your own email address. To send emails to other recipients, please verify a domain."
  - **Resolution**: Temporarily changed recipient to the registered testing email. Permanent fix requires domain verification.

- **Cloudflare DNS Conflict**:
  - **Error**: "This zone is managed by Email Routing. Disable Email Routing to add/modify MX records."
  - **Context**: Attempting to add Resend MX records to the root domain (`getsami.app`) conflicted with existing Cloudflare Email Routing records.
  - **Resolution**: Advised user to use a subdomain (`mail.getsami.app`) for Resend to isolate the sender identity and avoid MX conflicts. Updated code to send from `contact@mail.getsami.app` with `Reply-To: contact@getsami.app`.

- **TypeScript Lint Error**:
  - **Error**: `Object literal may only specify known properties, but 'reply_to' does not exist... Did you mean to write 'replyTo'?`
  - **Resolution**: Corrected the property name from `reply_to` to `replyTo` in the `resend.emails.send` call.

### 2025-12-13 – Mobile View Optimization & Tool Errors
- **Visual Issue (Mobile)**: Hero section content overlay was obstructing the particle text effect ("Protect", "Predict", etc.) in the center of the screen. 
  - **Fix**: Drastically reduced bottom padding (`pb-4`) on mobile to lower the content container. Adjusted `pointer-events` to allow interaction with particles through the transparent parts of the UI.
- **Visual Issue (Mobile)**: `InfiniteSlider` gap was too large (112px), causing logos to be spaced too far apart or off-screen.
  - **Fix**: Switched from `InfiniteSlider` to a static 4-in-a-row flex layout (`flex-row justify-center gap-6`) for mobile devices to ensure all logos are visible at once.
- **Agent Tool Error**: Repeatedly encountered `invalid tool call: artifact metadata is required when IsArtifact is true` when attempting to create/update `implementation_plan.md` and `walkthrough.md`.
  - **Cause**: Failed to include the required `ArtifactMetadata` object in the `write_to_file` tool arguments despite `IsArtifact` being set to `true`.
  - **Resolution**: Corrected the tool call by including the necessary metadata.

### 2025-12-13 – Hero Button TypeScript Error
- **TypeScript Error**: `Type '{ ... href: string; ... }' is not assignable to type ... Property 'href' does not exist on type ...`.
  - **Location**: `components/Hero.tsx`
  - **Cause**: The `Button` component does not accept an `href` prop directly. It requires the `asChild` pattern to function as a link.
  - **Resolution**: Updated `Hero.tsx` to use `<Button asChild>` and wrapped a `<Link href={...}>` component inside it.
