'use strict';
const attendance = document.querySelector('[data-attendance-form]');
if (attendance) {
  const feedback = document.getElementById('attendance-feedback');
  const verified = document.getElementById('verified');
  const refresh = () => {
    const counts = {H: 0, S: 0, I: 0, A: 0, B: 0};
    attendance.querySelectorAll('.status-options input:checked').forEach(input => counts[input.value]++);
    for (const code of Object.keys(counts)) attendance.querySelector('[data-count="' + code + '"]').textContent = counts[code];
  };
  attendance.addEventListener('change', refresh);
  document.getElementById('student-search').addEventListener('input', event => {
    const query = event.target.value.trim().toLocaleLowerCase('id');
    attendance.querySelectorAll('[data-student]').forEach(card => card.hidden = !card.dataset.student.includes(query));
  });
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
