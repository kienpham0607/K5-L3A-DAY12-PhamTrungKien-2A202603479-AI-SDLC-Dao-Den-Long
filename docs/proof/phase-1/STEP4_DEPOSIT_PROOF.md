# Phase 1 — Deposit proof (thật)

```powershell
node src/headless/cli.js --seed 1 --night 1 --scenario tests/scenarios/deposit_lit.json --inputs tests/inputs/interact_pulse.json --ticks 5 --out docs/proof/phase-1/step4_deposit.jsonl --snapshot-every 1
npm run test:deposit
npm test
```

- Headless exit **0**
- tick 1: `deposit` L1 amount 3 → `lantern_lit` L1; score 200
- Scenario `lit:true` không phát event / không cộng điểm (test PASS)
- `npm run test:deposit`: 6 pass
- `npm test`: 26 pass / 0 fail
