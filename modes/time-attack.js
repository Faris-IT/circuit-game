(function (g) {
  const MC = (g.MC = g.MC || {});
  const DURATION = 120000;   // 120 detik

  // Ukuran papan naik seiring jumlah puzzle yang sudah selesai dalam sesi.
  const sizeFor = (n) => (n < 2 ? 4 : n < 4 ? 5 : n < 7 ? 6 : 7);
  const blockersFor = (size) => (size <= 4 ? 0.1 : size === 5 ? 0.15 : 0.18);

  MC.Levels.runSeed = 1;
  MC.Levels.builders['time-attack'] = {
    count() { return 1; },
    label() { return '—'; },
    build(n) {
      const size = sizeFor(n);
      const board = MC.Generator.generate({ rows: size, cols: size, seed: MC.Levels.runSeed + n * 7919, blockers: blockersFor(size) });
      return MC.Levels.finish(board, { size, name: 'Puzzle ' + (n + 1), kind: 'generated' });
    }
  };

  MC.Modes['time-attack'] = {
    id: 'time-attack', single: true, run: true, duration: DURATION,
    // Hint dimatikan: mode ini mengukur kecepatan. Pause menyembunyikan papan agar tidak bisa dipakai untuk berpikir.
    rules: { undo: true, undoRefund: true, pause: true, hint: false },
    tutorial: {
      title: 'Time Attack',
      steps: [
        'Selesaikan sebanyak mungkin puzzle dalam 120 detik. Waktu terus berjalan saat kamu mengatur ubin.',
        'Tekan TEST CIRCUIT (Enter) begitu jalur tersambung. Puzzle berikutnya langsung muncul.',
        'Poin = 100 × tingkat kesulitan (ukuran papan − 3) + bonus 1 poin per detik sisa waktu saat puzzle selesai.',
        'Papan makin besar setiap beberapa puzzle. Hint dimatikan. Permainan berakhir saat waktu habis.'
      ]
    },
    prepare() { MC.Levels.runSeed = (Math.random() * 1e9) | 0; },
    init(s) { s.run = { left: DURATION, solved: 0, score: 0, moves: 0, n: 0 }; },
    header(s) { return 'Puzzle ' + (s.run.n + 1) + ' · ' + s.size + '×' + s.size; },
    hud(s) { return { timeLabel: 'Sisa', time: s.run.left, extra: { label: 'Skor', value: s.run.score } }; },
    tick(s, dt) {
      if (s.locked || s.solved || s.over) return;
      s.run.left -= dt;
      if (s.run.left <= 0) { s.run.left = 0; MC.Ctl.endRun(); }
    },
    // Dipanggil saat puzzle selesai; mengembalikan poin yang didapat.
    award(s) {
      const run = s.run;
      const pts = 100 * (s.size - 3) + Math.floor(run.left / 1000);
      run.score += pts; run.solved++; run.moves += s.moves; run.n++;
      return pts;
    },
    next(s) { return MC.Levels.load('time-attack', s.run.n); },
    record(s, res, data) {
      const prog = (data.progress['time-attack'] = data.progress['time-attack'] || { levels: {} });
      const prev = prog.levels[0];
      prog.levels[0] = prev
        ? { stars: Math.max(prev.stars, res.stars), moves: res.moves, timeMs: res.timeMs, score: Math.max(prev.score, res.score) }
        : { stars: res.stars, moves: res.moves, timeMs: res.timeMs, score: res.score };
      res.best = prog.levels[0].score;
      data.stats.modeBest['time-attack'] = Math.max(data.stats.modeBest['time-attack'] || 0, res.score);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
