/* modules/levels.js */

// XP required is cumulative; level thresholds match the requested curve.
const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0, name: 'Beginner' },
  { level: 5, xp: 500, name: 'Learner' },
  { level: 10, xp: 1500, name: 'Solver' },
  { level: 20, xp: 4000, name: 'Expert' },
  { level: 35, xp: 9000, name: 'Master' },
  { level: 50, xp: 18000, name: 'Grandmaster' },
];

// Every level between named milestones interpolates linearly so a
// number is always shown, not just at the six milestones.
function xpForLevel(level) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (level >= LEVEL_THRESHOLDS[i].level) {
      const cur = LEVEL_THRESHOLDS[i];
      const next = LEVEL_THRESHOLDS[i + 1];
      if (!next) return cur.xp;
      const span = next.level - cur.level;
      const progress = (level - cur.level) / span;
      return Math.round(cur.xp + (next.xp - cur.xp) * progress);
    }
  }
  return 0;
}

export function levelForXp(totalXp) {
  let level = 1;
  for (let l = 1; l <= 50; l++) { if (totalXp >= xpForLevel(l)) level = l; else break; }
  return level;
}
export function levelName(level) {
  let name = 'Beginner';
  for (const t of LEVEL_THRESHOLDS) if (level >= t.level) name = t.name;
  return name;
}
export function xpProgress(totalXp) {
  const level = levelForXp(totalXp);
  const currentFloor = xpForLevel(level);
  const nextFloor = xpForLevel(Math.min(50, level + 1));
  const span = Math.max(1, nextFloor - currentFloor);
  const pct = level >= 50 ? 100 : Math.round(((totalXp - currentFloor) / span) * 100);
  return { level, name: levelName(level), pct, xpIntoLevel: totalXp - currentFloor, xpToNext: Math.max(0, nextFloor - totalXp) };
}

/** XP awarded for a finished game, per the requested rules. */
export function xpForResult({ won, difficulty, timeSec, hintsUsed, streak }) {
  if (!won) return 5; // small consolation XP for finishing an attempt
  const base = { easy: 40, medium: 70, hard: 110, expert: 160 }[difficulty] || 40;
  const speedBonus = timeSec < 180 ? 30 : timeSec < 360 ? 15 : 0;
  const hintPenalty = hintsUsed * 8;
  const streakBonus = Math.min(50, streak * 5);
  return Math.max(10, base + speedBonus + streakBonus - hintPenalty);
}
