const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// 1. Data Siswa & NISN
const dataSiswa = [
  { NISN: '0081234501', Nama: 'Ahmad Fauzi', Kelas: 'X-1', Status: 'Aktif' },
  { NISN: '0081234502', Nama: 'Bunga Citra Lestari', Kelas: 'X-1', Status: 'Aktif' },
  { NISN: '0081234503', Nama: 'Dimas Aditya', Kelas: 'X-1', Status: 'Aktif' },
  { NISN: '0081234504', Nama: 'Eka Nurhaliza', Kelas: 'X-2', Status: 'Aktif' },
  { NISN: '0081234505', Nama: 'Fajar Pratama', Kelas: 'X-2', Status: 'Aktif' },
  { NISN: '0081234506', Nama: 'Gita Rahmawati', Kelas: 'X-2', Status: 'Aktif' },
  { NISN: '0081234507', Nama: 'Hafiz Ramadhan', Kelas: 'X-3', Status: 'Aktif' },
  { NISN: '0081234508', Nama: 'Indah Permata', Kelas: 'X-3', Status: 'Aktif' },
  { NISN: '0081234509', Nama: 'Joko Wicaksono', Kelas: 'X-3', Status: 'Aktif' },
  { NISN: '0081234510', Nama: 'Kartika Sari', Kelas: 'X-3', Status: 'Aktif' }
];

// 2. Data Soal Pretest (5 Pilihan Ganda)
const soalPretest = [
  {
    ID: 1,
    Pertanyaan: 'Apa istilah untuk batuan cair pijar yang masih tersimpan di dalam perut bumi sebelum erupsi?',
    Opsi_A: 'Lava',
    Opsi_B: 'Magma',
    Opsi_C: 'Lahar Dingin',
    Opsi_D: 'Abu Vulkanik',
    Kunci: 'B',
    Pembahasan: 'Magma adalah batuan cair dan sangat panas di dalam mantel atau kerak bumi. Setelah keluar ke permukaan, batuan tersebut dinamakan lava.'
  },
  {
    ID: 2,
    Pertanyaan: 'Siapakah nama adipati yang memimpin wilayah Sidayu Gresik pada abad ke-19 yang dikenal sebagai Mbah Kanjeng Sepuh?',
    Opsi_A: 'Raden Patah',
    Opsi_B: 'Sunan Giri',
    Opsi_C: 'Raden Adipati Suryodiningrat',
    Opsi_D: 'Tumenggung Surabayan',
    Kunci: 'C',
    Pembahasan: 'Raden Adipati Suryodiningrat adalah bupati/adipati Sidayu yang arif, bijaksana, dan dikenal oleh masyarakat dengan julukan Mbah Kanjeng Sepuh.'
  },
  {
    ID: 3,
    Pertanyaan: 'Salah satu manfaat utama tanah di sekitar lereng gunung berapi setelah letusan mereda adalah...',
    Opsi_A: 'Menjadi sangat subur karena kaya unsur hara mineral vulkanik',
    Opsi_B: 'Mengandung kadar garam tinggi yang mematikan hama',
    Opsi_C: 'Menjadi padat dan tidak dapat ditembus akar tanaman',
    Opsi_D: 'Mengeringkan sumber mata air permukaan',
    Kunci: 'A',
    Pembahasan: 'Abu vulkanik hasil letusan gunung berapi mengandung berbagai mineral penting yang dalam jangka waktu tertentu membuat tanah pertanian sangat subur.'
  },
  {
    ID: 4,
    Pertanyaan: 'Pada struktur teks naratif (Narrative Text), bagian yang memperkenalkan tokoh, latar tempat, dan waktu disebut...',
    Opsi_A: 'Complication',
    Opsi_B: 'Resolution',
    Opsi_C: 'Orientation',
    Opsi_D: 'Coda',
    Kunci: 'C',
    Pembahasan: 'Orientation adalah bagian pembuka narasi yang berfungsi mengenalkan siapa tokohnya, di mana tempatnya, dan kapan cerita berlangsung.'
  },
  {
    ID: 5,
    Pertanyaan: 'Proyek monumental yang dibangun oleh Raden Adipati Suryodiningrat untuk mengatasi kekeringan dan memajukan pertanian di Sidayu adalah...',
    Opsi_A: 'Saluran Irigasi dan Waduk Sidayu',
    Opsi_B: 'Benteng Pertahanan Laut',
    Opsi_C: 'Pelabuhan Niaga Samudera',
    Opsi_D: 'Jalur Kereta Api Uap',
    Kunci: 'A',
    Pembahasan: 'Mbah Kanjeng Sepuh memprakarsai pembangunan saluran irigasi dan sistem pengairan air untuk menyelamatkan sawah rakyat dari bencana kekeringan.'
  }
];

