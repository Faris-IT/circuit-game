(function (g) {
  const MC = (g.MC = g.MC || {});

  // Sesi permainan: semua aturan puzzle ada di sini, tanpa menyentuh DOM.
  // Mode dapat menambah perilaku lewat hook (init, tick, restart, ...) di MC.Modes[id].
  const Game = {
    s: null,

    start(modeId, index, practice) {
      const mode = MC.Modes[modeId];
      if (mode.prepare) mode.prepare();     // mis. menentukan seed sebelum level dibangun
      const lv = MC.Levels.load(modeId, index);
      this.s = {
        modeId, index, practice: !!practice, rules: mode.rules,
        board: lv.board, size: lv.size, name: lv.name, seed: lv.seed || 0, lv,
        par: lv.par, ideal: lv.ideal, limit: lv.limit || 0, over: false, targets: lv.targets || 1,
        initialRots: lv.board.tiles.map((t) => t.rot),
        moves: 0, hints: 0, history: [], elapsed: 0,
        lastTick: performance.now(), running: true, paused: false, solved: false,
        locked: false,            // true = papan tidak menerima input (mis. fase menghafal)
        errors: 0, hintIdx: -1
      };
      if (mode.init) mode.init(this.s, lv);
      return this.s;
    },

    // Mengganti papan dengan puzzle berikutnya tanpa mengakhiri sesi (Time Attack).
    nextPuzzle(lv) {
      const s = this.s;
      Object.assign(s, {
        board: lv.board, size: lv.size, name: lv.name, lv, par: lv.par, ideal: lv.ideal,
        initialRots: lv.board.tiles.map((t) => t.rot),
        moves: 0, hints: 0, history: [], solved: false, over: false, locked: false, errors: 0, hintIdx: -1,
        running: true, lastTick: performance.now()
      });
    },

    setRunning(v) {
      if (!this.s) return;
      this.s.running = v;
      this.s.lastTick = performance.now();
    },

    // Menambah waktu aktif; mengembalikan delta (ms) saat sesi berjalan (0 jika dijeda/selesai).
    // Waktu main (elapsed) tidak bertambah saat papan terkunci.
    tick(now) {
      const s = this.s;
      if (!s) return 0;
      const dt = now - s.lastTick;
      s.lastTick = now;
      if (!s.running || s.paused || s.solved || s.over) return 0;
      if (!s.locked) s.elapsed += dt;
      return dt;
    },

    rotate(idx) {
      const s = this.s;
      const t = s.board.tiles[idx];
      if (!t || t.locked || s.solved || s.over || s.locked) return false;
      t.rot = (t.rot + 1) % 4;
      s.history.push(idx);
      s.moves++;
      s.hintIdx = -1;
      return true;
    },

    undo() {
      const s = this.s;
      if (!s.rules.undo || !s.history.length || s.solved || s.over || s.locked) return -1;
      const idx = s.history.pop();
      const t = s.board.tiles[idx];
      t.rot = (t.rot + 3) % 4;
      if (s.rules.undoRefund) s.moves = Math.max(0, s.moves - 1);
      else if (s.rules.undoCosts) s.moves++; // undo tidak mengembalikan hitungan gerakan
      s.hintIdx = -1;
      return idx;
    },

    // Restart: papan kembali ke awal, gerakan dihitung ulang; hint dan waktu tetap berjalan.
    restart() {
      const s = this.s;
      s.board.tiles.forEach((t, i) => { t.rot = s.initialRots[i]; });
      s.moves = 0; s.history = []; s.hintIdx = -1; s.solved = false; s.over = false; s.errors = 0;
      const mode = MC.Modes[s.modeId];
      if (mode.restart) mode.restart(s);
    },

    test() {
      const s = this.s;
      const trace = MC.Engine.trace(s.board);
      if (trace.solved) { s.solved = true; s.running = false; }
      else s.errors++;
      return trace;
    },

    hint() {
      const s = this.s;
      if (!s.rules.hint || s.solved || s.over || s.locked) return null;
      const h = MC.Solver.hint(s.board);
      if (!h) return null;
      if (h.idx >= 0) { s.hints++; s.hintIdx = h.idx; }
      return h;
    }
  };
  MC.Game = Game;
})(typeof window !== 'undefined' ? window : globalThis);
