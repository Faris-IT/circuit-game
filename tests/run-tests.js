#!/usr/bin/env node
/*
 * Uji logika Mufa Circuit tanpa browser dan tanpa dependensi: node tests/run-tests.js
 * Memuat skrip dari index.html (tanpa file yang butuh DOM) ke satu konteks vm,
 * lalu memeriksa level, solver, mesin sirkuit, dan alur mode.
 */
const vm = require('vm'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const NEEDS_DOM = new Set(['js/ui.js', 'js/board.js', 'js/input.js', 'js/main.js']);
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]).filter((f) => !NEEDS_DOM.has(f));

const ctx = { console, performance, Math, Date, setTimeout, clearTimeout };
ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of scripts) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const MC = ctx.MC, E = MC.Engine, G = MC.Game;
const noop = () => {};
MC.BoardView = new Proxy({}, { get: () => noop });     // stub tampilan
MC.Ctl = { failPuzzle: (r) => { MC.__fail = r; }, endRun: noop, showLoss: noop, status: noop };

let passed = 0, failed = 0;
function check(ok, name, detail) {
  if (ok) { passed++; console.log('  ok    ' + name); }
  else { failed++; console.log('  GAGAL ' + name + (detail ? ' -> ' + detail : '')); }
}
const section = (t) => console.log('\n' + t);
const rotatable = (b) => b.tiles.findIndex((t) => !t.locked && MC.Components.TYPES[t.type].rotatable);

// Ikuti hint sampai selesai; mengembalikan jumlah gerakan.
function playByHint(s) {
  let guard = 0;
  while (!E.trace(s.board).solved && guard++ < 200) {
    const h = s.board.twins ? MC.Dual.hint(s.board) : MC.Solver.hint(s.board);
    if (!h) return -1;
    for (let c = 0; c < h.clicks; c++) G.rotate(h.idx);
  }
  return E.trace(s.board).solved ? s.moves : -1;
}

const MODES = Object.keys(MC.Modes);
section('1. Setiap level valid (bisa diselesaikan, belum selesai saat mulai)');
for (const m of MODES) {
  const rep = MC.Levels.validate(m), bad = rep.filter((r) => !r.ok);
  check(!bad.length, m + ': ' + rep.length + ' level', JSON.stringify(bad));
}

section('2. Semua mode diselesaikan lewat hint');
for (const m of MODES) {
  if (MC.Modes[m].run || m === 'daily' || m === 'memory') continue;   // mode sesi, harian, dan memory diuji terpisah
  const n = MC.Levels.count(m); let ok = true, detail = '';
  for (let i = 0; i < n; i++) {
    const s = G.start(m, i, false);
    if (s.rules && s.rules.hint === false) continue;
    const moves = playByHint(s);
    if (moves < 0 || (s.limit && moves > s.limit)) { ok = false; detail = 'level ' + (i + 1); break; }
  }
  check(ok, m + ': ' + n + ' level selesai dengan hint dalam batas gerakan', detail);
}

section('3. Memory Circuit dan Circuit Master (fase menghafal)');
for (const [m, count] of [['memory', MC.Levels.count('memory')], ['master', MC.Levels.count('master')]]) {
  let ok = true, detail = '';
  for (let i = 0; i < count; i++) {
    const s = G.start(m, i, false);
    const mem = s.lv.memory || (s.lv.mech && s.lv.mech.memory && s.lv.memory);
    if (!mem) continue;
    if (!E.trace(s.board).solved) { ok = false; detail = 'tampilan hafalan level ' + (i + 1) + ' belum benar'; break; }
    MC.Modes[m].tick(s, 99999);
    if (E.trace(s.board).solved) { ok = false; detail = 'level ' + (i + 1) + ' sudah selesai setelah menghafal'; break; }
    s.board.tiles.forEach((t, k) => { if (!t.locked) while (t.rot !== mem.reveal[k]) G.rotate(k); });
    if (!E.trace(s.board).solved) { ok = false; detail = 'susunan hafalan level ' + (i + 1) + ' tidak menyelesaikan puzzle'; break; }
  }
  check(ok, m + ': susunan hafalan benar dan bisa dibangun ulang', detail);
}