// 3. Data Soal Post-test (15 Soal: 10 MCQ & 5 Matching)
const soalPosttest = [
  // --- 10 Soal Pilihan Ganda (MCQ) ---
  {
    ID: 1,
    Tipe: 'mcq',
    Pertanyaan: 'Cairan panas dari mantel bumi yang berhasil keluar dan mengalir di permukaan lereng gunung disebut...',
    Opsi_A: 'Lahar Hujan',
    Opsi_B: 'Lava',
    Opsi_C: 'Belerang',
    Opsi_D: 'Geiser',
    Kunci: 'B',
    Pasangan_Kiri: '',
    Pasangan_Kanan: '',
    Pembahasan: 'Lava merupakan magma yang telah keluar ke permukaan bumi saat erupsi terjadi.'
  },
  {
    ID: 2,
    Tipe: 'mcq',
    Pertanyaan: 'Energi ramah lingkungan terbarukan yang memanfaatkan uap panas dari reservoir vulkanik disebut energi...',
    Opsi_A: 'Biomassa',
    Opsi_B: 'Pembangkit Nuklir',
    Opsi_C: 'Geotermal (Panas Bumi)',
    Opsi_D: 'Hidroelektrik',
    Kunci: 'C',
    Pasangan_Kiri: '',
    Pasangan_Kanan: '',
    Pembahasan: 'Energi geotermal memanfaatkan uap panas bumi dari aktivitas vulkanik untuk menggerakkan turbin penghasil listrik.'
  },
  {
    ID: 3,
    Tipe: 'mcq',
    Pertanyaan: 'Awan panas berbahaya bersuhu ratusan derajat Celsius yang meluncur cepat menuruni lereng gunung dikenal di Jawa dengan istilah...',
    Opsi_A: 'Hujan Asam',
    Opsi_B: 'Wedhus Gembel (Pyroclastic Flow)',
    Opsi_C: 'Angin Kumbang',
    Opsi_D: 'Gas Fumarol',
    Kunci: 'B',
    Pasangan_Kiri: '',
    Pasangan_Kanan: '',
    Pembahasan: 'Wedhus gembel atau awan panas guguran adalah suspensi pekat gas panas, abu, dan bebatuan piroklastik yang sangat mematikan.'
  },
  {
    ID: 4,
    Tipe: 'mcq',
    Pertanyaan: 'Mengapa wilayah kepulauan Indonesia memiliki banyak sekali gunung api aktif?',
    Opsi_A: 'Karena terletak tepat di jalur Cincin Api Pasifik (Ring of Fire)',
    Opsi_B: 'Karena beriklim tropis basah dengan curah hujan tinggi',
    Opsi_C: 'Karena berada di tengah pertemuan dua samudera besar',
    Opsi_D: 'Karena dilewati garis khatulistiwa',
    Kunci: 'A',
    Pasangan_Kiri: '',
    Pasangan_Kanan: '',
    Pembahasan: 'Indonesia berada pada pertemuan tiga lempeng tektonik aktif dan cincin sabuk vulkanik Pasifik (Ring of Fire).'
  },
  {
    ID: 5,
    Tipe: 'mcq',
    Pertanyaan: 'Alat pelindung diri utama yang wajib dikenakan warga saat terjadi erupsi hujan abu vulkanik adalah...',
    Opsi_A: 'Payung dan mantel tebal',
    Opsi_B: 'Masker hidung/mulut dan kacamata pelindung tertutup',
    Opsi_C: 'Jas hujan dan sepatu bot karet',
    Opsi_D: 'Pelampung keselamatan',
    Kunci: 'B',
    Pasangan_Kiri: '',
    Pasangan_Kanan: '',
    Pembahasan: 'Abu vulkanik tersusun atas silika mikro tajam. Masker dan kacamata mencegah ISPA dan iritasi kornea mata.'
  },
  {
    ID: 6,
    Tipe: 'mcq',
    Pertanyaan: 'Batu beku ringan yang berpori-pori banyak dan dapat mengapung di atas permukaan air adalah...',
    Opsi_A: 'Batu Granit',
    Opsi_B: 'Batu Basalt',
    Opsi_C: 'Batu Apung (Pumice)',
    Opsi_D: 'Batu Obsidian',
    Kunci: 'C',
    Pasangan_Kiri: '',
    Pasangan_Kanan: '',
    Pembahasan: 'Batu apung terbentuk dari pendinginan cepat lava yang kaya gas sehingga gelembung gas terjebak membentuk rongga.'
  },
  {
    ID: 7,
    Tipe: 'mcq',
    Pertanyaan: 'Dalam teks naratif, tahapan kemunculan krisis atau konflik yang harus dihadapi tokoh utama disebut...',
    Opsi_A: 'Orientation',
    Opsi_B: 'Complication',
    Opsi_C: 'Resolution',
    Opsi_D: 'Reorientation',
    Kunci: 'B',
    Pasangan_Kiri: '',
    Pasangan_Kanan: '',
    Pembahasan: 'Complication memuat rangkaian peristiwa krisis, rintangan, atau konflik utama cerita.'
  },
  {
    ID: 8,
    Tipe: 'mcq',
    Pertanyaan: 'Apa bentuk lampau (Past Tense / Verb 2) dari kata kerja "Lead" (memimpin)?',
    Opsi_A: 'Leaded',
    Opsi_B: 'Led',
    Opsi_C: 'Leader',
    Opsi_D: 'Leading',
    Kunci: 'B',
    Pasangan_Kiri: '',
    Pasangan_Kanan: '',
    Pembahasan: 'Bentuk irregular past tense dari Lead adalah Led.'
  },
  {
    ID: 9,
    Tipe: 'mcq',
    Pertanyaan: 'Sikap keteladanan yang paling menonjol dari figur Raden Adipati Suryodiningrat bagi generasi muda adalah...',
    Opsi_A: 'Mengutamakan kepentingan rakyat di atas kepentingan pribadi',
    Opsi_B: 'Menyerah tanpa syarat kepada kekuatan kolonial',
    Opsi_C: 'Menutup diri dari perkembangan peradaban luar',
    Opsi_D: 'Mengumpulkan kekayaan demi keluarga istana',
    Kunci: 'A',
    Pasangan_Kiri: '',
    Pasangan_Kanan: '',
    Pembahasan: 'Mbah Kanjeng Sepuh dikenal adil, berani berdiplomasi demi rakyat, dan tulus membangun infrastruktur kesejahteraan masyarakat.'
  },
  {
    ID: 10,
    Tipe: 'mcq',
    Pertanyaan: 'Bagian akhir teks naratif yang berisi penyelesaian terhadap tantangan dan pemecahan masalah disebut...',
    Opsi_A: 'Orientation',
    Opsi_B: 'Complication',
    Opsi_C: 'Resolution',
    Opsi_D: 'Abstract',
    Kunci: 'C',
    Pasangan_Kiri: '',
    Pasangan_Kanan: '',
    Pembahasan: 'Resolution memberikan jalan keluar atau penyelesaian dari konflik yang terjadi pada babak complication.'
  },

  // --- 5 Soal Mencocokkan Kata/Kalimat (Matching) ---
  {
    ID: 11,
    Tipe: 'matching',
    Pertanyaan: 'Cocokkan istilah vulkanologi berikut dengan pengertiannya yang tepat!',
    Opsi_A: '',
    Opsi_B: '',
    Opsi_C: '',
    Opsi_D: '',
    Kunci: '',
    Pasangan_Kiri: 'Magma|Lava|Kawah|Fumarol',
    Pasangan_Kanan: 'Batuan cair di dalam perut bumi|Batuan cair yang keluar ke lereng gunung|Lubang depresi tempat keluarnya erupsi|Lubang semburan gas dan uap belerang',
    Pembahasan: 'Magma (bawah tanah), Lava (permukaan lereng), Kawah (lubang letusan), Fumarol (celah uap/gas).'
  },
  {
    ID: 12,
    Tipe: 'matching',
    Pertanyaan: 'Pasangkan struktur teks naratif dengan fungsi utamanya dalam cerita!',
    Opsi_A: '',
    Opsi_B: '',
    Opsi_C: '',
    Opsi_D: '',
    Kunci: '',
    Pasangan_Kiri: 'Orientation|Complication|Resolution|Coda',
    Pasangan_Kanan: 'Mengenalkan tokoh waktu dan tempat|Memunculkan konflik atau krisis cerita|Menyelesaikan masalah yang dihadapi tokoh|Pesan moral dan nilai keteladanan',
    Pembahasan: 'Empat elemen inti teks naratif: Orientation, Complication, Resolution, dan Coda.'
  },
  {
    ID: 13,
    Tipe: 'matching',
    Pertanyaan: 'Pasangkan kata kerja present (V1) dengan bentuk past tense (V2) yang tepat!',
    Opsi_A: '',
    Opsi_B: '',
    Opsi_C: '',
    Opsi_D: '',
    Kunci: '',
    Pasangan_Kiri: 'Build|Bring|Protect|Erupt',
    Pasangan_Kanan: 'Built|Brought|Protected|Erupted',
    Pembahasan: 'Build -> Built (irregular), Bring -> Brought (irregular), Protect -> Protected (regular), Erupt -> Erupted (regular).'
  },
  {
    ID: 14,
    Tipe: 'matching',
    Pertanyaan: 'Pasangkan material vulkanik dengan manfaat ekonomis yang dihasilkannya!',
    Opsi_A: '',
    Opsi_B: '',
    Opsi_C: '',
    Opsi_D: '',
    Kunci: '',
    Pasangan_Kiri: 'Abu Vulkanik|Belerang Padat|Mata Air Panas Geotermal|Batu Pasir & Kerikil',
    Pasangan_Kanan: 'Pupuk alami penyubur tanah pertanian|Bahan baku obat salep dan industri kimia|Wisata pemandian dan energi listrik ramah lingkungan|Bahan baku konstruksi bangunan jalan dan rumah',
    Pembahasan: 'Setiap produk letusan gunung berapi membawa berkah sumber daya alam yang melimpah bagi peradaban sekitarnya.'
  },
  {
    ID: 15,
    Tipe: 'matching',
    Pertanyaan: 'Cocokkan peran tokoh/peristiwa sejarah dengan deskripsi faktualnya!',
    Opsi_A: '',
    Opsi_B: '',
    Opsi_C: '',
    Opsi_D: '',
    Kunci: '',
    Pasangan_Kiri: 'Mbah Kanjeng Sepuh|Kadipaten Sidayu|Saluran Irigasi|Tindakan Mitigasi Bencana',
    Pasangan_Kanan: 'Gelar kehormatan Raden Adipati Suryodiningrat|Pusat pemerintahan historis di pesisir Gresik|Infrastruktur air penyelamat panen pertanian warga|Kesiapsiagaan memakai masker saat terjadi erupsi',
    Pembahasan: 'Nilai sejarah kepemimpinan di Sidayu berpadu dengan ketangguhan mitigasi lingkungan warga.'
  }
];

