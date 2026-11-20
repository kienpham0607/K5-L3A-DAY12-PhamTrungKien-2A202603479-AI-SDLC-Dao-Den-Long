# Đảo Đèn Lồng

Game 3D cổ tích (Three.js) — VinUni Day 12 AI SDLC · **v1.0.0 / Phase 4** · MSSV `2A202603479` · Phạm Trung Kiên

![Screenshot placeholder](docs/demo/screenshot-placeholder.svg)

> Ảnh/GIF thật: chạy `npm run dev`, chụp màn hình và thay file trên (hoặc thêm `docs/demo/demo.gif`).

## Yêu cầu hệ thống

- Node.js ≥ 20
- GPU hỗ trợ WebGL (Chrome/Edge khuyến nghị)
- Windows / macOS / Linux
- Benchmark cần Chromium (Playwright tự cài lần đầu)

## Cài đặt (≤ 3 lệnh)

```powershell
npm install
npx playwright install chromium
npm run dev
```

Mở URL Vite (mặc định `http://localhost:5173`).

Build tĩnh:

```powershell
npm run build
npm run preview
```

Thư mục `dist/` là bản web chạy được (đính kèm Release).

## Điều khiển (mặc định — đổi được trong Cài đặt)

| Phím | Hành động |
|---|---|
| WASD | Di chuyển |
| Chuột | Xoay camera |
| Space | Nhảy |
| Shift | Lướt |
| E | Thắp / đổ dầu |
| Q | Tỏa sáng |
| Esc / P | Tạm dừng |

Accessibility: đổi phím, giảm chuyển động, chữ lớn ×1.25, bảng màu dễ phân biệt, phụ đề ⚠.

## Test / Headless / Bench / Soak

```powershell
npm test
node src/headless/cli.js --seed 1 --night 1 --ticks 60 --out out.jsonl --snapshot-every 10
node src/bench/cli.js --seed 42 --duration 30 --out bench.json
node src/soak/cli.js --seed 7 --nights 10 --out soak.json
node src/run.js --export-leaderboard out-lb.json
```

**Benchmark:** cửa sổ 1280×720, tắt vsync qua cờ Chromium (`--disable-gpu-vsync`, `--disable-frame-rate-limit`). Nếu GPU/driver vẫn ép vsync, ghi nhận trong `bench.json.vsync_off` và README này.

**Soak:** 10 đêm headless, random input theo seed; cần `crashes=0` và `mem_end_mb ≤ 1.2 × mem_start_mb`.

## Contract

`game.contract.json` · `contract_version: "1.3"`  
`run_cmd` / `bench_cmd` / `soak_cmd` / `headless_cmd` như trên.

## Tài liệu

- `CHANGELOG.md` · `CREDITS.md` · `LICENSE`
- Retro: `docs/retro/phase-4-retro.md`
- Evidence: `docs/phase-4-evidence.md`, `bench.json`, `soak.json`
- Demo video (nộp bài): `docs/demo/demo.mp4` (quay thủ công < 5 phút)
