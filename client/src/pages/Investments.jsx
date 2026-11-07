import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useMonth } from '../context/MonthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { formatBRL } from '../utils/money.js';
import { addMonths, currentYM, formatDay } from '../utils/month.js';
import MonthPicker from '../components/MonthPicker.jsx';
import { PatrimonyLine } from '../components/Charts.jsx';
import { groupByDate } from '../components/TransactionList.jsx';

export default function Investments() {
  const { user } = useAuth();
  const firstName = (user?.name || '').split(' ')[0];
  const { month } = useMonth();
  const { refreshKey, openAdd, toast, bumpRefresh } = useUI();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [rangeStart, setRangeStart] = useState(() => addMonths(currentYM(), -11));
  const [rangeEnd, setRangeEnd] = useState(() => currentYM());
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

  useEffect(() => {
    let on = true;
    api('/summary/trend', { params: { from: rangeStart, to: rangeEnd } })
      .then((d) => on && setTrend(d.series))
      .catch(() => on && setTrend([]));
    return () => { on = false; };
  }, [rangeStart, rangeEnd, refreshKey]);

  function changeRangeStart(value) {
    const earliest = addMonths(rangeEnd, -11);
    setRangeStart(value > rangeEnd ? rangeEnd : value < earliest ? earliest : value);
  }

  function changeRangeEnd(value) {
    const latest = addMonths(rangeStart, 11);
    if (value < rangeStart) setRangeStart(value);
    else if (value > latest) setRangeStart(addMonths(value, -11));
    setRangeEnd(value);
  }

  async function remove(it) {
    if (!window.confirm('Excluir este movimento de investimento?')) return;
    try {
      await api('/investments/' + it.id, { method: 'DELETE' });
      toast('Excluído');
      bumpRefresh();
    } catch (e) {
      toast('Erro ao excluir');
    }
  }

  return (
    <div className="investments-page">
      <header className="page-head">
        <div className="title">
          <small>Olá, {firstName}</small>
          <span className="h1">Investimentos</span>
        </div>
      </header>

      <MonthPicker onAdd={() => openAdd('investment')} addLabel="Adicionar" />

      {loading && !summary ? (
        <div className="spin" />
      ) : (
        <div>
          <div className="summary-grid investment-summary-grid">
            <div className="summary-card hero">
              <span className="label">Total investido (carteira)</span>
              <span className="value money">{formatBRL(summary.investido)}</span>
              <span className="tag">Atualizado até o fim deste mês</span>
            </div>
            <div className="summary-card glass">
              <span className="label">Aportes no mês</span>
              <span className="value money purple">{formatBRL(summary.investidoNoMes.aportes)}</span>
            </div>
            <div className="summary-card glass">
              <span className="label">Rendimentos no mês</span>
              <span className="value money positive">{formatBRL(summary.investidoNoMes.rendimentos)}</span>
            </div>
          </div>

          <section className="section">
            <div className="section-head">
              <span className="h2">Evolução patrimonial</span>
              <span className="sub">até 12 meses</span>
            </div>
            <div className="investment-range">
              <label>
                <span>De</span>
                <input className="input" type="month" value={rangeStart} max={rangeEnd} onChange={(e) => changeRangeStart(e.target.value)} />
              </label>
              <label>
                <span>Até</span>
                <input className="input" type="month" value={rangeEnd} min={rangeStart} max={currentYM()} onChange={(e) => changeRangeEnd(e.target.value)} />
              </label>
            </div>
            <div className="chart-card glass">
              <PatrimonyLine data={trend} height={270} />
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <span className="h2">Movimentações</span>
            </div>
            {items.length === 0 ? (
              <div className="empty">Sem movimentos de investimento neste mês. Toque em <b>＋</b> para registrar um aporte ou rendimento.</div>
            ) : (
              <div>
                {groupByDate(items).map(([date, datedItems]) => (
                  <div key={date}>
                    <div className="date-group-label">{formatDay(date)}</div>
                    <div className="list">
                      {datedItems.map((it) => {
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
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
