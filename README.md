# CROO Contractor — A2A Orchestrator Agent

> A CAP-native "general contractor" agent: give it a goal, it **hires multiple specialist agents** on the CROO Agent Store via [CAP](https://cap.croo.network), **verifies** each delivery, pays in **USDC on Base**, and returns a **composed result with a tamper-evident proof bundle**.

Built for the **CROO Hackathon**. Tracks: **Open – Any A2A Agents** + **Developer Tooling Agents**.

## Why this is composable by design

A single inbound job to the Contractor **fans out into multiple paid sub-orders** to diverse counterparty agents. That makes the Contractor exercise the **full CAP surface** — it is both:

- a **Provider** (humans / other agents hire the Contractor), and
- a **Requester** (the Contractor hires specialists, pays escrow, verifies delivery).

On a normal API marketplace this is impossible: CAP supplies the on-chain identity (DID), escrow settlement, verifiable delivery, and reputation that let one agent safely subcontract many others.

## Architecture

```
caller (human / agent)
        │  negotiate + pay (CAP)
        ▼
┌─────────────────────┐      hire + pay (CAP, USDC/Base)      ┌──────────────────┐
│  Contractor         │ ───────────────────────────────────► │ Solana TX Doctor │
│  (provider+requester)│ ───────────────────────────────────► │ Summarizer       │
│  plan → hire → verify│ ───────────────────────────────────► │ <partner agents> │
│  → compose → deliver │ ◄─────────── verified deliverables ── └──────────────────┘
└─────────────────────┘
        │  deliver composed result + proof bundle (order ids + result hashes)
        ▼
     caller
```

| File | Role |
|------|------|
| `src/croo/client.ts` | Typed wrapper over CAP `AgentClient` (`hire()` end-to-end, `deliverText()`, error normalization) |
| `src/provider.ts` | Contractor as **provider** — accept → on paid → orchestrate → deliver |
| `src/requester.ts` | Standalone **requester** demo — hire one specialist end-to-end |
| `src/orchestrator.ts` | Core engine — plan → hire many → verify → compose → proof bundle (+ spend guardrails) |
| `src/planner.ts` | Deterministic goal → step DAG (swap for an LLM planner later) |
| `src/registry.ts` | Curated allow-list of hireable `serviceId`s (CAP has no service-search) |
| `src/verify.ts` | Verification-first delivery checks + SHA-256 result hashing |
| `src/specialists/` | Bundled hireable agents: `solana-tx-doctor`, `summarizer` |

## CAP / SDK methods used

From [`@croo-network/sdk`](https://github.com/CROO-Network/node-sdk):

- `new AgentClient({ baseURL, wsURL }, sdkKey)` — authenticated client
- `client.connectWebSocket()` — real-time event stream (auto-reconnect)
- **Requester:** `negotiateOrder()`, `payOrder()`, `getDelivery()`
- **Provider:** `acceptNegotiation()`, `getOrder()`, `deliverOrder()`, `rejectOrder()`
- **Events:** `NegotiationCreated`, `OrderCreated`, `OrderPaid`, `OrderCompleted`, `OrderRejected`, `OrderExpired`, `NegotiationRejected`
- **Types/errors:** `DeliverableType.Text`, `APIError`, `isInsufficientBalance`

## Setup

### Prerequisites
- Node.js 18+
- A CROO account at [agent.croo.network](https://agent.croo.network) (wallet / Google / email)
- A small amount of **USDC on Base** in each requesting agent's **AA wallet** (gas is sponsored by CROO)

### 1. Register agents in the Dashboard
Register at minimum **2 agents** (more = more A2A depth):
1. **Contractor** (the orchestrator)
2. One or more **specialists** (e.g. Solana TX Doctor, Summarizer)

For each: copy the **API Key (SDK-Key)** shown once, and configure a **Service** (name, price in USDC, SLA, deliverable Text/Schema). Deposit USDC into each requester's **AA wallet address** (not the controller address).

### 2. Install
```bash
npm install
```

### 3. Configure environment
Copy `.env.example` to `.env`. Each running process represents **one** agent, so it uses **that agent's** `CROO_SDK_KEY`:

```bash
CROO_SDK_KEY=croo_sk_...              # key of the agent this process runs
CROO_TARGET_SERVICE_ID=...            # (requester demo) serviceId to hire
CONTRACTOR_REGISTRY_SERVICE_IDS=...   # comma-separated serviceIds the orchestrator may hire
SOLANA_TX_DOCTOR_SERVICE_ID=...       # used by src/registry.ts
SUMMARIZER_SERVICE_ID=...
MAX_USDC_PER_ORDER=2.00
MAX_USDC_PER_JOB=10.00
```

## Run

Start each agent in its own terminal with its own `CROO_SDK_KEY`:

```bash
# Specialist providers (each = its own registered agent)
npm run specialist:solana
npm run specialist:summarizer

# The Contractor as a provider (orchestrates on payment)
npm run provider

# Prove a single order settles end-to-end (requester -> a specialist)
npm run requester -- "debug failed tx, custom program error 0xbc2"

# Drive the orchestrator directly (fans out to specialists)
npm run orchestrate -- "Debug this failed Solana tx and summarize the fix: <signature> 0xbc2"

# Fan-out: hire EVERY registered agent (specialists + partners) in one job
npm run fanout -- "Smoke-test integration: summarize CROO CAP in one line."
```

### Scaling A2A composability (partners)

The Contractor hires not just your specialists but **other teams' agents**. To add them with no code changes, copy `partners.example.json` to `partners.json` and paste their serviceIds:

```json
{ "partners": [
  { "serviceId": "<their-uuid>", "name": "Their Agent", "team": "@handle", "tags": ["research"], "priceUsdc": 0.01, "deliverable": "text" }
] }
```

Then `npm run fanout` sends each a real settled order. Every run writes an **A2A network report** to `reports/order-graph.md` (+ `.json`) with unique-counterparty / order / proof stats. See `docs/distribution.md` for the outreach playbook.

Each completed CAP order settles USDC on Base and writes a reputation (PTS) update to the agent's DID.

## How the orchestration works

1. **Plan** — `planner.ts` turns the goal into a DAG of capability steps.
2. **Route** — `registry.ts` resolves each capability to the cheapest configured specialist `serviceId`.
3. **Hire** — `client.hire()` runs `negotiateOrder → payOrder → getDelivery` over WebSocket events.
4. **Verify** — `verify.ts` checks each deliverable (JSON validity, required fields) before acceptance; failures are recorded, not composed.
5. **Compose** — verified outputs are merged and delivered, with a **proof bundle** of `{ orderId, resultHash }` per sub-order.
6. **Guardrails** — `MAX_USDC_PER_ORDER` / `MAX_USDC_PER_JOB` cap spend so the agent never overspends.

## Submission checklist (CROO Hackathon)

- [x] CAP-integrated (callable, settles on-chain via `@croo-network/sdk`)
- [ ] Listed on CROO Agent Store (register Contractor + specialists)
- [x] Open source, MIT (`LICENSE`)
- [ ] Demo video (≤5 min) + this README
- [ ] BUIDL filed on DoraHacks

## License

MIT — see [LICENSE](LICENSE).
