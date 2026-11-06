import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useUI } from '../context/UIContext.jsx';
import { useMonth } from '../context/MonthContext.jsx';
import { parseBRLToCents, centsToInput, formatBRL } from '../utils/money.js';

const PALETTE = ['#FF453A', '#FF9F0A', '#FFD60A', '#30D158', '#32ADE6', '#0A84FF', '#5E5CE6', '#BF5AF2', '#FF375F', '#8E8E93'];

const SEG = [
  { t: 'income', label: 'Entrada', cls: 'green' },
  { t: 'investment', label: 'Investimento', cls: 'purple' },
  { t: 'expense', label: 'Saída', cls: 'red' }
];

export default function TransactionFormModal() {
  const { add, closeAdd, bumpRefresh, toast } = useUI();
  const { month } = useMonth();
  const [type, setType] = useState(add.type || 'income');
  const [kind, setKind] = useState('aporte');
  const [value, setValue] = useState('');
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [catId, setCatId] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(PALETTE[5]);

  const editing = add.item;
  const isInv = type === 'investment';

  useEffect(() => {
    if (!add.open) return;
    const it = add.item;
    setType(add.type || 'income');
    setError('');
    setShowNewCat(false);
    setNewCatName('');
    if (!it) {
      setKind('aporte');
      setValue('');
      setDesc('');
      setName('');
      setCatId('');
      const today = new Date();
      const todayYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      setDate(month === todayYM ? today.toISOString().slice(0, 10) : `${month}-01`);
      return;
    }
    setKind(it.kind || 'aporte');
    setValue(centsToInput(it.value_cents));
    setDate(it.date || `${month}-01`);
    setDesc(it.description || '');
    setName(it.name || '');
    setCatId(it.category_id != null ? String(it.category_id) : '');
  }, [add.open, add.type, add.item, month]);

  useEffect(() => {
    if (!add.open || isInv) return;
    api(`/categories?type=${type}`)
      .then((d) => setCategories(d.categories))
      .catch(() => setCategories([]));
  }, [add.open, isInv, type]);

  if (!add.open) return null;

  function createCategory() {
    const nm = newCatName.trim();
    if (!nm) return;
    api('/categories', { method: 'POST', body: { type, name: nm, color: newCatColor } })
      .then((d) => {
        setCategories((c) => [...c, d.category]);
        setCatId(String(d.category.id));
        setShowNewCat(false);
        setNewCatName('');
        toast(`Categoria "${nm}" criada`);
      })
      .catch((e) => setError(e.message));
  }

  async function submit() {
    const cents = parseBRLToCents(value);
    if (cents === null) return setError('Informe um valor válido.');
    if (!date) return setError('Informe a data.');

    const base = { type, value_cents: cents, date };
    let payload;
    if (isInv) {
      const nm = name.trim();
      if (!nm) return setError('Informe o nome do ativo.');
      if (kind === 'aporte' && cents <= 0) return setError('O aporte deve ser positivo.');
      if (kind === 'rendimento' && cents === 0) return setError('O rendimento não pode ser zero.');
      payload = { ...base, name: nm, kind, notes: desc || null };
    } else {
      if (cents <= 0) return setError('O valor deve ser positivo.');
      if (!catId) return setError('Escolha uma categoria.');
      payload = { ...base, category_id: Number(catId), description: desc || null };
    }

    setLoading(true);
    setError('');
    try {
      if (editing && isInv) await api('/investments/' + editing.id, { method: 'PUT', body: payload });
      else if (editing) await api('/transactions/' + editing.id, { method: 'PUT', body: payload });
      else if (isInv) await api('/investments', { method: 'POST', body: payload });
      else await api('/transactions', { method: 'POST', body: payload });
      toast('Salvo com sucesso');
      bumpRefresh();
      closeAdd();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overlay" onClick={closeAdd}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        <div className="sheet-head">
          <span className="h2">{isInv ? 'Movimento de investimento' : editing ? 'Editar movimento' : 'Novo movimento'}</span>
          <button className="sheet-x" onClick={closeAdd}>✕</button>
        </div>
        <div className="seg" style={{ marginBottom: 14 }}>
          {SEG.map((s) => (
            <button
              key={s.t}
              className={`on ${s.cls}`}
              style={type === s.t ? {} : { opacity: 0.5 }}
              onClick={() => { setType(s.t); setCatId(''); setError(''); }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="field">
          <label>Valor (R$)</label>
          <input className="input money" inputMode="decimal" placeholder="0,00" value={value} onChange={(e) => setValue(e.target.value)} />
          {value && <small className="muted">{formatBRL(parseBRLToCents(value) || 0)}</small>}
        </div>

        <div className="field">
          <label>Data</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {isInv ? (
          <>
            <div className="field">
              <label>Ativo / Investimento</label>
              <input className="input" placeholder="Ex.: Tesouro Selic, CDB, FII, Cripto" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label>Tipo de movimento</label>
              <div className="seg">
                <button className="on green" style={kind === 'aporte' ? {} : { opacity: 0.5 }} onClick={() => setKind('aporte')}>Aporte</button>
                <button className="on purple" style={kind === 'rendimento' ? {} : { opacity: 0.5 }} onClick={() => setKind('rendimento')}>Rendimento</button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label>Categoria</label>
              <div className="cat-chips">
                {categories.map((c) => (
                  <button key={c.id} className={`cat-chip ${catId === String(c.id) ? 'on' : ''}`} onClick={() => setCatId(String(c.id))}>
                    <span className="dot" style={{ background: c.color }} />
                    {c.name}
                  </button>
                ))}
                {!showNewCat && (
                  <button className="cat-chip" style={{ borderStyle: 'dashed' }} onClick={() => setShowNewCat(true)}>＋ Nova</button>
                )}
              </div>
              {showNewCat && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="input" style={{ flex: 1 }} placeholder="Nome da categoria" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} autoFocus />
                    <button className="btn ghost" style={{ width: 'auto', padding: '0 18px' }} onClick={createCategory}>OK</button>
                  </div>
                  <div className="color-dots">
                    {PALETTE.map((c) => (
                      <button key={c} className={`color-dot ${newCatColor === c ? 'on' : ''}`} style={{ background: c }} onClick={() => setNewCatColor(c)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="field">
              <label>Descrição (opcional)</label>
              <input className="input" placeholder="Detalhe do movimento" value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
          </>
        )}

        {error && <div className="error">{error}</div>}
        <button className="btn" onClick={submit} disabled={loading}>
          {loading ? 'Salvando…' : (editing ? 'Salvar alterações' : 'Adicionar')}
        </button>
      </div>
    </div>
  );
}