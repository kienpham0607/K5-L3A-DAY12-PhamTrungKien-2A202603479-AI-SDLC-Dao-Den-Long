# Đảo Đèn Lồng

Game 3D phiêu lưu cổ tích (Three.js) — Lab Day 12 AI SDLC · **Phase 2 (TICKET-02 "Ba hòn đảo")** · MSSV `2A202603479` · Phạm Trung Kiên

## Cài đặt & chạy (Windows PowerShell)

```powershell
npm install
npm run dev
```

Mở URL Vite hiển thị (mặc định `http://localhost:5173`).

Build production:

```powershell
npm run build
```

## Chạy Test & Headless (Test Contract v1.1)

```powershell
npm test
node src/headless/cli.js --seed 1 --night 1 --ticks 60 --out out_n1.jsonl --snapshot-every 10
node src/headless/cli.js --seed 1 --night 2 --scenario tests/scenarios/p2_night2_drifter_steal.json --ticks 30 --out out_n2.jsonl
node src/headless/cli.js --seed 123 --night 3 --ticks 21600 --out bench_n3.jsonl --snapshot-every 600
```

## 3 Hòn Đảo (3 Đêm)

1. **Đêm 1 · Đảo Bến** (300s · 5 Đèn Lồng Lớn): đảo tròn bán kính 40m.
2. **Đêm 2 · Đảo Cau** (330s · 6 Đèn Lồng Lớn): 2 đảo nối nhau bằng cầu tre không lan can + 2 bục nhảy gió + **Gió Lạc (Drifter)** + **Bùa Gió (Wind Charm)**.
3. **Đêm 3 · Đảo Chuông** (360s · 7 Đèn Lồng Lớn): đảo 3 tầng (Y=0/3/6) có 2 dốc lên, bục nhảy lên đỉnh, Tháp Chuông trung tâm và **Gió mạnh** theo chu kỳ 30 giây.

## Điều khiển

| Phím | Hành động |
|---|---|
| `WASD` / mũi tên | Di chuyển (6 m/s; 7.2 m/s khi có Bùa Gió) |
| Chuột (click khóa) | Xoay camera góc nhìn thứ ba |
| `Space` | Nhảy (chỉ khi chạm đất) |
| `Shift` | Lướt (Dash — 14 m/s trong 0.2s, hồi chiêu 1.5s; 0s khi có Bùa Gió) |
| `E` | Nạp đom đóm vào Đèn Lồng Lớn gần nhất (10 đom đóm/đèn) |
| `Q` | Tỏa sáng (Pulse — tốn 3 đom đóm, bán kính 5m, hồi chiêu 3s) |
| `Esc` / `P` | Tạm dừng (Pause / Resume) |

## Cách tính điểm (`game.contract.json` v1.1)

- `+10` mỗi đom đóm nạp vào đèn
- `+100` mỗi Đèn Lồng Lớn được thắp sáng
- `+5` mỗi Bóng Mực trúng Pulse
- Khi **thắng Đêm**: `+floor(thời gian còn lại) × 2 + 50 × số Ngọn Lửa còn lại`
- Tổng điểm là tổng điểm các Đêm đã thắng.

## Tài liệu & Bằng chứng

- Harness AI: `AGENTS.md`
- Contract v1.1: `game.contract.json`
- Đặc tả & Acceptance Criteria Phase 2: `docs/notes/phase-2-spec.md`
- Nhật ký AI: `docs/notes/ai-log.md`
- Bằng chứng Phase 2: `docs/proof/phase-2/`
