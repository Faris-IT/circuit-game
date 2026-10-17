(function (g) {
  const MC = (g.MC = g.MC || {});

  const MOVES = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

  MC.Input = {
    // h: {inGame, escape, test, undo, restart, hint}
    init(h) {
      document.addEventListener('keydown', (e) => {
        const t = e.target;
        // Abaikan pintasan saat pemain mengetik di kolom input.
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const k = e.key;
        if (k === 'Escape') { e.preventDefault(); h.escape(); return; }
        if (MC.UI.modalOpen() || !h.inGame()) return;
        const onOtherButton = t && t.tagName === 'BUTTON' && !t.classList.contains('tile');
        if (k === 'Enter' && !onOtherButton) { e.preventDefault(); h.test(); }
        else if (k === 'z' || k === 'Z') { h.undo(); }
        else if (k === 'r' || k === 'R') { h.restart(); }
        else if (k === 'h' || k === 'H') { h.hint(); }
        else if (MOVES[k]) {
          if (MC.BoardView.moveFocus(MOVES[k][0], MOVES[k][1])) e.preventDefault();
        }
      });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
