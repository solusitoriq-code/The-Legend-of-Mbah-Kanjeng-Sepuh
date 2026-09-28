/**
 * GOOGLE APPS SCRIPT (Code.gs)
 * Backend REST API untuk Media Pembelajaran "The Legend of Mbah Kanjeng Sepuh"
 * 
 * Fitur:
 * 1. Validasi Identitas Siswa (NIS / NISN) dari sheet 'Data_Siswa'
 * 2. Distribusi Bank Soal Pretest (5 soal) dari sheet 'Soal_Pretest'
 * 3. Distribusi Bank Soal Post-test (15 soal) dari sheet 'Soal_Posttest'
 * 4. Pencatatan & Sinkronisasi Skor Leaderboard (N-Gain, Peningkatan) ke sheet 'Leaderboard'
 * 5. Manajemen Concurrency aman dengan LockService
 */

// Konfigurasi Nama Sheet
var SHEET_NAMES = {
  DATA_SISWA: 'Data_Siswa',
  SOAL_PRETEST: 'Soal_Pretest',
  SOAL_POSTTEST: 'Soal_Posttest',
  LEADERBOARD: 'Leaderboard'
};

/**
 * Handle HTTP GET Requests
 * Parameter 'action':
 * - 'getData'        : Mengambil seluruh dataset (Siswa, Pretest, Posttest, Leaderboard)
 * - 'checkNISN'      : Validasi NIS atau NISN (?action=checkNISN&nisn=11486)
 * - 'getLeaderboard' : Mengambil data leaderboard terurut
 */
function doGet(e) {
  try {
    var params = e ? e.parameter : {};
    var action = params ? params.action : '';

    if (action === 'getData') {
      return handleGetData();
    } else if (action === 'checkNISN') {
      var query = params.nisn || params.nis || '';
      return handleCheckNISN(query);
    } else if (action === 'getLeaderboard') {
      return handleGetLeaderboard();
    }

    return createJsonResponse_({
      success: true,
      message: 'API Media Pembelajaran The Legend of Mbah Kanjeng Sepuh aktif.',
      endpoints: {
        getData: '?action=getData',
        checkNISN: '?action=checkNISN&nisn={NISN_ATAU_NIS}',
        getLeaderboard: '?action=getLeaderboard'
      }
    });
  } catch (err) {
    return createJsonResponse_({
      success: false,
      error: err.toString()
    });
  }
}

/**
 * Handle HTTP POST Requests
 * Menerima payload JSON dari aplikasi client (submit evaluasi post-test)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  // Tunggu lock hingga 10 detik untuk menghindari konflik tulis bersamaan
  try {
    lock.waitLock(10000);
  } catch (err) {
    return createJsonResponse_({
      success: false,
      message: 'Server sedang sibuk memproses data lain. Coba beberapa saat lagi.'
    });
  }

  try {
    var rawContent = e && e.postData ? e.postData.contents : '';
    if (!rawContent) {
      return createJsonResponse_({
        success: false,
        message: 'Payload data kosong.'
      });
    }

    var payload = JSON.parse(rawContent);
    var result = saveScoreToLeaderboard_(payload);

    return createJsonResponse_(result);
  } catch (err) {
    return createJsonResponse_({
      success: false,
      error: err.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Mengambil seluruh dataset untuk mode online
 */
function handleGetData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var dataSiswa = getSheetRowsAsJson_(ss.getSheetByName(SHEET_NAMES.DATA_SISWA));
  var soalPretest = getSheetRowsAsJson_(ss.getSheetByName(SHEET_NAMES.SOAL_PRETEST));
  var soalPosttest = getSheetRowsAsJson_(ss.getSheetByName(SHEET_NAMES.SOAL_POSTTEST));
  var leaderboard = getLeaderboardData_(ss.getSheetByName(SHEET_NAMES.LEADERBOARD));

  return createJsonResponse_({
    success: true,
    dataSiswa: dataSiswa,
    soalPretest: soalPretest,
    soalPosttest: soalPosttest,
    leaderboard: leaderboard
  });
}

