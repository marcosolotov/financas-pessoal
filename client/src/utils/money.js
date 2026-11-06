export function formatBRL(cents) {
  const n = Number(cents) || 0;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n / 100);
}

export function formatBRLCompact(cents) {
  const n = Number(cents) || 0;
  if (n === 0) return 'R$ 0';
  const abs = Math.abs(n / 100);
  if (abs >= 1000000) return `R$ ${(n / 100000000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} Mi`;
  if (abs >= 1000) return `R$ ${(n / 100000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return formatBRL(n);
}

// converte texto digitado "12,50" / "12.50" / "1200" -> centavos inteiros
export function parseBRLToCents(text) {
  if (text == null) return null;
  const s = String(text).trim().replace(/[R$\s.]/g, '').replace(',', '.');
  if (!s || !/^(\d+)(\.\d{1,2})?$/.test(s)) return null;
  const num = Math.round(Number(s) * 100);
  return Number.isInteger(num) && num >= 0 ? num : null;
}

// centavos -> localidade do input de dinheiro (ex.: "12,50")
export function centsToInput(cents) {
  const n = Number(cents) || 0;
  return (n / 100).toFixed(2).replace('.', ',');
}

// pede confirmação
export function confirmDialog(message) {
  return window.confirm(message);
}