# Mufa Circuit

**Connect the Circuit. Solve the Challenge.**
Game #2 untuk katalog Mufa Games — puzzle logika sirkuit, 1 pemain, HTML5 + CSS3 + JavaScript murni.

## Status pengembangan

| Tahap | Isi | Status |
|---|---|---|
| 1 — Fondasi | Struktur, tema, ubin, papan, input, navigasi | Selesai |
| 2 — Mesin Sirkuit | Koneksi, Source/Target/penghalang, TEST, undo, restart, hint, solver | Selesai |
| 3 — Mode Awal | Circuit Classic, Circuit Maze, Multi Target, Move Limit | Selesai (4 mode, 53 level) |
| 4 — Mode Lanjutan | Time Attack, Memory Circuit, Daily Circuit, Color Logic, Unstable Grid | Selesai (9 mode dapat dimainkan) |
| 5 — Mode Akhir | Dual Circuit, Endless Circuit, Circuit Master | Selesai (12 mode dapat dimainkan) |
| 6 — Pengujian & Rilis | Pemeriksaan menyeluruh, performa, dokumentasi | Belum |

Skor, bintang, statistik, achievement, penyimpanan, mode latihan, jeda, dan konfirmasi keluar sudah aktif dan dipakai semua 12 mode.

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
modes/ classic, move-limit, maze, multi-target, time-attack, memory, daily,
       color-logic, unstable-grid, dual-circuit, endless, master
data/  levels-classic.js, levels-master.js
```

## Mode yang tersedia

| Mode | Level | Aturan khusus |
|---|---|---|
| Circuit Classic | 17 | Tanpa batas; bintang dari gerakan, waktu, dan hint |
| Move Limit | 12 | Batas gerakan, undo dimatikan; kalah jika gerakan habis |
| Circuit Maze | 12 | Banyak penghalang + ubin terkunci (sudut ungu); ada batas gerakan, undo dihitung sebagai gerakan |
| Multi Target | 12 | 2–4 Target harus menyala sekaligus; simpang-T dan persimpangan membagi aliran |
| Time Attack | sesi 120 dtk | Puzzle terus bertambah dan makin besar; poin = 100 × (ukuran − 3) + 1 poin per detik sisa waktu; hint dimatikan |
| Memory Circuit | 10 | Papan benar tampil beberapa detik, lalu sebagian besar ubin disembunyikan (?); segitiga ungu menandai arah putar; 3 TEST gagal = kalah; hint dimatikan |
| Daily Circuit | 1 per hari | Seed dari tanggal lokal; hanya hasil pertama yang resmi, latihan ulang tidak mengganti hasil; streak dan waktu terbaik tersimpan |
| Color Logic | 12 | Source berwarna, Target menuntut warna tepat, Filter menahan warna lain, Mixer (cyan + kuning → hijau), simpang-T sebagai splitter; warna selalu disertai simbol dan pola garis |
| Unstable Grid | 10 | Tiap 12 dtk satu ubin tidak permanen berubah arah, diumumkan 1 dtk sebelumnya; ubin permanen bertanda cincin cyan; undo dimatikan |
| Dual Circuit | 10 | Dua papan berdampingan (4×4 atau 5×5), masing-masing punya Source dan Target; kedua sirkuit harus aktif bersamaan. Ubin bertanda ⧉ adalah ubin bersama: memutar satu memutar kembarannya di papan lain. Undo ikut mengembalikan kembarannya |
| Endless Circuit | sesi tanpa akhir | Puzzle beruntun yang makin sulit; tiap puzzle punya batas gerakan dan batas waktu. 3 nyawa: gerakan atau waktu habis = nyawa berkurang dan streak putus. Poin = 100 × (ukuran − 3) + sisa detik + 25 per streak (maks 250). Undo dan hint dimatikan; rekor: skor, puzzle terbaik, streak terbaik |
| Circuit Master | 12 | Setiap level menggabungkan 2–3 mekanik (mis. Multi Target + Move Limit, Color Logic + Circuit Maze, Memory + Move Limit, Dual + Move Limit). Level terbuka berurutan; aturan gabungan dijelaskan sebelum level dimulai, tanpa tutorial baru di tengah level |

## Keputusan desain

- Dual Circuit digabung menjadi satu papan lebar (papan A | kolom kosong | papan B). Kolom kosong memutus aliran antar papan, jadi mesin sirkuit yang sama dipakai tanpa perubahan. Pasangan ubin bersama disimpan di `board.twins`; rotasi awalnya diatur sehingga selalu ada jumlah klik yang membenarkan kedua ubin sekaligus. Hint dan par dihitung per satuan putar (`MC.Dual`), bukan per ubin.
- Circuit Master memakai hook mode yang sudah ada (Unstable Grid, Memory Circuit) lewat delegasi, dan level boleh menimpa aturan mode lewat `lv.rules` (mis. Undo dimatikan saat ada batas gerakan).
- Mode sesi (Time Attack, Endless) memakai alur `run`; Endless menambah hook `lose`, `next`, `stars`, `summary`.

- Multi Target dibangun dari pohon sirkuit; solusinya disimpan di `board.solution`, diverifikasi mesin sirkuit, dan dipakai untuk hint serta par.

- Energi dihitung dari data koneksi aktual tiap ubin (`circuit-engine.js`), bukan dari tampilan.
- Level prosedural dibuat dari jalur solusi lebih dulu, lalu rotasi diacak; `solver.js` memverifikasi dan menghitung gerakan minimum (par). Hint berasal dari solusi yang sama.
- Level buatan tangan menyimpan susunan terselesaikan; rotasi diacak deterministik saat dimulai.
- Restart: gerakan dihitung ulang, sedangkan hint yang sudah dipakai dan waktu tetap berlaku.
- Data `localStorage` divalidasi saat dimuat; data rusak diganti nilai bawaan.

## Pengujian

Pemeriksaan yang dijalankan sebelum tiap rilis tahap: semua level setiap mode punya solusi dan tidak langsung selesai; generator diuji pada ratusan seed; Daily deterministik per tanggal dan diuji 400 hari berturut-turut; siklus Unstable Grid (12 dtk / peringatan 1 dtk); aturan warna, Filter, dan Mixer; permainan penuh tiap mode lewat klik nyata di Chromium, tanpa error JavaScript; tidak ada scroll horizontal di layar 390 px.

`MC.Levels.validate('classic')` di konsol browser memeriksa semua level Classic (solvable, belum selesai saat dimulai).
