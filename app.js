/* app.js — orchestrator. Modules stay DOM-agnostic; this file is the
   only place that touches the document. */

import { loadData, saveData, resetAllData } from './modules/storage.js';
import { idx, rc, boxIndex, findConflicts, candidatesFor, cloneGrid } from './modules/board.js';
import { solve, stepSolver } from './modules/solver.js';
import { generatePuzzle } from './modules/generator.js';
import { emptyNotes, toggleNote, autoStripPeerNotes, clearNotesAt } from './modules/notes.js';
import { findNakedSingle, findHiddenSingle, findSmartHint, revealOne } from './modules/hints.js';
import { PuzzleTimer } from './modules/timer.js';
import { levelForXp, levelName, xpProgress, xpForResult } from './modules/levels.js';
import { ACHIEVEMENTS, checkAchievements } from './modules/achievements.js';
import { recordPlay } from './modules/streaks.js';
import { todayKey, todaysDifficulty, recordDailyResult } from './modules/daily.js';
import { computeStats, recordGameResult } from './modules/statistics.js';
import * as Analytics from './modules/analytics.js';
import { THEMES } from './modules/themes.js';
import { playSfx, startMusic, stopMusic } from './modules/sounds.js';

let data = loadData();

/* ---- live game state (not persisted mid-game; resets each puzzle) ---- */
let grid = null, solution = null, givensMask = null, notes = null;
let selectedCell = null, notesMode = false;
let mistakesSet = new Set(), hintsUsedThisGame = 0;
let currentDifficulty = 'easy', isDaily = false, gameActive = false;
let timer = new PuzzleTimer((s) => { document.getElementById('hudTime').textContent = PuzzleTimer.fmt(s); });
let solverGen = null, solvePaused = false, solveTimeoutId = null;

/* ============================================================ toast */
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ============================================================ nav */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.nav === name));
  if (name === 'stats') renderStats();
  if (name === 'achievements') renderAchievements();
  if (name === 'daily') renderDaily();
  if (name === 'settings') renderSettings();
  if (name === 'learn') renderLearn();
}
document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => showScreen(b.dataset.nav)));

function saveState() { saveData(data); }

/* ============================================================ theme + level chip */
function applyTheme() { document.body.setAttribute('data-theme', data.settings.theme); }
function renderLevelChip() {
  const p = xpProgress(data.xp.total);
  document.getElementById('levelChip').textContent = `Lv.${p.level} ${p.name}`;
}

/* ============================================================ difficulty picker */
document.querySelectorAll('#difficultyPicker .pill').forEach(btn => {
  btn.addEventListener('click', () => {
    currentDifficulty = btn.dataset.diff;
    document.querySelectorAll('#difficultyPicker .pill').forEach(b => b.classList.toggle('selected', b === btn));
  });
});

/* ============================================================ NEW GAME */
document.getElementById('newGameBtn').addEventListener('click', () => startNewGame(currentDifficulty, null, false));
document.getElementById('startDailyBtn').addEventListener('click', () => {
  const diff = todaysDifficulty();
  startNewGame(diff, todayKey(), true);
});

function startNewGame(difficulty, seed, dailyFlag) {
  showToast(seed ? 'Loading today\'s puzzle…' : 'Generating puzzle…');
  // generation is synchronous; for expert this can take a little longer, so
  // defer one tick so the toast actually paints first
  setTimeout(() => {
    const { puzzle, solution: sol } = generatePuzzle(difficulty, seed);
    grid = cloneGrid(puzzle);
    solution = sol;
    givensMask = puzzle.map(v => v !== 0);
    notes = emptyNotes();
    selectedCell = null;
    mistakesSet = new Set();
    hintsUsedThisGame = 0;
    currentDifficulty = difficulty;
    isDaily = dailyFlag;
    gameActive = true;

    document.getElementById('hudDifficulty').textContent = difficulty[0].toUpperCase() + difficulty.slice(1);
    document.getElementById('hudMistakes').textContent = '0';
    document.getElementById('hudHints').textContent = '0';
    notesMode = false;
    document.getElementById('notesToggle').textContent = '✏️ Notes: Off';
    document.getElementById('autoCheckToggle').textContent = data.settings.autoCheck ? '✅ Auto-check: On' : '⬜ Auto-check: Off';
    document.getElementById('hintExplanation').style.display = 'none';
    document.getElementById('solverControls').style.display = 'none';

    timer.reset(); timer.start();
    renderBoard();
    showScreen('game');
  }, 30);
}

