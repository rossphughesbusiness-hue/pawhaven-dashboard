'use client';
import { useEffect, useState } from 'react';

const STORES = [
  { id: 'pawhaven', name: 'PawHaven', emoji: '🐾' },
];

const s = {
  shell: { display: 'flex', minHeight: '100vh', background: '#0f172a' },
  sidebar: {
    width: 220, flexShrink: 0, background: '#0d1424', borderRight: '1px solid #1e293b',
    display: 'flex', flexDirection: 'column', padding: '0 0 24px',
  },
  sidebarTop: { padding: '28px 20px 20px', borderBottom: '1px solid #1e293b', marginBottom: 12 },
  brand: { margin: 0, fontSize: 15, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' },
  brandSub: { margin: '3px 0 0', fontSize: 10, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' },
  sectionLabel: { padding: '8px 20px 6px', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' },
  storeBtn: (active) => ({
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 20px',
    background: active ? '#1e293b' : 'transparent', border: 'none', cursor: 'pointer',
    color: active ? '#f1f5f9' : '#64748b', fontSize: 14, fontWeight: active ? 600 : 400,
    textAlign: 'left', borderRight: active ? '2px solid #6366f1' : '2px solid transparent',
  }),
  addBtn: {
    display: 'flex', alignItems: 'center', gap: 8, margin: '8px 12px 0', padding: '8px 12px',
    border: '1px dashed #334155', borderRadius: 8, background: 'transparent',
    color: '#475569', fontSize: 12, cursor: 'default', fontStyle: 'italic',
  },
  sidebarBottom: { marginTop: 'auto', padding: '16px 20px 0', borderTop: '1px solid #1e293b' },
  logoutBtn: {
    width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #334155',
    background: 'transparent', color: '#64748b', fontSize: 13, cursor: 'pointer', textAlign: 'left',
  },
  main: { flex: 1, padding: '32px 28px', overflow: 'auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  storeTitle: { margin: 0, fontSize: 20, fontWeight: 800, color: '#f1f5f9' },
  storeSub: { margin: '2px 0 0', fontSize: 13, color: '#64748b' },
  refreshBtn: { padding: '8px 16px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 20 },
  card: { background: '#1e293b', borderRadius: 12, padding: '20px 18px', position: 'relative' },
  cardLabel: { fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 },
  cardValue: { fontSize: 30, fontWeight: 800, color: '#f1f5f9', margin: 0 },
  cardSub: { fontSize: 12, color: '#64748b', marginTop: 4 },
  chartSection: { background: '#1e293b', borderRadius: 12, padding: '22px 22px 16px', marginBottom: 20 },
  sectionTitle: { margin: '0 0 18px', fontSize: 15, fontWeight: 700, color: '#f1f5f9' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 },
  section: { background: '#1e293b', borderRadius: 12, padding: 22 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', paddingBottom: 10, borderBottom: '1px solid #334155' },
  td: { padding: '10px 0', borderBottom: '1px solid #0f172a', fontSize: 13, color: '#cbd5e1' },
  bar: { height: 7, borderRadius: 4, background: '#6366f1', marginTop: 4 },
  empty: { color: '#475569', fontSize: 13, textAlign: 'center', padding: '28px 0' },
  loading: { color: '#475569', textAlign: 'center', padding: '80px 0', fontSize: 15 },
};

// Week-over-week delta badge
function Delta({ current, previous, prefix = '' }) {
  if (!previous || previous === 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  const up = pct >= 0;
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 700,
      color: up ? '#34d399' : '#f87171',
      background: up ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
      borderRadius: 6, padding: '2px 6px', marginLeft: 8,
    }}>
      {up ? '↑' : '↓'} {Math.abs(pct)}% vs last week
    </span>
  );
}

function StatCard({ label, value, sub, color = '#f1f5f9', delta }) {
  return (
    <div style={s.card}>
      <div style={s.cardLabel}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 4 }}>
        <p style={{ ...s.cardValue, color, margin: 0 }}>{value}</p>
        {delta}
      </div>
      {sub && <div style={s.cardSub}>{sub}</div>}
    </div>
  );
}

function RevenueChart({ daily }) {
  if (!daily || daily.length === 0) return <div style={s.empty}>No revenue data yet.</div>;

  const maxRevenue = Math.max(...daily.map(d => d.revenue), 0.01);
  const totalDays = daily.length;
  const chartH = 140;
  const chartW = 700;
  const barW = Math.floor(chartW / totalDays) - 2;
  const labelInterval = Math.ceil(totalDays / 7);

  // Build SVG line path for trend
  const points = daily.map((d, i) => {
    const x = i * (chartW / totalDays) + barW / 2;
    const y = chartH - Math.max(2, (d.revenue / maxRevenue) * chartH);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width="100%" viewBox={`0 0 ${chartW} ${chartH + 30}`} preserveAspectRatio="none" style={{ display: 'block', minWidth: 400 }}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map(pct => (
          <line key={pct}
            x1={0} y1={chartH - pct * chartH}
            x2={chartW} y2={chartH - pct * chartH}
            stroke="#1e2a3a" strokeWidth={1}
          />
        ))}

        {/* Bars */}
        {daily.map((d, i) => {
          const barH = Math.max(2, (d.revenue / maxRevenue) * chartH);
          const x = i * (chartW / totalDays);
          const y = chartH - barH;
          const isToday = i === totalDays - 1;
          return (
            <g key={i}>
              <rect
                x={x + 1} y={y} width={barW} height={barH} rx={2}
                fill={isToday ? '#34d399' : d.revenue > 0 ? '#6366f1' : '#1a2535'}
                opacity={isToday ? 1 : 0.85}
              />
              {d.revenue > 0 && <title>{d.label}: ${d.revenue.toFixed(2)}</title>}
              {i % labelInterval === 0 && (
                <text x={x + barW / 2} y={chartH + 20} textAnchor="middle" fontSize={9} fill="#475569">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Trend line */}
        <polyline
          points={points}
          fill="none"
          stroke="#818cf8"
          strokeWidth={1.5}
          strokeOpacity={0.6}
          strokeLinejoin="round"
        />
      </svg>

      {/* Legend + peak label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#475569' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#6366f1' }} /> Revenue
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#475569' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#34d399' }} /> Today
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#475569' }}>
            <div style={{ width: 20, height: 2, background: '#818cf8', borderRadius: 1 }} /> Trend
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#475569' }}>
          Peak: ${Math.max(...daily.map(d => d.revenue)).toFixed(2)}
        </div>
      </div>
    </div>
  );
}

function PawHavenData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/data');
      if (res.status === 401) { window.location.href = '/login'; return; }
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading && !data) return <div style={s.loading}>Loading…</div>;

  const { stripe, views, emailSubscribers, abandonedCarts } = data || {};
  const maxViews = views?.[0]?.views || 1;

  const revenueWoW = stripe?.lastWeekRevenue > 0
    ? <Delta current={stripe.thisWeekRevenue} previous={stripe.lastWeekRevenue} />
    : null;

  const ordersWoW = stripe?.lastWeekOrders > 0
    ? <Delta current={stripe.thisWeekOrders} previous={stripe.lastWeekOrders} />
    : null;

  return (
    <>
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>🐾</span>
          <div>
            <h1 style={s.storeTitle}>PawHaven</h1>
            <p style={s.storeSub}>Last updated: {lastUpdated}</p>
          </div>
        </div>
        <button style={s.refreshBtn} onClick={load}>↻ Refresh</button>
      </div>

      {/* Stat cards */}
      <div style={s.grid}>
        <StatCard
          label="Total Revenue"
          value={`$${(stripe?.revenue || 0).toFixed(2)}`}
          sub="All time (last 100 orders)"
          color="#34d399"
        />
        <StatCard
          label="This Week"
          value={`$${(stripe?.thisWeekRevenue || 0).toFixed(2)}`}
          sub={`${stripe?.thisWeekOrders || 0} orders`}
          color={stripe?.thisWeekRevenue > 0 ? '#34d399' : '#f1f5f9'}
          delta={revenueWoW}
        />
        <StatCard
          label="Today"
          value={`$${(stripe?.todayRevenue || 0).toFixed(2)}`}
          sub={`${stripe?.todayOrders || 0} order${stripe?.todayOrders !== 1 ? 's' : ''}`}
          color={stripe?.todayRevenue > 0 ? '#34d399' : '#f1f5f9'}
        />
        <StatCard
          label="Avg. Order Value"
          value={`$${(stripe?.aov || 0).toFixed(2)}`}
          sub="Per completed order"
          color="#f59e0b"
        />
        <StatCard
          label="Total Orders"
          value={stripe?.orders || 0}
          sub="Completed payments"
          delta={ordersWoW}
        />
        <StatCard
          label="Email Subscribers"
          value={emailSubscribers || 0}
          sub="Resend audience"
          color="#818cf8"
        />
        <StatCard
          label="Abandoned Carts"
          value={abandonedCarts || 0}
          sub="Active recovery queued"
          color={abandonedCarts > 0 ? '#f59e0b' : '#f1f5f9'}
        />
        <StatCard
          label="Top Product Views"
          value={views?.[0]?.views || 0}
          sub={views?.[0]?.name || '—'}
          color="#818cf8"
        />
      </div>

      {/* Revenue chart */}
      <div style={s.chartSection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ ...s.sectionTitle, margin: 0 }}>Revenue — Last 30 Days</h2>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            30d total: <span style={{ color: '#34d399', fontWeight: 700 }}>
              ${(stripe?.daily || []).reduce((sum, d) => sum + d.revenue, 0).toFixed(2)}
            </span>
          </div>
        </div>
        <RevenueChart daily={stripe?.daily} />
      </div>

      {/* Tables */}
      <div style={s.row}>
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Most Viewed Products</h2>
          {views?.length > 0 ? (
            <div>
              {views.map((p) => (
                <div key={p.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: '#cbd5e1', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 10 }}>{p.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#818cf8', flexShrink: 0 }}>{p.views}</span>
                  </div>
                  <div style={{ background: '#0f172a', borderRadius: 4, height: 7 }}>
                    <div style={{ ...s.bar, width: `${(p.views / maxViews) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={s.empty}>No views tracked yet.<br />Visit product pages on your store.</div>
          )}
        </div>

        <div style={s.section}>
          <h2 style={s.sectionTitle}>Recent Orders</h2>
          {stripe?.recent?.length > 0 ? (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Customer</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Amount</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {stripe.recent.map((o) => (
                  <tr key={o.id}>
                    <td style={s.td}>{o.name}</td>
                    <td style={{ ...s.td, textAlign: 'right', color: '#34d399', fontWeight: 600 }}>${o.amount.toFixed(2)}</td>
                    <td style={{ ...s.td, textAlign: 'right', color: '#64748b' }}>
                      {new Date(o.created * 1000).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={s.empty}>No completed orders yet.</div>
          )}
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  const [activeStore, setActiveStore] = useState('pawhaven');

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' });
    window.location.href = '/login';
  }

  return (
    <div style={s.shell}>
      <div style={s.sidebar}>
        <div style={s.sidebarTop}>
          <p style={s.brand}>Hughes Financials</p>
          <p style={s.brandSub}>Analytics</p>
        </div>

        <div style={s.sectionLabel}>Stores & Projects</div>

        {STORES.map((store) => (
          <button
            key={store.id}
            style={s.storeBtn(activeStore === store.id)}
            onClick={() => setActiveStore(store.id)}
          >
            <span style={{ fontSize: 16 }}>{store.emoji}</span>
            {store.name}
          </button>
        ))}

        <div style={s.addBtn}>
          <span>+</span> Add store
        </div>

        <div style={s.sidebarBottom}>
          <button style={s.logoutBtn} onClick={logout}>← Sign out</button>
        </div>
      </div>

      <div style={s.main}>
        {activeStore === 'pawhaven' && <PawHavenData />}
      </div>
    </div>
  );
}
