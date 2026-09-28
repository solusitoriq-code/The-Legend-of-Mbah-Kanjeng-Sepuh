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

  const isNewRow = (targetRow === -1);

  // Jika siswa belum terdaftar di Leaderboard, buat baris baru di akhir
  if (isNewRow) {
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

  // Baca nilai lama dari sel Excel
  const preCellKey = xlsx.utils.encode_cell({ c: 4, r: targetRow });
  const postCellKey = xlsx.utils.encode_cell({ c: 5, r: targetRow });

  const existingPreCell = sheet[preCellKey];
  const hasExistingPre = existingPreCell && existingPreCell.v !== undefined && existingPreCell.v !== null && existingPreCell.v !== '' && !isNaN(Number(existingPreCell.v));
  const existingPreVal = hasExistingPre ? Number(existingPreCell.v) : null;

  const existingPostCell = sheet[postCellKey];
  const hasExistingPost = existingPostCell && existingPostCell.v !== undefined && existingPostCell.v !== null && existingPostCell.v !== '' && !isNaN(Number(existingPostCell.v));
  const existingPostVal = hasExistingPost ? Number(existingPostCell.v) : null;

  let preUpdated = false;
  let postUpdated = false;
  let finalPreVal = existingPreVal;
  let finalPostVal = existingPostVal;

  // Catat Nilai Pretest: Hanya simpan jika lebih tinggi dari nilai sebelumnya
  if (payload.nilaiPretest !== undefined && payload.nilaiPretest !== null && !isNaN(Number(payload.nilaiPretest))) {
    const candidatePre = Math.round(Number(payload.nilaiPretest));
    if (existingPreVal === null || candidatePre > existingPreVal) {
      sheet[preCellKey] = { t: 'n', v: candidatePre };
      finalPreVal = candidatePre;
      preUpdated = true;
      console.log(`[ExcelService] Pretest NISN ${cleanNISN}: diperbarui ${existingPreVal ?? '-'} -> ${candidatePre}`);
    } else {
      console.log(`[ExcelService] Pretest NISN ${cleanNISN}: nilai baru (${candidatePre}) <= skor tertinggi sebelumnya (${existingPreVal}). Nilai lama dipertahankan.`);
    }
  }

  // Catat Nilai Post-test: Hanya simpan jika lebih tinggi dari nilai sebelumnya
  if (payload.nilaiPosttest !== undefined && payload.nilaiPosttest !== null && !isNaN(Number(payload.nilaiPosttest))) {
    const candidatePost = Math.round(Number(payload.nilaiPosttest));
    if (existingPostVal === null || candidatePost > existingPostVal) {
      sheet[postCellKey] = { t: 'n', v: candidatePost };
      sheet[xlsx.utils.encode_cell({ c: 6, r: targetRow })] = { t: 'n', v: 75 };

      const isLulus = candidatePost >= 75;
      sheet[xlsx.utils.encode_cell({ c: 7, r: targetRow })] = {
        t: 's',
        f: `IF(F${excelRowNum}="","",IF(F${excelRowNum}>=G${excelRowNum},"Lulus","Remidi"))`,
        v: isLulus ? 'Lulus' : 'Remidi'
      };
      finalPostVal = candidatePost;
      postUpdated = true;
      console.log(`[ExcelService] Post-test NISN ${cleanNISN}: diperbarui ${existingPostVal ?? '-'} -> ${candidatePost}`);
    } else {
      console.log(`[ExcelService] Post-test NISN ${cleanNISN}: nilai baru (${candidatePost}) <= skor tertinggi sebelumnya (${existingPostVal}). Nilai lama dipertahankan.`);
    }
  } else if (!sheet[xlsx.utils.encode_cell({ c: 7, r: targetRow })]) {
    // Formula default jika belum ada Post-test
    sheet[xlsx.utils.encode_cell({ c: 6, r: targetRow })] = { t: 'n', v: 75 };
    sheet[xlsx.utils.encode_cell({ c: 7, r: targetRow })] = {
      t: 's',
      f: `IF(F${excelRowNum}="","",IF(F${excelRowNum}>=G${excelRowNum},"Lulus","Remidi"))`,
      v: ''
    };
  }

  // Tulis berkas Excel jika ada baris baru atau skor meningkat
  let excelSaved = false;
  if (isNewRow || preUpdated || postUpdated) {
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
          nilaiPretest: finalPreVal !== null ? finalPreVal : payload.nilaiPretest,
          nilaiPosttest: finalPostVal !== null ? finalPostVal : payload.nilaiPosttest,
          timestamp: payload.timestamp
        });
      } else {
        console.error(`[ExcelService] Gagal menulis berkas Excel:`, err);
      }
    }
  } else {
    excelSaved = true;
    console.log(`[ExcelService] Tidak ada peningkatan nilai untuk NISN ${cleanNISN}. Berkas Excel tidak perlu ditulis ulang.`);
  }

  // Sinkronisasi otomatis ke materi_evaluasi.json dengan skor tertinggi
  syncScoreToJson({
    nisn: cleanNISN,
    nis: cleanNIS,
    nama: cleanNama,
    kelas: cleanKelas,
    nilaiPretest: finalPreVal !== null ? finalPreVal : undefined,
    nilaiPosttest: finalPostVal !== null ? finalPostVal : undefined,
    timestamp: payload.timestamp,
    scoreUpdated: isNewRow || preUpdated || postUpdated
  });

  return {
    success: true,
    excelSaved,
    row: excelRowNum,
    updated: (preUpdated || postUpdated),
    pretestScore: finalPreVal,
    posttestScore: finalPostVal,
    message: (preUpdated || postUpdated)
      ? `Nilai tertinggi berhasil disimpan ke materi_evaluasi.xlsx (Baris ${excelRowNum})`
      : `Nilai sebelumnya lebih tinggi atau sama (${existingPreVal ?? '-'}/${existingPostVal ?? '-'}). Skor tertinggi tetap dipertahankan.`
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
      const existing = queue[idx];
      const merged = { ...existing, ...record };
      if (existing.nilaiPretest !== undefined && record.nilaiPretest !== undefined) {
        merged.nilaiPretest = Math.max(Number(existing.nilaiPretest || 0), Number(record.nilaiPretest || 0));
      }
      if (existing.nilaiPosttest !== undefined && record.nilaiPosttest !== undefined) {
        merged.nilaiPosttest = Math.max(Number(existing.nilaiPosttest || 0), Number(record.nilaiPosttest || 0));
      }
      queue[idx] = merged;
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

    let isNewEntry = false;
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
      isNewEntry = true;
      entry = {
        Timestamp: timestamp,
        NIS: record.nis || '',
        NISN: record.nisn || '',
        Nama: record.nama || '',
        Kelas: record.kelas || ''
      };
      data.leaderboard.push(entry);
    }

    if (record.nama) entry.Nama = record.nama;
    if (record.kelas) entry.Kelas = record.kelas;

    let scoreChanged = false;

    // Nilai Pretest: Hanya update jika lebih tinggi atau belum pernah ada
    if (record.nilaiPretest !== undefined && record.nilaiPretest !== null && !isNaN(Number(record.nilaiPretest))) {
      const candidatePre = Math.round(Number(record.nilaiPretest));
      const hasOldPre = entry.Nilai_Pretest !== undefined && entry.Nilai_Pretest !== null && entry.Nilai_Pretest !== '' && !isNaN(Number(entry.Nilai_Pretest));
      const oldPreVal = hasOldPre ? Number(entry.Nilai_Pretest) : null;
      if (oldPreVal === null || candidatePre > oldPreVal) {
        entry.Nilai_Pretest = candidatePre;
        scoreChanged = true;
      }
    }

    // Nilai Post-test: Hanya update jika lebih tinggi atau belum pernah ada
    if (record.nilaiPosttest !== undefined && record.nilaiPosttest !== null && !isNaN(Number(record.nilaiPosttest))) {
      const candidatePost = Math.round(Number(record.nilaiPosttest));
      const hasOldPost = entry.Nilai_Posttest !== undefined && entry.Nilai_Posttest !== null && entry.Nilai_Posttest !== '' && !isNaN(Number(entry.Nilai_Posttest));
      const oldPostVal = hasOldPost ? Number(entry.Nilai_Posttest) : null;
      if (oldPostVal === null || candidatePost > oldPostVal) {
        entry.Nilai_Posttest = candidatePost;
        entry.Nilai_Remidi = 75;
        entry.Status = candidatePost >= 75 ? 'Lulus' : 'Remidi';
        entry.Total_Skor = candidatePost;
        scoreChanged = true;
      }
    }

    // Timestamp hanya diperbarui jika terjadi pembaruan nilai atau entri baru
    if (isNewEntry || scoreChanged || record.scoreUpdated) {
      entry.Timestamp = timestamp;
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