/* ============================================================ BOARD RENDER */
function renderBoard() {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';
  for (let i = 0; i < 81; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;
    cell.addEventListener('click', () => selectCell(i));
    boardEl.appendChild(cell);
  }
  for (let i = 0; i < 81; i++) updateCellDOM(i);
}

function cellEl(i) { return document.querySelector(`.cell[data-index="${i}"]`); }

function updateCellDOM(i) {
  const el = cellEl(i);
  if (!el) return;
  el.className = 'cell';
  if (givensMask[i]) el.classList.add('given');
  else if (grid[i] !== 0) el.classList.add('user-filled');

  if (grid[i] !== 0) {
    el.textContent = grid[i];
  } else if (notes[i] && notes[i].size) {
    el.innerHTML = '';
    const ng = document.createElement('div');
    ng.className = 'notes-grid';
    for (let n = 1; n <= 9; n++) {
      const span = document.createElement('span');
      span.textContent = notes[i].has(n) ? n : '';
      ng.appendChild(span);
    }
    el.appendChild(ng);
  } else {
    el.textContent = '';
  }
  applyHighlightClasses(i);
}

function applyHighlightClasses(i) {
  const el = cellEl(i);
  if (!el) return;
  if (mistakesSet.has(i)) el.classList.add('error');
  if (selectedCell !== null) {
    if (i === selectedCell) el.classList.add('selected');
    else {
      const [sr, sc] = rc(selectedCell), [r, c] = rc(i);
      if (sr === r || sc === c || boxIndex(sr, sc) === boxIndex(r, c)) el.classList.add('peer');
      if (grid[selectedCell] !== 0 && grid[i] === grid[selectedCell]) el.classList.add('same-number');
    }
  }
}

function refreshAllHighlights() { for (let i = 0; i < 81; i++) applyHighlightClasses(i); }

function selectCell(i) {
  selectedCell = i;
  document.querySelectorAll('.cell').forEach(el => el.classList.remove('selected', 'peer', 'same-number'));
  refreshAllHighlights();
}

/* ============================================================ INPUT */
function placeValue(i, value, opts = {}) {
  if (givensMask[i]) return;
  if (notesMode && value !== 0) {
    toggleNote(notes, i, value);
    updateCellDOM(i);
    return;
  }
  if (value === 0) {
    grid[i] = 0; clearNotesAt(notes, i);
    mistakesSet.delete(i);
  } else {
    grid[i] = value;
    autoStripPeerNotes(notes, i, value);
    if (data.settings.autoCheck) checkCellAgainstSolution(i);
    if (!opts.isHint) playSfx('place', data.settings.soundOn, data.settings.volume);
  }
  updateCellDOM(i);
  refreshAllHighlights();
  checkWinCondition();
}

function checkCellAgainstSolution(i) {
  if (grid[i] === 0) return;
  if (grid[i] !== solution[i]) {
    if (!mistakesSet.has(i)) {
      mistakesSet.add(i);
      document.getElementById('hudMistakes').textContent = mistakesSet.size;
      playSfx('error', data.settings.soundOn, data.settings.volume);
    }
  } else {
    mistakesSet.delete(i);
    document.getElementById('hudMistakes').textContent = mistakesSet.size;
  }
  updateCellDOM(i);
}

document.querySelectorAll('.num-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (selectedCell === null || !gameActive) return;
    placeValue(selectedCell, parseInt(btn.dataset.num, 10));
  });
});

