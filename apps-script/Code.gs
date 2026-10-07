/**
 * Backend form Dispensasi MIPA Goes to Company 2026
 * Dipasang di Google Apps Script yang TERHUBUNG ke Google Sheet (Extensions > Apps Script).
 * Menerima POST JSON dari website, cek duplikat NPM, lalu simpan satu baris per peserta.
 */

const SHEET_NAME = 'Data';
const HEADERS = [
  'Timestamp', 'Email', 'Nama Lengkap', 'NPM', 'Program Studi', 'Angkatan',
  'Nomor WhatsApp / HP', 'Jumlah Perkuliahan', 'Detail Perkuliahan'
];
const NPM_COL = 4; // kolom D

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#1D3A29').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
    // NPM & No HP sebagai teks supaya angka 0 di depan tidak hilang
    sh.getRange('D:D').setNumberFormat('@');
    sh.getRange('G:G').setNumberFormat('@');
    sh.getRange('I:I').setWrap(true);
    sh.setColumnWidth(9, 380);
  }
  return sh;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json_({ status: 'error', message: 'Server sedang sibuk, coba lagi sebentar.' });
  }

  try {
    const d = JSON.parse(e.postData.contents);

    // --- validasi ulang di server ---
    const s = v => String(v == null ? '' : v).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s(d.email))) return json_({ status: 'error', message: 'Email tidak valid.' });
    if (s(d.nama).length < 2) return json_({ status: 'error', message: 'Nama tidak valid.' });
    if (!/^\d{8,20}$/.test(s(d.npm))) return json_({ status: 'error', message: 'NPM tidak valid.' });
    if (!/^08\d{8,12}$/.test(s(d.wa))) return json_({ status: 'error', message: 'Nomor HP tidak valid.' });
    if (!s(d.prodi) || !s(d.angkatan)) return json_({ status: 'error', message: 'Program studi / angkatan belum diisi.' });
    if (!Array.isArray(d.courses) || d.courses.length < 1 || d.courses.length > 10) {
      return json_({ status: 'error', message: 'Data perkuliahan tidak valid.' });
    }
    for (const c of d.courses) {
      if (!s(c.jenis) || !s(c.nama) || !s(c.dosen) || !s(c.waktu)) {
        return json_({ status: 'error', message: 'Data perkuliahan belum lengkap.' });
      }
    }

    const sh = getSheet_();

    // --- cek duplikat NPM ---
    const last = sh.getLastRow();
    if (last > 1) {
      const npms = sh.getRange(2, NPM_COL, last - 1, 1).getValues().flat().map(String);
      if (npms.indexOf(s(d.npm)) !== -1) return json_({ status: 'duplicate' });
    }

    const detail = d.courses.map((c, i) =>
      'Perkuliahan ' + (i + 1) + '\n' +
      'Jenis: ' + s(c.jenis) + '\n' +
      'Nama: ' + s(c.nama) + '\n' +
      'Dosen: ' + s(c.dosen) + '\n' +
      'Waktu: ' + s(c.waktu)
    ).join('\n\n');

    sh.appendRow([
      new Date(), s(d.email), s(d.nama), s(d.npm), s(d.prodi), s(d.angkatan),
      s(d.wa), d.courses.length, detail
    ]);
    // pastikan NPM & HP tersimpan sebagai teks pada baris baru
    const row = sh.getLastRow();
    sh.getRange(row, 4).setNumberFormat('@').setValue(s(d.npm));
    sh.getRange(row, 7).setNumberFormat('@').setValue(s(d.wa));

    return json_({ status: 'ok' });
  } catch (err) {
    return json_({ status: 'error', message: 'Terjadi kesalahan di server.' });
  } finally {
    lock.releaseLock();
  }
}

// Untuk cek cepat: buka URL /exec di browser, harus muncul tulisan ini.
function doGet() {
  return ContentService.createTextOutput('Endpoint aktif.');
}
