# AGENTS.md — Đảo Đèn Lồng (Phase 4 — v1.0.0 / Contract v1.3)

## Scope

- Phase 4: benchmark, soak, leaderboard, accessibility, release packaging.
- Giữ nguyên luật Phase 1–3 (fuel, dawn, 3 đảo). Headless output không đổi trừ contract mở rộng.
- Không giả mạo bench/soak/test.

## Commands (Windows PowerShell)

```powershell
npm install
npx playwright install chromium
npm run build
npm run dev
npm test
node src/headless/cli.js --seed 1 --night 1 --ticks 60 --out out.jsonl
node src/bench/cli.js --seed 42 --duration 30 --out bench.json
node src/soak/cli.js --seed 7 --nights 10 --out soak.json
node src/run.js --export-leaderboard out-lb.json
```

## Architecture

1. Sim thuần trong `src/sim/**` (không Three/DOM).
2. `benchMode` trên world: chỉ wander shades; tắt spawn/damage/pickup/fuel/win.
3. `src/shared/levels.js` + `tuning.js` khớp `game.contract.json` v1.3.
4. Leaderboard: localStorage + file `leaderboard.json` / `~/.dao-den-long/` qua Vite middleware.

## Definition of done

- `npm test` 100% pass · `npm run build` OK
- `bench.json` + `soak.json` tự chạy, commit vào repo
- Tag `phase-4` + Release `v1.0.0` (đính `dist/`)
- Docs: README, CHANGELOG (4 phase), CREDITS, LICENSE, retro, evidence
