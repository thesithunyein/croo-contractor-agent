# CROO Agent Hackathon — Demo Day Deck (FILLED)
# CROO Contractor — A2A Orchestrator Agent
# Copy each slide block into Claire's Google Slides template:
# https://docs.google.com/presentation/d/1y4Uyl6gwaHlenOyUNbP34qu0ffXwGI6Ga0vLpodRrT4/edit?usp=sharing

---

## SLIDE 0 — COVER (≈10s)

**Header:** CROO AGENT HACKATHON · DEMO DAY

**Agent name:**
CROO Contractor

**One-line tagline:**
Give it a goal — it hires specialist agents on the CROO Agent Store, verifies every delivery, pays in USDC on Base, and returns a composed result with a tamper-evident proof bundle.

**BUILT BY:**
Sithu Nyein (@thesithunyein)

**ON CROO AGENT STORE:**
https://agent.croo.network/agents/dc177ed7-1089-4566-b602-7234f0125ff7

**Speaker note (say out loud):**
"I'm Sithu. CROO Contractor is an A2A orchestrator — both a provider and a requester on CAP. Humans and other agents hire it; it hires specialists, verifies, pays, and composes."

---

## SLIDE 1 — Problem & Customer (≈45s)

**WHO HIRES IT:**
- **Humans** on CROO Agent Store who need a multi-step agent job done in one call (e.g. debug a Solana tx AND summarize the fix)
- **Other agents** that need a general contractor to fan out work across the network
- **Builders** who want composable paid workflows without wiring CAP themselves

**THE PAIN:**
- Thousands of agents ship — almost none earn or hire each other at scale
- Normal API marketplaces can't settle per-call in USDC, verify sub-deliveries, or compose multi-agent results on-chain
- Without CAP, you'd need custom payment rails, manual verification, and no proof that sub-agents were actually paid

**Why pay on-chain, per call:**
Every sub-order is a real CAP escrow settlement on Base. Failed deliveries are rejected — not composed. Each result includes `{ orderId, resultHash, txHash }` per sub-order.

**Speaker note:**
"The buyer is anyone who needs one agent to orchestrate many agents with proof. This is impossible on a normal API marketplace — it needs CAP."

---

## SLIDE 2 — Demo (≤90s)

**Embed:** Screen recording of this flow (or live screen-share backup)

**Demo script to record:**
1. Show Agent Store — 3 agents ONLINE (Contractor, Solana TX Doctor, Summarizer)
2. Run: `npm run demo -- "Diagnose Solana error 0x1770 and summarize the fix"`
3. Show: plan → hire specialists → pay → verify → compose
4. **Pause on proof bundle** — point at orderId + txHash on screen
5. Optional killer moment: show one external partner hire (ZERU or VeriClaim) if live

**Recording links (backup):**
- Hackathon demo: https://youtu.be/Xk2hT2CYrvA
- Live site: https://croo-contractor-agent.vercel.app

**Speaker note:**
"One inbound goal fans out into multiple paid CAP sub-orders. Every step settles real USDC. Every delivery is verified before composition."

---

## SLIDE 3 — How it works & Traction (≈60s)

**HOW IT WORKS:**

```
Caller (human or agent)
    │ negotiate + pay (CAP, USDC/Base)
    ▼
CROO Contractor (provider + requester)
    │ plan → route → hire → verify → compose
    ├──► Solana TX Doctor (specialist)
    ├──► Summarizer (specialist)
    └──► Partner agents via partners.json (ZERU, VeriClaim, …)
    │
    ▼ deliver composed result + proof bundle
Caller
```

**CAP SDK methods used:**
`negotiateOrder` · `payOrder` · `getDelivery` · `acceptNegotiation` · `deliverOrder` · `rejectOrder` · WebSocket event stream

**Dual-role architecture:**
Provider — hired on Agent Store | Requester — hires specialists and partners

**TRACTION · real CAP data:**

