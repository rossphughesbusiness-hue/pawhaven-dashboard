import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function redis(path) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const res = await fetch(`${url}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const json = await res.json();
  return json.result;
}

async function getStripeData() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { revenue: 0, orders: 0, aov: 0, todayRevenue: 0, todayOrders: 0, thisWeekRevenue: 0, lastWeekRevenue: 0, thisWeekOrders: 0, lastWeekOrders: 0, recent: [], daily: [] };

  // Fetch last 100 succeeded payment intents
  const res = await fetch('https://api.stripe.com/v1/payment_intents?limit=100', {
    headers: { Authorization: `Basic ${Buffer.from(key + ':').toString('base64')}` },
    cache: 'no-store',
  });
  const data = await res.json();
  const succeeded = (data.data || []).filter(p => p.status === 'succeeded');

  const revenue = succeeded.reduce((sum, p) => sum + p.amount, 0) / 100;
  const aov = succeeded.length > 0 ? revenue / succeeded.length : 0;

  // Today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTs = Math.floor(todayStart.getTime() / 1000);
  const todayOrders = succeeded.filter(p => p.created >= todayTs);
  const todayRevenue = todayOrders.reduce((sum, p) => sum + p.amount, 0) / 100;

  // This week vs last week (rolling 7-day windows)
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const thisWeekStart = Math.floor((now - weekMs) / 1000);
  const lastWeekStart = Math.floor((now - 2 * weekMs) / 1000);
  const thisWeekOrderList = succeeded.filter(p => p.created >= thisWeekStart);
  const lastWeekOrderList = succeeded.filter(p => p.created >= lastWeekStart && p.created < thisWeekStart);
  const thisWeekRevenue = thisWeekOrderList.reduce((sum, p) => sum + p.amount, 0) / 100;
  const lastWeekRevenue = lastWeekOrderList.reduce((sum, p) => sum + p.amount, 0) / 100;

  // 30-day daily revenue
  const daily = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const dayStart = Math.floor(d.getTime() / 1000);
    const dayEnd = dayStart + 86400;
    const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayRevenue = succeeded
      .filter(p => p.created >= dayStart && p.created < dayEnd)
      .reduce((sum, p) => sum + p.amount, 0) / 100;
    daily.push({ label: dayLabel, revenue: dayRevenue });
  }

  const recent = succeeded.slice(0, 10).map(p => ({
    id: p.id,
    amount: p.amount / 100,
    created: p.created,
    name: p.shipping?.name || 'Customer',
  }));

  return {
    revenue,
    orders: succeeded.length,
    aov,
    todayRevenue,
    todayOrders: todayOrders.length,
    thisWeekRevenue,
    lastWeekRevenue,
    thisWeekOrders: thisWeekOrderList.length,
    lastWeekOrders: lastWeekOrderList.length,
    recent,
    daily,
  };
}

async function getEmailSubscriberCount() {
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) return 0;
  try {
    const res = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts?limit=100`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    });
    if (!res.ok) return 0;
    const json = await res.json();
    return json.total ?? (json.data?.length ?? 0);
  } catch { return 0; }
}

async function getAbandonedCartCount() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return 0;
  try {
    const res = await fetch(`${url}/keys/cart_recovery:*`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const json = await res.json();
    return Array.isArray(json.result) ? json.result.length : 0;
  } catch { return 0; }
}

async function getViewData() {
  const keys = await redis('keys/product:*');
  if (!keys || keys.length === 0) return [];

  const products = [];
  for (const key of keys) {
    if (!key.endsWith('/views')) {
      const id = key.replace('product:', '');
      const views = await redis(`hget/${key}/views`);
      const name = await redis(`hget/${key}/name`);
      products.push({
        id,
        name: name ? decodeURIComponent(name) : id,
        views: parseInt(views || '0', 10),
      });
    }
  }

  return products.sort((a, b) => b.views - a.views).slice(0, 10);
}

export async function GET(req) {
  const cookieStore = cookies();
  const auth = cookieStore.get('dash_auth');
  if (!auth || auth.value !== process.env.DASHBOARD_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [stripe, views, emailSubscribers, abandonedCarts] = await Promise.all([
    getStripeData(),
    getViewData(),
    getEmailSubscriberCount(),
    getAbandonedCartCount(),
  ]);

  return NextResponse.json({ stripe, views, emailSubscribers, abandonedCarts });
}
