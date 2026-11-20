# Phase 3 Proof Index

Machine-generated JSONL (do not hand-edit scores/events):

| File | Verifies |
|---|---|
| `fuel_decay.jsonl` | First light + fuel 100→99→98 over 120 ticks; capacity 12 |
| `shade_drain.jsonl` | Shade enter `drain`; `fuel_drain` event; fuel decreases |
| `dawn_win.jsonl` | `game_over` `{ result: "won", reason: "dawn_survived" }` |
| `dawn_lose.jsonl` | `game_over` `{ result: "lost", reason: "dawn" }` |
| `baseline_n1.jsonl` | Night 1 smoke |

See also `docs/phase-3-evidence.md` and `docs/adr/ADR-003-lantern-fuel-and-dawn.md`.
