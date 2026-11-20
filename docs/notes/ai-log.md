# Nhật ký sử dụng AI — Day 12

## Session 14 — Kiểm tra & hoàn thiện Phase 3 (TICKET-03 "Đèn cạn dầu" + Test Contract v1.2)

| Mục | Nội dung |
|---|---|
| Thời điểm | 2026-11-20 |
| Công cụ | Antigravity Agent |
| Mục tiêu | Audit toàn diện Phase 3 theo TICKET-03 & Contract v1.2, sửa các edge-case/thiếu sót còn lại, chạy lại test + production build và hoàn tất DoD |
| Phát hiện & sửa | 1) **Bug `safeZones.js`**: Shade đang ở trạng thái `drain` khi đèn được châm dầu lên `>= 30` bị `inSafePush = true` nhưng giữ nguyên `state = 'drain'` nên vẫn hút 5 fuel/s ở step 2 tick kế tiếp → sửa chuyển ngay sang `wander` + xóa `targetLanternId` khi bị đẩy ra vùng an toàn; bổ sung unit test xác minh. 2) **Colorblind mode (`styles.css` + `hud.js`)**: đồng hồ khẩn cấp `<= 30s` và cảnh báo gió chưa đổi sang `#FFFFFF` + biểu tượng `⚠` khi bật "Bảng màu dễ phân biệt" → đã bổ sung đầy đủ. 3) **View (`scene.js`)**: số đom đóm bay quanh Mây mới tạo sẵn 10 hạt thay vì `capacity_max = 20` → đã nâng lên 20. 4) **Docs**: cập nhật `docs/notes/ai-log.md` và `docs/phase-3-evidence.md` theo đúng DoD của `AGENTS.md` |
| Kết quả chạy thật | `npm test`: **82/82 PASS** (28 suites). `npm run build`: PASS |
| Bằng chứng | `docs/adr/ADR-003-lantern-fuel-and-dawn.md`, `CHANGELOG.md`, `docs/phase-3-evidence.md`, `docs/proof/phase-3/*` |

## Session 12 — Hoàn thành Phase 2 (TICKET-02 "Ba hòn đảo" + Test Contract v1.1)

| Mục | Nội dung |
|---|---|
| Thời điểm | 2026-11-20 |
| Công cụ & Skills | Antigravity Agent + `browser` subagent (smoke test). Không có `.cursor/skills` hay `.agents/skills` trong workspace nên không tuyên bố dùng skill bên ngoài |
| Mục tiêu | Chuẩn hóa gameplay Phase 1, xây 3 bản đồ (Đảo Bến, Đảo Cau, Đảo Chuông), triển khai Dash, Jump Pads, Cầu tre, Multi-level collision, Gió Lạc, Bùa Gió, Gió mạnh, Pause, Contract v1.1, nâng cấp 3D/HUD/Menu/WebAudio và chạy toàn bộ test + benchmark |
| Quyết định quan trọng | Dùng `src/shared/levels.js` làm single source of truth cho cả `src/sim/terrain.js` và `src/view/scene.js`; lưu timer bằng số tick nguyên để tránh sai số dấu phẩy động; giữ bảng màu bắt buộc Phase 2 và công thức ánh sáng môi trường `0.15 + 0.55 × (lit/total)`; dùng Web Audio API tổng hợp nhạc nền + SFX không phụ thuộc asset bản quyền |
| Lỗi phát hiện & sửa | 1) Safe zone clamp sát biên `6.0` khiến test `d > 6` fail → sửa clamp `safeR + 0.05`. 2) 3 Shade tiến gần dễ chồng lên nhau → tăng trọng số separation deterministic. 3) Browser smoke test phát hiện `Uncaught (in promise) WrongDocumentError` từ `requestPointerLock()` trong webview nhúng → bọc `Promise.resolve(...).catch(() => {})` |
| Kết quả chạy thật | `npm test`: **63/63 PASS** (25 suites, 1.52s). `npm run build`: PASS (911ms). Benchmark 21.600 tick Đêm 3: **117 ms** (≤ 30.000 ms). Browser smoke test 1280×720: Main Menu + Đêm 1/2/3 + Pause đều tải và hiển thị đúng |
| Bằng chứng | `docs/proof/phase-2/test_run.log`, `benchmark.log`, `bench_night3_21600.jsonl`, `night2_drifter.jsonl`, `night2_charm_dash.jsonl`, `gameplay_night3_1280x720.png` |
| Giới hạn còn lại | `webview_browser` không hỗ trợ `page.evaluate` nên chưa đo được con số FPS trung bình bằng JS trong trình duyệt (đã báo rõ NOT VERIFIED cho chỉ số FPS số học; game chạy mượt trực quan ở 1280×720) |

## Session 1 — Phân tích & lập kế hoạch Phase 1

