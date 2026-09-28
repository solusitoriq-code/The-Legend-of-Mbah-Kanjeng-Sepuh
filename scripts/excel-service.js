/**
 * EXCEL-SERVICE.JS
 * Service backend & utilitas untuk mencatat dan memperbarui nilai Pretest serta Post-test
 * langsung ke berkas data/materi_evaluasi.xlsx dan menyelaraskannya ke data/materi_evaluasi.json.
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const EXCEL_PATH = path.join(__dirname, '..', 'data', 'materi_evaluasi.xlsx');
const JSON_PATH = path.join(__dirname, '..', 'data', 'materi_evaluasi.json');

/**
 * Menyimpan nilai evaluasi siswa (Pretest dan/atau Post-test) ke data/materi_evaluasi.xlsx
 * @param {object} payload { nisn, nis, nama, kelas, nilaiPretest, nilaiPosttest, timestamp }
 * @param {boolean} [isFlushing=false] Penanda apakah pemanggilan berasal dari flush antrian
 * @returns {object} { success: boolean, excelSaved: boolean, row: number, message: string }
 */
function saveScoreToExcel(payload, isFlushing = false) {
  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error(`Berkas Excel tidak ditemukan: ${EXCEL_PATH}`);
  }

  const cleanNISN = String(payload.nisn || payload.NISN || '').trim();
  const cleanNIS = String(payload.nis || payload.NIS || '').trim();
  const cleanNama = String(payload.nama || payload.Nama || '').trim();
  const cleanKelas = String(payload.kelas || payload.Kelas || '').trim();

  if (!cleanNISN && !cleanNIS && !cleanNama) {
    throw new Error('Identitas siswa (NISN, NIS, atau Nama) harus disertakan.');
  }

  const workbook = xlsx.readFile(EXCEL_PATH);
  let sheet = workbook.Sheets['Leaderboard'];

  // Jika sheet Leaderboard belum ada, inisialisasi dari Data_Siswa
  if (!sheet) {
    console.log('[ExcelService] Sheet Leaderboard tidak ditemukan, membuat sheet baru...');
    sheet = {};
    const headers = ['NIS', 'NISN', 'Nama', 'Kelas', 'Nilai_Pretest', 'Nilai_Posttest', 'Nilai_Remidi', 'Status'];
    headers.forEach((h, colIdx) => {
      sheet[xlsx.utils.encode_cell({ c: colIdx, r: 0 })] = { t: 's', v: h };
    });
    sheet['!ref'] = 'A1:H1';
    workbook.Sheets['Leaderboard'] = sheet;
    if (!workbook.SheetNames.includes('Leaderboard')) {
      workbook.SheetNames.push('Leaderboard');
    }
  }

  const refRange = xlsx.utils.decode_range(sheet['!ref'] || 'A1:H1');

  // Cari baris siswa yang cocok berdasarkan NISN, NIS, atau Nama
  let targetRow = -1;
  for (let r = 1; r <= refRange.e.r; r++) {
    const nisCell = sheet[xlsx.utils.encode_cell({ c: 0, r })];
    const nisnCell = sheet[xlsx.utils.encode_cell({ c: 1, r })];
    const namaCell = sheet[xlsx.utils.encode_cell({ c: 2, r })];

    const rowNIS = String(nisCell ? nisCell.v : '').trim();
    const rowNISN = String(nisnCell ? nisnCell.v : '').trim();
    const rowNama = String(namaCell ? namaCell.v : '').trim().toLowerCase();

    if (cleanNISN && rowNISN === cleanNISN) {
      targetRow = r;
      break;
    }
    if (cleanNIS && rowNIS === cleanNIS) {
      targetRow = r;
      break;
    }
    if (cleanNama && rowNama === cleanNama.toLowerCase()) {
      targetRow = r;
      break;
    }
  }

  // Jika siswa belum terdaftar di Leaderboard, buat baris baru di akhir
  if (targetRow === -1) {
    targetRow = refRange.e.r + 1;
    sheet[xlsx.utils.encode_cell({ c: 0, r: targetRow })] = { t: 's', v: cleanNIS };
    sheet[xlsx.utils.encode_cell({ c: 1, r: targetRow })] = { t: 's', v: cleanNISN };
    sheet[xlsx.utils.encode_cell({ c: 2, r: targetRow })] = { t: 's', v: cleanNama };
    sheet[xlsx.utils.encode_cell({ c: 3, r: targetRow })] = { t: 's', v: cleanKelas };
    sheet[xlsx.utils.encode_cell({ c: 6, r: targetRow })] = { t: 'n', v: 75 };
    sheet['!ref'] = xlsx.utils.encode_range({
      s: { c: 0, r: 0 },
      e: { c: 7, r: targetRow }
    });
  }

  const excelRowNum = targetRow + 1;

  // Catat Nilai Pretest jika disertakan
  if (payload.nilaiPretest !== undefined && payload.nilaiPretest !== null && !isNaN(Number(payload.nilaiPretest))) {
    const preScore = Math.round(Number(payload.nilaiPretest));
    sheet[xlsx.utils.encode_cell({ c: 4, r: targetRow })] = { t: 'n', v: preScore };
  }

  // Catat Nilai Post-test jika disertakan
  let postScore = null;
  if (payload.nilaiPosttest !== undefined && payload.nilaiPosttest !== null && !isNaN(Number(payload.nilaiPosttest))) {
    postScore = Math.round(Number(payload.nilaiPosttest));
    sheet[xlsx.utils.encode_cell({ c: 5, r: targetRow })] = { t: 'n', v: postScore };
    sheet[xlsx.utils.encode_cell({ c: 6, r: targetRow })] = { t: 'n', v: 75 };

    const isLulus = postScore >= 75;
    sheet[xlsx.utils.encode_cell({ c: 7, r: targetRow })] = {
      t: 's',
      f: `IF(F${excelRowNum}="","",IF(F${excelRowNum}>=G${excelRowNum},"Lulus","Remidi"))`,
      v: isLulus ? 'Lulus' : 'Remidi'
    };
  } else if (!sheet[xlsx.utils.encode_cell({ c: 7, r: targetRow })]) {
    // Formula default jika belum ada Post-test
    sheet[xlsx.utils.encode_cell({ c: 6, r: targetRow })] = { t: 'n', v: 75 };
    sheet[xlsx.utils.encode_cell({ c: 7, r: targetRow })] = {
      t: 's',
      f: `IF(F${excelRowNum}="","",IF(F${excelRowNum}>=G${excelRowNum},"Lulus","Remidi"))`,
      v: ''
    };
  }

  // Tulis berkas Excel
  let excelSaved = false;
  try {
    xlsx.writeFile(workbook, EXCEL_PATH);
    excelSaved = true;
    console.log(`[ExcelService] Berhasil menyimpan nilai ke ${EXCEL_PATH} (Baris ${excelRowNum})`);
    // Coba proses antrian pending sebelumnya jika ada dan bukan berasal dari flushing
    if (!isFlushing) {
      flushPendingScores();
    }
  } catch (err) {
    if (err.code === 'EBUSY') {
      console.warn(`[ExcelService] Peringatan: Berkas ${EXCEL_PATH} sedang dibuka di aplikasi Excel. Data disimpan ke antrian pending dan disinkronkan ke JSON.`);
      queuePendingScore({
        nisn: cleanNISN,
        nis: cleanNIS,
        nama: cleanNama,
        kelas: cleanKelas,
        nilaiPretest: payload.nilaiPretest,
        nilaiPosttest: payload.nilaiPosttest,
        timestamp: payload.timestamp
      });
    } else {
      console.error(`[ExcelService] Gagal menulis berkas Excel:`, err);
    }
  }

  // Sinkronisasi otomatis ke materi_evaluasi.json
  syncScoreToJson({
    nisn: cleanNISN,
    nis: cleanNIS,
    nama: cleanNama,
    kelas: cleanKelas,
    nilaiPretest: payload.nilaiPretest !== undefined ? Number(payload.nilaiPretest) : undefined,
    nilaiPosttest: postScore !== null ? postScore : undefined,
    timestamp: payload.timestamp
  });

  return {
    success: true,
    excelSaved,
    row: excelRowNum,
    message: excelSaved 
      ? `Nilai berhasil disimpan ke materi_evaluasi.xlsx (Baris ${excelRowNum})`
      : `Nilai tersimpan di memori/antrian (materi_evaluasi.xlsx sedang dibuka di Excel).`
  };
}

