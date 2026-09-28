# Student Handbook — Musti Musik

Buku belajar **untuk murid** (bukan lesson plan guru): materi singkat + visual per skill,
lalu lagu di bagian belakang. Isinya diambil dari kurikulum Musti Musik (Level 0–8,
40 skill per level, 5 adventure per level) dan diringkas ke bahasa murid.

> Formula: **MATERI → SHEET MUSIC → PRAKTIK LAGU**

## Isi repo

| Folder / file | Isi |
|---|---|
| `docs/Modeling_Guide.md` | Panduan penulisan & desain handbook (sumber arahan awal) |
| `docs/Keputusan_dan_Masukan.md` | Keputusan yang sudah diambil + masukan yang belum dikerjakan |
| `template/Student_Handbook_Grade_1.docx` | File desain: background, karakter, footer, font Montserrat |
| `data/level-0-songs.json` | Lagu Level 0: catatan lagu per skill + bank lagu per term (Pop/Jazz/Worship/Klasik) |
| `level-0/content.js` | Materi 40 skill Level 0 (fokus, 3–4 poin, target) + spesifikasi gambar |
| `level-0/img/` | 39 gambar visual (keyboard, chord, tangan, paranada, ritme, …) |
| `level-0/Student_Handbook_Level_0.docx` | Hasil handbook Level 0 |
| `tools/` | Script pembuat: `specs.js`, `visuals.ps1`, `build.js`, `split.js` |

## Struktur buku (Level 0)

1. Cover (tanpa tabel)
2. Cara Pakai Handbook
3. Peta Level (5 adventure, rentang skill, lagu wajib)
4. Per adventure: halaman pembuka → **1 halaman per skill** (judul, fokus, gambar,
   materi singkat, target, baris penunjuk lagu)
5. **Bagian Lagu (paling belakang):** ringkasan Lagu 1–20 → Daftar Lagu per term →
   sheet music Lagu 1–20 (satu halaman per lagu)
6. Checklist Naik Level, Log Latihan

Aturan tampilan: font **Montserrat**, teks isi **minimal 12 pt**, isi halaman berhenti
di atas gambar karakter di pojok bawah.

## Cara build

Butuh Node.js dan Windows PowerShell (untuk menggambar visual dengan System.Drawing).

```bash
npm install
node tools/specs.js 0                     # ambil spesifikasi gambar dari level-0/content.js
powershell -NoProfile -ExecutionPolicy Bypass -File tools/visuals.ps1 -SpecFile level-0/specs.json -OutDir level-0/img
node tools/build.js 0                     # -> level-0/Student_Handbook_Level_0.docx
```

Menambah level baru: buat `level-N/content.js` (format sama dengan Level 0) dan
`data/level-N-songs.json`, lalu jalankan tiga perintah di atas dengan angka level-nya.

Tutup file `.docx` di Word sebelum build ulang (file yang sedang terbuka terkunci).
