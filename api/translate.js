export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // Preflight OK
  }

  const { text, market } = req.body;

  if (!text || typeof text !== 'string' || !market) {
    return res.status(400).json({ error: 'Missing "text" or "market"' });
  }

  const prompt = `
You are a UX content translator specialized in telecom apps and websites. Translate the following UI string from English to Spanish, adapting the style and tone to the specified market.

If the market is Panama:
- Use simple, clear and warm language.
- Avoid regionalisms. Keep it pan-Latin American.
- Use phrases like "pagar la factura", "configurar tu cuenta", "métodos de pago".
- Reflect the tone used in the Liberty Panama FAQs.

If the market is Puerto Rico:
- Use formal but friendly tone.
- Reflect Puerto Rican vocabulary and expressions from the Liberty Puerto Rico help center.
- Prefer "servicio" over "plan", "configura tu cuenta" instead of "ajusta tu perfil".
- Avoid over-neutral or Spain-style phrasing.

Do not translate product or brand names. Return only the final translated string.

Original: "${text}"
Market: ${market}
`;

  try {
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ]
      })
    });

    const result = await geminiRes.json();
    console.log("Gemini API response:", result);
    
    const translation = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!translation) throw new Error("Missing translation from Gemini");

    return res.status(200).json({ translatedText: translation });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: 'Translation failed', detail: error.message });
  }
}
