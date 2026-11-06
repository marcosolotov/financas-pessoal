import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('A senha deve ter pelo menos 6 caracteres.');
    if (password !== confirm) return setError('As senhas não coincidem.');
    setLoading(true);
    try {
      const data = await api('/auth/register', { method: 'POST', body: { name, email, password } });
      login(data);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card glass-strong" onSubmit={submit}>
        <div className="auth-logo">💰</div>
        <div className="auth-title">Criar conta</div>
        <div className="auth-sub">Seus dados ficam salvos e privados por usuário</div>

        <div className="field">
          <label>Nome</label>
          <input className="input" autoComplete="name" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>E-mail</label>
          <input className="input" type="email" autoComplete="email" placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Senha</label>
          <input className="input" type="password" autoComplete="new-password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="field">
          <label>Confirmar senha</label>
          <input className="input" type="password" autoComplete="new-password" placeholder="Repita a senha" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>

        {error && <div className="error">{error}</div>}
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Criando…' : 'Criar conta'}
        </button>

        <div className="switch-line">
          Já tem conta? <Link to="/login">Entrar</Link>
        </div>
      </form>
    </div>
  );
}