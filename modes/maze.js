(function (g) {
  const MC = (g.MC = g.MC || {});
  // Penghalang makin banyak, ubin terkunci makin banyak, pilihan jalur makin sedikit.
  const TIERS = [
    { size: 5, count: 4, blockers: 0.28, lockedFiller: 0.18, lockedPath: 0.25 },
    { size: 6, count: 4, blockers: 0.34, lockedFiller: 0.22, lockedPath: 0.3 },
    { size: 7, count: 4, blockers: 0.38, lockedFiller: 0.25, lockedPath: 0.3 }
  ];

  MC.Levels.builders.maze = {
    count() { return TIERS.reduce((a, t) => a + t.count, 0); },
    label(i) { const t = MC.Levels.pickTier(TIERS, i); return t.size + '×' + t.size; },
    build(i) {
      const t = MC.Levels.pickTier(TIERS, i);
      const board = MC.Generator.generate({
        rows: t.size, cols: t.size, seed: 31000 + i * 7919,
        blockers: t.blockers, lockedFiller: t.lockedFiller, lockedPath: t.lockedPath
      });
      const lv = MC.Levels.finish(board, { size: t.size, name: 'Level ' + (i + 1), kind: 'generated' });
      lv.limit = lv.par + Math.max(3, Math.ceil(lv.par * 0.4));
      return lv;
    }
  };

  MC.Modes.maze = {
    id: 'maze',
    rules: { undo: true, undoRefund: false, undoCosts: true, pause: true, hint: true, limit: true },
    tutorial: {
      title: 'Circuit Maze',
      steps: [
        'Papan dipenuhi penghalang (ikon X merah). Energi tidak bisa menembus atau menempati petak itu.',
        'Ubin dengan sudut ungu terkunci: tidak bisa diputar, jadi jalurmu harus menyesuaikan arahnya.',
        'Ada batas gerakan. Undo diizinkan, tetapi undo juga dihitung sebagai satu gerakan.',
        'Saat gerakan terakhir terpakai, sirkuit diuji otomatis. Jika belum tersambung, level gagal.'
      ]
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
