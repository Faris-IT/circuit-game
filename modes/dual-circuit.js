(function (g) {
  const MC = (g.MC = g.MC || {});
  // [ukuran tiap papan, jumlah ubin bersama, minimal ubin bersama yang berada di jalur kedua papan]
  const LEVELS = [[4, 2, 1], [4, 2, 1], [4, 3, 1], [4, 3, 2], [5, 3, 1], [5, 3, 2], [5, 4, 2], [5, 4, 2], [5, 5, 2], [5, 5, 3]];

  const clone = (t) => Object.assign({}, t);

  // Dua papan digabung menjadi satu papan: A | pemisah kosong | B (berdampingan), atau ditumpuk vertikal
  // di layar ponsel potret. Pemisah kosong memutus aliran antar papan, sehingga mesin sirkuit biasa dapat dipakai
  // (dua Source, dua Target; menang hanya jika kedua Target menyala).
  // Ubin bersama = pasangan ubin pada posisi sama di kedua papan (board.twins): memutar satu memutar kembarannya.
  function preferVertical() {
    return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(max-width: 600px) and (orientation: portrait)').matches;
  }

  function build(n, seed, pairCount, minBoth, vertical) {
    const W = vertical ? n : 2 * n + 1, H = vertical ? 2 * n + 1 : n, C = MC.Components, G = MC.Generator, S = MC.Solver, E = MC.Engine;
    for (let att = 0; att < 120; att++) {
      let A, B, pa, pb;
      try {
        A = G.generate({ rows: n, cols: n, seed: seed + att * 131, blockers: 0.08 });
        B = G.generate({ rows: n, cols: n, seed: seed + 5000 + att * 137, blockers: 0.08 });
        pa = S.solve(A); pb = S.solve(B);
      } catch (e) { continue; }
      if (!pa || !pb) continue;
      const mapA = new Map(pa.path.map((p) => [p.idx, p])), mapB = new Map(pb.path.map((p) => [p.idx, p]));
      const r = G.rng(seed + att);
      const cand = [];
      for (let k = 0; k < n * n; k++) {
        const a = A.tiles[k], b = B.tiles[k];
        if (a.locked || b.locked || !C.TYPES[a.type].rotatable || !C.TYPES[b.type].rotatable) continue;
        cand.push(k);
      }
      const both = G.shuffle(cand.filter((k) => mapA.has(k) && mapB.has(k)), r);
      const one = G.shuffle(cand.filter((k) => mapA.has(k) !== mapB.has(k)), r);
      if (both.length < minBoth) continue;
      const takeBoth = Math.min(both.length, Math.max(minBoth, Math.ceil(pairCount / 2)));
      const picks = both.slice(0, takeBoth).concat(one).concat(both.slice(takeBoth)).slice(0, pairCount);

      const tiles = new Array(W * H), twins = new Array(W * H).fill(-1);
      const ia = (k) => (vertical ? k : Math.floor(k / n) * W + (k % n));
      const ib = (k) => (vertical ? (n + 1) * n + k : Math.floor(k / n) * W + n + 1 + (k % n));
      for (let k = 0; k < n * n; k++) { tiles[ia(k)] = clone(A.tiles[k]); tiles[ib(k)] = clone(B.tiles[k]); }
      for (let q = 0; q < n; q++) tiles[vertical ? n * W + q : q * W + n] = C.make('empty', 0);

      const sol = [];
      mapA.forEach((p, k) => sol.push({ idx: ia(k), rots: p.rots.slice() }));
      mapB.forEach((p, k) => sol.push({ idx: ib(k), rots: p.rots.slice() }));
      picks.forEach((k) => {
        const x = ia(k), y = ib(k);
        twins[x] = y; twins[y] = x;
        tiles[x].shared = true; tiles[y].shared = true;
        if (mapA.has(k) && mapB.has(k)) {
          // Atur rotasi awal agar ada jumlah klik yang sama-sama membenarkan kedua ubin.
          const kk = 1 + Math.floor(r() * 3);
          tiles[x].rot = (mapA.get(k).rots[0] - kk + 8) % 4;
          tiles[y].rot = (mapB.get(k).rots[0] - kk + 8) % 4;
        }
      });
      const board = { rows: H, cols: W, tiles, solution: sol, twins };
      const par = parOf(board);
      if (par <= 0 || E.trace(board).solved) continue;
      if (!selfCheck(board)) continue;
      return { board, par };
    }
    throw new Error('Dual Circuit gagal dibuat untuk seed ' + seed);
  }

  // Satuan putar: ubin sendiri, atau pasangan ubin bersama. Mengembalikan klik minimum per satuan.
  function units(board) {
    const byIdx = new Map(board.solution.map((p) => [p.idx, p]));
    const done = new Set(), out = [];
    board.solution.forEach((p) => {
      if (done.has(p.idx)) return;
      done.add(p.idx);
      const tw = board.twins[p.idx];
      const q = tw >= 0 ? byIdx.get(tw) : null;
      if (q) done.add(q.idx);
      out.push({ p, q, tw });
    });
    return out;
  }
  function clicksFor(board, u) {
    const cur = board.tiles[u.p.idx].rot;
    for (let c = 0; c < 4; c++) {
      if (u.p.rots.includes((cur + c) % 4) && (!u.q || u.q.rots.includes((board.tiles[u.q.idx].rot + c) % 4))) return c;
    }
    return -1;
  }
  function parOf(board) {
    let par = 0;
    for (const u of units(board)) { const c = clicksFor(board, u); if (c < 0) return -1; par += c; }
    return par;
  }
  // Menerapkan klik minimum pada salinan papan dan memastikan kedua Target menyala.
  function selfCheck(board) {
    const copy = { rows: board.rows, cols: board.cols, tiles: board.tiles.map(clone) };
    for (const u of units(board)) {
      const c = clicksFor(board, u);
      copy.tiles[u.p.idx].rot = (copy.tiles[u.p.idx].rot + c) % 4;
      if (u.tw >= 0 && !u.q) copy.tiles[u.tw].rot = (copy.tiles[u.tw].rot + c) % 4;
      if (u.q) copy.tiles[u.q.idx].rot = (copy.tiles[u.q.idx].rot + c) % 4;
    }
    const t = MC.Engine.trace(copy);
    return t.solved && t.targets.length === 2;
  }

  // Hint: ubin pertama pada solusi yang salah, dengan jumlah klik yang juga membenarkan kembarannya.
  function hint(board) {
    if (MC.Engine.trace(board).solved) return { idx: -1, clicks: 0 };
    const byIdx = new Map(board.solution.map((p) => [p.idx, p]));
    for (const p of board.solution) {
      const cur = board.tiles[p.idx].rot;
      if (p.rots.includes(cur)) continue;
      const tw = board.twins[p.idx];
      const q = tw >= 0 ? byIdx.get(tw) : null;
      for (let c = 1; c <= 3; c++) {
        if (p.rots.includes((cur + c) % 4) && (!q || q.rots.includes((board.tiles[q.idx].rot + c) % 4))) return { idx: p.idx, clicks: c };
      }
    }
    return null;
  }

  MC.Dual = { build, hint, units, clicksFor, preferVertical };

  MC.Levels.builders['dual-circuit'] = {
    count() { return LEVELS.length; },
    label(i) { return LEVELS[i][0] + '×' + LEVELS[i][0] + ' ×2'; },
    build(i) {
      const L = LEVELS[i];
      const d = build(L[0], 110000 + i * 7919, L[1], L[2], preferVertical());
      const lv = MC.Levels.finish(d.board, { size: L[0], name: 'Level ' + (i + 1), kind: 'generated', targets: 2 });
      lv.par = d.par;   // par dihitung per satuan putar, bukan per ubin
      return lv;
    }
  };

  MC.Modes['dual-circuit'] = {
    id: 'dual-circuit',
    rules: { undo: true, undoRefund: true, pause: true, hint: true },
    legend: '⧉ = ubin bersama: memutar satu ubin ikut memutar kembarannya di papan lain',
    tutorial: {
      title: 'Dual Circuit',
      steps: [
        'Ada dua papan berdampingan, masing-masing dengan Source dan Target sendiri. Kedua sirkuit harus aktif bersamaan.',
        'Ubin bertanda ⧉ (sudut ungu) adalah ubin bersama. Ubin di posisi yang sama pada kedua papan berputar bersamaan: satu klik memutar keduanya.',
        'Memperbaiki satu papan bisa merusak papan lain. Cari putaran yang menguntungkan keduanya.',
        'Tekan TEST CIRCUIT. Status menunjukkan berapa Target yang menyala. Undo mengembalikan kedua ubin sekaligus.'
      ]
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
