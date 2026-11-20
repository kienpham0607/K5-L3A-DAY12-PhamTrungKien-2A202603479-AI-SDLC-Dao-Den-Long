# ADR-003 — Lantern Fuel & Dawn Survival (TICKET-03)

## Status

Accepted — Phase 3 / Contract v1.2

## Context

Phase 1–2 lit lanterns permanently. Victory was immediate when all lanterns were lit (`all_lit`). Phase 3 (TICKET-03 "Đèn cạn dầu") requires depleting fuel, relight/refuel loops, Shade drain AI, and dawn-based survival victory.

## Previous behavior

- Lantern: `{ lit, deposited }` — permanent once lit.
- Safety zone: any lit lantern, radius 6m.
- Win: all lanterns lit → `all_lit`.
- Score: +10/mote, +100/lantern, time bonus + flame bonus.
- Capacity fixed at 10.

## Decision

### Lantern state model

Each lantern stores:

| Field | Meaning |
|---|---|
| `lit` | Currently burning |
| `fuelUnits` | Integer internal fuel (`display_fuel * 60`) |
| `ever_lit` | Has been lit at least once |
| `relit_count` | Successful relights |
| `deposited` | Progress toward light/relight cost |

### Fuel precision

- Scale = 60 (TICK_HZ): 1 fuel/s ⇒ 1 unit/tick; drain 5/s ⇒ 5 units/tick.
- Snapshots export one decimal via `round(fuelUnits/60, 1)`.
- Unlit lanterns always export `fuel: 0`.

### Shade drain

- New state `drain`.
- Wander targets nearest lit lantern with fuel < 30 (tie: smallest id), else nearest unlit.
- Enter drain within 2m of weak target; stop moving; stack drains.
- Transitions: player ≤6m → chase; pulse → stunned; lantern off / fuel≥30 / >2m → wander.
- Safety zone only when `fuel >= 30` (inclusive).

### Victory

| Night | Duration | Min lit (`ceil(0.6*N)`) |
|---|---:|---:|
| 1 | 240s | 3/5 |
| 2 | 270s | 4/6 |
| 3 | 300s | 5/7 |

- Win reason: `dawn_survived` (timer finished + enough lit + alive).
- Lose: `dawn` (timer finished, insufficient lit) or `no_flames`.
- `no_flames` precedes dawn evaluation on the final tick.
- Removed: `all_lit`.

### Tick order (Phase 3 delta)

Step 2 applies natural decay + shade drain fuel, then extinguishes (`lantern_out`). Win/lose remains step 11 after all updates.

### Capacity & scoring

- `capacity = min(20, 10 + 2 * successful_lights)` — lights/relights only (not scenario prelit, not refuel).
- Score: +5/mote, +100 first light, +40 relight, +5/+15 pulse, dawn +50+⌊fuel⌋ per lit lantern +50/flame. No time bonus.

## Consequences

- Breaking contract bump to **v1.2**.
- Phase 1–2 tests that assumed permanent light / `all_lit` / old durations / old scores were updated.
- Gameplay shifts from "light everything ASAP" to "maintain fuel under pressure".

## Compatibility

- Headless CLI flags unchanged.
- Scenario gains optional `fuel`, `ever_lit`, `successful_lights`, `target_lantern_id`.
- Snapshot gains `fuel`, `ever_lit`, `relit_count`, `capacity`.
