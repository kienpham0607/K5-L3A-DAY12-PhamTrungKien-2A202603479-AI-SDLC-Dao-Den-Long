# Phase 1 — Kế hoạch triển khai (chờ duyệt)

**Trạng thái:** APPROVED — Bước 1 (scaffold + CLI stub) hoàn thành 2026-11-20.  
**Stack:** Node.js + Vite + Three.js; sim thuần JS chạy được trên Node.

---

## 1. Phân tích yêu cầu

### 1.1 Bắt buộc (phải có bằng chứng)

| ID | Yêu cầu | Kiểm chứng |
|---|---|---|
| M1 | Màn Đêm 1, đảo, 5 đèn | Scenario/snapshot có 5 lanterns L1–L5 |
| M2 | Di chuyển + yaw theo công thức contract | Scenario + inputs → player.pos đổi đúng hướng |
| M3 | Nhặt đom đóm trong pickup_radius | Event `mote_picked` |
| M4 | Interact deposit + thắp khi đủ lantern_cost | Event `deposit`, `lantern_lit` |
| M5 | Shade đuổi + chạm mất flames | Event `player_hit` |
| M6 | Pulse stun/push, tốn flames | Event `pulse` + flames giảm |
| M7 | Thắng all_lit / thua no_flames / dawn | Event `game_over` + `end.state` |
| M8 | Điểm theo score.* trong contract | Snapshot/end score khớp sự kiện |
| M9 | HUD + chơi lại (UI) | Ảnh/GIF + chơi tay (không chấm headless) |
| M10 | `game.contract.json` đúng schema + số khớp | File + test đọc tuning |
| M11 | Headless CLI đúng argv, exit codes | Test CLI |
| M12 | JSONL snapshot/event/end, round 3dp | Schema validator |
| M13 | Deterministic 2 lần chạy | Diff output |
| M14 | README ≤3 lệnh, điều khiển, điểm | Review thủ công |
| M15 | Tag `phase-1`, harness, notes, proof | Checklist nộp |

### 1.2 Mơ hồ (đã ghi giả định)

Tốc độ, bán kính, máu, điểm, kích thước đảo, spawn mặc định, hành vi rơi đảo, AI shade chi tiết, jump trong headless, số mote/shade play mode — xem `phase-1-assumptions.md`.

### 1.3 Ngoài phạm vi Phase 1

Phase 2–4 tickets; sáng tạo lớn trước khi lõi xanh; dash; đồ họa chân thực.

---

## 2. Kiến trúc (logic ⊥ rendering)

```text
                    ┌─────────────────────┐
  CLI / Browser ──► │  adapters (I/O)     │
                    └─────────┬───────────┘
                              │ commands / dt ticks
                    ┌─────────▼───────────┐
                    │  game/sim (pure)    │  ← không import three/dom
                    │  World, systems,    │
                    │  RNG(seed), events  │
                    └─────────┬───────────┘
                              │ GameState + Event[]
              ┌───────────────┴───────────────┐
              ▼                               ▼
     headless writer                    Three.js view
     (JSONL, no GPU)                    (mesh, HUD, audio)
```

**Nguyên tắc:**

1. `src/sim/**` chỉ phụ thuộc JS thuần; mỗi `step(input)` → state mới + events.
2. `src/headless/cli.js` parse argv, load scenario/inputs, loop ticks, ghi JSONL.
3. `src/view/**` đọc state để vẽ; không quyết định luật game.
4. Creative extras gated bởi `options.headless === false`.

**Mô hình tick (khớp contract):**

```text
buildWorld(scenario) → snapshot tick 0
for k in 0..N-1:
  input = resolve(frames, k)
  state, events = step(state, input)  # events.tick = k+1
  if (k+1) % snapshotEvery == 0: write snapshot
  write events
  if terminal: break
write end
```

---

## 3. Cấu trúc thư mục đề xuất

```text
README.md
LICENSE
CREDITS.md
AGENTS.md
game.contract.json
package.json
vite.config.js
src/
  sim/
    constants.js      # đọc/mirror tuning
    rng.js
    math.js           # xz dist, move basis từ yaw
    world.js          # create/default Night1
    systems/
      movement.js
      pickup.js
      deposit.js
      pulse.js
      shades.js
      combat.js
      winlose.js
      scoring.js
    step.js           # orchestrate 1 tick
    serialize.js      # snapshot + round3
  headless/
    cli.js
    parseArgs.js
    loadInputs.js
    loadScenario.js
    writeJsonl.js
  view/
    main.js           # Vite entry
    scene.js
    playerView.js
    hud.js
    input.js
  shared/
    contractTuning.js # single source → game.contract.json values
tests/
  unit/               # math, edge triggers, scoring
  contract/           # CLI exit codes, schema, determinism
  scenarios/          # *.json
  inputs/             # *.json
  expected/           # optional golden (sau khi chạy thật)
docs/
  prd/
  notes/              # assumptions, plan, ai-log, retro
  proof/phase-1/      # lệnh + output thật
```

---

## 4. Checklist triển khai Phase 1 (ưu tiên testable)

### P0 — Harness & contract skeleton

- [x] `package.json` scripts: `build`, `dev`, `headless`, `test`
- [x] `game.contract.json` với tuning khớp assumptions
- [x] `AGENTS.md` ngắn: lệnh, cấm bịa yêu cầu, cấm fake proof
- [x] CLI stub: parse argv, exit 2 nếu JSON lỗi, ghi end tối thiểu

