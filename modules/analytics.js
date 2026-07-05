/* modules/analytics.js
   Turns the raw sessionLog into series that Chart.js can plot directly,
   plus a couple of honest, rule-based "insights" (not ML — just math
   over your own history, explained as such). */

export function gamesPerWeek(sessionLog) {
  const buckets = {};
  sessionLog.forEach(s => {
    const d = new Date(s.date);
    const weekStart = new Date(d); weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    buckets[key] = (buckets[key] || 0) + 1;
  });
  const keys = Object.keys(buckets).sort();
  return { labels: keys, values: keys.map(k => buckets[k]) };
}

export function solveTimesOverTime(sessionLog) {
  const wins = sessionLog.filter(s => s.won).slice(0, 20).reverse();
  return { labels: wins.map((s, i) => `Game ${i + 1}`), values: wins.map(s => s.timeSec) };
}

export function difficultyDistribution(sessionLog) {
  const counts = { easy: 0, medium: 0, hard: 0, expert: 0 };
  sessionLog.forEach(s => { counts[s.difficulty] = (counts[s.difficulty] || 0) + 1; });
  return { labels: Object.keys(counts), values: Object.values(counts) };
}

export function winRateTrend(sessionLog) {
  const recent = sessionLog.slice(0, 20).reverse();
  let wins = 0;
  return {
    labels: recent.map((_, i) => `#${i + 1}`),
    values: recent.map((s, i) => { if (s.won) wins++; return Math.round((wins / (i + 1)) * 100); }),
  };
}

export function hintUsageTrend(sessionLog) {
  const recent = sessionLog.slice(0, 20).reverse();
  return { labels: recent.map((_, i) => `#${i + 1}`), values: recent.map(s => s.hintsUsed) };
}

export function personalInsights(data) {
  const s = data.stats;
  const byDiff = s.byDifficulty;
  const best = Object.keys(byDiff).reduce((a, b) => byDiff[a] >= byDiff[b] ? a : b, 'easy');
  const recent = data.sessionLog.slice(0, 10);
  const avgMistakesRecent = recent.length ? +(recent.reduce((a, x) => a + x.mistakes, 0) / recent.length).toFixed(1) : 0;
  const older = data.sessionLog.slice(10, 20);
  const avgMistakesOlder = older.length ? +(older.reduce((a, x) => a + x.mistakes, 0) / older.length).toFixed(1) : null;
  let trend = 'Not enough games yet to compare.';
  if (avgMistakesOlder !== null) {
    if (avgMistakesRecent < avgMistakesOlder) trend = `You're averaging fewer mistakes lately (${avgMistakesRecent} vs ${avgMistakesOlder}) — improving.`;
    else if (avgMistakesRecent > avgMistakesOlder) trend = `Mistakes have crept up recently (${avgMistakesRecent} vs ${avgMistakesOlder}).`;
    else trend = `Mistake rate has been steady at ${avgMistakesRecent} per game.`;
  }
  return { bestDifficulty: best, avgMistakesRecent, trend };
}

/** Rule-based difficulty recommendation — explicitly not a model, just your own average times. */
export function difficultyRecommendation(data) {
  const order = ['easy', 'medium', 'hard', 'expert'];
  const recentByDiff = {};
  data.sessionLog.forEach(s => { (recentByDiff[s.difficulty] = recentByDiff[s.difficulty] || []).push(s); });
  for (let i = order.length - 1; i >= 0; i--) {
    const diff = order[i];
    const games = (recentByDiff[diff] || []).slice(0, 5);
    if (games.length < 3) continue;
    const winRate = games.filter(g => g.won).length / games.length;
    const avgTime = games.reduce((a, g) => a + g.timeSec, 0) / games.length;
    if (winRate >= 0.8 && i < order.length - 1) {
      return { current: diff, suggestion: order[i + 1], avgTimeSec: Math.round(avgTime), estimatedSuccessPct: Math.round(winRate * 100) };
    }
  }
  return null;
}
