(function (g) {
  const MC = (g.MC = g.MC || {});

  // Sisi: 0 = atas, 1 = kanan, 2 = bawah, 3 = kiri. Rotasi searah jarum jam.
  const TYPES = {
    empty:    { glyph: '.', base: [],           rotatable: false, label: 'Kosong' },
    blocker:  { glyph: 'B', base: [],           rotatable: false, label: 'Penghalang' },
    source:   { glyph: 'S', base: [0],          rotatable: false, label: 'Source' },
    target:   { glyph: 'T', base: [0],          rotatable: false, label: 'Target' },
    straight: { glyph: 'I', base: [0, 2],       rotatable: true,  label: 'Lurus' },
    corner:   { glyph: 'L', base: [0, 1],       rotatable: true,  label: 'Sudut' },
    tee:      { glyph: 'Y', base: [0, 1, 2],    rotatable: true,  label: 'Simpang-T' },
    cross:    { glyph: 'X', base: [0, 1, 2, 3], rotatable: false, label: 'Persimpangan' }
  };
  const GLYPH = {};
  for (const k in TYPES) GLYPH[TYPES[k].glyph] = k;

  const rotSides = (base, rot) => base.map((s) => (s + rot) % 4);

  function make(type, rot) {
    return { type, rot: ((rot || 0) % 4 + 4) % 4, locked: !TYPES[type].rotatable };
  }
  function parseToken(tok) {
    const type = GLYPH[tok[0]];
    if (!type) throw new Error('Token tidak dikenal: ' + tok);
    return make(type, parseInt(tok[1] || '0', 10));
  }
  function conns(tile) { return rotSides(TYPES[tile.type].base, tile.rot); }
  function connectsTo(tile, side) { return conns(tile).includes(side); }

  // Kelas rotasi: rotasi yang menghasilkan himpunan koneksi sama dikelompokkan.
  const classCache = {};
  function classes(type) {
    if (classCache[type]) return classCache[type];
    const map = {};
    const out = [];
    for (let r = 0; r < 4; r++) {
      const cs = rotSides(TYPES[type].base, r);
      const key = cs.slice().sort().join('');
      if (!map[key]) { map[key] = { rots: [], conns: cs }; out.push(map[key]); }
      map[key].rots.push(r);
    }
    classCache[type] = out;
    return out;
  }
  function rotFor(type, a, b) {
    for (let r = 0; r < 4; r++) {
      const cs = rotSides(TYPES[type].base, r);
      if (cs.includes(a) && cs.includes(b)) return r;
    }
    return -1;
  }
  function describe(tile) {
    const t = TYPES[tile.type];
    const cs = conns(tile).map((s) => MC.Config.SIDE_NAMES[s]);
    return cs.length ? t.label + ' (' + cs.join('-') + ')' : t.label;
  }

  MC.Components = { TYPES, GLYPH, make, parseToken, conns, connectsTo, classes, rotFor, describe };
})(typeof window !== 'undefined' ? window : globalThis);
