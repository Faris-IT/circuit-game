(function (g) {
  const MC = (g.MC = g.MC || {});
  // Level buatan tangan Circuit Classic. Setiap token = glyph + rotasi pada keadaan TERSELESAIKAN.
  // Glyph: S source, T target, I lurus, L sudut, Y simpang-T, X persimpangan, B penghalang, . kosong.
  // Rotasi: 0 = atas, 1 = kanan, 2 = bawah, 3 = kiri (untuk Source/Target = arah sambungan).
  // Pemuat mengacak rotasi ubin saat level dimulai dan solver memverifikasi bahwa level bisa diselesaikan.
  MC.Data.classic = [
    {
      name: 'Pemanasan',
      rows: [
        'S1 I1 L2 B0',
        'L0 I0 I0 L1',
        'I1 L0 L0 L2',
        'X0 I0 L0 T0'
      ]
    },
    {
      name: 'Tikungan',
      rows: [
        'Y0 L0 B0 I0',
        'I0 L0 L1 T3',
        'L0 B0 I0 X0',
        'S1 I1 L3 Y0'
      ]
    },
    {
      name: 'Jebakan Silang',
      rows: [
        'S2 B0 L0 I1',
        'I0 Y0 X0 L1',
        'L0 I1 L2 B0',
        'L2 I0 L0 T3'
      ]
    }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
