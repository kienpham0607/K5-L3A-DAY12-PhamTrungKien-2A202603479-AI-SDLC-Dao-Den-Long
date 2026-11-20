# AGENTS.md — Đảo Đèn Lồng (Phase 3 — TICKET-03 "Đèn cạn dầu")

## Scope

- **Phase 3 (TICKET-03 + Test Contract v1.2)** xây trên Phase 1–2 (`docs/prd/PRD-0.md`, `docs/adr/ADR-003-lantern-fuel-and-dawn.md`).
- 3 đêm dùng chung engine; đèn có nhiên liệu, Bóng Mực hút dầu, thắng bằng sống đến bình minh (≥60% đèn sáng).
- Không giả mạo test, benchmark hay bằng chứng.

## Stack

- JavaScript (ES Modules) + Vite + Three.js (view) + Web Audio API
- Sim thuần JS trong `src/sim/**` (KHÔNG import `three` / DOM / Canvas)
- Headless CLI: `node src/headless/cli.js --seed <int> --night <1|2|3> ...`

## Commands (Windows PowerShell)

```powershell
npm install
npm run build
npm run dev
npm test
node src/headless/cli.js --seed 1 --night 1 --ticks 60 --out out.jsonl --snapshot-every 10
node src/headless/cli.js --seed 1 --night 1 --scenario tests/scenarios/p3_dawn_win.json --ticks 90 --out dawn.jsonl
node src/headless/cli.js --seed 123 --night 3 --ticks 21600 --out bench_n3.jsonl --snapshot-every 600
```

## Architecture rules

1. Luật chơi / AI nằm trong `src/sim/**`.
2. `src/shared/levels.js` là single source of truth cho sim + view.
3. `src/shared/tuning.js` khớp `game.contract.json` (`contract_version: "1.2"`).
4. Fixed timestep 60 Hz; fuel decay + shade drain ở step 2; win/lose ở step 11.
5. Determinism: không `Math.random()` trong `src/sim/**` — chỉ seeded PRNG.
6. Pause: `tick` tăng, `sim_tick` và timer gameplay dừng.
7. Fuel nội bộ integer (`fuelUnits = display * 60`); snapshot làm tròn 1 chữ số thập phân.

## Definition of done

- `npm test` pass 100% (Phase 1–3 + determinism + benchmark ≤ 30s / 21.600 tick).
- `npm run build` thành công.
- Bằng chứng tại `docs/proof/phase-3/` và `docs/phase-3-evidence.md`.
- Cập nhật `docs/notes/ai-log.md`, `README.md`, `CHANGELOG.md`.
