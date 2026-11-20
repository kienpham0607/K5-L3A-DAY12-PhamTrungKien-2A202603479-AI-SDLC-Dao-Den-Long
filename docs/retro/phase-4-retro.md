# Retro — Phase 1→4 (Đảo Đèn Lồng)

**MSSV:** 2A202603479 · Phạm Trung Kiên · 1–2 trang

## Evaluation theo phase

| Phase | Kết quả chính | Điểm mạnh | Điểm yếu |
|---|---|---|---|
| 1 | Sim + headless + view cơ bản | Tách sim⊥view sớm | Ít feedback UX |
| 2 | 3 đảo, dash, drifter, wind | Levels SSOT | AI shade dễ “dồn đống” |
| 3 | Fuel, drain, dawn 60% | Contract v1.2 rõ | Cần balance fuel/drain |
| 4 | Bench/soak/a11y/leaderboard/release | Đo được + đóng gói | Demo video / GIF thủ công |

## Làm việc với AI — hiệu quả / không hiệu quả

**Hiệu quả:** yêu cầu theo ticket + DoD cụ thể; giữ `AGENTS.md` và contract làm nguồn sự thật; chạy `npm test` sau mỗi cụm thay đổi.

**Không hiệu quả:** prompt quá rộng không kèm số đo; để AI “đoán” PRD khi thiếu file.

## AI sai & cách phát hiện

1. Win `all_lit` còn sót sau Phase 3 → bắt bằng contract test + chơi scenario.
2. Shade chase trong bench → đọc ticket “wander bình thường”, thêm `benchMode`.
3. Heredoc commit trên PowerShell fail → dùng here-string PowerShell.

## Harness giúp nhiều nhất

- `AGENTS.md` (lệnh, kiến trúc, DoD)
- `game.contract.json` + `tests/unit/tuning.test.js`
- Headless CLI + JSONL proof trong `docs/proof/`

## Token / chi phí (ước tính)

- Phase 1–2: ~cao (khám phá kiến trúc)
- Phase 3–4: tiết kiệm hơn nhờ batch file + test trước, tránh hỏi giữa bước
- Tiết kiệm: dùng summary/ticket làm spec, không paste lại toàn bộ codebase mỗi lần

## Nếu làm lại

1. Scaffold bench/soak từ Phase 1.
2. Chốt schema snapshot sớm (tránh breaking nhiều lần).
3. Chuẩn bị sẵn kịch bản quay demo 3 phút.
