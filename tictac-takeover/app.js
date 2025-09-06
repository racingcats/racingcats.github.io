(() => {
  const statusEl = document.getElementById('status');
  const boardEl = document.querySelector('.board');
  const cells = Array.from(document.querySelectorAll('.cell'));
  const resetBtn = document.getElementById('reset');
  const scoreBulletEl = document.getElementById('scoreBullet');
  const scoreStarEl = document.getElementById('scoreStar');
  const soundToggleBtn = document.getElementById('soundToggle');
  const clearScoresBtn = document.getElementById('clearScores');
  const messageEl = document.getElementById('message');
  const tokBulletEl = document.getElementById('tokBullet');
  const tokStarEl = document.getElementById('tokStar');

  const BULLET = 'bullet';
  const STAR = 'star';

  let board = Array(9).fill('');
  let current = BULLET; // Bullet Bill starts
  let active = true;
  let soundOn = true;
  let scores = { [BULLET]: 0, [STAR]: 0 };
  let takeoverUsed = { [BULLET]: false, [STAR]: false };

  const WIN_LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function updateCell(idx, value) {
    const cell = cells[idx];
    // Visuals handled by CSS via data-mark; keep text empty
    cell.textContent = '';
    cell.dataset.mark = value;
    const label = value === BULLET ? 'Bullet Bill' : value === STAR ? 'Super Star' : '';
    cell.setAttribute('aria-label', `cell ${idx + 1}${label ? ' ' + label : ''}`.trim());
    if (value === BULLET) cell.classList.add('placed-bullet');
    if (value === STAR) cell.classList.add('placed-star');
    setTimeout(() => cell.classList.remove('placed-bullet', 'placed-star'), 260);
  }

  function checkWinner() {
    for (const [a, b, c] of WIN_LINES) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], line: [a, b, c] };
      }
    }
    if (board.every((v) => v)) {
      return { draw: true };
    }
    return null;
  }

  function highlightLine(line) {
    line.forEach((i) => cells[i].classList.add('win'));
  }

  function handleClick(e) {
    const target = e.target.closest('.cell');
    if (!target || !active) return;
    const idx = Number(target.dataset.index);
    const occupying = board[idx];
    if (occupying) {
      if (occupying === current) {
        setMessage('That square is already yours.');
        return;
      }
      if (!takeoverUsed[current]) {
        board[idx] = current;
        updateCell(idx, current);
        takeoverUsed[current] = true;
        updateTakeoverUI();
        playTakeoverSound(current);
        setMessage('Takeover!');
      } else {
        setMessage('You already used your takeover. Pick an empty square.');
        return;
      }
    } else {
      board[idx] = current;
      updateCell(idx, current);
      playMoveSound(current);
      setMessage(randomCheer(current));
    }

    const result = checkWinner();
    if (result?.winner) {
      active = false;
      highlightLine(result.line);
      const who = result.winner === BULLET ? 'Bullet Bill' : 'Super Star';
      setStatus(`${who} wins!`);
      playWinJingle(result.winner);
      incrementScore(result.winner);
      confettiBurst();
      return;
    }
    if (result?.draw) {
      active = false;
      setStatus('It’s a draw.');
      playDrawJingle();
      boardEl.classList.add('draw-shake');
      setTimeout(() => boardEl.classList.remove('draw-shake'), 450);
      return;
    }

    current = current === BULLET ? STAR : BULLET;
    setStatus(`${current === BULLET ? 'Bullet Bill' : 'Super Star'}’s turn`);
  }

  function resetBoard({ freshTurn = BULLET } = {}) {
    board = Array(9).fill('');
    active = true;
    current = freshTurn;
    takeoverUsed = { [BULLET]: false, [STAR]: false };
    cells.forEach((c, i) => {
      c.classList.remove('win');
      updateCell(i, '');
    });
    setStatus(`${current === BULLET ? 'Bullet Bill' : 'Super Star'}’s turn`);
    setMessage('Let’s play! Kaboom or sparkle!');
    updateTakeoverUI();
  }

  // Event listeners
  boardEl.addEventListener('click', handleClick);
  resetBtn.addEventListener('click', () => {
    const start = Math.random() < 0.5 ? BULLET : STAR;
    resetBoard({ freshTurn: start });
  });
  // (Play Again removed; use Reset instead)

  // Keyboard support: allow arrows/enter to move/select
  cells.forEach((cell, i) => {
    cell.addEventListener('keydown', (e) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      let ni = i;
      switch (e.key) {
        case 'ArrowLeft':
          ni = row * 3 + ((col + 2) % 3);
          break;
        case 'ArrowRight':
          ni = row * 3 + ((col + 1) % 3);
          break;
        case 'ArrowUp':
          ni = ((row + 2) % 3) * 3 + col;
          break;
        case 'ArrowDown':
          ni = ((row + 1) % 3) * 3 + col;
          break;
        case 'Enter':
        case ' ': // Space
          e.preventDefault();
          handleClick({ target: cell });
          return;
        default:
          return; // ignore others
      }
      e.preventDefault();
      cells[ni].focus();
    });
  });

  // --- Sounds ---
  let audio;
  function ensureAudio() {
    if (!audio) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audio = new Ctx();
    }
    if (audio && audio.state === 'suspended') audio.resume();
    return audio;
  }

  function tone({ freq = 440, dur = 0.1, type = 'sine', gain = 0.06, start = 0, endFreq }) {
    if (!soundOn) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    const t0 = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    osc.type = type;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function playMoveSound(mark) {
    if (mark === BULLET) {
      // Low, percussive blip
      tone({ freq: 180, endFreq: 80, dur: 0.12, type: 'square', gain: 0.08 });
    } else if (mark === STAR) {
      // Quick sparkle arpeggio
      tone({ freq: 880, dur: 0.06, type: 'triangle', gain: 0.05, start: 0.00 });
      tone({ freq: 1320, dur: 0.06, type: 'triangle', gain: 0.045, start: 0.07 });
      tone({ freq: 1760, dur: 0.06, type: 'triangle', gain: 0.04, start: 0.14 });
    }
  }

  function playWinJingle(winner) {
    // Small fanfare for winner + soft descending "lose" cue for the other side
    if (winner === BULLET) {
      // Heavier triumphant: square/brass-like
      tone({ freq: 220, dur: 0.12, type: 'square', gain: 0.09, start: 0.00 });
      tone({ freq: 330, dur: 0.12, type: 'square', gain: 0.08, start: 0.12 });
      tone({ freq: 440, dur: 0.16, type: 'square', gain: 0.08, start: 0.24 });
      tone({ freq: 660, dur: 0.18, type: 'square', gain: 0.07, start: 0.40 });
    } else {
      // Sparkly star fanfare: rising triangle tones
      tone({ freq: 988, dur: 0.09, type: 'triangle', gain: 0.06, start: 0.00 });
      tone({ freq: 1319, dur: 0.10, type: 'triangle', gain: 0.055, start: 0.10 });
      tone({ freq: 1760, dur: 0.12, type: 'triangle', gain: 0.05, start: 0.22 });
      tone({ freq: 2349, dur: 0.14, type: 'triangle', gain: 0.045, start: 0.36 });
    }
    // Soft descending "lose" cue
    tone({ freq: 440, endFreq: 196, dur: 0.25, type: 'sawtooth', gain: 0.025, start: 0.05 });
  }

  function playDrawJingle() {
    // Neutral three-note: mid register
    tone({ freq: 392, dur: 0.10, type: 'sine', gain: 0.05, start: 0.00 }); // G4
    tone({ freq: 440, dur: 0.10, type: 'sine', gain: 0.05, start: 0.12 }); // A4
    tone({ freq: 349, dur: 0.12, type: 'sine', gain: 0.05, start: 0.24 }); // F4
  }

  function playTakeoverSound(mark) {
    if (mark === BULLET) {
      tone({ freq: 160, dur: 0.08, type: 'square', gain: 0.08 });
      tone({ freq: 280, dur: 0.08, type: 'square', gain: 0.07, start: 0.08 });
      tone({ freq: 90, dur: 0.12, type: 'sawtooth', gain: 0.05, start: 0.16 });
    } else {
      tone({ freq: 1200, dur: 0.06, type: 'triangle', gain: 0.06 });
      tone({ freq: 1600, dur: 0.08, type: 'triangle', gain: 0.05, start: 0.06 });
      tone({ freq: 900, dur: 0.10, type: 'sawtooth', gain: 0.04, start: 0.14 });
    }
  }

  // --- Takeover UI helpers ---
  function updateTakeoverUI() {
    if (tokBulletEl) tokBulletEl.textContent = takeoverUsed[BULLET] ? 'x0' : 'x1';
    if (tokStarEl) tokStarEl.textContent = takeoverUsed[STAR] ? 'x0' : 'x1';
  }

  // --- Scores ---
  function loadScores() {
    try { const raw = localStorage.getItem('tttScores'); if (raw) scores = JSON.parse(raw); } catch {}
    updateScoreUI();
  }
  function saveScores() { try { localStorage.setItem('tttScores', JSON.stringify(scores)); } catch {} }
  function updateScoreUI() {
    if (scoreBulletEl) scoreBulletEl.textContent = String(scores[BULLET] || 0);
    if (scoreStarEl) scoreStarEl.textContent = String(scores[STAR] || 0);
  }
  function incrementScore(winner) { scores[winner] = (scores[winner] || 0) + 1; updateScoreUI(); saveScores(); }

  function clearScores() {
    scores[BULLET] = 0;
    scores[STAR] = 0;
    saveScores();
    updateScoreUI();
    setMessage('Scores cleared!');
    tone({ freq: 660, dur: 0.06, type: 'triangle', gain: 0.04 });
    tone({ freq: 880, dur: 0.06, type: 'triangle', gain: 0.035, start: 0.07 });
  }

  // --- Confetti ---
  function confettiBurst({ count = 120, spread = Math.PI, y = 0.25 } = {}) {
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti-canvas';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    function resize(){ canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; }
    resize();
    const colors = ['#ffd166','#7bd88f','#7cc6ff','#ff6b6b','#f78fb3','#f5f7fb'];
    const parts = [];
    const cx = canvas.width/2; const cy = canvas.height * y;
    for (let i=0;i<count;i++) {
      const angle = -Math.PI/2 + (Math.random()-0.5)*spread*2;
      const speed = (Math.random()*3+2) * dpr;
      parts.push({ x: cx, y: cy, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, g: 0.08*dpr, w: (Math.random()*6+3)*dpr, h: (Math.random()*10+6)*dpr, r: Math.random()*Math.PI, spin: (Math.random()*0.2-0.1), color: colors[(Math.random()*colors.length)|0], life: 60+(Math.random()*40|0) });
    }
    let raf; (function tick(){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      parts.forEach(p=>{ p.vy+=p.g; p.x+=p.vx; p.y+=p.vy; p.r+=p.spin; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r); ctx.fillStyle=p.color; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore(); p.life--; });
      for (let i=parts.length-1;i>=0;i--) if (parts[i].life<=0) parts.splice(i,1);
      if (parts.length) { raf = requestAnimationFrame(tick); } else { cancelAnimationFrame(raf); canvas.remove(); }
    })();
    window.addEventListener('resize', resize, { once: true });
  }

  // --- Fun messages ---
  const cheers = { [BULLET]: ['Kaboom!','Pow!','Zoom!','Bullet time!','Blam!'], [STAR]: ['Sparkle!','Shiny!','Twinkle!','Dazzle!','Star power!'] };
  function setMessage(text){ if (messageEl) messageEl.textContent = text; }
  function randomCheer(mark){ const arr = cheers[mark] || ['Nice move!']; return arr[(Math.random()*arr.length)|0]; }

  // Attach a one-time user gesture to unlock audio
  const unlock = () => { ensureAudio(); document.removeEventListener('pointerdown', unlock); };
  document.addEventListener('pointerdown', unlock, { once: true });

  // Initialize
  resetBoard({ freshTurn: BULLET });

  // Sound toggle
  soundToggleBtn?.addEventListener('click', () => {
    soundOn = !soundOn;
    soundToggleBtn.setAttribute('aria-pressed', String(soundOn));
    soundToggleBtn.textContent = `Sound: ${soundOn ? 'On' : 'Off'}`;
    if (soundOn) ensureAudio();
  });

  // Clear scores
  clearScoresBtn?.addEventListener('click', clearScores);

  // Load scores
  loadScores();
  updateTakeoverUI();
  updateTakeoverUI();
})();
