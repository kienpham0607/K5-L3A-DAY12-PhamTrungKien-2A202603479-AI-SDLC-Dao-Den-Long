# Phase 2 Specification & Acceptance Criteria — TICKET-02 "Ba hòn đảo"

> Ghi chú xác minh tài liệu: Workspace chỉ có `docs/prd/PRD-0.md` và `docs/prd/TEST_CONTRACT_v1.0.md` (không có file gốc `TICKET-02.md` hoặc `TEST_CONTRACT_v1.1.md`). Toàn bộ thông số chuẩn bên dưới được triển khai theo đặc tả chi tiết trong Master Prompt Phase 2 và kiểm chứng bằng test tự động.

## 1. Chuẩn hóa Gameplay (60 Hz, mét, giây, trục Y lên)

| Hạng mục | Acceptance Criteria | Kiểm chứng |
|---|---|---|
| Mây: di chuyển, nhảy, lướt | 6 m/s, gia tốc/dừng ≤ 0.1s, nhảy `vy=7`, `g=-20` chỉ khi chạm đất; Dash `14 m/s` trong `0.2s`, hồi chiêu `1.5s`, giữ Y trên không, không bất tử | `tests/unit/phase2_systems.test.js`, `tests/contract/phase2_contract_v11.test.js` |
| Đom đóm | Sức chứa 10, ban đầu **40**, tối đa **55**, sinh +1 mỗi **120** tick; nhặt XZ ≤ 1m & `\|Δy\| ≤ 1.5m` | `tests/unit/pickup.test.js`, `tests/unit/phase2_systems.test.js` |
| Đèn lồng & Vùng an toàn | 10 đom đóm/đèn, nạp nhiều lần, bán kính 2m, hòa ID nhỏ hơn; đèn sáng tạo vùng an toàn 6m, đẩy Shade bên trong ra trong ≤ 30 tick và không gây sát thương khi đẩy | `tests/unit/deposit.test.js`, `tests/unit/phase2_systems.test.js` |
| Tỏa Sáng (Pulse) | Tốn 3 đom đóm, bán kính 3D 5m từ `foot.y + 0.8m`, hồi chiêu 3s; choáng Shade 120 tick + đẩy 4m trong 15 tick đầu; tương tác Drifter chase/flee | `tests/unit/pulse.test.js`, `tests/contract/pulse.test.js` |
| Bóng Mực (Shades) | 4 m/s (Đêm 3: 4.5 m/s), phát hiện **35m**, bỏ đuổi **55m** (đuổi từ xa), chạm XZ ≤ 1m & `\|Δy\| ≤ 1.5m`, recoil 2m/60t; 2 con ở tick **120** | `tests/unit/shades_combat.test.js`, `tests/unit/phase2_systems.test.js` |
| Bị đánh & Rơi đảo | Bị đánh: -1 lửa, rơi `floor(carried/2)` vành 1.5–2.5m (TTL 480t, nhặt tick kế), bất tử 90t. Rơi `Y < -10`: xử lý 1 lần, -1 lửa (bỏ qua bất tử), mất hết đom đóm (`lost`), hồi sinh 60t + bất tử 90t | `tests/contract/hit.test.js`, `tests/unit/phase2_systems.test.js` |
| Điểm & Thứ tự thắng/thua | +10/đom đóm nạp, +100/đèn, +5/stun, thắng `+floor(time_left)*2 + 50*flames`. Ưu tiên: `no_flames` > `all_lit` > `dawn` | `tests/contract/winlose.test.js`, `tests/unit/deposit.test.js` |

## 2. Bản đồ 3 Đêm (`src/shared/levels.js` + `src/sim/terrain.js`)

- **Đêm 1 — Đảo Bến**: Đảo `r=40`, 5 đèn, 300s, tối đa 6 Shades (8s/lần).
- **Đêm 2 — Đảo Cau**: 2 đảo `r=28` tâm `(0,0)` & `(70,0)`, cầu tre `x=[26,44], z=[-2,2]`, 2 bục nhảy `(20,0,18)` & `(50,0,-18)` (`vy=14, vh=24`), 6 đèn, 330s, tối đa 8 Shades (7s/lần), Gió Lạc, Bùa Gió `C1 (35,0,0)`.
- **Đêm 3 — Đảo Chuông**: Đảo `r=45`, tầng 0 (`Y=0`), tầng 1 (`Y=3`, vành khăn `r=12..24, z>0`), tầng 2 (`Y=6`, đĩa `r=8`), 2 dốc 3m tại `30°` và `150°` (`r=30..24`), bục nhảy `(0,3,13)` (`vy=12, vh=8, -Z`), Tháp Chuông (`r=2, h=8`) không đi xuyên, 7 đèn, 360s, tối đa 10 Shades (`4.5 m/s`, 6s/lần), 2 Bùa Gió, Gió mạnh mỗi 30s (cảnh báo 2s, thổi 5s, đẩy 2 m/s).

## 3. Gameplay mới & Contract v1.1

- **Gió Lạc (Drifter)**: Đêm 2 & 3, tối đa 2 con, spawn tick 1200/2400..., chase 7 m/s khi `carried ≥ 5` & `dist ≤ 15m`, cướp tối đa 3 đom đóm tại `≤ 1.2m` (xuyên vùng an toàn & bất tử, không trừ lửa), flee 240t → removed; Pulse khi chase → flee; Pulse khi flee → thả hết + flee 120t.
- **Bùa Gió (Wind Charm)**: Hiệu lực 600t, tốc độ 7.2 m/s, Dash 0s hồi chiêu (không cắt ngang Dash đang chạy), hồi sinh 2700t.
- **Pause / Resume**: `tick` tăng, `sim_tick` và toàn bộ timer dừng; phát `paused` / `resumed`.
- **Contract v1.1**: `game.contract.json` `contract_version = "1.1"`, `--night 1|2|3`, đầy đủ snapshot/event v1.1, deterministic, benchmark 21.600 tick ≤ 30s (đo thực tế: ~117 ms).
