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
  if (!key) return { revenue: 0, orders: 0, recent: [] };

  // Fetch last 100 payment intents
  const res = await fetch('https://api.stripe.com/v1/payment_intents?limit=100', {
    headers: { Authorization: `Basic ${Buffer.from(key + ':').toString('base64')}` },
    cache: 'no-store',
  });
  const data = await res.json();
  const succeeded = (data.data || []).filter(p => p.status === 'succeeded');
  const revenue = succeeded.reduce((sum, p) => sum + p.amount, 0) / 100;

  const recent = succeeded.slice(0, 10).map(p => ({
    id: p.id,
    amount: p.amount / 100,
    created: p.created,
    name: p.shipping?.name || 'Customer',
  }));

  return { revenue, orders: succeeded.length, recent };
}

async function getViewData() {
  // Get all product view keys
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
  // Auth check
  const cookieStore = cookies();
  const auth = cookieStore.get('dash_auth');
  if (!auth || auth.value !== process.env.DASHBOARD_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [stripe, views] = await Promise.all([getStripeData(), getViewData()]);
  return NextResponse.json({ stripe, views });
}
