// api/send-fcm.js (Vercel serverless)
import admin from 'firebase-admin';

// Important: on charge le JSON de service account depuis une variable d'env
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const API_SECRET = process.env.API_SECRET;

if (!admin.apps.length) {
  const creds = JSON.parse(serviceAccountJson);
  admin.initializeApp({
    credential: admin.credential.cert(creds),
  });
}

export default async function handler(req, res) {
  // CORS minimal
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // 🔐 API key (simple et efficace)
    const key = req.headers['x-api-key'];
    if (!API_SECRET || key !== API_SECRET) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const { tokens, title, body, data } = req.body || {};
    if (!Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ ok: false, error: 'No tokens' });
    }

    // Déduplication serveur (sécurité)
    const unique = [...new Set(tokens)].filter(Boolean);

    const message = {
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data || {}).map(([k, v]) => [String(k), String(v)])
      ),
      android: {
        priority: 'high',
        notification: {
          channelId: 'default',
          sound: 'default',
        },
      },
    };

    const resp = await admin.messaging().sendEachForMulticast({
      tokens: unique,
      ...message,
    });

    return res.status(200).json({ ok: true, response: resp });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
}
