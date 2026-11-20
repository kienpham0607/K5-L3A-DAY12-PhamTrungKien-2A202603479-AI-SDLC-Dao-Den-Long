#!/usr/bin/env node
/**
 * Phase 4 benchmark CLI (Contract v1.3).
 * Usage: node src/bench/cli.js --seed 42 --duration 30 --out bench.json
 */
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { platform, release } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function parseArgs(argv) {
  const out = { seed: 42, duration: 30, out: 'bench.json', warmup: 3, port: 5179 };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--seed') out.seed = Number(argv[++i]);
    else if (a === '--duration') out.duration = Number(argv[++i]);
    else if (a === '--out') out.out = argv[++i];
    else if (a === '--warmup') out.warmup = Number(argv[++i]);
    else if (a === '--port') out.port = Number(argv[++i]);
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

async function waitForUrl(url, timeoutMs = 60000) {
  const start = Date.now();
  let lastErr;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status > 0) return;
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server not ready at ${url}: ${lastErr?.message || lastErr}`);
}

function startViteDev(port) {
  const child = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['vite', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], shell: true },
  );
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  return child;
}

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    throw new Error('playwright missing — run: npm install && npx playwright install chromium');
  }
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    process.stdout.write('Usage: node src/bench/cli.js --seed 42 --duration 30 --out bench.json\n');
    process.exitCode = 0;
    return;
  }

  const vite = startViteDev(opts.port);
  const base = `http://127.0.0.1:${opts.port}`;
  try {
    await waitForUrl(`${base}/bench.html`);
    const { chromium } = await loadPlaywright();

    // Window 1280×720 (not fullscreen). Disable GPU vsync when driver allows.
    // Do NOT use --disable-frame-rate-limit: it uncapped rAF and fake 1000+ FPS.
    const browser = await chromium.launch({
      headless: false,
      args: [
        '--disable-gpu-vsync',
        '--autoplay-policy=no-user-gesture-required',
        '--window-size=1280,720',
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const url = `${base}/bench.html?seed=${opts.seed}&duration=${opts.duration}&warmup=${opts.warmup}`;
    const timeoutMs = (opts.warmup + opts.duration + 60) * 1000;

    page.on('pageerror', (err) => process.stderr.write(`[pageerror] ${err.message}\n`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') process.stderr.write(`[console.error] ${msg.text()}\n`);
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(
      () => window.__BENCH_DONE__ === true,
      null,
      { timeout: timeoutMs },
    );
    const errMsg = await page.evaluate(() => window.__BENCH_ERROR__);
    const result = await page.evaluate(() => window.__BENCH_RESULT__);
    if (!result) {
      throw new Error(`Benchmark finished without result: ${errMsg || 'unknown'}`);
    }

    result.os = `${platform()} ${release()}`;
    result.vsync_off = true;
    if (!result.renderer) result.renderer = 'Three.js WebGL via Chromium/Playwright';

    writeFileSync(opts.out, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    process.stdout.write(`Benchmark written → ${opts.out}\n`);
    process.stdout.write(`avg_fps=${result.avg_fps} p1_low=${result.p1_low_fps} load_ms=${result.load_ms}\n`);

    await browser.close();
    process.exitCode = 0;
  } catch (err) {
    process.stderr.write(`${err?.stack || err}\n`);
    process.exitCode = 1;
  } finally {
    try { vite.kill(); } catch { /* ignore */ }
  }
}

main();
