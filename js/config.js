(function (g) {
  const MC = (g.MC = g.MC || {});
  MC.Modes = MC.Modes || {};
  MC.Data = MC.Data || {};
  MC.Config = {
    VERSION: 1,
    STORAGE_KEY: 'mufa-circuit:v1',
    DIRS: [[-1, 0], [0, 1], [1, 0], [0, -1]],
    SIDE_NAMES: ['atas', 'kanan', 'bawah', 'kiri'],
    // Warna selalu didampingi simbol agar tidak bergantung pada persepsi warna.
    COLORS: {
      C: { sym: '●', name: 'cyan', css: 'var(--cyan)' },
      Y: { sym: '◆', name: 'kuning', css: 'var(--yellow)' },
      G: { sym: '■', name: 'hijau', css: 'var(--green)' }
    },
    MODES: [
      { id: 'classic', icon: '⚡', name: 'Circuit Classic', difficulty: 1, desc: 'Hubungkan satu Source ke satu Target. Tanpa batas waktu.' },
      { id: 'time-attack', icon: '⏱', name: 'Time Attack', difficulty: 2, desc: 'Selesaikan sebanyak mungkin puzzle dalam 120 detik.' },
      { id: 'maze', icon: '▦', name: 'Circuit Maze', difficulty: 2, desc: 'Cari jalur di papan penuh penghalang.' },
      { id: 'multi-target', icon: '⑂', name: 'Multi Target', difficulty: 2, desc: 'Aktifkan semua Target sekaligus.' },
      { id: 'move-limit', icon: '◈', name: 'Move Limit', difficulty: 2, desc: 'Selesaikan dengan jumlah gerakan terbatas.' },
      { id: 'memory', icon: '◉', name: 'Memory Circuit', difficulty: 3, desc: 'Ingat susunan, lalu bangun ulang sirkuit.' },
      { id: 'daily', icon: '☀', name: 'Daily Circuit', difficulty: 2, desc: 'Satu puzzle yang sama untuk semua pemain hari ini.' },
      { id: 'color-logic', icon: '◧', name: 'Color Logic', difficulty: 3, desc: 'Kirim warna yang tepat ke target yang sesuai.' },
      { id: 'unstable-grid', icon: '≋', name: 'Unstable Grid', difficulty: 3, desc: 'Papan berubah sendiri setiap 12 detik.' },
      { id: 'dual-circuit', icon: '⧉', name: 'Dual Circuit', difficulty: 3, desc: 'Dua papan terhubung, satu gerakan memengaruhi keduanya.' },
      { id: 'endless', icon: '∞', name: 'Endless Circuit', difficulty: 3, desc: 'Puzzle tanpa akhir, tiga kesempatan gagal.' },
      { id: 'master', icon: '★', name: 'Circuit Master', difficulty: 3, desc: 'Tantangan dengan aturan gabungan.' }
    ],
    CLASSIC_TIERS: [
      { size: 4, count: 4, blockers: 0.1 },
      { size: 5, count: 5, blockers: 0.15 },
      { size: 7, count: 5, blockers: 0.2 }
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
