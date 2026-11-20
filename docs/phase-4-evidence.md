# Phase 4 Evidence — TICKET-04 v1.0.0

## Summary

Release packaging: benchmark, soak, local leaderboard, accessibility, Contract v1.3, retro.

## Commands & results (machine-run)

```powershell
npm test
# ℹ tests 87 · pass 87 · fail 0

npm run build
# OK — dist/index.html + dist/bench.html

node src/soak/cli.js --seed 7 --nights 10 --out soak.json
# crashes=0 · mem_start_mb=60.5 · mem_end_mb=68.9 (≤ 1.2×)

node src/bench/cli.js --seed 42 --duration 30 --out bench.json
# avg_fps=165 · p1_low_fps=158.2 · load_ms=54 · frames=4952

node src/run.js --export-leaderboard out-lb.json
```

Committed artifacts at repo root: `bench.json`, `soak.json`.

## Self-run bench.json (reference — instructor machine is authoritative)

| Field | Value |
|---|---|
| avg_fps | 165 (≥ 60) |
| p1_low_fps | 158.2 (≥ 30) |
| load_ms | 54 (≤ 10000) |
| frames | 4952 |
| vsync_off | true |
| entities | 200 shades, 100 motes |

## Accessibility checklist

- [x] Key rebinding + conflict warning + restore defaults
- [x] Captions/indicators: shade spawn, wind warn, last 10s, fuel < 30 (+ edge arrow)
- [x] Reduce motion (camera shake + vignette flash off)
- [x] UI font ≥ 18px; large text ×1.25

## Release notes

- Tag: `phase-4`
- GitHub Release `v1.0.0`: zip `dist/` (static web) — `npm run build`
- Demo video: record manually → `docs/demo/demo.mp4` (< 5 min)
- Retro: `docs/retro/phase-4-retro.md`

## Limitations

- `peak_mem_mb` = JS heap on web (noted in JSON); full RSS null on pure browser.
- Demo `.mp4` not auto-generated.
- Screenshot placeholder SVG until you capture a real frame.