/**
 * Validasi NIS atau NISN siswa
 */
function handleCheckNISN(query) {
  var cleanQuery = String(query || '').trim();
  if (!cleanQuery) {
    return createJsonResponse_({
      success: false,
      message: 'Nomor NIS/NISN tidak boleh kosong.'
    });
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.DATA_SISWA);
  if (!sheet) {
    return createJsonResponse_({
      success: false,
      message: 'Sheet Data_Siswa tidak ditemukan.'
    });
  }

  var students = getSheetRowsAsJson_(sheet);
  var found = null;

  for (var i = 0; i < students.length; i++) {
    var s = students[i];
    var sNISN = String(s.NISN || '').trim();
    var sNIS = String(s.NIS || '').trim();

    if (sNISN === cleanQuery || sNIS === cleanQuery) {
      found = {
        NIS: s.NIS || '',
        NISN: s.NISN || '',
        Nama: s.Nama || '',
        Kelas: s.Kelas || ''
      };
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
    message: 'NIS/NISN "' + cleanQuery + '" tidak terdaftar di basis data.'
  });
}

/**
 * Mengambil data leaderboard terurut
 */
function handleGetLeaderboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.LEADERBOARD);
  var list = getLeaderboardData_(sheet);

  return createJsonResponse_({
    success: true,
    leaderboard: list
  });
}

/**
 * Menyimpan atau memperbarui data skor siswa pada sheet 'Leaderboard'
 */
