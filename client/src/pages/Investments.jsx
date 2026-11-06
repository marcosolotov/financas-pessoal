import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useMonth } from '../context/MonthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { formatBRL } from '../utils/money.js';
import MonthPicker from '../components/MonthPicker.jsx';

export default function Investments() {
  const { month } = useMonth();
  const { refreshKey, openAdd, toast, bumpRefresh } = useUI();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    setLoading(true);
    Promise.all([
      api('/investments', { params: { month } }),
      api('/summary', { params: { month } })
    ])
      .then(([inv, s]) => {
        if (!on) return;
        setItems(inv.investments);
        setSummary(s);
      })
      .catch(() => {})
      .finally(() => on && setLoading(false));
    return () => { on = false; };
  }, [month, refreshKey]);

  async function remove(it) {
    if (!window.confirm('Excluir este movimento de investimento?')) return;
    try {
      await api('/investments/' + it.id, { method: 'DELETE' });
      toast('Excluído');
      bumpRefresh();
    } catch (e) {
      toast(e.message);
    }
  }

  const aportes = items.filter((i) => i.kind === 'aporte').reduce((s, i) => s + i.value_cents, 0);
  const rends = items.filter((i) => i.kind === 'rendimento').reduce((s, i) => s + i.value_cents, 0);

  return (
    <>
      <header className="page-head">
        <div className="title">
          <small>📈 Investimentos</small>
          <span className="h1">Investimentos</span>
        </div>
      </header>

      <MonthPicker />

      {loading && !summary ? (
        <div className="spin" />
      ) : (
        <>
          <div className="summary-grid">
            <div className="summary-card hero">
              <span className="label">Total investido (carteira)</span>
              <span className="value money">{formatBRL(summary.investido)}</span>
              <span className="tag">Atualizado até o fim deste mês</span>
            </div>
            <div className="summary-card glass">
              <span className="label">Aportes no mês</span>
              <span className="value money purple">{formatBRL(aportes)}</span>
            </div>
            <div className="summary-card glass">
              <span className="label">Rendimentos no mês</span>
              <span className="value money positive">{formatBRL(rends)}</span>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="empty">Sem movimentos de investimento neste mês. Toque em <b>＋</b> para registrar um aporte ou rendimento.</div>
          ) : (
            <div className="list">
              {items.map((it) => {
                const isAporte = it.kind === 'aporte';
                return (
                  <div className="row actions" key={it.id}>
                    <div className="ic" style={{ background: isAporte ? '#0a84ff' : '#30d158' }}>
                      {isAporte ? '↓' : '↑'}
                    </div>
                    <div className="info">
                      <div className="t">{it.name}</div>
                      <div className="s">{isAporte ? 'Aporte' : 'Rendimento'} · {formatBRL(it.value_cents)} {it.notes ? `· ${it.notes}` : ''}</div>
                    </div>
                    <div className={`amt ${isAporte ? 'purple-txt' : 'positive'}`}>{formatBRL(it.value_cents)}</div>
                    <button className="sheet-x" style={{ width: 30, height: 30 }} onClick={() => openAdd('investment', it)}>✎</button>
                    <button className="del" onClick={() => remove(it)}>✕</button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <button className="fab" aria-label="Adicionar investimento" onClick={() => openAdd('investment')}>＋</button>
    </>
  );
}