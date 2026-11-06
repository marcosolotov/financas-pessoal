export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
export const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function pad(n) {
  return String(n).padStart(2, '0');
}

export function currentYM() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

// '2026-11' -> 'Novembro 2026'
export function ymLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return `${MONTHS[m - 1]} ${y}`;
}

export function ymShort(ym) {
  const [, m] = ym.split('-').map(Number);
  return MONTHS_SHORT[(m || 1) - 1];
}

export function addMonths(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function prevYM(ym) {
  return addMonths(ym, -1);
}
export function nextYM(ym) {
  return addMonths(ym, 1);
}

export function dateToYM(date) {
  return date.slice(0, 7);
}

export function formatDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  return `${dias[dt.getDay()]}, ${d} ${MONTHS_SHORT[m - 1]}`;
}