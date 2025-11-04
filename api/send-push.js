// api/send-push.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée. Utilise POST." });
  }

  try {
    const { tokens, title, body } = req.body;

    if (!Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ error: "Aucun token fourni." });
    }

    const messages = tokens.map((token) => ({
      to: token,
      sound: "default",
      title,
      body,
    }));

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error("Erreur d’envoi push :", err);
    return res.status(500).json({ error: err.message });
  }
}
