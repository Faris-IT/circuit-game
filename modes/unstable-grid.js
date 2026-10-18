(function (g) {
  const MC = (g.MC = g.MC || {});
  const SIZES = [4, 4, 5, 5, 5, 6, 6, 6, 7, 7];
  const EVERY = 12000;   // satu ubin berubah setiap 12 detik
  const WARN = 1000;     // diumumkan satu detik sebelumnya

  MC.Levels.builders['unstable-grid'] = {
    count() { return SIZES.length; },
    label(i) { return SIZES[i] + '×' + SIZES[i]; },
    build(i) {
      const size = SIZES[i];
      const seed = 47000 + i * 7919;
      const board = MC.Generator.generate({ rows: size, cols: size, seed, blockers: 0.1 });
      const r = MC.Generator.rng(seed + 5);
      const rot = [];
      board.tiles.forEach((t, k) => { if (!t.locked && MC.Components.TYPES[t.type].rotatable) rot.push(k); });
      rot.forEach((k) => { board.tiles[k].permanent = r() < 0.45; });
      // Pastikan cukup banyak ubin tidak permanen agar papan benar-benar "tidak stabil".
      const need = Math.max(3, Math.ceil(rot.length * 0.3));
      let free = rot.filter((k) => !board.tiles[k].permanent);
      const perm = rot.filter((k) => board.tiles[k].permanent);
      while (free.length < need && perm.length) {
        const k = perm.splice(Math.floor(r() * perm.length), 1)[0];
        board.tiles[k].permanent = false; free = rot.filter((q) => !board.tiles[q].permanent);
      }
      return MC.Levels.finish(board, { size, name: 'Level ' + (i + 1), kind: 'generated', seed });
    }
  };

  // Memilih ubin tidak permanen dan putaran baru yang benar-benar mengubah koneksinya.
  function pickShift(s) {
    const C = MC.Components, tiles = s.board.tiles;
    const cand = [];
    tiles.forEach((t, i) => { if (!t.locked && !t.permanent && C.TYPES[t.type].rotatable) cand.push(i); });
    if (!cand.length) return null;
    const idx = cand[Math.floor(s.rng() * cand.length)];
    const t = tiles[idx];
    const key = (rot) => C.conns({ type: t.type, rot }).slice().sort().join('');
    const opts = [1, 2, 3].filter((d) => key((t.rot + d) % 4) !== key(t.rot));
    return { idx, delta: opts[Math.floor(s.rng() * opts.length)] };
  }

  function reset(s) { s.shiftIn = EVERY; s.pending = null; s.rng = MC.Generator.rng(s.lv.seed + 1); }

  MC.Modes['unstable-grid'] = {
    id: 'unstable-grid',
    // Undo dimatikan: perubahan papan oleh sistem membuat riwayat undo tidak lagi akurat.
    rules: { undo: false, undoRefund: false, pause: true, hint: true },
    tutorial: {
      title: 'Unstable Grid',
      steps: [
        'Setiap 12 detik, satu ubin tidak permanen berubah arah dengan sendirinya.',
        'Perubahan diumumkan satu detik sebelumnya: ubinnya berkedip merah.',
        'Ubin dengan cincin cyan kecil di sudut kiri bawah bersifat permanen dan tidak pernah diubah sistem.',
        'Siapkan jalur yang mudah diperbaiki, lalu tekan TEST CIRCUIT sebelum papan berubah lagi. Undo dimatikan.'
      ]
    },
    init(s) { reset(s); },
    restart(s) { reset(s); },
    hud(s) { return { extra: { label: 'Berubah', value: Math.max(0, Math.ceil(s.shiftIn / 1000)) + 'd' } }; },
    tick(s, dt) {
      if (s.locked || s.solved || s.over) return;
      s.shiftIn -= dt;
      if (!s.pending && s.shiftIn <= WARN) {
        s.pending = pickShift(s) || { idx: -1, delta: 0 };
        if (s.pending.idx >= 0) {
          MC.BoardView.markWarn(s.pending.idx);
          const r = Math.floor(s.pending.idx / s.board.cols) + 1, c = (s.pending.idx % s.board.cols) + 1;
          MC.Ctl.status('Peringatan: ubin baris ' + r + ', kolom ' + c + ' akan berubah!', 'bad');
        }
      }
      if (s.shiftIn <= 0) {
        const p = s.pending;
        s.shiftIn = EVERY; s.pending = null;
        MC.BoardView.clearWarn();
        if (!p || p.idx < 0) return;
        const t = s.board.tiles[p.idx];
        t.rot = (t.rot + p.delta) % 4;
        MC.BoardView.rotateTile(p.idx, p.delta);
        MC.BoardView.clearFlow(); MC.BoardView.clearHint();
        MC.Ctl.status('Sebuah ubin berubah arah. Periksa ulang jalurmu.');
      }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
