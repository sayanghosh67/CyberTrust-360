# PROJECT CONTEXT: CyberTrust 360

> **Team / Developer Branding**: TECHNIX PRO  
> **Project Title**: CyberTrust 360 — AI-Powered Web Threat Detection & Digital Trust Intelligence Platform  
> **Hackathon Timeline**: 48-Hour Rapid MVP  
> **Current Milestone**: Phase 1 — Project Foundation (Completed)  
> **Source of Truth**: This document serves as the persistent architectural reference for all future AI and engineering sessions.

---

## 1. Project Objective

CyberTrust 360 is an enterprise-grade cyber-threat intelligence platform designed to counteract sophisticated modern web threats. It evaluates untrusted domains, malicious infrastructure, phishing campaigns, and fraudulent web entities through:
1. **Multi-Vector AI Threat Analysis**: Heuristic and structural threat classification across domains, certificates, DNS records, and page content.
2. **Digital Trust Intelligence**: Granular scoring of entity trustworthiness, infrastructure authenticity, and risk posture.
3. **Immutable Threat Attestation (Later Phase)**: EVM-compatible blockchain verification ensuring audit-grade provenance of threat indicators and scan verdicts.

---

## 2. System Architecture

The platform follows a decoupled, service-oriented architecture:

```
┌────────────────────────────────────────────────────────┐
│                      Client Layer                      │
│      React 19 + TypeScript + Vite + Tailwind CSS       │
│  (Landing Page, Real-time Health Telemetry, UI State)   │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / REST (CORS enabled)
┌──────────────────────────▼─────────────────────────────┐
│                    API Gateway Layer                   │
│           FastAPI (Python 3.11+) + Pydantic v2         │
│    (Health Check, Structured Errors, Routers, Core)    │
└──────────────────────────┬─────────────────────────────┘
                           │ SQLAlchemy 2.0 (ORM)
┌──────────────────────────▼─────────────────────────────┐
│                   Data Persistence                     │
│               PostgreSQL 16 via Docker                 │
│              Alembic Migration Pipeline                │
└────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### Frontend
- **Framework**: React 19 (TypeScript, strict mode)
- **Bundler & Dev Server**: Vite 8
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **Icons**: Lucide React
- **HTTP Client**: Fetch API with `AbortController` timeout protection and typed response models

### Backend
- **Runtime**: Python 3.11+
- **Framework**: FastAPI (v0.115+)
- **Validation & Settings**: Pydantic v2 & Pydantic-Settings
- **ASGI Server**: Uvicorn with standard workers
- **ORM / Database Tooling**: SQLAlchemy 2.0, Alembic 1.13+
- **PostgreSQL Drivers**: `psycopg` (binary v3) & `psycopg2-binary`
- **Testing**: Pytest 8, Pytest-Asyncio, HTTPX

### Database & Containers
- **Database Engine**: PostgreSQL 16 (Alpine image)
- **Containerization**: Docker Compose (`docker-compose.yml`)
- **Initialization**: `database/init.sql` (UUID & pgcrypto extensions configured)

---

## 4. Directory & Folder Structure

```
HACKMATRIX/
├── .env.example              # Master environment variable template
├── .gitignore                # Comprehensive ignore rules (.env, venvs, builds)
├── docker-compose.yml        # PostgreSQL container definition
├── PROJECT_CONTEXT.md        # Persistent architectural context (this file)
├── README.md                 # Project setup and execution guide
│
├── database/
│   └── init.sql              # Database bootstrap script (extensions & config)
│
├── docs/                     # Architectural and design documentation
│
├── backend/
│   ├── alembic/              # Alembic migration runner & environment
│   │   ├── versions/         # Migration versions directory
│   │   └── env.py            # Dynamic SQLAlchemy configuration loader
│   ├── alembic.ini           # Alembic configuration
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py           # FastAPI entrypoint, CORS, global error handlers
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── health.py     # GET /api/health implementation
│   │   │   └── router.py     # Aggregated API route dispatcher
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py     # Pydantic BaseSettings management
│   │   │   └── database.py   # Engine, SessionLocal, get_db, connection probe
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── base.py       # Declarative Base & TimestampMixin
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   └── health.py     # HealthResponse & ErrorResponse schemas
│   │   ├── services/         # Business logic layer (reserved for Phase 2)
│   │   └── utils/            # Helper utilities
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_health.py    # Health endpoint & error handling tests
│   ├── requirements.txt      # Pinned backend dependencies
│   └── .env.example          # Backend-specific environment template
│
└── frontend/
    ├── src/
    │   ├── main.tsx          # React application mount
    │   ├── App.tsx           # Root router/component wrapper
    │   ├── index.css         # Tailwind CSS entrypoint
    │   ├── components/
    │   │   ├── Header.tsx            # Header with live pulse status indicator
    │   │   ├── ThreatSearchHero.tsx  # Hero, title, URL input, coming soon button
    │   │   ├── BackendStatusCard.tsx # Detailed live server/database metrics
    │   │   ├── FoundationSpecCard.tsx# Stack & execution verification matrix
    │   │   └── Footer.tsx            # Technix Pro branding & copyright
    │   ├── hooks/
    │   │   └── useBackendHealth.ts   # Auto-polling hook with latency & retry
    │   ├── pages/
    │   │   └── LandingPage.tsx       # Landing page view
    │   ├── services/
    │   │   └── api.ts                # HTTP service with timeout & typed errors
    │   └── types/
    │       └── health.ts             # TypeScript interfaces for health state
    ├── public/
    │   └── favicon.svg       # CyberTrust 360 shield icon
    ├── package.json          # Frontend dependencies & scripts
    ├── vite.config.ts        # Vite configuration with Tailwind CSS plugin
    └── tsconfig.json         # TypeScript configuration
