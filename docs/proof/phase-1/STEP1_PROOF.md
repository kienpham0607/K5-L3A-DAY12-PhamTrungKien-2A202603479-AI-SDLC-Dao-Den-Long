# Phase 1 — Bước 1 proof (thật)

Máy: Windows / Node v24.12.0  
Thời điểm: 2026-11-20

## Lệnh 1 — headless stub OK

```powershell
node src/headless/cli.js --seed 1 --night 1 --scenario tests/scenarios/minimal.json --inputs tests/inputs/idle.json --ticks 20 --out docs/proof/phase-1/step1_stub.jsonl --snapshot-every 10
```

- **Exit code:** `0`
- **Output:** `docs/proof/phase-1/step1_stub.jsonl`
- Quan sát: snapshot tick 0/10/20 + `end` ticks=20 state=playing; player đứng yên (stub chưa có movement).

## Lệnh 2 — JSON inputs sai → exit 2

```powershell
node src/headless/cli.js --seed 1 --night 1 --inputs tests/fixtures/not_json.txt --ticks 5 --out docs/proof/phase-1/should_fail.jsonl
```

- **Exit code:** `2`
- stderr chứa dung: `Invalid JSON in inputs: ...`

## Lệnh 3 — automated tests

```powershell
npm run test:step1
```

- Kết quả: **6 pass / 0 fail** (xem session log).
