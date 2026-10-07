// ============ KONFIGURASI ============
// ENDPOINT: tempel URL Web App Google Apps Script (yang berakhiran /exec).
// Kosong = mode uji coba (data TIDAK dikirim ke mana pun).
window.CONFIG = {
  ENDPOINT: 'https://script.google.com/macros/s/AKfycby2mBriR4O5zN6sODBm6p1uOcEzFzNBUUGD76ZyYr2N2JPu6NStbhU7MW5Yq9iqstGo/exec',
  MAX: 10,
  // Batas akhir pengisian. Setelah lewat, form terkunci otomatis.
  // Kalau diubah, ubah juga DEADLINE di apps-script/Code.gs (server yang jadi penentu akhir).
  DEADLINE: '2026-10-07T10:22:00+07:00'
};