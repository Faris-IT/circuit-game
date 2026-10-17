(function (g) {
  const MC = (g.MC = g.MC || {});
  const TIERS = [
    { size: 4, count: 2, targets: 2, blockers: 0.08 },
    { size: 5, count: 2, targets: 2, blockers: 0.12 },
    { size: 5, count: 2, targets: 3, blockers: 0.1 },
    { size: 6, count: 2, targets: 3, blockers: 0.12 },
    { size: 7, count: 2, targets: 3, blockers: 0.15 },
    { size: 7, count: 2, targets: 4, blockers: 0.12 }
  ];

  MC.Levels.builders['multi-target'] = {
    count() { return TIERS.reduce((a, t) => a + t.count, 0); },
    label(i) { const t = MC.Levels.pickTier(TIERS, i); return t.size + '×' + t.size + ' · ' + t.targets + ' target'; },
    build(i) {
      const t = MC.Levels.pickTier(TIERS, i);
      const board = MC.Generator.generateMulti({ rows: t.size, cols: t.size, targets: t.targets, seed: 73000 + i * 7919, blockers: t.blockers });
      return MC.Levels.finish(board, { size: t.size, name: 'Level ' + (i + 1), kind: 'generated', targets: t.targets });
    }
  };

  MC.Modes['multi-target'] = {
    id: 'multi-target',
    rules: { undo: true, undoRefund: true, pause: true, hint: true },
    tutorial: {
      title: 'Multi Target',
      steps: [
        'Ada satu Source tetapi beberapa Target. Semua Target harus menyala sekaligus.',
        'Simpang-T dan persimpangan membagi aliran energi ke beberapa arah.',
        'Menyambung sebagian Target belum cukup. Status TEST menunjukkan berapa Target yang sudah menyala.',
        'Hati-hati: memutar satu ubin bisa memutus jalur ke Target lain.'
      ]
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
