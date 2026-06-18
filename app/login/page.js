'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push('/');
    } else {
      setError('Incorrect password.');
    }
    setLoading(false);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ background: '#1e293b', borderRadius: 16, padding: '48px 40px', width: 360, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#f1f5f9' }}>Hughes Financials</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Business Analytics</p>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #334155',
              background: '#0f172a', color: '#f1f5f9', fontSize: 15, boxSizing: 'border-box', outline: 'none',
            }}
          />
          {error && <p style={{ color: '#f87171', fontSize: 13, margin: '8px 0 0' }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', marginTop: 20, padding: '13px', borderRadius: 8, border: 'none',
              background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
