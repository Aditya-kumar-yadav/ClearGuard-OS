# ClearGuard-OS 🛡️
### Autonomous AI Escrow & Hostage Money Protocol for Enterprise Procurement

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.110+-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js_15-black.svg?logo=next.js)](https://nextjs.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python)](https://python.org)
[![OpenGuardrails](https://img.shields.io/badge/Guardrails-OpenGuardrails-blue.svg)](https://github.com/openguardrails)
[![APIMatic](https://img.shields.io/badge/APIMatic-Zero--Hallucination-purple.svg)](https://www.apimatic.io/)
[![PayPal](https://img.shields.io/badge/Payments-PayPal_Orders_v2-003087.svg?logo=paypal)](https://developer.paypal.com)

---

## 📌 Executive Overview

**ClearGuard-OS** is an autonomous AI financial security protocol and governance operating system. When autonomous AI agents (powered by Google Gemini) are delegated corporate purchasing authority, traditional card payments present catastrophic risks: **rogue spend overruns, prompt-injection hijacked purchases, supplier shipment scams, and floating-point math rounding drift.**

ClearGuard-OS solves this through the **Hostage Money Protocol**:
Funds are **never paid upfront**. Instead, funds are frozen in smart **PayPal Orders v2 Escrow (AUTHORIZE)** and only released upon cryptographic physical verification or reclaimed autonomously upon transit damage.

---

## 🏛️ Core Architectural Pillars

```
                     ┌────────────────────────────────────────┐
                     │          Autonomous AI Agent           │
                     │       (Gemini 2.0 Flash Watchdog)      │
                     └───────────────────┬────────────────────┘
                                         │
                   APIMatic OpenAPI      │ Zero-Hallucination
                   Pre-Flight Schema     ▼ Schema Interception
                     ┌────────────────────────────────────────┐
                     │         ClearGuard-OS Gateway          │
                     │   Slowapi Rate Limiter (5 req/min)     │
                     └───────────────────┬────────────────────┘
                                         │
                                         ▼
                     ┌────────────────────────────────────────┐
                     │      4-Tier OpenGuardrails Gate        │
                     │  1. Injection / SSRF / Secret Regex    │
                     │  2. Commercial Category Whitelist      │
                     │  3. Strict Decimal Cap (ROUND_HALF_UP) │
                     │  4. Pre-Flight Ledger Pool Invariant   │
                     └───────────────────┬────────────────────┘
                                         │
                         ┌───────────────┴───────────────┐
                         ▼                               ▼
                 [ 403 Forbidden ]               [ 200 Approved ]
                 Blocked in Ledger              PayPal Escrow AUTHORIZE
                 Zero Money Moved               Deterministic UUIDv4
                         │                               │
                         └───────────────┬───────────────┘
                                         ▼
                     ┌────────────────────────────────────────┐
                     │   SHA-256 Immutable Ledger Chain       │
                     │   Hash(n) = SHA256(Prev + Ts + Amt + St)│
                     └───────────────────┬────────────────────┘
                                         │
                         ┌───────────────┴───────────────┐
                         ▼                               ▼
               Physical Courier Delivery         Carrier Damage / Loss
               Gemini Vision: 99% Pristine       Gemini Vision: Deformed
                         │                               │
                         ▼                               ▼
               Capture Authorization             Auto-Dispute Claim Filed
               (Merchant Paid)                   (Buyer Escrow Reclaimed)
```

---

## 🔐 Key Innovations & Engineered Deliverables

### 1. Precision Financial Math (Phase 1)
- **Eradication of IEEE-754 Floats**: All schemas, routes, and database models use Python's `decimal.Decimal` quantized strictly to two decimal places with `ROUND_HALF_UP`.
- **Pre-Flight Invariant Validation**: Before money is committed, the engine calculates:
  $$\text{Spent\_So\_Far} + \text{Current\_Transaction\_Amount} \le \text{Total\_Mandate\_Limit}$$
- **PostgreSQL Async Pooling**: Non-blocking `asyncpg` and SQLAlchemy async sessions (`pool_size=10, max_overflow=20`) handling high-concurrency multi-agent calls.

### 2. SHA-256 Cryptographic Immutable Ledger
- Every state transition ($\text{PENDING} \rightarrow \text{AUTHORIZED} \rightarrow \text{CAPTURED} \rightarrow \text{DISPUTED}$) appends to an immutable cryptographic block hash:
  $$\text{Hash}_n = \text{SHA256}(\text{Prev\_Hash}_{n-1} + \text{Timestamp} + \text{Amount} + \text{Status})$$
- `/api/audit/{transaction_id}` Endpoint: Dynamically recalculates the complete cryptographic chain. If any database cell was manually altered, it flags the row as `CORRUPTED`.

### 3. Strict Webhook Signature Verification (Phase 2)
- Rejects unverified raw POST requests with **HTTP 401 Unauthorized**.
- Inspects PayPal transmission headers:
  - `PAYPAL-AUTH-ALGO` (e.g. `SHA256withRSA`)
  - `PAYPAL-CERT-URL` (whitelisted to sanctioned PayPal HTTPS domains)
  - `PAYPAL-TRANSMISSION-ID`
  - `PAYPAL-TRANSMISSION-SIG`
  - `PAYPAL-TRANSMISSION-TIME`

### 4. APIMatic Zero-Hallucination Tooling (Phase 3)
- Replaces loose, informal JSON tool schemas with formal **OpenAPI 3.0 APIMatic Context Plugins**.
- Pre-flight schema validation checks arguments against exact enum types, property constraints, and required fields before sending to the LLM or network, eliminating argument hallucination.

### 5. Blast Radius Rate Limiting (Phase 4)
- **Slowapi** sliding-window token bucket on `/api/validate_transaction`.
- Caps AI spending attempts to a maximum of **5 validations per minute**.
- Tripping the cap immediately returns **HTTP 429 Too Many Requests**, containing runaway autonomous AI loops.

### 6. Multi-Agent 2-Step AI Dual Control
- **Step 1 (Maker-Checker Banking Protocol)**: Agent 1 (Procurement Buyer) crafts proposals; Agent 2 (Air-Gapped Auditor) verifies without network access and signs via `HMAC-SHA256`.
- **Step 2 (Multi-Modal Vision POD Arbiter)**: Analyzes physical parcel delivery photographs. Pristine condition ($\ge 95\%$) releases escrow; structural deformation ($\ge 80\%$) halts capture and triggers PayPal Disputes v1.

---

## 🚀 Quickstart Guide

### Prerequisites
- Python 3.11+
- Node.js 18+ (Node 20+ recommended)
- PayPal Developer Sandbox Account
- Google Gemini API Key

### 1. Repository & Environment Setup
```bash
git clone https://github.com/Aditya-kumar-yadav/ClearGuard-OS.git
cd ClearGuard-OS

# Place the shared team `.env` at the repository root, OR create one from `.env.example`:
cp .env.example .env
```
> **Note for Collaborators:**
> - Place `.env` in the **repository root** (`ClearGuard-OS/.env`) with valid PayPal Sandbox (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`) and `GEMINI_API_KEY` values. Do **not** commit `.env`.
> - For live PayPal Sandbox checkout approval, log into [sandbox.paypal.com](https://sandbox.paypal.com) using a **Sandbox Personal Buyer account** in the same supported currency (default **USD**).

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --no-server-header
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Optional: Docker Compose Setup
```bash
docker compose up --build
```

---

## 🧪 Automated Verification Suite

Run the backend integration & security suite (with venv activated from repository root):
```bash
pytest -v
```

Legacy verification scripts are organized under `scripts/`:
```bash
python scripts/test_verification.py
python scripts/test_apimatic.py
```

---

## 📂 Project Monorepo Structure

```
ClearGuard-OS/
├── backend/
│   ├── api/
│   │   ├── api.py               # Core validation & procurement routes
│   │   ├── webhooks.py          # Strict PayPal signature verification
│   │   └── validate.py          # Strict interceptor middleware
│   ├── core/
│   │   ├── crypto_ledger.py     # SHA-256 state chain & audit recalculator
│   │   ├── database.py          # Numeric(18,2) async connection pool
│   │   ├── guardrail.py         # OpenGuardrails deterministic engine
│   │   ├── kill_switch.py       # Autonomous circuit breaker & velocity monitor
│   │   ├── maker_checker.py     # Dual-control HMAC protocol
│   │   ├── paypal_client.py     # PayPal Orders v2 & Disputes client
│   │   └── vision_arbiter.py    # Multi-modal Gemini parcel inspection
│   ├── schemas/
│   │   └── schemas.py           # Strict Decimal Pydantic models
│   ├── main.py                  # FastAPI application entry point
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css      # Brutalist dark-mode theme
│   │   │   └── page.tsx         # Real-time reactive telemetry dashboard
│   │   ├── components/
│   │   │   ├── AuditModal.tsx   # Interactive SHA-256 ledger inspector
│   │   │   ├── EdgeDockRail.tsx # Organic curved smartphone aesthetic dock
│   │   │   ├── LuxuryWalletView.tsx
│   │   │   └── ProductCatalog.tsx
│   │   └── lib/
│   │       └── fetcher.ts       # Resilient API fetcher with brutalist toasts
│   └── package.json
├── agents/
│   ├── tools/
│   │   ├── apimatic_plugin.py   # APIMatic OpenAPI schema declarations
│   │   ├── secure_order.py      # Circuit breaker & 5s timeout fallback
│   │   ├── auto_dispute.py      # Automated dispute filing tool
│   │   └── status_checker.py    # Carrier telematics simulator
│   └── main_agent.py            # Gemini Watchdog autonomous agent
├── scripts/
│   ├── test_verification.py     # Manual live-server verification script
│   └── test_apimatic.py         # APIMatic zero-hallucination verification
├── docker-compose.yml
└── README.md
```

---

## 🛡️ License

This project is licensed under the MIT License - see the LICENSE file for details.