document.addEventListener('keydown', (e) => {
  if (!document.getElementById('screen-game').classList.contains('active')) return;
  if (selectedCell === null && !/Arrow/.test(e.key)) return;
  if (/^[1-9]$/.test(e.key)) { placeValue(selectedCell, parseInt(e.key, 10)); return; }
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { placeValue(selectedCell, 0); return; }
  if (e.key.startsWith('Arrow') && selectedCell !== null) {
    let [r, c] = rc(selectedCell);
    if (e.key === 'ArrowUp') r = (r + 8) % 9;
    if (e.key === 'ArrowDown') r = (r + 1) % 9;
    if (e.key === 'ArrowLeft') c = (c + 8) % 9;
    if (e.key === 'ArrowRight') c = (c + 1) % 9;
    selectCell(idx(r, c));
    e.preventDefault();
  }
});

document.getElementById('notesToggle').addEventListener('click', () => {
  notesMode = !notesMode;
  document.getElementById('notesToggle').textContent = notesMode ? '✏️ Notes: On' : '✏️ Notes: Off';
});
document.getElementById('autoCheckToggle').addEventListener('click', () => {
  data.settings.autoCheck = !data.settings.autoCheck;
  document.getElementById('autoCheckToggle').textContent = data.settings.autoCheck ? '✅ Auto-check: On' : '⬜ Auto-check: Off';
  saveState();
});
document.getElementById('checkPuzzleBtn').addEventListener('click', () => {
  for (let i = 0; i < 81; i++) if (!givensMask[i] && grid[i] !== 0) checkCellAgainstSolution(i);
  refreshAllHighlights();
  showToast('Checked — wrong entries are highlighted');
});

function checkWinCondition() {
  if (grid.every((v, i) => v === solution[i])) finalizeGame(true, 'cleared');
}

/* ============================================================ pause / reset / quit */
let paused = false;
document.getElementById('pauseBtn').addEventListener('click', () => {
  paused = !paused;
  document.getElementById('pauseBtn').textContent = paused ? '▶ Resume' : '⏸ Pause';
  document.getElementById('board').style.visibility = paused ? 'hidden' : 'visible';
  if (paused) timer.pause(); else timer.resume();
});
document.getElementById('resetPuzzleBtn').addEventListener('click', () => {
  if (!confirm('Reset this puzzle back to its starting state?')) return;
  for (let i = 0; i < 81; i++) if (!givensMask[i]) grid[i] = 0;
  notes = emptyNotes();
  mistakesSet = new Set();
  document.getElementById('hudMistakes').textContent = '0';
  renderBoard();
});
document.getElementById('quitBtn').addEventListener('click', () => {
  if (!confirm('Quit this puzzle? Progress on this attempt won\'t be saved.')) return;
  timer.pause(); gameActive = false;
  showScreen('play');
});

/* ============================================================ HINTS */
document.getElementById('basicHintBtn').addEventListener('click', () => {
  const hint = revealOne(grid, solution);
  if (!hint) { showToast('Board is already full'); return; }
  hintsUsedThisGame++;
  document.getElementById('hudHints').textContent = hintsUsedThisGame;
  placeValue(hint.cells[0], hint.value, { isHint: true });
  showToast(`💡 ${hint.message}`);
});

document.getElementById('smartHintBtn').addEventListener('click', () => {
  const hint = findSmartHint(grid);
  const box = document.getElementById('hintExplanation');
  if (!hint) {
    box.style.display = 'block';
    box.innerHTML = `<b>No pattern-based hint found</b><br>Try the basic "Reveal a number" hint instead — this board needs a guess-and-check step our five techniques don't cover.`;
    return;
  }
  hintsUsedThisGame++;
  document.getElementById('hudHints').textContent = hintsUsedThisGame;
  box.style.display = 'block';
  box.innerHTML = `<b>${hint.technique}</b><br>${hint.message}<br><button class="btn-outline btn-sm" style="margin-top:8px;" id="applyHintBtn">Apply this</button>`;
  document.querySelectorAll('.cell').forEach(el => el.classList.remove('hint-target'));
  hint.cells.forEach(i => cellEl(i) && cellEl(i).classList.add('hint-target'));
  document.getElementById('applyHintBtn').addEventListener('click', () => applySmartHint(hint));
});

