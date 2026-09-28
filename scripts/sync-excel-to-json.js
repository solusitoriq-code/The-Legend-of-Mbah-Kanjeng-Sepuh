/**
 * SYNC-EXCEL-TO-JSON.JS
 * Otomasi konversi dari data/materi_evaluasi.xlsx ke data/materi_evaluasi.json.
 * Memastikan data NIS, NISN, Soal Pretest, Soal Posttest, dan Leaderboard selalu sinkron.
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const EXCEL_PATH = path.join(__dirname, '..', 'data', 'materi_evaluasi.xlsx');
const JSON_PATH = path.join(__dirname, '..', 'data', 'materi_evaluasi.json');

const { flushPendingScores } = require('./excel-service');

function syncExcelToJson() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`Berkas Excel tidak ditemukan: ${EXCEL_PATH}`);
    process.exit(1);
  }

  // Coba kosongkan antrian tertunda jika berkas Excel sebelumnya sempat terkunci
  flushPendingScores();

  console.log(`Membaca berkas Excel: ${EXCEL_PATH}`);
  const workbook = xlsx.readFile(EXCEL_PATH);

  // 1. Data Siswa
  let dataSiswa = [];
  if (workbook.Sheets['Data_Siswa']) {
    const rawSiswa = xlsx.utils.sheet_to_json(workbook.Sheets['Data_Siswa']);
    dataSiswa = rawSiswa.map(item => ({
      NIS: String(item.NIS || '').trim(),
      NISN: String(item.NISN || '').trim(),
      Nama: String(item.Nama || '').trim(),
      Kelas: String(item.Kelas || '').trim()
    })).filter(s => s.NISN || s.NIS);
  }

  // 2. Soal Pretest
  let soalPretest = [];
  if (workbook.Sheets['Soal_Pretest']) {
    const rawPretest = xlsx.utils.sheet_to_json(workbook.Sheets['Soal_Pretest']);
    soalPretest = rawPretest.map((item, idx) => ({
      ID: Number(item.ID) || (idx + 1),
      Pertanyaan: String(item.Pertanyaan || '').trim(),
      Opsi_A: String(item.Opsi_A || '').trim(),
      Opsi_B: String(item.Opsi_B || '').trim(),
      Opsi_C: String(item.Opsi_C || '').trim(),
      Opsi_D: String(item.Opsi_D || '').trim(),
      Opsi_E: String(item.Opsi_E || '').trim(),
      Kunci: String(item.Kunci || '').trim().toUpperCase(),
      Pembahasan: String(item.Pembahasan || '').trim()
    }));
  }

  // 3. Soal Posttest
  let soalPosttest = [];
  if (workbook.Sheets['Soal_Posttest']) {
    const rawPosttest = xlsx.utils.sheet_to_json(workbook.Sheets['Soal_Posttest']);
    soalPosttest = rawPosttest.map((item, idx) => ({
      ID: Number(item.ID) || (idx + 1),
      Tipe: String(item.Tipe || (idx < 10 ? 'mcq' : 'matching')).trim().toLowerCase(),
      Pertanyaan: String(item.Pertanyaan || '').trim(),
      Opsi_A: String(item.Opsi_A || '').trim(),
      Opsi_B: String(item.Opsi_B || '').trim(),
      Opsi_C: String(item.Opsi_C || '').trim(),
      Opsi_D: String(item.Opsi_D || '').trim(),
      Opsi_E: String(item.Opsi_E || '').trim(),
      Kunci: String(item.Kunci || '').trim().toUpperCase(),
      Pasangan_Kiri: String(item.Pasangan_Kiri || '').trim(),
      Pasangan_Kanan: String(item.Pasangan_Kanan || '').trim(),
      Pembahasan: String(item.Pembahasan || '').trim()
    }));
  }

  // 4. Leaderboard
  let leaderboard = [];
  if (workbook.Sheets['Leaderboard']) {
    const rawLb = xlsx.utils.sheet_to_json(workbook.Sheets['Leaderboard']);
    // Saring baris yang memiliki nilai evaluasi (Posttest atau Pretest)
    const scoredLb = rawLb.filter(item => 
      (item.Nilai_Posttest !== undefined && item.Nilai_Posttest !== '' && !isNaN(Number(item.Nilai_Posttest))) ||
      (item.Nilai_Pretest !== undefined && item.Nilai_Pretest !== '' && !isNaN(Number(item.Nilai_Pretest)))
    );
    
    if (scoredLb.length > 0) {
      leaderboard = scoredLb.map(item => {
        const hasPost = item.Nilai_Posttest !== undefined && item.Nilai_Posttest !== '' && !isNaN(Number(item.Nilai_Posttest));
        const postVal = hasPost ? Number(item.Nilai_Posttest) : 0;
        const preVal = Number(item.Nilai_Pretest || 0);
        return {
          Timestamp: String(item.Timestamp || '').trim(),
          NIS: String(item.NIS || '').trim(),
          NISN: String(item.NISN || '').trim(),
          Nama: String(item.Nama || '').trim(),
          Kelas: String(item.Kelas || '').trim(),
          Nilai_Pretest: preVal,
          Nilai_Posttest: postVal,
          Nilai_Remidi: Number(item.Nilai_Remidi || 75),
          Status: String(item.Status !== undefined && item.Status !== '' ? item.Status : (hasPost ? (postVal >= Number(item.Nilai_Remidi || 75) ? 'Lulus' : 'Remidi') : '')),
          Total_Skor: Number(item.Total_Skor || (hasPost ? postVal : preVal))
        };
      });
    }
  }

  // Jika leaderboard di sheet belum memiliki skor siswa, pertahankan sampel dari json yang sudah ada
  if (leaderboard.length === 0 && fs.existsSync(JSON_PATH)) {
    try {
      const existing = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
      if (Array.isArray(existing.leaderboard) && existing.leaderboard.length > 0) {
        leaderboard = existing.leaderboard;
      }
    } catch (e) {
      // ignore
    }
  }

  const output = {
    dataSiswa,
    soalPretest,
    soalPosttest,
    leaderboard
  };

  fs.writeFileSync(JSON_PATH, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Sinkronisasi selesai! Berkas disimpan ke: ${JSON_PATH}`);
  console.log(`- Data Siswa: ${dataSiswa.length}`);
  console.log(`- Soal Pretest: ${soalPretest.length}`);
  console.log(`- Soal Posttest: ${soalPosttest.length}`);
  console.log(`- Leaderboard: ${leaderboard.length}`);
}

function syncJsonToExcel() {
  if (!fs.existsSync(JSON_PATH)) {
    console.error(`Berkas JSON tidak ditemukan: ${JSON_PATH}`);
    process.exit(1);
  }
  const json = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  try {
    const workbook = fs.existsSync(EXCEL_PATH) ? xlsx.readFile(EXCEL_PATH) : xlsx.utils.book_new();
    if (json.soalPosttest) {
      workbook.Sheets['Soal_Posttest'] = xlsx.utils.json_to_sheet(json.soalPosttest);
    }
    if (json.dataSiswa && !workbook.Sheets['Data_Siswa']) {
      workbook.Sheets['Data_Siswa'] = xlsx.utils.json_to_sheet(json.dataSiswa);
    }
    if (json.soalPretest && !workbook.Sheets['Soal_Pretest']) {
      workbook.Sheets['Soal_Pretest'] = xlsx.utils.json_to_sheet(json.soalPretest);
    }
    xlsx.writeFile(workbook, EXCEL_PATH);
    console.log(`Sukses: Berkas Excel ${EXCEL_PATH} berhasil disinkronkan dari JSON!`);

    // Jika JSON memiliki entri nilai leaderboard, sinkronkan nilai ke sheet Leaderboard
    if (Array.isArray(json.leaderboard) && json.leaderboard.length > 0) {
      const { saveScoreToExcel } = require('./excel-service');
      json.leaderboard.forEach(student => {
        if (student.NISN || student.NIS || student.Nama) {
          saveScoreToExcel({
            nisn: student.NISN,
            nis: student.NIS,
            nama: student.Nama,
            kelas: student.Kelas,
            nilaiPretest: student.Nilai_Pretest,
            nilaiPosttest: student.Nilai_Posttest,
            timestamp: student.Timestamp
          });
        }
      });
      console.log(`Sukses: ${json.leaderboard.length} data skor disinkronkan ke sheet 'Leaderboard'.`);
    }
  } catch (err) {
    if (err.code === 'EBUSY') {
      console.warn(`Peringatan: Berkas ${EXCEL_PATH} sedang dibuka di Excel. Tutup Excel lalu jalankan perintah ini kembali.`);
    } else {
      console.error('Gagal menulis ke Excel:', err);
    }
  }
}

if (process.argv.includes('--to-excel')) {
  syncJsonToExcel();
} else {
  syncExcelToJson();
}
