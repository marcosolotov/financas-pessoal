import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { formatBRL } from '../utils/money.js';

function TooltipGlass({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="glass" style={{ padding: '8px 12px', fontSize: 12, borderRadius: 12, minWidth: 120 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color || p.payload?.fill || '#fff', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span>{p.name}</span>
          <b>{formatBRL(p.value)}</b>
        </div>
      ))}
    </div>
  );
}

export function TrendBar({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barGap={3}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: 'rgba(235,235,245,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} interval={1} />
        <YAxis tick={{ fill: 'rgba(235,235,245,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
        <Tooltip content={<TooltipGlass />} cursor={{ fill: 'rgba(255,255,255,0.06)' }} />
        <Bar name="Entradas" dataKey="entradas" fill="#30d158" radius={[5, 5, 0, 0]} maxBarSize={16} />
        <Bar name="Saídas" dataKey="saidas" fill="#ff453a" radius={[5, 5, 0, 0]} maxBarSize={16} />
        <Bar name="Investimentos" dataKey="investimentos" fill="#bf5af2" radius={[5, 5, 0, 0]} maxBarSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryPie({ data }) {
  const total = data.reduce((s, d) => s + d.total, 0);
  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="total" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3} stroke="none">
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip content={<TooltipGlass />} />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: 'rgba(235,235,245,0.75)' }}
          />
        </PieChart>
      </ResponsiveContainer>
      {data.length === 0 ? (
        <div className="empty">Sem movimentações neste mês</div>
      ) : (
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 13, color: 'rgba(235,235,245,0.6)', fontWeight: 600 }}>
          Total: <b className="money">{formatBRL(total)}</b>
        </div>
      )}
    </div>
  );
}