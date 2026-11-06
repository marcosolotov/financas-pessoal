import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useMonth } from '../context/MonthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { formatBRL } from '../utils/money.js';
import { ymLabel } from '../utils/month.js';
import MonthPicker from '../components/MonthPicker.jsx';
import TransactionList from '../components/TransactionList.jsx';
import { TrendBar, CategoryPie } from '../components/Charts.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const { month } = useMonth();
  const { refreshKey, openAdd, toast, bumpRefresh } = useUI();
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [recent, setRecent] = useState([]);
  const [pieType, setPieType] = useState('expense');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    setLoading(true);
    Promise.all([
      api('/summary', { params: { month } }),
      api('/summary/trend', { params: { months: 12 } }),
      api('/summary/breakdown', { params: { month, type: pieType } }),
      api('/transactions', { params: { month } })
    ])
      .then(([s, t, b, tx]) => {
        if (!on) return;
        setSummary(s);
        setTrend(t.series);
        setBreakdown(b.breakdown);
        setRecent(tx.transactions.slice(0, 8));
      })
      .catch(() => {})
      .finally(() => on && setLoading(false));
    return () => { on = false; };
  }, [month, refreshKey, pieType]);

  async function remove(t) {
    if (!window.confirm('Excluir esta movimentação?')) return;
    try {
      await api('/transactions/' + t.id, { method: 'DELETE' });
      toast('Movimentação excluída');
      bumpRefresh();
    } catch (e) {
      toast(e.message);
    }
  }

  const firstName = (user?.name || '').split(' ')[0];

  return (
    <>
      <header className="page-head">
        <div className="title">
          <small>Olá, {firstName}</small>
          <span className="h1">Resumo</span>
        </div>
      </header>

      <MonthPicker />

      {loading && !summary ? (
        <div className="spin" />
      ) : (
        <>
          <div className="summary-grid">
            <div className="summary-card hero">
              <span className="label">Saldo atual · {ymLabel(month)}</span>
              <span className="value money">{formatBRL(summary.saldoAtual)}</span>
              <span className="tag">Investido {formatBRL(summary.investido)}</span>
            </div>
            <div className="summary-card glass">
              <span className="label">Saldo anterior</span>
              <span className="value money">{formatBRL(summary.saldoAnterior)}</span>
            </div>
            <div className="summary-card glass">
              <span className="label">Investido no mês</span>
              <span className="value money">{formatBRL(summary.investidoNoMes.total)}</span>
              <span className="tag">+{formatBRL(summary.investidoNoMes.rendimentos)} de rendimento</span>
            </div>
            <div className="summary-card glass">
              <span className="label">Entradas</span>
              <span className="value money positive">{formatBRL(summary.entradas)}</span>
            </div>
            <div className="summary-card glass">
              <span className="label">Saídas</span>
              <span className="value money negative">{formatBRL(summary.saidas)}</span>
            </div>
          </div>

          <section className="section">
            <div className="section-head">
              <span className="h2">Evolução · 12 meses</span>
            </div>
            <div className="chart-card glass">
              <TrendBar data={trend} />
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <span className="h2">Distribuição</span>
              <div className="seg" style={{ maxWidth: 190 }}>
                <button className={`on green`} style={pieType === 'expense' ? {} : { opacity: 0.5 }} onClick={() => setPieType('expense')}>Saídas</button>
                <button className={`on purple`} style={pieType === 'income' ? {} : { opacity: 0.5 }} onClick={() => setPieType('income')}>Entradas</button>
              </div>
            </div>
            <div className="chart-card glass">
              <CategoryPie data={breakdown} />
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <span className="h2">Movimentações recentes</span>
              <span className="sub" onClick={() => (window.location.hash = '#/renda')}>ver todas</span>
            </div>
            <TransactionList transactions={recent} onEdit={(t) => openAdd(t.type, t)} onDelete={remove} />
          </section>
        </>
      )}
    </>
  );
}