/* modules/daily.js
   Same idea as the memory-game daily challenge: a date-seeded puzzle
   so everyone playing that date gets the identical board. There's no
   server here, so "leaderboard" is really just your own history —
   noted plainly in the README rather than oversold as global. */

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const DAILY_DIFFICULTIES = ['easy', 'medium', 'hard'];
export function todaysDifficulty() {
  const key = todayKey();
  let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return DAILY_DIFFICULTIES[h % DAILY_DIFFICULTIES.length];
}

export function recordDailyResult(daily, result) {
  const key = todayKey();
  const alreadyToday = daily.lastCompletedDate === key;
  if (!alreadyToday) {
    const yesterday = new Date(Date.now() - 86400000);
    const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
    daily.streak = (daily.lastCompletedDate === yKey && result.won) ? daily.streak + 1 : (result.won ? 1 : 0);
    daily.lastCompletedDate = key;
    daily.history.unshift({ date: key, won: result.won, timeSec: result.timeSec, mistakes: result.mistakes });
    daily.history = daily.history.slice(0, 60);
  }
  return !alreadyToday;
}
