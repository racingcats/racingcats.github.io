(() => {
  const canvas = document.getElementById('game');
  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('startBtn');
  const kbRoot = document.getElementById('keyboard');
  const speedBtn = document.getElementById('speedBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const handsRoot = document.getElementById('hands');
  const ctx = canvas.getContext('2d');

  // Logical (CSS pixel) size; we scale for HiDPI.
  let width = 0;
  let height = 0;
  let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  // Game state
  let letters = [];
  let score = 0;
  const livesStart = 10; // starting lives
  let lives = livesStart;
  let running = false;
  let paused = false;
  let lastTime = performance.now();
  let spawnTimer = 0;
  let nextSpawnDelay = 0; // seconds
  const floorH = 24;
  let reservedBottom = 0; // reserved space above bottom UI like keyboard

  const letterFontSize = 36; // CSS px
  // Base speed (Normal). We scale with speedFactor for Slow/Normal/Fast
  const baseMinSpeed = 80; // px/s
  const baseMaxSpeed = 160; // px/s
  const minSpawn = 0.7; // s
  const maxSpawn = 1.6; // s
  const maxConcurrentLetters = 2; // limit on-screen letters

  const speedLevels = [
    { name: 'Slow', factor: 0.6 },
    { name: 'Normal', factor: 1.0 },
    { name: 'Fast', factor: 1.4 }
  ];
  let speedIndex = 0; // start at Slow
  let speedFactor = speedLevels[speedIndex].factor;

  function resize() {
    dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
    width = Math.max(320, Math.floor(window.innerWidth));
    height = Math.max(240, Math.floor(window.innerHeight));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    updateKeyboardScale();
    measureReservedBottom();
  }

  window.addEventListener('resize', resize);
  resize();

  function randRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randomHueColor() {
    const h = Math.floor(Math.random() * 360);
    return `hsl(${h} 90% 60%)`;
  }

  function nextDelay() {
    return randRange(minSpawn, maxSpawn);
  }

  function spawnLetter() {
    const c = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
    const padding = 20;
    const x = randRange(padding, Math.max(padding, width - padding));
    const y = -letterFontSize; // slightly above the top
    const speed = randRange(baseMinSpeed, baseMaxSpeed) * speedFactor;
    const color = randomHueColor();
    letters.push({ c, x, y, speed, color });
  }

  function reset() {
    letters = [];
    score = 0;
    lives = livesStart;
    spawnTimer = 0;
    nextSpawnDelay = nextDelay();
    running = true;
    paused = false;
    lastTime = performance.now();
    updatePauseButton();
  }

  function gameOver() {
    running = false;
    paused = false;
    if (overlay) overlay.classList.remove('hidden');
    if (startBtn) startBtn.textContent = 'Play again';
    updatePauseButton();
  }

  function update(dt) {
    // Spawn control
    spawnTimer += dt;
    if (spawnTimer >= nextSpawnDelay) {
      if (letters.length < maxConcurrentLetters) {
        spawnTimer = 0;
        nextSpawnDelay = nextDelay();
        spawnLetter();
      } else {
        // keep timer saturated; try again next frame
        spawnTimer = nextSpawnDelay;
      }
    }

    // Update letters
    let missed = 0;
    for (const letter of letters) {
      letter.y += letter.speed * dt;
    }
    // Remove missed
    const playBottomY = height - reservedBottom;
    letters = letters.filter(l => {
      if (l.y > playBottomY - floorH) {
        missed++;
        return false;
      }
      return true;
    });
    if (missed) {
      lives -= missed;
      if (lives <= 0) gameOver();
    }
  }

  function draw() {
    // Background (light green)
    ctx.fillStyle = '#ccffcc';
    ctx.fillRect(0, 0, width, height);

    // Ground (sit above on-screen keyboard)
    ctx.fillStyle = 'rgba(255 255 255 / 0.12)';
    const playBottomY2 = height - reservedBottom;
    ctx.fillRect(0, playBottomY2 - floorH, width, floorH);

    // HUD
    ctx.fillStyle = '#000000';
    ctx.font = '600 16px ui-monospace, Menlo, Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`Score: ${score}`, 12, 28);

    const livesText = `Lives: ${Math.max(lives, 0)}`;
    const livesWidth = ctx.measureText(livesText).width;
    ctx.fillText(livesText, width - 12 - livesWidth, 28);

    // Letters
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${letterFontSize}px ui-sans-serif, system-ui, -apple-system`;
    for (const l of letters) {
      ctx.fillStyle = l.color;
      ctx.fillText(l.c, l.x, l.y);
    }

    if (!running) {
      // Overlay hint drawn into canvas as well for clarity
      ctx.fillStyle = 'rgba(0 0 0 / 0.5)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.font = '800 42px system-ui, -apple-system, Segoe UI, Roboto';
      ctx.fillText('Game Over', width / 2, height / 2 - 8);
      ctx.font = '400 18px system-ui, -apple-system, Segoe UI, Roboto';
      ctx.fillText('Press Space or any letter', width / 2, height / 2 + 28);
    }
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000); // clamp to avoid huge steps
    lastTime = now;
    if (running && !paused) update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  // Unified letter handler so physical and on-screen keys share logic
  function handleLetterInput(k) {
    if (!k || k.length !== 1 || k < 'A' || k > 'Z') return;
    if (!running) {
      if (overlay) overlay.classList.add('hidden');
      reset();
      return;
    }
    // Find the lowest matching letter (closest to ground)
    let bestIndex = -1;
    let bestY = -Infinity;
    for (let i = 0; i < letters.length; i++) {
      const l = letters[i];
      if (l.c === k && l.y > bestY) {
        bestY = l.y;
        bestIndex = i;
      }
    }
    if (bestIndex !== -1) {
      const removed = letters.splice(bestIndex, 1)[0];
      score += 1;
      pulseKey(k, true);
      spawnBurst(removed.x, removed.y, removed.color);
      sfx.bling();
    } else {
      pulseKey(k, false);
      sfx.tick();
    }
  }

  // Physical keyboard input
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = (e.key || '').toUpperCase();
    if (k === ' ') {
      e.preventDefault();
      if (!running) {
        if (overlay) overlay.classList.add('hidden');
        reset();
        return;
      }
      // Toggle pause/resume during an active game
      paused = !paused;
      updatePauseButton();
      return;
    }
    if (k.length === 1 && k >= 'A' && k <= 'Z') {
      handleLetterInput(k);
    }
  });

  // Start button / click overlay
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (overlay) overlay.classList.add('hidden');
      reset();
      canvas.focus();
    });
  }

  // Speed control button cycles Slow → Normal → Fast
  function applySpeedFactor(newFactor) {
    const scale = newFactor / speedFactor;
    for (const l of letters) {
      l.speed *= scale;
    }
    speedFactor = newFactor;
  }
  function updateSpeedButton() {
    speedBtn.textContent = `Speed: ${speedLevels[speedIndex].name}`;
  }
  speedBtn.addEventListener('click', () => {
    speedIndex = (speedIndex + 1) % speedLevels.length;
    applySpeedFactor(speedLevels[speedIndex].factor);
    updateSpeedButton();
  });
  updateSpeedButton();

  // Pause/Resume control
  function updatePauseButton() {
    if (!pauseBtn) return;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    pauseBtn.setAttribute('aria-pressed', String(paused));
    pauseBtn.disabled = !running && !paused; // disabled when game not started
  }
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      if (!running && !paused) return; // nothing to pause/resume
      paused = !paused;
      updatePauseButton();
    });
  }
  updatePauseButton();

  // Auto-start the game and keep overlay hidden (no start box)
  reset();

  // ---- On-screen keyboard ----
  const rows = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['Z','X','C','V','B','N','M']
  ];
  /** @type {Record<string, HTMLElement>} */
  const keyEls = {};
  function buildKeyboard() {
    kbRoot.innerHTML = '';
    for (const row of rows) {
      const r = document.createElement('div');
      r.className = 'row';
      for (const k of row) {
        const key = document.createElement('div');
        key.className = 'key';
        key.textContent = k;
        key.setAttribute('data-key', k);
        if (k === 'F' || k === 'J') {
          key.classList.add('home-key');
          key.setAttribute('title', `${k} (home key)`);
        }
        keyEls[k] = key;
        r.appendChild(key);
      }
      kbRoot.appendChild(r);
    }
  }
  buildKeyboard();
  // Make on-screen keys clickable/touchable (iPad/iPhone)
  kbRoot.addEventListener('pointerdown', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const k = (target.getAttribute('data-key') || '').toUpperCase();
    if (!k) return;
    e.preventDefault();
    sfx.ensure(); // enable audio on first touch/click
    handleLetterInput(k);
  });

  // --- Responsive keyboard scaling and layout measurement ---
  function updateKeyboardScale() {
    if (!kbRoot) return;
    // Reset scale to measure natural width
    kbRoot.style.setProperty('--kb-scale', '1');
    const natural = kbRoot.scrollWidth || kbRoot.offsetWidth || 0;
    // Target almost full screen width with a small margin
    const targetWidth = Math.max(320, width - 20);
    let s = 1;
    if (natural > 0) s = targetWidth / natural; // allow upscaling to fill width
    // Keep within reasonable bounds
    s = Math.max(0.8, Math.min(1.6, s));
    kbRoot.style.setProperty('--kb-scale', String(s));
  }

  function measureReservedBottom() {
    if (!kbRoot) { reservedBottom = 0; return; }
    const rect = kbRoot.getBoundingClientRect();
    reservedBottom = Math.ceil(rect.height + 8); // small spacing
  }

  // Initial measurement
  updateKeyboardScale();
  measureReservedBottom();

  // ---- Finger mappings (QWERTY) ----
  // Standard QWERTY touch-typing mapping (B to left index)
  const letterToFingerId = {
    Q:'finger-left-pinky',  A:'finger-left-pinky',  Z:'finger-left-pinky',
    W:'finger-left-ring',   S:'finger-left-ring',   X:'finger-left-ring',
    E:'finger-left-middle', D:'finger-left-middle', C:'finger-left-middle',
    R:'finger-left-index',  F:'finger-left-index',  V:'finger-left-index', T:'finger-left-index', G:'finger-left-index', B:'finger-left-index',
    Y:'finger-right-index', H:'finger-right-index', N:'finger-right-index', U:'finger-right-index', J:'finger-right-index', M:'finger-right-index',
    I:'finger-right-middle',K:'finger-right-middle',
    O:'finger-right-ring',  L:'finger-right-ring',
    P:'finger-right-pinky'
  };

  // Elements for virtual hands (if present)
  const fingerEls = handsRoot ? {
    'finger-left-pinky':  document.getElementById('finger-left-pinky'),
    'finger-left-ring':   document.getElementById('finger-left-ring'),
    'finger-left-middle': document.getElementById('finger-left-middle'),
    'finger-left-index':  document.getElementById('finger-left-index'),
    'finger-right-index': document.getElementById('finger-right-index'),
    'finger-right-middle':document.getElementById('finger-right-middle'),
    'finger-right-ring':  document.getElementById('finger-right-ring'),
    'finger-right-pinky': document.getElementById('finger-right-pinky')
  } : null;

  // Map each finger to a color zone: red, yellow, purple, blue (left→right per hand)
  const fingerIdToColor = {
    'finger-left-pinky':  'red',
    'finger-left-ring':   'yellow',
    'finger-left-middle': 'purple',
    'finger-left-index':  'blue',
    'finger-right-index': 'red',
    'finger-right-middle':'yellow',
    'finger-right-ring':  'purple',
    'finger-right-pinky': 'blue'
  };

  // Apply static color classes to on-screen keyboard keys
  function applyKeyFingerColors() {
    for (const [letter, el] of Object.entries(keyEls)) {
      const fid = letterToFingerId[letter];
      const color = fid ? fingerIdToColor[fid] : null;
      if (color) el.classList.add(`color-${color}`);
    }
  }
  applyKeyFingerColors();

  function updateKeyboardGlow() {
    // Map each letter to the color of the lowest on-screen instance
    const latest = {};
    for (const l of letters) {
      const prev = latest[l.c];
      if (!prev || l.y > prev.y) latest[l.c] = { color: l.color, y: l.y };
    }
    for (const [k, el] of Object.entries(keyEls)) {
      const info = latest[k];
      if (info) {
        el.classList.add('glow');
        const color = info.color;
        const soft = color.replace(')', ' / 0.7)');
        const bg1 = color.replace(')', ' / 0.30)');
        const bg2 = color.replace(')', ' / 0.12)');
        el.style.boxShadow = `0 0 0 2px ${soft}, 0 0 18px ${soft}, inset 0 1px 0 rgba(255,255,255,0.15)`;
        el.style.background = `linear-gradient(180deg, ${bg1}, ${bg2})`;
      } else {
        el.classList.remove('glow');
        el.style.boxShadow = '';
        el.style.background = '';
      }
    }

    // Update virtual hands highlighting per active letters
    if (fingerEls) updateHands(latest);
  }

  function updateHands(latest) {
    // Clear all
    for (const el of Object.values(fingerEls)) {
      if (!el) continue;
      el.classList.remove('active');
    }
    // Highlight per active letters
    for (const key of Object.keys(latest)) {
      const fid = letterToFingerId[key];
      if (fid && fingerEls[fid]) fingerEls[fid].classList.add('active');
    }
  }

  function pulseKey(k, good) {
    const el = keyEls[k];
    if (!el) return;
    el.classList.add('hit');
    if (!good) {
      // brief red flash for wrong
      const oldBg = el.style.background;
      el.style.background = 'linear-gradient(180deg, rgba(255,120,120,0.25), rgba(255,60,60,0.15))';
      setTimeout(() => { el.style.background = ''; }, 120);
    }
    setTimeout(() => el.classList.remove('hit'), 140);
  }

  // ---- Particles ----
  const particles = [];
  function spawnBurst(x, y, color) {
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 80 + Math.random() * 120;
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.6 + Math.random() * 0.4,
        age: 0,
        color
      });
    }
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt; // gravity
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      if (particles[i].age >= particles[i].life) particles.splice(i, 1);
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const t = Math.min(1, p.age / p.life);
      const alpha = 1 - t;
      ctx.fillStyle = p.color.replace(')', ` / ${alpha})`).replace('hsl', 'hsl');
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---- Simple sounds (Web Audio) ----
  const sfx = (() => {
    let ac; let enabled = false;
    const ensure = () => {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      enabled = true;
    };
    const bling = () => { if (!enabled) return; tone(880, 0.06, 'sine', 0.06); tone(1320, 0.08, 'triangle', 0.045, 0.02); };
    const tick = () => { if (!enabled) return; tone(220, 0.05, 'square', 0.03); };
    const tone = (freq, dur, type, gain=0.05, delay=0) => {
      const t0 = ac.currentTime + delay;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(gain, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(ac.destination);
      o.start(t0); o.stop(t0 + dur + 0.02);
    };
    // public
    return { ensure, bling, tick };
  })();

  // Enable audio on first interaction
  window.addEventListener('keydown', () => sfx.ensure(), { once: true });
  if (startBtn) startBtn.addEventListener('click', () => sfx.ensure(), { once: true });

  // Hook keyboard glow into frame
  const _origUpdate = update;
  update = function(dt) { // override reference in closure
    _origUpdate(dt);
    updateParticles(dt);
  };
  const _origDraw = draw;
  draw = function() {
    _origDraw();
    drawParticles();
    updateKeyboardGlow();
  };
})();
