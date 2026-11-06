import { Router } from 'express';
import { db, row, normalizeRow, normalizeRows } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/categories?type=income|expense
router.get('/', (req, res) => {
  const type = req.query.type;
  if (type && !['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'Tipo inválido.' });
  }
  const rows = type
    ? db.prepare('SELECT * FROM categories WHERE user_id = ? AND type = ? ORDER BY name COLLATE NOCASE').all(req.userId, type)
    : db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY type, name COLLATE NOCASE').all(req.userId);
  res.json({ categories: normalizeRows(rows) });
});

// POST /api/categories
router.post('/', (req, res) => {
  const { type, name, color, icon } = req.body || {};
  if (!['income', 'expense'].includes(type)) return res.status(400).json({ error: 'Tipo inválido.' });
  const nm = String(name || '').trim();
  if (!nm) return res.status(400).json({ error: 'Informe o nome da categoria.' });
  const col = /^#[0-9a-fA-F]{6}$/.test(color || '') ? color : '#8E8E93';

  const exists = row(db.prepare('SELECT id FROM categories WHERE user_id = ? AND type = ? AND lower(name)=lower(?)'), req.userId, type, nm);
  if (exists) return res.status(409).json({ error: 'Categoria já existe.' });

  const info = db.prepare('INSERT INTO categories (user_id, type, name, color, icon) VALUES (?, ?, ?, ?, ?)')
    .run(req.userId, type, nm, col, icon || null);
  const cat = normalizeRow(row(db.prepare('SELECT * FROM categories WHERE id = ?'), Number(info.lastInsertRowid)));
  res.status(201).json({ category: cat });
});

// PUT /api/categories/:id
router.put('/:id', (req, res) => {
  const cat = row(db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?'), Number(req.params.id), req.userId);
  if (!cat) return res.status(404).json({ error: 'Categoria não encontrada.' });
  const { name, color, icon } = req.body || {};
  const nm = name !== undefined ? String(name).trim() : cat.name;
  if (!nm) return res.status(400).json({ error: 'Nome inválido.' });
  const col = /^#[0-9a-fA-F]{6}$/.test(color || '') ? color : cat.color;
  const ic = icon !== undefined ? icon : cat.icon;
  db.prepare('UPDATE categories SET name = ?, color = ?, icon = ? WHERE id = ?').run(nm, col, ic, cat.id);
  res.json({ category: normalizeRow(row(db.prepare('SELECT * FROM categories WHERE id = ?'), cat.id)) });
});

// DELETE /api/categories/:id  (bloqueia se houver movimentações)
router.delete('/:id', (req, res) => {
  const cat = row(db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?'), Number(req.params.id), req.userId);
  if (!cat) return res.status(404).json({ error: 'Categoria não encontrada.' });
  const used = row(db.prepare('SELECT COUNT(*) AS n FROM transactions WHERE category_id = ?'), cat.id);
  if (used && used.n > 0) {
    return res.status(409).json({ error: 'Esta categoria está em uso e não pode ser excluída.' });
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(cat.id);
  res.json({ ok: true });
});

export default router;