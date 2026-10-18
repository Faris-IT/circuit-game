(function (g) {
  const MC = (g.MC = g.MC || {});
  const NODE_LIMIT = 400000;

  function options(tile, entry) {
    const C = MC.Components;
    if (tile.locked) {
      const cs = C.conns(tile);
      return cs.includes(entry) ? [{ rots: [tile.rot], conns: cs, cost: 0 }] : [];
    }
    const out = [];
    for (const cl of C.classes(tile.type)) {
      if (!cl.conns.includes(entry)) continue;
      let cost = 4;
      for (const r of cl.rots) cost = Math.min(cost, (r - tile.rot + 4) % 4);
      out.push({ rots: cl.rots, conns: cl.conns, cost });
    }
    return out;
  }

  // Mencari jalur Source -> Target dengan jumlah putaran minimum (1 Source, 1 Target).
  function solve(board) {
    const C = MC.Components, E = MC.Engine;
    const tiles = board.tiles;
    const src = [], tgt = [];
    tiles.forEach((t, i) => { if (t.type === 'source') src.push(i); if (t.type === 'target') tgt.push(i); });
    if (src.length !== 1 || tgt.length !== 1) return null;
    const visited = new Uint8Array(tiles.length);
    visited[src[0]] = 1;
    let best = null, nodes = 0;
    const path = [];

    function step(idx, side, cost) {
      if (best && cost >= best.cost) return;
      if (++nodes > NODE_LIMIT) return;
      const n = E.neighbor(board, idx, side);
      if (n < 0 || visited[n]) return;
      const nt = tiles[n], entry = (side + 2) % 4;
      if (nt.type === 'target') {
        if (C.connectsTo(nt, entry) && (!best || cost < best.cost)) {
          best = { cost, path: path.map((p) => ({ idx: p.idx, rots: p.rots, cost: p.cost })) };
        }
        return;
      }
      if (nt.type === 'source' || nt.type === 'blocker' || nt.type === 'empty') return;
      visited[n] = 1;
      for (const o of options(nt, entry)) {
        path.push({ idx: n, rots: o.rots, cost: o.cost });
        for (const out of o.conns) if (out !== entry) step(n, out, cost + o.cost);
        path.pop();
      }
      visited[n] = 0;
    }
    for (const side of C.conns(tiles[src[0]])) step(src[0], side, 0);
    return best;
  }

  // Papan dengan solusi tersimpan (Multi Target): biaya putar menuju solusi tersebut.
  function solutionCost(board) {
    let c = 0;
    for (const p of board.solution) {
      const cur = board.tiles[p.idx].rot;
      if (p.rots.includes(cur)) continue;
      let k = 4;
      for (const r of p.rots) k = Math.min(k, (r - cur + 4) % 4);
      c += k;
    }
    return c;
  }

  // Memverifikasi lewat mesin sirkuit bahwa solusi tersimpan benar-benar mengaktifkan semua target.
  function verifySolution(board) {
    const copy = {
      rows: board.rows, cols: board.cols, colorMode: board.colorMode,
      tiles: board.tiles.map((t) => ({ type: t.type, rot: t.rot, locked: t.locked, color: t.color }))
    };
    board.solution.forEach((p) => { copy.tiles[p.idx].rot = p.rots[0]; });
    return MC.Engine.trace(copy).solved;
  }

  // Petunjuk dari solusi valid: ubin pertama pada jalur yang belum benar.
  function hint(board) {
    const E = MC.Engine;
    if (E.trace(board).solved) return { idx: -1, clicks: 0 };
    if (board.solution) {
      for (const p of board.solution) {
        const cur = board.tiles[p.idx].rot;
        if (p.rots.includes(cur)) continue;
        let clicks = 4;
        for (const r of p.rots) clicks = Math.min(clicks, (r - cur + 4) % 4);
        return { idx: p.idx, clicks };
      }
      return { idx: -1, clicks: 0 };
    }
    const s = solve(board);
    if (!s) return null;
    for (const p of s.path) {
      const cur = board.tiles[p.idx].rot;
      if (!p.rots.includes(cur)) {
        let clicks = 4;
        for (const r of p.rots) clicks = Math.min(clicks, (r - cur + 4) % 4);
        return { idx: p.idx, clicks };
      }
    }
    return { idx: -1, clicks: 0 };
  }

  MC.Solver = { solve, hint, options, solutionCost, verifySolution };
})(typeof window !== 'undefined' ? window : globalThis);
