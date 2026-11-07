import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useMonth } from '../context/MonthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { formatBRL } from '../utils/money.js';
import MonthPicker from '../components/MonthPicker.jsx';
import TransactionList from '../components/TransactionList.jsx';

export default function Movements({ type, title, icon, accent }) {
  const { user } = useAuth();
  const firstName = (user?.name || '').split(' ')[0];
  const pageTitle = title || (type === 'income' ? 'Entradas' : 'Saídas');
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
          <small>Olá, {firstName}</small>
          <span className="h1">{pageTitle}</span>
        </div>
      </header>

      <MonthPicker onAdd={() => openAdd(type)} />

      <div className={`summary-card glass movement-total ${accent}`}>
        <span className="label">Total do mês</span>
        <span className="value money">{formatBRL(total)}</span>
      </div>

      {loading ? (
        <div className="spin" />
      ) : (
        <TransactionList transactions={items} onEdit={(t) => openAdd(type, t)} onDelete={remove} />
      )}
    </>
  );
}
