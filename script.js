(() => {
  'use strict';

  const CONFIG = window.CONFIG;
  const PRODI = ['Matematika','Kimia','Fisika','Biologi','Statistika','Geofisika','Teknik Informatika','Teknik Elektro','Ilmu Aktuaria'];
  const ANGKATAN = ['2023','2024','2025','2026'];
  const DRAFT_KEY = 'mgtc26-dispensasi-draft';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const form = $('#form'), slips = $('#slips'), addBtn = $('#addBtn'), cap = $('#cap');
  const sendBtn = $('#send'), banner = $('#banner');
  let uid = 0, sending = false, saveTimer, closed = false, cdTimer;

  /* ---------- opsi dropdown ---------- */
  const fill = (sel, list) => list.forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; sel.append(o); });
  fill($('#prodi'), PRODI);
  fill($('#angkatan'), ANGKATAN);

  /* ---------- deadline + hitung mundur ---------- */
  // DEADLINE memakai offset +07:00 (WIB) di string config, jadi ia adalah satu titik waktu absolut
  // dan tidak bergantung zona waktu perangkat (WITA/WIT/luar negeri tetap menghitung ke 23.59 WIB).
  const DEADLINE = new Date(CONFIG.DEADLINE).getTime();
  const pad = n => String(n).padStart(2, '0');

  // Jam perangkat bisa salah/diubah manual, jadi disinkronkan dengan header "Date" dari server hosting.
  // Kalau gagal (misal dibuka dari file lokal), pakai jam perangkat. Server Apps Script tetap penentu akhir.
  let skew = 0;
  const now = () => Date.now() + skew;
  async function syncClock() {
    try {
      const t0 = Date.now();
      const res = await fetch(location.href.split('#')[0], { method: 'HEAD', cache: 'no-store' });
      const t1 = Date.now();
      const server = new Date(res.headers.get('date')).getTime();
      if (!isNaN(server)) skew = server - (t0 + t1) / 2;
    } catch (e) { /* abaikan */ }
  }

  function lockForm() {
    if (closed) return;
    closed = true;
    clearInterval(cdTimer);
    $('#dlTime').hidden = true;
    $('#dlClosed').hidden = false;
    $('#deadline').classList.add('is-closed');
    $('#deadline').classList.remove('soon');
    form.classList.add('is-closed');
    $$('input, select, button', form).forEach(el => { el.disabled = true; });
    hideBanner();
  }

  function tick() {
    const left = DEADLINE - now();
    if (left <= 0) { lockForm(); return; }
    const s = Math.floor(left / 1000);
    const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    $('#cdD').textContent = pad(d);
    $('#cdH').textContent = pad(h);
    $('#cdM').textContent = pad(m);
    $('#cdS').textContent = pad(sec);
    $('#deadline').classList.toggle('soon', left < 86400000);
    if (sec === 0 || !$('#cdSr').textContent) $('#cdSr').textContent = `Sisa waktu ${d} hari ${h} jam ${m} menit`;
  }

  function startCountdown() {
    tick();
    if (!closed) cdTimer = setInterval(tick, 1000);
    syncClock().then(tick); // koreksi begitu jam server didapat
  }

  /* ---------- aturan validasi ---------- */
  const rules = {
    email: v => { v = v.trim(); return !v ? 'Email wajib diisi.' : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? 'Format email belum valid. Contoh: nama@gmail.com' : ''; },
    nama: v => v.trim().length < 2 ? 'Nama lengkap wajib diisi.' : '',
    npm: v => !v ? 'NPM wajib diisi.' : !/^\d+$/.test(v) ? 'NPM hanya boleh berisi angka.' : v.length < 8 ? 'NPM terlalu pendek, cek lagi ya.' : '',
    wa: v => !v ? 'Nomor WhatsApp / HP wajib diisi.' : !/^\d+$/.test(v) ? 'Hanya boleh angka.' : !/^08\d{8,12}$/.test(v) ? 'Gunakan format yang diawali 08, contoh: 081234567890.' : '',
    select: v => !v ? 'Pilih salah satu dulu.' : '',
    text: v => v.trim().length < 2 ? 'Wajib diisi.' : '',
    mulai: v => !v ? 'Isi jam mulai.' : '',
    selesai: (v, scope) => {
      if (!v) return 'Isi jam selesai.';
      const m = $('[data-name="mulai"]', scope).value;
      return m && v <= m ? 'Jam selesai harus setelah jam mulai.' : '';
    }
  };
  const scopeOf = el => el.closest('.slip') || form;
  const msgOf = el => rules[el.dataset.rule](el.value, scopeOf(el));

  function check(el) {
    const msg = msgOf(el);
    const f = el.closest('.field');
    f.classList.toggle('bad', !!msg);
    f.classList.toggle('ok', !msg && el.value !== '');
    $('.err', f).textContent = msg;
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }
  const touched = el => el.closest('.field').classList.contains('touched');

  /* ---------- kartu perkuliahan ---------- */
  // teks kartu mengikuti jenis perkuliahan: '' (belum dipilih), 'Mata Kuliah', 'Praktikum'
  const KIND = {
    '': {
      vert: 'Perkuliahan',
      namaL: 'Nama Perkuliahan', namaP: 'Contoh: Basis Data / Praktikum Pemrograman', namaH: '',
      dosenL: 'Dosen Pengampu / Pengajar', dosenP: 'Contoh: Dr. Nama Dosen, S.Si., M.Kom.', dosenH: 'Isi nama pengajar sesuai jadwal.'
    },
    'Mata Kuliah': {
      vert: 'Mata Kuliah',
      namaL: 'Nama Mata Kuliah', namaP: 'Contoh: Basis Data', namaH: 'Tulis sesuai nama resmi mata kuliah.',
      dosenL: 'Dosen Pengampu', dosenP: 'Contoh: Dr. Nama Dosen, S.Si., M.Kom.', dosenH: 'Untuk mata kuliah, isi dosen pengampu sesuai jadwal.'
    },
    'Praktikum': {
      vert: 'Praktikum',
      namaL: 'Nama Praktikum', namaP: 'Contoh: Praktikum Pemrograman', namaH: 'Tulis sesuai nama resmi praktikum.',
      dosenL: 'Dosen Pengampu / Asisten Praktikum', dosenP: 'Contoh: Dr. Nama Dosen / Nama Asisten',
      dosenH: 'Untuk praktikum, isi salah satu saja: nama Dosen Pengampu ATAU Asisten Praktikum.'
    }
  };

  function setPlaceholder(card) {
    const k = KIND[$('[data-name="jenis"]', card).value] || KIND[''];
    $('.vert', card).textContent = k.vert;
    $('[data-t="namaL"]', card).textContent = k.namaL;
    $('[data-name="nama"]', card).placeholder = k.namaP;
    const hn = $('[data-t="namaH"]', card);
    hn.textContent = k.namaH;
    hn.hidden = !k.namaH;
    $('[data-t="dosenL"]', card).textContent = k.dosenL;
    $('[data-name="dosen"]', card).placeholder = k.dosenP;
    $('[data-t="dosenH"]', card).textContent = k.dosenH;
  }

  function renumber() {
    const cards = $$('.slip', slips);
    cards.forEach((c, i) => {
      $('.n', c).textContent = i + 1;
      c.setAttribute('aria-label', 'Perkuliahan ' + (i + 1));
      $('.del', c).hidden = i === 0;
    });
    const n = cards.length;
    addBtn.disabled = closed || n >= CONFIG.MAX;
    cap.classList.toggle('full', n >= CONFIG.MAX);
    cap.textContent = n >= CONFIG.MAX ? `Maksimal ${CONFIG.MAX} perkuliahan` : `${n} dari maksimal ${CONFIG.MAX} perkuliahan.`;
  }

  function addCourse(v = {}, focus = false) {
    if ($$('.slip', slips).length >= CONFIG.MAX) return;
    const node = $('#tplSlip').content.firstElementChild.cloneNode(true);
    const id = ++uid;
    $$('[data-name]', node).forEach(el => { el.id = `c${id}-${el.dataset.name}`; });
    $$('[data-for]', node).forEach(l => { l.htmlFor = `c${id}-${l.dataset.for}`; });
    Object.entries(v).forEach(([k, val]) => { const el = $(`[data-name="${k}"]`, node); if (el) el.value = val; });
    slips.append(node);
    setPlaceholder(node);
    renumber();
    if (focus) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => $('[data-name="jenis"]', node).focus({ preventScroll: true }), 350);
    }
  }

  addBtn.addEventListener('click', () => { addCourse({}, true); refresh(); });

  slips.addEventListener('click', e => {
    const btn = e.target.closest('.del');
    if (!btn) return;
    const card = btn.closest('.slip');
    card.classList.add('out');
    setTimeout(() => { card.remove(); renumber(); refresh(); }, 220);
  });

  /* ---------- input handling ---------- */
  function flashDigits(el) {
    const ctl = el.closest('.control');
    ctl.classList.remove('shake'); void ctl.offsetWidth; ctl.classList.add('shake');
    const h = $('.hint', el.closest('.field'));
    if (h) { h.classList.add('flash'); clearTimeout(h._t); h._t = setTimeout(() => h.classList.remove('flash'), 1400); }
  }

  form.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.digits !== undefined) {
      const clean = t.value.replace(/\D/g, '');
      if (clean !== t.value) { t.value = clean; flashDigits(t); }
    }
    if (t.dataset.rule) {
      if (touched(t)) check(t);
      if (t.dataset.name === 'mulai') { const s = $('[data-name="selesai"]', scopeOf(t)); if (touched(s)) check(s); }
      if (t.dataset.name === 'jenis') setPlaceholder(scopeOf(t));
    }
    if (t.id === 'confirm' && t.checked) $('#fConfirm').classList.remove('bad');
    refresh();
  });

  form.addEventListener('focusout', e => {
    const t = e.target;
    if (!t.dataset || !t.dataset.rule) return;
    t.closest('.field').classList.add('touched');
    check(t);
  });
  form.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset && t.dataset.rule && (t.tagName === 'SELECT' || t.type === 'time')) {
      t.closest('.field').classList.add('touched');
      check(t);
      if (t.dataset.name === 'mulai') { const s = $('[data-name="selesai"]', scopeOf(t)); if (touched(s)) check(s); }
    }
  });

  /* ---------- pratinjau + progres ---------- */
  const fmt = t => t.replace(':', '.');
  function renderPreview() {
    const vals = { nama: $('#nama').value.trim(), npm: $('#npm').value.trim(), prodi: $('#prodi').value, angkatan: $('#angkatan').value };
    $$('[data-pv]').forEach(dd => {
      const k = dd.dataset.pv, v = vals[k];
      const next = v || '..........';
      if (dd.textContent !== next) {
        dd.textContent = next;
        dd.classList.toggle('empty', !v);
        if (v) { dd.classList.remove('typed'); void dd.offsetWidth; dd.classList.add('typed'); }
      }
    });
    const box = $('#pvCourses');
    box.replaceChildren();
    const items = $$('.slip', slips).map(s => {
      const g = n => $(`[data-name="${n}"]`, s).value.trim();
      return { jenis: g('jenis'), nama: g('nama'), dosen: g('dosen'), m: g('mulai'), e: g('selesai') };
    });
    // urutan: Mata Kuliah, lalu Praktikum, lalu yang jenisnya belum dipilih (kelompok umum "Perkuliahan").
    // Sub-judul hanya dibuat untuk kelompok yang punya minimal 1 item.
    const groups = [
      { title: 'Mata Kuliah', list: items.filter(x => x.jenis === 'Mata Kuliah') },
      { title: 'Praktikum', list: items.filter(x => x.jenis === 'Praktikum') },
      { title: 'Perkuliahan', list: items.filter(x => !x.jenis) }
    ].filter(gr => gr.list.length);
    let count = 0;
    groups.forEach(gr => {
      const h = document.createElement('h5');
      h.textContent = gr.title;
      box.append(h);
      const ol = document.createElement('ol');
      ol.style.counterReset = 'c ' + count; // penomoran lanjut antar kelompok
      gr.list.forEach(x => {
        const li = document.createElement('li');
        const l1 = document.createElement('span');
        l1.textContent = x.nama || '..........';
        if (!x.nama) l1.className = 'empty';
        const l2 = document.createElement('span');
        l2.textContent = x.dosen || '..........';
        if (!x.dosen) l2.className = 'empty';
        const l3 = document.createElement('span');
        l3.textContent = (x.m && x.e) ? `${fmt(x.m)} – ${fmt(x.e)} WIB` : '..........';
        if (!(x.m && x.e)) l3.className = 'empty';
        li.append(l1, l2, l3);
        ol.append(li);
        count++;
      });
      box.append(ol);
    });
  }

  function progress() {
    const els = $$('[data-rule]', form);
    let done = els.filter(el => !msgOf(el)).length;
    const total = els.length + 1;
    if ($('#confirm').checked) done++;
    const pct = Math.round(done / total * 100);
    $('#meter').style.width = pct + '%';
    $('#pvBar').style.width = pct + '%';
    $('#pvPct').textContent = pct + '%';
  }

  /* ---------- simpan draft di perangkat ---------- */
  function collect() {
    return {
      email: $('#email').value, nama: $('#nama').value, npm: $('#npm').value, wa: $('#wa').value,
      prodi: $('#prodi').value, angkatan: $('#angkatan').value,
      courses: $$('.slip', slips).map(s => Object.fromEntries(['jenis', 'nama', 'dosen', 'mulai', 'selesai'].map(n => [n, $(`[data-name="${n}"]`, s).value])))
    };
  }
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(collect())); } catch (e) {} }, 300);
  }
  function restore() {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (!d) return false;
      ['email', 'nama', 'npm', 'wa', 'prodi', 'angkatan'].forEach(k => { if (d[k] != null) $('#' + k).value = d[k]; });
      (d.courses && d.courses.length ? d.courses : [{}]).slice(0, CONFIG.MAX).forEach(c => addCourse(c));
      return true;
    } catch (e) { return false; }
  }

  function refresh() { renderPreview(); progress(); save(); }

  /* ---------- submit ---------- */
  const showBanner = msg => { banner.textContent = msg; banner.hidden = false; };
  const hideBanner = () => { banner.hidden = true; };

  function validateAll() {
    let first = null;
    $$('[data-rule]', form).forEach(el => {
      el.closest('.field').classList.add('touched');
      if (!check(el) && !first) first = el;
    });
    const ok = $('#confirm').checked;
    $('#fConfirm').classList.toggle('bad', !ok);
    if (!ok && !first) first = $('#confirm');
    return first;
  }

  function buildPayload() {
    const clean = s => s.trim().replace(/\s+/g, ' ');
    const courses = $$('.slip', slips).map(s => {
      const g = n => $(`[data-name="${n}"]`, s).value;
      return { jenis: g('jenis'), nama: clean(g('nama')), dosen: clean(g('dosen')), waktu: `${fmt(g('mulai'))} – ${fmt(g('selesai'))} WIB` };
    });
    // sama seperti pratinjau: Mata Kuliah dulu, baru Praktikum
    const rank = c => (c.jenis === 'Praktikum' ? 1 : 0);
    courses.sort((a, b) => rank(a) - rank(b));
    return {
      email: $('#email').value.trim(), nama: clean($('#nama').value), npm: $('#npm').value,
      prodi: $('#prodi').value, angkatan: $('#angkatan').value, wa: $('#wa').value,
      jumlah: courses.length, courses, hp: $('#hp').value
    };
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function post(payload) {
    if (!CONFIG.ENDPOINT) { await sleep(1000); return { status: 'ok', demo: true }; }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    try {
      // body string => Content-Type text/plain => tidak ada preflight CORS (wajib untuk Apps Script)
      const res = await fetch(CONFIG.ENDPOINT, { method: 'POST', body: JSON.stringify(payload), signal: ctrl.signal });
      return await res.json();
    } finally { clearTimeout(timer); }
  }

  function showSuccess(payload, demo) {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
    form.hidden = true;
    $('#success').hidden = false;
    $('#demo').hidden = !demo;
    const r = $('#receipt');
    r.replaceChildren();
    const b = document.createElement('b'); b.textContent = payload.nama;
    r.append(b, ` (NPM ${payload.npm}), ${payload.jumlah} perkuliahan tercatat untuk Kamis, 29 Oktober 2026.`);
    const st = $('#stamp'); st.classList.remove('go'); void st.getBoundingClientRect(); st.classList.add('go');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (sending) return;
    if (closed || now() >= DEADLINE) { lockForm(); return; }
    hideBanner();
    const bad = validateAll();
    if (bad) {
      bad.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => bad.focus({ preventScroll: true }), 400);
      showBanner('Masih ada isian yang belum benar. Cek kolom yang ditandai merah.');
      return;
    }
    const payload = buildPayload();
    if (payload.hp) { showSuccess(payload, false); return; } // bot
    sending = true;
    sendBtn.disabled = true;
    $('span', sendBtn).textContent = 'Mengirim data...';
    try {
      const r = await post(payload);
      if (r && r.status === 'ok') { showSuccess(payload, !!r.demo); return; }
      if (r && r.status === 'closed') { lockForm(); return; }
      if (r && r.status === 'duplicate') {
        const f = $('#npm').closest('.field');
        f.classList.add('bad', 'touched'); f.classList.remove('ok');
        $('.err', f).textContent = 'NPM ini sudah pernah mengirim data.';
        showBanner('Data dengan NPM tersebut sudah pernah dikirim. Jika terdapat kesalahan pada data, silakan hubungi panitia.');
        $('#npm').scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        showBanner((r && r.message) || 'Data belum terkirim. Coba lagi sebentar lagi.');
      }
    } catch (err) {
      showBanner('Koneksi bermasalah, data belum terkirim. Cek internetmu lalu tekan Kirim Data lagi. Isianmu masih tersimpan.');
    } finally {
      sending = false;
      sendBtn.disabled = closed;
      $('span', sendBtn).textContent = 'Kirim Data';
    }
  });

  /* ---------- mulai ---------- */
  if (!restore()) addCourse();
  renumber();
  refresh();
  startCountdown(); // dipanggil terakhir supaya semua kartu ikut terkunci kalau deadline sudah lewat
})();