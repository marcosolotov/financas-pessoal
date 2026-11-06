import { Router } from 'express';
import { db, row, normalizeRow, normalizeRows } from '../db.js';
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
  const end = `${y}-${String(m).padStart(2, '0')}-31`;
  return { start, end };
}

// GET /api/investments?month=YYYY-MM&kind=aporte|rendimento
router.get('/', (req, res) => {
  const { month, kind } = req.query;
  let sql = 'SELECT * FROM investments WHERE user_id = ?';
  const params = [req.userId];
  if (kind) {
    if (!['aporte', 'rendimento'].includes(kind)) return res.status(400).json({ error: 'Tipo inválido.' });
    sql += ' AND kind = ?';
    params.push(kind);
  }
  if (month) {
    const { start, end } = monthBounds(month);
    sql += ' AND date >= ? AND date <= ?';
    params.push(start, end);
  }
  sql += ' ORDER BY date DESC, id DESC';
  res.json({ investments: normalizeRows(db.prepare(sql).all(...params)) });
});

// POST /api/investments
router.post('/', (req, res) => {
  const { name, kind, value_cents, date, notes } = req.body || {};
  if (!['aporte', 'rendimento'].includes(kind)) return res.status(400).json({ error: 'Tipo inválido.' });
  const nm = String(name || '').trim();
  if (!nm) return res.status(400).json({ error: 'Informe o nome do ativo.' });
  const value = centsOf(value_cents);
  if (value === null) return res.status(400).json({ error: 'Valor inválido.' });
  if (!DATE_RE.test(String(date || ''))) return res.status(400).json({ error: 'Data inválida.' });

  const info = db.prepare('INSERT INTO investments (user_id, name, kind, value_cents, date, notes) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.userId, nm, kind, value, String(date), String(notes || '').trim() || null);
  const inv = normalizeRow(row(db.prepare('SELECT * FROM investments WHERE id = ?'), Number(info.lastInsertRowid)));
  res.status(201).json({ investment: inv });
});

// PUT /api/investments/:id
router.put('/:id', (req, res) => {
  const inv = row(db.prepare('SELECT * FROM investments WHERE id = ? AND user_id = ?'), Number(req.params.id), req.userId);
  if (!inv) return res.status(404).json({ error: 'Investimento não encontrado.' });
  const body = req.body || {};
  const kind = body.kind ?? inv.kind;
  if (!['aporte', 'rendimento'].includes(kind)) return res.status(400).json({ error: 'Tipo inválido.' });
  const name = body.name !== undefined ? String(body.name).trim() : inv.name;
  if (!name) return res.status(400).json({ error: 'Nome inválido.' });
  const value = body.value_cents !== undefined ? centsOf(body.value_cents) : inv.value_cents;
  if (value === null) return res.status(400).json({ error: 'Valor inválido.' });
  const date = body.date ?? inv.date;
  if (!DATE_RE.test(String(date))) return res.status(400).json({ error: 'Data inválida.' });
  const notes = body.notes !== undefined ? String(body.notes).trim() : inv.notes;

  db.prepare('UPDATE investments SET name = ?, kind = ?, value_cents = ?, date = ?, notes = ? WHERE id = ?')
    .run(name, kind, value, String(date), notes || null, inv.id);
  res.json({ investment: normalizeRow(row(db.prepare('SELECT * FROM investments WHERE id = ?'), inv.id)) });
});

// DELETE /api/investments/:id
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM investments WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.userId);
  if (info.changes === 0) return res.status(404).json({ error: 'Investimento não encontrado.' });
  res.json({ ok: true });
});

export default router;