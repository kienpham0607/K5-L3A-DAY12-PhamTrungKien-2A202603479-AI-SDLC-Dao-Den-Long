# Changelog

## [1.0.0] — Phase 4 — TICKET-04 "Bình minh" — Contract v1.3

### Added

- Benchmark CLI: `node src/bench/cli.js --seed 42 --duration 30 --out bench.json` (1280×720, Night 1, 200 shades + 100 motes).
- Soak CLI: `node src/soak/cli.js --seed 7 --nights 10 --out soak.json`.
- Local leaderboard (top 10) + `node src/run.js --export-leaderboard out.json`.
- Accessibility: key rebinding, captions/⚠ indicators, reduce motion, large text ×1.25.
- Contract fields `bench_cmd`, `soak_cmd`; `run_cmd` → `node src/run.js`.
- Retro: `docs/retro/phase-4-retro.md` · Evidence: `docs/phase-4-evidence.md`, `bench.json`, `soak.json`.

### Packaging

- Version **1.0.0**; static web build in `dist/` for GitHub Release.
- README: install ≤3 commands, controls, test/bench/soak.

---

## [Phase 3] — TICKET-03 "Đèn cạn dầu" — Contract v1.2

### Breaking changes

- Permanent lantern lighting removed — fuel decays at 1/s while lit.
- Relighting (`relight_cost: 5`) / refueling; Shade `drain`; safety when `fuel >= 30`.
- Victory: dawn survival ≥60% lit (`dawn_survived`); removed `all_lit`.
- Night durations 240 / 270 / 300; scoring rewritten; dynamic capacity.

---

## [Phase 2] — TICKET-02 "Ba hòn đảo" — Contract v1.1

- Three nights (Bến / Cau / Chuông), dash, jump pads, drifters, wind charm, Night 3 wind.
- Shared `levels.js` SSOT; pause freezes `sim_tick`.

---

## [Phase 1] — Core sim + view

- Headless CLI, movement/pickup/deposit/shades/pulse/win-lose, Three.js HUD.
