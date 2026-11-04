import PDFDocument from 'pdfkit';
import type { DocumentTable } from './documents';

const printable = (value: unknown) => String(value ?? '').replace(/[–—]/g, '-').replace(/\t/g, ' ');
export async function tablePdf(table: DocumentTable) {
  const doc = new PDFDocument({ size: 'A4', layout: table.headers.length <= 5 ? 'portrait' : 'landscape', margin: 36, bufferPages: true });
  const chunks: Buffer[] = [];
  const complete = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', chunk => chunks.push(chunk)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);
  });
  const left = 36, right = doc.page.width - 36, bottom = doc.page.height - 48, width = right - left;
  let y = 36;
  function pageTitle() {
    doc.fillColor('#111111').font('Helvetica-Bold').fontSize(10).text('SIA SMKN 2 MAGELANG', left, 36, { width });
    doc.fontSize(13).text(printable(table.title), left, 54, { width });
    y = doc.y + 14;
  }
  function wrap(value: unknown, cellWidth: number) {
    const lines: string[] = [];
    for (const paragraph of printable(value).split('\n')) {
      let line = '';
      for (const word of paragraph.split(/\s+/)) {
        if (line && doc.widthOfString(line + word) > cellWidth) { lines.push(line); line = ''; }
        for (const char of word) {
          if (doc.widthOfString(line + char) > cellWidth && line) { lines.push(line); line = ''; }
          line += char;
        }
        line += ' ';
      }
      lines.push(line.trimEnd());
    }
    return lines.length ? lines : [''];
  }
  function grid(headers: string[], data: unknown[][], weights?: number[]) {
    const sizes = weights || headers.map(h => h === 'No' ? .35 : /^(Nilai|Predikat)/.test(h) ? .65 : /Deskripsi/.test(h) ? 3 : /Nama|pelajaran|Mapel/.test(h) ? 2 : 1);
    const sum = sizes.reduce((a, b) => a + b, 0), widths = sizes.map(n => width * n / sum);
    const lineHeight = 12, padding = 6;
    function draw(lines: string[][], count: number, header: boolean) {
      const height = count * lineHeight + padding * 2;
      let x = left;
      lines.forEach((cell, i) => {
        doc.rect(x, y, widths[i], height).fillAndStroke(header ? '#e8ebef' : '#ffffff', '#a0a7b0');
        doc.fillColor('#111111').font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
        cell.forEach((line, n) => doc.text(line.trimEnd(), x + padding, y + padding + n * lineHeight, { width: widths[i] - padding * 2, lineBreak: false }));
        x += widths[i];
      });
      y += height;
    }
    function header() {
      doc.font('Helvetica-Bold').fontSize(8);
      const lines = headers.map((h, i) => wrap(h, widths[i] - padding * 2));
      draw(lines, Math.max(...lines.map(c => c.length)), true);
    }
    if (y > bottom - 80) { doc.addPage(); pageTitle(); }
    header();
    const records = data.length ? data : [headers.map((_, i) => i === 0 ? 'Belum ada data yang sesuai.' : '')];
    for (const row of records) {
      doc.font('Helvetica').fontSize(8);
      const lines = headers.map((_, i) => wrap(row[i], widths[i] - padding * 2));
      let offset = 0;
      const total = Math.max(...lines.map(c => c.length));
      while (offset < total) {
        let capacity = Math.floor((bottom - y - padding * 2) / lineHeight);
        if (capacity < 1 || offset === 0 && total <= 12 && total > capacity) {
          doc.addPage(); pageTitle(); header();
          capacity = Math.floor((bottom - y - padding * 2) / lineHeight);
        }
        const count = Math.min(total - offset, capacity);
        draw(lines.map(c => c.slice(offset, offset + count)), count, false);
        offset += count;
      }
    }
    y += 14;
  }
  pageTitle();
  if (table.metadata?.length) {
    doc.font('Helvetica').fontSize(9);
    table.metadata.forEach(line => { doc.text(printable(line), left, y, { width }); y = doc.y + 5; });
    y += 8;
  }
  if (table.layout === 'journal') {
    if (!table.data.length) grid(['Jurnal kelas'], [['Belum ada pertemuan pada rentang tanggal yang dipilih.']]);
    table.data.forEach((row, index) => {
      if (y > bottom - 100) { doc.addPage(); pageTitle(); }
      doc.fillColor('#111111').font('Helvetica-Bold').fontSize(10).text(`Pertemuan ${index + 1} - ${printable(row[0])} - ${printable(row[4])}`, left, y, { width });
      y = doc.y + 8;
      grid(['Keterangan', 'Isi jurnal'], table.headers.map((h, i) => [h, row[i]]), [1, 4]);
    });
  } else if (table.headers.length > 12) {
    // Wide attendance matrices retain student identity in every column group.
    const firstDate = table.headers.findIndex(h => /^\d{4}-\d{2}-\d{2}$/.test(h));
    const identityCount = firstDate > 0 ? firstDate : 2, groupSize = 12 - identityCount;
    for (let start = identityCount; start < table.headers.length; start += groupSize) {
      if (start > identityCount) { doc.addPage(); pageTitle(); }
      const indexes = [...Array.from({ length: identityCount }, (_, i) => i), ...Array.from({ length: Math.min(groupSize, table.headers.length - start) }, (_, i) => start + i)];
      grid(indexes.map(i => table.headers[i]), table.data.map(row => indexes.map(i => row[i])));
    }
  } else grid(table.headers, table.data);
  if (table.notes?.length) grid(['Keterangan laporan'], table.notes.map(note => [note]));
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    const savedBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.fillColor('#555555').font('Helvetica').fontSize(8).text(`Halaman ${i + 1} dari ${range.count}`, left, doc.page.height - 30, { width, align: 'right', lineBreak: false });
    doc.page.margins.bottom = savedBottom;
  }
  doc.end();
  return complete;
}