function applySmartHint(hint) {
  if (hint.action === 'place') {
    placeValue(hint.cells[0], hint.value, { isHint: true });
  } else if (hint.action === 'eliminate') {
    hint.eliminateFrom.forEach(i => { hint.numbers.forEach(n => notes[i].delete(n)); updateCellDOM(i); });
    showToast('Candidates eliminated — check the highlighted cells');
  }
  document.getElementById('hintExplanation').style.display = 'none';
  document.querySelectorAll('.cell').forEach(el => el.classList.remove('hint-target'));
}

/* ============================================================ SOLVER (demo tools, not counted as a win) */
document.getElementById('instantSolveBtn').addEventListener('click', () => {
  if (!confirm('This fills in the full solution instantly and won\'t count toward your stats. Continue?')) return;
  const solved = solve(grid);
  if (!solved) { showToast('This board has no valid solution (shouldn\'t happen — please report)'); return; }
  grid = solved;
  timer.pause(); gameActive = false;
  renderBoard();
  showToast('Solved instantly — this attempt is not recorded in your stats');
});

document.getElementById('stepSolveBtn').addEventListener('click', () => {
  document.getElementById('solverControls').style.display = 'block';
  solverGen = stepSolver(grid);
  solvePaused = false;
  timer.pause();
  advanceSolveStep();
});
function advanceSolveStep() {
  if (solvePaused || !solverGen) return;
  const { value, done } = solverGen.next();
  if (done) {
    document.getElementById('solverControls').style.display = 'none';
    showToast('Animated solve complete — not recorded in your stats');
    gameActive = false;
    return;
  }
  grid[value.cell] = value.value;
  updateCellDOM(value.cell);
  cellEl(value.cell).classList.add('solving');
  const speed = parseInt(document.getElementById('solveSpeed').value, 10);
  const delay = Math.max(12, 420 - speed * 40);
  solveTimeoutId = setTimeout(advanceSolveStep, delay);
}
document.getElementById('solvePauseBtn').addEventListener('click', () => {
  solvePaused = !solvePaused;
  document.getElementById('solvePauseBtn').textContent = solvePaused ? '▶ Resume' : '⏸ Pause';
  if (!solvePaused) advanceSolveStep();
});
document.getElementById('solveStopBtn').addEventListener('click', () => {
  clearTimeout(solveTimeoutId); solverGen = null;
  document.getElementById('solverControls').style.display = 'none';
});

/* ============================================================ FINALIZE GAME */
function finalizeGame(won, reason) {
  timer.pause(); gameActive = false;
  const result = { won, difficulty: currentDifficulty, timeSec: timer.seconds, mistakes: mistakesSet.size, hintsUsed: hintsUsedThisGame };

  recordGameResult(data, result);
  recordPlay(data.streaks);
  const xpGained = xpForResult({ ...result, streak: data.streaks.current });
  data.xp.total += xpGained;
  data.xp.level = levelForXp(data.xp.total);
  const newBadges = checkAchievements(data, result);
  let dailyNote = '';
  if (isDaily) {
    const first = recordDailyResult(data.daily, result);
    dailyNote = first ? ` Daily streak: ${data.daily.streak} 🔥` : ' (already played today)';
  }
  saveState();
  renderLevelChip();

  if (data.settings.soundOn) playSfx(won ? 'victory' : 'error', true, data.settings.volume);

  document.getElementById('resultsTitle').textContent = won ? '🎉 Puzzle solved!' : 'Puzzle ended';
  document.getElementById('resultsSub').textContent = `${currentDifficulty[0].toUpperCase()+currentDifficulty.slice(1)}${isDaily ? ' · Daily Challenge' : ''}.${dailyNote}`;
  document.getElementById('rTime').textContent = PuzzleTimer.fmt(timer.seconds);
  document.getElementById('rMistakes').textContent = mistakesSet.size;
  document.getElementById('rHints').textContent = hintsUsedThisGame;
  document.getElementById('rXpLine').innerHTML = `+${xpGained} XP — Level ${data.xp.level} (${levelName(data.xp.level)})`;
  document.getElementById('rNewBadges').innerHTML = newBadges.length
    ? `<div class="mini-label" style="margin-top:10px;">New badges</div>` + newBadges.map(b => `<div class="hint-box" style="margin-top:6px;">${b.emoji} <b>${b.name}</b></div>`).join('')
    : '';
  document.getElementById('resultsModal').classList.add('active');
}
document.getElementById('resultsPlayAgainBtn').addEventListener('click', () => {
  document.getElementById('resultsModal').classList.remove('active');
  if (isDaily) showScreen('daily'); else startNewGame(currentDifficulty, null, false);
});
document.getElementById('resultsMenuBtn').addEventListener('click', () => {
  document.getElementById('resultsModal').classList.remove('active');
  showScreen('play');
});

