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
  LEADERBOARD: 'Leaderboard',
  GLOSSARY: 'Glossary'
};

/**
 * Handle HTTP GET Requests
 * Parameter 'action':
 * - 'getData'        : Mengambil seluruh dataset (Siswa, Pretest, Posttest, Leaderboard)
 * - 'checkNISN'      : Validasi NIS atau NISN (?action=checkNISN&nisn=11486)
 * - 'getLeaderboard' : Mengambil data leaderboard terurut
 * - 'getGlossary'    : Mengambil daftar kosakata dari sheet 'Glossary'
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
    } else if (action === 'getGlossary') {
      return handleGetGlossary();
    }

    return createJsonResponse_({
      success: true,
      message: 'API Media Pembelajaran The Legend of Mbah Kanjeng Sepuh aktif.',
      endpoints: {
        getData: '?action=getData',
        checkNISN: '?action=checkNISN&nisn={NISN_ATAU_NIS}',
        getLeaderboard: '?action=getLeaderboard',
        getGlossary: '?action=getGlossary'
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
    var finalPre = pretest;
    var finalPost = posttest;

    if (lastRow > 1 && nisn) {
      var nisnValues = sheet.getRange(2, nisnCol, lastRow - 1, 1).getValues();
      for (var r = 0; r < nisnValues.length; r++) {
        if (String(nisnValues[r][0]).trim() === nisn) {
          var targetRowIndex = r + 2;
          var scoreUpdated = false;

          // Cek Nilai Pretest: hanya simpan jika lebih tinggi
          if (pretest !== null && colMap['Nilai_Pretest']) {
            var currPre = sheet.getRange(targetRowIndex, colMap['Nilai_Pretest']).getValue();
            var hasOldPre = currPre !== '' && currPre !== null && !isNaN(Number(currPre));
            var oldPreVal = hasOldPre ? Number(currPre) : null;
            if (oldPreVal === null || pretest > oldPreVal) {
              sheet.getRange(targetRowIndex, colMap['Nilai_Pretest']).setValue(pretest);
              finalPre = pretest;
              scoreUpdated = true;
            } else {
              finalPre = oldPreVal;
            }
          }

          // Cek Nilai Posttest: hanya simpan jika lebih tinggi
          if (posttest !== null && colMap['Nilai_Posttest']) {
            var currPost = sheet.getRange(targetRowIndex, colMap['Nilai_Posttest']).getValue();
            var hasOldPost = currPost !== '' && currPost !== null && !isNaN(Number(currPost));
            var oldPostVal = hasOldPost ? Number(currPost) : null;
            if (oldPostVal === null || posttest > oldPostVal) {
              sheet.getRange(targetRowIndex, colMap['Nilai_Posttest']).setValue(posttest);
              if (colMap['Nilai_Remidi']) sheet.getRange(targetRowIndex, colMap['Nilai_Remidi']).setValue(75);
              if (colMap['Status']) {
                var fCol = String.fromCharCode(64 + (colMap['Nilai_Posttest'] || 6));
                var gCol = String.fromCharCode(64 + (colMap['Nilai_Remidi'] || 7));
                sheet.getRange(targetRowIndex, colMap['Status']).setFormula('=IF(' + fCol + targetRowIndex + '="","",IF(' + fCol + targetRowIndex + '>=' + gCol + targetRowIndex + ',"Lulus","Remidi"))');
              }
              finalPost = posttest;
              scoreUpdated = true;
            } else {
              finalPost = oldPostVal;
            }
          }

          if (scoreUpdated) {
            var highestTotal = finalPost !== null ? finalPost : (finalPre !== null ? finalPre : 0);
            if (colMap['Total_Skor']) sheet.getRange(targetRowIndex, colMap['Total_Skor']).setValue(highestTotal);
            if (colMap['Timestamp']) sheet.getRange(targetRowIndex, colMap['Timestamp']).setValue(timestamp);
          }
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
      message: updated ? 'Skor siswa diproses (hanya skor tertinggi disimpan).' : 'Skor siswa baru berhasil ditambahkan.',
      record: {
        Timestamp: timestamp,
        NISN: nisn,
        Nama: nama,
        Nilai_Pretest: finalPre,
        Nilai_Posttest: finalPost,
        Nilai_Remidi: 75,
        Status: (finalPost !== null && finalPost >= 75) ? 'Lulus' : (finalPost !== null ? 'Remidi' : ''),
        Total_Skor: finalPost !== null ? finalPost : (finalPre !== null ? finalPre : 0)
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

  var updatedLegacy = false;
  var finalLegacyPre = pretest;
  var finalLegacyPost = posttest;

  if (lastRow > 1 && nisn) {
    var nisnValues = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    for (var r = 0; r < nisnValues.length; r++) {
      if (String(nisnValues[r][0]).trim() === nisn) {
        var targetRowIndex = r + 2;
        var existingRowValues = sheet.getRange(targetRowIndex, 1, 1, headers.length).getValues()[0];
        var oldPre = (existingRowValues[3] !== '' && !isNaN(Number(existingRowValues[3]))) ? Number(existingRowValues[3]) : null;
        var oldPost = (existingRowValues[4] !== '' && !isNaN(Number(existingRowValues[4]))) ? Number(existingRowValues[4]) : null;

        var scoreImproved = false;
        if (pretest !== null) {
          if (oldPre === null || pretest > oldPre) {
            finalLegacyPre = pretest;
            scoreImproved = true;
          } else {
            finalLegacyPre = oldPre;
          }
        } else {
          finalLegacyPre = oldPre;
        }

        if (posttest !== null) {
          if (oldPost === null || posttest > oldPost) {
            finalLegacyPost = posttest;
            scoreImproved = true;
          } else {
            finalLegacyPost = oldPost;
          }
        } else {
          finalLegacyPost = oldPost;
        }

        var legacyTotal = finalLegacyPost !== null ? finalLegacyPost : (finalLegacyPre !== null ? finalLegacyPre : 0);
        var legacyPeningkatan = (finalLegacyPost !== null && finalLegacyPre !== null) ? (finalLegacyPost - finalLegacyPre) : 0;
        var legacyNGain = 0;
        if (finalLegacyPost !== null && finalLegacyPre !== null) {
          if (100 - finalLegacyPre <= 0) {
            legacyNGain = finalLegacyPost >= 100 ? 1.0 : 0.0;
          } else {
            legacyNGain = Math.round(((finalLegacyPost - finalLegacyPre) / (100 - finalLegacyPre)) * 100) / 100;
          }
        }

        var mergedRow = [
          scoreImproved ? timestamp : existingRowValues[0],
          nisn,
          nama,
          finalLegacyPre,
          finalLegacyPost,
          legacyTotal,
          legacyPeningkatan,
          legacyNGain
        ];
        sheet.getRange(targetRowIndex, 1, 1, headers.length).setValues([mergedRow]);
        updatedLegacy = true;
        break;
      }
    }
  }

  if (!updatedLegacy) {
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
    sheet.appendRow(rowData);
  }

  if (sheet.getLastRow() > 2) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).sort({ column: 6, ascending: false });
  }

  return {
    success: true,
    message: updatedLegacy ? 'Skor siswa diproses (hanya skor tertinggi disimpan).' : 'Skor siswa baru berhasil ditambahkan.',
    record: {
      Timestamp: timestamp,
      NISN: nisn,
      Nama: nama,
      Nilai_Pretest: finalLegacyPre,
      Nilai_Posttest: finalLegacyPost,
      Total_Skor: finalLegacyPost !== null ? finalLegacyPost : (finalLegacyPre !== null ? finalLegacyPre : 0),
      Peningkatan: (finalLegacyPost !== null && finalLegacyPre !== null) ? (finalLegacyPost - finalLegacyPre) : 0,
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
 * Mengambil daftar kosakata dari sheet 'Glossary'
 */
