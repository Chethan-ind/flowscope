# FlowScope – Automation Intelligence Platform

> Google Maps for business automations.

## Quick Start

```bash
# 1. Clone and configure
cp .env.example .env
# Add your GEMINI_API_KEY to .env

# 2. Run with Docker
docker-compose up -d

# 3. Open http://localhost:3000
```

## Manual Dev Setup

```bash
# Backend
cd backend && npm install
cp .env.example .env  # fill in values
npx prisma db push
npm run dev           # http://localhost:4000

# Frontend (new terminal)
cd frontend && npm install
npm run dev           # http://localhost:3000
```

## File Structure

```
flowscope/
├── backend/
│   ├── src/index.ts          ← Entire backend (Express + BullMQ + Gemini)
│   ├── prisma/schema.prisma  ← Database schema
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── lib/index.ts          ← API client + Zustand store + Socket.IO
│   │   ├── components/index.tsx  ← Sidebar + AppShell
│   │   └── app/
│   │       ├── page.tsx          ← Landing page
│   │       ├── auth/             ← Login + Register
│   │       ├── dashboard/        ← Charts + live events
│   │       ├── inventory/        ← CRUD table + detail view
│   │       ├── visualizer/       ← React Flow dependency graph
│   │       ├── insights/         ← AI insights + Gemini analysis
│   │       └── settings/         ← Import wizard
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret |
| `GEMINI_API_KEY` | Google Gemini API key |
| `REDIS_URL` | Redis connection URL |
| `PORT` | API port (default 4000) |
| `NEXT_PUBLIC_API_URL` | Frontend → backend URL |

## Features

- **Inventory** – CRUD for all automations with search, filter, pagination
- **Flow Visualizer** – React Flow dependency graph with color-coded status
- **AI Insights** – Gemini: duplicate detection, orphan finding, bottleneck analysis
- **Impact Simulator** – Cascading effect preview before disabling
- **Version History** – Git-like versioning with rollback
- **Health Monitoring** – Execution logs and failure tracking
- **Cost Analysis** – Per-automation execution cost estimates
- **Discovery Engine** – Import from Zapier, Power Automate, generic JSON
- **Real-time** – Socket.IO live dashboard updates
- **Event-driven** – BullMQ queue for async background processing
