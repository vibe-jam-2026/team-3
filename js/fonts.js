// Arcade-style fonts (loaded from Google Fonts in index.html).
//   ARCADE: chunky 8-bit capitals for titles, the HUD, banners and buttons
//   PIXEL:  a taller, easier-to-read pixel font for longer and smaller text
// The fallbacks keep everything readable if the fonts can't load (e.g. offline).
export const ARCADE = '"Press Start 2P", "Courier New", monospace';
export const PIXEL = '"VT323", "Courier New", monospace';

export const arcade = (px) => `${px}px ${ARCADE}`;
export const pixel = (px) => `${px}px ${PIXEL}`;
