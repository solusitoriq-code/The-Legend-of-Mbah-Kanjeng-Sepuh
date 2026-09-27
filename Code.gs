/**
 * GOOGLE APPS SCRIPT (Code.gs)
 * Backend Adapter Media Pembelajaran Interaktif "The Legend of Mbah Kanjeng Sepuh"
 * 
 * Pengelolaan Integrasi Google Spreadsheet:
 * 1. Data_Siswa (Verifikasi NISN)
 * 2. Soal_Pretest & Soal_Posttest (Bank Soal)
 * 3. Leaderboard (Perekaman & Pemeringkatan Nilai Siswa)
 */

// Konfigurasi Nama Sheet
var SHEET_NAMES = {
  DATA_SISWA: 'Data_Siswa',
  SOAL_PRETEST: 'Soal_Pretest',
  SOAL_POSTTEST: 'Soal_Posttest',
  LEADERBOARD: 'Leaderboard'
};

/**
 * Endpoint HTTP GET
 * Parameter URL yang didukung:
 * - action=getData : Mengambil seluruh data (dataSiswa, soalPretest, soalPosttest, leaderboard)
 * - action=checkNISN&nisn=XXX : Memvalidasi ketersediaan NISN siswa
 * - default : Mengembalikan status kesehatan layanan Web App
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action || 'getData';

    if (action === 'checkNISN') {
      return handleCheckNISN_(params.nisn);
    }

    if (action === 'getData') {
      return handleGetData_();
    }

    return createJsonResponse_({
      success: true,
      service: 'Web App Backend Evaluasi Mbah Kanjeng Sepuh',
      status: 'READY',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return createJsonResponse_({
      success: false,
      error: error.toString()
    });
  }
}

/**
 * Endpoint HTTP POST
 * Menerima payload hasil evaluasi siswa dan menyimpannya ke sheet Leaderboard
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Kunci eksekusi selama maksimal 10 detik untuk mencegah konflik penulisan baris paralel
    lock.waitLock(10000);

    var payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    var record = saveScoreToLeaderboard_(payload);

    return createJsonResponse_({
      success: true,
      message: 'Skor berhasil disimpan ke Leaderboard.',
      data: record
    });
  } catch (error) {
    return createJsonResponse_({
      success: false,
      error: error.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Membaca data sheet dan mengubahnya menjadi array of objects JSON
 */
function sheetToJson_(sheet) {
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  var result = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var isRowEmpty = true;
    var obj = {};

    for (var j = 0; j < headers.length; j++) {
      var headerKey = String(headers[j]).trim();
      if (!headerKey) continue;

      var val = row[j];
      if (val !== '' && val !== null && val !== undefined) {
        isRowEmpty = false;
      }

      // Normalisasi format khusus
      if (headerKey.toUpperCase() === 'NISN') {
        val = normalizeNISN_(val);
      } else if (['ID', 'NILAI_PRETEST', 'NILAI_POSTTEST', 'TOTAL_SKOR', 'PENINGKATAN', 'NILAI_NGAIN'].indexOf(headerKey.toUpperCase()) !== -1) {
        val = (val === '' || isNaN(Number(val))) ? val : Number(val);
      }

      obj[headerKey] = val;
    }

    if (!isRowEmpty) {
      result.push(obj);
    }
  }

  return result;
}

/**
 * Mengambil referensi sheet dengan pencocokan toleran (case-insensitive)
 */
function getSheetByName_(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (sheet) return sheet;

  // Pencocokan fleksibel
  var sheets = ss.getSheets();
  var target = sheetName.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (var i = 0; i < sheets.length; i++) {
    var cur = sheets[i].getName().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cur === target) {
      return sheets[i];
    }
  }
  return null;
}

/**
 * Normalisasi string NISN (mempertahankan angka nol di depan)
 */
function normalizeNISN_(val) {
  if (val === null || val === undefined) return '';
  var str = String(val).trim();
  if (/^\d+$/.test(str) && str.length < 10) {
    str = ('0000000000' + str).slice(-10);
  }
  return str;
}

/**
 * Handler pemuatan seluruh data kuis dan leaderboard
 */
function handleGetData_() {
  var sheetSiswa = getSheetByName_(SHEET_NAMES.DATA_SISWA);
  var sheetPretest = getSheetByName_(SHEET_NAMES.SOAL_PRETEST);
  var sheetPosttest = getSheetByName_(SHEET_NAMES.SOAL_POSTTEST);
  var sheetLeaderboard = getSheetByName_(SHEET_NAMES.LEADERBOARD);

  var dataSiswa = sheetToJson_(sheetSiswa);
  var soalPretest = sheetToJson_(sheetPretest);
  var soalPosttest = sheetToJson_(sheetPosttest);
  var leaderboard = sheetToJson_(sheetLeaderboard);

  // Urutkan data leaderboard menurun berdasarkan Total_Skor
  leaderboard.sort(function(a, b) {
    var scoreA = Number(a.Total_Skor || a.totalSkor || 0);
    var scoreB = Number(b.Total_Skor || b.totalSkor || 0);
    if (scoreB !== scoreA) return scoreB - scoreA;
    var postA = Number(a.Nilai_Posttest || a.nilaiPosttest || 0);
    var postB = Number(b.Nilai_Posttest || b.nilaiPosttest || 0);
    if (postB !== postA) return postB - postA;
    return Number(b.Nilai_Pretest || 0) - Number(a.Nilai_Pretest || 0);
  });

  return createJsonResponse_({
    success: true,
    dataSiswa: dataSiswa,
    soalPretest: soalPretest,
    soalPosttest: soalPosttest,
    leaderboard: leaderboard
  });
}