| Metric | Value |
|--------|-------|
| CAP orders | **75** |
| USDC settled | **$6.14** |
| Completion | **93.3%** |
| Unique buyer wallets | **13** |
| External A2A partners | **3** (ZERU, VeriClaim, Manga Localizer) |
| Agents deployed 24/7 | **3** |

**Bonus:** 75 orders >> 10+ CAP order threshold for Technical Execution bonus.

**Speaker note:**
"Full CAP surface — provider and requester in one agent. Real orders, real wallets, real external counterparties."

---

## SLIDE 4 — What's next (≈35s)

**ROADMAP — next 3 milestones:**
1. **Partner network expansion** — onboard more A2A agents via `partners.json` (zero code changes)
2. **LLM planner** — replace keyword routing with goal-driven step DAG for any capability
3. **Always-on VPS deployment** — 24/7 Agent Store uptime beyond local/Render free tier

**THE ASK:**
- **Featured Agent Store listing** for top orchestrator use case
- **Distribution** — surface Contractor as the reference A2A composability pattern for new CAP builders
- **Design partners** — 5+ external agents willing to be hired via fan-out mode

**Speaker note:**
"CROO Contractor is the general contractor for the agent economy. We're asking CROO to feature this as the reference orchestrator pattern."

---

## QUICK COPY-PASTE (template placeholders only)

Use these to replace `[ brackets ]` in the Google Slides template:

| Placeholder | Paste this |
|-------------|------------|
| `[ Agent name ]` | CROO Contractor |
| `[ One-line tagline… ]` | Give it a goal — it hires specialist agents, verifies delivery, pays USDC on Base, and returns a composed result with a tamper-evident proof bundle. |
| `[ Team / builder name ]` | Sithu Nyein (@thesithunyein) |
| `[ agent.croo.network/agents/… ]` | https://agent.croo.network/agents/dc177ed7-1089-4566-b602-7234f0125ff7 |
| `[ Who is the buyer?… ]` | Humans and other agents on CROO Agent Store who need multi-step jobs composed from specialist agents — e.g. debug a Solana tx and summarize the fix in one paid call. |
| `[ What's broken… ]` | APIs can't settle per-call in USDC, verify sub-deliveries, or compose multi-agent results on-chain. Without CAP, there's no proof that sub-agents were paid or that outputs are tamper-evident. |
| `[ Paste recording… ]` | Embed your ≤90s screen recording OR link: https://youtu.be/Xk2hT2CYrvA |
| `[ How does CAP settlement… ]` | Dual-role: Contractor is hired as provider; on payment it plans steps, hires specialists via negotiate→pay→getDelivery, verifies each deliverable, composes result with proof bundle `{orderId, resultHash, txHash}` per sub-order. Partners join via partners.json. |
| `[ # ] CAP orders` | 75 |
| `[ $ ] USDC settled` | $6.14 |
| `[ % ] completion` | 93.3% |
| `[ # ] unique buyers / agents` | 13 buyer wallets · 3 external A2A partners |
| `[ Your next 3 milestones… ]` | 1) Expand partner network via partners.json 2) LLM planner 3) Always-on VPS for 24/7 uptime |
| `[ What do you need?… ]` | Featured Agent Store listing as reference A2A orchestrator · distribution to CAP builders · 5+ design partner agents for fan-out |

---

## 6-MINUTE VIDEO OUTLINE (pre-recorded submission)

| Time | Slide / Visual | Say |
|------|----------------|-----|
| 0:00–0:25 | Cover | Agent name + tagline |
| 0:25–1:00 | Problem | Buyer + pain + why on-chain |
| 1:00–3:30 | Demo recording | Live hire flow + proof bundle |
| 3:30–4:30 | Traction | 75 orders, 13 wallets, 3 partners |
| 4:30–5:30 | How it works + Next | Architecture + roadmap + ask |
| 5:30–6:00 | Cover | Close: "Hire, verify, pay, compose." |

**Submit to:** claire@croo.network by **July 15, 11:59 PM UTC**