function handleGetGlossary() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.GLOSSARY);

  // Inisialisasi sheet Glossary jika belum ada
  if (!sheet) {
    sheet = populateGlossarySheet_(ss);
  }

  var glossary = getSheetRowsAsJson_(sheet);
  return createJsonResponse_({
    success: true,
    glossary: glossary
  });
}

/**
 * Membuat dan mengisi sheet 'Glossary' dengan 16 kosakata dari Glossary.docx
 */
function populateGlossarySheet_(ss) {
  var sheet = ss.insertSheet(SHEET_NAMES.GLOSSARY);

  var headers = ['No', 'Kata', 'Pronounsiasi', 'Jenis_Kata', 'English_Meaning', 'Arti_ID', 'Contoh_Kalimat'];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1a237e').setFontColor('#ffffff');

  var data = [
    [1, 'Protagonist', '/ˈproʊ.tæɡ.ə.nɪst/', 'Noun', 'The main or central character in a story, play, or narrative.', 'Tokoh utama dalam cerita naratif.', 'Kanjeng Sepuh is the benevolent protagonist of the legend.'],
    [2, 'Drought', '/draʊt/', 'Noun', 'A prolonged period of abnormally low rainfall leading to a severe shortage of water.', 'Bencana kekeringan / musim kemarau panjang yang parah.', 'A severe drought destroyed the farms along the Lamongan-Tuban border.'],
    [3, 'Disruption', '/dɪsˈrʌp.ʃən/', 'Noun', 'A disturbance or problem that interrupts an event, activity, or continuous peaceful state.', 'Gangguan / kekacauan yang merusak ketentraman.', 'Unfair colonial taxes caused severe economic disruption for native merchants.'],
    [4, 'Excavate', '/ˈek.skə.veɪt/', 'Verb', 'To make a hole or channel by digging out earth, stone, or sand.', 'Menggali / mengeruk tanah.', 'Kanjeng Sepuh excavated a vital canal known as Kalibela.'],
    [5, 'Confront', '/kənˈfrʌnt/', 'Verb', 'To face, meet, or stand up to someone or something in an assertive or courageous way.', 'Menghadapi secara berani / menentang secara langsung.', 'He confronted the colonial officers without any fear.'],
    [6, 'Relic', '/ˈrel.ɪk/', 'Noun', 'An object, structure, or custom that has survived from an earlier historical era.', 'Peninggalan bersejarah / artefak peninggalan masa lampau.', 'The sacred spring of Telaga Rambit remains an enduring historical relic.'],
    [7, 'Enduring', '/ɪnˈdjʊər.ɪŋ/', 'Adjective', 'Lasting for a very long time; continuing or long-lived across generations.', 'Abadi / bertahan lama melintasi zaman.', 'His moral teachings left an enduring legacy in Sedayu.'],
    [8, 'Humility', '/hjuːˈmɪl.ɪ.ti/', 'Noun', 'The quality of being modest, respectful, and not considering oneself better than others.', 'Kerendahan hati / sikap tidak sombong.', 'Despite his royal background, he showed great humility toward the farmers.'],
    [9, 'Decree', '/dɪˈkriː/', 'Noun', 'An official order, command, or legal proclamation issued by an authority or ruler.', 'Surat ketetapan / titah resmi / surat perintah penguasa.', 'He firmly pushed aside the unfair tax decree.'],
    [10, 'Steed', '/stiːd/', 'Noun', 'A noble, high-spirited, or well-trained horse used for riding.', 'Kuda tunggangan yang gagah / luhur.', 'He entrusted his noble steeds to Kyai Jayeng Katon in Ujungpangkah.'],
    [11, 'Vanity', '/ˈvæn.ɪ.ti/', 'Noun', 'Excessive pride in one\'s own appearance, status, abilities, or achievements.', 'Kesombongan / kebanggaan diri yang berlebihan / kepamrihan.', 'He stated that a throne is not for personal vanity.'],
    [12, 'Subjugation', '/ˌsʌb.dʒʊˈɡeɪ.ʃən/', 'Noun', 'The act of conquering, defeating, or bringing someone under complete political or military control.', 'Penaklukan / penundukan / penindasan kekuasaan.', 'The local community resisted foreign subjugation.'],
    [13, 'Overflow', '/ˌoʊ.vəˈfloʊ/', 'Verb', 'To flow over the brim, edges, or limits because of excess liquid.', 'Meluap / memancar berlimpah-limpah.', 'The fresh springs overflowed, supplying water to thousands of villagers.'],
    [14, 'Takeaway', '/ˈteɪk.ə.weɪ/', 'Noun', 'A key fact, message, or moral point to be remembered from an event or story.', 'Pesan inti / pelajaran moral yang dipetik dari suatu peristiwa.', 'The primary takeaway of this legend is to lead with compassion and serve the weak.'],
    [15, 'Reconcile', '/ˈrek.ən.saɪl/', 'Verb', 'To restore friendly relations and settle differences between opposing parties.', 'Mendamaikan / mempertemukan dua pihak yang berselisih.', 'The canal effectively reconciled the two neighboring villages.'],
    [16, 'Benevolent', '/bɪˈnev.əl.ənt/', 'Adjective', 'Kind, generous, well-meaning, and actively dedicated to doing good for others.', 'Penuh kebajikan / suka menolong / berhati mulia dan penyayang kepada rakyat.', 'Kanjeng Sepuh was remembered as a benevolent leader who protected the vulnerable.']
  ];

  sheet.getRange(2, 1, data.length, headers.length).setValues(data);
  sheet.setColumnWidth(1, 40);   // No
  sheet.setColumnWidth(2, 120);  // Kata
  sheet.setColumnWidth(3, 150);  // Pronounsiasi
  sheet.setColumnWidth(4, 90);   // Jenis Kata
  sheet.setColumnWidth(5, 320);  // English Meaning
  sheet.setColumnWidth(6, 260);  // Arti ID
  sheet.setColumnWidth(7, 340);  // Contoh Kalimat

  // Alternating row colors
  for (var i = 2; i <= data.length + 1; i++) {
    var bg = (i % 2 === 0) ? '#e8eaf6' : '#ffffff';
    sheet.getRange(i, 1, 1, headers.length).setBackground(bg);
  }

  sheet.setFrozenRows(1);
  return sheet;
}

/**
 * Helper: Output JSON dengan MIME type application/json
 */
function createJsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