const PENDING_PATH = path.join(__dirname, '..', 'data', '.pending_scores.json');

function queuePendingScore(record) {
  try {
    let queue = [];
    if (fs.existsSync(PENDING_PATH)) {
      queue = JSON.parse(fs.readFileSync(PENDING_PATH, 'utf8') || '[]');
    }
    const idx = queue.findIndex(q => (record.nisn && q.nisn === record.nisn) || (record.nis && q.nis === record.nis));
    if (idx >= 0) {
      queue[idx] = { ...queue[idx], ...record };
    } else {
      queue.push(record);
    }
    fs.writeFileSync(PENDING_PATH, JSON.stringify(queue, null, 2), 'utf8');
  } catch (e) {
    // ignore
  }
}

let isFlushingQueue = false;

function flushPendingScores() {
  if (isFlushingQueue) return;
  if (!fs.existsSync(PENDING_PATH)) return;
  isFlushingQueue = true;
  try {
    const queue = JSON.parse(fs.readFileSync(PENDING_PATH, 'utf8') || '[]');
    if (queue.length === 0) {
      if (fs.existsSync(PENDING_PATH)) fs.unlinkSync(PENDING_PATH);
      return;
    }
    const remaining = [];
    for (const item of queue) {
      try {
        saveScoreToExcel(item, true);
      } catch (e) {
        remaining.push(item);
      }
    }
    if (remaining.length === 0) {
      if (fs.existsSync(PENDING_PATH)) fs.unlinkSync(PENDING_PATH);
      console.log(`[ExcelService] Semua antrian pending berhasil disimpan ke Excel.`);
    } else {
      fs.writeFileSync(PENDING_PATH, JSON.stringify(remaining, null, 2), 'utf8');
    }
  } catch (e) {
    // ignore
  } finally {
    isFlushingQueue = false;
  }
}