/* ============================================================ LEARN */
const LESSONS = [
  { level: 'Beginner', name: 'Naked Single', desc: 'A cell has exactly one legal number left once you rule out everything already in its row, column, and box.' },
  { level: 'Beginner', name: 'Hidden Single', desc: 'A number can only fit in one cell within a row, column, or box — even if that cell has other candidates too.' },
  { level: 'Intermediate', name: 'Naked Pair', desc: 'Two cells in the same unit both have the exact same two candidates. Neither number can go anywhere else in that unit.' },
  { level: 'Intermediate', name: 'Pointing Pair', desc: 'Inside a box, a candidate is confined to one row or column — so it can be ruled out from the rest of that row/column outside the box.' },
  { level: 'Advanced', name: 'Box-Line Reduction', desc: 'The reverse of a pointing pair: a candidate confined to one box within a row or column can be ruled out from the rest of that box.' },
];
function renderLearn() {
  document.getElementById('lessonGrid').innerHTML = LESSONS.map(l => `
    <div class="lesson-card">
      <span class="lesson-level">${l.level}</span>
      <h3>${l.name}</h3>
      <p>${l.desc}</p>
    </div>`).join('') + `
    <div class="lesson-card" style="grid-column:1/-1;">
      <span class="lesson-level">Practice</span>
      <h3>Try it yourself</h3>
      <p>Start any puzzle and click <b>"Explain next move"</b> in the Hints panel — it applies these same five techniques in order and shows you exactly why each one works.</p>
    </div>`;
}

/* ============================================================ DAILY */
function renderDaily() {
  const diff = todaysDifficulty();
  document.getElementById('dailyDesc').textContent = `Today's puzzle: ${diff[0].toUpperCase()+diff.slice(1)} difficulty. Same board for everyone who plays today.`;
  document.getElementById('dailyStreakNum').textContent = data.daily.streak;
  const hist = data.daily.history.slice(0, 10);
  document.getElementById('dailyHistory').innerHTML = hist.length ? hist.map(h =>
    `<div class="history-row"><span>${h.date}</span><span>${h.won ? '✅ ' + PuzzleTimer.fmt(h.timeSec) : '—'}</span></div>`
  ).join('') : `<p class="mini-label" style="text-transform:none;">No daily attempts yet.</p>`;
}

