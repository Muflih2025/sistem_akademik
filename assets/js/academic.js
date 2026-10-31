'use strict';
const attendance = document.querySelector('[data-attendance-form]');
if (attendance) {
  const feedback = document.getElementById('attendance-feedback');
  const verified = document.getElementById('verified');
  const cards = [...attendance.querySelectorAll('[data-student]')];
  const search = document.getElementById('student-search');
  const sizeSelect = document.getElementById('attendance-page-size');
  const range = document.getElementById('attendance-page-range');
  const pager = document.getElementById('attendance-page-buttons');
  let page = 1;
  const renderPage = () => {
    const query = search.value.trim().toLocaleLowerCase('id');
    const matching = cards.filter(card => card.dataset.student.includes(query));
    const size = Number(sizeSelect.value);
    const pages = Math.max(1, Math.ceil(matching.length / size));
    page = Math.max(1, Math.min(page, pages));
    const offset = (page - 1) * size;
    const visible = new Set(matching.slice(offset, offset + size));
    // Keep every enabled input inside the form: submitting always saves the
    // complete roster, including unsaved edits on other pages/search results.
    cards.forEach(card => { card.hidden = !visible.has(card); });
    range.textContent = `Menampilkan ${matching.length ? offset + 1 : 0}–${Math.min(offset + size, matching.length)} dari ${matching.length} siswa`;
    pager.replaceChildren();
    const button = (target, text, label, disabled = false, current = false) => {
      const el = document.createElement('button');
      el.type = 'button'; el.className = 'page-link' + (current ? ' current' : '') + (disabled ? ' disabled' : '');
      el.textContent = text; el.setAttribute('aria-label', label);
      el.disabled = disabled; el.dataset.studentPage = String(target);
      if (current) el.setAttribute('aria-current', 'page');
      pager.append(el);
    };
    button(1, '«', 'Halaman siswa pertama', page === 1);
    button(page - 1, '‹', 'Siswa sebelumnya', page === 1);
    const numbers = new Set([1, pages]);
    for (let n = Math.max(1, page - 2); n <= Math.min(pages, page + 2); n++) numbers.add(n);
    let previous = 0;
    [...numbers].sort((a, b) => a - b).forEach(n => {
      if (n - previous > 1) { const dots = document.createElement('span'); dots.className = 'page-ellipsis'; dots.textContent = '…'; pager.append(dots); }
      button(n, String(n), 'Halaman siswa ' + n, false, n === page); previous = n;
    });
    button(page + 1, '›', 'Siswa berikutnya', page === pages);
    button(pages, '»', 'Halaman siswa terakhir', page === pages);
  };
  const refresh = () => {
    const counts = {H: 0, S: 0, I: 0, A: 0, B: 0};
    attendance.querySelectorAll('.status-options input:checked').forEach(input => counts[input.value]++);
    for (const code of Object.keys(counts)) attendance.querySelector('[data-count="' + code + '"]').textContent = counts[code];
  };
  attendance.addEventListener('change', refresh);
  search.addEventListener('input', () => { page = 1; renderPage(); });
  sizeSelect.addEventListener('change', () => { page = 1; renderPage(); });
  pager.addEventListener('click', event => {
    const target = event.target.closest('button[data-student-page]');
    if (!target || target.disabled) return;
    page = Number(target.dataset.studentPage); renderPage();
    document.querySelector('.attendance-page-tools').scrollIntoView({block: 'start'});
  });
  attendance.querySelectorAll('[data-attendance-pagination]').forEach(el => { el.hidden = false; });
  renderPage();
  document.getElementById('all-present').addEventListener('click', () => {
    if (!verified.checked) { feedback.textContent = 'Centang konfirmasi pemeriksaan kehadiran terlebih dahulu.'; verified.focus(); return; }
    // All roster members, including cards temporarily hidden by search.
    attendance.querySelectorAll('.status-options input[value="H"]').forEach(input => input.checked = true);
    feedback.textContent = 'Semua siswa ditandai Hadir. Ubah siswa yang sakit, izin, alpa, atau belum dikonfirmasi sebelum menyimpan.';
    refresh();
  });
}
document.querySelectorAll('form[method="post"]').forEach(form => {
  form.addEventListener('submit', () => {
    const button = form.querySelector('button[type="submit"],button.save-button');
    if (button && !button.name) { button.disabled = true; button.textContent = 'Menyimpan…'; }
    form.setAttribute('aria-busy', 'true');
  });
});
document.querySelectorAll('[data-print]').forEach(button => button.addEventListener('click', () => window.print()));

const bellEditor = document.querySelector('[data-bell-editor]');
if (bellEditor) {
  const list = bellEditor.querySelector('[data-bell-rows]');
  const renumber = () => list.querySelectorAll('.bell-edit-row').forEach((row, i) => {
    row.querySelector('legend').textContent = 'Baris ' + (i + 1);
    row.querySelectorAll('[name]').forEach(input => input.name = input.name.replace(/^slots\[\d+\]/, 'slots[' + i + ']'));
  });
  bellEditor.addEventListener('click', event => {
    const remove = event.target.closest('[data-remove-bell]');
    if (remove && list.children.length > 1) { remove.closest('.bell-edit-row').remove(); renumber(); }
    if (event.target.closest('[data-add-bell]') && list.children.length < 40) {
      const row = list.firstElementChild.cloneNode(true);
      row.querySelectorAll('input').forEach(input => input.value = '');
      list.append(row); renumber(); row.querySelector('input').focus();
    }
  });
}
