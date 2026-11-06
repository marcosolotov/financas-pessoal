import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { parseBRLToCents, centsToInput } from '../utils/money.js';
import CategoryModal from '../components/CategoryModal.jsx';

export default function Settings() {
  const { user, logout, updateUser } = useAuth();
  const { refreshKey, toast, bumpRefresh } = useUI();

  // conta
  const [name, setName] = useState(user?.name || '');
  const [startIn, setStartIn] = useState(centsToInput(user?.start_balance_cents || 0));
  const [pw, setPw] = useState('');
  const [saving, setSaving] = useState(false);

  // categorias
  const [catType, setCatType] = useState('expense');
  const [income, setIncome] = useState([]);
  const [expense, setExpense] = useState([]);
  const [modal, setModal] = useState({ open: false, item: null, type: 'expense' });

  useEffect(() => {
    Promise.all([api('/categories?type=income'), api('/categories?type=expense')])
      .then(([a, b]) => {
        setIncome(a.categories);
        setExpense(b.categories);
      })
      .catch(() => {});
  }, [refreshKey]);

  async function saveAccount() {
    setSaving(true);
    const body = { name };
    const c = parseBRLToCents(startIn);
    body.start_balance_cents = c === null ? undefined : c;
    if (pw) body.new_password = pw;
    try {
      const d = await api('/settings', { method: 'PATCH', body });
      updateUser(d.user);
      toast('Dados salvos');
      setPw('');
    } catch (e) {
      toast(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(cat, list) {
    if (!window.confirm(`Excluir a categoria "${cat.name}"?`)) return;
    try {
      await api('/categories/' + cat.id, { method: 'DELETE' });
      toast('Categoria excluída');
      bumpRefresh();
    } catch (e) {
      toast(e.message);
    }
  }

  const cats = catType === 'income' ? income : expense;

  return (
    <>
      <header className="page-head">
        <div className="title">
          <small>⚙️ Ajustes</small>
          <span className="h1">Ajustes</span>
        </div>
      </header>

      <section className="section">
        <div className="section-head"><span className="h2">Conta</span></div>
        <div className="glass" style={{ padding: 16 }}>
          <div className="field">
            <label>Nome</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Saldo inicial (em carteira no início)</label>
            <input className="input money" inputMode="decimal" value={startIn} onChange={(e) => setStartIn(e.target.value)} placeholder="0,00" />
            <small className="muted">Base para o primeiro mês do histórico</small>
          </div>
          <div className="field">
            <label>Nova senha (opcional)</label>
            <input className="input" type="password" value={pw} placeholder="Deixa em branco para manter" onChange={(e) => setPw(e.target.value)} />
          </div>
          <button className="btn" onClick={saveAccount} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="h2">Categorias</span>
        </div>

        <div className="seg" style={{ marginBottom: 12 }}>
          <button className={`on green ${catType === 'expense' ? '' : ''}`} style={catType === 'expense' ? {} : { opacity: 0.5 }} onClick={() => setCatType('expense')}>Saídas</button>
          <button className={`on purple`} style={catType === 'income' ? {} : { opacity: 0.5 }} onClick={() => setCatType('income')}>Entradas</button>
        </div>

        <div className="list">
          {cats.map((c) => (
            <div className="row actions cat-row" key={c.id}>
              <div className="swatch" style={{ background: c.color }} />
              <div className="info"><div className="t">{c.name}</div></div>
              <button className="sheet-x" style={{ width: 30, height: 30 }} onClick={() => setModal({ open: true, item: c, type: catType })}>✎</button>
              <button className="del" onClick={() => deleteCategory(c, cats)}>✕</button>
            </div>
          ))}
          {cats.length === 0 && <div className="empty">Nenhuma categoria</div>}
        </div>
        <button className="btn ghost" style={{ marginTop: 12 }} onClick={() => setModal({ open: true, item: null, type: catType })}>
          ＋ Nova categoria de {catType === 'expense' ? 'saída' : 'entrada'}
        </button>
      </section>

      <button className="btn danger" onClick={logout}>Sair da conta</button>

      <CategoryModal open={modal.open} item={modal.item} type={modal.type} onClose={() => setModal((m) => ({ ...m, open: false }))} />
    </>
  );
}