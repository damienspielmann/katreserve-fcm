// api/send-fcm.js
// CommonJS pour éviter les soucis ESM sur Vercel sans config

const admin = require("firebase-admin");

// 1) Récupère le service account depuis la variable d'env collée intégralement
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const API_SECRET = process.env.API_SECRET;

// Initialisation Firebase Admin (singleton)
if (!admin.apps.length) {
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON manquant dans les variables d'environnement.");
  }
  const serviceAccount = JSON.parse(serviceAccountJson);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const messaging = admin.messaging();

module.exports = async (req, res) => {
  try {
    // 2) Simple auth par secret (header ou query)
    const authHeader = req.headers["authorization"] || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const secret = bearer || req.query.secret || req.body?.secret;

    if (!API_SECRET || secret !== API_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 3) Payload FCM attendu
    // {
    //   "token": "DEVICE_FCM_TOKEN",
    //   "notification": { "title": "...", "body": "..." },
    //   "data": { "foo": "bar" } // optionnel, strings uniquement
    // }
    const { token, notification, data, android, apns, webpush } = req.body || {};

    if (!token || !notification) {
      return res.status(400).json({ error: "Requiert 'token' et 'notification'." });
    }

    const message = {
      token,
      notification,
      data,
      android,
      apns,
      webpush,
    };

    const response = await messaging.send(message);
    return res.status(200).json({ id: response });
  } catch (err) {
    console.error("[send-fcm] Error:", err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
};
