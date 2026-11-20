# Phase 1 — Bước 2 proof (thật)

Máy: Windows / Node v24  
Thời điểm: 2026-11-20

## Headless move forward

```powershell
node src/headless/cli.js --seed 1 --night 1 --scenario tests/scenarios/minimal.json --inputs tests/inputs/move_forward.json --ticks 60 --out docs/proof/phase-1/step2_move_forward.jsonl --snapshot-every 60
```

- **Exit:** 0  
- Snapshot tick 0: `pos [0,0,0]`  
- Snapshot tick 60: `pos [0,0,6]` (= `player_speed` 6 m/s × 1 s)

## Tests

```powershell
npm run test:step2
npm test
```

- step2: 8 pass / 0 fail  
- full: 14 pass / 0 fail  
