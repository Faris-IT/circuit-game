(function (g) {
  const MC = (g.MC = g.MC || {});
  const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : d);
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

  function defaults() {
    return {
      version: 1,
      settings: { reduceMotion: false },
      stats: {
        levelsCompleted: 0, totalTimeMs: 0, totalMoves: 0, hintsUsed: 0,
        modePlays: {}, modeBest: {}, dailyStreak: 0, bestDailyStreak: 0,
        dailyDays: [], endlessSolved: 0
      },
      progress: {},
      achievements: {},
      tutorialSeen: {}
    };
  }

  function sanitize(raw) {
    const d = defaults();
    if (!isObj(raw)) return d;
    if (isObj(raw.settings)) d.settings.reduceMotion = raw.settings.reduceMotion === true;
    if (isObj(raw.stats)) {
      const s = raw.stats;
      ['levelsCompleted', 'totalTimeMs', 'totalMoves', 'hintsUsed', 'dailyStreak', 'bestDailyStreak', 'endlessSolved']
        .forEach((k) => { d.stats[k] = num(s[k]); });
      ['modePlays', 'modeBest'].forEach((k) => {
        if (isObj(s[k])) for (const m in s[k]) d.stats[k][m] = num(s[k][m]);
      });
      if (Array.isArray(s.dailyDays)) d.stats.dailyDays = s.dailyDays.filter((x) => typeof x === 'string').slice(-400);
    }
    if (isObj(raw.progress)) {
      for (const m in raw.progress) {
        const p = raw.progress[m];
        if (!isObj(p) || !isObj(p.levels)) continue;
        const out = { levels: {} };
        for (const i in p.levels) {
          const l = p.levels[i];
          if (!isObj(l) || !/^\d+$/.test(i)) continue;
          out.levels[i] = { stars: Math.min(3, num(l.stars)), moves: num(l.moves), timeMs: num(l.timeMs), score: num(l.score) };
        }
        d.progress[m] = out;
      }
    }
    if (isObj(raw.achievements)) for (const k in raw.achievements) d.achievements[k] = num(raw.achievements[k], 1);
    if (isObj(raw.tutorialSeen)) for (const k in raw.tutorialSeen) d.tutorialSeen[k] = raw.tutorialSeen[k] === true;
    return d;
  }

  const Storage = {
    data: defaults(),
    load() {
      try {
        const txt = g.localStorage.getItem(MC.Config.STORAGE_KEY);
        this.data = sanitize(txt ? JSON.parse(txt) : null);
      } catch (e) {
        this.data = defaults();
      }
      return this.data;
    },
    save() {
      try { g.localStorage.setItem(MC.Config.STORAGE_KEY, JSON.stringify(this.data)); return true; }
      catch (e) { return false; }
    },
    reset() {
      this.data = defaults();
      this.save();
    },
    levelsOf(modeId) {
      const p = this.data.progress[modeId];
      return p ? p.levels : {};
    },
    completedCount(modeId) { return Object.keys(this.levelsOf(modeId)).length; },
    totalStars() {
      let t = 0;
      for (const m in this.data.progress) for (const i in this.data.progress[m].levels) t += this.data.progress[m].levels[i].stars;
      return t;
    },
    _sanitize: sanitize
  };
  MC.Storage = Storage;
})(typeof window !== 'undefined' ? window : globalThis);
