# Tic‑Tac‑Toe (Tic‑Tac Takeover)

A simple two‑player tic‑tac‑toe you can play in any web browser.
Now themed with Bullet Bill vs. Super Star, kid‑friendly animations, score tracking, confetti wins, and fun sounds (with toggle).

## Run locally

- Option 1: Open `index.html` directly in your browser (double‑click).
- Option 2: Serve the folder on `http://localhost:8000`:
  - Python: `python3 -m http.server 8000`
  - Node (if installed): `npx serve -l 8000` (requires network to install once)

Then visit `http://localhost:8000`.

## How to play

- Players take turns clicking squares. Bullet Bill starts.
- The status text shows whose turn it is.
- Click Reset to clear; Play Again appears after a win/draw and alternates the starting player.
- Use the Sound toggle to mute/unmute effects.

No backend required; it’s a static site with `index.html`, `styles.css`, and `app.js`.
