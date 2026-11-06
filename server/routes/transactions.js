import { Router } from 'express';
import { db, row, normalizeRow, normalizeRows, toCents } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Valor em centavos (inteiro positivo)
function centsOf(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function monthBounds(s) {
  const [y, m] = s.split('-').map(Number);
  const start = `${s}-01`;
  const end = `${y}-${String(m).padStart(2, '0')}-31`; // comparação lexical suficiente p/ intervalo
  return { start, end };
}

// GET /api/transactions?type=&month=YYYY-MM&category_id=
router.get('/', (req, res) => {
  const { type, month, category_id } = req.query;
  let sql = `
    SELECT t.*, c.name AS category_name, c.color AS category_color
    FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = ?`;
  const params = [req.userId];
  if (type) {
    if (!['income', 'expense'].includes(type)) return res.status(400).json({ error: 'Tipo inválido.' });
    sql += ' AND t.type = ?';
    params.push(type);
  }
  if (month) {
    const { start, end } = monthBounds(month);
    sql += ' AND t.date >= ? AND t.date <= ?';
    params.push(start, end);
  }
  if (category_id) {
    sql += ' AND t.category_id = ?';
    params.push(Number(category_id));
  }
  sql += ' ORDER BY t.date DESC, t.id DESC';
  res.json({ transactions: normalizeRows(db.prepare(sql).all(...params)) });
});

// POST /api/transactions
router.post('/', (req, res) => {
  const { type, category_id, value_cents, date, description } = req.body || {};
  if (!['income', 'expense'].includes(type)) return res.status(400).json({ error: 'Tipo inválido.' });
  const value = centsOf(value_cents);
  if (value === null) return res.status(400).json({ error: 'Valor inválido.' });
  if (!DATE_RE.test(String(date || ''))) return res.status(400).json({ error: 'Data inválida.' });

  let catId = null;
  if (category_id) {
    const cat = row(db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ? AND type = ?'),
      Number(category_id), req.userId, type);
    if (!cat) return res.status(400).json({ error: 'Categoria inválida.' });
    catId = cat.id;
  }

  const info = db.prepare('INSERT INTO transactions (user_id, type, category_id, value_cents, date, description) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.userId, type, catId, value, String(date), String(description || '').trim() || null);
  const tx = normalizeRow(row(db.prepare(`
    SELECT t.*, c.name AS category_name, c.color AS category_color
    FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.id = ?`), Number(info.lastInsertRowid)));
  res.status(201).json({ transaction: tx });
});

// PUT /api/transactions/:id
router.put('/:id', (req, res) => {
  const tx = row(db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?'), Number(req.params.id), req.userId);
  if (!tx) return res.status(404).json({ error: 'Movimentação não encontrada.' });
  const body = req.body || {};

  const type = body.type ?? tx.type;
  if (!['income', 'expense'].includes(type)) return res.status(400).json({ error: 'Tipo inválido.' });

  const value = body.value_cents !== undefined ? centsOf(body.value_cents) : tx.value_cents;
  if (value === null) return res.status(400).json({ error: 'Valor inválido.' });

  const date = body.date ?? tx.date;
  if (!DATE_RE.test(String(date))) return res.status(400).json({ error: 'Data inválida.' });

  let catId = tx.category_id;
  if (body.category_id !== undefined) {
    if (body.category_id === null || body.category_id === '') {
      catId = null;
    } else {
      const cat = row(db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ? AND type = ?'),
        Number(body.category_id), req.userId, type);
      if (!cat) return res.status(400).json({ error: 'Categoria inválida.' });
      catId = cat.id;
    }
  }

  const description = body.description !== undefined ? String(body.description).trim() : tx.description;
  db.prepare('UPDATE transactions SET type = ?, category_id = ?, value_cents = ?, date = ?, description = ? WHERE id = ?')
    .run(type, catId, value, String(date), description || null, tx.id);
  const updated = normalizeRow(row(db.prepare(`
    SELECT t.*, c.name AS category_name, c.color AS category_color
    FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.id = ?`), tx.id));
  res.json({ transaction: updated });
});

// DELETE /api/transactions/:id
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.userId);
  if (info.changes === 0) return res.status(404).json({ error: 'Movimentação não encontrada.' });
  res.json({ ok: true });
});

export default router;