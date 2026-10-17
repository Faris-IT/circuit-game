(function () {
  const MC = window.MC;
  const { Game, UI, BoardView, Storage, Scoring, Achievements } = MC;
  const $ = UI.$;

  let modeId = null;      // mode yang sedang dipilih
  let practice = false;
  let lastResult = null;
  let flowTimer = null;
  let saveCounter = 0;

  const reduce = () => Storage.data.settings.reduceMotion;
  const inGame = () => UI.current() === 'game' && !!Game.s;

  function applySettings() {
    document.documentElement.classList.toggle('reduce-motion', reduce());
  }

  /* ---------- navigasi ---------- */
  function toMenu() { stopTimer(); UI.renderMenuFoot(); UI.show('menu'); }
  function toModes() { stopTimer(); UI.renderModes(); UI.show('modes'); }
  function toLevels() {
    stopTimer();
    UI.renderLevels(modeId);
    $('practice-toggle').checked = practice;
    UI.show('levels');
  }

  /* ---------- timer ---------- */
  let timer = null;
  function startTimer() {
    stopTimer();
    timer = setInterval(() => {
      if (!inGame()) return;
      const dt = Game.tick(performance.now());
      if (dt && !Game.s.practice) Storage.data.stats.totalTimeMs += dt;
      UI.setTime(Game.s.elapsed);
      if (++saveCounter % 20 === 0) Storage.save();
    }, 250);
  }
  function stopTimer() { clearInterval(timer); timer = null; clearTimeout(flowTimer); }

  /* ---------- permainan ---------- */
  function startLevel(id, index) {
    modeId = id;
    clearTimeout(flowTimer);
    const s = Game.start(id, index, practice);
    const cfg = MC.Config.MODES.find((m) => m.id === id);
    UI.setGameHeader(cfg.name, (practice ? 'Latihan · ' : '') + 'Level ' + (index + 1) + ' · ' + s.size + '×' + s.size);
    BoardView.mount($('board'), s.board, onTile);
    UI.setHud(s);
    UI.status('Putar ubin, lalu tekan TEST CIRCUIT.');
    UI.show('game');
    if (!practice) {
      const st = Storage.data.stats;
      st.modePlays[id] = (st.modePlays[id] || 0) + 1;
      Storage.save();
    }
    startTimer();
    const mode = MC.Modes[id];
    if (mode.tutorial && !Storage.data.tutorialSeen[id]) {
      Game.setRunning(false);
      const done = () => { Storage.data.tutorialSeen[id] = true; Storage.save(); Game.setRunning(true); };
      UI.tutorial(mode, done);
    }
  }

  function onTile(idx) {
    const s = Game.s;
    if (!s || s.solved || s.paused) return;
    const t = s.board.tiles[idx];
    if (t.locked) {
      UI.status(t.type === 'cross' ? 'Persimpangan menghubungkan 4 arah, tidak perlu diputar.' : 'Ubin ini terkunci.');
      return;
    }
    if (Game.rotate(idx)) {
      BoardView.rotateTile(idx, 1);
      BoardView.clearFlow(); BoardView.clearHint();
      if (!s.practice) Storage.data.stats.totalMoves++;
      UI.setHud(s);
      UI.status('');
    }
  }

  function doUndo() {
    if (!inGame() || UI.modalOpen()) return;
    const idx = Game.undo();
    if (idx >= 0) {
      BoardView.rotateTile(idx, -1);
      BoardView.clearFlow(); BoardView.clearHint();
      UI.setHud(Game.s);
      UI.status('Satu langkah dikembalikan.');
    }
  }

  function doRestart() {
    if (!inGame() || UI.modalOpen()) return;
    clearTimeout(flowTimer);
    Game.restart();
    BoardView.reset();
    UI.setHud(Game.s);
    UI.status('Level diulang dari awal.');
  }

  function doHint() {
    if (!inGame() || UI.modalOpen() || Game.s.solved) return;
    const h = Game.hint();
    if (!h) { UI.status('Tidak ada hint yang tersedia.'); return; }
    if (h.idx < 0) { UI.status('Sirkuit sudah benar — tekan TEST CIRCUIT.', 'ok'); return; }
    if (!Game.s.practice) Storage.data.stats.hintsUsed++;
    BoardView.markHint(h.idx);
    UI.setHud(Game.s);
    UI.status('Putar ubin yang menyala kuning sebanyak ' + h.clicks + '×.');
  }

  function doTest() {
    if (!inGame() || UI.modalOpen() || Game.s.solved) return;
    const trace = Game.test();
    BoardView.clearHint();
    BoardView.flow(trace, reduce());
    if (trace.solved) {
      UI.status('Energi mengalir ke Target!', 'ok');
      const wait = reduce() ? 300 : 300 + Math.max(...trace.powered.values()) * 70 + 400;
      flowTimer = setTimeout(finishLevel, wait);
    } else {
      BoardView.markErrors(trace.leaks);
      const n = trace.leaks.length;
      UI.status(n ? 'Energi bocor di ' + n + ' titik (ditandai merah).' : 'Energi tidak mengalir keluar dari Source.', 'bad');
    }
  }

  function finishLevel() {
    const s = Game.s;
    const base = { moves: s.moves, hints: s.hints, timeMs: Math.round(s.elapsed), par: s.par, size: s.size };
    const ev = Scoring.evaluate(base);
    const res = Object.assign({}, base, ev, { practice: s.practice, newAch: [], best: ev.score });
    const total = MC.Levels.count(s.modeId);
    res.hasNext = s.index + 1 < total;

    if (!s.practice) {
      const st = Storage.data.stats;
      st.levelsCompleted++;
      const prog = (Storage.data.progress[s.modeId] = Storage.data.progress[s.modeId] || { levels: {} });
      const prev = prog.levels[s.index];
      const rec = prev
        ? { stars: Math.max(prev.stars, ev.stars), moves: Math.min(prev.moves || Infinity, res.moves), timeMs: Math.min(prev.timeMs || Infinity, res.timeMs), score: Math.max(prev.score, ev.score) }
        : { stars: ev.stars, moves: res.moves, timeMs: res.timeMs, score: ev.score };
      prog.levels[s.index] = rec;
      res.best = rec.score;
      st.modeBest[s.modeId] = Math.max(st.modeBest[s.modeId] || 0, ev.score);
      res.newAch = Achievements.check({ modeId: s.modeId, completed: true, result: res });
    }
    Storage.save();
    lastResult = res;
    UI.renderResult(res);
    UI.show('result');
  }

  function doPause() {
    if (!inGame() || UI.modalOpen() || Game.s.solved) return;
    const s = Game.s;
    s.paused = true; BoardView.setPaused(true);
    UI.pause(() => { s.paused = false; s.lastTick = performance.now(); BoardView.setPaused(false); });
  }

  function doLeave() {
    if (!inGame()) { toLevels(); return; }
    if (Game.s.moves > 0 && !Game.s.solved) {
      UI.confirm('Keluar dari level?', 'Progres level ini akan hilang.', 'Keluar', () => { Storage.save(); toLevels(); });
    } else toLevels();
  }

  function escape() {
    if (UI.modalOpen()) { UI.closeTop(); return; }
    if (inGame()) doPause();
  }

  /* ---------- aksi tombol ---------- */
  const actions = {
    play: toModes,
    daily() { UI.toast('Daily Circuit hadir di Tahap 4 pengembangan.'); },
    achievements() { UI.renderAchievements(); UI.show('achievements'); },
    stats() { UI.renderStats(); UI.show('stats'); },
    settings() { UI.renderSettings(); UI.show('settings'); },
    'to-menu': toMenu,
    'to-modes': toModes,
    'to-levels': toLevels,
    'pick-mode'(el) { modeId = el.dataset.mode; toLevels(); },
    'pick-level'(el) { practice = $('practice-toggle').checked; startLevel(modeId, +el.dataset.index); },
    test: doTest, undo: doUndo, restart: doRestart, hint: doHint, pause: doPause, leave: doLeave,
    next() { startLevel(Game.s.modeId, Game.s.index + 1); },
    retry() { startLevel(Game.s.modeId, Game.s.index); },
    'reset-data'() {
      UI.confirm('Hapus semua progres?', 'Skor, bintang, statistik, dan achievement akan dihapus dari perangkat ini.', 'Hapus', () => {
        Storage.reset(); applySettings(); UI.renderSettings(); UI.toast('Progres dihapus.');
      });
    }
  };

  function init() {
    Storage.load();
    applySettings();
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (!el || el.disabled) return;
      const fn = actions[el.dataset.action];
      if (fn) fn(el);
    });
    $('set-motion').addEventListener('change', (e) => {
      Storage.data.settings.reduceMotion = e.target.checked; Storage.save(); applySettings();
    });
    $('practice-toggle').addEventListener('change', (e) => { practice = e.target.checked; });
    MC.Input.init({ inGame, escape, test: doTest, undo: doUndo, restart: doRestart, hint: doHint });
    document.addEventListener('visibilitychange', () => {
      Storage.save();
      if (document.hidden && inGame() && !Game.s.solved && !UI.modalOpen()) doPause();
    });
    window.addEventListener('pagehide', () => Storage.save());
    window.addEventListener('error', (e) => { UI.toast('Terjadi kesalahan: ' + e.message); });
    toMenu();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
