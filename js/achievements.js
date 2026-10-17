(function (g) {
  const MC = (g.MC = g.MC || {});

  const played = (ctx, mode) => ctx.modeId === mode && ctx.completed;

  const LIST = [
    { id: 'first_connection', icon: '🔌', name: 'First Connection', desc: 'Selesaikan level pertama', check: (c) => c.stats.levelsCompleted >= 1 },
    { id: 'perfect_circuit', icon: '🌟', name: 'Perfect Circuit', desc: 'Raih 3 bintang', check: (c) => !!c.result && c.result.stars === 3 },
    { id: 'quick_solver', icon: '⚡', name: 'Quick Solver', desc: 'Selesaikan level di bawah batas waktu', check: (c) => !!c.result && c.result.quick === true },
    { id: 'no_help', icon: '🧠', name: 'No Help Needed', desc: 'Selesaikan level tanpa hint', check: (c) => !!c.result && c.result.hints === 0 },
    { id: 'circuit_explorer', icon: '🧭', name: 'Circuit Explorer', desc: 'Mainkan 5 mode berbeda', check: (c) => Object.keys(c.stats.modePlays).filter((m) => c.stats.modePlays[m] > 0).length >= 5 },
    { id: 'memory_master', icon: '🧩', name: 'Memory Master', desc: 'Selesaikan Memory Circuit', check: (c) => played(c, 'memory') },
    { id: 'color_expert', icon: '🎨', name: 'Color Expert', desc: 'Selesaikan Color Logic', check: (c) => played(c, 'color-logic') },
    { id: 'double_trouble', icon: '⧉', name: 'Double Trouble', desc: 'Selesaikan Dual Circuit', check: (c) => played(c, 'dual-circuit') },
    { id: 'daily_habit', icon: '☀', name: 'Daily Habit', desc: 'Selesaikan Daily Circuit 3 hari berbeda', check: (c) => c.stats.dailyDays.length >= 3 },
    { id: 'endless_starter', icon: '∞', name: 'Endless Starter', desc: 'Selesaikan 5 puzzle Endless Circuit', check: (c) => c.stats.endlessSolved >= 5 },
    { id: 'mastermind', icon: '🎓', name: 'Mastermind', desc: 'Selesaikan 10 level Circuit Master', check: (c) => Object.keys((c.progress.master || { levels: {} }).levels).length >= 10 },
    { id: 'circuit_legend', icon: '👑', name: 'Circuit Legend', desc: 'Buka semua achievement lainnya', check: (c) => LIST.filter((a) => a.id !== 'circuit_legend').every((a) => c.unlocked[a.id]) }
  ];

  MC.Achievements = {
    list: LIST,
    // Memeriksa syarat dengan kode sungguhan; mengembalikan id achievement yang baru terbuka.
    check(ctx) {
      const S = MC.Storage.data;
      const full = {
        stats: S.stats, progress: S.progress, unlocked: S.achievements,
        modeId: ctx.modeId, completed: !!ctx.completed, result: ctx.result || null
      };
      const fresh = [];
      let changed = true;
      while (changed) {
        changed = false;
        for (const a of LIST) {
          if (S.achievements[a.id]) continue;
          let ok = false;
          try { ok = !!a.check(full); } catch (e) { ok = false; }
          if (ok) { S.achievements[a.id] = Date.now(); fresh.push(a.id); changed = true; }
        }
      }
      return fresh;
    },
    get(id) { return LIST.find((a) => a.id === id); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
