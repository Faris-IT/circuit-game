# Mufa Circuit

**Connect the Circuit. Solve the Challenge.**
Game #2 untuk katalog Mufa Games — puzzle logika sirkuit, 1 pemain, HTML5 + CSS3 + JavaScript murni.

## Status pengembangan

| Tahap | Isi | Status |
|---|---|---|
| 1 — Fondasi | Struktur, tema, ubin, papan, input, navigasi | Selesai |
| 2 — Mesin Sirkuit | Koneksi, Source/Target/penghalang, TEST, undo, restart, hint, solver | Selesai |
| 3 — Mode Awal | Circuit Classic (dimainkan), Maze, Multi Target, Move Limit | Classic selesai, 3 lainnya menyusul |
| 4–6 | Mode lanjutan, mode akhir + progres lengkap, pengujian & rilis | Belum |

Kerangka skor, bintang, statistik, achievement, penyimpanan, mode latihan, jeda, dan konfirmasi keluar sudah aktif dan dipakai Circuit Classic.

## Cara bermain

1. Cari **Source** (lingkaran kuning) dan **Target** (cincin).
2. Klik/ketuk ubin untuk memutarnya 90° searah jarum jam.
3. Tekan **TEST CIRCUIT** (Enter). Titik merah menandai tempat energi bocor.
4. Bintang: ★ selesai, ★★ tanpa hint, ★★★ tanpa hint dan gerakan ≤ ideal (atau waktu cepat).

Kontrol keyboard: klik/Spasi putar · Enter test · Z undo · R restart · H hint · Esc jeda · panah pindah fokus ubin.

## Cara menjalankan

Tanpa build dan tanpa server khusus. Buka `index.html` langsung di browser, atau unggah seluruh folder ke hosting statis.
Skrip dimuat dengan tag `<script>` biasa (bukan ES module) sehingga juga berjalan dari `file://`.

## Teknologi

HTML5, CSS3 (Grid), JavaScript ES6+, SVG inline, `localStorage`.
Tanpa framework, library, aset gambar/audio/font eksternal, backend, atau internet saat bermain.

## Struktur

```
index.html
css/   themes, style, layout, board, animations
js/    config, storage, components, circuit-engine, solver, level-generator,
       level-loader, scoring, achievements, state, board, ui, input, main
modes/ classic.js
data/  levels-classic.js
```

## Keputusan desain

- Energi dihitung dari data koneksi aktual tiap ubin (`circuit-engine.js`), bukan dari tampilan.
- Level prosedural dibuat dari jalur solusi lebih dulu, lalu rotasi diacak; `solver.js` memverifikasi dan menghitung gerakan minimum (par). Hint berasal dari solusi yang sama.
- Level buatan tangan menyimpan susunan terselesaikan; rotasi diacak deterministik saat dimulai.
- Restart: gerakan dihitung ulang, sedangkan hint yang sudah dipakai dan waktu tetap berlaku.
- Data `localStorage` divalidasi saat dimuat; data rusak diganti nilai bawaan.

## Pengujian

`MC.Levels.validate('classic')` di konsol browser memeriksa semua level Classic (solvable, belum selesai saat dimulai).
