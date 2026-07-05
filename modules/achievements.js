/* modules/achievements.js */

export const ACHIEVEMENTS = [
  // Beginner
  { id: 'first_game', tier: 'Beginner', name: 'First Game', emoji: '🎮', desc: 'Play your first puzzle' },
  { id: 'first_win', tier: 'Beginner', name: 'First Win', emoji: '🏆', desc: 'Solve your first puzzle' },
  { id: 'first_hint', tier: 'Beginner', name: 'First Hint', emoji: '💡', desc: 'Use a hint for the first time' },
  // Intermediate
  { id: 'five_wins', tier: 'Intermediate', name: '5 Wins', emoji: '⭐', desc: 'Solve 5 puzzles' },
  { id: 'ten_wins', tier: 'Intermediate', name: '10 Wins', emoji: '🌟', desc: 'Solve 10 puzzles' },
  { id: 'easy_under_5', tier: 'Intermediate', name: 'Quick Study', emoji: '⚡', desc: 'Solve Easy in under 5 minutes' },
  // Advanced
  { id: 'hard_solved', tier: 'Advanced', name: 'Hard Mode', emoji: '🔥', desc: 'Solve a Hard puzzle' },
  { id: 'no_mistakes', tier: 'Advanced', name: 'Flawless', emoji: '✨', desc: 'Solve a puzzle with zero mistakes' },
  { id: 'no_hints', tier: 'Advanced', name: 'All Me', emoji: '💪', desc: 'Solve a puzzle without any hints' },
  // Expert
  { id: 'fifty_wins', tier: 'Expert', name: '50 Wins', emoji: '🏅', desc: 'Solve 50 puzzles' },
  { id: 'hundred_wins', tier: 'Expert', name: '100 Wins', emoji: '👑', desc: 'Solve 100 puzzles' },
  { id: 'expert_solver', tier: 'Expert', name: 'Expert Solver', emoji: '🧠', desc: 'Solve an Expert puzzle' },
];

/** result: {won, difficulty, timeSec, mistakes, hintsUsed} */
export function checkAchievements(data, result) {
  const unlocked = new Set(data.achievementsUnlocked);
  const newly = [];
  const unlock = (id) => { if (!unlocked.has(id)) { unlocked.add(id); newly.push(id); } };

  unlock('first_game');
  if (result.hintsUsed > 0) unlock('first_hint');
  if (result.won) {
    unlock('first_win');
    if (data.stats.gamesWon >= 5) unlock('five_wins');
    if (data.stats.gamesWon >= 10) unlock('ten_wins');
    if (data.stats.gamesWon >= 50) unlock('fifty_wins');
    if (data.stats.gamesWon >= 100) unlock('hundred_wins');
    if (result.difficulty === 'easy' && result.timeSec < 300) unlock('easy_under_5');
    if (result.difficulty === 'hard') unlock('hard_solved');
    if (result.difficulty === 'expert') unlock('expert_solver');
    if (result.mistakes === 0) unlock('no_mistakes');
    if (result.hintsUsed === 0) unlock('no_hints');
  }
  data.achievementsUnlocked = Array.from(unlocked);
  return newly.map(id => ACHIEVEMENTS.find(a => a.id === id));
}
