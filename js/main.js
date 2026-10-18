(function () {
  const MC = window.MC;
  const { Game, UI, BoardView, Storage, Scoring, Achievements } = MC;
  const $ = UI.$;

  let modeId = null;      // mode yang sedang dipilih
  let practice = false;
  let flowTimer = null;
  let saveCounter = 0;
  let timer = null;

  const reduce = () => Storage.data.settings.reduceMotion;
  const inGame = () => UI.current() === 'game' && !!Game.s;
  const modeOf = () => MC.Modes[Game.s.modeId];

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
  // Mode "single" (Daily, Time Attack) tidak punya daftar level.
  function backToList() {
    if (MC.Modes[modeId] && MC.Modes[modeId].single) toModes(); else toLevels();
  }

  /* ---------- timer ---------- */
  function startTimer() {
    stopTimer();
    timer = setInterval(() => {
      if (!inGame()) return;
      const s = Game.s;
      const dt = Game.tick(performance.now());
      if (dt) {
        if (!s.practice && !s.locked) Storage.data.stats.totalTimeMs += dt;
        const m = modeOf();
        if (m.tick) m.tick(s, dt);
      }
      if (inGame()) UI.setHud(Game.s);
      if (++saveCounter % 100 === 0) Storage.save();
    }, 100);
  }
  function stopTimer() { clearInterval(timer); timer = null; clearTimeout(flowTimer); }

  /* ---------- permainan ---------- */
  function mountBoard(s) {
    BoardView.mount($('board'), s.board, onTile);
    $('btn-undo').disabled = !s.rules.undo;
    $('btn-hint').disabled = !s.rules.hint;
    const m = MC.Modes[s.modeId];
    if (m.header) $('g-level').textContent = m.header(s);   // mis. nomor puzzle Time Attack
    const legend = $('g-legend');
    legend.hidden = !m.legend;
    legend.textContent = m.legend || '';
    UI.setHud(s);
    UI.status(s.limit ? 'Batas ' + s.limit + ' gerakan. Putar ubin, lalu tekan TEST CIRCUIT.' : 'Putar ubin, lalu tekan TEST CIRCUIT.');
    if (m.afterMount) m.afterMount(s, Ctl);
  }

  function startLevel(id, index) {
    modeId = id;
    clearTimeout(flowTimer);
    const s = Game.start(id, index, practice);
    const m = MC.Modes[id];
    const cfg = MC.Config.MODES.find((x) => x.id === id);
    UI.setGameHeader(cfg.name, m.header ? m.header(s) : (practice ? 'Latihan · ' : '') + 'Level ' + (index + 1) + ' · ' + s.size + '×' + s.size);
    mountBoard(s);
    UI.show('game');
    if (!practice) {
      const st = Storage.data.stats;
      st.modePlays[id] = (st.modePlays[id] || 0) + 1;
      Storage.save();
    }
    startTimer();
    if (m.tutorial && !Storage.data.tutorialSeen[id]) {
      Game.setRunning(false);
      const done = () => { Storage.data.tutorialSeen[id] = true; Storage.save(); Game.setRunning(true); };
      UI.tutorial(m, done);
    }
  }

  function startDaily() {
    modeId = 'daily';
    const key = MC.Daily.key();
    const rec = Storage.data.daily[key];
    if (rec) {
      UI.modal({
        title: 'Daily Circuit hari ini sudah selesai',
        body: 'Hasil resmi: ' + '★'.repeat(rec.stars) + ' · ' + rec.moves + ' gerakan · ' + Scoring.formatTime(rec.timeMs) +
          '. Latihan ulang boleh dilakukan dan tidak mengubah hasil terbaik.',
        buttons: [
          { label: 'Kembali' },
          { label: 'Latihan ulang', kind: 'primary', onClick: () => { practice = true; startLevel('daily', 0); } }
        ]
      });
      return;
    }
    practice = false;
    startLevel('daily', 0);
  }

  function onTile(idx) {
    const s = Game.s;
    if (!s || s.solved || s.over || s.paused || s.locked) return;
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
      afterMove();
    }
  }

  // Mode dengan batas gerakan: peringatan di sisa 2 gerakan, uji otomatis saat gerakan habis.
  function afterMove() {
    const s = Game.s;
    if (!s.limit || s.solved) return;
    const left = s.limit - s.moves;
    if (left > 0) { if (left <= 2) UI.status('Sisa ' + left + ' gerakan!', 'bad'); return; }
    const trace = Game.test();
    BoardView.flow(trace, reduce());
    if (trace.solved) { winFlow(trace); return; }
    s.over = true; s.running = false;
    BoardView.markErrors(trace.leaks);
    UI.status('Gerakan habis!', 'bad');
    flowTimer = setTimeout(() => showLoss('Gerakan habis', 'Sirkuit belum tersambung sebelum batas ' + s.limit + ' gerakan terpakai. Coba rencanakan jalurnya lebih dulu.'), reduce() ? 300 : 900);
  }

  function showLoss(title, body) {
    const s = Game.s;
    UI.modal({
      title, body, cancelable: false,
      buttons: [
        { label: 'Kembali', onClick: backToList },
        { label: 'Coba lagi', kind: 'primary', onClick: () => startLevel(s.modeId, s.index) }
      ]
    });
  }

  function doUndo() {
    if (!inGame() || UI.modalOpen()) return;
    const s = Game.s;
    if (!s.rules.undo) { UI.status('Undo tidak tersedia di mode ini.'); return; }
    const idx = Game.undo();
    if (idx >= 0) {
      BoardView.rotateTile(idx, -1);
      BoardView.clearFlow(); BoardView.clearHint();
      UI.setHud(s);
      UI.status(s.rules.undoCosts ? 'Undo dihitung sebagai satu gerakan.' : 'Satu langkah dikembalikan.');
      afterMove();
    }
  }

  function doRestart() {
    if (!inGame() || UI.modalOpen()) return;
    clearTimeout(flowTimer);
    const s = Game.s;
    Game.restart();            // memanggil mode.restart(s) bila ada
    BoardView.reset();
    BoardView.setMask(null);
    UI.setHud(s);
    UI.status('Level diulang dari awal.');
    const m = modeOf();
    if (m.afterMount) m.afterMount(s, Ctl);
  }

  function doHint() {
    if (!inGame() || UI.modalOpen() || Game.s.solved) return;
    if (!Game.s.rules.hint) { UI.status('Hint dimatikan di mode ini.'); return; }
    const h = Game.hint();
    if (!h) { UI.status('Tidak ada hint yang tersedia.'); return; }
    if (h.idx < 0) { UI.status('Sirkuit sudah benar — tekan TEST CIRCUIT.', 'ok'); return; }
    if (!Game.s.practice) Storage.data.stats.hintsUsed++;
    BoardView.markHint(h.idx);
    UI.setHud(Game.s);
    UI.status('Putar ubin yang menyala kuning sebanyak ' + h.clicks + '×.');
  }

  function doTest() {
    if (!inGame() || UI.modalOpen()) return;
    const s = Game.s, m = modeOf();
    if (s.solved || s.over) return;
    if (s.locked) { if (m.skip) m.skip(s, Ctl); return; }   // mis. Enter mengakhiri fase menghafal
    const trace = Game.test();
    BoardView.clearHint();
    BoardView.flow(trace, reduce());
    if (trace.solved) {
      if (m.onSolved) m.onSolved(s);
      if (m.run) runSolved(trace); else winFlow(trace);
      return;
    }
    BoardView.markErrors(trace.leaks.concat(trace.wrong || []));
    const n = trace.leaks.length;
    let msg = n ? 'Energi bocor di ' + n + ' titik (ditandai merah).' : 'Energi tidak mengalir keluar dari Source.';
    if (trace.wrong && trace.wrong.length) msg = 'Warna salah di ' + trace.wrong.length + ' target (garis putus merah). ' + (n ? msg : '');
    else if (trace.targets.length > 1) msg = trace.targetsOn.length + ' dari ' + trace.targets.length + ' target menyala. ' + msg;
    UI.status(msg, 'bad');
    if (m.onFail) m.onFail(s, trace, Ctl);
  }

  function winFlow(trace) {
    UI.status(trace.targets.length > 1 ? 'Semua target menyala!' : 'Energi mengalir ke Target!', 'ok');
    const wait = reduce() ? 300 : 300 + Math.max(...trace.powered.values()) * 70 + 400;
    flowTimer = setTimeout(finishLevel, wait);
  }

  // Menyimpan hasil level ke progres (mode tanpa record khusus).
  function genericRecord(s, res, ev) {
    const prog = (Storage.data.progress[s.modeId] = Storage.data.progress[s.modeId] || { levels: {} });
    const prev = prog.levels[s.index];
    const rec = prev
      ? { stars: Math.max(prev.stars, ev.stars), moves: Math.min(prev.moves || Infinity, res.moves), timeMs: Math.min(prev.timeMs || Infinity, res.timeMs), score: Math.max(prev.score, ev.score) }
      : { stars: ev.stars, moves: res.moves, timeMs: res.timeMs, score: ev.score };
    prog.levels[s.index] = rec;
    res.best = rec.score;
    const st = Storage.data.stats;
    st.modeBest[s.modeId] = Math.max(st.modeBest[s.modeId] || 0, ev.score);
  }

  function finishLevel() {
    const s = Game.s, m = modeOf();
    const base = { moves: s.moves, hints: s.hints, timeMs: Math.round(s.elapsed), par: s.par, size: s.size };
    const ev = Scoring.evaluate(base);
    const res = Object.assign({}, base, ev, { practice: s.practice, newAch: [], best: ev.score });
    res.hasNext = !m.single && s.index + 1 < MC.Levels.count(s.modeId);

    if (!s.practice) {
      Storage.data.stats.levelsCompleted++;
      if (m.record) m.record(s, res, Storage.data); else genericRecord(s, res, ev);
      res.newAch = Achievements.check({ modeId: s.modeId, completed: true, result: res });
    }
    if (s.modeId === 'daily') practice = true;     // percobaan berikutnya hanya latihan
    Storage.save();
    UI.renderResult(res);
    UI.show('result');
  }

  /* ---------- Time Attack: satu sesi berisi banyak puzzle ---------- */
  function runSolved(trace) {
    const s = Game.s, m = modeOf();
    const pts = m.award(s);
    if (!s.practice) { Storage.data.stats.levelsCompleted++; Storage.save(); }
    s.locked = true;
    UI.status('+' + pts + ' poin!', 'ok');
    UI.setHud(s);
    flowTimer = setTimeout(() => {
      if (!inGame() || s.over) return;
      Game.nextPuzzle(m.next(s));
      mountBoard(s);
      UI.status('Puzzle berikutnya!');
    }, reduce() ? 250 : 550);
  }

  function endRun() {
    const s = Game.s, m = modeOf(), run = s.run;
    s.over = true; s.running = false; clearTimeout(flowTimer);
    const stars = run.solved >= 10 ? 3 : run.solved >= 6 ? 2 : run.solved >= 3 ? 1 : 0;
    const res = {
      run: true, title: 'Waktu habis!', stars, score: run.score, solved: run.solved, moves: run.moves,
      timeMs: m.duration, hints: 0, ideal: 0, practice: false, newAch: [], best: run.score, hasNext: false, quick: false
    };
    if (run.solved > 0) {
      m.record(s, res, Storage.data);
      res.newAch = Achievements.check({ modeId: s.modeId, completed: true, result: res });
    }
    Storage.save();
    UI.renderResult(res);
    UI.show('result');
  }

  function doPause() {
    if (!inGame() || UI.modalOpen() || Game.s.solved || Game.s.over) return;
    const s = Game.s;
    s.paused = true; BoardView.setPaused(true);
    UI.pause(() => { s.paused = false; s.lastTick = performance.now(); BoardView.setPaused(false); });
  }

  function doLeave() {
    if (!inGame()) { backToList(); return; }
    const s = Game.s;
    if (s.moves > 0 && !s.solved && !s.over) {
      UI.confirm('Keluar dari level?', 'Progres level ini akan hilang.', 'Keluar', () => { Storage.save(); backToList(); });
    } else backToList();
  }

  function escape() {
    if (UI.modalOpen()) { UI.closeTop(); return; }
    if (inGame()) doPause();
  }

  // Jembatan untuk hook mode (hanya yang dibutuhkan mode).
  const Ctl = { endRun, showLoss, status: (m, k) => UI.status(m, k), reduce };
  MC.Ctl = Ctl;

  /* ---------- aksi tombol ---------- */
  const actions = {
    play: toModes,
    daily() { startDaily(); },
    achievements() { UI.renderAchievements(); UI.show('achievements'); },
    stats() { UI.renderStats(); UI.show('stats'); },
    settings() { UI.renderSettings(); UI.show('settings'); },
    'to-menu': toMenu,
    'to-modes': toModes,
    'to-levels'() { if (Game.s) modeId = Game.s.modeId; backToList(); },
    'pick-mode'(el) {
      modeId = el.dataset.mode;
      if (modeId === 'daily') { startDaily(); return; }
      practice = false;   // status latihan (mis. setelah Daily) tidak boleh terbawa ke mode lain
      if (MC.Modes[modeId].single) { startLevel(modeId, 0); return; }
      toLevels();
    },
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
      if (document.hidden && inGame() && !Game.s.solved && !Game.s.over && !UI.modalOpen()) doPause();
    });
    window.addEventListener('pagehide', () => Storage.save());
    window.addEventListener('error', (e) => { UI.toast('Terjadi kesalahan: ' + e.message); });
    toMenu();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
