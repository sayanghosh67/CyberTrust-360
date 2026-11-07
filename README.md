# CyberTrust 360

> **AI-Powered Web Threat Detection & Digital Trust Intelligence Platform**  
> Developed by **TECHNIX PRO** | 48-Hour Hackathon MVP

---

## Overview

CyberTrust 360 is an intelligence platform engineered to identify malicious web infrastructure, protect users against sophisticated phishing campaigns, and calculate verifiable trust scores for web domains.

This repository contains **Phase 1: Project Foundation**, establishing the high-performance full-stack scaffolding, real-time telemetry, database connections, and security standards.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide Icons
- **Backend**: Python 3.11+, FastAPI, Pydantic v2, Uvicorn
- **Database**: PostgreSQL 16 (Alpine), SQLAlchemy 2.0 ORM, Alembic migrations
- **Infrastructure**: Docker Compose, Python venv

---

## Quick Start

### 1. Prerequisites
- **Node.js**: v18+ (v20+ recommended)
- **Python**: 3.11+
- **Docker & Docker Compose** (optional for local database container)

---

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

---

### 3. Backend Setup

```bash
# 1. Create and activate Python 3.11 virtual environment
python3.11 -m venv backend/.venv
source backend/.venv/bin/activate

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Start the FastAPI development server
uvicorn backend.app.main:app --reload --port 8000
```
Backend API will be available at:
- **API Root**: [http://localhost:8000/](http://localhost:8000/)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Interactive OpenAPI Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 4. Frontend Setup

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Launch Vite development server
npm run dev
```
Frontend will be running at [http://localhost:5173/](http://localhost:5173/).

---

### 5. PostgreSQL via Docker Compose

```bash
# Start PostgreSQL service in background
docker compose up -d

# Verify container health
docker compose ps
```

---

### 6. Running Tests

```bash
# Run backend automated pytest suite
PYTHONPATH=. backend/.venv/bin/pytest backend/tests -v

# Run frontend TypeScript & production build check
cd frontend && npm run build
```

---

## Phase 1 Deliverables Summary

- [x] Full-stack directory structure with clean module separation
- [x] React 19 + TypeScript + Vite + Tailwind CSS landing page
- [x] Live backend connectivity telemetry & status monitoring
- [x] Genuine FastAPI health check endpoint (`/api/health`)
- [x] CORS middleware enabling local frontend communication
- [x] PostgreSQL configuration with SQLAlchemy 2.0 & Alembic migrations
- [x] Docker Compose recipe for PostgreSQL with healthchecks & persistent volumes
- [x] Strict environment variable isolation (`.env.example` & `.gitignore`)
- [x] Zero mock scan results; safe-mode gating active
- [x] Unit test suite verifying health endpoints & structured error handling
- [x] `PROJECT_CONTEXT.md` persistent architectural documentation

---

## Roadmap

- **Phase 1**: Project Foundation (Completed)
- **Phase 2**: Core Threat Investigation Engine (URL analysis, DNS, SSL, safe HTTP probes)
- **Phase 3**: AI Scoring & Entity Trust Classification
- **Phase 4**: On-chain Verification & Smart Contract Attestation

---

## Team

**TECHNIX PRO**  
Built for the 48-Hour Hackathon.
