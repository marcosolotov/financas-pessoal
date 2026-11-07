import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { parseBRLToCents, centsToInput } from '../utils/money.js';
import CategoryModal from '../components/CategoryModal.jsx';
import { loadGoogleIdentity, requestDriveAccessToken, uploadBackupToDrive } from '../utils/googleDrive.js';

export default function Settings() {
  const { user, logout, updateUser } = useAuth();
  const { refreshKey, toast, bumpRefresh } = useUI();

  // conta
  const [name, setName] = useState(user?.name || '');
  const [startIn, setStartIn] = useState(centsToInput(user?.start_balance_cents || 0));
  const [pw, setPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [driveClientId, setDriveClientId] = useState(() => localStorage.getItem('googleDriveClientId') || '');
  const [driveReady, setDriveReady] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);

  // categorias
  const [catType, setCatType] = useState('expense');
  const [income, setIncome] = useState([]);
  const [expense, setExpense] = useState([]);
  const [modal, setModal] = useState({ open: false, item: null, type: 'expense' });

  useEffect(() => {
    Promise.all([api('/categories?type=income'), api('/categories?type=expense')])
      .then(([a, b]) => {
        setIncome(a.categories);
        setExpense(b.categories);
      })
      .catch(() => {});
  }, [refreshKey]);

  useEffect(() => {
    loadGoogleIdentity().then(() => setDriveReady(true)).catch(() => setDriveReady(false));
  }, []);

  async function saveAccount() {
    setSaving(true);
    const body = { name };
    const c = parseBRLToCents(startIn);
    body.start_balance_cents = c === null ? undefined : c;
    if (pw) body.new_password = pw;
    try {
      const d = await api('/settings', { method: 'PATCH', body });
      updateUser(d.user);
      toast('Dados salvos');
      setPw('');
    } catch (e) {
      toast(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(cat, list) {
    if (!window.confirm(`Excluir a categoria "${cat.name}"?`)) return;
    try {
      await api('/categories/' + cat.id, { method: 'DELETE' });
      toast('Categoria excluída');
      bumpRefresh();
    } catch (e) {
      toast(e.message);
    }
  }

  function downloadFile(content, filename, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadDatabaseBackup() {
    setBackupBusy(true);
    try {
      const backup = await api('/settings/backup');
      const date = new Date().toISOString().slice(0, 10);
      downloadFile(JSON.stringify(backup, null, 2), `controle-financeiro-backup-${date}.json`, 'application/json');
      toast('Backup baixado');
    } catch (e) {
      toast(e.message);
    } finally {
      setBackupBusy(false);
    }
  }

  async function backupToGoogleDrive() {
    const clientId = driveClientId.trim();
    if (!clientId) return toast('Informe o ID de cliente OAuth do Google.');
    if (!driveReady) return toast('Serviços do Google ainda não carregaram.');
    localStorage.setItem('googleDriveClientId', clientId);
    setBackupBusy(true);
    try {
      const [accessToken, backup] = await Promise.all([
        requestDriveAccessToken(clientId),
        api('/settings/backup')
      ]);
      const date = new Date().toISOString().slice(0, 10);
      await uploadBackupToDrive(accessToken, JSON.stringify(backup, null, 2), `controle-financeiro-backup-${date}.json`);
      toast('Backup enviado para o Google Drive');
    } catch (e) {
      toast(e.message);
    } finally {
      setBackupBusy(false);
    }
  }

  async function generateMonthlyReport() {
    setReportBusy(true);
    try {
      const { rows } = await api('/settings/report');
      const headers = [
        'Mês',
        'Proventos somados do mês',
        'Investimento anterior acumulado',
        'Investimento do mês somado',
        'Rendimento do mês somado',
        'Investimento atual total do mês'
      ];
      const decimalBRL = (cents) => (Number(cents || 0) / 100).toFixed(2).replace('.', ',');
      const csv = [
        headers.join(';'),
        ...rows.map((r) => [
          `${r.month.slice(5, 7)}/${r.month.slice(0, 4)}`,
          decimalBRL(r.proventos_cents),
          decimalBRL(r.investimento_anterior_cents),
          decimalBRL(r.investimento_mes_cents),
          decimalBRL(r.rendimento_mes_cents),
          decimalBRL(r.investimento_atual_cents)
        ].join(';'))
      ].join('\r\n');
      const date = new Date().toISOString().slice(0, 10);
      downloadFile(`\uFEFF${csv}`, `relatorio-financeiro-${date}.csv`, 'text/csv;charset=utf-8');
      toast('Planilha gerada');
    } catch (e) {
      toast(e.message);
    } finally {
      setReportBusy(false);
    }
  }

  const cats = catType === 'income' ? income : expense;
  const firstName = (user?.name || '').split(' ')[0];

  return (
    <>
      <div className="settings-page">
        <header className="page-head">
          <div className="title">
            <small>Olá, {firstName}</small>
            <span className="h1">Ajustes</span>
          </div>
        </header>

      <section className="section settings-account-section">
        <div className="section-head"><span className="h2">Conta</span></div>
        <div className="glass" style={{ padding: 16 }}>
          <div className="field">
            <label>Nome</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Saldo inicial (em carteira no início)</label>
            <input className="input money" inputMode="decimal" value={startIn} onChange={(e) => setStartIn(e.target.value)} placeholder="0,00" />
            <small className="muted">Base para o primeiro mês do histórico</small>
          </div>
          <div className="field">
            <label>Nova senha (opcional)</label>
            <input className="input" type="password" value={pw} placeholder="Deixa em branco para manter" onChange={(e) => setPw(e.target.value)} />
          </div>
          <button className="btn" onClick={saveAccount} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
          <button className="btn danger settings-logout" onClick={logout}>Sair da conta</button>
        </div>
      </section>

      <section className="section settings-categories-section">
        <div className="section-head">
          <span className="h2">Categorias</span>
        </div>

        <div className="glass settings-categories-card">
          <div className="seg" style={{ marginBottom: 12 }}>
            <button className={`on green ${catType === 'expense' ? '' : ''}`} style={catType === 'expense' ? {} : { opacity: 0.5 }} onClick={() => setCatType('expense')}>Saídas</button>
            <button className="on purple" style={catType === 'income' ? {} : { opacity: 0.5 }} onClick={() => setCatType('income')}>Entradas</button>
          </div>

          <div className="list">
            {cats.map((c) => (
              <div className="row actions cat-row" key={c.id}>
                <div className="swatch" style={{ background: c.color }} />
                <div className="info"><div className="t">{c.name}</div></div>
                <button className="sheet-x" style={{ width: 30, height: 30 }} onClick={() => setModal({ open: true, item: c, type: catType })}>✎</button>
                <button className="del" onClick={() => deleteCategory(c, cats)}>✕</button>
              </div>
            ))}
            {cats.length === 0 && <div className="empty">Nenhuma categoria</div>}
          </div>
          <button className="btn ghost" style={{ marginTop: 12 }} onClick={() => setModal({ open: true, item: null, type: catType })}>
            ＋ Nova categoria de {catType === 'expense' ? 'saída' : 'entrada'}
          </button>
        </div>
      </section>

      <section className="section settings-backup-section">
        <div className="section-head">
          <span className="h2">Backup e relatórios</span>
        </div>
        <div className="glass settings-backup-card">
          <div className="field">
            <label>ID de cliente OAuth do Google</label>
            <input
              className="input"
              value={driveClientId}
              onChange={(e) => {
                setDriveClientId(e.target.value);
                localStorage.setItem('googleDriveClientId', e.target.value);
              }}
              placeholder="...apps.googleusercontent.com"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <small className="muted">No Google Cloud, ative a Drive API e autorize o endereço HTTPS do app como origem JavaScript.</small>
          </div>
          <button className="btn" onClick={backupToGoogleDrive} disabled={backupBusy || !driveReady}>
            {backupBusy ? 'Preparando backup…' : 'Fazer backup no Google Drive'}
          </button>
          <button className="btn ghost" style={{ marginTop: 10 }} onClick={downloadDatabaseBackup} disabled={backupBusy}>
            Baixar backup dos meus dados
          </button>
          <button className="btn ghost" style={{ marginTop: 10 }} onClick={generateMonthlyReport} disabled={reportBusy}>
            {reportBusy ? 'Gerando planilha…' : 'Gerar planilha mensal'}
          </button>
          <small className="muted settings-backup-note">O backup inclui os dados desta conta e não inclui senhas nem dados de outros usuários. A planilha abre no Excel, Numbers e Google Sheets.</small>
        </div>
      </section>

      </div>

      <CategoryModal open={modal.open} item={modal.item} type={modal.type} onClose={() => setModal((m) => ({ ...m, open: false }))} />
    </>
  );
}