// 4. Data Leaderboard Awal (Mock Initial Ranks)
const leaderboard = [
  { Timestamp: '2026-09-26 14:10', NISN: '0081234502', Nama: 'Bunga Citra Lestari', Nilai_Pretest: 60, Nilai_Posttest: 100, Total_Skor: 100 },
  { Timestamp: '2026-09-26 14:15', NISN: '0081234501', Nama: 'Ahmad Fauzi', Nilai_Pretest: 40, Nilai_Posttest: 93, Total_Skor: 93 },
  { Timestamp: '2026-09-26 14:22', NISN: '0081234507', Nama: 'Hafiz Ramadhan', Nilai_Pretest: 60, Nilai_Posttest: 87, Total_Skor: 87 },
  { Timestamp: '2026-09-26 14:30', NISN: '0081234504', Nama: 'Eka Nurhaliza', Nilai_Pretest: 20, Nilai_Posttest: 80, Total_Skor: 80 },
  { Timestamp: '2026-09-26 14:35', NISN: '0081234505', Nama: 'Fajar Pratama', Nilai_Pretest: 40, Nilai_Posttest: 73, Total_Skor: 73 }
];

// Buat direktori data jika belum ada di root proyek
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Buat Workbook Excel
const wb = XLSX.utils.book_new();

