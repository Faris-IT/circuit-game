(function (g) {
  const MC = (g.MC = g.MC || {});

  const LEVELS = [
    { kind: 'sep2', size: 5 }, { kind: 'sep2', size: 5 }, { kind: 'mix', size: 5 }, { kind: 'mix', size: 5 },
    { kind: 'sepf', size: 6 }, { kind: 'mix', size: 6 }, { kind: 'mix2', size: 6 }, { kind: 'mix_split', size: 6 },
    { kind: 'sepf', size: 7 }, { kind: 'mix2', size: 7 }, { kind: 'mix_split', size: 7 }, { kind: 'mix_split', size: 7 }
  ];
  const KIND_LABEL = { sep2: '2 warna', sepf: 'filter', mix: 'mixer', mix2: 'mixer+', mix_split: 'mixer+bagi' };

  MC.Levels.builders['color-logic'] = {
    count() { return LEVELS.length; },
    label(i) { return LEVELS[i].size + '×' + LEVELS[i].size + ' · ' + KIND_LABEL[LEVELS[i].kind]; },
    build(i) {
      const L = LEVELS[i];
      const board = MC.Generator.generateColor({ rows: L.size, cols: L.size, kind: L.kind, seed: 84000 + i * 7919, trap: 0.06 + 0.01 * i });
      const targets = board.tiles.filter((t) => t.type === 'target').length;
      return MC.Levels.finish(board, { size: L.size, name: 'Level ' + (i + 1), kind: 'generated', targets });
    }
  };

  MC.Modes['color-logic'] = {
    id: 'color-logic',
    rules: { undo: true, undoRefund: true, pause: true, hint: true },
    legend: '● cyan (garis penuh) · ◆ kuning (putus-putus) · ■ hijau (titik-titik) · + Mixer: cyan + kuning → hijau',
    tutorial: {
      title: 'Color Logic',
      steps: [
        'Setiap Source mengirim satu warna: ● cyan atau ◆ kuning. Setiap Target meminta warna tertentu, ditandai simbolnya (● ◆ ■).',
        'Target hanya menyala jika menerima TEPAT warna yang diminta. Jalur yang tersambung tetapi warnanya salah ditandai garis putus merah.',
        'Filter (kotak bersimbol di jalur) hanya meneruskan warna yang sama dengan simbolnya dan menahan warna lain.',
        'Mixer (lingkaran ungu bertanda +) menerima dari dua sisi masukan yang berseberangan. Jika ● cyan dan ◆ kuning sama-sama tiba, ia mengeluarkan ■ hijau lewat sisi panahnya.',
        'Simpang-T berfungsi sebagai splitter: ia membagi warna ke semua cabangnya. Warna juga dibedakan lewat pola garis, bukan hanya warna.'
      ]
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
