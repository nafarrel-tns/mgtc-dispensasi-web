# Panduan: dari file sampai web bisa diakses semua orang (gratis)

Isi folder:

```
mgtc-dispensasi/
├── index.html        <- halaman (struktur)
├── style.css         <- tampilan
├── script.js         <- logika form + validasi
├── config.js         <- TEMPAT TEMPEL URL Google Sheet (cuma ini yang diedit)
└── apps-script/
    └── Code.gs       <- "backend" yang menyimpan data ke Google Sheet
```

Urutan kerjanya: **(A) bikin Sheet + backend → (B) sambungin ke web → (C) upload/hosting → (D) tes.**

---

## A. Google Sheet + Apps Script (backend)

1. Buka https://sheets.google.com → **Blank spreadsheet**. Kasih nama, misal `Data Dispensasi MGTC 2026`.
2. Menu **Extensions → Apps Script**. Tab baru terbuka.
3. Hapus semua isi `Code.gs` bawaan, lalu **copy-paste seluruh isi file `apps-script/Code.gs`**.
4. Klik ikon disket (**Save project**).
5. Klik **Deploy → New deployment**.
6. Klik ikon roda gigi di samping "Select type" → pilih **Web app**.
7. Isi:
   - **Description**: `v1`
   - **Execute as**: **Me** (email kamu)
   - **Who has access**: **Anyone**  ← wajib, kalau tidak peserta tidak bisa kirim
8. Klik **Deploy**. Akan diminta otorisasi:
   - **Authorize access** → pilih akun Google kamu
   - Kalau muncul "Google hasn't verified this app": klik **Advanced → Go to (nama project) (unsafe)** → **Allow**. Ini aman, karena script itu buatan kamu sendiri.
9. Salin **Web app URL** yang berakhiran `/exec`. Simpan dulu.
10. Cek: buka URL itu di browser. Kalau muncul tulisan **"Endpoint aktif."** berarti benar.

> **Penting:** setiap kamu mengubah `Code.gs` nanti, harus **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. Kalau tidak, perubahan tidak aktif dan URL tetap sama.

---

## B. Sambungkan web ke Sheet

Buka `config.js`, tempel URL tadi:

```js
window.CONFIG = {
  ENDPOINT: 'https://script.google.com/macros/s/XXXXXXXX/exec',
  MAX: 10,
  EVENT: '2026-10-29T00:00:00+07:00'
};
```

Tes dulu di laptop: klik dua kali `index.html`, isi form, kirim. Cek Sheet, tab **Data** akan otomatis dibuat dan terisi satu baris. Kalau sudah masuk, lanjut hosting.

---

## C. Hosting gratis

Pilih salah satu. **Opsi 1 paling gampang** (tanpa akun GitHub, tanpa install apa pun).

### Opsi 1: Netlify Drop (±2 menit)

1. Pastikan folder `mgtc-dispensasi` isinya `index.html`, `style.css`, `script.js`, `config.js` (folder `apps-script` boleh ikut atau tidak, tidak berpengaruh).
2. Buka https://app.netlify.com/drop dan daftar/login (bisa pakai Google).
3. **Drag & drop folder `mgtc-dispensasi`** ke kotak yang tersedia.
4. Tunggu beberapa detik, kamu dapat link `https://nama-acak.netlify.app`.
5. Ganti nama link: **Site configuration → Change site name** → misal `mgtc-dispensasi` → jadi `https://mgtc-dispensasi.netlify.app`.
6. Kalau nanti ada edit file: buka site → tab **Deploys** → drag & drop folder yang baru lagi.

> Catatan: situs dari Netlify Drop yang dibuat tanpa login bisa kedaluwarsa. Pastikan login dulu supaya permanen.

### Opsi 2: GitHub Pages (gratis, link `username.github.io/repo`)

1. Buat akun di https://github.com.
2. Klik **+ → New repository**. Nama: `mgtc-dispensasi`, pilih **Public**, **Create repository**.
3. Klik **uploading an existing file**, drag semua file (`index.html`, `style.css`, `script.js`, `config.js`) → **Commit changes**.
4. Buka **Settings → Pages**. Di **Build and deployment**: Source = **Deploy from a branch**, Branch = **main**, folder **/ (root)** → **Save**.
5. Tunggu 1–2 menit, link muncul di halaman yang sama: `https://USERNAME.github.io/mgtc-dispensasi/`.

### Opsi 3: Cloudflare Pages

1. Login https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Upload assets**.
2. Beri nama project, upload folder, **Deploy**. Link: `https://nama.pages.dev`.

---

## D. Tes sebelum disebar

Lakukan di link hosting, bukan di laptop:

- [ ] Buka dari HP **dan** laptop, tampilan rapi.
- [ ] Kirim data uji, baris masuk ke Sheet.
- [ ] Kirim lagi dengan NPM yang sama → muncul pesan duplikat.
- [ ] Tambah 2–3 perkuliahan, cek kolom **Detail Perkuliahan** di Sheet terisi semua.
- [ ] Hapus baris data uji di Sheet sebelum link disebar.

---

## Tips & troubleshooting

| Masalah | Penyebab / solusi |
|---|---|
| Muncul "Mode uji coba" di halaman sukses | `ENDPOINT` di `config.js` masih kosong |
| "Koneksi bermasalah" padahal internet aman | Akses deployment belum **Anyone**, atau URL bukan yang berakhiran `/exec` |
| Perubahan `Code.gs` tidak berefek | Belum deploy **New version** (lihat catatan di bagian A) |
| Angka 0 di depan NPM/HP hilang di Sheet | Pakai `Code.gs` versi ini; kolom D & G sudah diset teks |
| Data dobel dari 2 orang submit bersamaan | Sudah ditangani `LockService` di script |
| Mau tutup form setelah deadline | Di Apps Script, tambahkan di awal `doPost`: `return json_({status:'error', message:'Pendaftaran sudah ditutup.'});` lalu deploy new version |

## Soal keamanan

- URL Apps Script akan terlihat di `config.js` oleh siapa saja. Itu normal untuk form publik; yang bisa dilakukan orang hanya mengirim data, bukan membaca Sheet-mu.
- Sheet-nya tetap privat selama tidak kamu share. Jangan bagikan link Sheet ke peserta.
- Server mengecek ulang semua isian, jadi data tetap tervalidasi walau seseorang melewati form.
