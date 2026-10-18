(function (g) {
  const MC = (g.MC = g.MC || {});
  const pad = (n) => String(n).padStart(2, '0');

  // Semua perhitungan tanggal memakai tanggal LOKAL perangkat (tengah hari agar aman dari pergantian DST).
  MC.Daily = {
    active: null,
    key(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); },
    parse(key) { const p = key.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2], 12); },
    shift(key, delta) { const d = this.parse(key); d.setDate(d.getDate() + delta); return this.key(d); },
    seed(key) { return (Math.imul(parseInt(key.replace(/-/g, ''), 10), 2654435761) >>> 0) % 2147483647; },
    // Ukuran papan mengikuti hari dalam pekan (Min..Sab): akhir pekan lebih besar.
    size(key) { return [6, 5, 5, 5, 6, 6, 7][this.parse(key).getDay()]; },
    streakEnding(days, endKey) {
      const set = new Set(days);
      let n = 0, k = endKey;
      while (set.has(k)) { n++; k = this.shift(k, -1); }
      return n;
    },
    // Streak yang masih hidup: hari ini sudah selesai, atau kemarin selesai dan hari ini masih bisa disambung.
    current(days, todayKey) {
      const set = new Set(days);
      if (set.has(todayKey)) return this.streakEnding(days, todayKey);
      const y = this.shift(todayKey, -1);
      return set.has(y) ? this.streakEnding(days, y) : 0;
    }
  };

  MC.Levels.builders.daily = {
    count() { return 1; },
    label() { return '—'; },
    build() {
      const key = MC.Daily.active || MC.Daily.key();
      const size = MC.Daily.size(key);
      const board = MC.Generator.generate({ rows: size, cols: size, seed: MC.Daily.seed(key), blockers: 0.15 });
      return MC.Levels.finish(board, { size, name: 'Daily ' + key, kind: 'generated' });
    }
  };

  MC.Modes.daily = {
    id: 'daily', single: true,
    rules: { undo: true, undoRefund: true, pause: true, hint: true },
    tutorial: {
      title: 'Daily Circuit',
      steps: [
        'Satu puzzle per hari. Semua pemain dengan tanggal yang sama mendapat papan yang sama.',
        'Hasil pertama hari ini menjadi hasil resmi. Latihan ulang boleh, tetapi tidak mengganti hasil terbaik.',
        'Selesaikan setiap hari berturut-turut untuk membangun streak. Waktu penyelesaian terbaik disimpan di perangkat ini.'
      ]
    },
    prepare() { MC.Daily.active = MC.Daily.key(); },
    init(s) { s.dailyKey = MC.Daily.active; },
    header(s) { return (s.practice ? 'Latihan · ' : '') + 'Daily ' + s.dailyKey + ' · ' + s.size + '×' + s.size; },
    record(s, res, data) {
      const key = s.dailyKey;
      if (data.daily[key]) return;   // hanya hasil pertama yang resmi
      data.daily[key] = { stars: res.stars, moves: res.moves, timeMs: res.timeMs, score: res.score };
      const st = data.stats;
      if (!st.dailyDays.includes(key)) st.dailyDays.push(key);
      st.dailyStreak = MC.Daily.streakEnding(st.dailyDays, key);
      st.bestDailyStreak = Math.max(st.bestDailyStreak, st.dailyStreak);
      st.bestDailyMs = st.bestDailyMs ? Math.min(st.bestDailyMs, res.timeMs) : res.timeMs;
      st.modeBest.daily = Math.max(st.modeBest.daily || 0, res.score);
      res.best = res.score;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
