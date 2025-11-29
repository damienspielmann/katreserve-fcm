// api/send-push.js
import admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tokens, title, body } = req.body;

    if (!Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ error: 'No tokens provided' });
    }

    const message = {
      tokens,
      notification: {
        title: title || 'Notification',
        body: body || '',
      },
      data: {
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        source: 'katreserve',
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    console.log('FCM response:', JSON.stringify(response, null, 2));

    return res.status(200).json({ success: true, response });
  } catch (e) {
    console.error('send-push error:', e);
    return res.status(500).json({ error: e.message || String(e) });
  }
}
