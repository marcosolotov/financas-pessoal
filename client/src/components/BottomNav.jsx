import { useLocation, useNavigate } from 'react-router-dom';
import { useUI } from '../context/UIContext.jsx';

const TABS = [
  { to: '/', label: 'Início', ico: '🏠' },
  { to: '/renda', label: 'Entradas', ico: '📥' },
  { to: '/gastos', label: 'Saídas', ico: '📤' },
  { to: '/investimentos', label: 'Investimentos', ico: '📈' },
  { to: '/ajustes', label: 'Ajustes', ico: '⚙️' }
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { openAdd } = useUI();
  const path = location.pathname;

  function isActive(to) {
    if (to === '/') return path === '/';
    return path.startsWith(to);
  }

  // Inserimos o botão + entre as "Entradas" (índice 1) e "Saídas" (índice 2)
  const rendered = [];
  TABS.forEach((t, i) => {
    rendered.push(
      <button
        key={t.to}
        className={`nav-item ${isActive(t.to) ? 'active' : ''}`}
        onClick={() => navigate(t.to)}
      >
        <span className="ico">{t.ico}</span>
        {isActive(t.to) && <span className="lab">{t.label}</span>}
      </button>
    );
    if (i === 1) {
      rendered.push(
        <button key="__fab" className="nav-item fab-circle" aria-label="Adicionar" onClick={() => openAdd('income')}>
          <span className="ico">＋</span>
        </button>
      );
    }
  });

  return <nav className="bottom-nav">{rendered}</nav>;
}