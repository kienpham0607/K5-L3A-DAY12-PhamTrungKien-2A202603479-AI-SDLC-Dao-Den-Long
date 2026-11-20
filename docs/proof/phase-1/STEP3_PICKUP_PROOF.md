# Phase 1 — Pickup proof (thật)

## Lệnh

```powershell
node src/headless/cli.js --seed 1 --night 1 --scenario tests/scenarios/pickup_near.json --ticks 5 --out docs/proof/phase-1/step3_pickup.jsonl --snapshot-every 1
npm run test:pickup
npm test
```

## Kết quả

- Headless exit **0**
- Snapshot tick 0: `motes_active=1`, `carried=0`, `score=0`
- Event tick 1: `mote_picked` `{ carried: 1 }`
- Snapshot tick 1: `motes_active=0`, `carried=1`, `score=10`
- `npm run test:pickup`: 6 pass
- `npm test`: 20 pass / 0 fail
