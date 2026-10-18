(function (g) {
  const MC = (g.MC = g.MC || {});

  function neighbor(board, idx, side) {
    const r = Math.floor(idx / board.cols), c = idx % board.cols;
    const d = MC.Config.DIRS[side];
    const nr = r + d[0], nc = c + d[1];
    if (nr < 0 || nc < 0 || nr >= board.rows || nc >= board.cols) return -1;
    return nr * board.cols + nc;
  }

  // Color Logic: tiap warna mengalir sebagai kanal terpisah. Filter hanya melewatkan warnanya,
  // mixer memancarkan hijau (G) bila cyan (C) dan kuning (Y) sama-sama tiba di sisi masukannya,
  // dan Target hanya benar jika menerima tepat warna yang diminta.
  function traceColor(board) {
    const C = MC.Components, tiles = board.tiles;
    const powered = new Map(), colors = new Map(), arrive = new Map();
    const addColor = (i, c) => { if (!colors.has(i)) colors.set(i, new Set()); colors.get(i).add(c); };

    function flow(color, emitters) {
      const seen = new Set(), queue = [];
      emitters.forEach((e) => {
        seen.add(e.idx); queue.push(e); addColor(e.idx, color);
        if (!powered.has(e.idx)) powered.set(e.idx, e.dist);
      });
      for (let q = 0; q < queue.length; q++) {
        const cur = queue[q];
        for (const side of cur.sides) {
          const n = neighbor(board, cur.idx, side);
          if (n < 0 || seen.has(n)) continue;
          const nt = tiles[n], entry = (side + 2) % 4;
          if (!C.connectsTo(nt, entry)) continue;
          if (nt.type === 'filter' && nt.color !== color) continue;
          if (nt.type === 'mixer') {
            if (entry === (nt.rot + 1) % 4) continue; // sisi keluaran mixer tidak menerima energi
            if (!arrive.has(n)) arrive.set(n, new Set());
            arrive.get(n).add(color);
            seen.add(n); addColor(n, color);
            if (!powered.has(n)) powered.set(n, cur.dist + 1);
            continue;
          }
          seen.add(n); addColor(n, color);
          if (!powered.has(n)) powered.set(n, cur.dist + 1);
          queue.push({ idx: n, dist: cur.dist + 1, sides: C.conns(nt) });
        }
      }
    }

    const byColor = {};
    tiles.forEach((t, i) => {
      if (t.type === 'source') (byColor[t.color] = byColor[t.color] || []).push({ idx: i, dist: 0, sides: C.conns(t) });
    });
    for (const c in byColor) flow(c, byColor[c]);
    const mixEmit = [];
    arrive.forEach((set, i) => {
      if (set.has('C') && set.has('Y')) mixEmit.push({ idx: i, dist: powered.get(i), sides: [(tiles[i].rot + 1) % 4] });
    });
    if (mixEmit.length) flow('G', mixEmit);

    const targets = [], targetsOn = [], wrong = [], leaks = [];
    tiles.forEach((t, i) => {
      if (t.type !== 'target') return;
      targets.push(i);
      const set = colors.get(i);
      if (set && set.size === 1 && set.has(t.color)) targetsOn.push(i);
      else if (set) wrong.push(i);
    });
    powered.forEach((_, idx) => {
      const t = tiles[idx];
      if (t.type === 'source' || t.type === 'mixer') return;
      for (const side of C.conns(t)) {
        const n = neighbor(board, idx, side);
        if (n < 0 || !C.connectsTo(tiles[n], (side + 2) % 4)) { leaks.push(idx); break; }
      }
    });
    return { powered, colors, targets, targetsOn, wrong, leaks, solved: targets.length > 0 && targetsOn.length === targets.length };
  }

  // Menelusuri aliran energi dari semua Source (BFS) berdasarkan data koneksi aktual tiap ubin.
  function trace(board) {
    if (board.colorMode) return traceColor(board);
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