| Mục | Nội dung |
|---|---|
| Thời điểm | 2026-11-20 (Phase 1 planning) |
| Công cụ | Cursor Agent (Auto / Composer) |
| Mục tiêu | Đọc PRD-0 + Test Contract; phân tích; kiến trúc headless; checklist; chưa code |
| Đã làm | Quét repo lab; thiếu PRD ban đầu → dừng (không bịa). Sau khi user dán PRD-0 + Contract: lưu `docs/prd/*`, viết assumptions, plan |
| Output | `docs/prd/PRD-0.md`, `TEST_CONTRACT_v1.0.md`, `docs/notes/phase-1-assumptions.md`, `phase-1-plan.md`, `ai-log.md` |
| Kiểm chứng thực tế | Chưa chạy test game (chưa có code). Đã xác nhận repo chỉ có tài liệu lab trước khi có PRD |
| Token/chi phí ước tính | ~1 phiên phân tích + ghi docs (ước lượng thấp–trung bình). Tiết kiệm: không code sớm; không bịa PRD khi thiếu tài liệu |
| Lỗi AI phát hiện | Lần đầu thiếu PRD — agent đúng khi dừng thay vì bịa yêu cầu |
| Việc chờ user | Duyệt assumptions (số tuning) + plan trước khi scaffold code |

## Session 13 — Fix A/D đảo hướng

| Mục | Nội dung |
|---|---|
| Bug | A sang phải, D sang trái (camera Three.js lookAt đảo trục strafe) |
| Fix | Đảo map A/D trong `src/view/input.js` (chỉ view; headless giữ nguyên) |

## Session 12 — Thêm đom đóm + shade đuổi từ xa

| Mục | Nội dung |
|---|---|
| Đom đóm | initial 20→40, max 30→55, interval 240→120t; thêm spawn points Đêm 1/2 |
| Shade | detect 12→35m, leash 18→55m, first spawn 300→120t |
| Lý do | Play feel: ít đom đóm; phải lại gần mới bị đuổi |

## Session 11 — Shade flank / không đi chồng

| Mục | Nội dung |
|---|---|
| Bug | 3 Bóng Mực chạy cùng hướng, chồng lên nhau |
| Fix | Mỗi con 1 góc bao vây (flankIndex); separation; spawn lệch 120° |
| Test | Unit surround + `npm test` hồi quy |

## Session 10 — Fix Q trừ máu

| Mục | Nội dung |
|---|---|
| Bug | Q/`pulse_cost` trừ `flames` → người chơi thấy mất mạng |
| Fix | Q trừ `carried` (đom đóm mang); không đổi `flames` |
| Test | `npm test` 42 pass |

## Session 9 — Fix shade đứng yên

| Mục | Nội dung |
|---|---|
| Bug | Khi đường thẳng tới player cắt `safe_radius`, shade `continue` → đứng im |
| Fix | Eject nếu đang trong vùng sáng; slide/orbit quanh đèn lit thay vì dừng |
| Test | Thêm unit orbit; `npm run test:shades` + `npm test` hồi quy |

## Session 8 — Hoàn tất Phase 1 (win/lose + view + README)

| Mục | Nội dung |
|---|---|
| Thời điểm | 2026-11-20 |
| Công cụ | Cursor Agent |
| Mục tiêu | Win/lose/dawn, spawn play, Three.js+HUD+restart, README/CREDITS/LICENSE |
| Thay đổi | `winlose.js`, `spawn.js`, `rng.js`, `src/view/*`, `README.md`, `LICENSE`, `CREDITS.md` |
| Chạy thật | `npm test` **41 pass / 0 fail**; `npm run build` OK; proof win/lose/dawn |
| Proof | `docs/proof/phase-1/STEP7_COMPLETE_PROOF.md`, `step7_*.jsonl` |
| Chưa làm | Tag `phase-1` (chờ user); video; chơi tay xác nhận UI |
| Token | Một phiên đóng Phase 1; không fake proof |

## Session 7 — Pulse

| Mục | Nội dung |
|---|---|
| Thời điểm | 2026-11-20 |
| Công cụ | Cursor Agent |
| Mục tiêu | Pulse edge, cost, stun/push, cooldown, event `pulse` |
| Thay đổi | `systems/pulse.js`, `step.js` |
| Chạy thật | `npm run test:pulse` 4 pass; `npm test` **37 pass / 0 fail** |
| Proof | `docs/proof/phase-1/step6_pulse.jsonl`, `STEP6_PULSE_PROOF.md` |

## Session 6 — Shades + combat

| Mục | Nội dung |
|---|---|
| Thời điểm | 2026-11-20 |
| Công cụ | Cursor Agent |
| Mục tiêu | Shade chase, safe_radius, player_hit (shade/fall), invuln, hit_drop_ratio |
| Thay đổi | `systems/shades.js`, `systems/combat.js`, `step.js`, stubWorld player.invuln |
| Chạy thật | `npm run test:shades` 7 pass; `npm test` **33 pass / 0 fail** |
| Proof | `docs/proof/phase-1/step5_shades_hit.jsonl`, `STEP5_SHADES_PROOF.md` |
| AI sai? | Không |

## Session 5 — Deposit + lantern_lit