function saveScoreToLeaderboard_(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.LEADERBOARD);

  // Buat sheet jika belum ada
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.LEADERBOARD);
  }

  var lastRow = sheet.getLastRow();
  var lastCol = Math.max(sheet.getLastColumn(), 1);

  // Inisialisasi header jika sheet masih benar-benar kosong
  if (lastRow === 0) {
    var defaultHeaders = ['NIS', 'NISN', 'Nama', 'Kelas', 'Nilai_Pretest', 'Nilai_Posttest', 'Nilai_Remidi', 'Status'];
    sheet.appendRow(defaultHeaders);
    sheet.getRange(1, 1, 1, defaultHeaders.length).setFontWeight('bold');
    lastRow = 1;
    lastCol = defaultHeaders.length;
  }

  var headerValues = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
    return String(h || '').trim();
  });

  var colMap = {};
  headerValues.forEach(function (h, idx) {
    if (h) colMap[h] = idx + 1;
  });

  // Format data masukan
  var now = new Date();
  var defaultTimestamp = Utilities.formatDate(now, Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd HH:mm');

  var timestamp = payload.timestamp || payload.Timestamp || defaultTimestamp;
  var nisn = String(payload.nisn || payload.NISN || '').trim();
  var nama = String(payload.nama || payload.Nama || 'Siswa').trim();
  var hasPretest = payload.nilaiPretest !== undefined && payload.nilaiPretest !== null && payload.nilaiPretest !== '' && !isNaN(Number(payload.nilaiPretest));
  var hasPosttest = payload.nilaiPosttest !== undefined && payload.nilaiPosttest !== null && payload.nilaiPosttest !== '' && !isNaN(Number(payload.nilaiPosttest));

  var pretest = hasPretest ? Number(payload.nilaiPretest) : (payload.Nilai_Pretest !== undefined ? Number(payload.Nilai_Pretest) : null);
  var posttest = hasPosttest ? Number(payload.nilaiPosttest) : (payload.Nilai_Posttest !== undefined ? Number(payload.Nilai_Posttest) : null);
  var total = Number(payload.totalSkor !== undefined ? payload.totalSkor : (payload.Total_Skor || (posttest !== null ? posttest : (pretest !== null ? pretest : 0))));
  var peningkatan = (posttest !== null && pretest !== null) ? (posttest - pretest) : 0;

  // Hitung Hake's N-Gain jika kedua nilai ada
  var nGain = 0;
  if (posttest !== null && pretest !== null) {
    if (100 - pretest <= 0) {
      nGain = posttest >= 100 ? 1.0 : 0.0;
    } else {
      nGain = Math.round(((posttest - pretest) / (100 - pretest)) * 100) / 100;
    }
  }

  // JIKA MENGGUNAKAN SKEMA BARU (Data_Siswa + Pretest + Posttest + Remidi + Status)
  if (colMap['Nilai_Remidi'] || colMap['Status']) {
    var updated = false;
    var nisnCol = colMap['NISN'] || 2;

    if (lastRow > 1 && nisn) {
      var nisnValues = sheet.getRange(2, nisnCol, lastRow - 1, 1).getValues();
      for (var r = 0; r < nisnValues.length; r++) {
        if (String(nisnValues[r][0]).trim() === nisn) {
          var targetRowIndex = r + 2;
          if (pretest !== null && colMap['Nilai_Pretest']) sheet.getRange(targetRowIndex, colMap['Nilai_Pretest']).setValue(pretest);
          if (posttest !== null && colMap['Nilai_Posttest']) {
            sheet.getRange(targetRowIndex, colMap['Nilai_Posttest']).setValue(posttest);
            if (colMap['Nilai_Remidi']) sheet.getRange(targetRowIndex, colMap['Nilai_Remidi']).setValue(75);
            if (colMap['Status']) {
              var fCol = String.fromCharCode(64 + (colMap['Nilai_Posttest'] || 6));
              var gCol = String.fromCharCode(64 + (colMap['Nilai_Remidi'] || 7));
              sheet.getRange(targetRowIndex, colMap['Status']).setFormula('=IF(' + fCol + targetRowIndex + '="","",IF(' + fCol + targetRowIndex + '>=' + gCol + targetRowIndex + ',"Lulus","Remidi"))');
            }
          }
          if (colMap['Total_Skor']) sheet.getRange(targetRowIndex, colMap['Total_Skor']).setValue(total);
          if (colMap['Timestamp']) sheet.getRange(targetRowIndex, colMap['Timestamp']).setValue(timestamp);
          updated = true;
          break;
        }
      }
    }

    if (!updated) {
      var newRow = new Array(headerValues.length).fill('');
      var nextRowNum = sheet.getLastRow() + 1;
      if (colMap['NIS']) newRow[colMap['NIS'] - 1] = payload.nis || payload.NIS || '';
      if (colMap['NISN']) newRow[colMap['NISN'] - 1] = nisn;
      if (colMap['Nama']) newRow[colMap['Nama'] - 1] = nama;
      if (colMap['Kelas']) newRow[colMap['Kelas'] - 1] = payload.kelas || payload.Kelas || '';
      if (pretest !== null && colMap['Nilai_Pretest']) newRow[colMap['Nilai_Pretest'] - 1] = pretest;
      if (posttest !== null && colMap['Nilai_Posttest']) newRow[colMap['Nilai_Posttest'] - 1] = posttest;
      if (colMap['Nilai_Remidi']) newRow[colMap['Nilai_Remidi'] - 1] = 75;
      if (colMap['Status']) {
        var fCol = String.fromCharCode(64 + (colMap['Nilai_Posttest'] || 6));
        var gCol = String.fromCharCode(64 + (colMap['Nilai_Remidi'] || 7));
        newRow[colMap['Status'] - 1] = '=IF(' + fCol + nextRowNum + '="","",IF(' + fCol + nextRowNum + '>=' + gCol + nextRowNum + ',"Lulus","Remidi"))';
      }
      sheet.appendRow(newRow);
    }

    return {
      success: true,
      message: updated ? 'Skor siswa berhasil diperbarui.' : 'Skor siswa baru berhasil ditambahkan.',
      record: {
        Timestamp: timestamp,
        NISN: nisn,
        Nama: nama,
        Nilai_Pretest: pretest,
        Nilai_Posttest: posttest,
        Nilai_Remidi: 75,
        Status: posttest >= 75 ? 'Lulus' : 'Remidi',
        Total_Skor: total
      }
    };
  }

  // SKEMA LAMA (Timestamp, NISN, Nama, Nilai_Pretest, Nilai_Posttest, Total_Skor, Peningkatan, Nilai_NGain)
  var headers = [
    'Timestamp',
    'NISN',
    'Nama',
    'Nilai_Pretest',
    'Nilai_Posttest',
    'Total_Skor',
    'Peningkatan',
    'Nilai_NGain'
  ];

  var rowData = [
    timestamp,
    nisn,
    nama,
    pretest,
    posttest,
    total,
    peningkatan,
    nGain
  ];

  var updatedLegacy = false;
  if (lastRow > 1 && nisn) {
    var nisnValues = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    for (var r = 0; r < nisnValues.length; r++) {
      if (String(nisnValues[r][0]).trim() === nisn) {
        var targetRowIndex = r + 2;
        sheet.getRange(targetRowIndex, 1, 1, headers.length).setValues([rowData]);
        updatedLegacy = true;
        break;
      }
    }
  }

  if (!updatedLegacy) {
    sheet.appendRow(rowData);
  }

  if (sheet.getLastRow() > 2) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).sort({ column: 6, ascending: false });
  }

  return {
    success: true,
    message: updatedLegacy ? 'Skor siswa berhasil diperbarui.' : 'Skor siswa baru berhasil ditambahkan.',
    record: {
      Timestamp: timestamp,
      NISN: nisn,
      Nama: nama,
      Nilai_Pretest: pretest,
      Nilai_Posttest: posttest,
      Total_Skor: total,
      Peningkatan: peningkatan,
      Nilai_NGain: nGain
    }
  };
}

