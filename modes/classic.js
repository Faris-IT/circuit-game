(function (g) {
  const MC = (g.MC = g.MC || {});

  MC.Modes.classic = {
    id: 'classic',
    rules: { undo: true, undoRefund: true, pause: true, hint: true, timer: 'up' },
    tutorial: {
      title: 'Circuit Classic',
      steps: [
        'Cari Source (lingkaran kuning) dan Target (cincin).',
        'Ketuk atau klik sebuah ubin untuk memutarnya 90° searah jarum jam.',
        'Susun jalur dari Source ke Target. Energi hanya mengalir lewat sisi yang saling terhubung dan tidak bisa menembus penghalang.',
        'Tekan TEST CIRCUIT (atau Enter) untuk menguji. Titik merah menandai tempat energi bocor.',
        'Gerakan lebih sedikit = bintang lebih banyak. Hint mengurangi bintang.'
      ]
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
