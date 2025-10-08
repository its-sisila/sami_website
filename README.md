# SAMI Landing Page

Production-ready single-page marketing site for **SAMI (Shed AI Manager Interface)** built with Next.js (App Router) + TypeScript + Tailwind.

## Key Features

- Modern responsive layout (desktop-first but fully responsive)
- Dark / light mode with persistence
- Accessible, semantic structure (WCAG AA contrast oriented)
- Sections: Hero, Who It’s For, Features, Stages, How It Works, Benefits, Pricing Teaser, Security, FAQ, CTA, Footer
- Demo Request modal (placeholder submission)
- JSON-LD structured data (`SoftwareApplication`)
- Performance mindful (no unnecessary heavy libs)
- No self-service signup (curated onboarding only)

## Getting Started (Windows Friendly)

Prerequisites:

- Install Node.js LTS (recommend using https://github.com/coreybutler/nvm-windows)
- Ensure `git --version` works in PowerShell or CMD.

Commands (PowerShell):

```powershell
git clone <repo-url> sami-landing
cd sami-landing
npm install
npm run dev
```

Open: http://localhost:3000

Build for production:

```powershell
npm run build
npm start
```

## Project Structure (Selected)

```
app/
  layout.tsx
  page.tsx
  login/page.tsx
components/
  Header.tsx, Hero.tsx, FeaturePillars.tsx, ...
lib/
  site.config.ts
  utils.ts
tailwind.config.js
```

## Theming

- Toggle persists via `localStorage`.
- Respectful of user preference at first load.

## Accessibility

- Landmarks & headings structured.
- Focus states retained.
- Escape key closes modal; click backdrop closes.
- Aria labels for nav toggle and modal.

## Demo Modal

Currently logs to console and shows success state.
Replace with API call or email service integration later.

## Customization

Edit marketing copy in component files. Global constants live in `lib/site.config.ts`.

## Deploy

You can deploy on platforms like Vercel (zero config) or Render/Fly.  
Vercel recommended for simplicity: push to GitHub → import repo → deploy.

## Next Steps (Optional Enhancements)

- Add analytics (privacy-friendly)
- Add intersection observer animations (optional)
- Add form backend (e.g., serverless function + email)
- Integrate A/B test for hero CTAs

## License

Internal usage (adapt as needed).