/* ============================================================ STATS / ANALYTICS */
let charts = {};
function renderStats() {
  const s = computeStats(data);
  document.getElementById('statGrid').innerHTML = [
    ['Games Played', s.gamesPlayed], ['Games Won', s.gamesWon], ['Win Rate', s.winPct + '%'],
    ['Avg Solve Time', s.avgSolveSec ? PuzzleTimer.fmt(s.avgSolveSec) : '—'],
    ['Fastest Solve', s.fastestSolveSec !== null ? PuzzleTimer.fmt(s.fastestSolveSec) : '—'],
    ['Avg Mistakes', s.avgMistakes], ['Hints Used', s.totalHintsUsed],
    ['Easy / Med / Hard / Expert', `${s.byDifficulty.easy||0}/${s.byDifficulty.medium||0}/${s.byDifficulty.hard||0}/${s.byDifficulty.expert||0}`],
  ].map(([lbl, val]) => `<div class="stat-box"><div class="num mono">${val}</div><div class="lbl">${lbl}</div></div>`).join('');

  const insight = Analytics.personalInsights(data);
  document.getElementById('insightLine').textContent = `Best difficulty: ${insight.bestDifficulty}. ${insight.trend}`;

  const rec = Analytics.difficultyRecommendation(data);
  const recPanel = document.getElementById('recommendationPanel');
  if (rec) {
    recPanel.style.display = 'block';
    recPanel.innerHTML = `<h2 class="panel-title">🤖 Recommendation</h2>
      <p style="margin:0; font-size:13.5px; color:var(--ink-soft);">
      You're averaging ${PuzzleTimer.fmt(rec.avgTimeSec)} on ${rec.current} with an estimated ${rec.estimatedSuccessPct}% recent success rate.
      Try <b style="color:var(--ink);">${rec.suggestion}</b> next.</p>
      <p style="font-size:11px; color:var(--ink-soft); margin-top:8px;">This is a simple rule based on your last few games, not a prediction model.</p>`;
  } else { recPanel.style.display = 'none'; }

  const styles = getComputedStyle(document.body);
  const ink = styles.getPropertyValue('--ink').trim(), inkSoft = styles.getPropertyValue('--ink-soft').trim(), line = styles.getPropertyValue('--line').trim(), accent = styles.getPropertyValue('--accent').trim();
  const opts = { plugins: { legend: { display: false, labels: { color: inkSoft } } }, scales: { y: { beginAtZero: true, grid: { color: line }, ticks: { color: inkSoft } }, x: { grid: { display: false }, ticks: { color: inkSoft } } } };

  Object.values(charts).forEach(c => c && c.destroy());

  const wk = Analytics.gamesPerWeek(data.sessionLog);
  charts.weekly = new Chart(document.getElementById('chartWeekly'), { type: 'bar', data: { labels: wk.labels, datasets: [{ data: wk.values, backgroundColor: accent, borderRadius: 5 }] }, options: opts });

  const times = Analytics.solveTimesOverTime(data.sessionLog);
  charts.times = new Chart(document.getElementById('chartTimes'), { type: 'line', data: { labels: times.labels, datasets: [{ data: times.values, borderColor: accent, backgroundColor: 'transparent', tension: .3 }] }, options: opts });

  const dist = Analytics.difficultyDistribution(data.sessionLog);
  charts.diff = new Chart(document.getElementById('chartDifficulty'), { type: 'doughnut', data: { labels: dist.labels, datasets: [{ data: dist.values, backgroundColor: ['#33C481', '#2F6FED', '#F2A93B', '#EF5B5B'] }] }, options: { plugins: { legend: { position: 'bottom', labels: { color: inkSoft, boxWidth: 10, font: { size: 11 } } } } } });

  const wr = Analytics.winRateTrend(data.sessionLog);
  charts.wr = new Chart(document.getElementById('chartWinRate'), { type: 'line', data: { labels: wr.labels, datasets: [{ data: wr.values, borderColor: '#33C481', backgroundColor: 'transparent', tension: .3 }] }, options: opts });

  const hu = Analytics.hintUsageTrend(data.sessionLog);
  charts.hu = new Chart(document.getElementById('chartHints'), { type: 'bar', data: { labels: hu.labels, datasets: [{ data: hu.values, backgroundColor: '#F2A93B', borderRadius: 5 }] }, options: opts });
}

/* ============================================================ ACHIEVEMENTS */
function renderAchievements() {
  const tiers = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
  document.getElementById('achievementTiers').innerHTML = tiers.map(tier => {
    const badges = ACHIEVEMENTS.filter(a => a.tier === tier);
    return `<div class="tier-title">${tier}</div><div class="badge-grid">` +
      badges.map(b => `<div class="badge-card ${data.achievementsUnlocked.includes(b.id) ? 'unlocked' : ''}">
        <div class="badge-emoji">${b.emoji}</div><div class="badge-name">${b.name}</div><div class="badge-desc">${b.desc}</div>
      </div>`).join('') + `</div>`;
  }).join('');
}

