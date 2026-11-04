// School years follow the July–June calendar in Asia/Jakarta.
export function currentSchoolYear(date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())) {
  const year = Number(date.slice(0, 4)), month = Number(date.slice(5, 7));
  const start = month >= 7 ? year : year - 1;
  return { tahun_ajaran: `${start}/${start + 1}`, semester: month >= 7 ? 'Ganjil' : 'Genap' };
}
