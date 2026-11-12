# AuroraPay — ClearGuard OS 🛡️

### Autonomous AI Escrow, Pre-Purchase Guardrails & Cryptographic Settlement Protocol

[![License: MIT](https://img.shields.io/badge/License-MIT-7c3aed.svg)](https://opensource.org/licenses/MIT)
[![PayPal](https://img.shields.io/badge/Payments-PayPal_Orders_v2-003087.svg?logo=paypal)](https://developer.paypal.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js_16_%2B_React_19-111827.svg?logo=next.js)](https://nextjs.org)
[![AG Grid](https://img.shields.io/badge/Data_Grid-AG_Grid_React_36.3-7c3aed.svg)](https://www.ag-grid.com/react-data-grid/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_%2B_Python_3.11-059669.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![OpenGuardrails](https://img.shields.io/badge/Guardrails-4--Tier_OpenGuardrails-6366f1.svg)](https://github.com/openguardrails)
[![APIMatic](https://img.shields.io/badge/Schema-APIMatic_Zero--Hallucination-7c3aed.svg)](https://www.apimatic.io/)
[![Tests](https://img.shields.io/badge/Backend_Suite-153_Pytest_Passing-10b981.svg)](#automated-verification-suite)

---

## Overview — The Hostage Money Protocol

Giving autonomous AI agents corporate spending power introduces four fatal failure modes: **prompt-injection hijacks, runaway spending loops, floating-point ledger drift, and paying upfront before physical goods arrive intact.**

**AuroraPay (ClearGuard OS)** solves all four through the **Hostage Money Protocol**:

1. **Zero Upfront Payouts:** AI procurement orders are evaluated before dispatch and frozen in **PayPal Orders v2 Escrow (`intent: AUTHORIZE`)** rather than captured immediately.
2. **Pre-Checkout Blocking:** Out-of-policy categories, injection payloads, SSRF probes, and over-cap spends are intercepted with **HTTP 403** *before* any PayPal order or cart checkout happens (`$0` escrowed).
3. **Physical Proof-of-Delivery Gate:** Gemini Vision analyzes courier drop-off photos against the expected SKU, tamper tape seal, and deformation thresholds before PayPal authorization can settle (`CAPTURE`) or be voided/disputed (`VOID` / PayPal Disputes v1).
4. **Tamper-Evident Auditability:** Every order transition is linked into an immutable **SHA-256 Hash Chain**, signed by an air-gapped Maker-Checker auditor (`HMAC-SHA256`), and surfaced live in an interactive **AG Grid React** enterprise ledger.

---

## Quick Judge Walkthrough (60 Seconds on Localhost)

| Step | Tab / Surface | What to Trigger | Verified Proof |
| :--- | :--- | :--- | :--- |
| **1. Policy Interception** | **Overview & Catalog** or **+ New Custom Order** | Attempt **Rolex Submariner** (`luxury`) or a spend above `Per-Order Cap` | **HTTP 403 Forbidden** logged as `BLOCKED`; `0` PayPal orders created & `$0` deducted |
| **2. AI Auto-Buy Escrow** | **AI Auto-Buy** banner or right-edge dock (`AI Auto`) | Enter natural-language instruction (e.g. *"Buy 1 Logitech MX Master 3S..."*) | Parsed via Gemini -> checked by OpenGuardrails -> real **PayPal Sandbox `AUTHORIZE` hold** |
| **3. Dynamic AG Grid Audit** | **Escrow Orders → Audit Grid** | Search with Quick Filter, sort amounts/scores, click `Hash` / `POD` / `PayPal` cells, or **Export CSV** | Live **AG Grid React (`v36.3`)** table with custom `themeQuartz` light theme & inline `Auth`/`Capture`/`Void` controls |
| **4. Multimodal Vision POD** | **Vision Dashboard** | Bind a target `TX` order ID & upload a parcel photo | Runs `SHA-256` photo hashing + Gemini Vision POD check -> updates integrity score & settles/holds PayPal escrow |
| **5. Tamper & Recovery** | Click any transaction's **Hash / Audit** button | Click **Simulate Database Tamper** then **Repair & Re-Anchor Chain** | Status flips cleanly `VERIFIED -> CORRUPTED -> VERIFIED` |
| **6. Dual-Agent Signing** | **Mandate & Safeguards** | Click **Verify Dual-Agent Maker-Checker Signature** | Independent Agent 1 (Maker) / Agent 2 (Checker) verification with `HMAC-SHA256` proof |

---

## System Architecture

```
            ┌─────────────────────────────────────────────┐
            │   AuroraPay Next.js 16 Dashboard + AI Auto  │
            │  (Overview • Cards/AG Grid • Vision POD)    │
            └──────────────────────┬──────────────────────┘
                                   │
             APIMatic OpenAPI      │ Zero-Hallucination
             Strict Type Gate      ▼ Schema Interception
            ┌─────────────────────────────────────────────┐
            │        ClearGuard FastAPI Control Plane     │
            │  • Slowapi Rate Limiter (5 req/min)         │
            │  • Autonomous Kill Switch Circuit Breaker   │
            └──────────────────────┬──────────────────────┘
                                   │
                                   ▼
            ┌─────────────────────────────────────────────┐
            │       4-Tier OpenGuardrails Policy Engine   │
            │  1. Injection / SSRF / Secret Leakage Regex │
            │  2. Commercial Category Allowlist Check     │
            │  3. Strict Decimal Cap (ROUND_HALF_UP)      │
            │  4. Pre-Flight Remaining Pool Invariant     │
            └──────────────────────┬──────────────────────┘
                                   │
                  ┌────────────────┴────────────────┐
                  ▼                                 ▼
        [ 403 BLOCKED Pre-Cart ]          [ 200 APPROVED + HMAC ]
        Zero PayPal Order Created         PayPal Orders v2 AUTHORIZE
                  │                                 │
                  └────────────────┬────────────────┘
                                   ▼
            ┌─────────────────────────────────────────────┐
            │     SHA-256 Immutable Hash-Chain Ledger     │
            │  Hash(n) = SHA256(Prev + Ts + Amt + St)     │
            │  Exposed in AG Grid Audit + Inspector Modal │
            └──────────────────────┬──────────────────────┘
                                   │
                  ┌────────────────┴────────────────┐
                  ▼                                 ▼
      Intact Delivery Photo Verified       Damage / Mismatch Flagged
      Capture Authorization (Paid)         Void Hold / Dispute Filed
```

---

## Highlight: Dynamic AG Grid React Audit Ledger

Built with **`ag-grid-react` & `ag-grid-community` (`36.3.0`)** in [TransactionsAgGrid.tsx](frontend/src/components/TransactionsAgGrid.tsx):

- **Custom Quartz Light Theme:** Uses `themeQuartz.withPart(colorSchemeLight)` tuned to AuroraPay's `#ffffff` / `#f7f5fe` / `#7c3aed` lilac-white-violet palette (with `ModuleRegistry.registerModules([AllCommunityModule])`).
- **Real-Time KPI Strip Inside the Grid Header:** Computes live **Rows**, **Authorized Locked**, **Settled**, and **Policy Blocked** totals directly from filtered ledger rows with normalized `USD` / `INR` sorting.
- **8 Purpose-Built Financial Columns:**
  1. `Order TX` (TX ID + timestamp filter & sort)
  2. `Item & Merchant` (category pill, SKU title, supplier)
  3. `Escrow Amount` (right-aligned tabular currency normalized across `USD` / `INR`)
  4. `Escrow Status` (pill badges for `AUTHORIZED`, `CAPTURED`, `DISPUTED`, `BLOCKED`, `ORDER_CREATED`)
  5. `PayPal Escrow IDs` (one-click `CAP` / `AUTH` / `ORD` / `GATE` payload inspector + direct Sandbox checkout approval link)
  6. `Vision POD` (real-time integrity score bar, retry counter `vision_mismatch_attempts`, and direct modal jump)
  7. `SHA-256 Chain` (`0x...` block hash prefix pill opening cryptographic tamper/repair verification)
  8. `Escrow Actions` (inline **Auth**, **Capture**, **Void**, **Proof**, and **Delete** controls)
- **Quick Filter & One-Click Compliance Export:** Instant client-side search across TX IDs, merchants, statuses, and hashes plus formatted CSV export (`clearguard-escrow-audit-YYYY-MM-DD.csv`).

---

## Core Security & Financial Guarantees

- **Strict `Decimal` Accounting (No IEEE-754 Floats):** Financial schemas, mandate updates, and pool deductions use Python `decimal.Decimal` quantized with `ROUND_HALF_UP`.
- **SHA-256 Immutable Ledger Chain:** Every state transition appends a chained hash verified dynamically by `/api/audit/{transaction_id}`, with judge tamper simulation (`/api/audit/simulate-tamper/{id}`) and repair (`/api/audit/repair/{id}`).
- **Strict PayPal Webhook Signature Verification:** Rejects unsigned or non-whitelisted webhook calls with **HTTP 401**, validating `PAYPAL-AUTH-ALGO`, `PAYPAL-CERT-URL`, `PAYPAL-TRANSMISSION-ID`, `PAYPAL-TRANSMISSION-SIG`, and `PAYPAL-TRANSMISSION-TIME`.
- **APIMatic Zero-Hallucination Schema Gate:** Validates agent tool parameters against strict OpenAPI constraints prior to execution (`agents/tools/apimatic_plugin.py`).
- **Blast Radius & Kill-Switch Controls:** Slowapi token-bucket throttling on validation routes plus an autonomous circuit breaker (`/api/kill-switch/*`) triggered on policy anomalies or dispute thresholds.
- **Maker-Checker Dual Control:** Independent Maker/Checker agents sign approved procurement proposals via `HMAC-SHA256` before PayPal order dispatch (`/api/maker-checker/propose-and-audit`).

---

## Quickstart Guide

### Prerequisites
- Python 3.11+
- Node.js 18+ (Node 20+ recommended)
- PayPal Developer Sandbox credentials (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`)
- Google Gemini API key (`GEMINI_API_KEY`)

### 1. Clone & Configure Environment
```bash
git clone https://github.com/Aditya-kumar-yadav/ClearGuard-OS.git
cd ClearGuard-OS

cp .env.example .env
```
> Fill `.env` at the repository root with your PayPal Sandbox and Gemini API credentials. `.env` and runtime evidence files under `backend/vision_evidence/` are gitignored and never committed.

### 2. Start the FastAPI Backend (`:8000`)
```bash
cd backend
python -m venv venv
# Windows PowerShell:
.\venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --no-server-header
```
Swagger docs are available at [http://localhost:8000/docs](http://localhost:8000/docs).

### 3. Start the Next.js Frontend (`:3000`)
```bash
cd ../frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

### 4. Optional: Docker Compose
```bash
docker compose up --build
```

---

## Automated Verification Suite

Run the full backend test suite from the repository root:
```bash
python -m pytest -q
```
Current suite coverage verifies **153 tests** across decimal mandates, OpenGuardrails policy blocking, webhook signature enforcement, SHA-256 ledger tamper detection/repair, maker-checker HMAC signing, and PayPal escrow transitions.

Additional verification scripts:
```bash
python scripts/test_verification.py
python scripts/test_apimatic.py
```

---

## Project Structure

```text
ClearGuard-OS/
├── backend/
│   ├── api/
│   │   ├── api.py                   # Core validation & procurement routes
│   │   ├── webhooks.py              # Strict PayPal webhook signature verification
│   │   └── validate.py              # Request interceptor middleware
│   ├── core/
│   │   ├── crypto_ledger.py         # SHA-256 state chain & tamper detection
│   │   ├── database.py              # Numeric(18,2) async SQLAlchemy / SQLite/PG pool
│   │   ├── guardrail.py             # 4-tier OpenGuardrails policy engine
│   │   ├── kill_switch.py           # Autonomous circuit breaker
│   │   ├── maker_checker.py         # Dual-agent HMAC-SHA256 protocol
│   │   ├── paypal_client.py         # PayPal Orders v2 & Disputes v1 client
│   │   └── vision_arbiter.py        # Multimodal Vision proof-of-delivery arbiter
│   ├── schemas/
│   │   └── schemas.py               # Decimal-enforced Pydantic models
│   ├── tests/                       # Pytest security, guardrail & ledger suite
│   ├── main.py                      # FastAPI application entrypoint
│   └── requirements.txt
├── frontend/
│   ├── next.config.ts               # Next.js configuration
│   ├── package.json
│   └── src/
│       ├── app/
│       │   ├── globals.css          # Light Lilac-White-Violet SaaS design system
│       │   ├── layout.tsx           # Root App Router layout
│       │   ├── page.tsx             # Main dashboard, Catalog, Escrow, Vision & Safeguards
│       │   └── escrow/
│       │       ├── return/page.tsx  # PayPal Sandbox authorization callback handler
│       │       └── cancel/page.tsx  # PayPal Sandbox checkout cancellation handler
│       └── components/
│           ├── TransactionsAgGrid.tsx  # Dynamic AG Grid React v36.3 Enterprise Audit Table
│           ├── AuditModal.tsx          # 4-tab SHA-256, Maker-Checker, Vision & PayPal Inspector
│           ├── CustomProcureModal.tsx  # Structured order form + live guardrail preview
│           ├── SettlementFlowModal.tsx # Step-by-step live PayPal Capture / Void trace modal
│           ├── EdgeDockRail.tsx        # Floating right-edge dock & AI Auto-Buy quick drawer
│           ├── PayPalAuthModal.tsx     # Connected buyer profile & sandbox key configurator
│           ├── SetAmountModal.tsx      # Dual-currency pool balance & per-order cap editor
│           └── BrandLogos.tsx          # AuroraPay & PayPal SVG brand emblems
├── agents/
│   ├── tools/
│   │   ├── apimatic_plugin.py       # APIMatic OpenAPI schema validators
│   │   ├── secure_order.py          # Resilient order dispatcher
│   │   ├── auto_dispute.py          # Automated PayPal dispute tool
│   │   └── status_checker.py        # Carrier tracking & delivery tool
│   └── main_agent.py                # Autonomous AI procurement agent
├── scripts/
│   ├── test_verification.py         # Live server verification script
│   └── test_apimatic.py             # APIMatic schema verification
├── .env.example
├── docker-compose.yml
├── LICENSE                          # MIT License
└── README.md
```

---

## License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for full terms.