/**
 * Handler validasi NISN langsung ke sheet Data_Siswa
 */
function handleCheckNISN_(nisnInput) {
  var cleanNISN = normalizeNISN_(nisnInput);
  if (!cleanNISN) {
    return createJsonResponse_({
      success: false,
      message: 'Parameter NISN tidak boleh kosong.'
    });
  }

  var sheetSiswa = getSheetByName_(SHEET_NAMES.DATA_SISWA);
  if (!sheetSiswa) {
    return createJsonResponse_({
      success: false,
      message: 'Sheet Data_Siswa tidak ditemukan.'
    });
  }

  var students = sheetToJson_(sheetSiswa);
  var found = null;
  for (var i = 0; i < students.length; i++) {
    if (String(students[i].NISN).trim() === cleanNISN || (students[i].NIS && String(students[i].NIS).trim() === cleanNISN)) {
      found = students[i];
      break;
    }
  }

  if (found) {
    return createJsonResponse_({
      success: true,
      student: found
    });
  }

  return createJsonResponse_({
    success: false,
    message: 'NIS/NISN "' + cleanNISN + '" tidak terdaftar di basis data.'
  });
}

/**
 * Menyimpan data nilai ke sheet Leaderboard
 */
function saveScoreToLeaderboard_(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getSheetByName_(SHEET_NAMES.LEADERBOARD);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.LEADERBOARD);
  }

  var headers = ['Timestamp', 'NISN', 'Nama', 'Nilai_Pretest', 'Nilai_Posttest', 'Total_Skor', 'Peningkatan', 'Nilai_NGain'];

  // Inisialisasi header jika sheet masih kosong
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }

  var pad = function(n) { return (n < 10 ? '0' : '') + n; };
  var now = new Date();
  var defaultTimestamp = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes());

  var nisn = normalizeNISN_(payload.nisn || payload.NISN || '-');
  var nama = String(payload.nama || payload.Nama || 'Siswa').trim();
  var preVal = Number(payload.nilaiPretest !== undefined ? payload.nilaiPretest : (payload.Nilai_Pretest || 0));
  var postVal = Number(payload.nilaiPosttest !== undefined ? payload.nilaiPosttest : (payload.Nilai_Posttest || 0));
  var totalVal = Number(payload.totalSkor !== undefined ? payload.totalSkor : (payload.Total_Skor || postVal));
  var diff = postVal - preVal;

  var nGain = 0;
  if (100 - preVal <= 0) {
    nGain = postVal >= 100 ? 1.0 : 0.0;
  } else {
    nGain = Math.round(((postVal - preVal) / (100 - preVal)) * 100) / 100;
  }

  var timestamp = String(payload.timestamp || payload.Timestamp || defaultTimestamp);

  var newRowData = [timestamp, "'" + nisn, nama, preVal, postVal, totalVal, diff, nGain];

  // Cari baris jika NISN sudah ada sebelumnya untuk diperbarui
  var lastRow = sheet.getLastRow();
  var updatedRowIndex = -1;

  if (lastRow > 1) {
    var nisnRange = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    for (var r = 0; r < nisnRange.length; r++) {
      var cellNISN = normalizeNISN_(nisnRange[r][0]);
      if (cellNISN === nisn) {
        updatedRowIndex = r + 2;
        break;
      }
    }
  }

  if (updatedRowIndex !== -1) {
    sheet.getRange(updatedRowIndex, 1, 1, newRowData.length).setValues([newRowData]);
  } else {
    sheet.appendRow(newRowData);
  }

  // Urutkan leaderboard menurun berdasarkan Total_Skor (Kolom F)
  if (sheet.getLastRow() > 2) {
    var sortRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    sortRange.sort([
      { column: 6, ascending: false },
      { column: 5, ascending: false },
      { column: 4, ascending: false }
    ]);
  }

  return {
    Timestamp: timestamp,
    NISN: nisn,
    Nama: nama,
    Nilai_Pretest: preVal,
    Nilai_Posttest: postVal,
    Total_Skor: totalVal,
    Peningkatan: diff,
    Nilai_NGain: nGain
  };
}

/**
 * Utilitas pembentuk response JSON dengan MIME type application/json
 */
function createJsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Fungsi Pengujian Eksekusi di Apps Script Editor
 */
function testDoGet() {
  var result = doGet({ parameter: { action: 'getData' } });
  Logger.log(result.getContent());
}

function testCheckNISN() {
  var result = doGet({ parameter: { action: 'checkNISN', nisn: '3103894907' } });
  Logger.log(result.getContent());
}

function testDoPost() {
  var mockPayload = {
    postData: {
      contents: JSON.stringify({
        nisn: '3103894907',
        nama: 'ACHMAD RIZKY RADITYA',
        nilaiPretest: 40,
        nilaiPosttest: 95,
        totalSkor: 95
      })
    }
  };
  var result = doPost(mockPayload);
  Logger.log(result.getContent());
}
