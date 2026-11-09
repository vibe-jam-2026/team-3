// Keyboard input for two players on one keyboard.
// Uses KeyboardEvent.code so it works the same on any keyboard layout.

const BINDINGS = [
  { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' },               // Player 1
  { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }, // Player 2
];

const held = new Set();
const pressedThisFrame = new Set();

const BLOCK_DEFAULT = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
]);

window.addEventListener('keydown', (e) => {
  if (BLOCK_DEFAULT.has(e.code)) e.preventDefault(); // stop page scrolling
  if (!held.has(e.code)) pressedThisFrame.add(e.code);
  held.add(e.code);
});

window.addEventListener('keyup', (e) => held.delete(e.code));

// Release everything if the window loses focus, so no key gets "stuck".
window.addEventListener('blur', () => held.clear());

/** Movement direction for a player (0 or 1), normalised so diagonals aren't faster. */
export function moveVector(playerIndex) {
  const b = BINDINGS[playerIndex];
  let x = 0, y = 0;
  if (held.has(b.left)) x -= 1;
  if (held.has(b.right)) x += 1;
  if (held.has(b.up)) y -= 1;
  if (held.has(b.down)) y += 1;
  const len = Math.hypot(x, y);
  return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
}

/** True only on the frame a key went down. */
export function wasPressed(code) {
  return pressedThisFrame.has(code);
}

/** Call once at the end of every frame. */
export function endFrame() {
  pressedThisFrame.clear();
}
