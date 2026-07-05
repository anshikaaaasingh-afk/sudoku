/* modules/statistics.js */

export function computeStats(data) {
  const s = data.stats;
  const winPct = s.gamesPlayed ? Math.round((s.gamesWon / s.gamesPlayed) * 100) : 0;
  const avgSolveSec = s.gamesWon ? Math.round(s.totalSolveTimeSec / s.gamesWon) : 0;
  const avgMistakes = s.gamesPlayed ? +(s.totalMistakes / s.gamesPlayed).toFixed(1) : 0;
  return {
    gamesPlayed: s.gamesPlayed, gamesWon: s.gamesWon, gamesLost: s.gamesLost, winPct,
    byDifficulty: s.byDifficulty, avgSolveSec, fastestSolveSec: s.fastestSolveSec,
    avgMistakes, totalHintsUsed: s.totalHintsUsed,
  };
}

export function recordGameResult(data, result) {
  // result: {won, difficulty, timeSec, mistakes, hintsUsed}
  data.stats.gamesPlayed++;
  if (result.won) {
    data.stats.gamesWon++;
    data.stats.byDifficulty[result.difficulty] = (data.stats.byDifficulty[result.difficulty] || 0) + 1;
    data.stats.totalSolveTimeSec += result.timeSec;
    if (data.stats.fastestSolveSec === null || result.timeSec < data.stats.fastestSolveSec) {
      data.stats.fastestSolveSec = result.timeSec;
    }
  } else {
    data.stats.gamesLost++;
  }
  data.stats.totalMistakes += result.mistakes;
  data.stats.totalHintsUsed += result.hintsUsed;

  data.sessionLog.unshift({ date: new Date().toISOString(), ...result });
  data.sessionLog = data.sessionLog.slice(0, 50);
}
