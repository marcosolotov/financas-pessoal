# Controle Financeiro

App web **responsivo e escuro** (estilo *Liquid Glass* da Apple) para controlar **ganhos, gastos e investimentos**, acessível pelo navegador Safari no celular. Dados salvos por usuário com login e senha.

## ✨ Funcionalidades

- **Entradas (proventos)** com categorias — permite criar suas próprias categorias (salvas por usuário)
- **Saídas (gastos)** com categorias — permite criar suas próprias categorias (salvas por usuário)
- **Investimentos** com **aporte** e **rendimento**
- Tudo agrupado **por mês**, com somas automáticas de entradas, saídas e investimentos
- **Saldo anterior** e **saldo atual** do mês (saldo atual = dinheiro em carteira + valor investido na carteira)
- **Gráficos de barra** (evolução 12 meses: entradas × saídas × investimentos) e **pizza** (distribuição por categoria)
- **Cadastro/login por usuário** com senha hash; dados isolados entre usuários
- Interface **moderna, escura, intuitiva**, com **menu inferior redondo flutuante** (navegação app-like)
- PWA — pode ser "adicionado à tela de início" no iPhone e usado como app

## 🚀 Começando (desenvolvimento local)

### Pré-requisitos
Node.js 18+ (testado com v25).

### Instalação
```bash
git clone <seu-repositorio>
cd controle-financeiro
npm install
```

### Rodar em modo desenvolvimento
```bash
npm run dev
```
- API (Express): `http://localhost:3000`
- Frontend (Vite): `http://localhost:5173` (proxy da API)

Abra `http://localhost:5173` no navegador. No iPhone, na mesma rede Wi-Fi, acesse `http://<IP-do-seu-Mac>:5173`.

### Rodar em produção (build único)
```bash
npm run build   # gera a pasta dist/
npm start       # sobe o servidor em http://localhost:3000
```

O servidor de produção já serve o frontend (`dist/`) e a API juntos.

### Variáveis de ambiente
Copie `.env.example` para `.env` e ajuste:
```bash
cp .env.example .env
```
| Variável | Descrição |
|---|---|
| `PORT` | Porta HTTP (padrão 3000) |
| `JWT_SECRET` | Segredo para assinar tokens de sessão (gere com `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
| `DB_PATH` | Caminho do banco SQLite (padrão: `./data/db.sqlite`) |

## ☁️ Deploy (acesso de qualquer lugar, inclusive Safari fora de casa)

O plano recomendado (gratuito) é **Render + Supabase**:

1. **GitHub:** envie este código para um repositório GitHub.
2. **Supabase (free):** crie um projeto, rode o schema abaixo no SQL Editor e pegue a `DATABASE_URL`.
3. **Render (free):** crie um "Web Service" conectado ao seu repositório GitHub:
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Variáveis de ambiente: `NODE_ENV=production`, `PORT`, `JWT_SECRET` (forte), `DATABASE_URL`

### Schema SQL (Supabase / Postgres)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  start_balance_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('income','expense')),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#8E8E93',
  icon TEXT,
  created_at TIMESTAMP DEFAULT now()
);
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('income','expense')),
  category_id INTEGER REFERENCES categories(id),
  value_cents INTEGER NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);
CREATE TABLE investments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT CHECK (kind IN ('aporte','rendimento')),
  value_cents INTEGER NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

> ⚠️ **Nota sobre SQLite em produção grátis:** se usar SQLite no Render sem disco persistente, os dados são perdidos a cada novo deploy. Para dados que não se perdem, use o Supabase Postgres acima.

## 📱 Usar no iPhone (Safari)

1. Abra a URL do app (localhost na rede ou o domínio do Render).
2. Toque em **Compartilhar → Adicionar à Tela de Início**.
3. O app abre em tela cheia, sem barra de endereço, com navegação inferior estilo app nativo.

## 🧪 Estrutura do projeto

```
controle-financeiro/
├─ server/           # Backend Node + Express (API + banco SQLite/Postgres)
├─ client/           # Frontend React + Vite + Recharts
├─ dist/             # Build de produção (servida pelo Express)
├─ data/             # Banco SQLite local (não versionado)
├─ package.json
└─ .env.example
```

## 📄 Licença

Uso pessoal/livre.