// Buat Sheet untuk masing-masing dataset
const wsSiswa = XLSX.utils.json_to_sheet(dataSiswa);
const wsPretest = XLSX.utils.json_to_sheet(soalPretest);
const wsPosttest = XLSX.utils.json_to_sheet(soalPosttest);
const wsLeaderboard = XLSX.utils.json_to_sheet(leaderboard);

XLSX.utils.book_append_sheet(wb, wsSiswa, 'Data_Siswa');
XLSX.utils.book_append_sheet(wb, wsPretest, 'Soal_Pretest');
XLSX.utils.book_append_sheet(wb, wsPosttest, 'Soal_Posttest');
XLSX.utils.book_append_sheet(wb, wsLeaderboard, 'Leaderboard');

// Simpan berkas XLSX
const xlsxPath = path.join(dataDir, 'materi_evaluasi.xlsx');
XLSX.writeFile(wb, xlsxPath);
console.log(`[OK] Berkas Excel tersimpan di: ${xlsxPath}`);

// Simpan juga versi JSON langsung agar dapat di-fetch instan oleh frontend tanpa overhead parsing biner di browser
const jsonBundle = {
  dataSiswa,
  soalPretest,
  soalPosttest,
  leaderboard
};

const jsonPath = path.join(dataDir, 'materi_evaluasi.json');
fs.writeFileSync(jsonPath, JSON.stringify(jsonBundle, null, 2), 'utf-8');
console.log(`[OK] Berkas JSON tersimpan di: ${jsonPath}`);
