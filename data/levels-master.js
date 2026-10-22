(function (g) {
  const MC = (g.MC = g.MC || {});
  MC.Data = MC.Data || {};
  // Tiap level menggabungkan minimal dua mekanik. keys = mekanik yang dijelaskan sebelum level dimulai.
  // base: jenis papan (single | multi | color | dual); layers: aturan tambahan (limit | unstable | memory).
  MC.Data.master = [
    { keys: ['multi', 'limit'],             base: 'multi',  size: 5, targets: 2, blockers: 0.1, layers: ['limit'], slack: 0.35 },
    { keys: ['maze', 'unstable'],           base: 'single', size: 5, maze: true, layers: ['unstable'] },
    { keys: ['color', 'maze'],              base: 'color',  size: 5, kind: 'sep2', blockers: 0.2, layers: ['limit'], slack: 0.6 },
    { keys: ['multi', 'unstable'],          base: 'multi',  size: 5, targets: 2, blockers: 0.1, layers: ['unstable'] },
    { keys: ['maze', 'limit'],              base: 'single', size: 6, maze: true, layers: ['limit'], slack: 0.4 },
    { keys: ['color', 'limit'],             base: 'color',  size: 5, kind: 'mix', blockers: 0.08, layers: ['limit'], slack: 0.4 },
    { keys: ['memory', 'limit'],            base: 'single', size: 5, blockers: 0.1, layers: ['memory', 'limit'], obs: 5, slack: 0.6 },
    { keys: ['memory', 'maze'],             base: 'single', size: 6, maze: true, layers: ['memory'], obs: 4 },
    { keys: ['dual', 'limit'],              base: 'dual',   size: 4, pairs: 3, minBoth: 1, layers: ['limit'], slack: 0.5 },
    { keys: ['color', 'unstable'],          base: 'color',  size: 6, kind: 'sepf', blockers: 0.08, layers: ['unstable'] },
    { keys: ['memory', 'multi'],            base: 'multi',  size: 5, targets: 2, blockers: 0.1, layers: ['memory'], obs: 5 },
    { keys: ['multi', 'limit', 'unstable'], base: 'multi',  size: 6, targets: 3, blockers: 0.12, layers: ['limit', 'unstable'], slack: 0.5 }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
