(function (g) {
  const MC = (g.MC = g.MC || {});
  const builders = {};

  function finish(board, extra) {
    const sol = MC.Solver.solve(board);
    const par = sol ? sol.cost : 0;
    return Object.assign({ board, par, solvable: !!sol }, extra);
  }

  function classicCount() {
    return MC.Data.classic.length + MC.Config.CLASSIC_TIERS.reduce((a, t) => a + t.count, 0);
  }

  builders.classic = {
    count: classicCount,
    label(i) {
      const A = MC.Data.classic.length;
      if (i < A) return '4×4';
      const t = tierFor(i - A);
      return t.size + '×' + t.size;
    },
    build(i) {
      const A = MC.Data.classic;
      const C = MC.Components;
      if (i < A.length) {
        const def = A[i];
        const grid = def.rows.map((row) => row.trim().split(/\s+/));
        const rows = grid.length, cols = grid[0].length;
        const tiles = [];
        grid.forEach((row) => row.forEach((tok) => tiles.push(C.parseToken(tok))));
        const board = { rows, cols, tiles };
        const rotIdx = [];
        tiles.forEach((t, k) => { if (!t.locked) rotIdx.push(k); });
        MC.Generator.scramble(board, rotIdx, MC.Generator.rng(1000 + i * 17), 2);
        return finish(board, { size: rows, name: def.name, kind: 'authored' });
      }
      const t = tierFor(i - A.length);
      const board = MC.Generator.generate({ rows: t.size, cols: t.size, seed: 9000 + i * 7919, blockers: t.blockers });
      return finish(board, { size: t.size, name: 'Level ' + (i + 1), kind: 'generated' });
    }
  };

  function tierFor(k) {
    for (const t of MC.Config.CLASSIC_TIERS) {
      if (k < t.count) return t;
      k -= t.count;
    }
    return MC.Config.CLASSIC_TIERS[MC.Config.CLASSIC_TIERS.length - 1];
  }

  MC.Levels = {
    builders,
    count(modeId) { return builders[modeId] ? builders[modeId].count() : 0; },
    label(modeId, i) { return builders[modeId].label(i); },
    load(modeId, i) {
      const b = builders[modeId];
      if (!b) throw new Error('Mode belum tersedia: ' + modeId);
      const lv = b.build(i);
      lv.ideal = MC.Scoring ? MC.Scoring.ideal(lv.par) : lv.par;
      return lv;
    },
    // Pemeriksaan rilis: setiap level harus punya solusi valid dan belum selesai saat dimulai.
    validate(modeId) {
      const report = [];
      for (let i = 0; i < this.count(modeId); i++) {
        const lv = this.load(modeId, i);
        const solved = MC.Engine.trace(lv.board).solved;
        report.push({ index: i, solvable: lv.solvable, par: lv.par, startsSolved: solved, ok: lv.solvable && !solved && lv.par > 0 });
      }
      return report;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
