import { formatBRL } from '../utils/money.js';
import { formatDay } from '../utils/month.js';

// Agrupa transações por data (mais recentes primeiro)
export function groupByDate(transactions) {
  const map = new Map();
  for (const t of transactions) {
    if (!map.has(t.date)) map.set(t.date, []);
    map.get(t.date).push(t);
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

export default function TransactionList({ transactions, onEdit, onDelete }) {
  const groups = groupByDate(transactions);
  if (groups.length === 0) return <div className="empty">Nada por aqui ainda. Toque em <b>＋</b> para adicionar.</div>;

  return (
    <div>
      {groups.map(([date, list]) => (
        <div key={date}>
          <div className="date-group-label">{formatDay(date)}</div>
          <div className="list">
            {list.map((t) => (
              <TxItem key={t.id} t={t} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TxItem({ t, onEdit, onDelete }) {
  const isIn = t.type === 'income';
  const label = t.description || t.category_name || 'Movimento';
  return (
    <div className="row actions">
      <div className="ic" style={{ background: t.category_color || (isIn ? '#30d158' : '#ff453a') }}>
        {isIn ? '↑' : '↓'}
      </div>
      <div className="info">
        <div className="t">{label}</div>
        <div className="s">{t.category_name || 'Sem categoria'}</div>
      </div>
      <div className={`amt ${isIn ? 'positive' : 'negative'}`}>
        {isIn ? '+' : '−'}{formatBRL(t.value_cents)}
      </div>
      <button className="sheet-x" style={{ width: 30, height: 30 }} onClick={() => onEdit(t)} aria-label="Editar">✎</button>
      <button className="del" onClick={() => onDelete(t)} aria-label="Excluir">✕</button>
    </div>
  );
}