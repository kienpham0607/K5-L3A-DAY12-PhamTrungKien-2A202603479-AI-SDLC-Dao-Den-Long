# Phase 1 — Shades / hit proof (thật)

```powershell
node src/headless/cli.js --seed 1 --night 1 --scenario tests/scenarios/hit_shade.json --ticks 5 --out docs/proof/phase-1/step5_shades_hit.jsonl --snapshot-every 1
npm run test:shades
npm test
```

- Headless exit **0**
- tick 1: `player_hit` by `shade`, flames 2, dropped 2
- Invuln chặn hit lại trong 5 ticks
- `safe_radius` + `fall` covered by tests
- `npm run test:shades`: 7 pass
- `npm test`: 33 pass / 0 fail
