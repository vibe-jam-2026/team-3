// Highscore list: the best runs, ranked by highest wave cleared.
// Each entry has two 3-character names (one per player).
// Stored in this browser's localStorage (GitHub Pages has no server), so the list
// belongs to the computer the game is played on.

const KEY = 'tethered-highscores';
export const MAX_ENTRIES = 10;

export function loadScores() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveScores(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage blocked */ }
}

/** Best first: most waves cleared, then most kills, then fastest time. */
function compare(a, b) {
  return b.wave - a.wave || b.kills - a.kills || a.time - b.time;
}

/** Clean a name: letters/digits only, upper case, exactly up to 3 characters. */
export function cleanName(s) {
  const n = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
  return n || '???';
}

/**
 * Add a run. Returns { list, rank } where rank is the 0-based position in the
 * top list, or -1 if it didn't make the top MAX_ENTRIES.
 */
export function addScore({ p1, p2, wave, kills, time }) {
  const entry = {
    p1: cleanName(p1), p2: cleanName(p2),
    wave, kills, time: Math.round(time),
    date: new Date().toISOString().slice(0, 10),
    id: Date.now() + Math.random(),
  };
  const list = loadScores().concat(entry).sort(compare).slice(0, MAX_ENTRIES);
  saveScores(list);
  return { list, rank: list.findIndex((e) => e.id === entry.id) };
}

export function bestScore() {
  return loadScores().sort(compare)[0] || null;
}