```

---

## 5. Implemented Features (Phase 1)

1. **Frontend Architecture**:
   - Modern dark-mode responsive UI themed for high-assurance cybersecurity.
   - Technix Pro developer branding and CyberTrust 360 product title.
   - URL target input with disabled Phase 2 investigation button.
   - Real-time connection status monitor showing backend online/offline state, latency (ms), and database availability.
   - Dynamic error fallback and manual re-check trigger.

2. **Backend Foundation**:
   - FastAPI application configured with CORS for `http://localhost:5173`.
   - `GET /api/health` endpoint delivering genuine system telemetry (app name, team branding, version, environment, UTC timestamp, database connection status, subsystem readiness).
   - Structured JSON exception handlers for HTTP errors, validation failures, and uncaught exceptions.
   - Modular structure separating core config, schemas, models, API routes, and services.

3. **Database Foundation**:
   - PostgreSQL connection handling with SQLAlchemy 2.0.
   - Non-blocking connection health check with configurable timeout.
   - Alembic migration pipeline configured with dynamic URL resolution.
   - Docker Compose configuration for PostgreSQL 16 Alpine with container healthcheck and volume persistence.

4. **Security & Configuration Controls**:
   - Zero hardcoded credentials or API keys.
   - Strict `.env` isolation included in `.gitignore`.
   - No mock scan results or simulated security reports displayed.

---

## 6. Pending Features (Phase 2 & Beyond)

- **Phase 2: Core Investigation Engine**:
  - Safe URL validation and domain parsing service.
  - DNS resolution and WHOIS metadata extraction.
  - SSL/TLS certificate validity and issuer reputation analysis.
  - Security headers & HTTP status inspection.
- **Phase 3: AI Threat Classification & Trust Scoring**:
  - Heuristic risk scoring engine (0-100 Trust Score).
  - Phishing signature detection and domain typosquatting detection.
  - Scan history and persistence in PostgreSQL models.
- **Phase 4: Blockchain Trust Attestation (Final Phase)**:
  - Smart contract for tamper-proof attestation of threat scores.
  - EVM network integration.

---

## 7. Development Commands

### Backend Setup & Execution
```bash
# Activate virtual environment
source backend/.venv/bin/activate

# Install dependencies (if updated)
pip install -r backend/requirements.txt

# Start backend server (port 8000)
uvicorn backend.app.main:app --reload --port 8000

# Run automated backend test suite
PYTHONPATH=. backend/.venv/bin/pytest backend/tests
```

### Frontend Setup & Execution
```bash
# Navigate to frontend
cd frontend

# Install dependencies (if updated)
npm install

# Start Vite development server (port 5173)
npm run dev

# Run TypeScript compile and production build
npm run build
```

### PostgreSQL Database (Docker)
```bash
# Start PostgreSQL container in background
docker compose up -d

# Check PostgreSQL container logs
docker compose logs -f db

# Stop database container
docker compose down
```

---

## 8. Important Engineering Decisions

1. **Python 3.11 Runtime**: Utilized `/opt/homebrew/bin/python3.11` to satisfy the strict Python 3.11+ requirement.
2. **Database Health Tolerance**: Designed `check_database_connection()` in `database.py` with a 2-second timeout and clean exception interception. When PostgreSQL is offline, `GET /api/health` returns `status: "degraded"` with `database: {status: "disconnected"}` and HTTP 200 rather than crashing the gateway.
3. **Database Drivers**: Installed both `psycopg[binary]>=3.2` and `psycopg2-binary` to guarantee full forward-compatibility with SQLAlchemy 2.0 on macOS ARM64.
4. **Tailwind CSS v4 Integration**: Used `@tailwindcss/vite` plugin in `vite.config.ts` with `@import "tailwindcss";` for ultra-fast builds without legacy PostCSS boilerplate.
5. **No Synthetic Security Data**: Strictly adhered to Phase 1 guidelines by providing a disabled "Investigate (Phase 2)" button and safe-mode indicator, avoiding fake threat scores or deceptive scans.
