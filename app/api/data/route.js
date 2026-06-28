import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Redis } from '@upstash/redis';

function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

async function getStripeData() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { revenue: 0, orders: 0, aov: 0, todayRevenue: 0, todayOrders: 0, thisWeekRevenue: 0, lastWeekRevenue: 0, thisWeekOrders: 0, lastWeekOrders: 0, recent: [], daily: [] };

  const res = await fetch('https://api.stripe.com/v1/payment_intents?limit=100', {
    headers: { Authorization: `Basic ${Buffer.from(key + ':').toString('base64')}` },
    cache: 'no-store',
  });
  const data = await res.json();
  const succeeded = (data.data || []).filter(p => p.status === 'succeeded');

  const revenue = succeeded.reduce((sum, p) => sum + p.amount, 0) / 100;
  const aov = succeeded.length > 0 ? revenue / succeeded.length : 0;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTs = Math.floor(todayStart.getTime() / 1000);
  const todayOrders = succeeded.filter(p => p.created >= todayTs);
  const todayRevenue = todayOrders.reduce((sum, p) => sum + p.amount, 0) / 100;

  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const thisWeekStart = Math.floor((now - weekMs) / 1000);
  const lastWeekStart = Math.floor((now - 2 * weekMs) / 1000);
  const thisWeekOrderList = succeeded.filter(p => p.created >= thisWeekStart);
  const lastWeekOrderList = succeeded.filter(p => p.created >= lastWeekStart && p.created < thisWeekStart);
  const thisWeekRevenue = thisWeekOrderList.reduce((sum, p) => sum + p.amount, 0) / 100;
  const lastWeekRevenue = lastWeekOrderList.reduce((sum, p) => sum + p.amount, 0) / 100;

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

  return { revenue, orders: succeeded.length, aov, todayRevenue, todayOrders: todayOrders.length, thisWeekRevenue, lastWeekRevenue, thisWeekOrders: thisWeekOrderList.length, lastWeekOrders: lastWeekOrderList.length, recent, daily };
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
  try {
    const redis = getRedis();
    const keys = await redis.keys('cart_recovery:*');
    return Array.isArray(keys) ? keys.length : 0;
  } catch { return 0; }
}

async function getProductViewData() {
  try {
    const redis = getRedis();
    const keys = await redis.keys('product:*');
    if (!keys || keys.length === 0) return [];

    const products = [];
    for (const key of keys) {
      const id = key.replace('product:', '');
      const [views, name] = await Promise.all([
        redis.hget(key, 'views'),
        redis.hget(key, 'name'),
      ]);
      const viewCount = parseInt(views || '0', 10);
      if (viewCount > 0) {
        products.push({
          id,
          name: name ? String(name) : `Product ${id}`,
          views: viewCount,
        });
      }
    }

    return products.sort((a, b) => b.views - a.views).slice(0, 10);
  } catch (err) {
    console.error('[getProductViewData]', err);
    return [];
  }
}

async function getSiteViewData() {
  try {
    const redis = getRedis();
    const today = new Date().toISOString().slice(0, 10);

    const [total, todayViews] = await Promise.all([
      redis.get('pageviews:total'),
      redis.get(`pageviews:daily:${today}`),
    ]);

    // Last 30 days daily breakdown
    const dailyKeys = [];
    const dailyLabels = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      dailyKeys.push(`pageviews:daily:${dateStr}`);
      dailyLabels.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), date: dateStr });
    }

    const dailyCounts = await Promise.all(dailyKeys.map(k => redis.get(k)));
    const daily = dailyLabels.map((meta, i) => ({
      ...meta,
      count: parseInt(dailyCounts[i] || '0', 10),
    }));

    // Top 10 pages from sorted set
    const raw = await redis.zrange('pageviews:pages', 0, 9, { rev: true, withScores: true });
    const topPages = [];
    if (Array.isArray(raw)) {
      for (let i = 0; i < raw.length; i += 2) {
        topPages.push({ path: String(raw[i]), views: Number(raw[i + 1] || 0) });
      }
    }

    return {
      total: parseInt(total || '0', 10),
      todayViews: parseInt(todayViews || '0', 10),
      daily,
      topPages,
    };
  } catch (err) {
    console.error('[getSiteViewData]', err);
    return { total: 0, todayViews: 0, daily: [], topPages: [] };
  }
}

export async function GET() {
  const cookieStore = cookies();
  const auth = cookieStore.get('dash_auth');
  if (!auth || auth.value !== process.env.DASHBOARD_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [stripe, productViews, siteViews, emailSubscribers, abandonedCarts] = await Promise.all([
    getStripeData(),
    getProductViewData(),
    getSiteViewData(),
    getEmailSubscriberCount(),
    getAbandonedCartCount(),
  ]);

  return NextResponse.json({ stripe, productViews, siteViews, emailSubscribers, abandonedCarts });
}
