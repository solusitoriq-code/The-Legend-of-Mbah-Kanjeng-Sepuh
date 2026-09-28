const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * Konversi satu file gambar ke format WebP.
 * @param {string} inputPath - Path file sumber (misal: assets/slides/slide_6.png)
 * @param {string} [outputPath] - Path tujuan (opsional, default: ganti ekstensi ke .webp)
 * @param {object} [options] - Opsi kompresi sharp webp (default: { quality: 80 })
 * @returns {Promise<{input: string, output: string, originalSize: number, newSize: number, ratio: string}>}
 */
async function convertToWebp(inputPath, outputPath, options = { quality: 80 }) {
  const resolvedInput = path.resolve(inputPath);
  if (!fs.existsSync(resolvedInput)) {
    throw new Error(`File tidak ditemukan: ${inputPath}`);
  }

  const resolvedOutput = outputPath
    ? path.resolve(outputPath)
    : resolvedInput.replace(path.extname(resolvedInput), '.webp');

  const originalSize = fs.statSync(resolvedInput).size;

  await sharp(resolvedInput)
    .webp(options)
    .toFile(resolvedOutput);

  const newSize = fs.statSync(resolvedOutput).size;
  const ratio = (((originalSize - newSize) / originalSize) * 100).toFixed(1);

  return {
    input: resolvedInput,
    output: resolvedOutput,
    originalSize,
    newSize,
    ratio: `${ratio}%`
  };
}

/**
 * Konversi direktori atau sekumpulan gambar ke WebP.
 * @param {string} dirPath - Direktori gambar
 * @param {object} [options] - Opsi: { quality: 80, overwrite: false }
 */
async function convertDirectory(dirPath = path.join(__dirname, '../assets/slides'), options = { quality: 80, overwrite: false }) {
  const targetDir = path.resolve(dirPath);
  if (!fs.existsSync(targetDir)) {
    throw new Error(`Direktori tidak ditemukan: ${dirPath}`);
  }

  const files = fs.readdirSync(targetDir);
  const imageFiles = files.filter(f => /\.(png|jpe?g)$/i.test(f));

  const results = [];
  for (const file of imageFiles) {
    const inputPath = path.join(targetDir, file);
    const outputPath = path.join(targetDir, file.replace(path.extname(file), '.webp'));

    if (!options.overwrite && fs.existsSync(outputPath)) {
      continue;
    }

    const res = await convertToWebp(inputPath, outputPath, { quality: options.quality || 80 });
    results.push(res);
  }

  return results;
}

// Eksekusi via CLI
if (require.main === module) {
  (async () => {
    try {
      const args = process.argv.slice(2);
      const target = args[0];

      if (target) {
        const resolved = path.resolve(target);
        const stat = fs.statSync(resolved);

        if (stat.isDirectory()) {
          console.log(`Memproses direktori: ${target}`);
          const results = await convertDirectory(resolved, { quality: 80, overwrite: true });
          console.log(`Selesai mengonversi ${results.length} gambar.`);
          results.forEach(r => {
            console.log(`- ${path.basename(r.input)} -> ${path.basename(r.output)} (${(r.originalSize / 1024).toFixed(1)} KB -> ${(r.newSize / 1024).toFixed(1)} KB, hemat ${r.ratio})`);
          });
        } else {
          console.log(`Memproses file: ${target}`);
          const res = await convertToWebp(resolved, null, { quality: 80 });
          console.log(`Berhasil dikonversi:`);
          console.log(`- Input : ${res.input} (${(res.originalSize / 1024).toFixed(1)} KB)`);
          console.log(`- Output: ${res.output} (${(res.newSize / 1024).toFixed(1)} KB)`);
          console.log(`- Efisiensi: hemat ${res.ratio}`);
        }
      } else {
        console.log(`Memeriksa dan mengonversi gambar di assets/slides...`);
        const results = await convertDirectory(path.join(__dirname, '../assets/slides'), { quality: 80, overwrite: false });
        if (results.length === 0) {
          console.log(`Semua gambar sudah memiliki versi WebP.`);
        } else {
          console.log(`Berhasil mengonversi ${results.length} gambar:`);
          results.forEach(r => {
            console.log(`- ${path.basename(r.input)} -> ${path.basename(r.output)} (${(r.originalSize / 1024).toFixed(1)} KB -> ${(r.newSize / 1024).toFixed(1)} KB, hemat ${r.ratio})`);
          });
        }
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  })();
}

module.exports = {
  convertToWebp,
  convertDirectory
};
