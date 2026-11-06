import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import BottomNav from './components/BottomNav.jsx';
import TransactionFormModal from './components/TransactionFormModal.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Income from './pages/Income.jsx';
import Expense from './pages/Expense.jsx';
import Investments from './pages/Investments.jsx';
import Settings from './pages/Settings.jsx';

function Loading() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <div className="spin" />
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />

      <Route
        path="/*"
        element={
          user ? (
            <>
              <div className="app-shell">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/renda" element={<Income />} />
                  <Route path="/gastos" element={<Expense />} />
                  <Route path="/investimentos" element={<Investments />} />
                  <Route path="/ajustes" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
              <BottomNav />
              <TransactionFormModal />
            </>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}