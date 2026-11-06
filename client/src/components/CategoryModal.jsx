import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useUI } from '../context/UIContext.jsx';

const PALETTE = ['#FF453A', '#FF9F0A', '#FFD60A', '#30D158', '#32ADE6', '#0A84FF', '#5E5CE6', '#BF5AF2', '#FF375F', '#8E8E93'];

export default function CategoryModal({ open, item, type, onClose }) {
  const { bumpRefresh, toast } = useUI();
  const [name, setName] = useState('');
  const [color, setColor] = useState(PALETTE[5]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(item?.name || '');
    setColor(item?.color || PALETTE[5]);
    setError('');
  }, [open, item]);

  if (!open) return null;

  async function save() {
    const nm = name.trim();
    if (!nm) return setError('Informe o nome.');
    setLoading(true);
    setError('');
    try {
      if (item) {
        await api('/categories/' + item.id, { method: 'PUT', body: { name: nm, color } });
        toast('Categoria atualizada');
      } else {
        await api('/categories', { method: 'POST', body: { type, name: nm, color } });
        toast('Categoria criada');
      }
      bumpRefresh();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        <div className="sheet-head">
          <span className="h2">{item ? 'Editar categoria' : 'Nova categoria'}</span>
          <button className="sheet-x" onClick={onClose}>✕</button>
        </div>

        <div className="field">
          <label>Nome</label>
          <input className="input" placeholder="Ex.: Pet, Assinaturas…" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <label>Cor</label>
          <div className="color-dots">
            {PALETTE.map((c) => (
              <button key={c} className={`color-dot ${color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />
            ))}
          </div>
        </div>

        {error && <div className="error">{error}</div>}
        <button className="btn" onClick={save} disabled={loading}>
          {loading ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}