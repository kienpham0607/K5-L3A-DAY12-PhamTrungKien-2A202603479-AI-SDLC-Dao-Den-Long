# Phase 3 Evidence — TICKET-03 "Đèn cạn dầu"

## Implementation summary

Phase 3 replaces permanent lanterns with a fuel economy, Shade drain AI, dawn survival victory (≥60% lit at timer end), dynamic carry capacity, and Contract v1.2.

## Changed files (high level)

- **Sim:** `src/sim/systems/fuel.js` (new), `deposit.js`, `shades.js`, `safeZones.js`, `winlose.js`, `pulse.js`, `pickup.js`, `step.js`, `stubWorld.js`, `spawn.js`
- **Shared:** `src/shared/tuning.js`, `src/shared/levels.js`, `game.contract.json` → v1.2
- **View:** `src/view/scene.js`, `hud.js`, `settings.js`, `main.js`, `styles.css`
- **Tests:** `tests/unit/phase3_fuel.test.js` (new), updates to deposit/winlose/tuning/phase2 tests
- **Docs:** `docs/adr/ADR-003-lantern-fuel-and-dawn.md`, `CHANGELOG.md`, `docs/proof/phase-3/*`

## Build

```powershell
npm run build
```

Result: **OK** (Vite production build succeeded).

## Tests

```powershell
npm test
```

Actual result (machine-generated):

```
ℹ tests 82
ℹ pass 82
ℹ fail 0
```

Includes Phase 1–2 regression, Phase 3 fuel/drain/dawn/capacity/scoring, Contract v1.2 snapshot fields, Night 3 21,600-tick benchmark ≤ 30s.

## Headless evidence (real outputs)

| Artifact | Command / purpose |
|---|---|
| `docs/proof/phase-3/fuel_decay.jsonl` | Light L1 then run 120 ticks — fuel decays (100 → 99 → 98), score 150 |
| `docs/proof/phase-3/shade_drain.jsonl` | Weak L1 + wander shade → `fuel_drain` events |
| `docs/proof/phase-3/dawn_win.jsonl` | 3/5 lit at timer → `game_over` `{won, dawn_survived}` score 507 |
| `docs/proof/phase-3/dawn_lose.jsonl` | 0 lit at timer → `{lost, dawn}` |
| `docs/proof/phase-3/baseline_n1.jsonl` | Night 1 baseline smoke |

Reproduce:

```powershell
node src/headless/cli.js --seed 1 --night 1 --scenario tests/scenarios/deposit_lit.json --inputs tests/inputs/interact_pulse.json --ticks 120 --out docs/proof/phase-3/fuel_decay.jsonl --snapshot-every 60
node src/headless/cli.js --seed 1 --night 1 --scenario tests/scenarios/p3_shade_drain.json --ticks 120 --out docs/proof/phase-3/shade_drain.jsonl --snapshot-every 30
node src/headless/cli.js --seed 1 --night 1 --scenario tests/scenarios/p3_dawn_win.json --ticks 90 --out docs/proof/phase-3/dawn_win.jsonl --snapshot-every 30
node src/headless/cli.js --seed 1 --night 1 --scenario tests/scenarios/lose_dawn.json --ticks 90 --out docs/proof/phase-3/dawn_lose.jsonl --snapshot-every 30
```

## Visual evidence

Automated GIF/screenshot capture tooling is not configured in this repo. Manual verification via `npm run dev`:

1. Light a lantern → fuel bar appears and decreases.
2. Wait until fuel < 30 → lantern + bar flash at ~1 Hz.
3. Let fuel hit 0 → lantern extinguishes (deflated/torn look), toast `lantern_out`.
4. `E` to relight (5 motes) or refuel.
5. Approach a weak lantern with a Shade → drain pose; toast `fuel_drain`.
6. Survive/fail dawn → result overlay THẮNG/THUA with `dawn_survived` / `dawn`.

## Remaining limitations

- No automated visual regression (screenshots/GIF) — documented above.
- Shade wander now prioritizes weak/unlit lanterns; chase-from-detect behavior retained when player is close.
