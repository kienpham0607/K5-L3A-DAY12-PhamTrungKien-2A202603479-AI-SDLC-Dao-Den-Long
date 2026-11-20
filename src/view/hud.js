import { TUNING } from '../shared/tuning.js';
import { TICK_HZ } from '../shared/constants.js';

function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export function createHud(initialSettings, callbacks) {
  const vignette = document.createElement('div');
  vignette.id = 'hud-vignette';
  document.body.appendChild(vignette);

  // Off-screen arrow
  const arrow = document.createElement('div');
  arrow.id = 'hud-arrow';
  arrow.innerHTML = `<div class="arrow-head"></div><div class="arrow-dist" id="hud-arrow-dist"></div>`;
  document.body.appendChild(arrow);

  // Playing HUD
  const hud = document.createElement('div');
  hud.id = 'hud';
  hud.className = 'hidden';
  hud.innerHTML = `
    <div class="hud-top">
      <div class="hud-panel hud-left">
        <span class="stat-label">Ngọn Lửa</span>
        <div class="flames-row" id="hud-flames"></div>
        <div class="charm-pill" id="hud-charm">✦ Bùa Gió · <span id="hud-charm-time">0s</span></div>
      </div>

      <div class="hud-panel hud-center">
        <div class="night-subtitle" id="hud-night-title">Đêm 1 · Đảo Bến</div>
        <div class="clock-display" id="hud-clock">05:00</div>
        <div class="wind-badge" id="hud-wind">Gió mạnh sắp tới!</div>
      </div>

      <div class="hud-right">
        <div class="hud-panel score-lantern-card">
          <div class="metric-block">
            <span class="stat-label">Đèn Lồng</span>
            <span class="metric-val" id="hud-lanterns">0/5</span>
          </div>
          <div class="metric-block">
            <span class="stat-label">Điểm</span>
            <span class="metric-val" id="hud-score">0</span>
          </div>
        </div>
        <div class="hud-panel radar-wrap">
          <canvas id="hud-radar" width="112" height="112"></canvas>
        </div>
      </div>
    </div>

    <div class="hud-mid">
      <div id="hud-toast"></div>
      <div id="hud-prompt"></div>
    </div>

    <div class="hud-bottom">
      <div class="hud-bottom-left">
        <div class="lock-hint" id="hud-lock-hint">Click để xoay chuột · Esc/P tạm dừng</div>
      </div>

      <div class="hud-panel mote-bar-panel">
        <span class="stat-label">Đom đóm (<span id="hud-carried-num">0</span>/10)</span>
        <div class="mote-slots" id="hud-motes"></div>
      </div>

      <div class="skills-row">
        <div class="hud-panel skill-card ready" id="hud-dash-card">
          <span class="skill-name"><kbd>Shift</kbd> Lướt</span>
          <span class="skill-status" id="hud-dash-status">Sẵn sàng</span>
        </div>
        <div class="hud-panel skill-card ready" id="hud-pulse-card">
          <span class="skill-name"><kbd>Q</kbd> Tỏa sáng</span>
          <span class="skill-status" id="hud-pulse-status">Cần 3 đom đóm</span>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(hud);

  // Main Menu Overlay
  const menuOverlay = document.createElement('div');
  menuOverlay.id = 'screen-menu';
  menuOverlay.className = 'screen-overlay';
  menuOverlay.innerHTML = `
    <div class="modal-card">
      <h1>Đảo Đèn Lồng</h1>
      <p class="modal-sub">
        Đồng hành cùng <strong>Mây</strong> qua 3 hòn đảo giữa biển mây đêm.<br/>
        Thu thập đom đóm, thắp sáng các Đèn Lồng Lớn và xua tan Bóng Mực trước bình minh.
      </p>
      <div class="btn-stack">
        <button type="button" class="btn btn-primary" id="btn-play-start">Bắt đầu hành trình (Đêm 1)</button>
        <div class="btn-row">
          <button type="button" class="btn" data-night="1">Đêm 1 · Đảo Bến</button>
          <button type="button" class="btn" data-night="2">Đêm 2 · Đảo Cau</button>
          <button type="button" class="btn" data-night="3">Đêm 3 · Đảo Chuông</button>
        </div>
        <button type="button" class="btn" id="btn-menu-settings">Cài đặt</button>
      </div>
    </div>
  `;
  document.body.appendChild(menuOverlay);

  // Night Intro Overlay
  const introOverlay = document.createElement('div');
  introOverlay.id = 'screen-intro';
  introOverlay.className = 'screen-overlay hidden';
  introOverlay.innerHTML = `
    <div class="modal-card">
      <h2 id="intro-title">Đêm 1 · Đảo Bến</h2>
      <p class="modal-sub" id="intro-desc"></p>
      <div class="stats-grid">
        <div class="stat-box">
          <span class="stat-box-label">Đèn cần thắp</span>
          <span class="stat-box-val" id="intro-lanterns">5</span>
        </div>
        <div class="stat-box">
          <span class="stat-box-label">Thời gian</span>
          <span class="stat-box-val" id="intro-time">05:00</span>
        </div>
        <div class="stat-box">
          <span class="stat-box-label">Tổng điểm</span>
          <span class="stat-box-val" id="intro-total">0</span>
        </div>
      </div>
      <div class="btn-row">
        <button type="button" class="btn btn-primary" id="btn-intro-go">Vào đảo</button>
        <button type="button" class="btn" id="btn-intro-menu">Menu chính</button>
      </div>
    </div>
  `;
  document.body.appendChild(introOverlay);

  // Pause Overlay
  const pauseOverlay = document.createElement('div');
  pauseOverlay.id = 'screen-pause';
  pauseOverlay.className = 'screen-overlay hidden';
  pauseOverlay.innerHTML = `
    <div class="modal-card">
      <h2>Tạm dừng</h2>
      <p class="modal-sub">Nhấn <kbd>Esc</kbd> hoặc <kbd>P</kbd> để tiếp tục.</p>
      <div class="btn-stack">
        <button type="button" class="btn btn-primary" id="btn-pause-resume">Tiếp tục</button>
        <button type="button" class="btn" id="btn-pause-restart">Chơi lại Đêm hiện tại</button>
        <button type="button" class="btn" id="btn-pause-settings">Cài đặt</button>
        <button type="button" class="btn" id="btn-pause-menu">Menu chính</button>
      </div>
    </div>
  `;
  document.body.appendChild(pauseOverlay);

  // Settings Overlay
  const settingsOverlay = document.createElement('div');
  settingsOverlay.id = 'screen-settings';
  settingsOverlay.className = 'screen-overlay hidden';
  settingsOverlay.innerHTML = `
    <div class="modal-card">
      <h2>Cài đặt</h2>
      <div class="settings-group">
        <div class="setting-item">
          <label><span>Âm lượng tổng</span><span id="val-master">65%</span></label>
          <input type="range" id="set-master" min="0" max="1" step="0.05" />
        </div>
        <div class="setting-item">
          <label><span>Nhạc nền</span><span id="val-music">40%</span></label>
          <input type="range" id="set-music" min="0" max="1" step="0.05" />
        </div>
        <div class="setting-item">
          <label><span>Hiệu ứng (SFX)</span><span id="val-sfx">80%</span></label>
          <input type="range" id="set-sfx" min="0" max="1" step="0.05" />
        </div>
        <div class="setting-item">
          <label><span>Độ nhạy chuột</span><span id="val-sens">0.16</span></label>
          <input type="range" id="set-sens" min="0.04" max="0.45" step="0.02" />
        </div>
      </div>
      <button type="button" class="btn btn-primary" id="btn-settings-close">Lưu & Đóng</button>
    </div>
  `;
  document.body.appendChild(settingsOverlay);

  // Result / Dawn Overlay
  const resultOverlay = document.createElement('div');
  resultOverlay.id = 'screen-result';
  resultOverlay.className = 'screen-overlay hidden';
  resultOverlay.innerHTML = `
    <div class="modal-card result-card">
      <p class="result-badge" id="res-badge">THẮNG</p>
      <h2 id="res-title">Thắng!</h2>
      <p class="modal-sub" id="res-desc"></p>
      <div class="stats-grid">
        <div class="stat-box">
          <span class="stat-box-label">Điểm Đêm này</span>
          <span class="stat-box-val" id="res-score">0</span>
        </div>
        <div class="stat-box">
          <span class="stat-box-label">Đèn sáng</span>
          <span class="stat-box-val" id="res-lanterns">0/5</span>
        </div>
        <div class="stat-box">
          <span class="stat-box-label">Tổng điểm</span>
          <span class="stat-box-val" id="res-total">0</span>
        </div>
      </div>
      <div class="btn-row">
        <button type="button" class="btn btn-primary" id="btn-res-next">Đêm tiếp theo</button>
        <button type="button" class="btn" id="btn-res-retry">Chơi lại Đêm này</button>
        <button type="button" class="btn" id="btn-res-menu">Menu chính</button>
      </div>
    </div>
  `;
  document.body.appendChild(resultOverlay);

  // Pre-build 3 flame pips & 10 mote slots
  const flamesEl = hud.querySelector('#hud-flames');
  const flamePips = [];
  for (let i = 0; i < (TUNING.flames ?? 3); i += 1) {
    const el = document.createElement('span');
    el.className = 'flame-pip';
    flamesEl.appendChild(el);
    flamePips.push(el);
  }

  const motesEl = hud.querySelector('#hud-motes');
  const moteSlots = [];
  for (let i = 0; i < (TUNING.carry_capacity ?? 10); i += 1) {
    const el = document.createElement('span');
    el.className = 'mote-slot';
    motesEl.appendChild(el);
    moteSlots.push(el);
  }

  // Settings controls binding
  const setMaster = settingsOverlay.querySelector('#set-master');
  const setMusic = settingsOverlay.querySelector('#set-music');
  const setSfx = settingsOverlay.querySelector('#set-sfx');
  const setSens = settingsOverlay.querySelector('#set-sens');
  const valMaster = settingsOverlay.querySelector('#val-master');
  const valMusic = settingsOverlay.querySelector('#val-music');
  const valSfx = settingsOverlay.querySelector('#val-sfx');
  const valSens = settingsOverlay.querySelector('#val-sens');

  function syncSettingsUI(s) {
    setMaster.value = s.masterVolume;
    setMusic.value = s.musicVolume;
    setSfx.value = s.sfxVolume;
    setSens.value = s.mouseSensitivity;
    valMaster.textContent = `${Math.round(s.masterVolume * 100)}%`;
    valMusic.textContent = `${Math.round(s.musicVolume * 100)}%`;
    valSfx.textContent = `${Math.round(s.sfxVolume * 100)}%`;
    valSens.textContent = s.mouseSensitivity.toFixed(2);
  }
  syncSettingsUI(initialSettings);

  const emitSettings = () => {
    const next = {
      masterVolume: Number(setMaster.value),
      musicVolume: Number(setMusic.value),
      sfxVolume: Number(setSfx.value),
      mouseSensitivity: Number(setSens.value),
    };
    syncSettingsUI(next);
    callbacks.onSettingsChange(next);
  };
  [setMaster, setMusic, setSfx, setSens].forEach((el) => el.addEventListener('input', emitSettings));

  // Button listeners
  menuOverlay.querySelector('#btn-play-start').addEventListener('click', () => callbacks.onSelectNight(1));
  menuOverlay.querySelectorAll('[data-night]').forEach((btn) => {
    btn.addEventListener('click', () => callbacks.onSelectNight(Number(btn.dataset.night)));
  });
  menuOverlay.querySelector('#btn-menu-settings').addEventListener('click', () => callbacks.onOpenSettings('menu'));

  introOverlay.querySelector('#btn-intro-go').addEventListener('click', () => callbacks.onStartPlaying());
  introOverlay.querySelector('#btn-intro-menu').addEventListener('click', () => callbacks.onMainMenu());

  pauseOverlay.querySelector('#btn-pause-resume').addEventListener('click', () => callbacks.onResume());
  pauseOverlay.querySelector('#btn-pause-restart').addEventListener('click', () => callbacks.onRestartNight());
  pauseOverlay.querySelector('#btn-pause-settings').addEventListener('click', () => callbacks.onOpenSettings('pause'));
  pauseOverlay.querySelector('#btn-pause-menu').addEventListener('click', () => callbacks.onMainMenu());

  settingsOverlay.querySelector('#btn-settings-close').addEventListener('click', () => callbacks.onCloseSettings());

  resultOverlay.querySelector('#btn-res-next').addEventListener('click', () => callbacks.onNextNight());
  resultOverlay.querySelector('#btn-res-retry').addEventListener('click', () => callbacks.onRestartNight());
  resultOverlay.querySelector('#btn-res-menu').addEventListener('click', () => callbacks.onMainMenu());

  const els = {
    clock: hud.querySelector('#hud-clock'),
    nightTitle: hud.querySelector('#hud-night-title'),
    wind: hud.querySelector('#hud-wind'),
    charm: hud.querySelector('#hud-charm'),
    charmTime: hud.querySelector('#hud-charm-time'),
    lanterns: hud.querySelector('#hud-lanterns'),
    score: hud.querySelector('#hud-score'),
    carriedNum: hud.querySelector('#hud-carried-num'),
    dashCard: hud.querySelector('#hud-dash-card'),
    dashStatus: hud.querySelector('#hud-dash-status'),
    pulseCard: hud.querySelector('#hud-pulse-card'),
    pulseStatus: hud.querySelector('#hud-pulse-status'),
    toast: hud.querySelector('#hud-toast'),
    prompt: hud.querySelector('#hud-prompt'),
    lockHint: hud.querySelector('#hud-lock-hint'),
    radar: hud.querySelector('#hud-radar'),
    arrowDist: arrow.querySelector('#hud-arrow-dist'),
    arrowHead: arrow.querySelector('.arrow-head'),
    introTitle: introOverlay.querySelector('#intro-title'),
    introDesc: introOverlay.querySelector('#intro-desc'),
    introLanterns: introOverlay.querySelector('#intro-lanterns'),
    introTime: introOverlay.querySelector('#intro-time'),
    introTotal: introOverlay.querySelector('#intro-total'),
    resBadge: resultOverlay.querySelector('#res-badge'),
    resTitle: resultOverlay.querySelector('#res-title'),
    resDesc: resultOverlay.querySelector('#res-desc'),
    resScore: resultOverlay.querySelector('#res-score'),
    resLanterns: resultOverlay.querySelector('#res-lanterns'),
    resTotal: resultOverlay.querySelector('#res-total'),
    btnResNext: resultOverlay.querySelector('#btn-res-next'),
  };

  const radarCtx = els.radar.getContext('2d');
  let toastTimer = 0;
  let hitFlashTimer = 0;

  document.addEventListener('pointerlockchange', () => {
    const locked = Boolean(document.pointerLockElement);
    els.lockHint.textContent = locked
      ? 'ESC/P tạm dừng · Mở khóa chuột'
      : 'Click để xoay chuột · Esc/P tạm dừng';
  });

  function showToast(text, danger = false) {
    els.toast.textContent = text;
    els.toast.classList.toggle('danger', danger);
    els.toast.classList.add('visible');
    toastTimer = 2.4;
  }

  function drawRadar(world, camYawDeg) {
    const ctx = radarCtx;
    const w = els.radar.width;
    const h = els.radar.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = w / 2 - 5;

    // Fit entire level (Night 2 spans x=-28..98)
    let centerX = 0;
    let maxSpan = 45;
    if (world.night === 2) {
      centerX = 35;
      maxSpan = 65;
    } else if (world.night === 3) {
      maxSpan = 47;
    } else {
      maxSpan = 42;
    }
    const scale = r / maxSpan;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(14, 20, 48, 0.92)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Islands
    ctx.fillStyle = 'rgba(47, 93, 80, 0.72)';
    for (const isl of world.level.islands) {
      ctx.beginPath();
      ctx.arc(cx + (isl.cx - centerX) * scale, cy + isl.cz * scale, isl.r * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bridges
    ctx.fillStyle = '#6B4A2F';
    for (const br of world.level.bridges) {
      ctx.fillRect(
        cx + (br.xMin - centerX) * scale,
        cy + br.zMin * scale,
        (br.xMax - br.xMin) * scale,
        Math.max(2, (br.zMax - br.zMin) * scale),
      );
    }

    // Lanterns
    for (const l of world.lanterns) {
      const lx = cx + (l.pos[0] - centerX) * scale;
      const ly = cy + l.pos[2] * scale;
      ctx.fillStyle = l.lit ? '#FFB347' : '#5B5F6E';
      ctx.strokeStyle = '#FFE9B0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(lx, ly, 3.2, 0, Math.PI * 2);
      ctx.fill();
      if (!l.lit) ctx.stroke();
    }

    // Shades
    ctx.fillStyle = '#7A3CFF';
    for (const s of world.shades) {
      ctx.beginPath();
      ctx.arc(cx + (s.pos[0] - centerX) * scale, cy + s.pos[2] * scale, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Drifters
    ctx.fillStyle = '#8FA3B8';
    for (const d of world.drifters) {
      if (d.state === 'removed') continue;
      ctx.beginPath();
      ctx.arc(cx + (d.pos[0] - centerX) * scale, cy + d.pos[2] * scale, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player
    const px = cx + (world.player.pos[0] - centerX) * scale;
    const py = cy + world.player.pos[2] * scale;
    const yaw = (camYawDeg * Math.PI) / 180;
    const fwdAngle = Math.atan2(Math.cos(yaw), Math.sin(yaw));
    ctx.fillStyle = 'rgba(242, 193, 78, 0.25)';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, 14, fwdAngle - 0.5, fwdAngle + 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#F5F1E6';
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(242, 193, 78, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  return {
    setScreen(screenName, data = {}) {
      menuOverlay.classList.toggle('hidden', screenName !== 'menu');
      introOverlay.classList.toggle('hidden', screenName !== 'intro');
      pauseOverlay.classList.toggle('hidden', screenName !== 'pause');
      settingsOverlay.classList.toggle('hidden', screenName !== 'settings');
      resultOverlay.classList.toggle('hidden', screenName !== 'result');
      hud.classList.toggle('hidden', screenName !== 'playing' && screenName !== 'pause');
      if (screenName !== 'playing') arrow.classList.remove('visible');

      if (screenName === 'intro' && data.level) {
        els.introTitle.textContent = data.level.subtitle;
        els.introDesc.textContent = data.level.intro;
        els.introLanterns.textContent = String(data.level.lanterns.length);
        els.introTime.textContent = formatClock(data.level.duration_s);
        els.introTotal.textContent = String(data.totalScore ?? 0);
      }

      if (screenName === 'result' && data.world) {
        const w = data.world;
        const won = w.state === 'won';
        const litCount = w.lanterns.filter((l) => l.lit).length;
        const isDawn = won && w.night === 3;
        const nightName = w.level?.subtitle ?? `Đêm ${w.night}`;
        resultOverlay.classList.toggle('result-won', won);
        resultOverlay.classList.toggle('result-lost', !won);
        els.resBadge.textContent = won ? 'THẮNG' : 'THUA';
        els.resTitle.textContent = isDawn
          ? '✦ Bình Minh Đảo Đèn Lồng! ✦'
          : won
            ? `Thắng — ${nightName}`
            : data.reason === 'dawn'
              ? 'Thua — Hết giờ (Bình minh)'
              : 'Thua — Hết Ngọn Lửa';
        els.resDesc.textContent = isDawn
          ? 'Mây đã thắp sáng cả ba hòn đảo và đưa ánh bình minh trở lại biển mây!'
          : won
            ? 'Mọi Đèn Lồng Lớn trên đảo đã bừng sáng. Chuẩn bị cho hòn đảo tiếp theo!'
            : data.reason === 'dawn'
              ? 'Đã hết thời gian trước khi thắp sáng toàn bộ Đèn Lồng Lớn.'
              : 'Ngọn Lửa của Mây đã tắt giữa màn đêm.';
        els.resScore.textContent = w.score.toLocaleString('vi-VN');
        els.resLanterns.textContent = `${litCount}/${w.lanterns.length}`;
        els.resTotal.textContent = (data.totalScore ?? 0).toLocaleString('vi-VN');
        els.btnResNext.style.display = won && w.night < 3 ? 'inline-block' : 'none';
        showToast(won ? '✦ THẮNG!' : 'THUA!', !won);
      } else {
        resultOverlay.classList.remove('result-won', 'result-lost');
      }
    },

    reset() {
      toastTimer = 0;
      hitFlashTimer = 0;
      els.toast.classList.remove('visible', 'danger');
      vignette.classList.remove('hit', 'low-light');
    },

    handleEvents(events) {
      for (const ev of events) {
        if (ev.name === 'lantern_lit') {
          showToast(`✦ Đèn ${ev.data.lantern_id} đã sáng! +${TUNING.score.per_lantern}`);
        } else if (ev.name === 'charm_picked') {
          showToast('✦ Nhặt Bùa Gió! Tăng tốc & Lướt không hồi chiêu (10s)');
        } else if (ev.name === 'drifter_steal') {
          showToast(`Gió Lạc đã cướp ${ev.data.stolen} đom đóm!`, true);
        } else if (ev.name === 'drifter_drop') {
          showToast(`✦ Gió Lạc đã thả lại ${ev.data.dropped} đom đóm!`);
        } else if (ev.name === 'player_hit') {
          hitFlashTimer = 0.4;
          showToast(
            ev.data.by === 'fall'
              ? 'Mây rơi khỏi đảo! Mất 1 Ngọn Lửa & toàn bộ đom đóm'
              : 'Chạm Bóng Mực! Mất 1 Ngọn Lửa',
            true,
          );
        } else if (ev.name === 'game_over') {
          showToast(ev.data.result === 'won' ? '✦ THẮNG!' : 'THUA!', ev.data.result !== 'won');
        }
      }
    },

    update(world, timeLeftS, camYawDeg, dt, offscreenIndicator) {
      if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0) els.toast.classList.remove('visible');
      }
      if (hitFlashTimer > 0) hitFlashTimer -= dt;
      vignette.classList.toggle('hit', hitFlashTimer > 0);
      vignette.classList.toggle(
        'low-light',
        hitFlashTimer <= 0 && world.state === 'playing' && world.player.flames === 1,
      );

      // Flames
      for (let i = 0; i < flamePips.length; i += 1) {
        flamePips[i].classList.toggle('active', i < world.player.flames);
      }

      // Charm badge
      const charmS = world.player.charmTicks / TICK_HZ;
      els.charm.classList.toggle('active', charmS > 0);
      if (charmS > 0) els.charmTime.textContent = `${charmS.toFixed(1)}s`;

      // Clock (mm:ss; red & blinking when <= 30s)
      els.nightTitle.textContent = world.level.subtitle;
      els.clock.textContent = formatClock(timeLeftS);
      els.clock.classList.toggle('urgent', timeLeftS <= 30);

      // Night 3 Wind badge
      if (world.wind?.active) {
        els.wind.textContent = 'Gió mạnh đang thổi!';
        els.wind.className = 'wind-badge visible active';
      } else if (world.wind?.warning) {
        els.wind.textContent = 'Cảnh báo: Gió mạnh sắp tới!';
        els.wind.className = 'wind-badge visible';
      } else {
        els.wind.className = 'wind-badge';
      }

      // Lanterns & Score
      const litCount = world.lanterns.filter((l) => l.lit).length;
      els.lanterns.textContent = `${litCount}/${world.lanterns.length}`;
      els.score.textContent = world.score.toLocaleString('vi-VN');

      // 10-slot Mote bar
      els.carriedNum.textContent = String(world.player.carried);
      for (let i = 0; i < moteSlots.length; i += 1) {
        moteSlots[i].classList.toggle('filled', i < world.player.carried);
      }

      // Dash skill card
      const dashCd = world.player.dashCdTicks / TICK_HZ;
      if (world.player.charmTicks > 0) {
        els.dashCard.className = 'hud-panel skill-card ready';
        els.dashStatus.textContent = 'Bùa Gió (0s)';
      } else if (dashCd > 0.05) {
        els.dashCard.className = 'hud-panel skill-card cooling';
        els.dashStatus.textContent = `${dashCd.toFixed(1)}s`;
      } else {
        els.dashCard.className = 'hud-panel skill-card ready';
        els.dashStatus.textContent = 'Sẵn sàng';
      }

      // Pulse skill card (costs 3 motes, 3s cd)
      const pulseCd = world.player.pulseCdTicks / TICK_HZ;
      const pulseCost = TUNING.pulse_cost ?? 3;
      if (pulseCd > 0.05) {
        els.pulseCard.className = 'hud-panel skill-card cooling';
        els.pulseStatus.textContent = `${pulseCd.toFixed(1)}s`;
      } else if (world.player.carried < pulseCost) {
        els.pulseCard.className = 'hud-panel skill-card cooling';
        els.pulseStatus.textContent = `Cần ${pulseCost} đom đóm`;
      } else {
        els.pulseCard.className = 'hud-panel skill-card ready';
        els.pulseStatus.textContent = `Sẵn sàng (-${pulseCost})`;
      }

      // Contextual prompt: "E — Nạp ánh sáng (x/10)"
      let nearUnlit = null;
      let nearDist = Infinity;
      const cost = TUNING.lantern_cost ?? 10;
      for (const l of world.lanterns) {
        if (l.lit) continue;
        if (Math.abs(world.player.pos[1] - l.pos[1]) > 2.2) continue;
        const d = Math.hypot(world.player.pos[0] - l.pos[0], world.player.pos[2] - l.pos[2]);
        if (d <= (TUNING.interact_radius ?? 2.0) + 0.6 && d < nearDist) {
          nearDist = d;
          nearUnlit = l;
        }
      }
      if (world.state === 'playing' && nearUnlit) {
        els.prompt.textContent = `E — Nạp ánh sáng (${nearUnlit.deposited}/${cost})`;
        els.prompt.classList.add('visible');
      } else {
        els.prompt.classList.remove('visible');
      }

      // Off-screen nearest unlit lantern arrow
      if (world.state === 'playing' && offscreenIndicator) {
        const margin = 58;
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const rx = cx - margin;
        const ry = cy - margin;
        const x = cx + offscreenIndicator.nx * rx;
        const y = cy + offscreenIndicator.ny * ry;
        arrow.style.left = `${Math.max(margin, Math.min(window.innerWidth - margin, x))}px`;
        arrow.style.top = `${Math.max(margin, Math.min(window.innerHeight - margin, y))}px`;
        els.arrowHead.style.transform = `rotate(${offscreenIndicator.angleDeg}deg)`;
        els.arrowDist.textContent = `${offscreenIndicator.dist}m`;
        arrow.classList.add('visible');
      } else {
        arrow.classList.remove('visible');
      }

      drawRadar(world, camYawDeg);
    },
  };
}
