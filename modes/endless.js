(function (g) {
  const MC = (g.MC = g.MC || {});
  const LIVES = 3;
  const ctx = { seed: 1, solved: 0 };   // kesulitan ditentukan jumlah puzzle yang sudah selesai

  const sizeFor = (k) => (k < 3 ? 4 : k < 6 ? 5 : k < 10 ? 6 : 7);

  function make(n) {
    const k = ctx.solved, size = sizeFor(k);
    const blockers = 0.1 + Math.min(0.12, k * 0.01);
    const multi = k >= 8 && k % 3 === 2;
    const targets = k >= 14 ? 3 : 2;
    let board = null;
    for (let a = 0; a < 8 && !board; a++) {
      const seed = ctx.seed + n * 7919 + a * 101;
      try {
        board = multi
          ? MC.Generator.generateMulti({ rows: size, cols: size, targets, seed, blockers })
          : MC.Generator.generate({ rows: size, cols: size, seed, blockers });
      } catch (e) { board = null; }
    }
    if (!board) throw new Error('Endless gagal membuat puzzle');
    const lv = MC.Levels.finish(board, { size, name: 'Puzzle ' + (n + 1), kind: 'generated', targets: multi ? targets : 1 });
    const slack = Math.max(0.2, 0.6 - 0.03 * k);
    lv.limit = lv.par + Math.max(1, Math.ceil(lv.par * slack));
    lv.timeLimit = Math.round((14 + lv.par * 4.5) * 1000);
    return lv;
  }

  MC.Levels.builders.endless = { count() { return 1; }, label() { return '—'; }, build: make };

  MC.Modes.endless = {
    id: 'endless', single: true, run: true,
    // Undo dimatikan seperti Move Limit; hint dimatikan agar skor murni dari kemampuan.
    rules: { undo: false, undoRefund: false, pause: true, hint: false },
    tutorial: {
      title: 'Endless Circuit',
      steps: [
        'Selesaikan puzzle berturut-turut. Setiap puzzle selesai langsung membuka puzzle baru yang sedikit lebih sulit.',
        'Setiap puzzle punya batas gerakan dan batas waktu sendiri (lihat kotak "Batas" dan "Sisa").',
        'Kamu punya 3 nyawa (♥). Nyawa berkurang saat gerakan habis atau waktu puzzle habis. Puzzle gagal diganti puzzle baru.',
        'Poin = 100 × (ukuran papan − 3) + sisa detik + bonus streak (25 per puzzle beruntun, maksimal 250). Permainan berakhir saat nyawa habis.'
      ]
    },
    prepare() { ctx.seed = (Math.random() * 1e9) | 0; ctx.solved = 0; },
    init(s, lv) {
      s.run = { solved: 0, n: 0, lives: LIVES, score: 0, streak: 0, bestStreak: 0, moves: 0, left: lv.timeLimit };
    },
    header(s) { return 'Puzzle ' + (s.run.n + 1) + ' · ' + s.size + '×' + s.size + ' · Skor ' + s.run.score; },
    hud(s) {
      return { timeLabel: 'Sisa', time: s.run.left, extra: { label: 'Nyawa', value: '♥'.repeat(s.run.lives) + '♡'.repeat(LIVES - s.run.lives) } };
    },
    tick(s, dt) {
      if (s.locked || s.solved || s.over) return;
      s.run.left -= dt;
      if (s.run.left <= 0) { s.run.left = 0; MC.Ctl.failPuzzle('time'); }
    },
    award(s) {
      const run = s.run;
      run.streak++; run.bestStreak = Math.max(run.bestStreak, run.streak);
      const pts = 100 * (s.size - 3) + Math.floor(run.left / 1000) + 25 * Math.min(run.streak, 10);
      run.score += pts; run.solved++; run.moves += s.moves; run.n++;
      if (!s.practice) MC.Storage.data.stats.endlessSolved++;
      return pts;
    },
    // Puzzle gagal: nyawa berkurang, streak putus. Mengembalikan sisa nyawa.
    lose(s) { s.run.lives = Math.max(0, s.run.lives - 1); s.run.streak = 0; s.run.n++; return s.run.lives; },
    next(s) {
      ctx.solved = s.run.solved;
      const lv = MC.Levels.load('endless', s.run.n);
      s.run.left = lv.timeLimit;
      return lv;
    },
    endTitle: 'Kesempatan habis!',
    stars(run) { return run.solved >= 12 ? 3 : run.solved >= 7 ? 2 : run.solved >= 3 ? 1 : 0; },
    summary(run) { return [['Streak terbaik', run.bestStreak]]; },
    record(s, res, data) {
      const run = s.run;
      const prog = (data.progress.endless = data.progress.endless || { levels: {} });
      const prev = prog.levels[0];
      prog.levels[0] = prev
        ? { stars: Math.max(prev.stars, res.stars), moves: res.moves, timeMs: res.timeMs, score: Math.max(prev.score, res.score) }
        : { stars: res.stars, moves: res.moves, timeMs: res.timeMs, score: res.score };
      res.best = prog.levels[0].score;
      const st = data.stats;
      st.modeBest.endless = Math.max(st.modeBest.endless || 0, res.score);
      st.endlessBestSolved = Math.max(st.endlessBestSolved || 0, run.solved);
      st.endlessBestStreak = Math.max(st.endlessBestStreak || 0, run.bestStreak);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