/**
 * Sinkronisasi data skor ke data/materi_evaluasi.json
 */
function syncScoreToJson(record) {
  if (!fs.existsSync(JSON_PATH)) return;

  try {
    const raw = fs.readFileSync(JSON_PATH, 'utf8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data.leaderboard)) {
      data.leaderboard = [];
    }

    const cleanNISN = String(record.nisn || '').trim();
    const cleanNIS = String(record.nis || '').trim();
    const cleanNama = String(record.nama || '').trim().toLowerCase();

    let entry = data.leaderboard.find(item => {
      const iNISN = String(item.NISN || item.nisn || '').trim();
      const iNIS = String(item.NIS || item.nis || '').trim();
      const iNama = String(item.Nama || item.nama || '').trim().toLowerCase();
      return (cleanNISN && iNISN === cleanNISN) || (cleanNIS && iNIS === cleanNIS) || (cleanNama && iNama === cleanNama);
    });

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const defaultTimestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const timestamp = record.timestamp || defaultTimestamp;

    if (!entry) {
      entry = {
        Timestamp: timestamp,
        NIS: record.nis || '',
        NISN: record.nisn || '',
        Nama: record.nama || '',
        Kelas: record.kelas || ''
      };
      data.leaderboard.push(entry);
    }

    entry.Timestamp = timestamp;
    if (record.nama) entry.Nama = record.nama;
    if (record.kelas) entry.Kelas = record.kelas;

    if (record.nilaiPretest !== undefined && record.nilaiPretest !== null && !isNaN(Number(record.nilaiPretest))) {
      entry.Nilai_Pretest = Math.round(Number(record.nilaiPretest));
    }
    if (record.nilaiPosttest !== undefined && record.nilaiPosttest !== null && !isNaN(Number(record.nilaiPosttest))) {
      const post = Math.round(Number(record.nilaiPosttest));
      entry.Nilai_Posttest = post;
      entry.Nilai_Remidi = 75;
      entry.Status = post >= 75 ? 'Lulus' : 'Remidi';
      entry.Total_Skor = post;
    }

    // Urutkan leaderboard
    data.leaderboard.sort((a, b) => {
      const scoreA = Number(a.Total_Skor || a.Nilai_Posttest || 0);
      const scoreB = Number(b.Total_Skor || b.Nilai_Posttest || 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return Number(b.Nilai_Pretest || 0) - Number(a.Nilai_Pretest || 0);
    });

    fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), 'utf8');
    console.log(`[ExcelService] Berkas ${JSON_PATH} berhasil disinkronkan.`);
  } catch (err) {
    console.error(`[ExcelService] Gagal sinkronisasi ke JSON:`, err);
  }
}

module.exports = {
  saveScoreToExcel,
  syncScoreToJson,
  flushPendingScores
};
