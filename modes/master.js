(function (g) {
  const MC = (g.MC = g.MC || {});
  const NAMES = { multi: 'Multi Target', limit: 'Move Limit', maze: 'Circuit Maze', color: 'Color Logic', unstable: 'Unstable Grid', memory: 'Memory Circuit', dual: 'Dual Circuit' };
  const RULE = {
    multi: 'Multi Target: semua Target harus menyala sekaligus. Simpang-T membagi aliran, dan satu putaran bisa memutus jalur lain.',
    limit: 'Move Limit: gerakan dibatasi (kotak "Batas"). Undo dimatikan. Saat gerakan terakhir terpakai, sirkuit diuji otomatis dan level gagal jika belum tersambung.',
    maze: 'Circuit Maze: papan penuh penghalang (ikon X merah). Ubin bersudut ungu terkunci dan tidak bisa diputar.',
    color: 'Color Logic: Target hanya menyala jika menerima warna yang tepat (● cyan, ◆ kuning, ■ hijau). Filter menahan warna lain; Mixer menggabungkan cyan + kuning menjadi hijau.',
    unstable: 'Unstable Grid: tiap 12 detik satu ubin tidak permanen berubah arah, diumumkan 1 detik sebelumnya (berkedip). Ubin permanen bertanda cincin cyan. Undo dimatikan.',
    memory: 'Memory Circuit: papan benar tampil sesaat lalu sebagian besar ubin disembunyikan. Tiga kali TEST gagal mengakhiri level. Hint dimatikan.',
    dual: 'Dual Circuit: dua papan berdampingan; kedua sirkuit harus aktif bersamaan. Ubin bertanda ⧉ berputar bersama kembarannya di papan lain.'
  };
  const COLOR_LEGEND = '● cyan (garis penuh) · ◆ kuning (putus-putus) · ■ hijau (titik-titik) · + Mixer: cyan + kuning → hijau';
  const DUAL_LEGEND = '⧉ = ubin bersama: memutar satu ubin ikut memutar kembarannya di papan lain';

  const DEF = () => MC.Data.master;
  const unstableMode = () => MC.Modes['unstable-grid'];
  const memoryMode = () => MC.Modes.memory;

  // Sama seperti Unstable Grid: sebagian ubin diberi tanda permanen, tetapi selalu ada cukup ubin yang bisa berubah.
  function markPermanent(board, seed) {
    const r = MC.Generator.rng(seed + 5);
    const rot = [];
    board.tiles.forEach((t, k) => { if (!t.locked && MC.Components.TYPES[t.type].rotatable) rot.push(k); });
    rot.forEach((k) => { board.tiles[k].permanent = r() < 0.45; });
    const need = Math.max(3, Math.ceil(rot.length * 0.3));
    let free = rot.filter((k) => !board.tiles[k].permanent);
    const perm = rot.filter((k) => board.tiles[k].permanent);
    while (free.length < need && perm.length) {
      const k = perm.splice(Math.floor(r() * perm.length), 1)[0];
      board.tiles[k].permanent = false; free = rot.filter((q) => !board.tiles[q].permanent);
    }
  }

  // Susunan terselesaikan untuk fase menghafal; ~20% ubin jalur tetap terlihat.
  function buildMemory(board, obs, seed) {
    const path = board.solution ? board.solution : MC.Solver.solve(board).path;
    const r = MC.Generator.rng(seed + 3);
    const reveal = board.tiles.map((t) => t.rot);
    const onPath = new Set();
    path.forEach((p) => { reveal[p.idx] = p.rots[0]; onPath.add(p.idx); });
    const hidden = [];
    board.tiles.forEach((t, k) => {
      if (t.locked || !MC.Components.TYPES[t.type].rotatable) return;
      if (onPath.has(k) && r() < 0.2) return;
      hidden.push(k);
    });
    return { obs, reveal, hidden };
  }

  MC.Levels.builders.master = {
    count() { return DEF().length; },
    label(i) { return DEF()[i].keys.map((k) => NAMES[k]).join(' + '); },
    build(i) {
      const L = DEF()[i], n = L.size, seed = 120000 + i * 7919;
      const has = (x) => L.layers.includes(x);
      let board, par = 0;
      if (L.base === 'single') {
        board = MC.Generator.generate(L.maze
          ? { rows: n, cols: n, seed, blockers: 0.3, lockedFiller: 0.2, lockedPath: 0.25 }
          : { rows: n, cols: n, seed, blockers: L.blockers == null ? 0.1 : L.blockers });
      } else if (L.base === 'multi') {
        board = MC.Generator.generateMulti({ rows: n, cols: n, targets: L.targets, seed, blockers: L.blockers });
      } else if (L.base === 'color') {
        board = MC.Generator.generateColor({ rows: n, cols: n, kind: L.kind, seed, trap: 0.08, blockers: L.blockers });
      } else {
        const d = MC.Dual.build(n, seed, L.pairs, L.minBoth, MC.Dual.preferVertical());
        board = d.board; par = d.par;
      }
      if (has('unstable')) markPermanent(board, seed);
      const targets = board.tiles.filter((t) => t.type === 'target').length;
      const lv = MC.Levels.finish(board, { size: n, name: 'Level ' + (i + 1), kind: 'generated', targets, seed });
      if (par) lv.par = par;
      lv.mech = { limit: has('limit'), unstable: has('unstable'), memory: has('memory') };
      lv.base = L.base; lv.keys = L.keys;
      if (lv.mech.limit) lv.limit = lv.par + Math.max(2, Math.ceil(lv.par * (L.slack || 0.4)));
      if (lv.mech.memory) lv.memory = buildMemory(board, L.obs || 4, seed);
      const rules = {};
      if (lv.mech.limit || lv.mech.unstable) { rules.undo = false; rules.undoRefund = false; }
      if (lv.mech.memory) rules.hint = false;
      lv.rules = rules;
      return lv;
    }
  };

  const mechOf = (s) => (s.lv && s.lv.mech) || {};

  MC.Modes.master = {
    id: 'master',
    rules: { undo: true, undoRefund: true, pause: true, hint: true },
    // Aturan gabungan dijelaskan sebelum tiap level dimulai (bukan di tengah level).
    intro(s) {
      return {
        title: 'Level ' + (s.index + 1) + ': ' + s.lv.keys.map((k) => NAMES[k]).join(' + '),
        steps: s.lv.keys.map((k) => RULE[k])
      };
    },
    header(s) { return (s.practice ? 'Latihan · ' : '') + 'Level ' + (s.index + 1) + ' · ' + s.lv.keys.map((k) => NAMES[k]).join(' + '); },
    legendFor(s) {
      if (s.lv.base === 'color') return COLOR_LEGEND;
      if (s.lv.base === 'dual') return DUAL_LEGEND;
      return '';
    },
    init(s) { const m = mechOf(s); if (m.unstable) unstableMode().init(s); if (m.memory) memoryMode().init(s); },
    restart(s) { const m = mechOf(s); if (m.unstable) unstableMode().restart(s); if (m.memory) memoryMode().restart(s); },
    afterMount(s, ctl) { if (mechOf(s).memory) memoryMode().afterMount(s, ctl); },
    hud(s) {
      const m = mechOf(s);
      if (m.memory) return memoryMode().hud(s);
      if (m.unstable) return unstableMode().hud(s);
      return {};
    },
    tick(s, dt) { const m = mechOf(s); if (m.memory) memoryMode().tick(s, dt); if (m.unstable) unstableMode().tick(s, dt); },
    skip(s) { if (mechOf(s).memory) memoryMode().skip(s); },
    onSolved(s) { if (mechOf(s).memory) memoryMode().onSolved(s); },
    onFail(s, trace, ctl) { if (mechOf(s).memory) memoryMode().onFail(s, trace, ctl); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
