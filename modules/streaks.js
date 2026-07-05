/* modules/streaks.js
   Tracks consecutive-day play streaks, plus rolling weekly/monthly
   counts. Called once per completed game. */

function dateKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function daysBetween(a, b) { return Math.round((b - a) / 86400000); }

export function recordPlay(streaks) {
  const today = new Date();
  const todayStr = dateKey(today);
  if (streaks.lastPlayDate === todayStr) return streaks; // already counted today

  if (streaks.lastPlayDate) {
    const last = new Date(streaks.lastPlayDate);
    const gap = daysBetween(last, today);
    streaks.current = gap === 1 ? streaks.current + 1 : 1;
  } else {
    streaks.current = 1;
  }
  streaks.longest = Math.max(streaks.longest, streaks.current);
  streaks.lastPlayDate = todayStr;
  streaks.weekly = (streaks.weekly || 0) + 1;
  streaks.monthly = (streaks.monthly || 0) + 1;
  return streaks;
}
