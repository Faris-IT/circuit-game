(function (g) {
  const MC = (g.MC = g.MC || {});
  const MAX_ERRORS = 3;
  // [ukuran papan, detik menghafal]: papan membesar dan waktu mengamati berkurang.
  const LEVELS = [[4, 5], [4, 5], [5, 5], [5, 4], [5, 4], [6, 4], [6, 3], [6, 3], [7, 3], [7, 2]];

  MC.Levels.builders.memory = {
    count() { return LEVELS.length; },
    label(i) { return LEVELS[i][0] + '×' + LEVELS[i][0] + ' · ' + LEVELS[i][1] + 'd'; },
    build(i) {
      const size = LEVELS[i][0], obs = LEVELS[i][1];
      const board = MC.Generator.generate({ rows: size, cols: size, seed: 64000 + i * 7919, blockers: 0.1 });
      const sol = MC.Solver.solve(board);
      const r = MC.Generator.rng(91000 + i);
      // Susunan yang ditampilkan saat fase menghafal = papan dalam keadaan terselesaikan.
      const reveal = board.tiles.map((t) => t.rot);
      const onPath = new Set();
      sol.path.forEach((p) => { reveal[p.idx] = p.rots[0]; onPath.add(p.idx); });
      // Sebagian besar ubin disembunyikan; ~20% ubin jalur tetap terlihat sebagai petunjuk.
      const hidden = [];
      board.tiles.forEach((t, k) => {
        if (t.locked || !MC.Components.TYPES[t.type].rotatable) return;
        if (onPath.has(k) && r() < 0.2) return;
        hidden.push(k);
      });
      const lv = MC.Levels.finish(board, { size, name: 'Level ' + (i + 1), kind: 'generated' });
      lv.memory = { obs, reveal, hidden };
      return lv;
    }
  };

  function applyReveal(s) { s.lv.memory.reveal.forEach((rot, i) => { s.board.tiles[i].rot = rot; }); }

  function endMemorize(s) {
    s.phase = 'play'; s.locked = false;
    MC.BoardView.setMemorizing(false);
    s.board.tiles.forEach((t, i) => { t.rot = s.initialRots[i]; });
    MC.BoardView.reset();
    MC.BoardView.setMask(new Set(s.lv.memory.hidden));
    MC.Ctl.status('Susun ulang sirkuit dari ingatan. Segitiga ungu menunjukkan arah putar ubin tersembunyi.');
  }

  MC.Modes.memory = {
    id: 'memory',
    // Hint dimatikan: hint akan membocorkan isi ubin yang disembunyikan.
    rules: { undo: true, undoRefund: true, pause: true, hint: false },
    tutorial: {
      title: 'Memory Circuit',
      steps: [
        'Papan ditampilkan dalam keadaan benar selama beberapa detik. Hafalkan jalur, bentuk ubin, dan letak segitiga ungu di tepi tiap ubin.',
        'Lalu papan diacak dan sebagian besar ubin disembunyikan (tanda ?). Segitiga ungu tetap terlihat dan menunjukkan arah putar ubin saat ini: putar sampai posisinya sama dengan yang kamu hafal.',
        'Putar ubin dari ingatanmu, lalu tekan TEST CIRCUIT. Kamu boleh menekan Enter saat fase menghafal untuk mulai lebih cepat.',
        'Tiga kali TEST yang gagal mengakhiri level. Hint dimatikan.'
      ]
    },
    init(s) { s.phase = 'memorize'; s.memLeft = s.lv.memory.obs * 1000; s.locked = true; applyReveal(s); },
    restart(s) { s.phase = 'memorize'; s.memLeft = s.lv.memory.obs * 1000; s.locked = true; applyReveal(s); },
    afterMount(s) {
      if (s.phase !== 'memorize') return;
      MC.BoardView.setMemorizing(true);   // segitiga ungu tampil di semua ubin agar pasangan bentuk-arahnya bisa dihafal
      MC.BoardView.flow(MC.Engine.trace(s.board), true);
      MC.Ctl.status('Hafalkan susunan dan segitiga ungu tiap ubin! (Enter untuk mulai lebih cepat)');
    },
    hud(s) {
      return s.phase === 'memorize'
        ? { extra: { label: 'Hafal', value: Math.max(0, Math.ceil(s.memLeft / 1000)) + 'd' } }
        : { extra: { label: 'Salah', value: s.errors + '/' + MAX_ERRORS } };
    },
    tick(s, dt) {
      if (s.phase !== 'memorize') return;
      s.memLeft -= dt;
      if (s.memLeft <= 0) endMemorize(s);
    },
    skip(s) { if (s.phase === 'memorize') endMemorize(s); },
    onSolved() { MC.BoardView.setMask(null); },
    onFail(s, trace, ctl) {
      if (s.errors < MAX_ERRORS) return;
      s.over = true; s.running = false;
      ctl.showLoss('Terlalu banyak kesalahan', 'Sirkuit gagal diuji ' + MAX_ERRORS + ' kali. Coba lagi dan perhatikan jalurnya lebih teliti.');
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
