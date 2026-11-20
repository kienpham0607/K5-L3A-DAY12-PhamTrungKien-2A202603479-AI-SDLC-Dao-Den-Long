# Phase 2 Proof Summary — TICKET-02 "Ba hòn đảo" & Contract v1.1

## 1. Automated Test Suite (`npm test`)
- Command: `npm test` (`node --test tests/contract/*.test.js tests/unit/*.test.js`)
- Result: **63 / 63 PASS**, 0 FAIL (25 suites, 1.60s)
- Full log: `docs/proof/phase-2/test_run.log`

## 2. Headless Benchmark (21,600 ticks — Night 3)
- Command: `node src/headless/cli.js --seed 123 --night 3 --ticks 21600 --out docs/proof/phase-2/bench_night3_21600.jsonl --snapshot-every 600`
- Measured wall-clock time: **117 ms** (requirement: ≤ 30,000 ms)
- Artifact: `docs/proof/phase-2/bench_night3_21600.jsonl`

## 3. Feature Headless Proofs
- Night 2 Drifter steal: `docs/proof/phase-2/night2_drifter.jsonl`
- Night 2 Wind Charm + double Dash: `docs/proof/phase-2/night2_charm_dash.jsonl`

## 4. Production Build (`npm run build`)
- Vite v6.4.6 production build: **PASS** (29 modules, 911 ms)

## 5. Browser Smoke Test (1280×720)
- Verified on `http://localhost:4173/`: Main Menu, Night 1 (05:00, 0/5), Night 2 (05:30, 0/6, 2-island minimap), Night 3 (06:00, 0/7), Pause menu (`P`).
- Screenshot: `docs/proof/phase-2/gameplay_night3_1280x720.png`
- Note: Numeric `requestAnimationFrame` FPS could not be read via JS in `webview_browser` because `page.evaluate` is unsupported in that sandbox.