| Mục | Nội dung |
|---|---|
| Thời điểm | 2026-11-20 |
| Công cụ | Cursor Agent |
| Mục tiêu | Interact edge → deposit / lantern_lit; không điểm khi scenario prelit |
| Thay đổi | `systems/deposit.js`, `step.js` (prev input), scenarios + tests |
| Chạy thật | `npm run test:deposit` 6 pass; `npm test` **26 pass / 0 fail** |
| Proof | `docs/proof/phase-1/step4_deposit.jsonl`, `STEP4_DEPOSIT_PROOF.md` |
| AI sai? | Không |

## Session 4 — Pickup

| Mục | Nội dung |
|---|---|
| Thời điểm | 2026-11-20 |
| Công cụ | Cursor Agent |
| Mục tiêu | Nhặt đom đóm trong `pickup_radius`, event `mote_picked`, `carry_capacity`, điểm `per_mote` |
| Thay đổi | `src/sim/systems/pickup.js`, `step.js` (move→pickup), scenarios + tests |
| Chạy thật | `npm run test:pickup` 6 pass; `npm test` **20 pass / 0 fail**; headless exit 0 |
| Proof | `docs/proof/phase-1/step3_pickup.jsonl`, `STEP3_PICKUP_PROOF.md` |
| Token | Thấp; chỉ pickup |
| AI sai? | Không |

## Session 3 — Bước 2: Movement

| Mục | Nội dung |
|---|---|
| Thời điểm | 2026-11-20 |
| Công cụ | Cursor Agent (Auto / Composer) |
| Mục tiêu | Di chuyển theo công thức Contract C; `player_speed` từ tuning; test T-move |
| Thay đổi chính | `src/sim/math.js` (worldMoveFromInput), `systems/movement.js`, `step.js` thật, `runHeadless` dùng `step`, `shared/constants.js`, tests move |
| Lệnh chạy thật | `npm run test:step2` → **8 pass**; `npm test` → **14 pass / 0 fail**; headless 60 ticks move [0,1] → z=6 |
| Proof | `docs/proof/phase-1/step2_move_forward.jsonl`, `STEP2_PROOF.md` |
| Token ước tính | Thấp–trung bình; chỉ làm movement, chưa pickup/UI |
| AI sai? | Không trong bước này |

## Session 2 — Bước 1: Scaffold + Contract + CLI stub

| Mục | Nội dung |
|---|---|
| Thời điểm | 2026-11-20 |
| Công cụ | Cursor Agent (Auto / Composer) |
| Mục tiêu | Scaffold Vite/Node, `game.contract.json`, CLI headless stub, tests bước 1; không gameplay/UI 3D |
| Thay đổi chính | `package.json`, `vite.config.js`, `index.html`, `src/shared/tuning.js`, `src/sim/stubWorld.js`, `src/headless/*`, `tests/contract/cli_stub.test.js`, `tests/unit/tuning.test.js`, fixtures |
| Lệnh chạy thật | `npm install` OK; `npm run test:step1` → **6 pass / 0 fail**; headless stub exit **0**; bad JSON inputs exit **2** |
| Proof | `docs/proof/phase-1/STEP1_PROOF.md`, `step1_stub.jsonl`, `step1_bad_json_stderr.txt` |
| Token/chi phí ước tính | 1 phiên scaffold vừa; tiết kiệm: stub-only, chưa Three.js scene |
| AI sai? | Không phát hiện trong bước này. PowerShell redirect stderr ồn — dùng spawn Node để ghi proof sạch |
| Chưa làm (đúng scope) | Movement, pickup, deposit, shades, pulse, win/lose gameplay, Three.js view |

## Session 13 — Phase 4 TICKET-04 v1.0.0 (Contract v1.3)

| Mục | Nội dung |
|---|---|
| Mục tiêu | Bench, soak, leaderboard, a11y, release docs, tag phase-4 |
| Chạy thật | `npm test` **87 pass**; build OK; soak crashes=0; bench avg_fps=165 |
| Artifacts | `bench.json`, `soak.json`, `docs/phase-4-evidence.md`, retro |
| AI sai? | FPS ảo khi `--disable-frame-rate-limit` → bỏ cờ đó |

## Session 12 — Phase 3 TICKET-03 "Đèn cạn dầu" (Contract v1.2)

| Mục | Nội dung |
|---|---|
| Mục tiêu | Fuel/relight/refuel, Shade drain, dawn win, capacity, scoring, view, tests, ADR, evidence |
| Thay đổi chính | `fuel.js`, deposit/shades/safeZones/winlose/pulse/pickup/step/stubWorld, tuning+contract v1.2, HUD/scene/settings, tests Phase 3 |
| Chạy thật | `npm test` → **81 pass / 0 fail**; `npm run build` OK; proof JSONL trong `docs/proof/phase-3/` |
| Docs | `ADR-003`, `CHANGELOG.md`, `docs/phase-3-evidence.md`, cập nhật README/AGENTS |
| AI sai? | Không — mọi assertion dựa trên output máy; không bịa screenshot |

## Mẫu ghi tiếp (mỗi lần dùng AI)

```text
### Session N — <mục tiêu>
- Model/tool:
- Thay đổi chính:
- Lệnh chạy thật + kết quả (exit code):
- Proof path:
- Token ước tính / cách tiết kiệm:
- AI sai? Cách phát hiện / chỉnh harness:
```
