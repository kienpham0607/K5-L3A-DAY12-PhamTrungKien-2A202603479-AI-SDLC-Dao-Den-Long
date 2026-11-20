# Phase 1 — Giả định (PRD-0 chỗ mơ hồ)

> Chỉ ghi giả định cho chỗ PRD chưa quy định. Không thêm yêu cầu mới vào phần lõi. Số dưới đây sẽ điền vào `game.contract.json` và phải khớp sim.

## Map & spawn

| Mục | Giả định | Lý do |
|---|---|---|
| Hình dạng đảo | Đĩa tròn tâm (0,0,0), bán kính **40 m** | “đảo tròn”; đủ chỗ 5 đèn |
| Mặt đất | Y = 0 phẳng (không địa hình phức tạp) | Contract: mặt đất Y=0 |
| Spawn player | (0, 0, 0) | Contract bắt buộc |
| 5 đèn mặc định | L1…L5 đều trên vòng R≈25 m, góc đều 72° | Đủ xa spawn; id ổn định |
| Rơi khỏi đảo | `fall_enabled: true`; ra ngoài bán kính đảo → `player_hit` by `fall`, mất 1 flame + drop theo `hit_drop_ratio` | Contract có event/reason fall |
| `safe_radius` | **6 m** quanh mỗi đèn đang **lit** | “Bóng Mực sợ đèn” |

## Player / ánh sáng / điểm

| Mục | Giả định |
|---|---|
| `player_speed` | 6 m/s |
| `carry_capacity` | 5 đom đóm |
| `lantern_cost` | 3 (cần deposited ≥ 3 để lit) |
| `pickup_radius` | 1.2 m |
| `interact_radius` | 2.0 m |
| `pulse_cost` | 1 **đom đóm đang mang (`carried`)** — không trừ `flames`/máu |
| `pulse_radius` | 8 m |
| `pulse_stun_s` | 2.0 s |
| `pulse_push_m` | 4 m |
| `pulse_cooldown_s` | 1.0 s |
| `flames` (máu) | 3 |
| `invuln_s` | 1.0 s sau hit |
| `hit_drop_ratio` | 0.5 (làm tròn xuống số đom đóm rơi) |
| Jump | Chỉ visual/physics chơi tay; headless: nhảy không đổi XZ logic Phase 1 (giữ Y chân = 0 trong snapshot trừ khi cần) — **giả định**: sim giữ `pos.y = 0` cho player chân; jump là input hợp lệ nhưng không ảnh hưởng headless XZ |
| `night1_duration_s` | 300 |
| Thua khi | `flames ≤ 0` → `game_over` reason `no_flames`; hết giờ `time_left_s ≤ 0` → reason `dawn` |
| Thắng khi | cả 5 đèn `lit` → reason `all_lit` |
| Score | `per_mote: 10`, `per_lantern: 200`, `per_stun: 5`, `per_second_left: 1`, `per_flame_left: 50` — cộng khi event xảy ra; bonus time/flame chỉ lúc `game_over` won |

## Motes & Shades

| Mục | Giả định |
|---|---|
| Mote mặc định (play mode) | 20 đom đóm random trên đảo (tránh spawn trong safe của đèn lit / trùng player) |
| Headless `random_motes: false` | Chỉ list trong scenario |
| Shade mặc định (play) | 3 Bóng Mực spawn theo thời gian hoặc sẵn; **headless** chỉ theo scenario khi `random_shades: false` |
| `shade_speed` | 3.5 m/s |
| `shade_hit_radius` | 1.0 m |
| AI chase | Di chuyển thẳng tới player trên XZ mỗi tick; không vào trong `safe_radius` của đèn lit |
| States tối thiểu | `chase`, `stunned` (+ optional `avoid` khi gần đèn lit) |
| Pulse | Edge trigger; stun/push trong `pulse_radius`; tốn `pulse_cost` từ **carried** (không pulse nếu carried < cost); **không** trừ flames |
| Deposit | Interact edge khi trong `interact_radius` và carried > 0: chuyển min(carried, còn thiếu tới cost) vào đèn; khi deposited ≥ cost → lit + event `lantern_lit` |

## Headless / rendering

| Mục | Giả định |
|---|---|
| Stack | JavaScript + Three.js + Vite + Node (headless = Node, không WebGL) |
| Extra creative | Tắt khi headless (không đổi JSONL) |
| IDs | Lantern L1…L5; Shade S1…; mote id M1… nếu xuất hiện trong snapshot khuyến nghị |
| Làm tròn | Mọi tọa độ output: 3 chữ số thập phân |
| Determinism | RNG seeded bởi `--seed`; không Date.now / Math.random thuần |

## Chưa giả định / để mở (không bịa thêm luật)

- Dash: contract nhắc “nếu có” → Phase 1 **không** có dash.
- Nhiều loại shade/mote: Phase 1 chỉ 1 loại mỗi bên (sáng tạo sau nếu còn thời gian).
- Âm thanh: tùy chọn sau lõi xanh.
