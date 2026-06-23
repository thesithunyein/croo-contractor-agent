# Distribution Playbook — winning the A2A composability score

> ~40% of the hackathon score (Composability 25% + Adoption 15% + the 10+-orders bonus) depends on **real orders with other teams' agents**. This is the work that separates 1st from mid-pack. The Contractor is built to make it easy: it *hires* other agents, so you control the metric.

## The offer that makes teams say yes
Every team needs the same thing you do: counterparties and orders. You give them that for free. So lead with value:

> **"I built an orchestrator agent that HIRES other agents and pays in USDC on CROO. Drop your agent's `serviceId` and I'll integrate it — your agent gets real paid orders + a verified A2A counterparty for your own composability score. Reciprocate by hiring mine (`CROO Contractor`) and we both win."**

## Daily loop (do this every day until Jul 9)
1. Post the offer in the CROO Discord/Telegram hackathon channel (and reply to others' "looking for counterparties" posts).
2. Collect every `serviceId` people share.
3. Add them to `partners.json` (copy from `partners.example.json`) — no code changes.
4. Run a fan-out so each new partner gets a real settled order:
   ```bash
   npm run fanout -- "Smoke-test integration: summarize CROO CAP in one line."
   ```
5. Ask each partner to hire your Contractor back (`Orchestrate Multi-Agent Job`) — this gives you unique **buyer wallets**.
6. Re-run and check `reports/order-graph.md` — track unique counterparties climbing.

## Copy-paste messages

**Intro post**
```
gm builders 👋 I made "CROO Contractor" — an orchestrator that hires other CAP agents, pays in USDC, verifies delivery, and composes results.
Want free real orders + a verified counterparty for your composability score?
Drop your serviceId 👇 and I'll integrate + hire you today. I'll also hire back anyone who hires my Contractor. Let's pump each other's numbers 🤝
```

**Reply to "looking for counterparties"**
```
I gotchu — my Contractor will hire your agent right now. Paste your serviceId and I'll send a real order in a few min. Mine is "CROO Contractor" (serviceId: <PASTE_YOURS>) if you want to reciprocate.
```

**Reciprocal-deal DM**
```
Quick win for both of us: I add your serviceId to my orchestrator and send you N real orders; you hire my Contractor N times. That's N unique counterparties + N orders each, fully legit (real services, real USDC). Down?
```

## Targets for a 1st-place dashboard (by Jul 9)
- **20–30+ unique counterparty agents**
- **20+ unique buyer wallets** (teams hiring your Contractor)
- **50+ settled orders**

These are far above the anti-sybil flag thresholds (`<3 counterparties`, `<5 wallets`) and signal a real network effect — exactly what judges reward.

## Guardrails (stay legit)
- Hire **real** services for **real** (cheap) value — don't spam empty orders; random human audits can fail sybil-like patterns.
- Keep prices low (`0.01`) so volume is cheap and recoverable via Withdraw.
- Diversity matters more than raw count: many *different* teams > many orders to one agent.
