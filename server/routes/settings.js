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

export default router;