/* modules/storage.js
   Single source of truth for the saved-data shape. Every other module
   reads/writes through here. */

const KEY = 'sudokuMaster_v1';

export function defaultData() {
  return {
    settings: {
      theme: 'dark',           // light | dark | neon | matrix | cyberpunk | minimalist | retro
      soundOn: true,
      musicOn: false,
      volume: 0.6,
      notifyEnabled: false,
      autoCheck: true,
    },
    xp: { total: 0, level: 1 },
    stats: {
      gamesPlayed: 0, gamesWon: 0, gamesLost: 0,
      byDifficulty: { easy: 0, medium: 0, hard: 0, expert: 0 },
      totalSolveTimeSec: 0, fastestSolveSec: null,
      totalMistakes: 0, totalHintsUsed: 0,
    },
    achievementsUnlocked: [],
    streaks: { current: 0, longest: 0, lastPlayDate: null, weekly: 0, monthly: 0 },
    daily: { lastCompletedDate: null, streak: 0, history: [] }, // history: [{date, won, timeSec, mistakes}]
    sessionLog: [], // last 50 games: {date, difficulty, won, timeSec, mistakes, hintsUsed}
  };
}

export function loadData() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw);
    const base = defaultData();
    return {
      ...base, ...parsed,
      settings: { ...base.settings, ...parsed.settings },
      xp: { ...base.xp, ...parsed.xp },
      stats: { ...base.stats, ...parsed.stats, byDifficulty: { ...base.stats.byDifficulty, ...(parsed.stats && parsed.stats.byDifficulty) } },
      streaks: { ...base.streaks, ...parsed.streaks },
      daily: { ...base.daily, ...parsed.daily },
    };
  } catch (e) { return defaultData(); }
}

export function saveData(data) { localStorage.setItem(KEY, JSON.stringify(data)); }
export function resetAllData() { localStorage.removeItem(KEY); return defaultData(); }
