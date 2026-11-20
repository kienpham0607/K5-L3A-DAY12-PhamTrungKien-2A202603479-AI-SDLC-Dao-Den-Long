# Đảo Đèn Lồng

Game 3D phiêu lưu cổ tích (Three.js) — Lab Day 12 AI SDLC · **Phase 3 (TICKET-03 "Đèn cạn dầu")** · MSSV `2A202603479` · Phạm Trung Kiên

## Cài đặt & chạy (Windows PowerShell)

```powershell
npm install
npm run dev
```

Mở URL Vite (mặc định `http://localhost:5173`).

```powershell
npm run build
npm test
```

## Headless (Test Contract v1.2)

```powershell
node src/headless/cli.js --seed 1 --night 1 --ticks 60 --out out_n1.jsonl --snapshot-every 10
node src/headless/cli.js --seed 1 --night 1 --scenario tests/scenarios/p3_dawn_win.json --ticks 90 --out dawn_win.jsonl
node src/headless/cli.js --seed 1 --night 1 --scenario tests/scenarios/p3_shade_drain.json --ticks 120 --out drain.jsonl
node src/headless/cli.js --seed 123 --night 3 --ticks 21600 --out bench_n3.jsonl --snapshot-every 600
```

## 3 Hòn Đảo

1. **Đêm 1 · Đảo Bến** (240s · 5 đèn · cần ≥3 sáng tới bình minh).
2. **Đêm 2 · Đảo Cau** (270s · 6 đèn · ≥4) — cầu tre, Gió Lạc, Bùa Gió.
3. **Đêm 3 · Đảo Chuông** (300s · 7 đèn · ≥5) — 3 tầng, Tháp Chuông, gió mạnh.

Đèn **cạn dầu** (1 fuel/s). Thắp lần đầu cần 10 đom đóm; thắp lại 5; đổ dầu khi đang cháy. Bóng Mực hút dầu đèn yếu (<30). Vùng an toàn chỉ khi fuel ≥ 30.

## Điều khiển

| Phím | Hành động |
|---|---|
| `WASD` | Di chuyển |
| Chuột | Xoay camera (click khóa) |
| `Space` | Nhảy |
| `Shift` | Lướt |
| `E` | Thắp / thắp lại / đổ dầu |
| `Q` | Tỏa sáng (3 đom đóm) |
| `Esc` / `P` | Tạm dừng |

Cài đặt: **Bảng màu dễ phân biệt** (shade `#00B3FF`, cảnh báo trắng + ⚠).

## Điểm (v1.2)

- `+5` mỗi đom đóm nạp/đổ dầu
- `+100` thắp lần đầu · `+40` thắp lại
- `+5` Pulse thường · `+15` Pulse khi Shade đang/ vừa drain
- Thắng bình minh: mỗi đèn sáng `+50 + ⌊fuel⌋` · mỗi Ngọn Lửa `+50`
- Không cộng điểm theo thời gian còn lại

Sức chứa đom đóm: `min(20, 10 + 2 × số lần thắp thành công)`.

## Tài liệu

- `AGENTS.md` · `game.contract.json` (v1.2)
- ADR: `docs/adr/ADR-003-lantern-fuel-and-dawn.md`
- Evidence: `docs/phase-3-evidence.md` · `docs/proof/phase-3/`
- `CHANGELOG.md` · `docs/notes/ai-log.md`
