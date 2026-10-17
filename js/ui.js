(function (g) {
  const MC = (g.MC = g.MC || {});
  const $ = (id) => document.getElementById(id);

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === 'class') el.className = attrs[k];
      else if (k.startsWith('data-') || k.startsWith('aria-') || k === 'role' || k === 'type') el.setAttribute(k, attrs[k]);
      else if (k === 'disabled') { if (attrs[k]) el.disabled = true; }
      else el[k] = attrs[k];
    }
    kids.forEach((k) => { if (k != null) el.append(k.nodeType ? k : document.createTextNode(String(k))); });
    return el;
  }

  const stack = [];
  let toastTimer = null;
  let current = 'menu';

  const UI = {
    h, $,
    current() { return current; },

    show(name) {
      document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.id !== 'screen-' + name; });
      current = name;
      window.scrollTo(0, 0);
    },

    toast(msg) {
      const t = $('toast');
      t.textContent = msg; t.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { t.hidden = true; }, 2400);
    },

    modalOpen() { return stack.length > 0; },
    closeTop() { if (stack.length) stack[stack.length - 1].dismiss(); },

    // buttons: [{label, kind, onClick}]; onClose dipanggil bila ditutup via Esc/latar.
    modal(opts) {
      const back = h('div', { class: 'modal-backdrop' });
      const box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title });
      box.append(h('h2', {}, opts.title));
      const body = h('div', { class: 'modal-body' });
      if (typeof opts.body === 'string') body.textContent = opts.body; else if (opts.body) body.append(opts.body);
      box.append(body);
      const row = h('div', { class: 'modal-actions' });
      const entry = {};
      function remove() {
        back.remove();
        const i = stack.indexOf(entry);
        if (i >= 0) stack.splice(i, 1);
      }
      entry.dismiss = () => { if (opts.cancelable === false) return; remove(); if (opts.onClose) opts.onClose(); };
      (opts.buttons || []).forEach((b) => {
        const btn = h('button', { class: 'btn ' + (b.kind || ''), type: 'button' }, b.label);
        btn.addEventListener('click', () => { remove(); if (b.onClick) b.onClick(); });
        row.append(btn);
      });
      box.append(row);
      back.append(box);
      back.addEventListener('mousedown', (e) => { if (e.target === back) entry.dismiss(); });
      $('modal-root').append(back);
      stack.push(entry);
      const first = row.querySelector('button');
      if (first) first.focus();
      return entry;
    },

    confirm(title, message, yesLabel, onYes) {
      return this.modal({
        title, body: message,
        buttons: [{ label: 'Batal' }, { label: yesLabel, kind: 'primary', onClick: onYes }]
      });
    },

    tutorial(mode, onDone) {
      const ol = h('ol', {});
      mode.tutorial.steps.forEach((s) => ol.append(h('li', {}, s)));
      return this.modal({
        title: mode.tutorial.title, body: ol,
        buttons: [{ label: 'Mulai bermain', kind: 'primary', onClick: onDone }],
        onClose: onDone
      });
    },

    pause(onResume) {
      return this.modal({
        title: 'Jeda', body: 'Timer dihentikan. Papan disembunyikan sementara.',
        buttons: [{ label: 'Lanjut', kind: 'primary', onClick: onResume }],
        onClose: onResume
      });
    },

    renderMenuFoot() {
      const S = MC.Storage;
      $('menu-foot').textContent = '★ ' + S.totalStars() + ' bintang · 🏆 ' + Object.keys(S.data.achievements).length + '/' + MC.Achievements.list.length;
    },

    renderModes(onPick) {
      const grid = $('mode-grid');
      grid.innerHTML = '';
      MC.Config.MODES.forEach((m) => {
        const mode = MC.Modes[m.id];
        const avail = !!mode;
        const total = avail ? MC.Levels.count(m.id) : 0;
        const done = MC.Storage.completedCount(m.id);
        const card = h('button', { class: 'card', type: 'button', 'data-action': 'pick-mode', 'data-mode': m.id, disabled: !avail },
          h('span', { class: 'ico', 'aria-hidden': 'true' }, m.icon),
          h('h3', {}, m.name),
          h('p', {}, m.desc),
          h('span', { class: 'meta' },
            h('span', {}, '●'.repeat(m.difficulty) + '○'.repeat(3 - m.difficulty)),
            h('span', { class: avail ? '' : 'soon' }, avail ? done + '/' + total + ' level' : 'Segera hadir')));
        grid.append(card);
      });
    },

    renderLevels(modeId, onPick) {
      const mode = MC.Modes[modeId], cfg = MC.Config.MODES.find((m) => m.id === modeId);
      $('levels-title').textContent = cfg.name;
      $('levels-desc').textContent = cfg.desc;
      const grid = $('level-grid');
      grid.innerHTML = '';
      const done = MC.Storage.levelsOf(modeId);
      const total = MC.Levels.count(modeId);
      for (let i = 0; i < total; i++) {
        const rec = done[i];
        const unlocked = i === 0 || !!done[i - 1] || !!rec;
        const stars = rec ? '★'.repeat(rec.stars) + '☆'.repeat(3 - rec.stars) : '';
        grid.append(h('button', { class: 'lvl', type: 'button', 'data-action': 'pick-level', 'data-index': i, disabled: !unlocked },
          h('b', {}, unlocked ? i + 1 : '🔒'),
          h('small', {}, MC.Levels.label(modeId, i)),
          h('span', { class: 'st' }, stars)));
      }
    },

    setHud(s) {
      $('h-moves').textContent = s.moves;
      $('h-ideal').textContent = s.ideal;
      $('h-hints').textContent = s.hints;
      this.setTime(s.elapsed);
    },
    setTime(ms) { $('h-time').textContent = MC.Scoring.formatTime(ms); },
    status(msg, kind) {
      const el = $('g-status');
      el.textContent = msg || '';
      el.className = 'status' + (kind ? ' ' + kind : '');
    },
    setGameHeader(modeName, label) {
      $('g-mode').textContent = modeName;
      $('g-level').textContent = label;
    },

    renderResult(r) {
      const stars = $('r-stars');
      stars.innerHTML = '';
      for (let i = 0; i < 3; i++) stars.append(h('span', { class: i < r.stars ? 'on' : '' }, '★'));
      const grid = $('r-grid');
      grid.innerHTML = '';
      const rows = [
        ['Waktu', MC.Scoring.formatTime(r.timeMs)], ['Gerakan', r.moves], ['Ideal ≤', r.ideal],
        ['Hint', r.hints], ['Skor', r.practice ? '—' : r.score], ['Terbaik', r.practice ? '—' : r.best]
      ];
      rows.forEach(([k, v]) => grid.append(h('div', {}, h('dt', {}, k), h('dd', {}, v))));
      const ach = $('r-ach');
      ach.innerHTML = '';
      if (r.practice) ach.append(h('p', { class: 'muted' }, 'Mode latihan: skor dan progres tidak disimpan.'));
      r.newAch.forEach((id) => {
        const a = MC.Achievements.get(id);
        ach.append(h('div', { class: 'new' }, '🏆 Achievement baru: ' + a.name));
      });
      $('r-next').hidden = !r.hasNext;
    },

    renderAchievements() {
      const S = MC.Storage.data;
      const list = $('ach-list');
      list.innerHTML = '';
      let n = 0;
      MC.Achievements.list.forEach((a) => {
        const on = !!S.achievements[a.id];
        if (on) n++;
        list.append(h('li', { class: on ? '' : 'locked' },
          h('span', { class: 'ai', 'aria-hidden': 'true' }, on ? a.icon : '🔒'),
          h('div', {}, h('b', {}, a.name), h('small', {}, a.desc))));
      });
      $('ach-summary').textContent = n + ' dari ' + MC.Achievements.list.length + ' terbuka';
    },

    renderStats() {
      const st = MC.Storage.data.stats;
      const plays = st.modePlays;
      let fav = '—', best = 0;
      for (const m in plays) if (plays[m] > best) { best = plays[m]; fav = (MC.Config.MODES.find((x) => x.id === m) || { name: m }).name; }
      const items = [
        ['Level selesai', st.levelsCompleted], ['Waktu bermain', MC.Scoring.formatTime(st.totalTimeMs)],
        ['Total gerakan', st.totalMoves], ['Hint dipakai', st.hintsUsed], ['Total bintang', MC.Storage.totalStars()],
        ['Mode favorit', fav], ['Daily streak', st.dailyStreak],
        ['Achievement', Object.keys(MC.Storage.data.achievements).length + '/' + MC.Achievements.list.length]
      ];
      const grid = $('stats-grid');
      grid.innerHTML = '';
      items.forEach(([k, v]) => grid.append(h('div', { class: 'stat' }, h('small', {}, k), h('b', {}, v))));
      const rec = $('stats-records');
      rec.innerHTML = '';
      MC.Config.MODES.forEach((m) => rec.append(h('div', {}, h('span', {}, m.name), h('b', {}, st.modeBest[m.id] || '—'))));
    },

    renderSettings() { $('set-motion').checked = MC.Storage.data.settings.reduceMotion; }
  };
  MC.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);
