const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const EXCEL_PATH = path.join(__dirname, '..', 'data', 'materi_evaluasi.xlsx');

if (!fs.existsSync(EXCEL_PATH)) {
  console.error(`Berkas Excel tidak ditemukan: ${EXCEL_PATH}`);
  process.exit(1);
}

const workbook = xlsx.readFile(EXCEL_PATH);

const dataSiswaSheet = workbook.Sheets['Data_Siswa'];
if (!dataSiswaSheet) {
  console.error('Sheet Data_Siswa tidak ditemukan dalam berkas Excel!');
  process.exit(1);
}

// Ambil data siswa dengan membaca langsung cell dari Data_Siswa agar format teks NIS & NISN terjaga
const refRange = xlsx.utils.decode_range(dataSiswaSheet['!ref']);
const headers = [
  'NIS',
  'NISN',
  'Nama',
  'Kelas',
  'Nilai_Pretest',
  'Nilai_Posttest',
  'Nilai_Remidi',
  'Status'
];

const newLeaderboardSheet = {};

// Header baris 1 (index r: 0)
headers.forEach((h, colIdx) => {
  const cellRef = xlsx.utils.encode_cell({ c: colIdx, r: 0 });
  newLeaderboardSheet[cellRef] = { t: 's', v: h };
});

// Baris data (r dari 1 sampai refRange.e.r)
let studentCount = 0;
for (let r = 1; r <= refRange.e.r; r++) {
  const nisCell = dataSiswaSheet[xlsx.utils.encode_cell({ c: 0, r })];
  const nisnCell = dataSiswaSheet[xlsx.utils.encode_cell({ c: 1, r })];
  const namaCell = dataSiswaSheet[xlsx.utils.encode_cell({ c: 2, r })];
  const kelasCell = dataSiswaSheet[xlsx.utils.encode_cell({ c: 3, r })];

  // Pastikan baris memiliki data
  if (!nisCell && !nisnCell && !namaCell) continue;

  studentCount++;
  const excelRowNum = r + 1; // Baris Excel (2, 3, ...)

  // Kolom A: NIS
  newLeaderboardSheet[xlsx.utils.encode_cell({ c: 0, r })] = {
    t: 's',
    v: String(nisCell ? nisCell.v : '').trim()
  };

  // Kolom B: NISN
  newLeaderboardSheet[xlsx.utils.encode_cell({ c: 1, r })] = {
    t: 's',
    v: String(nisnCell ? nisnCell.v : '').trim()
  };

  // Kolom C: Nama
  newLeaderboardSheet[xlsx.utils.encode_cell({ c: 2, r })] = {
    t: 's',
    v: String(namaCell ? namaCell.v : '').trim()
  };

  // Kolom D: Kelas
  newLeaderboardSheet[xlsx.utils.encode_cell({ c: 3, r })] = {
    t: 's',
    v: String(kelasCell ? kelasCell.v : '').trim()
  };

  // Kolom E: Nilai_Pretest (dikosongkan untuk diisi hasil pretest)

  // Kolom F: Nilai_Posttest (dikosongkan untuk diisi hasil posttest)

  // Kolom G: Nilai_Remidi (keisi 75 semua)
  newLeaderboardSheet[xlsx.utils.encode_cell({ c: 6, r })] = {
    t: 'n',
    v: 75
  };

  // Kolom H: Status (Formula: Jika Posttest kosong/null maka kosong, jika Posttest >= Nilai_Remidi Lulus else Remidi)
  newLeaderboardSheet[xlsx.utils.encode_cell({ c: 7, r })] = {
    t: 's',
    f: `IF(F${excelRowNum}="","",IF(F${excelRowNum}>=G${excelRowNum},"Lulus","Remidi"))`,
    v: ''
  };
}

// Konfigurasi range dan lebar kolom
newLeaderboardSheet['!ref'] = xlsx.utils.encode_range({
  s: { c: 0, r: 0 },
  e: { c: headers.length - 1, r: refRange.e.r }
});

newLeaderboardSheet['!cols'] = [
  { wch: 10 }, // NIS
  { wch: 14 }, // NISN
  { wch: 35 }, // Nama
  { wch: 10 }, // Kelas
  { wch: 14 }, // Nilai_Pretest
  { wch: 14 }, // Nilai_Posttest
  { wch: 14 }, // Nilai_Remidi
  { wch: 12 }  // Status
];

workbook.Sheets['Leaderboard'] = newLeaderboardSheet;

if (!workbook.SheetNames.includes('Leaderboard')) {
  workbook.SheetNames.push('Leaderboard');
}

try {
  xlsx.writeFile(workbook, EXCEL_PATH);
  console.log(`Sukses: Sheet 'Leaderboard' berhasil diperbarui dengan ${studentCount} data siswa.`);
} catch (err) {
  if (err.code === 'EBUSY') {
    console.error(`Gagal: Berkas ${EXCEL_PATH} sedang terbuka di Excel. Tutup Excel terlebih dahulu.`);
  } else {
    console.error('Gagal menulis berkas Excel:', err);
  }
  process.exit(1);
}
