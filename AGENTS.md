# AGENTS.md — Đảo Đèn Lồng (Phase 2 — TICKET-02 "Ba hòn đảo")

## Scope

- **Phase 2 (TICKET-02 + Test Contract v1.1)** xây dựng trên nền Phase 1 (`docs/prd/PRD-0.md`, `docs/prd/TEST_CONTRACT_v1.0.md`, `docs/notes/phase-2-spec.md`).
- 3 màn chơi: **Đêm 1 (Đảo Bến)**, **Đêm 2 (Đảo Cau)**, **Đêm 3 (Đảo Chuông)** dùng chung một engine mô phỏng và một nguồn định nghĩa bản đồ (`src/shared/levels.js`).
- Không giả mạo test, benchmark hay bằng chứng.

## Stack

- JavaScript (ES Modules) + Vite + Three.js (view) + Web Audio API (SFX/nhạc nền tự tạo)
- Sim thuần JS trong `src/sim/**` (KHÔNG import `three` / DOM / Canvas)
- Headless CLI: `node src/headless/cli.js --seed <int> --night <1|2|3> ...`

## Commands (Windows PowerShell)

```powershell
npm install
npm run build
npm run dev
npm test
node src/headless/cli.js --seed 1 --night 1 --ticks 60 --out out.jsonl --snapshot-every 10
node src/headless/cli.js --seed 1 --night 2 --scenario tests/scenarios/p2_night2_drifter_steal.json --ticks 30 --out out_n2.jsonl
node src/headless/cli.js --seed 123 --night 3 --ticks 21600 --out bench_n3.jsonl --snapshot-every 600
```

## Architecture rules

1. Toàn bộ luật chơi, vật lý, va chạm địa hình, AI nằm trong `src/sim/**`.
2. `src/shared/levels.js` là **single source of truth** cho cả simulation (`src/sim/terrain.js`) và Three.js rendering (`src/view/scene.js`).
3. `src/shared/tuning.js` phải khớp `game.contract.json` (`contract_version: "1.1"`), được kiểm chứng tự động bởi `tests/unit/tuning.test.js`.
4. Fixed timestep 60 Hz; tuân thủ đúng thứ tự 12 bước mỗi tick trong `src/sim/step.js`.
5. Determinism tuyệt đối: không dùng `Math.random()` trong `src/sim/**`, chỉ dùng seeded PRNG (`src/sim/rng.js`).
6. Khi Pause: `tick` tiếp tục tăng, `sim_tick` và mọi timer gameplay dừng.

## Definition of done

- `npm test` pass 100% (bao gồm regression Phase 1, unit + contract Phase 2, determinism và benchmark ≤ 30s cho 21.600 tick).
- `npm run build` thành công không lỗi.
- Bằng chứng thực tế do máy tạo lưu tại `docs/proof/phase-2/`.
- Cập nhật `docs/notes/ai-log.md` và `README.md`.
