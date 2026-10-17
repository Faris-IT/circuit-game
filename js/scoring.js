(function (g) {
  const MC = (g.MC = g.MC || {});

  const Scoring = {
    ideal(par) { return par + Math.ceil(par * 0.2); },
    quickMs(par) { return (8 + par * 4) * 1000; },
    // Bintang: 1 = selesai, 2 = tanpa hint, 3 = tanpa hint dan gerakan/waktu ideal.
    evaluate(r) {
      const ideal = this.ideal(r.par);
      const quick = this.quickMs(r.par);
      let stars = 1;
      if (r.hints === 0) stars = 2;
      if (r.hints === 0 && (r.moves <= ideal || r.timeMs <= quick)) stars = 3;
      const base = 100 * Math.max(1, r.size - 3);
      const efficiency = Math.max(0, ideal * 2 - r.moves) * 10;
      const score = Math.max(10, base + stars * 50 + efficiency - r.hints * 30);
      return { stars, score, ideal, quickMs: quick, quick: r.timeMs <= quick };
    },
    formatTime(ms) {
      const s = Math.floor(ms / 1000);
      return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }
  };
  MC.Scoring = Scoring;
})(typeof window !== 'undefined' ? window : globalThis);
