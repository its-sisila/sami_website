# SAMI Landing Page

Production-ready single-page marketing site for **SAMI (Shed AI Manager Interface)** – an AI-driven operational, forecasting, and market intelligence platform for fuel stations.

Built with **Next.js 14 (App Router)** + **TypeScript** + **Tailwind CSS**.

🌐 **Live Site:** [www.getsami.app](https://www.getsami.app)

---

## ✨ Key Features

### Modern UI/UX
- **Particle Text Effect** – Interactive animated hero with canvas-based particle simulation
- **Infinite Slider** – Seamless auto-scrolling company/feature carousel
- **Progressive Blur** – Elegant gradient blur transitions
- **Cursor Spotlight** – Dynamic spotlight effect following mouse movement
- **Dark/Light Mode** – Theme toggle with `localStorage` persistence
- **Framer Motion Animations** – Smooth transitions and micro-interactions

### Sections
- Hero with animated particle text
- Who It's For (target audience)
- Feature Pillars
- Roadmap Timeline (animated)
- How It Works
- Benefits
- Pricing Teaser
- Security Snapshot
- FAQ (accordion)
- Call-to-Action
- Footer

### Demo Request System
- **Modal Form** – Full-featured demo request with validation
- **Resend Integration** – Server-side email delivery via [Resend](https://resend.com)
- **Zod Validation** – Type-safe form validation with `react-hook-form`
- Sends formatted emails to `contact@getsami.app`

### Technical
- Responsive layout (desktop-first, mobile-friendly)
- Accessible, semantic HTML (WCAG AA oriented)
- JSON-LD structured data (`SoftwareApplication`)
- Vercel Analytics & Speed Insights ready
- Zero public signup (curated onboarding only)

---

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Icons | Lucide React |
| Forms | react-hook-form + Zod |
| Email | Resend SDK |
| UI Components | Radix UI (Slot), Custom Components |
| Analytics | Vercel Analytics & Speed Insights |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** LTS (v18+ recommended) – use [nvm-windows](https://github.com/coreybutler/nvm-windows)
- **Git** – `git --version` should work in PowerShell

### Installation

```powershell
# Clone the repository
git clone <repo-url> sami-landing
cd sami-landing

# Install dependencies
npm install

# Start development server
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

### Production Build

```powershell
npm run build
npm start
```

---

## 📁 Project Structure

```
SAMI_v1_2/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Landing page (all sections)
│   ├── global.css          # Global styles & theme variables
│   └── login/
│       └── page.tsx        # Login page placeholder
├── actions/
│   └── submit-demo.ts      # Server action for demo requests (Resend)
├── components/
│   ├── Header.tsx          # Navigation with mobile menu
│   ├── Hero.tsx            # Hero with particle effect & CTAs
│   ├── particle-text-effect.tsx  # Canvas-based text animation
│   ├── FeaturePillars.tsx  # Feature cards section
│   ├── Timeline.tsx        # Animated roadmap timeline
│   ├── HowItWorks.tsx      # Process steps
│   ├── Benefits.tsx        # Benefits grid
│   ├── PricingTeaser.tsx   # Pricing CTA
│   ├── SecuritySnapshot.tsx # Security features
│   ├── FAQ.tsx             # Accordion FAQ
│   ├── CallToAction.tsx    # Final CTA section
│   ├── DemoModal.tsx       # Demo request modal with form
│   ├── Footer.tsx          # Footer with links
│   └── ui/
│       ├── button.tsx      # Reusable button (CVA variants)
│       ├── infinite-slider.tsx  # Auto-scrolling carousel
│       ├── progressive-blur.tsx # Gradient blur component
│       └── timeline.tsx    # Timeline base component
├── lib/
│   ├── site.config.ts      # Site configuration & constants
│   └── utils.ts            # Utility functions (cn, etc.)
├── public/                 # Static assets (images, favicon)
└── tailwind.config.js      # Tailwind theme configuration
```

---

## ⚙️ Environment Variables

Create a `.env.local` file for local development:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
```

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | API key from [Resend](https://resend.com) for sending demo request emails |

### Production (Vercel)
Set environment variables in Vercel dashboard → Settings → Environment Variables.

---

## 🎨 Theming

- **Toggle** persists via `localStorage`
- Respects user system preference on first load
- Theme variables defined in `global.css`
- Tailwind `dark:` classes for dark mode variants

---

## ♿ Accessibility

- Semantic HTML structure with proper landmarks
- Heading hierarchy maintained
- Focus states retained for keyboard navigation
- Modal: Escape key closes, backdrop click closes
- ARIA labels for navigation toggle and modal
- WCAG AA contrast ratios

---

## 📧 Demo Request Flow

1. User clicks "Request Demo" button
2. Modal opens with form (Name, Company, Email, Message)
3. Client-side validation via `react-hook-form` + `zod`
4. Server action submits to Resend API
5. Email sent to `contact@getsami.app`
6. Success/error feedback displayed to user

---

## 🚢 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import repository in Vercel
3. Set `RESEND_API_KEY` in Environment Variables
4. Deploy!

### Other Platforms
Works on Render, Fly.io, or any Node.js hosting. Ensure:
- Node.js 18+
- Environment variables configured
- Build command: `npm run build`
- Start command: `npm start`

---

## 📊 Analytics

Vercel Analytics and Speed Insights are pre-configured:
- `@vercel/analytics` – Page view tracking
- `@vercel/speed-insights` – Core Web Vitals monitoring

---

## 🔧 Customization

| What | Where |
|------|-------|
| Site name, URLs, social links | `lib/site.config.ts` |
| Marketing copy | Individual component files |
| Theme colors | `tailwind.config.js` + `global.css` |
| Email template | `actions/submit-demo.ts` |

---

## 📝 Development Notes

### Key Improvements Made
- ✅ Replaced basic Hero with particle text animation effect
- ✅ Integrated Resend for production email delivery
- ✅ Added Framer Motion for smooth animations
- ✅ Implemented Timeline component for roadmap
- ✅ Built Infinite Slider for trusted-by section
- ✅ Fixed TypeScript errors and type safety
- ✅ Configured Resend domain (mail.getsami.app)
- ✅ Added progressive blur and cursor spotlight effects

### Scripts

```powershell
npm run dev    # Start development server
npm run build  # Production build
npm start      # Start production server
npm run lint   # Run ESLint
```

---

## 📄 License

Internal usage – adapt as needed for your organization.

---

**Built with ❤️ for fuel station operators who deserve modern tools.**
