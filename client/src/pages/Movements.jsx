import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useMonth } from '../context/MonthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { formatBRL } from '../utils/money.js';
import MonthPicker from '../components/MonthPicker.jsx';
import TransactionList from '../components/TransactionList.jsx';

export default function Movements({ type, title, icon, accent }) {
  const { month } = useMonth();
  const { refreshKey, openAdd, toast, bumpRefresh } = useUI();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    setLoading(true);
    api('/transactions', { params: { type, month } })
      .then((d) => on && setItems(d.transactions))
      .catch(() => {})
      .finally(() => on && setLoading(false));
    return () => { on = false; };
  }, [type, month, refreshKey]);

  const total = items.reduce((s, t) => s + (t.value_cents || 0), 0);

  async function remove(t) {
    if (!window.confirm('Excluir esta movimentação?')) return;
    try {
      await api('/transactions/' + t.id, { method: 'DELETE' });
      toast('Excluída');
      bumpRefresh();
    } catch (e) {
      toast(e.message);
    }
  }

  return (
    <>
      <header className="page-head">
        <div className="title">
          <small>{icon} {title}</small>
          <span className="h1">{title}</span>
        </div>
        <div className={`summary-card glass`} style={{ minWidth: 120 }}>
          <span className="label">Total do mês</span>
          <span className={`value money ${accent}`}>{formatBRL(total)}</span>
        </div>
      </header>

      <MonthPicker />

      {loading ? (
        <div className="spin" />
      ) : (
        <TransactionList transactions={items} onEdit={(t) => openAdd(type, t)} onDelete={remove} />
      )}

      <button className="fab" aria-label="Adicionar" onClick={() => openAdd(type)}>＋</button>
    </>
  );
}