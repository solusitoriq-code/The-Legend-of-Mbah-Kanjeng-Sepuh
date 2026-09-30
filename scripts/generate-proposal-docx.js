import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  HeadingLevel,
  ShadingType
} from 'docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateDocx() {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch = 1440 twips
              right: 1440,
              bottom: 1440,
              left: 1440
            }
          }
        },
        children: [
          // Header / Judul Utama
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "PROPOSAL PENAWARAN PENGEMBANGAN",
                bold: true,
                size: 28, // 14pt
                font: "Calibri",
                color: "1E293B"
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: "MEDIA PEMBELAJARAN INTERAKTIF PWA (PROGRESSIVE WEB APP)",
                bold: true,
                size: 26, // 13pt
                font: "Calibri",
                color: "2563EB"
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 360 },
            children: [
              new TextRun({
                text: "Integrasi Evaluasi Diagnostik, Sumatif, dan Sinkronisasi Cloud Google Sheets",
                italics: true,
                size: 20, // 10pt
                font: "Calibri",
                color: "64748B"
              })
            ]
          }),

          // Metadata Surat
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: "Nomor", bold: true, size: 22, font: "Calibri" })] })]
                  }),
                  new TableCell({
                    width: { size: 85, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: ": 012/PNW-DEV/IX/2026", size: 22, font: "Calibri" })] })]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: "Lampiran", bold: true, size: 22, font: "Calibri" })] })]
                  }),
                  new TableCell({
                    width: { size: 85, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: ": 1 (Satu) Berkas Spesifikasi Teknis", size: 22, font: "Calibri" })] })]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: "Perihal", bold: true, size: 22, font: "Calibri" })] })]
                  }),
                  new TableCell({
                    width: { size: 85, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: ": Penawaran Pengembangan Aplikasi Media Pembelajaran Interaktif", bold: true, size: 22, font: "Calibri" })] })]
                  })
                ]
              })
            ]
          }),

          new Paragraph({ spacing: { before: 240, after: 120 }, children: [] }),

          // Tujuan Surat
          new Paragraph({
            spacing: { after: 40 },
            children: [new TextRun({ text: "Kepada Yth.", bold: true, size: 22, font: "Calibri" })]
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [new TextRun({ text: "Bapak/Ibu Guru Mata Pelajaran", bold: true, size: 22, font: "Calibri" })]
          }),
          new Paragraph({
            spacing: { after: 240 },
            children: [new TextRun({ text: "SMA Negeri di Jawa Timur", size: 22, font: "Calibri" })]
          }),

          // Pembuka
          new Paragraph({
            spacing: { after: 180 },
            children: [new TextRun({ text: "Dengan hormat,", size: 22, font: "Calibri" })]
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: "Sehubungan dengan kebutuhan media pembelajaran inovatif dan instrumen pengambilan data evaluasi siswa untuk pembelajaran di kelas, Penelitian Tindakan Kelas (PTK), maupun pemenuhan perangkat Uji Kinerja (UKin) dalam Program Pendidikan Profesi Guru (PPG), kami mengajukan penawaran pengembangan aplikasi ",
                size: 22,
                font: "Calibri"
              }),
              new TextRun({
                text: "Media Pembelajaran Interaktif PWA (Progressive Web App)",
                bold: true,
                size: 22,
                font: "Calibri"
              }),
              new TextRun({
                text: " dengan rincian spesifikasi teknis dan skema pembiayaan sebagai berikut:",
                size: 22,
                font: "Calibri"
              })
            ]
          }),

          // Bab I
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 120 },
            children: [
              new TextRun({
                text: "I. DESKRIPSI & KEUNGGULAN SISTEM",
                bold: true,
                size: 24,
                font: "Calibri",
                color: "1E293B"
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 160 },
            children: [
              new TextRun({
                text: "Aplikasi dikembangkan menggunakan standar teknologi modern berbasis Web PWA (dapat diakses langsung via link peramban di HP/laptop siswa maupun diinstal ke homescreen secara luring). Seluruh data hasil pengerjaan siswa terhubung secara otomatis ke Google Sheets pribadi milik guru tanpa biaya sewa server/database bulanan (zero operational cost).",
                size: 22,
                font: "Calibri"
              })
            ]
          }),

          // Fitur Utama
          ...[
            { num: "1. ", title: "Otentikasi & Validasi Siswa: ", desc: "Pengecekan nomor NISN mandiri sebelum siswa mulai mengakses materi." },
            { num: "2. ", title: "Evaluasi Diagnostik (Pretest): ", desc: "5 butir soal pilihan ganda untuk mengukur dan merekam kemampuan awal siswa sebelum pembelajaran." },
            { num: "3. ", title: "Materi Interaktif Multi-Slide: ", desc: "16 frame materi interaktif dilengkapi pemutar audio narasi, video pembelajaran, dan penampil 3D Augmented Reality (AR)." },
            { num: "4. ", title: "Navigasi Terpandu (Guided Navigation): ", desc: "Akses ke slide evaluasi terkunci otomatis sebelum siswa menyelesaikan seluruh materi (Slide 1–14)." },
            { num: "5. ", title: "Evaluasi Sumatif (Post-test Dinamis): ", desc: "15 butir soal kombinasi Pilihan Ganda (MCQ) dan Mencocokkan Pasangan (Tap-to-Pair Matching)." },
            { num: "6. ", title: "Sinkronisasi Google Sheets Real-Time: ", desc: "Nilai Pretest, Post-test, dan selisih peningkatan nilai (N-Gain) langsung terekap ke Google Spreadsheet guru secara otomatis." },
            { num: "7. ", title: "Papan Peringkat (Leaderboard): ", desc: "Tampilan skor interaktif untuk menumbuhkan motivasi dan kompetisi positif antar siswa." }
          ].map(f => new Paragraph({
            spacing: { after: 80 },
            indent: { left: 360 },
            children: [
              new TextRun({ text: f.num, bold: true, size: 22, font: "Calibri" }),
              new TextRun({ text: f.title, bold: true, size: 22, font: "Calibri" }),
              new TextRun({ text: f.desc, size: 22, font: "Calibri" })
            ]
          })),

          // Bab II
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({
                text: "II. RINCIAN BIAYA PENGEMBANGAN",
                bold: true,
                size: 24,
                font: "Calibri",
                color: "1E293B"
              })
            ]
          }),

          // Tabel Rincian Biaya
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
              left: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
              right: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" },
              insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" }
            },
            rows: [
              // Header
              new TableRow({
                tableHeader: true,
                children: [
                  new TableCell({
                    shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
                    width: { size: 10, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "No", bold: true, size: 22, font: "Calibri" })] })]
                  }),
                  new TableCell({
                    shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
                    width: { size: 55, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: "Komponen / Modul Pekerjaan", bold: true, size: 22, font: "Calibri" })] })]
                  }),
                  new TableCell({
                    shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
                    width: { size: 35, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: "Spesifikasi & Keterangan", bold: true, size: 22, font: "Calibri" })] })]
                  })
                ]
              }),
              // Row 1
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "1", size: 22, font: "Calibri" })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Front-End PWA Interaktif", bold: true, size: 22, font: "Calibri" })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "16 slide materi, responsif HP & Desktop, audio, video, 3D AR", size: 20, font: "Calibri" })] })] })
                ]
              }),
              // Row 2
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "2", size: 22, font: "Calibri" })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Engine Pretest & Post-test", bold: true, size: 22, font: "Calibri" })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "5 soal pretest, 15 soal posttest (MCQ & Tap-to-Pair), kalkulasi nilai", size: 20, font: "Calibri" })] })] })
                ]
              }),
              // Row 3
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "3", size: 22, font: "Calibri" })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Integrasi Google Sheets Cloud", bold: true, size: 22, font: "Calibri" })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Sinkronisasi otomatis ke Google Spreadsheet pribadi guru via Apps Script", size: 20, font: "Calibri" })] })] })
                ]
              }),
              // Row 4
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "4", size: 22, font: "Calibri" })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Deploy & Hosting Vercel (HTTPS)", bold: true, size: 22, font: "Calibri" })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Online resmi, cepat, aman, tanpa biaya langganan bulanan", size: 20, font: "Calibri" })] })] })
                ]
              }),
              // Row 5
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "5", size: 22, font: "Calibri" })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Panduan & Template Spreadsheet", bold: true, size: 22, font: "Calibri" })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Panduan pengoperasian guru dan template siap ekspor Excel untuk UKin/PPG", size: 20, font: "Calibri" })] })] })
                ]
              })
            ]
          }),

          new Paragraph({
            spacing: { before: 180, after: 80 },
            children: [
              new TextRun({
                text: "Total Biaya Pengembangan: Rp 950.000,- ",
                bold: true,
                size: 26,
                font: "Calibri",
                color: "16A34A"
              }),
              new TextRun({
                text: "(Sembilan Ratus Lima Puluh Ribu Rupiah)",
                italics: true,
                size: 22,
                font: "Calibri"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: "*Rentang fleksibel: Rp 900.000,- s.d. Rp 1.000.000,- disesuaikan dengan kebutuhan rombel kelas guru.",
                italics: true,
                size: 18,
                font: "Calibri",
                color: "64748B"
              })
            ]
          }),

          // Bab III
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 120 },
            children: [
              new TextRun({
                text: "III. KETENTUAN DAN BATASAN LAYANAN",
                bold: true,
                size: 24,
                font: "Calibri",
                color: "1E293B"
              })
            ]
          }),
          ...[
            "1. Ruang Lingkup Materi: Mencakup 1 mata pelajaran/bab pokok pembelajaran (maksimal 16 slide materi dan 20 butir soal evaluasi).",
            "2. Kapasitas Siswa: Mendukung 1–2 rombongan belajar (30–75 siswa aktif).",
            "3. Bantuan Revisi: Termasuk 2 (dua) kali revisi minor konten/kunci jawaban sebelum pelaksanaan simulasi atau ujian UKin/PPG.",
            "4. Waktu Pengerjaan: 5–7 hari kerja sejak data materi diserahkan secara lengkap."
          ].map(t => new Paragraph({
            spacing: { after: 80 },
            indent: { left: 360 },
            children: [new TextRun({ text: t, size: 22, font: "Calibri" })]
          })),

          // Bab IV
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 120 },
            children: [
              new TextRun({
                text: "IV. SKEMA PEMBAYARAN",
                bold: true,
                size: 24,
                font: "Calibri",
                color: "1E293B"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 80 },
            indent: { left: 360 },
            children: [
              new TextRun({ text: "• Tahap I (Uang Muka / DP 50%): ", bold: true, size: 22, font: "Calibri" }),
              new TextRun({ text: "Rp 475.000,- dibayarkan saat persetujuan proposal dan mulai pengerjaan.", size: 22, font: "Calibri" })
            ]
          }),
          new Paragraph({
            spacing: { after: 240 },
            indent: { left: 360 },
            children: [
              new TextRun({ text: "• Tahap II (Pelunasan 50%): ", bold: true, size: 22, font: "Calibri" }),
              new TextRun({ text: "Rp 475.000,- dibayarkan setelah seluruh modul terhubung dengan Google Sheets dan dinyatakan lolos uji coba.", size: 22, font: "Calibri" })
            ]
          }),

          // Bab V: Lembar Persetujuan
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 180 },
            children: [
              new TextRun({
                text: "V. LEMBAR PERSETUJUAN KERJASAMA",
                bold: true,
                size: 24,
                font: "Calibri",
                color: "1E293B"
              })
            ]
          }),

          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 160 },
            children: [
              new TextRun({ text: "Surabaya/Gresik, 26 September 2026", size: 22, font: "Calibri" })
            ]
          }),

          // Tabel Tanda Tangan
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Pihak Pengembang,", bold: true, size: 22, font: "Calibri" })] }),
                      new Paragraph({ spacing: { before: 1200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "( Tim Pengembang Sistem )", bold: true, underline: {}, size: 22, font: "Calibri" })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Pengembang Web Edukasi", size: 20, font: "Calibri", color: "64748B" })] })
                    ]
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Pihak Pemesan (Guru),", bold: true, size: 22, font: "Calibri" })] }),
                      new Paragraph({ spacing: { before: 1200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "( Bapak/Ibu Guru, S.Pd. )", bold: true, underline: {}, size: 22, font: "Calibri" })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "NIP. ...................................................", size: 20, font: "Calibri", color: "64748B" })] })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(__dirname, '..', 'PROPOSAL_PENAWARAN_MEDIA_PEMBELAJARAN.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log(`[DOCX] Berhasil membuat berkas: ${outputPath}`);
}

generateDocx().catch(err => {
  console.error('[DOCX] Gagal:', err);
  process.exit(1);
});
