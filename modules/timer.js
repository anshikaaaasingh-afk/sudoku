/* modules/timer.js */
export class PuzzleTimer {
  constructor(onTick) {
    this.seconds = 0;
    this.onTick = onTick || (() => {});
    this._interval = null;
  }
  start() { if (this._interval) return; this._interval = setInterval(() => { this.seconds++; this.onTick(this.seconds); }, 1000); }
  pause() { clearInterval(this._interval); this._interval = null; }
  resume() { this.start(); }
  reset() { this.pause(); this.seconds = 0; this.onTick(0); }
  static fmt(total) {
    const s = Math.max(0, total);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const mm = String(m).padStart(2, '0'), ss = String(sec).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }
}