/**
 * Helper: Membaca sheet menjadi array of object JSON
 */
function getSheetRowsAsJson_(sheet) {
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = data[0].map(function (h) { return String(h || '').trim(); });
  var results = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    var hasContent = false;

    for (var c = 0; c < headers.length; c++) {
      var key = headers[c];
      if (!key) continue;
      var val = row[c];
      if (val !== '' && val !== null && val !== undefined) {
        hasContent = true;
      }
      // Konversi tipe data untuk NIS dan NISN agar string tidak kehilangan angka 0 di depan
      if (key === 'NIS' || key === 'NISN') {
        obj[key] = String(val !== undefined && val !== null ? val : '').trim();
      } else {
        obj[key] = val;
      }
    }

    if (hasContent) {
      results.push(obj);
    }
  }

  return results;
}

/**
 * Helper: Membaca dan mengurutkan data Leaderboard
 */
function getLeaderboardData_(sheet) {
  var list = getSheetRowsAsJson_(sheet);

  // Saring hanya siswa yang sudah memiliki nilai jika sheet berisi template seluruh siswa
  var scored = list.filter(function (item) {
    return item.Nilai_Posttest !== undefined && item.Nilai_Posttest !== '' && !isNaN(Number(item.Nilai_Posttest));
  });

  var workingList = scored.length > 0 ? scored : list;

  workingList.forEach(function (item) {
    var pre = Number(item.Nilai_Pretest || 0);
    var post = Number(item.Nilai_Posttest || item.Total_Skor || 0);
    var total = Number(item.Total_Skor || post);

    item.Nilai_Pretest = pre;
    item.Nilai_Posttest = post;
    item.Total_Skor = total;
    item.Peningkatan = post - pre;

    var nGain = 0;
    if (100 - pre <= 0) {
      nGain = post >= 100 ? 1.0 : 0.0;
    } else {
      nGain = Math.round(((post - pre) / (100 - pre)) * 100) / 100;
    }
    item.Nilai_NGain = nGain;
  });

  workingList.sort(function (a, b) {
    var sA = Number(a.Total_Skor || 0);
    var sB = Number(b.Total_Skor || 0);
    if (sB !== sA) return sB - sA;
    return Number(b.Nilai_Posttest || 0) - Number(a.Nilai_Posttest || 0);
  });

  return workingList;
}

/**
 * Helper: Output JSON dengan MIME type application/json
 */
function createJsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
