(function (g) {
  const MC = (g.MC = g.MC || {});
  const TIERS = [
    { size: 4, count: 3, blockers: 0.1 },
    { size: 5, count: 4, blockers: 0.15 },
    { size: 6, count: 3, blockers: 0.18 },
    { size: 7, count: 2, blockers: 0.2 }
  ];

  MC.Levels.builders['move-limit'] = {
    count() { return TIERS.reduce((a, t) => a + t.count, 0); },
    label(i) { const t = MC.Levels.pickTier(TIERS, i); return t.size + '×' + t.size; },
    build(i) {
      const t = MC.Levels.pickTier(TIERS, i);
      const board = MC.Generator.generate({ rows: t.size, cols: t.size, seed: 52000 + i * 7919, blockers: t.blockers });
      const lv = MC.Levels.finish(board, { size: t.size, name: 'Level ' + (i + 1), kind: 'generated' });
      lv.limit = lv.par + Math.max(2, Math.ceil(lv.par * 0.25));
      return lv;
    }
  };

  MC.Modes['move-limit'] = {
    id: 'move-limit',
    rules: { undo: false, undoRefund: false, pause: true, hint: true, limit: true },
    tutorial: {
      title: 'Move Limit',
      steps: [
        'Setiap putaran ubin dihitung sebagai satu gerakan. Batas gerakan ditampilkan di kotak "Batas".',
        'Undo dimatikan di mode ini, jadi pikirkan jalurnya sebelum memutar.',
        'Saat gerakan terakhir terpakai, sirkuit diuji otomatis. Jika belum tersambung, level gagal.',
        'Hint tetap tersedia tetapi mengurangi bintang.'
      ]
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
