import { useMonth } from '../context/MonthContext.jsx';
import { prevYM, nextYM, ymLabel } from '../utils/month.js';

export default function MonthPicker({ onAdd, addLabel = 'Adicionar' }) {
  const { month, setMonth } = useMonth();
  return (
    <div className={`month-picker${onAdd ? ' month-picker-with-action' : ''}`}>
      <button className="month-arrow glass" aria-label="Mês anterior" onClick={() => setMonth(prevYM(month))}>‹</button>
      <div className="mid glass">
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
      </div>
      <button className="month-arrow glass" aria-label="Próximo mês" onClick={() => setMonth(nextYM(month))}>›</button>
      {onAdd && (
        <button className="month-add glass-strong" onClick={onAdd}>
          <span aria-hidden="true">＋</span> {addLabel}
        </button>
      )}
    </div>
  );
}
