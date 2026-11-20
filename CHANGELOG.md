# Changelog

## [Phase 3 — TICKET-03 "Đèn cạn dầu"] — Contract v1.2

### Breaking changes

- Permanent lantern lighting removed — fuel decays at 1/s while lit.
- Relighting introduced (`relight_cost: 5`) with `lantern_lit.relight: true`.
- Refueling introduced (`refuel` event); full lanterns cannot be selected.
- Shade `drain` state: weak lanterns (fuel < 30) are drained at 5 fuel/s (stacks).
- Safety zone requires `fuel >= 30` (inclusive at exactly 30).
- Victory condition replaced: survive until dawn with ≥ 60% lanterns lit (`dawn_survived`).
- Removed game-over reason `all_lit`.
- Night durations: 240 / 270 / 300 seconds (was 300 / 330 / 360).
- Scoring formula replaced (+5/mote, +100/+40 light/relight, +5/+15 pulse, dawn bonuses; no time bonus).
- Dynamic capacity: `min(20, 10 + 2 * successful_lights)`.
- Contract updated to **v1.2** (snapshot/scenario/event schema extended).

### Added

- `src/sim/systems/fuel.js` — integer fuel units, decay, drain emit, extinguish.
- Colorblind setting **Bảng màu dễ phân biệt** (shade `#00B3FF`, warning `#FFFFFF` + ⚠).
- 3D fuel bars + 1 Hz low-fuel flash; unlit lanterns 20% deflated with torn-paper cue.
- ADR: `docs/adr/ADR-003-lantern-fuel-and-dawn.md`.
- Evidence: `docs/proof/phase-3/`, `docs/phase-3-evidence.md`.
- Unit tests: `tests/unit/phase3_fuel.test.js`.

### Tests updated / reasons

| Test | Change |
|---|---|
| `tests/contract/winlose.test.js` | Replaced `all_lit` early-win with no-early-win + `dawn_survived` |
| `tests/contract/deposit.test.js` | Score +5/mote; assert `fuel`, `relight`, `capacity` |
| `tests/unit/deposit.test.js` | Relight/refuel/tie-break coverage |
| `tests/unit/tuning.test.js` | Expect contract v1.2 + fuel tuning |
| `tests/unit/phase2_systems.test.js` | Durations 240/270/300 |
| `tests/contract/phase2_contract_v11.test.js` | Assert v1.2 snapshot fields |

### Unchanged

- Phase 1–2 movement, dash, pulse physics, Night 2/3 geometry, drifters, wind, pause/determinism/benchmark still covered and passing.
