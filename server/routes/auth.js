import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db, row, normalizeRow, createDefaultCategories } from '../db.js';
import { signToken, requireAuth } from '../auth.js';

const router = Router();

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, start_balance_cents: u.start_balance_cents };
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Preencha nome, e-mail e senha.' });
  }
  if (String(name).trim().length < 2) {
    return res.status(400).json({ error: 'Nome muito curto.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'E-mail inválido.' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
  }
  const existing = row(db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)'), email);
  if (existing) {
    return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
  }
  const password_hash = bcrypt.hashSync(String(password), 10);
  const info = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(String(name).trim(), String(email).trim().toLowerCase(), password_hash);
  const id = Number(info.lastInsertRowid);
  createDefaultCategories(id);
  const user = normalizeRow(row(db.prepare('SELECT * FROM users WHERE id = ?'), id));
  res.status(201).json({ token: signToken(id), user: publicUser(user) });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Informe e-mail e senha.' });
  }
  const user = row(db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)'), email);
  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }
  res.json({ token: signToken(user.id), user: publicUser(user) });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = normalizeRow(row(db.prepare('SELECT * FROM users WHERE id = ?'), req.userId));
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
  res.json({ user: publicUser(user) });
});

export default router;