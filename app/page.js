'use client';
import { useEffect, useState } from 'react';

const s = {
  page: { maxWidth: 1100, margin: '0 auto', padding: '32px 24px' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 },
  logo: { display: 'flex', alignItems: 'center', gap: 10 },
  paw: { fontSize: 28 },
  title: { margin: 0, fontSize: 22, fontWeight: 800, color: '#f1f5f9' },
  sub: { margin: '2px 0 0', fontSize: 13, color: '#64748b' },
  refreshBtn: { padding: '8px 18px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 },
  card: { background: '#1e293b', borderRadius: 12, padding: '24px 20px' },
  cardLabel: { fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 },
  cardValue: { fontSize: 36, fontWeight: 800, color: '#f1f5f9', margin: 0 },
  cardSub: { fontSize: 13, color: '#64748b', marginTop: 4 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  section: { background: '#1e293b', borderRadius: 12, padding: 24 },
  sectionTitle: { margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#f1f5f9' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', paddingBottom: 10, borderBottom: '1px solid #334155' },
  td: { padding: '10px 0', borderBottom: '1px solid #1e293b', fontSize: 14, color: '#cbd5e1' },
  bar: { height: 8, borderRadius: 4, background: '#6366f1', marginTop: 4 },
  empty: { color: '#64748b', fontSize: 14, textAlign: 'center', padding: '32px 0' },
  loading: { color: '#64748b', textAlign: 'center', padding: '80px 0', fontSize: 16 },
};

function StatCard({ label, value, sub, color = '#f1f5f9' }) {
  return (
    <div style={s.card}>
      <div style={s.cardLabel}>{label}</div>
      <p style={{ ...s.cardValue, color }}>{value}</p>
      {sub && <div style={s.cardSub}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
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

  if (loading && !data) return <div style={s.loading}>Loading dashboard…</div>;

  const { stripe, views } = data || {};
  const maxViews = views?.[0]?.views || 1;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.logo}>
          <span style={s.paw}>🐾</span>
          <div>
            <h1 style={s.title}>PawHaven Dashboard</h1>
            <p style={s.sub}>Last updated: {lastUpdated}</p>
          </div>
        </div>
        <button style={s.refreshBtn} onClick={load}>↻ Refresh</button>
      </div>

      {/* Stats */}
      <div style={s.grid}>
        <StatCard
          label="Total Revenue"
          value={`$${(stripe?.revenue || 0).toFixed(2)}`}
          sub="All time (Stripe)"
          color="#34d399"
        />
        <StatCard
          label="Total Orders"
          value={stripe?.orders || 0}
          sub="Completed payments"
        />
        <StatCard
          label="Products Tracked"
          value={views?.length || 0}
          sub="Unique pages viewed"
        />
        <StatCard
          label="Top Product Views"
          value={views?.[0]?.views || 0}
          sub={views?.[0]?.name || '—'}
          color="#818cf8"
        />
      </div>

      <div style={s.row}>
        {/* Product Views */}
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Most Viewed Products</h2>
          {views?.length > 0 ? (
            <div>
              {views.map((p) => (
                <div key={p.id} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 14, color: '#cbd5e1', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 12 }}>{p.name}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#818cf8', flexShrink: 0 }}>{p.views}</span>
                  </div>
                  <div style={{ background: '#0f172a', borderRadius: 4, height: 8 }}>
                    <div style={{ ...s.bar, width: `${(p.views / maxViews) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={s.empty}>No views tracked yet.<br />Visit some product pages on your store.</div>
          )}
        </div>

        {/* Recent Orders */}
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
    </div>
  );
}
