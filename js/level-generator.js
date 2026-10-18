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
        // Opsional (Circuit Maze): sebagian ubin pengisi dikunci pada rotasinya.
        if (opts.lockedFiller > 0 && (type === 'straight' || type === 'corner' || type === 'tee') && r() < opts.lockedFiller) tiles[i].locked = true;
      }
      // Opsional (Circuit Maze): sebagian ubin jalur solusi dikunci pada rotasi yang benar.
      let free = pathIdx;
      if (opts.lockedPath > 0) {
        const cand = pathIdx.filter(() => r() < opts.lockedPath).slice(0, Math.max(0, pathIdx.length - 3));
        cand.forEach((i) => { tiles[i].locked = true; });
        free = pathIdx.filter((i) => !tiles[i].locked);
      }
      const board = { rows, cols, tiles };
      const minCost = Math.max(2, Math.floor(free.length / 3));
      if (!scramble(board, free, r, minCost)) continue;
      if (!S.solve(board)) continue;
      return board;
    }
    throw new Error('Generator gagal membuat papan untuk seed ' + opts.seed);
  }

  // Jalur acak dari start ke goal pada kolom 1..cols-2, menghindari sel di `blocked`.
  function pathBetween(rows, cols, start, goal, blocked, r, cap) {
    const DIRS = MC.Config.DIRS;
    const visited = new Set(blocked);
    const path = [];
    let nodes = 0;
    function dfs(rr, cc) {
      if (++nodes > cap) return false;
      path.push([rr, cc]); visited.add(rr * cols + cc);
      if (rr === goal[0] && cc === goal[1]) return true;
      for (const d of shuffle([0, 1, 2, 3], r)) {
        const nr = rr + DIRS[d][0], nc = cc + DIRS[d][1];
        if (nr < 0 || nr >= rows || nc < 1 || nc > cols - 2 || visited.has(nr * cols + nc)) continue;
        if (dfs(nr, nc)) return true;
      }
      path.pop(); visited.delete(rr * cols + cc);
      return false;
    }
    if (visited.has(start[0] * cols + start[1])) return null;
    return dfs(start[0], start[1]) ? path.slice() : null;
  }

  // Multi Target: membangun pohon sirkuit (Source -> beberapa Target) terlebih dulu,
  // menyimpan solusinya di board.solution, lalu mengacak rotasi.
  function generateMulti(opts) {
    const C = MC.Components, E = MC.Engine, S = MC.Solver;
    const rows = opts.rows, cols = opts.cols, K = opts.targets;
    const blockers = opts.blockers == null ? 0.1 : opts.blockers;
    const r = rng(opts.seed);
    const DIRS = MC.Config.DIRS;
    const cell = (a, b) => a * cols + b;
    const rc = (i) => [Math.floor(i / cols), i % cols];

    for (let attempt = 0; attempt < 120; attempt++) {
      const conn = new Map();
      const add = (i, s) => { if (!conn.has(i)) conn.set(i, new Set()); conn.get(i).add(s); };
      const link = (a, b) => { const s = sideTo(rc(a), rc(b)); add(a, s); add(b, (s + 2) % 4); };

      const tRows = shuffle([...Array(rows).keys()], r).slice(0, K);
      const sr = Math.floor(r() * rows);
      const srcIdx = cell(sr, 0);
      const tgtIdx = tRows.map((tr) => cell(tr, cols - 1));
      const goals = tRows.map((tr) => cell(tr, cols - 2));

      const want = Math.max(3, Math.floor(rows * (cols - 2) * 0.3));
      let main = null;
      for (let m = want; m >= 1 && !main; m = Math.floor(m * 0.7)) main = randomPath(rows, cols, sr, tRows[0], m, r);
      if (!main) continue;
      let prev = srcIdx;
      main.forEach(([a, b]) => { const i = cell(a, b); link(prev, i); prev = i; });
      link(prev, tgtIdx[0]);

      let ok = true;
      for (let k = 1; k < K && ok; k++) {
        const gcell = goals[k];
        if (conn.has(gcell)) { link(gcell, tgtIdx[k]); continue; }
        const treeCells = shuffle([...conn.keys()].filter((i) => { const c = i % cols; return c >= 1 && c <= cols - 2; }), r);
        let done = false;
        for (const b of treeCells) {
          const [br, bc] = rc(b);
          for (const d of shuffle([0, 1, 2, 3], r)) {
            const nr = br + DIRS[d][0], nc = bc + DIRS[d][1];
            if (nr < 0 || nr >= rows || nc < 1 || nc > cols - 2 || conn.has(cell(nr, nc))) continue;
            const seg = pathBetween(rows, cols, [nr, nc], rc(gcell), new Set(conn.keys()), r, 4000);
            if (!seg) continue;
            let p = b;
            seg.forEach(([a, c2]) => { const i = cell(a, c2); link(p, i); p = i; });
            link(p, tgtIdx[k]);
            done = true; break;
          }
          if (done) break;
        }
        if (!done) ok = false;
      }
      if (!ok) continue;

      const tiles = new Array(rows * cols).fill(null);
      tiles[srcIdx] = C.make('source', 1);
      tgtIdx.forEach((i) => { tiles[i] = C.make('target', 3); });
      const treeIdx = [];
      conn.forEach((sides, i) => {
        if (i === srcIdx || tgtIdx.includes(i)) return;
        const s = [...sides];
        let type, rot;
        if (s.length === 2) { type = s[1] === (s[0] + 2) % 4 ? 'straight' : 'corner'; rot = C.rotFor(type, s[0], s[1]); }
        else if (s.length === 3) { type = 'tee'; const m = [0, 1, 2, 3].find((x) => !sides.has(x)); rot = (m + 1) % 4; }
        else { type = 'cross'; rot = 0; }
        tiles[i] = C.make(type, rot);
        treeIdx.push(i);
      });
      for (let i = 0; i < tiles.length; i++) {
        if (tiles[i]) continue;
        const x = r();
        let type;
        if (x < blockers) type = 'blocker';
        else if (x < blockers + 0.05) type = 'empty';
        else { const y = r(); type = y < 0.3 ? 'straight' : y < 0.65 ? 'corner' : y < 0.82 ? 'tee' : 'cross'; }
        tiles[i] = C.make(type, Math.floor(r() * 4));
      }

      const board = { rows, cols, tiles };
      const solvedTrace = E.trace(board);
      if (!solvedTrace.solved) continue;
      board.solution = treeIdx
        .map((i) => {
          const t = tiles[i];
          const cl = C.classes(t.type).find((c) => c.rots.includes(t.rot));
          return { idx: i, rots: cl.rots.slice(), d: solvedTrace.powered.get(i) };
        })
        .sort((a, b) => a.d - b.d)
        .map((p) => ({ idx: p.idx, rots: p.rots }));

      const rotIdx = treeIdx.filter((i) => !tiles[i].locked);
      const minCost = Math.max(K + 1, Math.floor(rotIdx.length / 2));
      let good = false;
      for (let t = 0; t < 200 && !good; t++) {
        rotIdx.forEach((i) => { tiles[i].rot = Math.floor(r() * 4); });
        if (E.trace(board).solved) continue;
        if (S.solutionCost(board) >= minCost) good = true;
      }
      if (!good || !S.verifySolution(board)) continue;
      return board;
    }
    throw new Error('Generator multi-target gagal untuk seed ' + opts.seed);
  }

  // Color Logic: papan terselesaikan dibangun lebih dulu, lalu rotasi diacak. Jenis (kind):
  //   sep2      dua Source (C, Y) ke dua Target sewarna lewat jalur terpisah
  //   sepf      seperti sep2, tiap jalur memuat Filter sewarna
  //   mix       C dan Y masuk ke Mixer, keluaran hijau (G) ke Target G
  //   mix2      mix + satu jalur C/Y terpisah ke Target sewarna
  //   mix_split mix, lalu simpang-T membagi hijau ke dua Target G
  function generateColor(opts) {
    const C = MC.Components, E = MC.Engine, S = MC.Solver;
    const rows = opts.rows, cols = opts.cols, kind = opts.kind;
    const trap = opts.trap == null ? 0.1 : opts.trap;
    const blockers = opts.blockers == null ? 0.08 : opts.blockers;
    const r = rng(opts.seed);
    const DIRS = MC.Config.DIRS;
    const cell = (a, b) => a * cols + b;
    const rc = (i) => [Math.floor(i / cols), i % cols];
    const pickRows = (n) => shuffle([...Array(rows).keys()], r).slice(0, n);
    const needMixer = kind === 'mix' || kind === 'mix2' || kind === 'mix_split';

    for (let attempt = 0; attempt < 500; attempt++) {
      const conn = new Map();
      const add = (i, s) => { if (!conn.has(i)) conn.set(i, new Set()); conn.get(i).add(s); };
      const link = (a, b) => { const s = sideTo(rc(a), rc(b)); add(a, s); add(b, (s + 2) % 4); };
      const reserved = new Set();
      const legs = [];            // { cells, color } untuk penempatan Filter
      const sources = [], targets = [];
      const coin = r() < 0.5;
      const cA = coin ? 'C' : 'Y', cB = coin ? 'Y' : 'C';

      const leg = (start, goal) => {
        const blocked = new Set(reserved);
        blocked.delete(cell(start[0], start[1])); blocked.delete(cell(goal[0], goal[1]));
        return pathBetween(rows, cols, start, goal, blocked, r, 6000);
      };
      const commit = (seq, from, to, color) => {
        let prev = from;
        const cells = [];
        seq.forEach(([a, b]) => { const i = cell(a, b); link(prev, i); prev = i; reserved.add(i); cells.push(i); });
        link(prev, to);
        if (color) legs.push({ cells, color });
        return cells;
      };
      const addSource = (row, color) => { sources.push({ idx: cell(row, 0), color }); return cell(row, 0); };
      const addTarget = (row, color) => { targets.push({ idx: cell(row, cols - 1), color }); return cell(row, cols - 1); };

      let ok = true, mixIdx = -1, mixRot = 0, outCells = [];
      if (!needMixer) {
        const sr = pickRows(2), tr = pickRows(2), cs = [cA, cB];
        for (let k = 0; k < 2 && ok; k++) {
          const seq = leg([sr[k], 1], [tr[k], cols - 2]);
          if (!seq) { ok = false; break; }
          commit(seq, addSource(sr[k], cs[k]), addTarget(tr[k], cs[k]), cs[k]);
        }
      } else {
        if (cols < 5 || rows < 4) throw new Error('Papan terlalu kecil untuk Mixer');
        const mr = 1 + Math.floor(r() * (rows - 2)), mc = 2 + Math.floor(r() * (cols - 4));
        const horizontal = r() < 0.5;
        const sideOut = horizontal ? (r() < 0.5 ? 0 : 2) : (r() < 0.5 ? 1 : 3);
        const inSides = horizontal ? [3, 1] : [0, 2];
        mixRot = (sideOut + 3) % 4;
        mixIdx = cell(mr, mc);
        const nb = (s) => [mr + DIRS[s][0], mc + DIRS[s][1]];
        const nIn = inSides.map(nb), nOut = nb(sideOut);
        reserved.add(mixIdx);
        [nIn[0], nIn[1], nOut].forEach((n) => reserved.add(cell(n[0], n[1])));
        const k = kind === 'mix2' ? 3 : 2, t = kind === 'mix_split' ? 2 : (kind === 'mix2' ? 2 : 1);
        const sr = pickRows(k), tr = pickRows(t);
        const cs = [cA, cB];
        for (let q = 0; q < 2 && ok; q++) {
          const seq = leg([sr[q], 1], nIn[q]);
          if (!seq) { ok = false; break; }
          commit(seq, addSource(sr[q], cs[q]), mixIdx, cs[q]);
        }
        if (ok) {
          const seq = leg(nOut, [tr[0], cols - 2]);
          if (!seq) ok = false;
          else outCells = commit(seq, mixIdx, addTarget(tr[0], 'G'), 'G');
        }
        if (ok && kind === 'mix2') {
          const color = r() < 0.5 ? 'C' : 'Y';
          const seq = leg([sr[2], 1], [tr[1], cols - 2]);
          if (!seq) ok = false;
          else commit(seq, addSource(sr[2], color), addTarget(tr[1], color), color);
        }
        if (ok && kind === 'mix_split') {
          let done = false;
          for (const b of shuffle(outCells.slice(), r)) {
            const [br, bc] = rc(b);
            for (const d of shuffle([0, 1, 2, 3], r)) {
              const nr = br + DIRS[d][0], nc = bc + DIRS[d][1];
              if (nr < 0 || nr >= rows || nc < 1 || nc > cols - 2 || reserved.has(cell(nr, nc))) continue;
              const seq = leg([nr, nc], [tr[1], cols - 2]);
              if (!seq) continue;
              commit(seq, b, addTarget(tr[1], 'G'), 'G');
              done = true; break;
            }
            if (done) break;
          }
          if (!done) ok = false;
        }
      }
      if (!ok) continue;

      const tiles = new Array(rows * cols).fill(null);
      sources.forEach((s) => { tiles[s.idx] = C.make('source', 1, s.color); });
      targets.forEach((t) => { tiles[t.idx] = C.make('target', 3, t.color); });
      const treeIdx = [];
      conn.forEach((sides, i) => {
        if (tiles[i]) return;
        const s = [...sides];
        let type, rot;
        if (i === mixIdx) { type = 'mixer'; rot = mixRot; }
        else if (s.length === 2) { type = s[1] === (s[0] + 2) % 4 ? 'straight' : 'corner'; rot = C.rotFor(type, s[0], s[1]); }
        else if (s.length === 3) { type = 'tee'; const m = [0, 1, 2, 3].find((x) => !sides.has(x)); rot = (m + 1) % 4; }
        else { type = 'cross'; rot = 0; }
        tiles[i] = C.make(type, rot);
        treeIdx.push(i);
      });
      // Filter sewarna ditempatkan pada ubin Lurus di jalur (wajib di sepf, opsional di jenis lain).
      let filterFail = false;
      legs.forEach((L) => {
        const cand = L.cells.filter((i) => tiles[i].type === 'straight');
        const want = kind === 'sepf' ? L.color !== 'G' : r() < 0.4;
        if (!want) return;
        if (!cand.length) { if (kind === 'sepf') filterFail = true; return; }
        const i = cand[Math.floor(r() * cand.length)];
        tiles[i] = C.make('filter', tiles[i].rot, L.color);
      });
      if (filterFail) continue;
      for (let i = 0; i < tiles.length; i++) {
        if (tiles[i]) continue;
        const x = r();
        let type, color;
        if (x < blockers) type = 'blocker';
        else if (x < blockers + 0.05) type = 'empty';
        else if (x < blockers + 0.05 + trap) { type = 'filter'; color = ['C', 'Y', 'G'][Math.floor(r() * 3)]; }
        else if (x < blockers + 0.05 + trap + 0.04) type = 'mixer';
        else { const y = r(); type = y < 0.3 ? 'straight' : y < 0.65 ? 'corner' : y < 0.82 ? 'tee' : 'cross'; }
        tiles[i] = C.make(type, Math.floor(r() * 4), color);
      }

      const board = { rows, cols, tiles, colorMode: true };
      const tr0 = E.trace(board);
      if (!tr0.solved) continue;
      board.solution = treeIdx
        .map((i) => {
          const t = tiles[i];
          const cl = C.classes(t.type).find((c) => c.rots.includes(t.rot));
          return { idx: i, rots: cl.rots.slice(), d: tr0.powered.get(i) || 0 };
        })
        .sort((a, b) => a.d - b.d)
        .map((p) => ({ idx: p.idx, rots: p.rots }));

      const rotIdx = treeIdx.filter((i) => !tiles[i].locked);
      const minCost = Math.max(targets.length + 1, Math.floor(rotIdx.length / 2));
      let good = false;
      for (let t = 0; t < 300 && !good; t++) {
        rotIdx.forEach((i) => { tiles[i].rot = Math.floor(r() * 4); });
        if (E.trace(board).solved) continue;
        if (S.solutionCost(board) >= minCost) good = true;
      }
      if (!good || !S.verifySolution(board)) continue;
      return board;
    }
    throw new Error('Generator Color Logic gagal untuk seed ' + opts.seed + ' (' + kind + ')');
  }

  MC.Generator = { rng, generate, generateMulti, generateColor, scramble, shuffle };
})(typeof window !== 'undefined' ? window : globalThis);
