# Phase 1 — Pulse proof (thật)

```powershell
node src/headless/cli.js --seed 1 --night 1 --scenario tests/scenarios/pulse_stun.json --inputs tests/inputs/pulse_once.json --ticks 1 --out docs/proof/phase-1/step6_pulse.jsonl --snapshot-every 1
npm run test:pulse
npm test
```

- Exit **0**
- tick 1: `pulse` stunned_ids `[S1]`; flames 2; shade state `stunned`; pushed; score +5
- `npm run test:pulse`: 4 pass
- `npm test`: 37 pass / 0 fail
