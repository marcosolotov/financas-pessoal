import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db, row, normalizeRow } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, start_balance_cents: u.start_balance_cents };
}

// PATCH /api/settings  { name?, new_password?, start_balance_cents? }
router.patch('/', (req, res) => {
  const { name, new_password, start_balance_cents } = req.body || {};
  const user = normalizeRow(row(db.prepare('SELECT * FROM users WHERE id = ?'), req.userId));
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  let nameFinal = user.name;
  let hashFinal = user.password_hash;

  if (name !== undefined) {
    if (String(name).trim().length < 2) return res.status(400).json({ error: 'Nome muito curto.' });
    nameFinal = String(name).trim();
  }
  if (new_password) {
    if (String(new_password).length < 6) return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
    hashFinal = bcrypt.hashSync(String(new_password), 10);
  }
  let startFinal = user.start_balance_cents;
  if (start_balance_cents !== undefined && start_balance_cents !== null && start_balance_cents !== '') {
    const n = Number(start_balance_cents);
    if (!Number.isInteger(n) || n < 0) return res.status(400).json({ error: 'Saldo inicial inválido.' });
    startFinal = n;
  }

  db.prepare('UPDATE users SET name = ?, password_hash = ?, start_balance_cents = ? WHERE id = ?')
    .run(nameFinal, hashFinal, startFinal, req.userId);
  const updated = normalizeRow(row(db.prepare('SELECT * FROM users WHERE id = ?'), req.userId));
  res.json({ user: publicUser(updated) });
});

// Backup individual da conta, sem hash de senha e sem dados de outros usuários.
router.get('/backup', (req, res) => {
  const user = normalizeRow(row(db.prepare(
    'SELECT id, name, email, start_balance_cents, created_at FROM users WHERE id = ?'
  ), req.userId));
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  const categories = db.prepare('SELECT id, type, name, color, icon, created_at FROM categories WHERE user_id = ? ORDER BY id').all(req.userId);
  const transactions = db.prepare('SELECT id, type, category_id, value_cents, date, description, created_at FROM transactions WHERE user_id = ? ORDER BY date, id').all(req.userId);
  const investments = db.prepare('SELECT id, name, kind, value_cents, date, notes, created_at FROM investments WHERE user_id = ? ORDER BY date, id').all(req.userId);

  res.json({
    format: 'controle-financeiro-backup',
    version: 1,
    exported_at: new Date().toISOString(),
    account: user,
    categories: normalizeRows(categories),
    transactions: normalizeRows(transactions),
    investments: normalizeRows(investments)
  });
});

// Planilha mensal consolidada para Excel, Numbers ou Google Sheets.
router.get('/report', (req, res) => {
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const firstDate = db.prepare(`
    SELECT MIN(date) AS first_date FROM (
      SELECT date FROM transactions WHERE user_id = ?
      UNION ALL
      SELECT date FROM investments WHERE user_id = ?
    )
  `).get(req.userId, req.userId).first_date;
  const firstMonth = firstDate ? firstDate.slice(0, 7) : currentMonth;
  const firstIndex = Number(firstMonth.slice(0, 4)) * 12 + Number(firstMonth.slice(5, 7)) - 1;
  const lastIndex = Number(currentMonth.slice(0, 4)) * 12 + Number(currentMonth.slice(5, 7)) - 1;

  const incomeRows = db.prepare(`
    SELECT substr(date, 1, 7) AS month, SUM(value_cents) AS total
    FROM transactions WHERE user_id = ? AND type = 'income' GROUP BY substr(date, 1, 7)
  `).all(req.userId);
  const investmentRows = db.prepare(`
    SELECT substr(date, 1, 7) AS month,
      SUM(CASE WHEN kind = 'aporte' THEN value_cents ELSE 0 END) AS aportes,
      SUM(CASE WHEN kind = 'rendimento' THEN value_cents ELSE 0 END) AS rendimentos
    FROM investments WHERE user_id = ? GROUP BY substr(date, 1, 7)
  `).all(req.userId);
  const incomesByMonth = new Map(incomeRows.map((r) => [r.month, Number(r.total)]));
  const investmentsByMonth = new Map(investmentRows.map((r) => [r.month, {
    aportes: Number(r.aportes),
    rendimentos: Number(r.rendimentos)
  }]));

  let investedBefore = 0;
  const rows = [];
  for (let index = firstIndex; index <= lastIndex; index++) {
    const year = Math.floor(index / 12);
    const monthNumber = index % 12 + 1;
    const month = `${year}-${String(monthNumber).padStart(2, '0')}`;
    const monthly = investmentsByMonth.get(month) || { aportes: 0, rendimentos: 0 };
    const investmentBeforeCents = investedBefore;
    investedBefore += monthly.aportes + monthly.rendimentos;
    rows.push({
      month,
      proventos_cents: incomesByMonth.get(month) || 0,
      investimento_anterior_cents: investmentBeforeCents,
      investimento_mes_cents: monthly.aportes,
      rendimento_mes_cents: monthly.rendimentos,
      investimento_atual_cents: investedBefore
    });
  }
  res.json({ rows });
});

export default router;
