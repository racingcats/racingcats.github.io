TypeCatch — Web Typing Game

Simple kid-friendly web game: colorful letters fall from the top; type the matching key to catch them. Missed letters cost a life. Press Space to play again.

How to run

- Open `index.html` in any modern desktop browser (Safari, Chrome, Edge, Firefox).
- No build step required.

Files

- `index.html`: Canvas + overlay UI
- `styles.css`: Basic styling
- `main.js`: Game loop, rendering, input

Controls

- Type A–Z to catch falling letters
- Space: restart after Game Over
- Or click the Start button

Tuning

- Edit values in `main.js` to adjust difficulty:
  - `minSpeed`, `maxSpeed` (px/s)
  - spawn range (`minSpawn`, `maxSpawn` seconds)
  - starting `lives`

