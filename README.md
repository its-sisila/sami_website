# SAMI - Shed AI Manager Interface

AI-driven operational, forecasting, and market intelligence platform for fuel stations.

🌐 **Live:** [www.getsami.app](https://www.getsami.app) | **Dashboard:** [dashboard.getsami.app](https://dashboard.getsami.app)

---

## 📦 Monorepo Structure

```
SAMI_v1_5/
├── apps/
│   ├── landing/          # Marketing website (Next.js)
│   └── dashboard/        # Station management dashboard (Next.js)
├── services/
│   └── api/              # Backend API (FastAPI + Supabase)
└── docs/                 # Documentation
```

---

## 🚀 Apps

### Landing Page (`apps/landing`)

Production-ready marketing site for SAMI.

| Feature | Description |
|---------|-------------|
| Particle Text Effect | Interactive animated hero |
| Demo Request System | Resend email integration |
| Timeline | Animated roadmap |
| Dark/Light Mode | Theme toggle |

**Tech:** Next.js 14, TypeScript, Tailwind CSS, Framer Motion

### Dashboard (`apps/dashboard`)

Fuel station management dashboard.

| Module | Status | Features |
|--------|--------|----------|
| **Intelligence**| ✅ | SARIMA demand forecasting, anomaly detection, AI reorder alerts |
| **Market**   | ✅ | Live crude/forex charts, Sri Lankan price formula, AI market news |
| **Inventory** | ✅ | Tank levels, daily readings, fuel orders, deliveries |
| **Sales** | ✅ | Shift management, meter readings, card/credit sales |
| **Staff** | ✅ | Attendance, payroll, scheduling |
| **Accounts** | ✅ | Credit companies, transactions, expenses |
| **Admin** | ✅ | Station config, user roles |
| **Settings** | ✅ | Prices, wages, user invitations |

**Tech:** Next.js 14, TypeScript, Tailwind CSS, SWR, Supabase Auth

### Backend API (`services/api`)

FastAPI backend connected to Supabase PostgreSQL.

| Module | Endpoints |
|--------|-----------|
| Auth | `/auth/me`, token validation |
| Intelligence | `/forecasts`, SARIMA models, Anomaly Z-Scores |
| Market Data | `/pricing/market-snapshot`, `/pricing/market-news`, Gemini AI integration |
| Inventory | `/inventory/tanks`, `/readings`, `/nozzles` |
| Sales | `/sales/shifts`, `/history`, `/chart/weekly` |
| Employees | `/employees`, `/attendance`, `/payroll` |
| Accounts | `/accounts`, `/transactions` |
| Orders | `/orders`, `/returns` |
| Admin | `/admin/stations`, `/users` |

**Tech:** FastAPI, SQLAlchemy, Pydantic, Supabase

---

## 🛠 Getting Started

### Prerequisites

- **Node.js** 18+ (use [nvm](https://github.com/nvm-sh/nvm))
- **Python** 3.11+
- **Git**

### Installation

```bash
# Clone repository
git clone https://github.com/its-sisila/sami_website.git
cd sami_website

# Landing page
cd apps/landing
npm install
npm run dev        # http://localhost:3000

# Dashboard (in new terminal)
cd apps/dashboard
npm install
$env:PORT=3001; npm run dev   # http://localhost:3001

# Backend API (in new terminal)
cd services/api
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000   # http://localhost:8000
```

---

## ⚙️ Environment Variables

### Landing (`apps/landing/.env.local`)

```env
RESEND_API_KEY=re_xxxxxxxxxxxx
NEXT_PUBLIC_DASHBOARD_URL=http://localhost:3001
```

### Dashboard (`apps/dashboard/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### API (`services/api/.env`)

```env
DATABASE_URL=postgresql://...
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
JWT_SECRET=your_jwt_secret
```

---

## 🚢 Deployment

### Vercel (2 Projects)

| Project | Root Directory | Domain |
|---------|----------------|--------|
| sami-landing | `apps/landing` | getsami.app |
| sami-dashboard | `apps/dashboard` | dashboard.getsami.app |

### Backend API

Deploy to Railway, Render, or Fly.io:

- Build: `pip install -r requirements.txt`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

---

## 📊 Pilot Station Configuration

| Item | Count |
|------|-------|
| Tanks | 8 (LAD-1 to LAD-4, LP92-1/2, LP95-1, LSD-1) |
| Nozzles | 16 |
| Pumps | 8 |
| Products | 4 (Auto Diesel, Petrol 92, Petrol 95, Super Diesel) |
| Shifts | 2 (Day: 7AM-7PM, Night: 7PM-7AM) |

See `docs/pilot_station_details.md` for full configuration.

---

## 📄 License

Internal usage – adapt as needed for your organization.

---

**Built with ❤️ for fuel station operators who deserve modern tools.**