/* ============================================================ SETTINGS */
function renderSettings() {
  document.getElementById('themePicker').innerHTML = THEMES.map(t =>
    `<button class="pill ${data.settings.theme===t.key?'selected':''}" data-theme-key="${t.key}">${t.label}</button>`).join('');
  document.querySelectorAll('#themePicker .pill').forEach(btn => btn.addEventListener('click', () => {
    data.settings.theme = btn.dataset.themeKey; saveState(); applyTheme();
    document.querySelectorAll('#themePicker .pill').forEach(b => b.classList.toggle('selected', b === btn));
  }));
  document.getElementById('soundToggle').checked = data.settings.soundOn;
  document.getElementById('musicToggle').checked = data.settings.musicOn;
  document.getElementById('volumeSlider').value = Math.round(data.settings.volume * 100);
}
document.getElementById('soundToggle').addEventListener('change', e => { data.settings.soundOn = e.target.checked; saveState(); });
document.getElementById('musicToggle').addEventListener('change', e => {
  data.settings.musicOn = e.target.checked; saveState();
  if (e.target.checked) startMusic(data.settings.volume); else stopMusic();
});
document.getElementById('volumeSlider').addEventListener('input', e => { data.settings.volume = e.target.value / 100; saveState(); });
document.getElementById('notifyBtn').addEventListener('click', async () => {
  if (!('Notification' in window)) { showToast('Notifications aren\'t supported here'); return; }
  const perm = await Notification.requestPermission();
  if (perm === 'granted') { data.settings.notifyEnabled = true; saveState(); showToast('🔔 Reminders enabled'); new Notification('Sudoku Master', { body: 'We\'ll nudge you if you haven\'t played today.' }); }
  else showToast('Notifications were blocked');
});
let playedSomethingToday = false;
setInterval(() => {
  if (!data.settings.notifyEnabled || Notification.permission !== 'granted') return;
  if (new Date().getHours() < 20) return;
  if (playedSomethingToday) return;
  new Notification('Sudoku Master', { body: 'Your daily challenge and streak are waiting 🔥' });
}, 120000);

document.getElementById('resetDataBtn').addEventListener('click', () => {
  if (confirm('This clears all stats, achievements, XP, and settings. Continue?')) { data = resetAllData(); location.reload(); }
});

/* ============================================================ PDF EXPORT */
function buildPdf(title, lines) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text(title, 14, 18);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  let y = 30;
  lines.forEach(line => { if (y > 280) { doc.addPage(); y = 20; } doc.text(line, 14, y); y += 7; });
  return doc;
}
document.getElementById('exportPdfBtn').addEventListener('click', () => {
  const s = computeStats(data);
  const insight = Analytics.personalInsights(data);
  const lines = [
    `Games played: ${s.gamesPlayed}   Won: ${s.gamesWon}   Win rate: ${s.winPct}%`,
    `Avg solve time: ${s.avgSolveSec ? PuzzleTimer.fmt(s.avgSolveSec) : '-'}   Fastest: ${s.fastestSolveSec !== null ? PuzzleTimer.fmt(s.fastestSolveSec) : '-'}`,
    `Avg mistakes per game: ${s.avgMistakes}   Total hints used: ${s.totalHintsUsed}`,
    `By difficulty — Easy: ${s.byDifficulty.easy||0}, Medium: ${s.byDifficulty.medium||0}, Hard: ${s.byDifficulty.hard||0}, Expert: ${s.byDifficulty.expert||0}`,
    '', `Best difficulty: ${insight.bestDifficulty}`, insight.trend,
    '', `Level: ${data.xp.level} (${levelName(data.xp.level)})   Total XP: ${data.xp.total}`,
    `Current streak: ${data.streaks.current} days   Longest streak: ${data.streaks.longest} days`,
  ];
  buildPdf('Sudoku Master — Analytics Report', lines).save('sudoku-analytics-report.pdf');
  showToast('📄 Report exported');
});
document.getElementById('exportHistoryBtn').addEventListener('click', () => {
  const lines = data.sessionLog.slice(0, 40).map(s =>
    `${new Date(s.date).toLocaleDateString()} — ${s.difficulty}, ${s.won ? 'won' : 'lost'} in ${PuzzleTimer.fmt(s.timeSec)}, ${s.mistakes} mistake(s), ${s.hintsUsed} hint(s)`);
  buildPdf('Sudoku Master — Game History', lines.length ? lines : ['No games played yet.']).save('sudoku-game-history.pdf');
  showToast('📄 History exported');
});

/* ============================================================ INIT */
function init() {
  applyTheme();
  renderLevelChip();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
init();
