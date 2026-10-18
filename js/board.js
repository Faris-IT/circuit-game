(function (g) {
  const MC = (g.MC = g.MC || {});

  const SVG = {
    straight: '<path class="wire" d="M50 0V100"/>',
    corner: '<path class="wire" d="M50 0V50H100"/>',
    tee: '<path class="wire" d="M50 0V100M50 50H100"/><circle class="hub" cx="50" cy="50" r="7"/>',
    cross: '<path class="wire" d="M50 0V100M0 50H100"/><circle class="hub" cx="50" cy="50" r="9"/>',
    source: '<path class="wire" d="M50 0V50"/><circle class="node src" cx="50" cy="50" r="24"/><circle class="src-core" cx="50" cy="50" r="8" fill="#0b0e17" opacity=".55"/>',
    target: '<path class="wire" d="M50 0V50"/><circle class="node tgt" cx="50" cy="50" r="24"/><circle class="tgt-core" cx="50" cy="50" r="9"/>',
    blocker: '<rect class="blk" x="14" y="14" width="72" height="72" rx="8"/><path class="blk-x" d="M32 32L68 68M68 32L32 68"/>',
    empty: '<circle class="dot" cx="50" cy="50" r="3"/>',
    // Filter: lurus dengan badan bersimbol. Mixer: tiga sisi, masukan di sisi 0 dan 2, keluaran di sisi 1 (panah).
    filter: '<path class="wire" d="M50 0V100"/><rect class="fbody" x="26" y="34" width="48" height="32" rx="7"/>',
    mixer: '<path class="wire" d="M50 0V100M50 50H100"/><circle class="mixbody" cx="50" cy="50" r="19"/><path class="marrow" d="M74 40L90 50L74 60Z"/>'
  };
  const SPIN = { straight: 1, corner: 1, tee: 1, source: 1, target: 1, filter: 1, mixer: 1 };
  const NOTCH = '<path class="notch" d="M40 0H60L50 13Z"/>';
  const HAS_NOTCH = { straight: 1, corner: 1, tee: 1, filter: 1, mixer: 1 };
  const COLOR_CLASSES = ['col-C', 'col-Y', 'col-G', 'col-multi'];

  const View = {
    root: null, board: null, els: [], angles: [], cols: 0, onTile: null, mask: null,

    mount(container, board, onTile) {
      this.root = container; this.board = board; this.els = []; this.angles = [];
      this.cols = board.cols; this.onTile = onTile; this.mask = null;
      container.innerHTML = '';
      container.className = 'board';
      container.style.setProperty('--cols', board.cols);
      container.style.setProperty('--rows', board.rows);
      const COL = MC.Config.COLORS;
      board.tiles.forEach((t, i) => {
        const el = document.createElement('button');
        el.type = 'button';
        const fixed = t.locked && MC.Components.TYPES[t.type].rotatable; // bisa diputar tetapi dikunci
        let cls = 'tile type-' + t.type + (t.locked ? ' locked' : '') + (fixed ? ' fixed' : '');
        if (t.permanent) cls += ' perm';
        if (t.color) cls += ' tc-' + t.color;
        if (t.type === 'source') cls += ' on' + (t.color ? ' col-' + t.color : '');
        el.className = cls;
        el.dataset.idx = i;
        el.tabIndex = i === 0 ? 0 : -1;
        let html = '<svg viewBox="0 0 100 100" aria-hidden="true">' + SVG[t.type] + (HAS_NOTCH[t.type] ? NOTCH : '') + '</svg>';
        if (t.type === 'mixer') html += '<span class="badge" aria-hidden="true">+</span>';
        else if (t.color && (t.type === 'source' || t.type === 'target' || t.type === 'filter')) html += '<span class="badge" aria-hidden="true">' + COL[t.color].sym + '</span>';
        el.innerHTML = html;
        this.angles[i] = t.rot * 90;
        container.appendChild(el);
        this.els.push(el);
        this._apply(i);
        this.label(i);
      });
      container.onclick = (e) => {
        const b = e.target.closest('.tile');
        if (b && this.onTile) this.onTile(+b.dataset.idx);
      };
    },

    _apply(i) {
      const t = this.board.tiles[i];
      const el = this.els[i];
      const s = el && el.firstChild;
      if (s && SPIN[t.type]) s.style.transform = 'rotate(' + this.angles[i] + 'deg)';
    },

    label(i) {
      const t = this.board.tiles[i];
      const r = Math.floor(i / this.cols) + 1, c = (i % this.cols) + 1;
      const hidden = this.mask && this.mask.has(i);
      const base = 'Baris ' + r + ', kolom ' + c + ': ' + (hidden ? 'tersembunyi' : MC.Components.describe(t)) + (t.permanent ? ', permanen' : '');
      this.els[i].setAttribute('aria-label', t.locked ? base + ' (terkunci)' : base + '. Tekan untuk memutar.');
    },

    // Putar visual satu ubin sebesar delta*90 derajat (negatif untuk undo).
    rotateTile(i, delta) {
      this.angles[i] += delta * 90;
      this._apply(i);
      this.label(i);
    },

    // Sinkronkan ulang tanpa animasi (restart / ganti level).
    reset() {
      this.root.classList.add('instant');
      this.board.tiles.forEach((t, i) => { this.angles[i] = t.rot * 90; this._apply(i); this.label(i); });
      this.clearFlow(); this.clearHint(); this.clearWarn();
      void this.root.offsetWidth;
      this.root.classList.remove('instant');
    },

    flow(trace, reduceMotion) {
      this.clearFlow();
      const colors = trace.colors;
      this.els.forEach((el, i) => {
        if (!trace.powered.has(i)) return;
        const t = this.board.tiles[i];
        if (colors && t.type === 'target' && t.color) {
          const set = colors.get(i);
          if (!(set && set.size === 1 && set.has(t.color))) { el.classList.add('wrongc'); return; }
        }
        el.style.setProperty('--d', reduceMotion ? '0ms' : trace.powered.get(i) * 70 + 'ms');
        el.classList.add('on');
        if (colors && t.type !== 'source') {
          const set = colors.get(i);
          if (set) el.classList.add(set.size === 1 ? 'col-' + [...set][0] : 'col-multi');
        }
      });
    },

    clearFlow() {
      this.els.forEach((el, i) => {
        el.classList.remove('err', 'wrongc');
        if (this.board.tiles[i].type !== 'source') {
          el.classList.remove('on');
          COLOR_CLASSES.forEach((c) => el.classList.remove(c));
        }
        el.style.removeProperty('--d');
      });
    },

    markErrors(list) {
      list.forEach((i) => { const el = this.els[i]; el.classList.remove('err'); void el.offsetWidth; el.classList.add('err'); });
    },

    markHint(i) { this.clearHint(); if (this.els[i]) this.els[i].classList.add('hint'); },
    clearHint() { this.els.forEach((el) => el.classList.remove('hint')); },

    // Peringatan perubahan papan (Unstable Grid).
    markWarn(i) { this.clearWarn(); if (this.els[i]) this.els[i].classList.add('warn'); },
    clearWarn() { this.els.forEach((el) => el.classList.remove('warn')); },

    // Menyembunyikan ubin (Memory Circuit). set = Set indeks, atau null untuk membuka semua.
    setMask(set) {
      this.mask = set && set.size ? set : null;
      this.els.forEach((el, i) => { el.classList.toggle('masked', !!(this.mask && this.mask.has(i))); this.label(i); });
    },

    // Fase menghafal (Memory Circuit): segitiga arah tampil di semua ubin yang bisa diputar.
    setMemorizing(v) { if (this.root) this.root.classList.toggle('memorize', !!v); },

    focus(i) {
      this.els.forEach((el, k) => { el.tabIndex = k === i ? 0 : -1; });
      if (this.els[i]) this.els[i].focus();
    },

    moveFocus(dr, dc) {
      const cur = this.els.findIndex((el) => el === document.activeElement);
      if (cur < 0) return false;
      const r = Math.floor(cur / this.cols) + dr, c = (cur % this.cols) + dc;
      if (r < 0 || c < 0 || r >= this.board.rows || c >= this.cols) return true;
      this.focus(r * this.cols + c);
      return true;
    },

    setPaused(v) { if (this.root) this.root.classList.toggle('paused', v); }
  };

  MC.BoardView = View;
})(typeof window !== 'undefined' ? window : globalThis);