### P1 — Sim core (headless trước UI)

- [x] World Night1 + apply scenario
- [x] Movement + yaw công thức
- [x] Pickup
- [x] Deposit / lantern_lit
- [x] Shades chase + safe_radius + hit + invuln + drop (+ fall)
- [x] Pulse cost/stun/push/cooldown
- [x] Win/lose/dawn + score
- [x] JSONL serialize round 3dp (đã có từ Bước 1; sẽ mở rộng event sau)

### P2 — Contract tests tự động

- [x] Scenario đứng yên: snapshots hợp lệ
- [x] Nhặt mote / deposit / lit
- [x] Pulse stun
- [x] Hit by shade
- [x] Win/lose/dawn
- [x] Determinism (2 runs identical)
- [x] Exit code 2 bad JSON

### P3 — View tối thiểu chơi được

- [x] Đảo + 5 đèn + mote + shade meshes đơn giản
- [x] Camera 3 nhân vật; WASD + chuột yaw + Space + E interact + Q pulse
- [x] HUD: flames, carried, score, time, lantern lit count
- [x] Màn thắng/thua + nút chơi lại

### P4 — Bàn giao

- [x] README (3 lệnh, điều khiển, điểm, sáng tạo)
- [x] Chạy proof thật → `docs/proof/phase-1/`
- [x] AI log + assumptions
- [ ] Tag `phase-1` (khi user yêu cầu)

---

## 5. Kế hoạch kiểm thử tự động

**Lệnh mục tiêu:** `npm test` (Node test runner hoặc vitest).

| Test | Cách xác minh theo Contract |
|---|---|
| T-cli-args | Chạy thiếu `--out` → exit ≠ 0 |
| T-bad-json | Scenario/inputs hỏng → exit 2 |
| T-snapshot0 | Có scenario → dòng snapshot tick 0 trước event gameplay |
| T-move | Inputs move [0,1] yaw0 → z tăng ≈ speed/60 mỗi tick |
| T-pickup | Mote trong radius → `mote_picked`, carried++ |
| T-deposit-lit | Đủ cost → `deposit` rồi `lantern_lit` |
| T-pulse | Shade trong radius → `pulse.stunned_ids` |
| T-hit | Shade overlap → `player_hit`, flames giảm |
| T-win | 5 đèn lit (scenario+play) → `game_over` won/all_lit + end |
| T-lose-flames | Hit tới 0 → lost/no_flames |
| T-dawn | ticks vượt duration → lost/dawn |
| T-determinism | 2 lần cùng seed/scenario/inputs → file giống hệt |
| T-tuning-sync | `game.contract.json`.tuning === constants dùng trong sim |

**Proof (không giả lập):** mỗi lần xanh, copy lệnh + stdout/exit + file `.jsonl` vào `docs/proof/phase-1/` kèm timestamp máy.

---

## 6. Bước nhỏ + tiêu chí hoàn thành (DoD)

| Bước | Việc | DoD |
|---|---|---|
| 0 | Duyệt plan + assumptions | User OK bằng văn bản — **DONE** |
| 1 | Scaffold npm/vite + AGENTS + contract.json | `npm install` OK; file tồn tại — **DONE** |
| 2 | CLI + empty sim loop + JSONL end | Chạy headless 10 ticks → exit 0, có end — **DONE (gộp trong Bước 1)** |
| 3 | Scenario apply + snapshot fields | Snapshot0 có player/lanterns/shades/motes_active |
| 4 | Movement | T-move xanh — **DONE** |
| 5 | Pickup | T-pickup xanh — **DONE** |
| 6 | Deposit + lit | T-deposit-lit xanh — **DONE** |
| 7 | Shades + hit | T-hit xanh — **DONE** |
| 8 | Pulse | T-pulse xanh — **DONE** |
| 9 | Win/lose/score | T-win, T-lose, T-dawn xanh — **DONE** |
| 10 | Determinism + exit 2 | T-determinism, T-bad-json xanh — **DONE** |
| 11 | Three.js playable + HUD + restart | Code xong; cần chơi tay xác nhận |
| 12 | README + proof thật + notes | **DONE** (proof automated) |
| 13 | Tag phase-1 | Chờ user |

**Quy tắc build:** xong bước N mới N+1; mỗi bước có test hoặc lệnh chạy thật trước khi sang UI nặng.

---

## 7. `game.contract.json` (dự kiến sau duyệt)

```json
{
  "contract_version": "1.0",
  "team": "2A202603479-PhamTrungKien",
  "build_cmd": "npm install && npm run build",
  "run_cmd": "npm run dev",
  "headless_cmd": "node src/headless/cli.js",
  "tuning": { "...": "theo phase-1-assumptions.md" }
}
```

(Giá trị số cụ thể chỉ ghi vào file thật sau khi duyệt assumptions.)

---

## 8. Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| Sai công thức yaw/move | Unit test vector θ=0 và θ=90 |
| Khai tuning ≠ sim | Test T-tuning-sync + single source |
| Event tick off-by-one | Fixture N=1 bước, assert tick event = 1 |
| UI ăn thời gian | UI sau khi P2 xanh |
| AI bịa thêm luật | AGENTS.md cấm; chỉ bám PRD + assumptions đã ghi |
