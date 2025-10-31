// api/send-fcm.js
const admin = require("firebase-admin");
const { URL } = require("url");

// Utilitaires réponse + CORS
function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}
function sendJson(res, status, obj) {
  setCors(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
}

// Lecture sûre du body (req est un stream)
async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error("JSON invalid dans le corps de la requête");
  }
}

// Parse querystring (pour ?secret=...)
function getQuery(req) {
  try {
    const u = new URL(req.url, "http://localhost");
    return Object.fromEntries(u.searchParams.entries());
  } catch {
    return {};
  }
}

// --- Init Firebase Admin (singleton) ---
let initError = null;
if (!admin.apps.length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      throw new Error("Variable d'environnement FIREBASE_SERVICE_ACCOUNT_JSON absente");
    }
    const serviceAccount = JSON.parse(serviceAccountJson);

    // Normaliser la clé privée si les \n ont été échappés
    if (serviceAccount.private_key && serviceAccount.private_key.includes("\\n")) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (e) {
    initError = e;
    console.error("[init] Firebase Admin init error:", e);
  }
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    return res.end();
  }
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Méthode non autorisée. Utilise POST." });
  }

  if (initError) {
    return sendJson(res, 500, {
      error: "Firebase Admin non initialisé",
      detail: String(initError.message || initError),
    });
  }

  const API_SECRET = process.env.API_SECRET;
  if (!API_SECRET) {
    return sendJson(res, 500, { error: "API_SECRET manquant dans les variables d'environnement" });
  }

  try {
    // Auth (Bearer, query, body)
    const authHeader = req.headers["authorization"] || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const query = getQuery(req);
    const body = await readJsonBody(req);

    const secret = bearer || query.secret || body.secret;
    if (secret !== API_SECRET) {
      return sendJson(res, 401, { error: "Unauthorized (secret invalide)" });
    }

    const { token, notification, data, android, apns, webpush } = body || {};
    if (!token || !notification) {
      return sendJson(res, 400, { error: "Requiert 'token' et 'notification'." });
    }

    const message = { token, notification, data, android, apns, webpush };
    const id = await admin.messaging().send(message);
    return sendJson(res, 200, { id });
  } catch (e) {
    console.error("[send-fcm] Error:", e);
    return sendJson(res, 500, { error: String(e.message || e) });
  }
};
