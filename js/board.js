(function (g) {
  const MC = (g.MC = g.MC || {});

  const SVG = {
    straight: '<path class="wire" d="M50 0V100"/>',
    corner: '<path class="wire" d="M50 0V50H100"/>',
    tee: '<path class="wire" d="M50 0V100M50 50H100"/><circle class="hub" cx="50" cy="50" r="7"/>',
    cross: '<path class="wire" d="M50 0V100M0 50H100"/><circle class="hub" cx="50" cy="50" r="9"/>',
    source: '<path class="wire" d="M50 0V50"/><circle class="node src" cx="50" cy="50" r="24"/><circle cx="50" cy="50" r="8" fill="#0b0e17" opacity=".55"/>',
    target: '<path class="wire" d="M50 0V50"/><circle class="node tgt" cx="50" cy="50" r="24"/><circle class="tgt-core" cx="50" cy="50" r="9"/>',
    blocker: '<rect class="blk" x="14" y="14" width="72" height="72" rx="8"/><path class="blk-x" d="M32 32L68 68M68 32L32 68"/>',
    empty: '<circle class="dot" cx="50" cy="50" r="3"/>'
  };
  const SPIN = { straight: 1, corner: 1, tee: 1, source: 1, target: 1 };

  const View = {
    root: null, board: null, els: [], angles: [], cols: 0, onTile: null,

    mount(container, board, onTile) {
      this.root = container; this.board = board; this.els = []; this.angles = [];
      this.cols = board.cols; this.onTile = onTile;
      container.innerHTML = '';
      container.className = 'board';
      container.style.setProperty('--cols', board.cols);
      container.style.setProperty('--rows', board.rows);
      board.tiles.forEach((t, i) => {
        const el = document.createElement('button');
        el.type = 'button';
        const fixed = t.locked && MC.Components.TYPES[t.type].rotatable; // ubin yang bisa diputar tetapi dikunci
        el.className = 'tile type-' + t.type + (t.locked ? ' locked' : '') + (fixed ? ' fixed' : '');
        el.dataset.idx = i;
        el.tabIndex = i === 0 ? 0 : -1;
        el.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true">' + SVG[t.type] + '</svg>';
        this.angles[i] = t.rot * 90;
        container.appendChild(el);
        this.els.push(el);
        this._apply(i);
        this.label(i);
        if (t.type === 'source') { el.classList.add('on'); }
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
      const base = 'Baris ' + r + ', kolom ' + c + ': ' + MC.Components.describe(t);
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
      this.clearFlow(); this.clearHint();
      void this.root.offsetWidth;
      this.root.classList.remove('instant');
    },

    flow(trace, reduceMotion) {
      this.clearFlow();
      this.els.forEach((el, i) => {
        if (trace.powered.has(i)) {
          el.style.setProperty('--d', reduceMotion ? '0ms' : trace.powered.get(i) * 70 + 'ms');
          el.classList.add('on');
        }
      });
    },

    clearFlow() {
      this.els.forEach((el, i) => {
        el.classList.remove('err');
        if (this.board.tiles[i].type !== 'source') el.classList.remove('on');
        el.style.removeProperty('--d');
      });
    },

    markErrors(list) {
      list.forEach((i) => { const el = this.els[i]; el.classList.remove('err'); void el.offsetWidth; el.classList.add('err'); });
    },

    markHint(i) { this.clearHint(); if (this.els[i]) this.els[i].classList.add('hint'); },
    clearHint() { this.els.forEach((el) => el.classList.remove('hint')); },

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
