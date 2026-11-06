import { Router } from 'express';
import { db, normalizeRow, normalizeRows } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

function monthBounds(s) {
  const [y, m] = s.split('-').map(Number);
  return { start: `${s}-01`, end: `${y}-${String(m).padStart(2, '0')}-31` };
}
function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function sumTypeBefore(userId, type, day) {
  return Number(db.prepare(
    'SELECT COALESCE(SUM(value_cents),0) AS t FROM transactions WHERE user_id=? AND type=? AND date<?'
  ).get(userId, type, day).t);
}
function sumTypeBetween(userId, type, s, e) {
  return Number(db.prepare(
    'SELECT COALESCE(SUM(value_cents),0) AS t FROM transactions WHERE user_id=? AND type=? AND date>=? AND date<=?'
  ).get(userId, type, s, e).t);
}
function sumInvBefore(userId, kind, day) {
  return Number(db.prepare(
    'SELECT COALESCE(SUM(value_cents),0) AS t FROM investments WHERE user_id=? AND kind=? AND date<?'
  ).get(userId, kind, day).t);
}
function sumInvBetween(userId, kind, s, e) {
  return Number(db.prepare(
    'SELECT COALESCE(SUM(value_cents),0) AS t FROM investments WHERE user_id=? AND kind=? AND date>=? AND date<=?'
  ).get(userId, kind, s, e).t);
}

// GET /api/summary?month=YYYY-MM
router.get('/', (req, res) => {
  const month = req.query.month || currentMonth();
  if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'Mês inválido.' });
  const { start, end } = monthBounds(month);
  const user = normalizeRow(db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId));
  const startBalance = user.start_balance_cents;

  const prevIncome = sumTypeBefore(req.userId, 'income', start);
  const prevExpense = sumTypeBefore(req.userId, 'expense', start);
  const prevAporte = sumInvBefore(req.userId, 'aporte', start);
  const prevRend = sumInvBefore(req.userId, 'rendimento', start);

  const cashStart = startBalance + prevIncome - prevExpense - prevAporte;
  const investedStart = prevAporte + prevRend;

  const income = sumTypeBetween(req.userId, 'income', start, end);
  const expenses = sumTypeBetween(req.userId, 'expense', start, end);
  const aportes = sumInvBetween(req.userId, 'aporte', start, end);
  const rendimentos = sumInvBetween(req.userId, 'rendimento', start, end);

  const cashEnd = cashStart + income - expenses - aportes;
  const investedEnd = investedStart + aportes + rendimentos;

  res.json({
    month,
    saldoAnterior: cashStart + investedStart,
    saldoAtual: cashEnd + investedEnd,
    emCarteira: cashEnd,
    investido: investedEnd,
    entradas: income,
    saidas: expenses,
    investidoNoMes: { aportes, rendimentos, total: aportes + rendimentos }
  });
});

// GET /api/summary/trend?months=12 -> barras por mês
router.get('/trend', (req, res) => {
  const months = Math.min(36, Math.max(1, Number(req.query.months) || 12));
  const now = new Date();
  const labels = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const series = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const { start, end } = monthBounds(ym);
    series.push({
      month: ym,
      label: `${labels[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
      entradas: sumTypeBetween(req.userId, 'income', start, end),
      saidas: sumTypeBetween(req.userId, 'expense', start, end),
      investimentos: sumInvBetween(req.userId, 'aporte', start, end) + sumInvBetween(req.userId, 'rendimento', start, end)
    });
  }
  res.json({ series });
});

// GET /api/summary/breakdown?month=&type=expense -> pizza por categoria
router.get('/breakdown', (req, res) => {
  const type = req.query.type === 'income' ? 'income' : 'expense';
  const month = req.query.month || currentMonth();
  if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'Mês inválido.' });
  const { start, end } = monthBounds(month);
  const rows = normalizeRows(db.prepare(`
    SELECT COALESCE(c.id,0) AS category_id, COALESCE(c.name,'Sem categoria') AS name,
           COALESCE(c.color,'#8E8E93') AS color, SUM(t.value_cents) AS total
    FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = ? AND t.type = ? AND t.date >= ? AND t.date <= ?
    GROUP BY c.id, c.name, c.color
    ORDER BY total DESC`).all(req.userId, type, start, end));
  res.json({ breakdown: rows.map(r => ({ ...r, total: Number(r.total) })) });
});

export default router;