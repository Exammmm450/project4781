# TITAN // Next-Gen NeoBank & Treasury Management Platform

> **Principal Fintech Architecture & Institutional Treasury Engine**
> Flagship NeoBank platform featuring virtual card issuance via Luhn algorithm (ISO/IEC 7812), atomic multi-party settlement, compliance fraud engine, and stealth command back-office (`/terminal/ops-hq`).

---

## 🏛️ System Architecture & Repository Layout

```text
root/
├── client/                      # React 18 + Tailwind CSS + Lucide Icons + Recharts (Vite)
│   ├── src/
│   │   ├── api/                 # Axios client with auto-refresh interceptors
│   │   ├── context/             # AuthContext (Dual JWT management & roles)
│   │   ├── components/          # VirtualCard3D, TransferModal, NewCardModal, ReceiptModal, Navbar
│   │   ├── pages/               # AuthPage, Dashboard, Cards, Transfers, Analytics, Ledger, OpsTerminal
│   │   ├── App.jsx              # Role-guarded routing & terminal access
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── server/                      # Node.js + Express + MongoDB & Mongoose
    ├── src/
    │   ├── config/              # db.js (with zero-config embedded Mongo fallback), env.js
    │   ├── controllers/         # authController, cardController, transferController, adminController
    │   ├── events/              # fraudEmitter, auditEmitter (Node.js EventEmitter)
    │   ├── middleware/          # auth (tokenVersion check), roleGuard, multer, error
    │   ├── models/              # User, Account, Card, Transaction, AuditLog
    │   ├── routes/              # authRoutes, cardRoutes, transferRoutes, adminRoutes
    │   ├── utils/               # luhnGen (MOD 10), tokens (Dual JWT), apiResponse
    │   └── app.js               # Express application setup, CORS, static uploads
    ├── uploads/                 # Receipts, invoices, financial vouchers
    ├── .env.example
    ├── .env
    ├── package.json
    └── server.js                # HTTP Server entrypoint
```

---

## 🕶️ Stealth Admin Escalation Protocol

The platform implements **Zero-Visibility Admin Ingress** — no public buttons, links, or hints for administrative access are exposed to standard users:

1. **Master Secret Key:**
   - Pre-configured secret key: `ADMIN_SECRET_KEY=bankadmin6453`
2. **Stealth Triggers:**
   - **Form Badge / Hotkey:** Clicking the subtle *«Enclave Security: STANDARD»* badge or pressing `Ctrl + Shift + A` reveals the masked Master Clearance Key input.
   - **Double-Click Logo:** Double-clicking the TITAN crest in the navigation bar opens the *Stealth Clearance Protocol* dialog.
3. **Escalation & Automatic Dynamic Routing:**
   - Validating `bankadmin6453` permanently or session-escalates the user to `role: 'admin'` and clearance `OMEGA`.
   - The frontend intercepts admin credentials and executes an immediate dynamic redirect to `/terminal/ops-hq`.
   - Access to `/terminal/ops-hq` is strictly protected both by Express `roleGuard(['admin'])` on the server and `RoleRoute` guards on the client. Non-admin users are barred with `403 Forbidden`.

---

## 💳 Interactive Virtual Cards (Client Core)

- **Luhn Algorithm Verification:** Every issued card adheres to ISO/IEC 7812 (Visa `4xxx` or Mastercard `5xxx`, 16 digits, 3-year expiration, 3-digit CVV).
- **Interactive 3D Hover & Flip:** Photorealistic metallic EMV chip, contactless wave icon, magnetic stripe, and dynamic blurred CVV with reveal toggle.
- **1-Click Number Copying:** Instant copy to clipboard with glowing toast confirmation.
- **Dynamic 1-Click Freeze / Unfreeze:** Instantly locks or restores card authorization state directly in the UI.

---

## 💸 Atomic P2P & Interbank Transfers

- Multi-identifier routing: transfer funds by **Account Number** (`ACC-xxxx-xxxx`), **Card Number** (16 digits), or **Email**.
- **Mongoose Atomic Transactions:** Prevents race conditions and guarantees zero negative balances.
- **Multer Receipt Attachment:** Integrated drag-and-drop file uploader for invoices and receipts (PDF, PNG, JPG).
- **Compliance Sentinel:** Transfers $\ge \$10,000$ are automatically placed into escrow hold (`pending_review`) and flagged for Ops HQ review.

---

## 🛡️ Enterprise Ops HQ (`/terminal/ops-hq`)

1. **Liquidity Pulse:** Real-time custodial liquidity, 24-hour volume velocity chart, average settlement latency, and active risk counters.
2. **Account Control & Risk Management:** Client registry with instant search, 1-click account suspension/freeze, daily limit adjustments, and **1-click Force Session Reset** (increments `tokenVersion` to immediately invalidate all active access & refresh tokens).
3. **Fraud & Flagged Transactions Monitor:** Ledger of high-value and flagged transactions with 1-click **Approve**, **Reject** (refunds escrow to sender), and **Refund** actions.
4. **Live Security Audit Stream:** Real-time event log powered by Node.js `EventEmitter` and streamed over Server-Sent Events (SSE).

---

## 🔐 Dual JWT & Session Architecture

- **Access Token:** Short-lived (15 minutes), transported via `Authorization: Bearer <token>`.
- **Refresh Token:** Stored in a secured HttpOnly cookie (`sameSite: 'lax'`, `maxAge: 3600000` — **strictly 1 hour**).
- **Single-Click Session Revocation:** Any change to `user.tokenVersion` invalidates both access and refresh tokens across all devices.

---

## 🚀 Quick Start Guide

### 1. Launch Backend Server:
```bash
cd server
npm install
npm run dev
```
*Note: If no external MongoDB instance is running locally, the server automatically initializes an embedded MongoDB engine and seeds demo records.*

### 2. Launch Client Frontend:
```bash
cd client
npm install
npm run dev
```

### 3. Demo Credentials:
- **Omega Admin:** `admin@titan.internal` / `AdminPass123!` (redirects to `/terminal/ops-hq`)
- **Standard User:** `elena.rostova@quantum.io` / `UserPass123!` (redirects to `/dashboard`)
- **Stealth Master Key:** `bankadmin6453`