section('4. Dual Circuit');
{
  let ok = true, detail = '';
  for (let i = 0; i < MC.Levels.count('dual-circuit'); i++) {
    const s = G.start('dual-circuit', i, false);
    const snap = s.board.tiles.map((t) => t.rot).join();
    const k = rotatable(s.board); G.rotate(k); G.undo();
    if (s.board.tiles.map((t) => t.rot).join() !== snap) { ok = false; detail = 'undo level ' + (i + 1); break; }
    const mv = playByHint(s);
    if (mv !== s.par) { ok = false; detail = 'level ' + (i + 1) + ': gerakan ' + mv + ' != par ' + s.par; break; }
  }
  check(ok, '10 level: undo simetris pada ubin bersama, hint mencapai par', detail);
  let ok2 = true;
  for (const vertical of [false, true]) for (const seed of [11, 4242, 987654]) for (const [n, p, mb] of [[4, 2, 1], [4, 3, 2], [5, 3, 1], [5, 5, 3]]) {
    const d = MC.Dual.build(n, seed + n, p, mb, vertical), b = d.board; let mv = 0, g = 0;
    while (!E.trace(b).solved && g++ < 100) {
      const h = MC.Dual.hint(b); if (!h) { ok2 = false; break; }
      for (let c = 0; c < h.clicks; c++) { b.tiles[h.idx].rot = (b.tiles[h.idx].rot + 1) % 4; const tw = b.twins[h.idx]; if (tw >= 0) b.tiles[tw].rot = (b.tiles[tw].rot + 1) % 4; mv++; }
    }
    if (!E.trace(b).solved || mv !== d.par || b.cols !== (vertical ? n : 2 * n + 1)) ok2 = false;
  }
  check(ok2, 'susunan berdampingan dan vertikal: 24 papan acak terselesaikan dengan par yang benar');
}

section('5. Endless Circuit');
{
  const M = MC.Modes.endless; let ok = true, detail = '', n = 0;
  for (let run = 0; run < 15 && ok; run++) {
    M.prepare(); const s = G.start('endless', 0, false);
    for (let k = 0; k < 40; k++) {
      s.run.solved = k; const lv = M.next(s); s.run.n++; n++;
      if (!lv.solvable || lv.par <= 0 || E.trace(lv.board).solved || lv.limit <= lv.par) { ok = false; detail = 'run ' + run + ' puzzle ke-' + k; break; }
    }
  }
  check(ok, n + ' puzzle acak (kesulitan naik): valid, bisa diselesaikan, batas gerakan > par', detail);
  M.prepare(); const s = G.start('endless', 0, false);
  playByHint(s); G.test();
  const pts = M.award(s);
  check(pts > 0 && s.run.streak === 1 && s.run.solved === 1, 'puzzle selesai menambah skor dan streak');
  G.nextPuzzle(M.next(s)); MC.__fail = null; s.run.left = 40; M.tick(s, 100);
  check(MC.__fail === 'time', 'waktu puzzle habis memicu kegagalan');
  M.lose(s); M.lose(s); const left = M.lose(s);
  check(left === 0 && s.run.streak === 0, 'tiga kegagalan menghabiskan nyawa dan memutus streak');
}

section('6. Circuit Master: aturan gabungan');
{
  let ok = true, detail = '';
  for (let i = 0; i < MC.Levels.count('master'); i++) {
    const s = G.start('master', i, false);
    if (!s.lv.keys || s.lv.keys.length < 2) { ok = false; detail = 'level ' + (i + 1) + ' hanya satu mekanik'; break; }
    if (s.lv.mech.limit && s.rules.undo) { ok = false; detail = 'undo masih aktif pada level dengan batas gerakan ' + (i + 1); break; }
    if (s.lv.mech.memory && s.rules.hint) { ok = false; detail = 'hint masih aktif pada level memory ' + (i + 1); break; }
    if (s.lv.mech.unstable) {
      const before = s.board.tiles.map((t) => t.rot);
      for (let k = 0; k < 60; k++) MC.Modes.master.tick(s, 500);
      if (s.board.tiles.some((t, k) => t.permanent && t.rot !== before[k])) { ok = false; detail = 'ubin permanen berubah pada level ' + (i + 1); break; }
    }
  }
  check(ok, '12 level: minimal dua mekanik, aturan undo/hint sesuai, ubin permanen tidak berubah', detail);
}

section('7. Skor dan achievement');
{
  const s = G.start('classic', 0, false);
  check(typeof MC.Scoring.formatTime(65000) === 'string' && MC.Scoring.formatTime(65000) === '1:05', 'format waktu 65 detik = 1:05');
  check(MC.Achievements.list.length === 12, 'ada 12 achievement');
}

console.log('\n' + (failed ? failed + ' GAGAL, ' + passed + ' lulus' : 'SEMUA LULUS (' + passed + ' pemeriksaan)'));
process.exit(failed ? 1 : 0);
