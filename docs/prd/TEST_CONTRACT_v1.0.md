# Test Contract v1.0

> Bắt buộc. Headless, không GPU, 60 tick/s cố định.

## A. `game.contract.json` (gốc repo)

Bắt buộc các khóa: `contract_version`, `team`, `build_cmd`, `run_cmd`, `headless_cmd`, `tuning` (đầy đủ các trường trong contract).

`lantern_count_night1` = 5. Các số khác phải khớp game thật; khái niệm không có → `null`/`false` + giải thích README.

## B. Tham số headless

```text
<headless_cmd> --seed <int> --night 1 [--scenario <file.json>] [--inputs <file.json>]
               --ticks <int> --out <file.jsonl> [--snapshot-every <int, mặc định 10>]
```

- 60 tick/s; dừng khi đủ ticks hoặc won/lost; exit 0
- Lỗi → exit ≠ 0, stderr; inputs/scenario sai format → exit 2
- Mét; Y lên; mặt đất Y=0; spawn (0,0,0)
- Snapshot tick 0 = sau scenario, trước input
- Bước k đọc input tick k → state k+1; event tick = k+1
- `time_left_s = duration − steps/60`
- Khoảng cách trên XZ giữa các điểm quy ước (player chân, shade tâm, lantern chân, mote điểm đất)

## C. Inputs

`frames[]` với `tick` tăng nghiêm ngặt. Default: move [0,0], yaw 0, buttons false. Giữ giá trị cũ nếu thiếu field. move chuẩn hóa nếu |v|>1. jump/interact/pulse edge false→true.

## D. Scenario

`random_motes`/`random_shades` false → chỉ dùng list. lanterns update theo id. Không phát event/điểm khi dựng scenario.

## E. Output JSONL

- `snapshot` mỗi snapshot-every từ tick 0
- `event`: mote_picked, deposit, lantern_lit, pulse, player_hit, shade_spawned, game_over
- `end` dòng cuối bắt buộc
- Tọa độ làm tròn 3 chữ số thập phân
- Deterministic: cùng seed+scenario+inputs → cùng output (kể cả id tự sinh)
