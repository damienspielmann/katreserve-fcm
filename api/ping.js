// api/ping.js 03.12.2025
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const API_SECRET = process.env.API_SECRET ? 'present' : 'missing';
  const hasServiceJson = !!process.env.FIREBASE_ADMIN_CREDENTIALS; // <-- important

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(
    JSON.stringify({
      ok: true,
      runtime: 'nodejs20.x',
      api_secret: API_SECRET,
      service_account_json: hasServiceJson ? 'present' : 'missing',
    })
  );
};
