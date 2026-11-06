import { useLocation, useNavigate } from 'react-router-dom';
import { useUI } from '../context/UIContext.jsx';

const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const InIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="7 13 12 18 17 13" />
    <polyline points="7 6 12 11 17 6" />
  </svg>
);
const OutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="7 11 12 6 17 11" />
    <polyline points="7 18 12 13 17 18" />
  </svg>
);
const InvestIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 18 9 18 9 11 17 11" />
    <line x1="12" y1="18" x2="12" y2="6" />
  </svg>
);
const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const TABS = [
  { to: '/', label: 'Início', Icon: HomeIcon },
  { to: '/renda', label: 'Entradas', Icon: InIcon },
  { to: '/gastos', label: 'Saídas', Icon: OutIcon },
  { to: '/investimentos', label: 'Investimentos', Icon: InvestIcon },
  { to: '/ajustes', label: 'Ajustes', Icon: SettingsIcon }
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

  const rendered = [];
  TABS.forEach((t, i) => {
    const Icon = t.Icon;
    rendered.push(
      <button
        key={t.to}
        className={`nav-item ${isActive(t.to) ? 'active' : ''}`}
        onClick={() => navigate(t.to)}
      >
        <span className="ico"><Icon /></span>
        {isActive(t.to) && <span className="lab">{t.label}</span>}
      </button>
    );
    if (i === 1) {
      rendered.push(
        <button key="__fab" className="nav-item fab-circle" aria-label="Adicionar" onClick={() => openAdd('income')}>
          <span className="ico fab-plus">＋</span>
        </button>
      );
    }
  });

  return <nav className="bottom-nav">{rendered}</nav>;
}