(function (g) {
  const MC = (g.MC = g.MC || {});

  function neighbor(board, idx, side) {
    const r = Math.floor(idx / board.cols), c = idx % board.cols;
    const d = MC.Config.DIRS[side];
    const nr = r + d[0], nc = c + d[1];
    if (nr < 0 || nc < 0 || nr >= board.rows || nc >= board.cols) return -1;
    return nr * board.cols + nc;
  }

  // Menelusuri aliran energi dari semua Source (BFS) berdasarkan data koneksi aktual tiap ubin.
  function trace(board) {
    const C = MC.Components;
    const tiles = board.tiles;
    const powered = new Map();
    const queue = [];
    tiles.forEach((t, i) => { if (t.type === 'source') { powered.set(i, 0); queue.push(i); } });
    for (let q = 0; q < queue.length; q++) {
      const idx = queue[q];
      const dist = powered.get(idx);
      for (const side of C.conns(tiles[idx])) {
        const n = neighbor(board, idx, side);
        if (n < 0 || powered.has(n)) continue;
        if (C.connectsTo(tiles[n], (side + 2) % 4)) { powered.set(n, dist + 1); queue.push(n); }
      }
    }
    const targets = [], targetsOn = [], leaks = [];
    tiles.forEach((t, i) => {
      if (t.type === 'target') { targets.push(i); if (powered.has(i)) targetsOn.push(i); }
    });
    // Titik bocor: ubin berenergi yang salah satu sisinya tidak tersambung ke tetangga.
    powered.forEach((_, idx) => {
      if (tiles[idx].type === 'source') return;
      for (const side of C.conns(tiles[idx])) {
        const n = neighbor(board, idx, side);
        if (n < 0 || !C.connectsTo(tiles[n], (side + 2) % 4)) { leaks.push(idx); break; }
      }
    });
    return {
      powered, targets, targetsOn, leaks,
      solved: targets.length > 0 && targetsOn.length === targets.length
    };
  }

  MC.Engine = { neighbor, trace };
})(typeof window !== 'undefined' ? window : globalThis);
