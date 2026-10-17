(function (g) {
  const MC = (g.MC = g.MC || {});

  function rng(seed) {
    let a = seed | 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, r) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // DFS acak untuk jalur self-avoiding di kolom 1..cols-2.
  function randomPath(rows, cols, sr, tr, minLen, r) {
    const DIRS = MC.Config.DIRS;
    const goal = [tr, cols - 2];
    const visited = new Set();
    const path = [];
    let nodes = 0;
    const key = (a, b) => a * cols + b;
    function dfs(rr, cc) {
      if (++nodes > 30000) return false;
      path.push([rr, cc]); visited.add(key(rr, cc));
      if (rr === goal[0] && cc === goal[1]) {
        if (path.length >= minLen) return true;
        path.pop(); visited.delete(key(rr, cc)); return false;
      }
      for (const d of shuffle([0, 1, 2, 3], r)) {
        const nr = rr + DIRS[d][0], nc = cc + DIRS[d][1];
        if (nr < 0 || nr >= rows || nc < 1 || nc > cols - 2 || visited.has(key(nr, nc))) continue;
        if (dfs(nr, nc)) return true;
      }
      path.pop(); visited.delete(key(rr, cc));
      return false;
    }
    return dfs(sr, 1) ? path.slice() : null;
  }

  function sideTo(a, b) {
    const dr = b[0] - a[0], dc = b[1] - a[1];
    const DIRS = MC.Config.DIRS;
    for (let s = 0; s < 4; s++) if (DIRS[s][0] === dr && DIRS[s][1] === dc) return s;
    return -1;
  }

  // Mengacak rotasi ubin yang bisa diputar sampai papan belum selesai tetapi masih solvable.
  function scramble(board, idxs, r, minCost) {
    const S = MC.Solver, E = MC.Engine;
    for (let t = 0; t < 120; t++) {
      idxs.forEach((i) => { board.tiles[i].rot = Math.floor(r() * 4); });
      if (E.trace(board).solved) continue;
      const sol = S.solve(board);
      if (sol && sol.cost >= minCost) return true;
    }
    // Fallback: pastikan belum selesai.
    for (const i of idxs) {
      board.tiles[i].rot = (board.tiles[i].rot + 1) % 4;
      if (!E.trace(board).solved && S.solve(board)) return true;
    }
    return false;
  }

  function generate(opts) {
    const C = MC.Components, S = MC.Solver;
    const rows = opts.rows, cols = opts.cols;
    const blockers = opts.blockers == null ? 0.12 : opts.blockers;
    const r = rng(opts.seed);

    for (let attempt = 0; attempt < 30; attempt++) {
      const sr = Math.floor(r() * rows), tr = Math.floor(r() * rows);
      const want = Math.max(3, Math.floor(rows * (cols - 2) * 0.4));
      let path = null;
      for (let m = want; m >= 1 && !path; m = Math.floor(m * 0.7)) path = randomPath(rows, cols, sr, tr, m, r);
      if (!path) continue;

      const tiles = new Array(rows * cols).fill(null);
      tiles[sr * cols] = C.make('source', 1);
      tiles[tr * cols + cols - 1] = C.make('target', 3);

      const pathIdx = [];
      for (let i = 0; i < path.length; i++) {
        const prev = i === 0 ? [sr, 0] : path[i - 1];
        const next = i === path.length - 1 ? [tr, cols - 1] : path[i + 1];
        const a = sideTo(path[i], prev), b = sideTo(path[i], next);
        const type = b === (a + 2) % 4 ? 'straight' : 'corner';
        const idx = path[i][0] * cols + path[i][1];
        tiles[idx] = C.make(type, C.rotFor(type, a, b));
        pathIdx.push(idx);
      }
      // Pengisi non-jalur.
      for (let i = 0; i < tiles.length; i++) {
        if (tiles[i]) continue;
        const x = r();
        let type;
        if (x < blockers) type = 'blocker';
        else if (x < blockers + 0.05) type = 'empty';
        else {
          const y = r();
          type = y < 0.3 ? 'straight' : y < 0.65 ? 'corner' : y < 0.82 ? 'tee' : 'cross';
        }
        tiles[i] = C.make(type, Math.floor(r() * 4));
      }
      const board = { rows, cols, tiles };
      const minCost = Math.max(2, Math.floor(path.length / 3));
      if (!scramble(board, pathIdx, r, minCost)) continue;
      if (!S.solve(board)) continue;
      return board;
    }
    throw new Error('Generator gagal membuat papan untuk seed ' + opts.seed);
  }

  MC.Generator = { rng, generate, scramble, shuffle };
})(typeof window !== 'undefined' ? window : globalThis);
