import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(dataDir, 'db.sqlite');

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  name               TEXT NOT NULL,
  email              TEXT NOT NULL UNIQUE,
  password_hash      TEXT NOT NULL,
  start_balance_cents INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('income','expense')),
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#8E8E93',
  icon       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('income','expense')),
  category_id  INTEGER REFERENCES categories(id),
  value_cents  INTEGER NOT NULL,
  date         TEXT NOT NULL,
  description  TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS investments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('aporte','rendimento')),
  value_cents INTEGER NOT NULL,
  date        TEXT NOT NULL,
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_investments_user ON investments(user_id, date);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
`;

db.exec(SCHEMA);

// ---------- Categorias padrão (criadas no cadastro de cada usuário) ----------
export const DEFAULT_CATEGORIES = {
  income: [
    { name: 'Salário', color: '#30D158' },
    { name: 'Freelance', color: '#64D2FF' },
    { name: 'Pró-labore', color: '#BF5AF2' },
    { name: 'Aluguéis', color: '#FFD60A' },
    { name: 'Vendas', color: '#FF9F0A' },
    { name: 'Outros', color: '#8E8E93' }
  ],
  expense: [
    { name: 'Moradia', color: '#FF453A' },
    { name: 'Alimentação', color: '#FF9F0A' },
    { name: 'Transporte', color: '#64D2FF' },
    { name: 'Saúde', color: '#FF375F' },
    { name: 'Educação', color: '#5E5CE6' },
    { name: 'Lazer', color: '#BF5AF2' },
    { name: 'Contas', color: '#FFD60A' },
    { name: 'Compras', color: '#32ADE6' },
    { name: 'Outros', color: '#8E8E93' }
  ]
};

export function createDefaultCategories(userId) {
  const insert = db.prepare('INSERT INTO categories (user_id, type, name, color) VALUES (?, ?, ?, ?)');
  for (const type of ['income', 'expense']) {
    for (const c of DEFAULT_CATEGORIES[type]) {
      insert.run(userId, type, c.name, c.color);
    }
  }
}

// ---------- Helpers ----------
export function row(stmt, ...params) {
  const found = stmt.get(...params);
  return found === undefined ? null : found;
}

// Converte bigint (retornado pelo node:sqlite) para number
export function normalizeRow(r) {
  if (!r) return r;
  const out = { ...r };
  for (const k of Object.keys(out)) {
    if (typeof out[k] === 'bigint') out[k] = Number(out[k]);
  }
  return out;
}

export function normalizeRows(rows) {
  return rows.map(normalizeRow);
}

export function toCents(value) {
  // aceita "12,50" ou "12.50" ou "1250" -> 1250
  if (typeof value === 'number') return Math.round(value * 100);
  const str = String(value).trim().replace(/\./g, '').replace(',', '.');
  const num = Number.parseFloat(str);
  if (Number.isNaN(num) || num < 0) return null;
  return Math.round(num * 100);
}