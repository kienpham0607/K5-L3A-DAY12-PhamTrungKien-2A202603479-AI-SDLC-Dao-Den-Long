# Phase 1 — hoàn tất lõi + build (thật)

## Automated tests

```powershell
npm test
npm run build
```

- **`npm test`:** 41 pass / 0 fail  
- **`npm run build`:** OK → `dist/`

## Win / lose / dawn

```powershell
node src/headless/cli.js --seed 1 --night 1 --scenario tests/scenarios/win_all_lit.json --inputs tests/inputs/interact_pulse.json --ticks 10 --out docs/proof/phase-1/step7_win.jsonl
node src/headless/cli.js --seed 1 --night 1 --scenario tests/scenarios/lose_flames.json --ticks 10 --out docs/proof/phase-1/step7_lose.jsonl
node src/headless/cli.js --seed 1 --night 1 --scenario tests/scenarios/lose_dawn.json --ticks 120 --out docs/proof/phase-1/step7_dawn.jsonl
```

- win → `game_over` won/`all_lit` + `end.state=won`
- lose → `no_flames`
- dawn → `dawn` at ticks 60

## Play mode

```powershell
npm run dev
```

View Three.js: Đêm 1, HUD, chơi lại. (Chơi tay để xác nhận UI.)

## Tag

**Chưa gắn `phase-1`** — chờ user xác nhận chơi tay + yêu cầu tag.
